import { Types } from 'mongoose';
import { ContactModel, IContactDocument, contactDocToContact } from '../models/contact.model';
import { TrustedContact, CreateContactDTO, UpdateContactDTO, ConsentStatus } from '@rakshasphere/shared';

function toContact(doc: IContactDocument): TrustedContact {
  return contactDocToContact(doc);
}

export class ContactRepository {
  public static async create(
    ownerId: string,
    dto: CreateContactDTO
  ): Promise<TrustedContact> {
    const doc = await ContactModel.create({
      ownerId,
      name: dto.name,
      phone: dto.phone,
      email: dto.email,
    });
    return toContact(doc);
  }

  public static async findByOwner(ownerId: string): Promise<TrustedContact[]> {
    const docs = await ContactModel.find({ ownerId }).sort({ createdAt: -1 }).exec();
    return docs.map(toContact);
  }

  public static async findByIdAndOwner(
    ownerId: string,
    id: string
  ): Promise<TrustedContact | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await ContactModel.findOne({
      _id: new Types.ObjectId(id),
      ownerId,
    });
    return doc ? toContact(doc) : null;
  }

  public static async update(
    ownerId: string,
    id: string,
    dto: UpdateContactDTO & { consentStatus?: ConsentStatus; consentGivenAt?: Date | null }
  ): Promise<TrustedContact | null> {
    if (!Types.ObjectId.isValid(id)) return null;

    const updateFields: Record<string, unknown> = {};
    if (dto.name !== undefined) updateFields['name'] = dto.name;
    if (dto.phone !== undefined) updateFields['phone'] = dto.phone;
    if (dto.email !== undefined) updateFields['email'] = dto.email;
    if (dto.consentStatus !== undefined) updateFields['consentStatus'] = dto.consentStatus;
    if (dto.consentGivenAt !== undefined) {
      updateFields['consentGivenAt'] = dto.consentGivenAt;
    }

    const doc = await ContactModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), ownerId },
      { $set: updateFields },
      { returnDocument: 'after' }
    );
    return doc ? toContact(doc) : null;
  }

  public static async deleteByIdAndOwner(
    ownerId: string,
    id: string
  ): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) return false;
    const result = await ContactModel.deleteOne({
      _id: new Types.ObjectId(id),
      ownerId,
    });
    return result.deletedCount === 1;
  }
}
