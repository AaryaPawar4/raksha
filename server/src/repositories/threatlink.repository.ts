import { Types } from 'mongoose';
import { ThreatLinkModel, IThreatLinkDocument } from '../models/threatlink.model';
import { UserDisposition, ThreatIdentifier, MatchType, MatchStrength } from '@rakshasphere/shared';

export class ThreatLinkRepository {
  public static async findLinksByIncident(
    ownerId: string,
    incidentId: string
  ): Promise<IThreatLinkDocument[]> {
    return ThreatLinkModel.find({
      ownerId,
      $or: [{ incidentAId: incidentId }, { incidentBId: incidentId }],
    })
      .sort({ createdAt: -1 })
      .exec();
  }

  public static async findByIdAndOwner(
    ownerId: string,
    linkId: string
  ): Promise<IThreatLinkDocument | null> {
    if (!Types.ObjectId.isValid(linkId)) {
      return null;
    }

    return ThreatLinkModel.findOne({
      _id: new Types.ObjectId(linkId),
      ownerId,
    }).exec();
  }

  public static async updateDisposition(
    ownerId: string,
    linkId: string,
    disposition: UserDisposition
  ): Promise<IThreatLinkDocument | null> {
    if (!Types.ObjectId.isValid(linkId)) {
      return null;
    }

    return ThreatLinkModel.findOneAndUpdate(
      { _id: new Types.ObjectId(linkId), ownerId },
      { $set: { userDisposition: disposition } },
      { returnDocument: 'after' }
    ).exec();
  }

  public static async createOrUpdateLink(
    ownerId: string,
    incidentAId: string,
    incidentBId: string,
    canonicalPair: string,
    matchData: {
      matchedIdentifierType: ThreatIdentifier['type'];
      matchedValueMasked: string;
      explanation: string;
      warning: string;
      strength: MatchStrength;
      matchType: MatchType;
    }
  ): Promise<IThreatLinkDocument> {
    // If a link exists, we preserve the user's existing disposition unless none was set
    const existing = await ThreatLinkModel.findOne({
      ownerId,
      canonicalPair,
    });

    if (existing) {
      existing.matchedIdentifierType = matchData.matchedIdentifierType;
      existing.matchedValueMasked = matchData.matchedValueMasked;
      existing.explanation = matchData.explanation;
      existing.strength = matchData.strength;
      existing.warning = matchData.warning;
      return existing.save();
    }

    return ThreatLinkModel.create({
      ownerId,
      incidentAId,
      incidentBId,
      canonicalPair,
      ...matchData,
      userDisposition: 'PENDING',
    });
  }
}
