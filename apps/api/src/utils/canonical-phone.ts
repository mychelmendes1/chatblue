/**
 * Canonical phone number for contact unification.
 * Focus: Brazil (55) - mobile numbers with/without 9th digit are normalized to 13 digits (55 + DDD + 9 + 8 digits).
 */

/**
 * Normalize to digits only (no JID suffix, no non-numeric).
 */
function toDigitsOnly(phone: string): string {
  if (!phone) return '';
  const withoutSuffix = phone.replace(/@[^@]*$/g, '');
  return withoutSuffix.replace(/\D/g, '');
}

/**
 * Returns a canonical phone string for the same person.
 * - Brazil (55): 12-digit mobile (55 + DDD + 8 digits) becomes 13 digits (55 + DDD + 9 + 8 digits).
 *   Example: 554298067510 -> 5542998067510; 5542998067510 -> 5542998067510.
 * - Other countries: returns digits-only input unchanged (no 9th-digit rule).
 */
export function toCanonicalPhone(phone: string): string {
  const digits = toDigitsOnly(phone);
  if (!digits.length) return digits;

  // Brazil: country code 55, then 2-digit DDD (11-99), then 8 (old) or 9+8 (new) digits
  if (digits.startsWith('55') && digits.length === 12) {
    const ddd = digits.slice(2, 4);
    const rest = digits.slice(4); // 8 digits
    // DDD is typically 11-99
    if (rest.length === 8 && /^\d{2}$/.test(ddd)) {
      return `55${ddd}9${rest}`;
    }
  }

  // Already 13 digits (Brazil with 9) or other country: return as-is
  return digits;
}
