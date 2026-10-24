import { EncryptionMetadata } from '@rakshasphere/shared';

export function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.trim();
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return bytes;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export class CryptoVaultService {
  /**
   * Computes SHA-256 digest of arbitrary byte buffer using standard Web Crypto API.
   * Returns a lowercase hex string.
   */
  public static async computeSha256(data: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return bufferToHex(hashBuffer);
  }

  /**
   * Derives a 256-bit AES-GCM CryptoKey from a user passphrase using PBKDF2-SHA256.
   * Passphrases are NEVER sent to the server.
   */
  private static async deriveKey(
    passphrase: string,
    salt: Uint8Array,
    iterations: number
  ): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as unknown as BufferSource,
        iterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      {
        name: 'AES-GCM',
        length: 256,
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Client-Side AES-GCM Encryption:
   * 1. Computes SHA-256 digest of original plaintext bytes.
   * 2. Generates fresh random 16-byte salt and fresh 12-byte IV (nonce).
   * 3. Derives AES-GCM 256-bit key from user passphrase via PBKDF2.
   * 4. Encrypts plaintext bytes in-browser.
   * 5. Returns base64 ciphertext and encryption metadata.
   */
  public static async encrypt(
    plaintextBytes: ArrayBuffer,
    passphrase: string,
    iterations = 600000
  ): Promise<{
    ciphertextBase64: string;
    sha256: string;
    encryptionMetadata: EncryptionMetadata;
  }> {
    if (!passphrase || passphrase.length < 8) {
      throw new Error('Vault passphrase must be at least 8 characters long.');
    }

    // 1. Calculate integrity hash of plaintext BEFORE encryption
    const sha256 = await this.computeSha256(plaintextBytes);

    // 2. Generate cryptographically random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit recommended for AES-GCM

    // 3. Derive key
    const key = await this.deriveKey(passphrase, salt, iterations);

    // 4. Encrypt
    const ciphertextBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv as unknown as BufferSource,
      },
      key,
      plaintextBytes
    );

    const ciphertextBase64 = arrayBufferToBase64(ciphertextBuffer);

    return {
      ciphertextBase64,
      sha256,
      encryptionMetadata: {
        algorithm: 'AES-GCM',
        keyDerivation: 'PBKDF2',
        pbkdf2Iterations: iterations,
        ivHex: bufferToHex(iv),
        saltHex: bufferToHex(salt),
        version: '1.0',
      },
    };
  }

  /**
   * Client-Side AES-GCM Decryption & Integrity Verification:
   * 1. Decodes base64 ciphertext and hex IV/salt.
   * 2. Derives AES-GCM key using the user passphrase and recorded salt.
   * 3. Decrypts ciphertext in-browser memory.
   * 4. Computes SHA-256 of decrypted bytes and asserts match against recorded hash.
   */
  public static async decrypt(
    ciphertextBase64: string,
    passphrase: string,
    metadata: EncryptionMetadata,
    expectedSha256: string
  ): Promise<{
    decryptedBytes: ArrayBuffer;
    sha256Match: boolean;
    computedSha256: string;
  }> {
    const ciphertext = base64ToArrayBuffer(ciphertextBase64);
    const salt = hexToBytes(metadata.saltHex);
    const iv = hexToBytes(metadata.ivHex);

    const key = await this.deriveKey(passphrase, salt, metadata.pbkdf2Iterations);

    try {
      const decryptedBytes = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv as unknown as BufferSource,
        },
        key,
        ciphertext
      );

      // Verify SHA-256 of decrypted bytes against recorded digest
      const computedSha256 = await this.computeSha256(decryptedBytes);
      const sha256Match =
        computedSha256.toLowerCase() === expectedSha256.toLowerCase();

      return {
        decryptedBytes,
        sha256Match,
        computedSha256,
      };
    } catch {
      throw new Error(
        'Decryption failed. The vault passphrase may be incorrect, or the ciphertext has been altered.'
      );
    }
  }
}
