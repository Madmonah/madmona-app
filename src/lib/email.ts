import { Resend } from 'resend'

// ============================================================================
// Resend email helper
// ============================================================================

const RESEND_API_KEY = process.env.RESEND_API_KEY

// FORCE Resend default from address (always works in testing mode without domain verification).
// User can later verify madmonacairo.com domain in Resend, then update env vars.
const EMAIL_FROM = 'Madmona <onboarding@resend.dev>'

// Resend testing mode requirement: recipient must equal the Resend account email.
// If MADMONA_OWNER_EMAIL is the old fallback (madmonaspace@gmail.com), redirect to admin.
const RESEND_ACCOUNT_EMAIL = 'madmona.admin@gmail.com'

let client: Resend | null = null

function getClient(): Resend | null {
  if (!RESEND_API_KEY) return null
  if (!client) {
    client = new Resend(RESEND_API_KEY)
  }
  return client
}

export function isEmailConfigured(): boolean {
  return !!RESEND_API_KEY
}

export interface EmailParams {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  replyTo?: string
}

/**
 * Sanitize recipient list for testing mode. While Resend domain is unverified,
 * all sends are redirected to the verified Resend account email.
 * Once madmonacairo.com is verified, simply remove this redirect.
 */
function sanitizeRecipients(to: string | string[]): string[] {
  const arr = Array.isArray(to) ? to : [to]
  // In testing mode (Resend domain not verified), force all sends to the account email.
  return arr.map(() => RESEND_ACCOUNT_EMAIL)
}

export async function sendEmail(params: EmailParams): Promise<{ ok: boolean; id?: string; error?: string }> {
  const c = getClient()
  if (!c) {
    return { ok: false, error: 'Email not configured (RESEND_API_KEY missing)' }
  }

  try {
    const recipients = sanitizeRecipients(params.to)

    const { data, error } = await c.emails.send({
      from: EMAIL_FROM,
      to: recipients,
      subject: params.subject,
      html: params.html || params.text || '',
      text: params.text,
      replyTo: params.replyTo,
    })

    if (error) {
      return { ok: false, error: error.message }
    }

    return { ok: true, id: data?.id }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown'
    return { ok: false, error: msg }
  }
}

// ============================================================================
// Email templates — Madmona-branded, RTL Arabic
// ============================================================================

export function bookingConfirmationEmail(args: {
  customerName: string
  bookingRef: string
  listingTitle: string
  startAt: string
  endAt: string
  totalAmount: number
  bookingUrl: string
}): { subject: string; html: string; text: string } {
  const subject = `تأكيد حجز ${args.bookingRef} على Madmona`
  const text = `أهلاً ${args.customerName}،

تم تأكيد حجزك بنجاح على Madmona Marketplace.

رقم الحجز: ${args.bookingRef}
الـlisting: ${args.listingTitle}
من: ${args.startAt}
إلى: ${args.endAt}
الإجمالي: ${args.totalAmount} ج.م

شوف تفاصيل الحجز: ${args.bookingUrl}

شكراً لاختيارك Madmona.
`
  const html = baseEmailLayout({
    headline: 'تم تأكيد حجزك ✓',
    body: `
      <p style="margin: 0 0 16px;">أهلاً <strong>${escapeHtml(args.customerName)}</strong>،</p>
      <p style="margin: 0 0 16px;">تم تأكيد حجزك بنجاح على Madmona Marketplace.</p>
      <table style="width:100%; border-collapse:collapse; margin: 24px 0;">
        <tr><td style="padding:8px 0; color:#666; font-size:13px;">رقم الحجز</td>
            <td style="padding:8px 0; font-weight:bold; text-align:left;">${escapeHtml(args.bookingRef)}</td></tr>
        <tr><td style="padding:8px 0; color:#666; font-size:13px;">الـlisting</td>
            <td style="padding:8px 0; font-weight:bold; text-align:left;">${escapeHtml(args.listingTitle)}</td></tr>
        <tr><td style="padding:8px 0; color:#666; font-size:13px;">من</td>
            <td style="padding:8px 0; text-align:left;">${escapeHtml(args.startAt)}</td></tr>
        <tr><td style="padding:8px 0; color:#666; font-size:13px;">إلى</td>
            <td style="padding:8px 0; text-align:left;">${escapeHtml(args.endAt)}</td></tr>
        <tr><td style="padding:8px 0; color:#666; font-size:13px; border-top:1px solid #eee;">الإجمالي</td>
            <td style="padding:8px 0; font-weight:bold; font-size:16px; color:#1F5F3F; text-align:left; border-top:1px solid #eee;">${args.totalAmount.toLocaleString('ar-EG')} ج.م</td></tr>
      </table>
    `,
    cta: { label: 'شوف تفاصيل الحجز', url: args.bookingUrl },
  })
  return { subject, html, text }
}

