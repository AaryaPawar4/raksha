import { ThreatIdentifier } from './incident';

export type MatchType = 'EXACT_IDENTIFIER' | 'SIMILAR_TEXT';

export type MatchStrength = 'STRONG' | 'MODERATE' | 'WEAK';

export type UserDisposition = 'PENDING' | 'RELEVANT' | 'NOT_RELATED' | 'UNSURE';

export interface ThreatLinkRelatedIncident {
  id: string;
  title: string;
  incidentType: string;
  platform: string;
  occurredAt: string;
  status: string;
}

export interface ThreatLinkEdge {
  id: string;
  ownerId: string;
  sourceIncidentId: string;
  relatedIncidentId: string;
  relatedIncident?: ThreatLinkRelatedIncident;
  matchType: MatchType;
  matchedIdentifierType: ThreatIdentifier['type'];
  matchedValueMasked: string;
  strength: MatchStrength;
  explanation: string;
  warning: string;
  userDisposition: UserDisposition;
  createdAt: string;
  updatedAt: string;
}

export interface ThreatLinkFeedbackDTO {
  disposition: 'RELEVANT' | 'NOT_RELATED' | 'UNSURE';
}
