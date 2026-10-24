import { Schema, model, Document, Types } from 'mongoose';
import {
  MatchType,
  MatchStrength,
  UserDisposition,
  ThreatIdentifier,
  ThreatLinkEdge,
} from '@rakshasphere/shared';

export interface IThreatLinkDocument extends Document {
  _id: Types.ObjectId;
  ownerId: string;
  incidentAId: string;
  incidentBId: string;
  canonicalPair: string;
  matchType: MatchType;
  matchedIdentifierType: ThreatIdentifier['type'];
  matchedValueMasked: string;
  strength: MatchStrength;
  explanation: string;
  warning: string;
  userDisposition: UserDisposition;
  createdAt: Date;
  updatedAt: Date;
}

const ThreatLinkSchema = new Schema<IThreatLinkDocument>(
  {
    ownerId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    incidentAId: {
      type: String,
      required: true,
      index: true,
    },
    incidentBId: {
      type: String,
      required: true,
      index: true,
    },
    canonicalPair: {
      type: String,
      required: true,
    },
    matchType: {
      type: String,
      enum: ['EXACT_IDENTIFIER', 'SIMILAR_TEXT'],
      required: true,
      default: 'EXACT_IDENTIFIER',
    },
    matchedIdentifierType: {
      type: String,
      enum: ['USERNAME', 'PHONE', 'EMAIL', 'URL', 'OTHER'],
      required: true,
    },
    matchedValueMasked: {
      type: String,
      required: true,
    },
    strength: {
      type: String,
      enum: ['STRONG', 'MODERATE', 'WEAK'],
      required: true,
      default: 'STRONG',
    },
    explanation: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    warning: {
      type: String,
      required: true,
      maxlength: 1000,
      default:
        'A correlation does not prove common ownership, perpetrator identity, or culpability. Treat this as an investigative lead only.',
    },
    userDisposition: {
      type: String,
      enum: ['PENDING', 'RELEVANT', 'NOT_RELATED', 'UNSURE'],
      default: 'PENDING',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure a canonical pair can never have duplicate edges per owner
ThreatLinkSchema.index({ ownerId: 1, canonicalPair: 1 }, { unique: true });
ThreatLinkSchema.index({ ownerId: 1, incidentAId: 1 });
ThreatLinkSchema.index({ ownerId: 1, incidentBId: 1 });

export function threatLinkDocToEdge(
  doc: IThreatLinkDocument,
  sourceIncidentId: string
): ThreatLinkEdge {
  const relatedIncidentId =
    doc.incidentAId === sourceIncidentId ? doc.incidentBId : doc.incidentAId;

  return {
    id: doc._id.toString(),
    ownerId: doc.ownerId,
    sourceIncidentId,
    relatedIncidentId,
    matchType: doc.matchType,
    matchedIdentifierType: doc.matchedIdentifierType,
    matchedValueMasked: doc.matchedValueMasked,
    strength: doc.strength,
    explanation: doc.explanation,
    warning: doc.warning,
    userDisposition: doc.userDisposition,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export const ThreatLinkModel = model<IThreatLinkDocument>(
  'ThreatLink',
  ThreatLinkSchema
);
