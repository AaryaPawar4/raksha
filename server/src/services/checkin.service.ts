import { CheckInRepository, CreateCheckInData } from '../repositories/checkin.repository';
import { ContactRepository } from '../repositories/contact.repository';
import { UserRepository } from '../repositories/user.repository';
import { isDatabaseConnected } from '../config/db';
import { CheckIn, CreateCheckInDTO, SendEmailCheckInDTO, EmailProviderStatus } from '@rakshasphere/shared';
import { ServiceError } from './incident.service';
import { EmailService } from './email.service';
import { CheckInModel } from '../models/checkin.model';
import { recordActivity } from './activityLog.service';

const DELIVERY_DISCLAIMER =
  'This message was prepared by RakshaSphere and opened in an external app (WhatsApp/SMS). Delivery is not confirmed by RakshaSphere. No email or background messages are sent.';

const EMAIL_DISCLAIMER =
  'Sent via transactional email provider. Provider acceptance acknowledges queue receipt and does not verify that the recipient opened or read this message.';

export class CheckInService {
  private static checkDatabase(): void {
    if (!isDatabaseConnected()) {
      throw new ServiceError(
        'Database service is currently unavailable. Please ensure MongoDB is connected.',
        'INTERNAL_ERROR',
        503
      );
    }
  }

  public static async createCheckIn(
    ownerId: string,
    dto: CreateCheckInDTO
  ): Promise<CheckIn> {
    this.checkDatabase();

    // Verify contact exists and belongs to owner
    const contact = await ContactRepository.findByIdAndOwner(ownerId, dto.contactId);
    if (!contact) {
      throw new ServiceError(
        'Contact not found or you do not have permission to use it.',
        'NOT_FOUND',
        404
      );
    }

    // Enforce explicit consent boundary: cannot create check-in if contact has not explicitly consented
    if (contact.consentStatus !== 'CONSENTED') {
      throw new ServiceError(
        `Cannot initiate check-in: contact "${contact.name}" has not consented (status: ${contact.consentStatus}). Obtain and record consent first.`,
        'FORBIDDEN',
        403
      );
    }

    // Validate location sharing logic
    if (dto.locationSharingEnabled) {
      if (dto.latitudeSnapshot === undefined || dto.longitudeSnapshot === undefined) {
        throw new ServiceError(
          'latitudeSnapshot and longitudeSnapshot are required when locationSharingEnabled is true.',
          'VALIDATION_ERROR',
          400
        );
      }
    }

    // Only store precise location if explicitly enabled AND coordinates provided
    const data: CreateCheckInData = {
      contactId: dto.contactId,
      contactName: contact.name,
      message: dto.message,
      locationSharingEnabled: dto.locationSharingEnabled,
      latitudeSnapshot: dto.locationSharingEnabled ? dto.latitudeSnapshot : undefined,
      longitudeSnapshot: dto.locationSharingEnabled ? dto.longitudeSnapshot : undefined,
      dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
      deliveryDisclaimer: DELIVERY_DISCLAIMER,
    };

    return CheckInRepository.create(ownerId, data);
  }

  public static async listCheckIns(ownerId: string): Promise<CheckIn[]> {
    this.checkDatabase();
    return CheckInRepository.findByOwner(ownerId);
  }

  public static async getCheckIn(
    ownerId: string,
    id: string
  ): Promise<CheckIn> {
    this.checkDatabase();
    const checkIn = await CheckInRepository.findByIdAndOwner(ownerId, id);
    if (!checkIn) {
      throw new ServiceError(
        'Check-in not found or you do not have permission to access it.',
        'NOT_FOUND',
        404
      );
    }
    return checkIn;
  }

  public static async completeCheckIn(
    ownerId: string,
    id: string
  ): Promise<CheckIn> {
    this.checkDatabase();
    await this.getCheckIn(ownerId, id);
    const checkIn = await CheckInRepository.updateStatus(ownerId, id, 'COMPLETED', {
      completedAt: new Date(),
    });
    if (!checkIn) {
      throw new ServiceError(
        'Check-in not found or you do not have permission to update it.',
        'NOT_FOUND',
        404
      );
    }
    return checkIn;
  }

  public static async cancelCheckIn(
    ownerId: string,
    id: string
  ): Promise<CheckIn> {
    this.checkDatabase();
    await this.getCheckIn(ownerId, id);
    const checkIn = await CheckInRepository.updateStatus(ownerId, id, 'CANCELLED', {
      cancelledAt: new Date(),
    });
    if (!checkIn) {
      throw new ServiceError(
        'Check-in not found or you do not have permission to update it.',
        'NOT_FOUND',
        404
      );
    }
    return checkIn;
  }

  public static async acknowledgeDelivery(
    ownerId: string,
    id: string
  ): Promise<CheckIn> {
    this.checkDatabase();
    await this.getCheckIn(ownerId, id);
    const checkIn = await CheckInRepository.updateDeliveryState(ownerId, id, 'OPENED_IN_APP');
    if (!checkIn) {
      throw new ServiceError(
        'Check-in not found or you do not have permission to update it.',
        'NOT_FOUND',
        404
      );
    }
    return checkIn;
  }

