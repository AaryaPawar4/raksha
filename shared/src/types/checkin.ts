// ─── Consent / Check-In / Delivery enums ────────────────────────────────────

export type ConsentStatus = 'PENDING' | 'CONSENTED' | 'DECLINED';

export type CheckInStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE';

export type DeliveryState = 'PREPARED' | 'OPENED_IN_APP' | 'CONFIRMED';

export type EmailDeliveryStatus =
  | 'PENDING'
  | 'ACCEPTED_BY_PROVIDER'
  | 'DELIVERED'
  | 'FAILED'
  | 'UNAVAILABLE';

export type CheckInChannel = 'MANUAL_APP_INTENT' | 'AUTOMATED_EMAIL';

// ─── Trusted Contact ─────────────────────────────────────────────────────────

export interface TrustedContact {
  id: string;
  ownerId: string;
  name: string;
  phone?: string;
  email?: string;
  consentStatus: ConsentStatus;
  consentGivenAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactDTO {
  name: string;
  phone?: string;
  email?: string;
}

export interface UpdateContactDTO {
  name?: string;
  phone?: string;
  email?: string;
}

// ─── Check-In ────────────────────────────────────────────────────────────────

export interface CheckIn {
  id: string;
  ownerId: string;
  contactId: string;
  contactName: string;
  /** The prepared message text that will be shared with the contact */
  message: string;
  locationSharingEnabled: boolean;
  latitudeSnapshot?: number;
  longitudeSnapshot?: number;
  status: CheckInStatus;
  dueAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  deliveryState: DeliveryState;
  deliveryDisclaimer: string;
  channel?: CheckInChannel;
  emailDeliveryStatus?: EmailDeliveryStatus;
  recipientEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCheckInDTO {
  contactId: string;
  message: string;
  locationSharingEnabled: boolean;
  latitudeSnapshot?: number;
  longitudeSnapshot?: number;
  dueAt?: string;
}

export interface SendEmailCheckInDTO {
  recipientType: 'SELF' | 'TRUSTED_CONTACT';
  contactId?: string;
  message: string;
  clientNonce?: string;
}

export interface EmailProviderStatus {
  isConfigured: boolean;
  providerName: string;
  fromAddress: string;
}
