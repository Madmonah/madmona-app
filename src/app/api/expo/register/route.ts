// ============================================================================
// 📨 POST /api/expo/register — طلب عارض قبل المعرض
//
// (٣ سبتمبر ٢٠٢٦) محمد: «عايزين نعمل فورم بالإيميل كمان — أكتر احترافية
//   في التعامل مع الشركات». الشركات الكبيرة بتتعامل بالإيميل، والواتساب
//   لوحده مش كفاية معاها.
//
// المسار: الشركة بتملا الفورم على /expo → صف في expo_leads → إيميل تأكيد
// **للشركة** (customer-facing، مش مغطى بقفل إشعارات المالك في lib/email)
// + إشعار **پوش** لفريق الإعلانات.
//
// ⚠️ التنبيه الداخلي پوش مش إيميل ولا واتساب — قاعدة محمد الثابتة.
// ⚠️ الكتابة كلها service_role: جدول expo_leads مقفول قدام anon تمامًا،
//    فمفيش أي طريق للعميل يقرا طلبات غيره.
// ============================================================================
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EVENT = 'building-materials-2026'
const SITE = 'https://www.madmonacairo.com'
const INTAKE_WA = '201002229982'

function clean(v: unknown, max = 300): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}
function validEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 254
}
function normEg(raw: string): string {
  let d = (raw || '').replace(/\D/g, '')
  if (d.startsWith('0') && d.length === 11) d = '20' + d.slice(1)
  if (d.length === 10) d = '20' + d
  return d
}
/** الاسم بيتحط جوّه HTML الإيميل — لازم يتعقّم. */
function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ))
}

