import { Types } from 'mongoose';
import { ActivityLogModel } from '../models/activityLog.model';
import { ActivityEventType, ActivityEventOutcome, ActivityLogEntry, PaginatedActivityLog } from '@rakshasphere/shared';

export interface ActivityLogFilter {
  eventType?: ActivityEventType;
  outcome?: ActivityEventOutcome;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

function docToEntry(doc: InstanceType<typeof ActivityLogModel>): ActivityLogEntry {
  return {
    id: (doc._id as Types.ObjectId).toString(),
    eventType: doc.eventType as ActivityEventType,
    outcome: doc.outcome as ActivityEventOutcome,
    resourceId: doc.resourceId,
    resourceLabel: doc.resourceLabel,
    safeMetadata: doc.safeMetadata as Record<string, string | number | boolean> | undefined,
    createdAt: doc.createdAt.toISOString(),
  };
}

export class ActivityLogRepository {
  public static async findByOwner(
    ownerId: string,
    filter: ActivityLogFilter = {}
  ): Promise<PaginatedActivityLog> {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 25));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { ownerId };

    if (filter.eventType) {
      query.eventType = filter.eventType;
    }
    if (filter.outcome) {
      query.outcome = filter.outcome;
    }
    if (filter.startDate || filter.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (filter.startDate) dateFilter['$gte'] = new Date(filter.startDate);
      if (filter.endDate) dateFilter['$lte'] = new Date(filter.endDate);
      query.createdAt = dateFilter;
    }

    const [docs, total] = await Promise.all([
      ActivityLogModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      ActivityLogModel.countDocuments(query),
    ]);

    return {
      items: docs.map(docToEntry),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}
