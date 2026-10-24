export interface EncryptionMetadata {
  algorithm: 'AES-GCM';
  keyDerivation: 'PBKDF2';
  pbkdf2Iterations: number;
  ivHex: string; // 12-byte IV in hex
  saltHex: string; // 16-byte salt in hex
  version: '1.0';
}

export interface EvidenceItem {
  id: string;
  ownerId: string;
  incidentId: string;
  filename: string;
  mimeType: string;
  size: number;
  sha256: string; // hex-encoded SHA-256 of original plaintext
  encryptionMetadata: EncryptionMetadata;
  userEnteredCaptureTime?: string;
  serverReceivedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface EvidenceItemWithCiphertext extends EvidenceItem {
  ciphertextBase64: string;
}

export interface UploadEvidenceDTO {
  incidentId: string;
  filename: string;
  mimeType: string;
  size: number;
  sha256: string;
  ciphertextBase64: string;
  encryptionMetadata: EncryptionMetadata;
  userEnteredCaptureTime?: string;
}

export interface VerifyEvidenceResponse {
  evidenceId: string;
  storedSha256: string;
  ciphertextSha256: string;
  integrityStatus: 'VERIFIED' | 'TAMPERED_OR_CORRUPT';
  verifiedAt: string;
  disclaimer: string;
}
