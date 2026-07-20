#!/usr/bin/env node
// =====================================================================
// 🏗️ استخراج المشاريع العقارية من رسايل الواتساب
//
// المشكلة: السماسرة بيبعتوا مشاريع على واتساب طول اليوم. آخر مشروع
// اتضاف للسوق كان ١٣ يوليو — نفس يوم ما القناة اتكسرت. كل اللي بعد
// كده واقف في whatsapp_messages ومحدش شايفه.
//
// الحل: نقرا الرسايل، نستخرج المشاريع بـ Claude، ونضيفها **كمسودات**.
// مسودة مش منشور — محمد بيراجع الأول. البيانات الغلط في السوق
// أوحش من مفيش بيانات.
//
// التشغيل:
//   node scripts/extract-projects-from-wa.mjs            (معاينة بس)
//   node scripts/extract-projects-from-wa.mjs --save     (يحفظ فعلاً)
//   node scripts/extract-projects-from-wa.mjs --since 2026-07-13
// =====================================================================

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

// ── قراءة .env.local ──────────────────────────────────────────────────
const env = {}
try {
  // ⚠️ نقسم على /\r?\n/ مش '\n'.
  // `.` في جافاسكريبت مابتطابقش \r، فسطر واحد منتهي بـ CRLF جوه ملف LF
  // بيفشل بصمت — المتغير بيبان «ناقص» وهو موجود قدام عينك في الملف.
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Z_0-9]+)=(.*)$/)
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
} catch { /* هنعتمد على process.env */ }

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
const ANTHROPIC_KEY = env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('🔴 ناقص NEXT_PUBLIC_SUPABASE_URL أو SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
if (!ANTHROPIC_KEY) {
  console.error('🔴 ناقص ANTHROPIC_API_KEY')
  process.exit(1)
}

const args = process.argv.slice(2)
const SAVE = args.includes('--save')
const sinceIdx = args.indexOf('--since')
const SINCE = sinceIdx > -1 ? args[sinceIdx + 1] : '2026-07-13'

const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
const ai = new Anthropic({ apiKey: ANTHROPIC_KEY })

// ── ١) نجيب الرسايل المرشّحة ──────────────────────────────────────────
const KEYWORDS = [
  'كمبوند', 'مشروع', 'تسليم', 'مقدم', 'فيلا', 'دوبلكس', 'تاون', 'ستوديو',
  'مطور', 'بروشور', 'محل', 'مول', 'أوفيس', 'اوفيس', 'عيادة', 'وحدة',
  'compound', 'mall', 'tower', 'resid', 'develop', 'sqm', 'م²',
]

console.log(`\n═══ استخراج المشاريع من ${SINCE} ═══\n`)

const { data: msgs, error } = await db
  .from('whatsapp_messages')
  .select('id, created_at, body, conversation_id')
  .eq('direction', 'inbound')
  .gte('created_at', SINCE)
  .order('created_at', { ascending: false })
  .limit(600)

if (error) {
  console.error('🔴 فشل جلب الرسايل:', error.message)
  process.exit(1)
}

const candidates = (msgs || []).filter((m) => {
  const b = (m.body || '').toLowerCase()
  if (b.length < 60) return false // قصيرة أوي — مش عرض مشروع
  return KEYWORDS.some((k) => b.includes(k.toLowerCase()))
})

console.log(`  رسايل واردة: ${msgs?.length ?? 0}`)
console.log(`  مرشّحة للاستخراج: ${candidates.length}\n`)

if (!candidates.length) {
  console.log('مفيش حاجة تتستخرج.')
  process.exit(0)
}

// ── ٢) أرقام المرسلين (عشان source_lead_phone) ────────────────────────
const convIds = [...new Set(candidates.map((c) => c.conversation_id).filter(Boolean))]
const { data: convs } = await db
  .from('whatsapp_conversations')
  .select('id, contact_phone, contact_name')
  .in('id', convIds)
const convMap = Object.fromEntries((convs || []).map((c) => [c.id, c]))

// ── ٣) المشاريع الموجودة (عشان مانكررش) ───────────────────────────────
const { data: existing } = await db.from('property_market_items').select('title, slug')
const existingNorm = new Set(
  (existing || []).map((r) => (r.title || '').toLowerCase().replace(/[^a-z0-9؀-ۿ]/g, ''))
)

// ── ٤) الاستخراج ──────────────────────────────────────────────────────
const SYSTEM = `إنت بتستخرج بيانات مشاريع عقارية من رسايل واتساب بعتها سماسرة ومطوّرين.

هتوصلك كذا رسالة مرقّمة (### رسالة ١، ### رسالة ٢...).
اقراهم كلهم ورجّع كل المشاريع اللي لقيتها.

المطلوب: JSON array. كل عنصر مشروع واحد.

{
  "source_message": رقم الرسالة اللي جه منها,
  "title": "اسم المشروع بالظبط زي ما مكتوب",
  "developer": "اسم المطوّر أو null",
  "area_label": "المنطقة بالعربي (العاصمة الإدارية، الشيخ زايد، ٦ أكتوبر...)",
  "property_type": "residential" | "commercial" | "administrative" | "medical" | null,
  "unit_label": "وصف الوحدات والمساحات زي ما مذكور أو null",
  "price_from": رقم بالجنيه أو null,
  "note": "سطر أو اتنين يلخّصوا العرض",
  "confidence": "high" | "medium" | "low"
}

قواعد صارمة:
• ماتستخرجش إلا اللي مكتوب فعلاً. ممنوع تخمّن سعر أو مطوّر.
• الرسالة اللي مش عرض مشروع (منيو مطعم، كلام عادي، رد آلي) → تجاهلها.
• لو الاسم مش واضح → تجاهلها. مشروع من غير اسم مالوش لازمة.
• price_from = أقل سعر مذكور، رقم صافي من غير فواصل.
• confidence: "high" لو الاسم والمنطقة والسعر واضحين. "low" لو ناقص كتير.

لو الرسالة مفيهاش مشروع، رجّع [].
رجّع JSON بس.`

const found = []

// بنجمّع الرسايل في دفعات بدل نداء لكل واحدة:
// ٢٨ نداء = دقيقتين وعرضة إن واحد يعلّق ويوقف كل حاجة (حصل فعلاً).
// ٤ نداءات = أقل من نص دقيقة.
const BATCH = 7
const batches = []
for (let i = 0; i < candidates.length; i += BATCH) batches.push(candidates.slice(i, i + BATCH))

for (let bi = 0; bi < batches.length; bi++) {
  const batch = batches[bi]
  process.stdout.write(`  دفعة ${bi + 1}/${batches.length} (${batch.length} رسالة)… `)

  const numbered = batch
    .map((m, i) => `### رسالة ${i + 1}\n${(m.body || '').slice(0, 2500)}`)
    .join('\n\n')

  try {
    const res = await Promise.race([
      ai.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4000,
        system: SYSTEM,
        messages: [{ role: 'user', content: numbered }],
      }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('مهلة ٦٠ث')), 60_000)),
    ])

    const txt = res.content.find((c) => c.type === 'text')?.text || '[]'
    const json = txt.slice(txt.indexOf('['), txt.lastIndexOf(']') + 1)
    const items = JSON.parse(json || '[]')

    let added = 0
    for (const it of items) {
      if (!it?.title) continue
      const norm = String(it.title).toLowerCase().replace(/[^a-z0-9؀-ۿ]/g, '')
      if (existingNorm.has(norm)) continue
      if (found.some((f) => f._norm === norm)) continue

      // بنربطه بالرسالة اللي جه منها لو الموديل حدّدها
      const srcIdx = Number(it.source_message) - 1
      const m = batch[Number.isInteger(srcIdx) && batch[srcIdx] ? srcIdx : 0]
      const conv = convMap[m.conversation_id] || {}

      found.push({
        ...it,
        _norm: norm,
        _phone: conv.contact_phone || null,
        _from: conv.contact_name || null,
        _at: m.created_at,
      })
      added++
    }
    console.log(`${added} مشروع`)
  } catch (e) {
    console.log(`تخطّي (${e.message})`)
  }
}

