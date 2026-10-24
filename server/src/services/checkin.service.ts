import { CheckInRepository, CreateCheckInData } from '../repositories/checkin.repository';
import { ContactRepository } from '../repositories/contact.repository';
import { isDatabaseConnected } from '../config/db';
import { CheckIn, CreateCheckInDTO } from '@rakshasphere/shared';
import { ServiceError } from './incident.service';

const DELIVERY_DISCLAIMER =
  'This message was prepared by RakshaSphere and opened in an external app. Delivery is not confirmed by RakshaSphere unless explicitly verified through a supported integration.';

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
}
