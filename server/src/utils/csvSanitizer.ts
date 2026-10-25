/**
 * Utility for building secure, RFC-4180-compliant CSV documents with defense against
 * Formula Injection (CWE-1236 / CSV Injection).
 */

const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Sanitizes a single cell value against CSV formula injection and properly escapes quotes.
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  let str = String(value);

  // Check for formula injection triggers at the start of string
  const isFormula = FORMULA_PREFIXES.some((prefix) => str.startsWith(prefix));
  if (isFormula) {
    // Neutralize formula execution by prefixing with a single quote
    str = `'${str}`;
  }

  // If the cell contains quotes, commas, newlines, or was neutralized with a quote,
  // wrap it in double quotes and escape internal quotes by doubling them.
  const needsWrapping =
    str.includes('"') ||
    str.includes(',') ||
    str.includes('\n') ||
    str.includes('\r') ||
    isFormula;

  if (needsWrapping) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Converts an array of headers and row objects into a sanitized CSV string.
 * Prepends UTF-8 BOM (\uFEFF) for optimal Excel compatibility.
 */
export function formatCsv(
  headers: Array<{ key: string; label: string }>,
  rows: Array<Record<string, unknown>>
): string {
  const headerLine = headers.map((h) => sanitizeCsvCell(h.label)).join(',');
  const rowLines = rows.map((row) =>
    headers.map((h) => sanitizeCsvCell(row[h.key])).join(',')
  );

  return '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
}

/**
 * Creates a sanitized, safe filename by stripping path traversals and non-safe characters.
 */
export function createSafeFilename(prefix: string, identifier?: string, ext = 'csv'): string {
  const safePrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeId = identifier ? `_${identifier.replace(/[^a-zA-Z0-9_-]/g, '_')}` : '';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${safePrefix}${safeId}_${timestamp}.${ext}`;
}
