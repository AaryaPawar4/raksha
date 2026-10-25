import { Schema, model, Document, Types } from 'mongoose';

export type ActivityEventType =
  | 'AUTH_REGISTER'
  | 'AUTH_LOGIN_SUCCESS'
  | 'AUTH_LOGIN_FAILURE'
  | 'AUTH_LOGOUT'
  | 'AUTH_TOKEN_REFRESH'
  | 'AUTH_TOKEN_REUSE_DETECTED'
  | 'INCIDENT_CREATED'
  | 'INCIDENT_UPDATED'
  | 'INCIDENT_DELETED'
  | 'VAULT_UPLOAD'
  | 'VAULT_VERIFY'
  | 'VAULT_DELETE'
  | 'CASE_CREATED'
  | 'CASE_UPDATED'
  | 'CASE_DELETED'
  | 'CASE_PDF_EXPORTED'
  | 'INCIDENTS_CSV_EXPORTED'
  | 'CASES_CSV_EXPORTED'
  | 'CHECKIN_CREATED'
  | 'CHECKIN_COMPLETED'
  | 'CHECKIN_CANCELLED'
  | 'CONTACT_CREATED'
  | 'CONTACT_UPDATED'
  | 'CONTACT_DELETED';

export type ActivityEventOutcome = 'SUCCESS' | 'FAILURE';

export interface IActivityLogDocument extends Document {
  _id: Types.ObjectId;
  ownerId: string;
  eventType: ActivityEventType;
  outcome: ActivityEventOutcome;
  /** Safe short label for the referenced resource — never secrets */
  resourceId?: string;
  /** Human-readable label, e.g. incident title prefix or case ref number */
  resourceLabel?: string;
  /** Safe key/value metadata — never credentials, tokens, or sensitive data */
  safeMetadata?: Record<string, string | number | boolean>;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLogDocument>(
  {
    ownerId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    eventType: {
      type: String,
      required: true,
      enum: [
        'AUTH_REGISTER',
        'AUTH_LOGIN_SUCCESS',
        'AUTH_LOGIN_FAILURE',
        'AUTH_LOGOUT',
        'AUTH_TOKEN_REFRESH',
        'AUTH_TOKEN_REUSE_DETECTED',
        'INCIDENT_CREATED',
        'INCIDENT_UPDATED',
        'INCIDENT_DELETED',
        'VAULT_UPLOAD',
        'VAULT_VERIFY',
        'VAULT_DELETE',
        'CASE_CREATED',
        'CASE_UPDATED',
        'CASE_DELETED',
        'CASE_PDF_EXPORTED',
        'INCIDENTS_CSV_EXPORTED',
        'CASES_CSV_EXPORTED',
        'CHECKIN_CREATED',
        'CHECKIN_COMPLETED',
        'CHECKIN_CANCELLED',
        'CONTACT_CREATED',
        'CONTACT_UPDATED',
        'CONTACT_DELETED',
      ],
    },
    outcome: {
      type: String,
      required: true,
      enum: ['SUCCESS', 'FAILURE'],
      default: 'SUCCESS',
    },
    resourceId: {
      type: String,
      trim: true,
    },
    resourceLabel: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    safeMetadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Primary query pattern: owner + date (newest first)
ActivityLogSchema.index({ ownerId: 1, createdAt: -1 });
// Allow filtering by event type per owner
ActivityLogSchema.index({ ownerId: 1, eventType: 1, createdAt: -1 });

export const ActivityLogModel = model<IActivityLogDocument>('ActivityLog', ActivityLogSchema);