  public static getEmailProviderStatus(): EmailProviderStatus {
    return EmailService.getProviderStatus();
  }

  public static async sendEmailCheckIn(
    ownerId: string,
    dto: SendEmailCheckInDTO
  ): Promise<CheckIn> {
    this.checkDatabase();

    // Provider check
    if (!EmailService.isConfigured()) {
      throw new ServiceError(
        'Email service is not configured on this server. Contact the system administrator or check server environment settings.',
        'INTERNAL_ERROR',
        503
      );
    }

    // Rate limit / duplicate check: check clientNonce or recent automated email checkin within 60s
    if (dto.clientNonce) {
      const existingNonce = await CheckInModel.findOne({
        ownerId,
        clientNonce: dto.clientNonce,
      }).exec();
      if (existingNonce) {
        throw new ServiceError(
          'Duplicate check-in submission detected with this request nonce.',
          'CONFLICT',
          409
        );
      }
    }

    // Rate limit: prevent duplicate sends within 60 seconds with identical message or recipient
    const sixtySecondsAgo = new Date(Date.now() - 60000);
    const recentEmailCheckIn = await CheckInModel.findOne({
      ownerId,
      channel: 'AUTOMATED_EMAIL',
      createdAt: { $gte: sixtySecondsAgo },
    }).exec();

    if (recentEmailCheckIn) {
      throw new ServiceError(
        'An email check-in was already sent recently. Please wait at least 60 seconds before sending another.',
        'RATE_LIMITED',
        429
      );
    }

    let recipientEmail: string;
    let recipientName: string;
    let contactId: string;

    if (dto.recipientType === 'SELF') {
      const user = await UserRepository.findById(ownerId);
      if (!user) {
        throw new ServiceError('User account not found.', 'NOT_FOUND', 404);
      }
      if (!user.isEmailVerified) {
        throw new ServiceError(
          'Your registered email address is not verified. Please verify your email before sending check-ins to yourself.',
          'FORBIDDEN',
          403
        );
      }
      recipientEmail = user.email;
      recipientName = user.name || 'Self';
      contactId = ownerId; // Use ownerId as contactId reference for SELF
    } else {
      // TRUSTED_CONTACT
      if (!dto.contactId) {
        throw new ServiceError(
          'contactId is required when recipientType is TRUSTED_CONTACT.',
          'VALIDATION_ERROR',
          400
        );
      }
      const contact = await ContactRepository.findByIdAndOwner(ownerId, dto.contactId);
      if (!contact) {
        throw new ServiceError(
          'Contact not found or you do not have permission to use it.',
          'NOT_FOUND',
          404
        );
      }
      if (contact.consentStatus !== 'CONSENTED') {
        throw new ServiceError(
          `Cannot send email check-in: contact "${contact.name}" has not consented (status: ${contact.consentStatus}). Explicit consent is required.`,
          'FORBIDDEN',
          403
        );
      }
      if (!contact.email) {
        throw new ServiceError(
          `Contact "${contact.name}" does not have an email address configured.`,
          'VALIDATION_ERROR',
          400
        );
      }
      recipientEmail = contact.email;
      recipientName = contact.name;
      contactId = contact.id;
    }

    // Dispatch email
    const subject = `[RakshaSphere] Safety Check-In from ${recipientName === 'Self' ? 'your account' : 'your contact'}`;
    const text = `RakshaSphere Safety Check-In Notification\n\nRecipient: ${recipientName} (${recipientEmail})\nTime: ${new Date().toISOString()}\n\nMessage:\n${dto.message}\n\nDisclaimer: This is an automated notification sent via transactional email provider. RakshaSphere does not track or confirm whether the recipient opened or read this message.`;

    const dispatchResult = await EmailService.sendMail({
      to: recipientEmail,
      subject,
      text,
    });

    const emailStatus = dispatchResult.accepted ? 'ACCEPTED_BY_PROVIDER' : 'FAILED';

    const checkInData: CreateCheckInData = {
      contactId,
      contactName: recipientName,
      message: dto.message,
      locationSharingEnabled: false,
      channel: 'AUTOMATED_EMAIL',
      emailDeliveryStatus: emailStatus,
      recipientEmail,
      clientNonce: dto.clientNonce,
      deliveryDisclaimer: EMAIL_DISCLAIMER,
    };

    const checkIn = await CheckInRepository.create(ownerId, checkInData);

    await recordActivity({
      ownerId,
      eventType: 'CHECKIN_CREATED',
      outcome: dispatchResult.accepted ? 'SUCCESS' : 'FAILURE',
      resourceId: checkIn.id,
      resourceLabel: `Email check-in to ${recipientName}`,
      safeMetadata: {
        channel: 'AUTOMATED_EMAIL',
        recipientType: dto.recipientType,
        deliveryStatus: emailStatus,
      },
    });

    if (!dispatchResult.accepted) {
      throw new ServiceError(
        'Failed to deliver email through transactional email provider. Please try again or use manual messaging.',
        'INTERNAL_ERROR',
        502
      );
    }

    return checkIn;
  }
}