export function newBookingForSupplierEmail(args: {
  supplierName: string
  bookingRef: string
  listingTitle: string
  customerName: string
  startAt: string
  endAt: string
  totalAmount: number
  bookingUrl: string
}): { subject: string; html: string; text: string } {
  const subject = `حجز جديد ${args.bookingRef} على ${args.listingTitle}`
  const text = `أهلاً ${args.supplierName}،

في حجز جديد بانتظار التأكيد على Madmona.

رقم الحجز: ${args.bookingRef}
الـlisting: ${args.listingTitle}
العميل: ${args.customerName}
من: ${args.startAt}
إلى: ${args.endAt}
الإجمالي: ${args.totalAmount} ج.م

راجع وأكد الحجز: ${args.bookingUrl}
`
  const html = baseEmailLayout({
    headline: 'حجز جديد 🎉',
    body: `
      <p style="margin: 0 0 16px;">أهلاً <strong>${escapeHtml(args.supplierName)}</strong>،</p>
      <p style="margin: 0 0 16px;">في حجز جديد بانتظار التأكيد.</p>
      <table style="width:100%; border-collapse:collapse; margin: 24px 0;">
        <tr><td style="padding:8px 0; color:#666; font-size:13px;">رقم الحجز</td>
            <td style="padding:8px 0; font-weight:bold; text-align:left;">${escapeHtml(args.bookingRef)}</td></tr>
        <tr><td style="padding:8px 0; color:#666; font-size:13px;">الـlisting</td>
            <td style="padding:8px 0; text-align:left;">${escapeHtml(args.listingTitle)}</td></tr>
        <tr><td style="padding:8px 0; color:#666; font-size:13px;">العميل</td>
            <td style="padding:8px 0; text-align:left;">${escapeHtml(args.customerName)}</td></tr>
        <tr><td style="padding:8px 0; color:#666; font-size:13px;">من</td>
            <td style="padding:8px 0; text-align:left;">${escapeHtml(args.startAt)}</td></tr>
        <tr><td style="padding:8px 0; color:#666; font-size:13px;">إلى</td>
            <td style="padding:8px 0; text-align:left;">${escapeHtml(args.endAt)}</td></tr>
        <tr><td style="padding:8px 0; color:#666; font-size:13px; border-top:1px solid #eee;">الإجمالي</td>
            <td style="padding:8px 0; font-weight:bold; color:#1F5F3F; text-align:left; border-top:1px solid #eee;">${args.totalAmount.toLocaleString('ar-EG')} ج.م</td></tr>
      </table>
    `,
    cta: { label: 'راجع وأكّد الحجز', url: args.bookingUrl },
  })
  return { subject, html, text }
}

export function welcomeEmail(args: {
  customerName: string
  marketplaceUrl: string
}): { subject: string; html: string; text: string } {
  const subject = 'أهلاً بيك في Madmona Marketplace'
  const text = `أهلاً ${args.customerName}،

أهلاً بيك في Madmona Marketplace — منصة حجز كل ما يمكن تأجيره في مصر.

ابدأ الاستكشاف: ${args.marketplaceUrl}
`
  const html = baseEmailLayout({
    headline: 'أهلاً بيك في Madmona 🌿',
    body: `
      <p style="margin: 0 0 16px;">أهلاً <strong>${escapeHtml(args.customerName)}</strong>،</p>
      <p style="margin: 0 0 16px; line-height: 1.7;">
        Madmona Marketplace منصة حجز مصرية لكل ما يمكن تأجيره — مساحات عمل،
        عقارات، مركبات، معدات، فعاليات. كل حاجة من موردين معتمدين بضمان كامل.
      </p>
      <p style="margin: 0 0 16px;">ابدأ بتصفح الـMarketplace.</p>
    `,
    cta: { label: 'استكشف الـMarketplace', url: args.marketplaceUrl },
  })
  return { subject, html, text }
}

// ============================================================================
// Base email layout
// ============================================================================
function baseEmailLayout(args: {
  headline: string
  body: string
  cta?: { label: string; url: string }
}): string {
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(args.headline)}</title>
</head>
<body style="margin:0; padding:0; background:#FAFAF7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, sans-serif; color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF7; padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; background:#fff; border-radius:24px; overflow:hidden; box-shadow:0 4px 16px rgba(0,0,0,0.04);">
        <tr><td style="padding:32px 32px 16px; text-align:center; background: linear-gradient(135deg, #1F5F3F 0%, #2d7a52 100%); color:#fff;">
          <h1 style="margin:0; font-size:28px; font-weight:900; letter-spacing:-0.5px;">مضمونة</h1>
          <p style="margin:6px 0 0; font-size:11px; letter-spacing:3px; opacity:0.7; font-weight:bold;">MADMONA</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 24px; font-size:22px; font-weight:900;">${escapeHtml(args.headline)}</h2>
          <div style="font-size:15px; line-height:1.6; color:#333;">
            ${args.body}
          </div>
          ${args.cta ? `
          <div style="margin:32px 0 8px; text-align:center;">
            <a href="${escapeHtml(args.cta.url)}"
               style="display:inline-block; background:#1F5F3F; color:#fff; padding:14px 28px; border-radius:14px; text-decoration:none; font-weight:bold; font-size:15px;">
              ${escapeHtml(args.cta.label)}
            </a>
          </div>
          ` : ''}
        </td></tr>
        <tr><td style="padding:24px 32px; background:#FAFAF7; text-align:center; font-size:11px; color:#999;">
          <p style="margin:0 0 4px;">مضمونة - منصة الحجز المصرية</p>
          <p style="margin:0;">٧ شارع سليمان عَزْمي، مصر الجديدة، القاهرة</p>
          <p style="margin:8px 0 0;">
            <a href="https://wa.me/201002229982" style="color:#1F5F3F; text-decoration:none;">واتساب: +20 100 222 9982</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
