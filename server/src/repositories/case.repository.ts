import { Types } from 'mongoose';
import { CaseModel, caseDocToTrackedCase } from '../models/case.model';
import { TrackedCase, CreateCaseDTO, UpdateCaseDTO } from '@rakshasphere/shared';

export class CaseRepository {
  public static async create(
    ownerId: string,
    data: CreateCaseDTO
  ): Promise<TrackedCase> {
    const doc = await CaseModel.create({
      ...data,
      ownerId,
      followUpAt: data.followUpAt ? new Date(data.followUpAt) : undefined,
    });

    return caseDocToTrackedCase(doc);
  }

  public static async findByOwner(
    ownerId: string,
    incidentId?: string
  ): Promise<TrackedCase[]> {
    const query: Record<string, unknown> = { ownerId };
    if (incidentId) {
      query.incidentId = incidentId;
    }

    const docs = await CaseModel.find(query).sort({ createdAt: -1 }).exec();
    return docs.map(caseDocToTrackedCase);
  }

  public static async findByIdAndOwner(
    ownerId: string,
    id: string
  ): Promise<TrackedCase | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const doc = await CaseModel.findOne({
      _id: new Types.ObjectId(id),
      ownerId,
    }).exec();

    return doc ? caseDocToTrackedCase(doc) : null;
  }

  public static async updateByIdAndOwner(
    ownerId: string,
    id: string,
    data: UpdateCaseDTO
  ): Promise<TrackedCase | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const updateFields: Record<string, unknown> = {};
    if (data.reportingChannel !== undefined) updateFields.reportingChannel = data.reportingChannel;
    if (data.referenceNumber !== undefined) updateFields.referenceNumber = data.referenceNumber;
    if (data.status !== undefined) updateFields.status = data.status;
    if (data.followUpAt !== undefined) {
      updateFields.followUpAt = data.followUpAt ? new Date(data.followUpAt) : null;
    }
    if (data.notes !== undefined) updateFields.notes = data.notes;

    const doc = await CaseModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), ownerId },
      { $set: updateFields },
      { returnDocument: 'after' }
    ).exec();

    return doc ? caseDocToTrackedCase(doc) : null;
  }

  public static async deleteByIdAndOwner(
    ownerId: string,
    id: string
  ): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) {
      return false;
    }

    const res = await CaseModel.deleteOne({
      _id: new Types.ObjectId(id),
      ownerId,
    }).exec();

    return res.deletedCount === 1;
  }
}