console.log(`\n\n═══ لقيت ${found.length} مشروع جديد ═══\n`)

const byConf = { high: [], medium: [], low: [] }
for (const f of found) (byConf[f.confidence] || byConf.low).push(f)

for (const level of ['high', 'medium', 'low']) {
  const list = byConf[level]
  if (!list.length) continue
  const icon = level === 'high' ? '🟢' : level === 'medium' ? '🟡' : '🔴'
  console.log(`${icon} ثقة ${level} — ${list.length}\n`)
  for (const f of list) {
    const price = f.price_from ? `${Number(f.price_from).toLocaleString('en')} ج` : '—'
    console.log(`   ${f.title}`)
    console.log(`     ${f.developer || '—'} · ${f.area_label || '—'} · ${price} · ${f.property_type || '—'}`)
    console.log(`     من ${f._from || f._phone || '—'} · ${String(f._at).slice(0, 10)}`)
    if (f.unit_label) console.log(`     ${String(f.unit_label).slice(0, 80)}`)
    console.log()
  }
}

// ── ٥) الحفظ ──────────────────────────────────────────────────────────
if (!SAVE) {
  console.log('👀 معاينة بس — مفيش حاجة اتحفظت.')
  console.log('   للحفظ كمسودات: node scripts/extract-projects-from-wa.mjs --save\n')
  process.exit(0)
}

const slugify = (s) =>
  String(s).toLowerCase().trim()
    .replace(/[^\w؀-ۿ\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 60)

const rows = found.map((f) => ({
  title: f.title,
  slug: slugify(f.title) + '-' + Math.random().toString(36).slice(2, 6),
  developer: f.developer || null,
  area: 'other',
  area_label: f.area_label || null,
  city: f.area_label || null,
  segment: 'developer',
  property_type: f.property_type || null,
  unit_label: f.unit_label || null,
  price_from: typeof f.price_from === 'number' ? f.price_from : null,
  price_unit: 'egp_total',
  note: f.note || null,
  source_lead_phone: f._phone,
  source_name: f._from || null,
  // ⚠️ مسودة مش منشور — محمد بيراجع الأول
  status: 'draft',
  is_active: false,
}))

const { data: ins, error: insErr } = await db.from('property_market_items').insert(rows).select('id')

if (insErr) {
  console.error('🔴 فشل الحفظ:', insErr.message)
  process.exit(1)
}

console.log(`✅ اتحفظ ${ins?.length ?? 0} مشروع كمسودة (status=draft, is_active=false)`)
console.log('   مش ظاهرين للعملاء لحد ما تراجعهم وتنشرهم.\n')
