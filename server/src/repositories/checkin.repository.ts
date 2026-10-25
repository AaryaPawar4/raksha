import { Types } from 'mongoose';
import { CheckInModel, ICheckInDocument, checkinDocToCheckIn } from '../models/checkin.model';
import { CheckIn, CheckInStatus, DeliveryState } from '@rakshasphere/shared';

function toCheckIn(doc: ICheckInDocument): CheckIn {
  return checkinDocToCheckIn(doc);
}

export interface CreateCheckInData {
  contactId: string;
  contactName: string;
  message: string;
  locationSharingEnabled: boolean;
  latitudeSnapshot?: number;
  longitudeSnapshot?: number;
  dueAt?: Date;
  deliveryDisclaimer: string;
  channel?: 'MANUAL_APP_INTENT' | 'AUTOMATED_EMAIL';
  emailDeliveryStatus?: 'PENDING' | 'ACCEPTED_BY_PROVIDER' | 'DELIVERED' | 'FAILED' | 'UNAVAILABLE';
  recipientEmail?: string;
  clientNonce?: string;
}

export class CheckInRepository {
  public static async create(
    ownerId: string,
    data: CreateCheckInData
  ): Promise<CheckIn> {
    const doc = await CheckInModel.create({
      ownerId,
      contactId: data.contactId,
      contactName: data.contactName,
      message: data.message,
      locationSharingEnabled: data.locationSharingEnabled,
      latitudeSnapshot: data.latitudeSnapshot,
      longitudeSnapshot: data.longitudeSnapshot,
      dueAt: data.dueAt,
      deliveryDisclaimer: data.deliveryDisclaimer,
      channel: data.channel ?? 'MANUAL_APP_INTENT',
      emailDeliveryStatus: data.emailDeliveryStatus,
      recipientEmail: data.recipientEmail,
      clientNonce: data.clientNonce,
      deliveryState: data.channel === 'AUTOMATED_EMAIL' ? 'CONFIRMED' : 'PREPARED',
      status: 'ACTIVE',
    });
    return toCheckIn(doc);
  }

  public static async findByOwner(ownerId: string): Promise<CheckIn[]> {
    const docs = await CheckInModel.find({ ownerId }).sort({ createdAt: -1 }).exec();
    return docs.map(toCheckIn);
  }

  public static async findByIdAndOwner(
    ownerId: string,
    id: string
  ): Promise<CheckIn | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await CheckInModel.findOne({
      _id: new Types.ObjectId(id),
      ownerId,
    });
    return doc ? toCheckIn(doc) : null;
  }

  public static async updateStatus(
    ownerId: string,
    id: string,
    status: CheckInStatus,
    extraFields: Record<string, unknown> = {}
  ): Promise<CheckIn | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await CheckInModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), ownerId },
      { $set: { status, ...extraFields } },
      { returnDocument: 'after' }
    );
    return doc ? toCheckIn(doc) : null;
  }

  public static async updateDeliveryState(
    ownerId: string,
    id: string,
    state: DeliveryState
  ): Promise<CheckIn | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await CheckInModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), ownerId },
      { $set: { deliveryState: state } },
      { returnDocument: 'after' }
    );
    return doc ? toCheckIn(doc) : null;
  }
}
