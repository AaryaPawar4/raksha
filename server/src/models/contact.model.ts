import { Schema, model, Document, Types } from 'mongoose';
import { ConsentStatus, TrustedContact } from '@rakshasphere/shared';

export interface IContactDocument extends Document {
  _id: Types.ObjectId;
  ownerId: string;
  name: string;
  phone?: string;
  email?: string;
  consentStatus: ConsentStatus;
  consentGivenAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema = new Schema<IContactDocument>(
  {
    ownerId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    email: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    consentStatus: {
      type: String,
      enum: ['PENDING', 'CONSENTED', 'DECLINED'],
      default: 'PENDING',
      required: true,
    },
    consentGivenAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

ContactSchema.index({ ownerId: 1, createdAt: -1 });

export function contactDocToContact(doc: IContactDocument): TrustedContact {
  return {
    id: doc._id.toString(),
    ownerId: doc.ownerId,
    name: doc.name,
    phone: doc.phone,
    email: doc.email,
    consentStatus: doc.consentStatus,
    consentGivenAt: doc.consentGivenAt?.toISOString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export const ContactModel = model<IContactDocument>('Contact', ContactSchema);
