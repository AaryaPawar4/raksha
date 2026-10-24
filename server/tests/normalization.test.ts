import { describe, it, expect } from 'vitest';
import { NormalizationService } from '../src/services/normalization.service';

describe('ThreatLink NormalizationService Unit Tests', () => {
  describe('USERNAME Normalization', () => {
    it('strips leading @ symbol and lowercases', () => {
      expect(NormalizationService.normalize('USERNAME', '@BadActor_99')).toBe('badactor_99');
      expect(NormalizationService.normalize('USERNAME', '@@@DoubleAt')).toBe('doubleat');
    });

    it('trims whitespace surrounding username', () => {
      expect(NormalizationService.normalize('USERNAME', '   @ThreatUser   ')).toBe('threatuser');
    });

    it('handles already clean usernames', () => {
      expect(NormalizationService.normalize('USERNAME', 'stalker_account')).toBe('stalker_account');
    });

    it('returns null for empty or single-character values', () => {
      expect(NormalizationService.normalize('USERNAME', '')).toBeNull();
      expect(NormalizationService.normalize('USERNAME', '@')).toBeNull();
      expect(NormalizationService.normalize('USERNAME', '  @a  ')).toBeNull();
    });
  });

  describe('PHONE Normalization', () => {
    it('normalizes international numbers with leading +', () => {
      expect(NormalizationService.normalize('PHONE', '+91 (987) 654-3210')).toBe('+919876543210');
      expect(NormalizationService.normalize('PHONE', '+1-800-555-0199')).toBe('+18005550199');
    });

    it('normalizes domestic numbers without leading +', () => {
      expect(NormalizationService.normalize('PHONE', '987 654 3210')).toBe('9876543210');
      expect(NormalizationService.normalize('PHONE', '022-26543210')).toBe('02226543210');
    });

    it('rejects ambiguous phone numbers with fewer than 7 digits', () => {
      expect(NormalizationService.normalize('PHONE', '12345')).toBeNull();
      expect(NormalizationService.normalize('PHONE', 'abc')).toBeNull();
      expect(NormalizationService.normalize('PHONE', '   ')).toBeNull();
    });
  });

  describe('EMAIL Normalization', () => {
    it('lowercases and trims email addresses', () => {
      expect(NormalizationService.normalize('EMAIL', '  John.Doe@Example.COM  ')).toBe('john.doe@example.com');
      expect(NormalizationService.normalize('EMAIL', 'ATTACKER+tag@DOMAIN.ORG')).toBe('attacker+tag@domain.org');
    });

    it('returns null for malformed emails', () => {
      expect(NormalizationService.normalize('EMAIL', 'not-an-email')).toBeNull();
      expect(NormalizationService.normalize('EMAIL', '@domain.com')).toBeNull();
      expect(NormalizationService.normalize('EMAIL', 'user@')).toBeNull();
      expect(NormalizationService.normalize('EMAIL', 'user@domain')).toBeNull();
    });
  });

  describe('URL Normalization', () => {
    it('normalizes hostnames to lowercase and forces https', () => {
      expect(NormalizationService.normalize('URL', 'http://Instagram.COM/ThreatProfile')).toBe(
        'https://instagram.com/ThreatProfile'
      );
      expect(NormalizationService.normalize('URL', 'TWITTER.COM/bad_user')).toBe(
        'https://twitter.com/bad_user'
      );
    });

    it('removes trailing slashes from path', () => {
      expect(NormalizationService.normalize('URL', 'https://example.com/channel/user123///')).toBe(
        'https://example.com/channel/user123'
      );
    });

    it('strips tracking parameters while preserving meaningful query parameters', () => {
      const urlWithTracking =
        'https://example.com/profile?id=99&utm_source=ig&utm_medium=social&ref=share';
      expect(NormalizationService.normalize('URL', urlWithTracking)).toBe(
        'https://example.com/profile?id=99'
      );
    });
  });

  describe('OTHER Normalization', () => {
    it('collapses whitespace and lowercases other identifiers', () => {
      expect(NormalizationService.normalize('OTHER', '  Telegram   Channel   #42  ')).toBe(
        'telegram channel #42'
      );
    });

    it('returns null for single character or empty other identifiers', () => {
      expect(NormalizationService.normalize('OTHER', ' ')).toBeNull();
      expect(NormalizationService.normalize('OTHER', 'x')).toBeNull();
    });
  });

  describe('Safe Masking Helper', () => {
    it('masks emails without revealing full address', () => {
      const masked = NormalizationService.maskValue('EMAIL', 'threat_actor@example.com');
      expect(masked).toBe('t***r@example.com');
      expect(masked).not.toContain('threat_actor');
    });

    it('masks phone numbers', () => {
      const masked = NormalizationService.maskValue('PHONE', '+919876543210');
      expect(masked).toBe('+91******210');
      expect(masked).not.toContain('987654');
    });

    it('masks usernames', () => {
      const masked = NormalizationService.maskValue('USERNAME', '@bad_actor_99');
      expect(masked).toBe('@ba******99');
    });
  });
});
