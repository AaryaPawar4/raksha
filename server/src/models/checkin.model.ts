import { Schema, model, Document, Types } from 'mongoose';
import { CheckInStatus, DeliveryState, CheckIn } from '@rakshasphere/shared';

export interface ICheckInDocument extends Document {
  _id: Types.ObjectId;
  ownerId: string;
  contactId: string;
  contactName: string;
  message: string;
  locationSharingEnabled: boolean;
  latitudeSnapshot?: number;
  longitudeSnapshot?: number;
  status: CheckInStatus;
  dueAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  deliveryState: DeliveryState;
  deliveryDisclaimer: string;
  createdAt: Date;
  updatedAt: Date;
}

const CheckInSchema = new Schema<ICheckInDocument>(
  {
    ownerId: {
      type: String,
      required: true,
      index: true,
    },
    contactId: {
      type: String,
      required: true,
      index: true,
    },
    contactName: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    locationSharingEnabled: {
      type: Boolean,
      default: false,
    },
    latitudeSnapshot: {
      type: Number,
      min: -90,
      max: 90,
    },
    longitudeSnapshot: {
      type: Number,
      min: -180,
      max: 180,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED', 'CANCELLED', 'OVERDUE'],
      default: 'ACTIVE',
      required: true,
    },
    dueAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    deliveryState: {
      type: String,
      enum: ['PREPARED', 'OPENED_IN_APP', 'CONFIRMED'],
      default: 'PREPARED',
      required: true,
    },
    deliveryDisclaimer: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

CheckInSchema.index({ ownerId: 1, createdAt: -1 });

export function checkinDocToCheckIn(doc: ICheckInDocument): CheckIn {
  return {
    id: doc._id.toString(),
    ownerId: doc.ownerId,
    contactId: doc.contactId,
    contactName: doc.contactName,
    message: doc.message,
    locationSharingEnabled: doc.locationSharingEnabled,
    latitudeSnapshot: doc.latitudeSnapshot,
    longitudeSnapshot: doc.longitudeSnapshot,
    status: doc.status,
    dueAt: doc.dueAt?.toISOString(),
    completedAt: doc.completedAt?.toISOString(),
    cancelledAt: doc.cancelledAt?.toISOString(),
    deliveryState: doc.deliveryState,
    deliveryDisclaimer: doc.deliveryDisclaimer,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export const CheckInModel = model<ICheckInDocument>('CheckIn', CheckInSchema);
