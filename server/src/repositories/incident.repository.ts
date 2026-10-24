import { Types } from 'mongoose';
import { IncidentModel, IIncidentDocument, IIncidentJSON, docToJSON } from '../models/incident.model';
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
}
