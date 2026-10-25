import { IncidentStatus, IncidentType, PlatformType } from './incident';
import { CaseStatus } from './cases';

export interface AnalyticsSummaryQuery {
  startDate?: string;
  endDate?: string;
  platform?: PlatformType;
  incidentType?: IncidentType;
}

export interface IncidentTrendPoint {
  date: string;
  count: number;
}

export interface RiskDistribution {
  high: number;
  medium: number;
  low: number;
}

export interface AnalyticsOverview {
  totalIncidents: number;
  openIncidents: number;
  resolvedIncidents: number;
  totalCases: number;
  activeCases: number;
  resolvedCases: number;
  totalCheckIns: number;
  activeCheckIns: number;
  vaultEvidenceCount: number;
  threatLinksCount: number;
}

export interface RecentActivityItem {
  id: string;
  type: 'INCIDENT' | 'CASE' | 'CHECKIN' | 'VAULT';
  title: string;
  timestamp: string;
  status?: string;
  severity?: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface AnalyticsSummaryData {
  overview: AnalyticsOverview;
  byIncidentStatus: Record<IncidentStatus, number>;
  byIncidentType: Record<IncidentType, number>;
  byPlatform: Record<PlatformType, number>;
  byCaseStatus: Record<CaseStatus, number>;
  riskDistribution: RiskDistribution;
  incidentTrends: IncidentTrendPoint[];
  recentActivity: RecentActivityItem[];
  filteredRange: {
    startDate?: string;
    endDate?: string;
  };
}

export interface MapPoint {
  id: string;
  type: 'CHECKIN' | 'INCIDENT';
  label: string;
  status: string;
  lat: number;
  lng: number;
  isFuzzed: boolean;
  timestamp: string;
}

export interface MapPointsResponse {
  points: MapPoint[];
  total: number;
  privacyNotice: string;
  isRealTime: boolean;
}
