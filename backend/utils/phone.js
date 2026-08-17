// Phone normalization/validation utility for WhatsApp (Meta Cloud API).
//
// Meta's Cloud API expects the `to` field as digits only, in full
// international format WITHOUT a leading '+' (e.g. "923001234567").
// This module normalizes the phone number formats Noor-Mist customers
// actually type at checkout into that shape, and is written so it also
// tolerates general international numbers (not just Pakistani ones) for
// when the store starts accepting international orders — see isValid().

// Pakistani mobile numbers: 10 digits after the country code, starting
// with 3 (e.g. 3001234567 -> +92 300 1234567).
const PK_COUNTRY_CODE = '92';
const PK_MOBILE_RE = /^3\d{9}$/;

/**
 * Strips everything except digits and a possible leading '+'.
 */
function stripFormatting(raw) {
  const value = String(raw || '').trim();
  // Keep a leading '+' as a signal that the number is already in
  // international form; drop every other non-digit character
  // (spaces, dashes, parentheses, etc.).
  const hasPlus = value.startsWith('+');
  const digits = value.replace(/[^\d]/g, '');
  return { digits, hasPlus };
}

/**
 * Normalizes a phone number into Meta's expected format: digits only,
 * full international format, no leading '+'.
 *
 * Handles, at minimum, all the Pakistani formats called out in the spec:
 *   03001234567     -> 923001234567
 *   0300-1234567    -> 923001234567
 *   +923001234567   -> 923001234567   (NOT 92923001234567 — see below)
 *   923001234567    -> 923001234567
 *
 * For any other apparent international number (doesn't start with a
 * Pakistani local '0' or bare '3xxxxxxxxx' pattern), the digits are
 * passed through as-is once formatting characters are stripped — this
 * keeps the door open for international orders later without silently
 * mangling a number Noor-Mist doesn't have special-case logic for.
 *
 * Returns null if the input can't be turned into a plausible number.
 */
function normalizePhone(raw) {
  const { digits, hasPlus } = stripFormatting(raw);
  if (!digits) return null;

  // Already has the country code (with or without a leading '+') — e.g.
  // "+923001234567" or "923001234567". Take it as-is; this is the case
  // that a naive "just prepend 92" implementation gets wrong and turns
  // into "92923001234567".
  if (digits.startsWith(PK_COUNTRY_CODE) && PK_MOBILE_RE.test(digits.slice(2))) {
    return digits;
  }

  // Local format with leading 0 — "03001234567" or "0300-1234567"
  // (dashes/spaces already stripped above).
  if (digits.startsWith('0') && PK_MOBILE_RE.test(digits.slice(1))) {
    return PK_COUNTRY_CODE + digits.slice(1);
  }

  // Bare 10-digit mobile number with no leading 0 or country code —
  // "3001234567".
  if (PK_MOBILE_RE.test(digits)) {
    return PK_COUNTRY_CODE + digits;
  }

  // Not a recognizable Pakistani shape. If the caller explicitly typed a
  // '+', or the number is a plausible-length international number
  // (8-15 digits per E.164), pass it through unchanged rather than
  // guessing — this is the extension point for international orders.
  if (hasPlus || (digits.length >= 8 && digits.length <= 15)) {
    return digits;
  }

  return null;
}

/**
 * True if the input normalizes to a plausible WhatsApp-reachable number.
 */
function isValidPhone(raw) {
  const normalized = normalizePhone(raw);
  return !!normalized && normalized.length >= 8 && normalized.length <= 15;
}

/**
 * Formats a normalized (digits-only) number back into a readable
 * "+92 300 1234567" style string, for display in admin UI/logs.
 * Defensive against already-formatted or raw (non-normalized) input —
 * older log rows may predate normalization — so this never produces a
 * malformed "+" + local-format string.
 */
function formatForDisplay(value) {
  if (!value) return '';
  const normalized = normalizePhone(value) || String(value).replace(/[^\d]/g, '');
  if (!normalized) return String(value);
  if (normalized.startsWith(PK_COUNTRY_CODE) && PK_MOBILE_RE.test(normalized.slice(2))) {
    const local = normalized.slice(2);
    return `+92 ${local.slice(0, 3)} ${local.slice(3)}`;
  }
  return `+${normalized}`;
}

/**
 * Masks a phone number for admin UI/logs display, e.g. "+92300XXXXXXX".
 * Keeps the country code + first 3 digits visible, masks the rest.
 */
function maskPhone(normalized) {
  if (!normalized) return '';
  const display = formatForDisplay(normalized).replace(/\s+/g, '');
  if (display.length <= 6) return display;
  const visible = display.slice(0, 6);
  const masked = 'X'.repeat(Math.max(0, display.length - 6));
  return visible + masked;
}

module.exports = { normalizePhone, isValidPhone, formatForDisplay, maskPhone };
