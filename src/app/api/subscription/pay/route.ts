// src/app/api/subscription/pay/route.ts
// ============================================================================
// 💳 دفع برنامج الإدارة بتحويل يدوي — إنستاباي / فودافون كاش / تحويل بنكي (١١ سبتمبر ٢٠٢٦)
//
// محمد: «لهجتي عاملين آلية دفع بإنستاباي وفودافون كاش — ممكن نعمل آلية زيهم بالظبط».
// نفس الأربع خطوات: اختار الطريقة → بيانات التحويل + المبلغ + مؤقت ساعة →
// اسم صاحب الحساب المُرسِل + صورة إثبات الدفع → «استلمنا — بيتفعّل بعد المراجعة».
//
// GET  ?config=1   → الطرق المفعّلة وبياناتها (من site_settings الموجودة) + السعر (erp_price_egp)
// GET  ?id=<uuid>  → حالة طلب (للـpolling في صفحة الانتظار)
// POST multipart   → يرفع الإثبات على bucket payment-proofs (خاص) + صف subscription_payments + پوش للفريق
//
// ⛔ مفيش أي رقم سعر مكتوب هنا — السعر من site_settings.erp_price_egp (١٠٠٠ ج حسب أمر محمد ٦/٩).
// ⛔ الإثبات في bucket خاص — بيتشاف من لوحة الأدمن بـsigned URL بس.
// ============================================================================
import { NextRequest, NextResponse } from 'next/server'
import { supabaseUntyped as admin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BUCKET = 'payment-proofs'
const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
function normPhone(raw: string): string | null {
  const d = raw.replace(/\D/g, '')
  if (/^01\d{9}$/.test(d)) return '20' + d.slice(1)
  if (/^1\d{9}$/.test(d)) return '20' + d
  if (/^20\d{10}$/.test(d)) return d
  if (/^\d{10,15}$/.test(d)) return d.replace(/^00/, '')
  return null
}

export type PayMethod = { key: 'instapay' | 'vodafone_cash' | 'bank_transfer'; label: string; lines: { k: string; v: string }[]; hint: string }

export async function loadPayConfig() {
  const { data } = await admin.from('site_settings').select('key, value').in('key', [
    'instapay_enabled', 'instapay_ipa', 'instapay_account_number', 'instapay_holder_name',
    'payment_bank_name', 'payment_iban', 'payment_wallets', 'erp_price_egp',
  ])
  const s: Record<string, string> = {}
  for (const r of data || []) s[r.key] = r.value || ''
  const price = Number(s.erp_price_egp || 0)
  const methods: PayMethod[] = []
  if (s.instapay_enabled === 'true' && (s.instapay_ipa || s.instapay_account_number)) {
    methods.push({
      key: 'instapay', label: 'إنستاباي',
      lines: [
        ...(s.instapay_ipa ? [{ k: 'عنوان إنستاباي', v: s.instapay_ipa }] : []),
        ...(s.instapay_account_number ? [{ k: 'رقم الحساب', v: s.instapay_account_number }] : []),
        ...(s.instapay_holder_name ? [{ k: 'اسم الحساب', v: s.instapay_holder_name }] : []),
      ],
      hint: 'من تطبيق إنستاباي أو تطبيق بنكك: حوّل على العنوان ده، وصوّر شاشة التأكيد اللي فيها رقم المعاملة والتاريخ.',
    })
  }
  try {
    const wallets = JSON.parse(s.payment_wallets || '[]') as { key: string; label: string; number: string; enabled?: boolean }[]
    const vf = wallets.find((w) => w.key === 'vodafone_cash' && w.enabled && w.number)
    if (vf) methods.push({ key: 'vodafone_cash', label: 'فودافون كاش', lines: [{ k: 'رقم المحفظة', v: vf.number }], hint: 'من تطبيق أنا فودافون أو *9*7#: حوّل على الرقم ده، وصوّر رسالة التأكيد اللي فيها رقم العملية.' })
  } catch { /* JSON بايظ = مفيش محافظ */ }
  if (s.payment_iban) {
    methods.push({
      key: 'bank_transfer', label: 'تحويل بنكي',
      lines: [
        ...(s.payment_bank_name ? [{ k: 'البنك', v: s.payment_bank_name }] : []),
        { k: 'IBAN', v: s.payment_iban },
        ...(s.instapay_holder_name ? [{ k: 'اسم الحساب', v: s.instapay_holder_name }] : []),
      ],
      hint: 'حوّل من بنكك على الـIBAN ده، وارفع صورة إيصال التحويل.',
    })
  }
  return { price, currency: 'EGP', methods }
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (id) {
    const { data } = await admin.from('subscription_payments').select('id, status, reviewed_at, review_note, created_at').eq('id', id).maybeSingle()
    if (!data) return NextResponse.json({ ok: false, error: 'الطلب مش موجود' }, { status: 404 })
    return NextResponse.json({ ok: true, ...data })
  }
  const cfg = await loadPayConfig()
  return NextResponse.json({ ok: true, ...cfg })
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ ok: false, error: 'طلب غير صالح' }, { status: 400 })
  const method = clean(form.get('method'), 20)
  const sender_name = clean(form.get('sender_name'), 120)
  const phone = normPhone(clean(form.get('phone'), 40))
  const business_name = clean(form.get('business_name'), 160)
  const reference = clean(form.get('reference'), 80)
  const supplier_id = clean(form.get('supplier_id'), 40)
  const file = form.get('proof')

  const cfg = await loadPayConfig()
  const m = cfg.methods.find((x) => x.key === method)
  if (!m) return NextResponse.json({ ok: false, error: 'اختار طريقة الدفع' }, { status: 400 })
  if (!cfg.price) return NextResponse.json({ ok: false, error: 'السعر مش متحدد — كلّمنا واتساب' }, { status: 503 })
  if (!sender_name) return NextResponse.json({ ok: false, error: 'اكتب الاسم الكامل للحساب اللي حوّلت منه' }, { status: 400 })
  if (!phone) return NextResponse.json({ ok: false, error: 'اكتب رقم موبايل صح (01… أو دولي بكود الدولة)' }, { status: 400 })
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ ok: false, error: 'ارفع صورة إثبات الدفع' }, { status: 400 })
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ ok: false, error: 'الصورة أكبر من ٥ ميجا' }, { status: 400 })
  if (!/^(image\/|application\/pdf)/.test(file.type)) return NextResponse.json({ ok: false, error: 'الملف لازم يكون صورة أو PDF' }, { status: 400 })

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'jpg'
  const path = `subscriptions/${new Date().toISOString().slice(0, 10)}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const up = await admin.storage.from(BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false })
  if (up.error) {
    console.error('[subscription/pay] upload', up.error.message)
    return NextResponse.json({ ok: false, error: 'رفع الصورة فشل — جرّب تاني' }, { status: 502 })
  }

  // ربط بالمورد: id صريح (من اللوحة) وإلا مطابقة رقم صاحب البيزنس — والفريق بيأكّد وقت المراجعة
  let sid: string | null = /^[0-9a-f-]{36}$/i.test(supplier_id) ? supplier_id : null
  if (!sid) {
    // مطابقة بآخر ٩ أرقام (نفس روح phone_core — بتتخطى 01/+201/201)
    const { data: sup } = await admin.from('suppliers').select('id').ilike('contact_phone', `%${phone.slice(-9)}`).limit(1).maybeSingle()
    sid = sup?.id || null
  }

  const { data: row, error } = await admin.from('subscription_payments').insert({
    plan: 'erp1000', amount: cfg.price, currency: cfg.currency, method, phone, business_name: business_name || null,
    sender_name, reference: reference || null, proof_path: path, supplier_id: sid,
    utm_source: clean(form.get('utm_source'), 60) || null, utm_medium: clean(form.get('utm_medium'), 60) || null, utm_content: clean(form.get('utm_content'), 80) || null,
  }).select('id').single()
  if (error) {
    console.error('[subscription/pay] insert', error.message)
    return NextResponse.json({ ok: false, error: 'مش قادرين نسجّل الطلب دلوقتي — كلّمنا واتساب' }, { status: 500 })
  }

  // 🔔 پوش داخلي للفريق (نوتيفيكيشن مش واتساب) — العنوان فيه الاسم عشان ديدوب الساعة مايبلعوش
  try {
    const { data: staff } = await admin.rpc('listings_staff_profile_ids', {})
    const ids = Array.isArray(staff) ? (staff as string[]) : []
    if (ids.length) {
      await admin.from('notification_queue').insert(ids.map((rid) => ({
        recipient_id: rid, type: 'subscription_payment',
        title: `💳 إثبات دفع جديد: ${business_name || sender_name}`,
        body: `${m.label} · ${cfg.price} ج · ${phone}${reference ? ' · مرجع ' + reference : ''} — راجعه وفعّل`,
        url: '/admin/subscriptions',
        data: { payment_id: row.id, method, phone },
      })))
    }
  } catch (e) { console.error('[subscription/pay] notify', e instanceof Error ? e.message : e) }

  return NextResponse.json({ ok: true, id: row.id })
}
