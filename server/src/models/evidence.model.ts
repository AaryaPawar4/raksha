import { Schema, model, Document, Types } from 'mongoose';
import { EncryptionMetadata, EvidenceItem, EvidenceItemWithCiphertext } from '@rakshasphere/shared';

export interface IEvidenceDocument extends Document {
  _id: Types.ObjectId;
  ownerId: string;
  incidentId: string;
  filename: string;
  mimeType: string;
  size: number;
  sha256: string;
  ciphertextBase64: string;
  encryptionMetadata: EncryptionMetadata;
  userEnteredCaptureTime?: Date;
  serverReceivedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EncryptionMetadataSchema = new Schema<EncryptionMetadata>(
  {
    algorithm: {
      type: String,
      enum: ['AES-GCM'],
      required: true,
      default: 'AES-GCM',
    },
    keyDerivation: {
      type: String,
      enum: ['PBKDF2'],
      required: true,
      default: 'PBKDF2',
    },
    pbkdf2Iterations: {
      type: Number,
      required: true,
      min: 10000,
      default: 100000,
    },
    ivHex: {
      type: String,
      required: true,
      minlength: 24, // 12 bytes in hex = 24 chars
      maxlength: 32,
    },
    saltHex: {
      type: String,
      required: true,
      minlength: 32, // 16 bytes in hex = 32 chars
      maxlength: 64,
    },
    version: {
      type: String,
      required: true,
      default: '1.0',
    },
  },
  { _id: false }
);

const EvidenceSchema = new Schema<IEvidenceDocument>(
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
    filename: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    mimeType: {
      type: String,
      required: true,
      enum: [
        'image/png',
        'image/jpeg',
        'image/webp',
        'image/gif',
        'application/pdf',
        'text/plain',
      ],
    },
    size: {
      type: Number,
      required: true,
      min: 1,
      max: 10 * 1024 * 1024, // 10MB max upload size
    },
    sha256: {
      type: String,
      required: true,
      match: /^[a-f0-9]{64}$/i,
      trim: true,
    },
    ciphertextBase64: {
      type: String,
      required: true,
    },
    encryptionMetadata: {
      type: EncryptionMetadataSchema,
      required: true,
    },
    userEnteredCaptureTime: {
      type: Date,
      required: false,
    },
    serverReceivedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for tenant isolation and incident lookups
EvidenceSchema.index({ ownerId: 1, incidentId: 1 });
EvidenceSchema.index({ ownerId: 1, createdAt: -1 });

export function evidenceDocToItem(doc: IEvidenceDocument): EvidenceItem {
  return {
    id: doc._id.toString(),
    ownerId: doc.ownerId,
    incidentId: doc.incidentId,
    filename: doc.filename,
    mimeType: doc.mimeType,
    size: doc.size,
    sha256: doc.sha256,
    encryptionMetadata: doc.encryptionMetadata,
    userEnteredCaptureTime: doc.userEnteredCaptureTime?.toISOString(),
    serverReceivedAt: doc.serverReceivedAt.toISOString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export function evidenceDocToItemWithCiphertext(
  doc: IEvidenceDocument
): EvidenceItemWithCiphertext {
  return {
    ...evidenceDocToItem(doc),
    ciphertextBase64: doc.ciphertextBase64,
  };
}

export const EvidenceModel = model<IEvidenceDocument>('Evidence', EvidenceSchema);
