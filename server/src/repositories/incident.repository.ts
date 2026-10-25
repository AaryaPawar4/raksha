import { Types } from 'mongoose';
import { IncidentModel, IIncidentDocument, IIncidentJSON, docToJSON } from '../models/incident.model';
import { ThreatLinkModel } from '../models/threatlink.model';
import { EvidenceModel } from '../models/evidence.model';
import { CaseModel } from '../models/case.model';
import { Incident, CreateIncidentDTO, IncidentListQuery, PaginatedResult } from '@rakshasphere/shared';

// IIncidentJSON satisfies the Incident shape - use as unknown intermediary to satisfy compiler
function toIncident(doc: IIncidentDocument): Incident {
  return docToJSON(doc) as unknown as Incident;
}

export class IncidentRepository {
  public static async create(
    ownerId: string,
    data: CreateIncidentDTO
  ): Promise<Incident> {
    const doc = await IncidentModel.create({
      ...data,
      ownerId,
      occurredAt: data.occurredAt ? new Date(data.occurredAt) : new Date(),
    });

    return toIncident(doc);
  }

  public static async findByIdAndOwner(
    id: string,
    ownerId: string
  ): Promise<Incident | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const doc = await IncidentModel.findOne({
      _id: new Types.ObjectId(id),
      ownerId,
    });

    return doc ? toIncident(doc) : null;
  }

  public static async findByOwner(
    ownerId: string,
    query: IncidentListQuery
  ): Promise<PaginatedResult<Incident>> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 10));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { ownerId };

    if (query.status) {
      filter['status'] = query.status;
    }

    if (query.incidentType) {
      filter['incidentType'] = query.incidentType;
    }

    const [docs, total] = await Promise.all([
      IncidentModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      IncidentModel.countDocuments(filter),
    ]);

    const items = docs.map(toIncident);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  public static async findForExport(
    ownerId: string,
    filterParams: {
      startDate?: string;
      endDate?: string;
      status?: string;
      incidentType?: string;
      platform?: string;
    }
  ): Promise<Incident[]> {
    const filter: Record<string, unknown> = { ownerId };
    if (filterParams.status) {
      filter['status'] = filterParams.status;
    }
    if (filterParams.incidentType) {
      filter['incidentType'] = filterParams.incidentType;
    }
    if (filterParams.platform) {
      filter['platform'] = filterParams.platform;
    }
    if (filterParams.startDate || filterParams.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (filterParams.startDate) {
        dateFilter['$gte'] = new Date(filterParams.startDate);
      }
      if (filterParams.endDate) {
        dateFilter['$lte'] = new Date(filterParams.endDate);
      }
      filter['occurredAt'] = dateFilter;
    }

    const docs = await IncidentModel.find(filter).sort({ occurredAt: -1 }).exec();
    return docs.map(toIncident);
  }

  public static async deleteByIdAndOwner(
    id: string,
    ownerId: string
  ): Promise<{ removedLinksCount: number; retainedEvidenceCount: number }> {
    if (!Types.ObjectId.isValid(id)) {
      return { removedLinksCount: 0, retainedEvidenceCount: 0 };
    }

    const objectId = new Types.ObjectId(id);

    // 1. Remove direct ThreatLink connections involving this incident for this owner
    // Unrelated ThreatLinks between other incidents are preserved!
    const linkDeleteResult = await ThreatLinkModel.deleteMany({
      ownerId,
      $or: [{ incidentAId: id }, { incidentBId: id }],
    });

    // 2. Detach associated evidence items in the Vault
    // Preserves zero-knowledge encrypted evidence so victim proof is retained
    const evidenceUpdateResult = await EvidenceModel.updateMany(
      { ownerId, incidentId: id },
      { $set: { incidentId: 'unlinked' } }
    );

    // 3. Detach associated tracked cases
    await CaseModel.updateMany(
      { ownerId, incidentId: id },
      { $set: { incidentId: 'unlinked' } }
    );

    // 4. Delete the incident record
    await IncidentModel.deleteOne({
      _id: objectId,
      ownerId,
    });

    return {
      removedLinksCount: linkDeleteResult.deletedCount ?? 0,
      retainedEvidenceCount: evidenceUpdateResult.modifiedCount ?? 0,
    };
  }
}
