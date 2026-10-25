import { Types } from 'mongoose';
import { UserModel, IUserDocument, userDocToUser, IRefreshTokenItem } from '../models/user.model';
import { User } from '@rakshasphere/shared';

export class UserRepository {
  public static async create(userData: {
    email: string;
    passwordHash: string;
    name: string;
  }): Promise<{ user: User; doc: IUserDocument }> {
    const doc = await UserModel.create({
      email: userData.email.toLowerCase().trim(),
      passwordHash: userData.passwordHash,
      name: userData.name.trim(),
      refreshTokens: [],
    });
    return { user: userDocToUser(doc), doc };
  }

  public static async findByEmail(email: string): Promise<IUserDocument | null> {
    return UserModel.findOne({ email: email.toLowerCase().trim() }).exec();
  }

  public static async findById(id: string): Promise<IUserDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return UserModel.findById(new Types.ObjectId(id)).exec();
  }

  public static async addRefreshToken(
    userId: string,
    tokenItem: { tokenHash: string; family: string; expiresAt: Date }
  ): Promise<boolean> {
    if (!Types.ObjectId.isValid(userId)) return false;
    const result = await UserModel.updateOne(
      { _id: new Types.ObjectId(userId) },
      {
        $push: {
          refreshTokens: {
            tokenHash: tokenItem.tokenHash,
            family: tokenItem.family,
            expiresAt: tokenItem.expiresAt,
            isRevoked: false,
          },
        },
      }
    );
    return result.modifiedCount === 1;
  }

  public static async findByRefreshTokenHash(
    tokenHash: string
  ): Promise<{ userDoc: IUserDocument; tokenItem: IRefreshTokenItem } | null> {
    const doc = await UserModel.findOne({
      'refreshTokens.tokenHash': tokenHash,
    }).exec();

    if (!doc) return null;
    const tokenItem = doc.refreshTokens.find((t) => t.tokenHash === tokenHash);
    if (!tokenItem) return null;

    return { userDoc: doc, tokenItem };
  }

  public static async atomicRevokeActiveToken(
    tokenHash: string
  ): Promise<{ userDoc: IUserDocument; tokenItem: IRefreshTokenItem } | null> {
    const doc = await UserModel.findOneAndUpdate(
      {
        refreshTokens: {
          $elemMatch: {
            tokenHash,
            isRevoked: false,
          },
        },
      },
      {
        $set: {
          'refreshTokens.$.isRevoked': true,
        },
      },
      { returnDocument: 'after' }
    ).exec();

    if (!doc) return null;
    const tokenItem = doc.refreshTokens.find((t) => t.tokenHash === tokenHash);
    if (!tokenItem) return null;
    return { userDoc: doc, tokenItem };
  }

  public static async revokeRefreshToken(
    userId: string,
    tokenHash: string
  ): Promise<boolean> {
    if (!Types.ObjectId.isValid(userId)) return false;
    const result = await UserModel.updateOne(
      {
        _id: new Types.ObjectId(userId),
        'refreshTokens.tokenHash': tokenHash,
      },
      {
        $set: {
          'refreshTokens.$.isRevoked': true,
        },
      }
    );
    return result.modifiedCount === 1;
  }

  public static async revokeTokenFamily(
    userId: string,
    family: string
  ): Promise<boolean> {
    if (!Types.ObjectId.isValid(userId)) return false;
    const result = await UserModel.updateOne(
      { _id: new Types.ObjectId(userId) },
      {
        $set: {
          'refreshTokens.$[elem].isRevoked': true,
        },
      },
      {
        arrayFilters: [{ 'elem.family': family }],
      }
    );
    return result.modifiedCount > 0;
  }

  public static async revokeAllTokens(userId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(userId)) return false;
    const result = await UserModel.updateOne(
      { _id: new Types.ObjectId(userId) },
      {
        $set: {
          'refreshTokens.$[].isRevoked': true,
        },
      }
    );
    return result.modifiedCount > 0;
  }

  public static async setEmailVerificationToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date
  ): Promise<boolean> {
    if (!Types.ObjectId.isValid(userId)) return false;
    const result = await UserModel.updateOne(
      { _id: new Types.ObjectId(userId) },
      {
        $set: {
          emailVerificationTokenHash: tokenHash,
          emailVerificationExpiresAt: expiresAt,
        },
      }
    );
    return result.modifiedCount === 1;
  }

  public static async markEmailVerified(userId: string): Promise<User | null> {
    if (!Types.ObjectId.isValid(userId)) return null;
    const doc = await UserModel.findByIdAndUpdate(
      new Types.ObjectId(userId),
      {
        $set: {
          isEmailVerified: true,
        },
        $unset: {
          emailVerificationTokenHash: 1,
          emailVerificationExpiresAt: 1,
        },
      },
      { new: true }
    );
    return doc ? userDocToUser(doc) : null;
  }
}
