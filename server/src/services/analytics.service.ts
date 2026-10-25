import {
  AnalyticsSummaryData,
  AnalyticsSummaryQuery,
  IncidentStatus,
  IncidentType,
  PlatformType,
  CaseStatus,
  RecentActivityItem,
  MapPoint,
  MapPointsResponse,
} from '@rakshasphere/shared';
import { IncidentModel } from '../models/incident.model';
import { CaseModel } from '../models/case.model';
import { CheckInModel } from '../models/checkin.model';
import { EvidenceModel } from '../models/evidence.model';
import { ThreatLinkModel } from '../models/threatlink.model';
import { isDatabaseConnected } from '../config/db';
import { ServiceError } from './incident.service';

const ALL_INCIDENT_STATUSES: IncidentStatus[] = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'ARCHIVED'];
const ALL_INCIDENT_TYPES: IncidentType[] = [
  'HARASSMENT',
  'DOXXING',
  'IMPERSONATION',
  'BLACKMAIL',
  'STALKING',
  'FINANCIAL_SCAM',
  'OTHER',
];
const ALL_PLATFORMS: PlatformType[] = [
  'INSTAGRAM',
  'WHATSAPP',
  'TELEGRAM',
  'TWITTER_X',
  'FACEBOOK',
  'SMS',
  'EMAIL',
  'OTHER',
];
const ALL_CASE_STATUSES: CaseStatus[] = [
  'REPORTED',
  'UNDER_REVIEW',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
];

export class AnalyticsService {
  private static checkDatabase(): void {
    if (!isDatabaseConnected()) {
      throw new ServiceError(
        'Database service is currently unavailable. Please ensure MongoDB is connected.',
        'INTERNAL_ERROR',
        503
      );
    }
  }

