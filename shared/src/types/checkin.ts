// ─── Consent / Check-In / Delivery enums ────────────────────────────────────

export type ConsentStatus = 'PENDING' | 'CONSENTED' | 'DECLINED';

export type CheckInStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE';

export type DeliveryState = 'PREPARED' | 'OPENED_IN_APP' | 'CONFIRMED';

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
