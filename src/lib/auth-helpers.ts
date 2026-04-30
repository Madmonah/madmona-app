// ============================================================================
// Auth helpers
// 
// Madmona uses phone-based authentication. To avoid requiring an SMS provider
// for OTP, we synthesize a deterministic email from the phone number and use
// Supabase Auth's standard email+password flow under the hood. Users only
// ever see/enter their phone number.
// ============================================================================

/**
 * Normalize an Egyptian phone number to E.164 format (+20XXXXXXXXXX).
 * Accepts:
 *   - "01002229982" → "+201002229982"
 *   - "1002229982" → "+201002229982"
 *   - "+201002229982" → "+201002229982"
 *   - "00201002229982" → "+201002229982"
 *   - "201002229982" → "+201002229982"
 */
export function normalizePhone(input: string): string | null {
  if (!input) return null
  // Strip everything except digits and a leading +
  let s = input.replace(/[^\d+]/g, '')
  if (s.startsWith('00')) s = '+' + s.slice(2)
  if (!s.startsWith('+')) {
    // Plain digits
    if (s.startsWith('20')) s = '+' + s
    else if (s.startsWith('0')) s = '+20' + s.slice(1)
    else if (s.length === 10) s = '+20' + s
    else return null
  }
  // Final validation: should be +20 followed by 10 digits = 13 chars total
  if (!/^\+20\d{10}$/.test(s)) return null
  return s
}

/**
 * Convert a normalized phone into a synthetic email for Supabase Auth.
 * E.g. "+201002229982" → "201002229982@madmona.local"
 */
export function phoneToEmail(normalizedPhone: string): string {
  // Strip the leading "+" so we don't get "+20...@..."
  return `${normalizedPhone.slice(1)}@madmona.local`
}

/**
 * Display a phone number in a friendly Egyptian format.
 * "+201002229982" → "+20 100 222 9982"
 */
export function formatPhone(p: string): string {
  const n = normalizePhone(p)
  if (!n) return p
  // n = "+201002229982"
  return `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6, 9)} ${n.slice(9)}`
}
