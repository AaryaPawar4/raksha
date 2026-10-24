import { Types } from 'mongoose';
import {
  EvidenceModel,
  evidenceDocToItem,
  evidenceDocToItemWithCiphertext,
} from '../models/evidence.model';
import {
  EvidenceItem,
  EvidenceItemWithCiphertext,
  UploadEvidenceDTO,
} from '@rakshasphere/shared';

export class EvidenceRepository {
  public static async create(
    ownerId: string,
    data: UploadEvidenceDTO
  ): Promise<EvidenceItem> {
    const doc = await EvidenceModel.create({
      ...data,
      ownerId,
      userEnteredCaptureTime: data.userEnteredCaptureTime
        ? new Date(data.userEnteredCaptureTime)
        : undefined,
      serverReceivedAt: new Date(),
    });

    return evidenceDocToItem(doc);
  }

  public static async findByIncident(
    ownerId: string,
    incidentId: string
  ): Promise<EvidenceItem[]> {
    // Exclude heavy ciphertextBase64 from list projection for speed and security
    const docs = await EvidenceModel.find({
      ownerId,
      incidentId,
    })
      .select('-ciphertextBase64')
      .sort({ createdAt: -1 })
      .exec();

    return docs.map(evidenceDocToItem);
  }

  public static async findByIdAndOwner(
    ownerId: string,
    id: string
  ): Promise<EvidenceItemWithCiphertext | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const doc = await EvidenceModel.findOne({
      _id: new Types.ObjectId(id),
      ownerId,
    }).exec();

    return doc ? evidenceDocToItemWithCiphertext(doc) : null;
  }

  public static async deleteByIdAndOwner(
    ownerId: string,
    id: string
  ): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) {
      return false;
    }

    const res = await EvidenceModel.deleteOne({
      _id: new Types.ObjectId(id),
      ownerId,
    }).exec();

    return res.deletedCount === 1;
  }
}