  public static async getSummary(
    ownerId: string,
    query: AnalyticsSummaryQuery
  ): Promise<AnalyticsSummaryData> {
    this.checkDatabase();

    // 1. Build date and attribute filter for incidents
    const incidentMatch: Record<string, unknown> = { ownerId };
    if (query.startDate || query.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (query.startDate) dateFilter.$gte = new Date(query.startDate);
      if (query.endDate) dateFilter.$lte = new Date(query.endDate);
      incidentMatch.occurredAt = dateFilter;
    }
    if (query.platform) {
      incidentMatch.platform = query.platform;
    }
    if (query.incidentType) {
      incidentMatch.incidentType = query.incidentType;
    }

    // 2. Run aggregations concurrently for maximum efficiency
    const [
      incidentStatusAgg,
      incidentTypeAgg,
      incidentPlatformAgg,
      incidentTrendAgg,
      caseStatusAgg,
      totalCheckIns,
      activeCheckIns,
      evidenceItemsCount,
      threatLinksCount,
      recentIncidents,
      recentCases,
      recentCheckIns,
    ] = await Promise.all([
      IncidentModel.aggregate<{ _id: IncidentStatus; count: number }>([
        { $match: incidentMatch },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      IncidentModel.aggregate<{ _id: IncidentType; count: number }>([
        { $match: incidentMatch },
        { $group: { _id: '$incidentType', count: { $sum: 1 } } },
      ]),
      IncidentModel.aggregate<{ _id: PlatformType; count: number }>([
        { $match: incidentMatch },
        { $group: { _id: '$platform', count: { $sum: 1 } } },
      ]),
      IncidentModel.aggregate<{ _id: string; count: number }>([
        { $match: incidentMatch },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$occurredAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      CaseModel.aggregate<{ _id: CaseStatus; count: number }>([
        { $match: { ownerId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      CheckInModel.countDocuments({ ownerId }),
      CheckInModel.countDocuments({ ownerId, status: 'ACTIVE' }),
      EvidenceModel.countDocuments({ ownerId }),
      ThreatLinkModel.countDocuments({ ownerId }),
      IncidentModel.find(incidentMatch).sort({ createdAt: -1 }).limit(5).lean(),
      CaseModel.find({ ownerId }).sort({ createdAt: -1 }).limit(5).lean(),
      CheckInModel.find({ ownerId }).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    // 3. Map status dictionaries with default 0s
    const byIncidentStatus = ALL_INCIDENT_STATUSES.reduce(
      (acc, s) => ({ ...acc, [s]: 0 }),
      {} as Record<IncidentStatus, number>
    );
    for (const item of incidentStatusAgg) {
      if (item._id && byIncidentStatus[item._id] !== undefined) {
        byIncidentStatus[item._id] = item.count;
      }
    }

    const byIncidentType = ALL_INCIDENT_TYPES.reduce(
      (acc, t) => ({ ...acc, [t]: 0 }),
      {} as Record<IncidentType, number>
    );
    for (const item of incidentTypeAgg) {
      if (item._id && byIncidentType[item._id] !== undefined) {
        byIncidentType[item._id] = item.count;
      }
    }

    const byPlatform = ALL_PLATFORMS.reduce(
      (acc, p) => ({ ...acc, [p]: 0 }),
      {} as Record<PlatformType, number>
    );
    for (const item of incidentPlatformAgg) {
      if (item._id && byPlatform[item._id] !== undefined) {
        byPlatform[item._id] = item.count;
      }
    }

    const byCaseStatus = ALL_CASE_STATUSES.reduce(
      (acc, s) => ({ ...acc, [s]: 0 }),
      {} as Record<CaseStatus, number>
    );
    for (const item of caseStatusAgg) {
      if (item._id && byCaseStatus[item._id] !== undefined) {
        byCaseStatus[item._id] = item.count;
      }
    }

    // 4. Calculate deterministic Risk Distribution
    // High: BLACKMAIL, STALKING, DOXXING
    // Medium: HARASSMENT, IMPERSONATION, FINANCIAL_SCAM
    // Low: OTHER
    const highRisk =
      (byIncidentType['BLACKMAIL'] || 0) +
      (byIncidentType['STALKING'] || 0) +
      (byIncidentType['DOXXING'] || 0);
    const mediumRisk =
      (byIncidentType['HARASSMENT'] || 0) +
      (byIncidentType['IMPERSONATION'] || 0) +
      (byIncidentType['FINANCIAL_SCAM'] || 0);
    const lowRisk = byIncidentType['OTHER'] || 0;

    // 5. Total counts calculation
    const totalIncidents = Object.values(byIncidentStatus).reduce((a, b) => a + b, 0);
    const openIncidents = byIncidentStatus['OPEN'] || 0;
    const resolvedIncidents = byIncidentStatus['RESOLVED'] || 0;

    const totalCases = Object.values(byCaseStatus).reduce((a, b) => a + b, 0);
    const activeCases =
      (byCaseStatus['REPORTED'] || 0) +
      (byCaseStatus['UNDER_REVIEW'] || 0) +
      (byCaseStatus['IN_PROGRESS'] || 0);
    const resolvedCases = (byCaseStatus['RESOLVED'] || 0) + (byCaseStatus['CLOSED'] || 0);

    // 6. Format Incident Trends
    const incidentTrends = incidentTrendAgg.map((t) => ({
      date: t._id,
      count: t.count,
    }));

    // 7. Compose Recent Activity Feed
    const activityItems: RecentActivityItem[] = [];

    for (const inc of recentIncidents) {
      const isHigh = ['BLACKMAIL', 'STALKING', 'DOXXING'].includes(inc.incidentType);
      activityItems.push({
        id: inc._id.toString(),
        type: 'INCIDENT',
        title: inc.title,
        timestamp: inc.createdAt.toISOString(),
        status: inc.status,
        severity: isHigh ? 'HIGH' : inc.incidentType === 'OTHER' ? 'LOW' : 'MEDIUM',
      });
    }

    for (const c of recentCases) {
      activityItems.push({
        id: c._id.toString(),
        type: 'CASE',
        title: `Case: ${c.reportingChannel} (${c.referenceNumber})`,
        timestamp: c.createdAt.toISOString(),
        status: c.status,
      });
    }

    for (const chk of recentCheckIns) {
      activityItems.push({
        id: chk._id.toString(),
        type: 'CHECKIN',
        title: `Safety Check-In with ${chk.contactName}`,
        timestamp: chk.createdAt.toISOString(),
        status: chk.status,
      });
    }

    activityItems.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return {
      overview: {
        totalIncidents,
        openIncidents,
        resolvedIncidents,
        totalCases,
        activeCases,
        resolvedCases,
        totalCheckIns,
        activeCheckIns,
        vaultEvidenceCount: evidenceItemsCount,
        threatLinksCount,
      },
      byIncidentStatus,
      byIncidentType,
      byPlatform,
      byCaseStatus,
      riskDistribution: {
        high: highRisk,
        medium: mediumRisk,
        low: lowRisk,
      },
      incidentTrends,
      recentActivity: activityItems.slice(0, 8),
      filteredRange: {
        startDate: query.startDate,
        endDate: query.endDate,
      },
    };
  }

  public static async getMapPoints(
    ownerId: string,
    fuzzLocation: boolean = true
  ): Promise<MapPointsResponse> {
    this.checkDatabase();

    // Query user's check-ins with location snapshots
    const checkIns = await CheckInModel.find({
      ownerId,
      locationSharingEnabled: true,
      latitudeSnapshot: { $ne: null },
      longitudeSnapshot: { $ne: null },
    })
      .sort({ createdAt: -1 })
      .lean();

    const points: MapPoint[] = checkIns.map((item) => {
      let lat = item.latitudeSnapshot!;
      let lng = item.longitudeSnapshot!;

      if (fuzzLocation) {
        // Obfuscate to ~1km grid (2 decimal places precision)
        // adding a slight deterministic jitter based on ID so stacked markers don't overlap completely
        const idHash = item._id
          .toString()
          .slice(-4)
          .split('')
          .reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const jitterLat = ((idHash % 10) - 5) * 0.001;
        const jitterLng = (((idHash >> 2) % 10) - 5) * 0.001;
        lat = Math.round(lat * 100) / 100 + jitterLat;
        lng = Math.round(lng * 100) / 100 + jitterLng;
      }

      return {
        id: item._id.toString(),
        type: 'CHECKIN',
        label: `Safety Check-In: ${item.contactName}`,
        status: item.status,
        lat: Number(lat.toFixed(5)),
        lng: Number(lng.toFixed(5)),
        isFuzzed: fuzzLocation,
        timestamp: item.createdAt.toISOString(),
      };
    });

    return {
      points,
      total: points.length,
      privacyNotice: fuzzLocation
        ? 'Coordinates are obfuscated to a ~1km grid radius to protect privacy. Exact addresses are not exposed.'
        : 'Displaying exact coordinates with user consent. Keep this view confidential.',
      isRealTime: false,
    };
  }
}
