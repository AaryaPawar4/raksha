import { Schema, model, Document, Types } from 'mongoose';
import { User } from '@rakshasphere/shared';

export interface IRefreshTokenItem {
  tokenHash: string;
  family: string;
  expiresAt: Date;
  createdAt: Date;
  isRevoked: boolean;
}

export interface IUserDocument extends Document {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  isEmailVerified: boolean;
  emailVerificationTokenHash?: string;
  emailVerificationExpiresAt?: Date;
  refreshTokens: IRefreshTokenItem[];
  createdAt: Date;
  updatedAt: Date;
}

const RefreshTokenSchema = new Schema<IRefreshTokenItem>(
  {
    tokenHash: { type: String, required: true, index: true },
    family: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    isRevoked: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const UserSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationTokenHash: {
      type: String,
    },
    emailVerificationExpiresAt: {
      type: Date,
    },
    refreshTokens: [RefreshTokenSchema],
  },
  {
    timestamps: true,
  }
);

export function userDocToUser(doc: IUserDocument): User {
  return {
    id: doc._id.toString(),
    email: doc.email,
    name: doc.name,
    isEmailVerified: Boolean(doc.isEmailVerified),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export const UserModel = model<IUserDocument>('User', UserSchema);
