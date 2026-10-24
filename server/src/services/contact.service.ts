import { ContactRepository } from '../repositories/contact.repository';
import { isDatabaseConnected } from '../config/db';
import { TrustedContact, CreateContactDTO, UpdateContactDTO, ConsentStatus } from '@rakshasphere/shared';
import { ServiceError } from './incident.service';

export class ContactService {
  private static checkDatabase(): void {
    if (!isDatabaseConnected()) {
      throw new ServiceError(
        'Database service is currently unavailable. Please ensure MongoDB is connected.',
        'INTERNAL_ERROR',
        503
      );
    }
  }

  public static async createContact(
    ownerId: string,
    dto: CreateContactDTO
  ): Promise<TrustedContact> {
    this.checkDatabase();
    // Note: Creating a contact does NOT send any message to them.
    return ContactRepository.create(ownerId, dto);
  }

  public static async listContacts(ownerId: string): Promise<TrustedContact[]> {
    this.checkDatabase();
    return ContactRepository.findByOwner(ownerId);
  }

  public static async getContact(
    ownerId: string,
    id: string
  ): Promise<TrustedContact> {
    this.checkDatabase();
    const contact = await ContactRepository.findByIdAndOwner(ownerId, id);
    if (!contact) {
      throw new ServiceError(
        'Contact not found or you do not have permission to access it.',
        'NOT_FOUND',
        404
      );
    }
    return contact;
  }

  public static async updateContact(
    ownerId: string,
    id: string,
    dto: UpdateContactDTO
  ): Promise<TrustedContact> {
    this.checkDatabase();
    const contact = await ContactRepository.update(ownerId, id, dto);
    if (!contact) {
      throw new ServiceError(
        'Contact not found or you do not have permission to update it.',
        'NOT_FOUND',
        404
      );
    }
    return contact;
  }

  public static async updateConsent(
    ownerId: string,
    id: string,
    consentStatus: ConsentStatus
  ): Promise<TrustedContact> {
    this.checkDatabase();

    // Verify the contact exists and belongs to the owner
    await this.getContact(ownerId, id);

    const updatePayload: {
      consentStatus: ConsentStatus;
      consentGivenAt?: Date | null;
    } = { consentStatus };

    if (consentStatus === 'CONSENTED') {
      updatePayload.consentGivenAt = new Date();
    } else {
      // DECLINED clears consentGivenAt
      updatePayload.consentGivenAt = null;
    }

    const contact = await ContactRepository.update(ownerId, id, updatePayload);
    if (!contact) {
      throw new ServiceError(
        'Contact not found or you do not have permission to update consent.',
        'NOT_FOUND',
        404
      );
    }
    return contact;
  }

  public static async deleteContact(
    ownerId: string,
    id: string
  ): Promise<boolean> {
    this.checkDatabase();
    // Verify exists first
    await this.getContact(ownerId, id);
    return ContactRepository.deleteByIdAndOwner(ownerId, id);
  }
}
