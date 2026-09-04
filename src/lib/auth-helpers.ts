// ============================================================================
// Auth helpers
// 
// Madmona uses phone-based authentication. To avoid requiring an SMS provider
// for OTP, we synthesize a deterministic email from the phone number using
// the madmonacairo.com domain. Users only ever see/enter their phone number.
// 
// Note: We use madmonacairo.com (a real domain owned by Madmona) because
// Supabase rejects fake TLDs like .local at the email validation stage.
// ============================================================================

const PHONE_EMAIL_DOMAIN = 'madmonacairo.com'

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
  let s = input.replace(/[^\d+]/g, '')
  if (s.startsWith('00')) s = '+' + s.slice(2)
  if (!s.startsWith('+')) {
    if (s.startsWith('20')) s = '+' + s
    else if (s.startsWith('0')) s = '+20' + s.slice(1)
    else if (s.length === 10) s = '+20' + s
    // 🌍 (٤ سبتمبر ٢٠٢٦) رقم دولي من غير + (971585280538 · 9665…) — كان بيرجّع null
    else if (/^[1-9]\d{9,14}$/.test(s)) s = '+' + s
    else return null
  }
  // مصر: نفس القاعدة القديمة بالظبط. غير مصر: E.164 (+كود الدولة + ٧–١٤ رقم).
  // 🐞 (٤ سبتمبر ٢٠٢٦) كانت بترفض أي حاجة مش +20 — صاحب «لمونة» (إمارات)
  //    حاول يدخل ١١ مرة بلينك واتساب وكل مرة «bad_identifier». صفر حساب.
  if (s.startsWith('+20')) return /^\+20\d{10}$/.test(s) ? s : null
  return /^\+[1-9]\d{7,14}$/.test(s) ? s : null
}

/**
 * Convert a normalized phone into a synthetic email for Supabase Auth.
 * E.g. "+201002229982" → "201002229982@madmonacairo.com"
 */
export function phoneToEmail(normalizedPhone: string): string {
  return `${normalizedPhone.slice(1)}@${PHONE_EMAIL_DOMAIN}`
}

/**
 * Display a phone number in a friendly Egyptian format.
 * "+201002229982" → "+20 100 222 9982"
 */
export function formatPhone(p: string): string {
  const n = normalizePhone(p)
  if (!n) return p
  return `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6, 9)} ${n.slice(9)}`
}
