import { Schema, model, Document, Types } from 'mongoose';
import { IncidentType, IncidentStatus, PlatformType, ThreatIdentifier } from '@rakshasphere/shared';

export interface IIncidentDocument extends Document {
  _id: Types.ObjectId;
  ownerId: string;
  title: string;
  incidentType: IncidentType;
  description: string;
  occurredAt: Date;
  platform: PlatformType;
  status: IncidentStatus;
  identifiers?: ThreatIdentifier[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IIncidentJSON {
  id: string;
  ownerId: string;
  title: string;
  incidentType: IncidentType;
  description: string;
  occurredAt: string;
  platform: PlatformType;
  status: IncidentStatus;
  identifiers: ThreatIdentifier[];
  createdAt: string;
  updatedAt: string;
}

const ThreatIdentifierSchema = new Schema<ThreatIdentifier>(
  {
    type: {
      type: String,
      enum: ['USERNAME', 'PHONE', 'EMAIL', 'URL', 'OTHER'],
      required: true,
    },
    value: {
      type: String,
      required: true,
      trim: true,
      maxlength: 256,
    },
  },
  { _id: false }
);

const IncidentSchema = new Schema<IIncidentDocument>(
  {
    ownerId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 120,
    },
    incidentType: {
      type: String,
      required: true,
      enum: [
        'HARASSMENT',
        'DOXXING',
        'IMPERSONATION',
        'BLACKMAIL',
        'STALKING',
        'FINANCIAL_SCAM',
        'OTHER',
      ],
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    occurredAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    platform: {
      type: String,
      required: true,
      enum: [
        'INSTAGRAM',
        'WHATSAPP',
        'TELEGRAM',
        'TWITTER_X',
        'FACEBOOK',
        'SMS',
        'EMAIL',
        'OTHER',
      ],
    },
    status: {
      type: String,
      required: true,
      enum: ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'ARCHIVED'],
      default: 'OPEN',
      index: true,
    },
    identifiers: {
      type: [ThreatIdentifierSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying user's incidents by date/status efficiently
IncidentSchema.index({ ownerId: 1, createdAt: -1 });
IncidentSchema.index({ ownerId: 1, 'identifiers.value': 1 });

export function docToJSON(doc: IIncidentDocument): IIncidentJSON {
  return {
    id: doc._id.toString(),
    ownerId: doc.ownerId,
    title: doc.title,
    incidentType: doc.incidentType,
    description: doc.description,
    occurredAt: doc.occurredAt.toISOString(),
    platform: doc.platform,
    status: doc.status,
    identifiers: doc.identifiers ?? [],
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export const IncidentModel = model<IIncidentDocument>('Incident', IncidentSchema);
