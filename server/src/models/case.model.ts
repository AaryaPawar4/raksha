import { Schema, model, Document, Types } from 'mongoose';
import { TrackedCase, CaseStatus } from '@rakshasphere/shared';

export interface ICaseDocument extends Document {
  _id: Types.ObjectId;
  ownerId: string;
  incidentId: string;
  reportingChannel: string;
  referenceNumber: string;
  status: CaseStatus;
  followUpAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CaseSchema = new Schema<ICaseDocument>(
  {
    ownerId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    incidentId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    reportingChannel: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    referenceNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    status: {
      type: String,
      required: true,
      enum: ['REPORTED', 'UNDER_REVIEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
      default: 'REPORTED',
    },
    followUpAt: {
      type: Date,
      required: false,
    },
    notes: {
      type: String,
      required: false,
      trim: true,
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
  }
);

CaseSchema.index({ ownerId: 1, incidentId: 1 });
CaseSchema.index({ ownerId: 1, createdAt: -1 });

export function caseDocToTrackedCase(doc: ICaseDocument): TrackedCase {
  return {
    id: doc._id.toString(),
    ownerId: doc.ownerId,
    incidentId: doc.incidentId,
    reportingChannel: doc.reportingChannel,
    referenceNumber: doc.referenceNumber,
    status: doc.status,
    followUpAt: doc.followUpAt?.toISOString(),
    notes: doc.notes,
    verificationBadge: 'USER_REPORTED',
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export const CaseModel = model<ICaseDocument>('Case', CaseSchema);