function confirmationEmail(company: string, contact: string): { subject: string; html: string; text: string } {
  const who = contact ? esc(contact) : esc(company)
  const subject = `وصلنا طلبكم — ${company}`
  const text = [
    `أهلاً ${contact || company}،`,
    '',
    'وصلنا طلب تسجيل شركتكم في مضمونة قبل معرض مواد البناء.',
    'فريقنا هيكلّمكم خلال يوم عمل عشان ناخد الكتالوج ونجهّز صفحة الشركة.',
    '',
    'اللي هيحصل بعد كده:',
    '١) تبعتوا الكتالوج (PDF أو صور أو لينك موقعكم).',
    '٢) إحنا بندخّل المنتجات بمواصفاتها ونرجعلكم تراجعوها.',
    '٣) الصفحة بتبقى شغالة قبل ما المعرض يفتح.',
    '٤) تستلموها باسمكم من الاستاند في أقل من دقيقة.',
    '',
    'مضمونة وسيط ضامن — مش بنشتري منكم ولا بنبيع بدالكم.',
    'مفيش اشتراك ولا رسوم تسجيل — والسعر اللي بتطلبه هو اللي بتاخده.',
    '',
    `واتساب: +${INTAKE_WA}`,
    SITE,
  ].join('\n')

  const html = `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8">
<body style="margin:0;background:#F7F5F0;font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#0E2A20">
  <div style="max-width:560px;margin:0 auto;padding:28px 22px">
    <p style="font-size:20px;font-weight:700;margin:0 0 2px">مضمونة</p>
    <p style="font-size:10.5px;letter-spacing:.22em;color:#78857D;margin:0 0 22px">MADMONA</p>

    <div style="background:#fff;border:1px solid #DFDACF;border-radius:12px;padding:22px 24px">
      <p style="font-size:17px;font-weight:700;margin:0 0 10px">أهلاً ${who} 👋</p>
      <p style="font-size:14.5px;line-height:1.8;margin:0 0 16px;color:#3A5147">
        وصلنا طلب تسجيل <b style="color:#0E2A20">${esc(company)}</b> في مضمونة قبل معرض مواد البناء.
        فريقنا هيكلّمكم خلال يوم عمل عشان ناخد الكتالوج ونجهّز صفحة الشركة.
      </p>

      <p style="font-size:12px;font-weight:700;letter-spacing:.1em;color:#5A6B72;margin:0 0 10px">اللي هيحصل بعد كده</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;color:#3A5147;line-height:1.7">
        <tr><td style="padding:5px 0 5px 10px;width:22px;color:#0C7A50;font-weight:700">١</td><td style="padding:5px 0">تبعتوا الكتالوج — PDF أو صور أو لينك موقعكم.</td></tr>
        <tr><td style="padding:5px 0 5px 10px;color:#0C7A50;font-weight:700">٢</td><td style="padding:5px 0">إحنا بندخّل المنتجات بمواصفاتها ونرجعلكم تراجعوها.</td></tr>
        <tr><td style="padding:5px 0 5px 10px;color:#0C7A50;font-weight:700">٣</td><td style="padding:5px 0">الصفحة بتبقى شغالة قبل ما المعرض يفتح.</td></tr>
        <tr><td style="padding:5px 0 5px 10px;color:#0C7A50;font-weight:700">٤</td><td style="padding:5px 0">تستلموها باسمكم من الاستاند في أقل من دقيقة.</td></tr>
      </table>

      <div style="margin-top:18px;padding:14px 16px;background:#E4F1EA;border-radius:10px">
        <p style="margin:0;font-size:13.5px;line-height:1.7;color:#0E2A20">
          مضمونة <b>وسيط ضامن</b> — مش بنشتري منكم ولا بنبيع بدالكم.<br>
          مفيش اشتراك ولا رسوم تسجيل — <b>والسعر اللي بتطلبه هو اللي بتاخده</b>.
        </p>
      </div>

      <p style="margin:18px 0 0;font-size:14px">
        <a href="https://wa.me/${INTAKE_WA}" style="color:#0E2A20;font-weight:700">تكلّمنا على الواتساب</a>
        &nbsp;·&nbsp;
        <a href="${SITE}" style="color:#0E2A20;font-weight:700">madmonacairo.com</a>
      </p>
    </div>

    <p style="font-size:11.5px;color:#78857D;margin:16px 0 0">مضمونة · معاملاتك مضمونة · القاهرة، مصر</p>
  </div>
</body></html>`

  return { subject, html, text }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))

    const company = clean(body.company_name, 160)
    const email = clean(body.email, 254).toLowerCase()
    const contact = clean(body.contact_name, 120)
    const phone = clean(body.phone, 40)
    const website = clean(body.website, 200)
    const booth = clean(body.booth, 40)
    const role = clean(body.supplier_role, 40)
    const message = clean(body.message, 1200)
    const categories = Array.isArray(body.categories)
      ? body.categories.map((c: unknown) => clean(c, 60)).filter(Boolean).slice(0, 12)
      : []

    if (!company) return NextResponse.json({ ok: false, error: 'اكتب اسم الشركة' }, { status: 400 })
    if (!validEmail(email)) return NextResponse.json({ ok: false, error: 'الإيميل مش مظبوط' }, { status: 400 })

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )

    // نفس الشركة تبعت تاني؟ بنحدّث طلبها بدل ما نعمل صف جديد.
    const { data: row, error } = await admin
      .from('expo_leads')
      .upsert({
        event: EVENT,
        company_name: company,
        contact_name: contact || null,
        email,
        phone: phone ? normEg(phone) : null,
        website: website || null,
        booth: booth || null,
        categories: categories.length ? categories : null,
        supplier_role: role || null,
        message: message || null,
      } as never, { onConflict: 'event,email' })
      .select('id')
      .maybeSingle()

    if (error) {
      console.error('[expo/register] insert', error.message)
      return NextResponse.json({ ok: false, error: 'مش قادرين نسجّل الطلب دلوقتي' }, { status: 500 })
    }

    // ✉️ تأكيد للشركة — الجزء اللي بيخلّي التعامل «احترافي»
    const mail = confirmationEmail(company, contact)
    const sent = await sendEmail({ to: email, subject: mail.subject, html: mail.html, text: mail.text })
    if (!sent.ok) console.error('[expo/register] email', sent.error)

    // 🔔 التنبيه الداخلي پوش — مش إيميل ولا واتساب (قاعدة ثابتة).
    //    العنوان فيه اسم الشركة عشان ديدوب الساعة مايبلعش التاني.
    try {
      const { data: staff } = await admin.rpc('listings_staff_profile_ids' as never, {} as never)
      const ids = Array.isArray(staff) ? (staff as string[]) : []
      if (ids.length) {
        await admin.from('notification_queue').insert(
          ids.map((rid) => ({
            recipient_id: rid,
            type: 'expo_lead',
            title: `عارض جديد: ${company} 🏗️`,
            body: `${contact || 'من غير اسم'} · ${email}${phone ? ' · ' + phone : ''}`,
            url: '/admin/exhibitions',
            data: { lead_id: row?.id, event: EVENT },
          })) as never,
        )
      }
    } catch (e) {
      console.error('[expo/register] notify', e instanceof Error ? e.message : 'unknown')
    }

    return NextResponse.json({ ok: true, id: row?.id, emailed: sent.ok })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    console.error('[expo/register]', msg)
    return NextResponse.json({ ok: false, error: 'حصل خطأ مؤقت، جرّب تاني' }, { status: 500 })
  }
}
