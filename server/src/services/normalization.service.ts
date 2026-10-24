import { ThreatIdentifier } from '@rakshasphere/shared';

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'ref',
  'fbclid',
  'gclid',
  'igshid',
  'si',
]);

export class NormalizationService {
  /**
   * Normalizes an identifier based on its declared type.
   * Returns a deterministic normalized string, or null if the value is invalid/ambiguous.
   */
  public static normalize(type: ThreatIdentifier['type'], value: string): string | null {
    if (!value || typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }

    switch (type) {
      case 'USERNAME':
        return this.normalizeUsername(trimmed);
      case 'PHONE':
        return this.normalizePhone(trimmed);
      case 'EMAIL':
        return this.normalizeEmail(trimmed);
      case 'URL':
        return this.normalizeUrl(trimmed);
      case 'OTHER':
        return this.normalizeOther(trimmed);
      default:
        return null;
    }
  }

  private static normalizeUsername(raw: string): string | null {
    // Strip all leading '@' characters and lowercase
    const stripped = raw.replace(/^@+/, '').trim().toLowerCase();
    return stripped.length >= 2 ? stripped : null;
  }

  private static normalizePhone(raw: string): string | null {
    const hasLeadingPlus = raw.startsWith('+');
    // Extract only digits
    const digitsOnly = raw.replace(/\D/g, '');

    // Phone numbers must have at least 7 digits to prevent broad/ambiguous false matching
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      return null;
    }

    return hasLeadingPlus ? `+${digitsOnly}` : digitsOnly;
  }

  private static normalizeEmail(raw: string): string | null {
    const lower = raw.toLowerCase().trim();
    // Basic RFC 5322 regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(lower)) {
      return null;
    }
    return lower;
  }

  private static normalizeUrl(raw: string): string | null {
    let urlString = raw.trim();

    // If protocol is missing, add https:// for parsing
    if (!/^https?:\/\//i.test(urlString)) {
      urlString = `https://${urlString}`;
    }

    try {
      const parsed = new URL(urlString);

      // Force https protocol and lowercase hostname
      const protocol = 'https:';
      const host = parsed.hostname.toLowerCase();

      // Normalize pathname: strip redundant trailing slashes unless it's root
      let pathname = parsed.pathname.replace(/\/+$/, '');
      if (pathname.length === 0) {
        pathname = '/';
      }

      // Filter tracking parameters and sort remaining query params deterministically
      const searchParams = new URLSearchParams();
      const keys = Array.from(parsed.searchParams.keys()).sort();

      for (const key of keys) {
        if (!TRACKING_PARAMS.has(key.toLowerCase())) {
          const val = parsed.searchParams.get(key);
          if (val !== null) {
            searchParams.set(key, val);
          }
        }
      }

      const queryString = searchParams.toString();
      return `${protocol}//${host}${pathname}${queryString ? `?${queryString}` : ''}`;
    } catch {
      // If parsing fails completely, clean up string minimally
      return raw.toLowerCase().trim().replace(/\/+$/, '');
    }
  }

  private static normalizeOther(raw: string): string | null {
    const collapsed = raw.toLowerCase().trim().replace(/\s+/g, ' ');
    return collapsed.length >= 2 ? collapsed : null;
  }

  /**
   * Safely masks an identifier value for display in explanations and UI,
   * protecting privacy while preserving recognizable fragments.
   */
  public static maskValue(type: ThreatIdentifier['type'], rawValue: string): string {
    const str = rawValue.trim();
    if (str.length <= 3) {
      return '***';
    }

    switch (type) {
      case 'EMAIL': {
        const parts = str.split('@');
        if (parts.length === 2 && parts[0].length > 2) {
          const name = parts[0];
          const maskedName = `${name[0]}***${name[name.length - 1]}`;
          return `${maskedName}@${parts[1]}`;
        }
        return `${str.slice(0, 2)}***@***`;
      }
      case 'PHONE': {
        if (str.length > 6) {
          const prefix = str.slice(0, 3);
          const suffix = str.slice(-3);
          return `${prefix}******${suffix}`;
        }
        return `***${str.slice(-2)}`;
      }
      case 'USERNAME': {
        const clean = str.startsWith('@') ? str.slice(1) : str;
        if (clean.length > 4) {
          return `@${clean.slice(0, 2)}******${clean.slice(-2)}`;
        }
        return `@${clean.slice(0, 1)}***`;
      }
      case 'URL': {
        try {
          const parsed = new URL(str.startsWith('http') ? str : `https://${str}`);
          const pathSnippet = parsed.pathname.length > 8 ? `${parsed.pathname.slice(0, 6)}...` : parsed.pathname;
          return `${parsed.hostname}${pathSnippet}`;
        } catch {
          return `${str.slice(0, 12)}...`;
        }
      }
      case 'OTHER':
      default: {
        if (str.length > 8) {
          return `${str.slice(0, 3)}******${str.slice(-2)}`;
        }
        return `${str.slice(0, 2)}***`;
      }
    }
  }
}
