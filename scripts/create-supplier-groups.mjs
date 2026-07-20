#!/usr/bin/env node
// =====================================================================
// 👥 إنشاء جروبات متابعة للموردين
//
// لكل مورد جروب: هو + فريق مضمونة. الطلبات بتتحوّل عليه هناك
// والتحديثات بتتقال قدام الكل — فمفيش حاجة بتضيع في الخاص.
//
// بيبدأ بالعقارات (أمر محمد) وبعدين الباقي.
//
// ⚠️ الضوابط:
//   • أول رسالة بتشرح إحنا مين وليه ضفناه + إزاي يخرج
//     (الإضافة من غير شرح بتتقري كسبام وبتوقف الرقم)
//   • فاصل عشوائي ٦٠–١٥٠ث بين كل جروب
//   • بيتخطّى المورد اللي عنده جروب بالفعل
//   • معاينة بالتزام
//
// التشغيل:
//   node scripts/create-supplier-groups.mjs                    معاينة
//   node scripts/create-supplier-groups.mjs --send --limit 5   تنفيذ
//   node scripts/create-supplier-groups.mjs --all              كل التصنيفات
// =====================================================================

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = {}
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.trim().match(/^([A-Z_0-9]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const args = process.argv.slice(2)
const SEND = args.includes('--send')
const ALL = args.includes('--all')
const LIMIT = Number(args[args.indexOf('--limit') + 1]) || 5

// بنعدّي من بوابة Vercel — سر الخدمة نفسه مش متاح محليًا،
// والبوابة عندها وبتنادي الخدمة بيه.
const GATEWAY = 'https://www.madmonacairo.com/api/internal/wa-group'
const WA_SECRET = env.EDGE_GATEWAY_SECRET
const SITE = 'https://www.madmonacairo.com'
const TEAM = ['201004194133', '201104496225']

// ── الموردين ─────────────────────────────────────────────────────────
// الربط: marketplace_suppliers ← profiles (الرقم هناك مش هنا)
const { data: suppliers, error } = await db
  .from('marketplace_suppliers')
  .select('id, business_name, profile_id, kyc_status, listings_count')
  .eq('kyc_status', 'approved')
  .order('listings_count', { ascending: false })

if (error) {
  console.error('🔴', error.message)
  process.exit(1)
}

const profileIds = suppliers.map((s) => s.profile_id).filter(Boolean)
const { data: profiles } = await db.from('profiles').select('id, phone, full_name').in('id', profileIds)
const phoneOf = Object.fromEntries((profiles || []).map((p) => [p.id, p.phone]))

// مين عنده جروب بالفعل
const { data: existing } = await db.from('supplier_wa_groups').select('supplier_id').eq('is_active', true)
const hasGroup = new Set((existing || []).map((g) => g.supplier_id))

// تصنيف عقاري؟ بنعرفه من إعلاناته
const { data: reListings } = await db
  .from('listings')
  .select('supplier_id, categories!inner(slug)')
  .like('categories.slug', '%propert%')

const realEstateSuppliers = new Set((reListings || []).map((l) => l.supplier_id))

// مورد مضمونة الوسيط — الإعلانات اللي إحنا بنرفعها بتتنسب ليه.
// جروب معاه = جروب مع نفسنا.
const MADMONA_SUPPLIER = '7310f6ef-e474-4ef8-8b8a-388b5e1f5694'
const OUR_PHONES = ['201002229982', ...TEAM]

const eligible = suppliers.filter((s) => {
  if (hasGroup.has(s.id)) return false
  if (s.id === MADMONA_SUPPLIER) return false
  const ph = phoneOf[s.profile_id]
  if (!ph || ph.startsWith('oauth:')) return false
  // أرقامنا إحنا — مش موردين
  if (OUR_PHONES.some((p) => ph.replace(/\D/g, '').endsWith(p.slice(-10)))) return false
  if (!ALL && !realEstateSuppliers.has(s.id)) return false
  return true
})

console.log('\n═══ جروبات متابعة الموردين ═══\n')
console.log(`  موردين معتمدين  : ${suppliers.length}`)
console.log(`  عندهم جروب      : ${hasGroup.size}`)
console.log(`  ${ALL ? 'كل التصنيفات' : 'عقارات بس'}${' '.repeat(ALL ? 6 : 8)}: ${eligible.length}`)
console.log(`  في الدفعة دي    : ${Math.min(LIMIT, eligible.length)}\n`)

const batch = eligible.slice(0, LIMIT)
for (const s of batch) {
  console.log(`   ${(phoneOf[s.profile_id] || '').padEnd(16)} ${s.business_name?.slice(0, 32)}  (${s.listings_count} إعلان)`)
}

function introFor(name, listings) {
  return (
    `أهلاً ${name} 👋\n\n` +
    `أنا *المارد* — مساعد مضمونة الذكي.\n\n` +
    `عملنا الجروب ده عشان متابعة شغلك معانا في مكان واحد:\n` +
    `• عندك ${listings} ${listings === 1 ? 'إعلان' : 'إعلان'} على مضمونة\n` +
    `• أي طلب أو استفسار يجيلنا ويخصّك، هبعتهولك هنا على طول\n` +
    `• أي تحديث على أسعارك أو التوفّر، قوله هنا وهنظبطه فورًا\n\n` +
    `كده مفيش طلب هيضيع ومفيش حاجة هتتأخر عليك.\n\n` +
    `ولو عندكم أي بيانات أو مشاريع خاصة بيكم، ابعتوها هنا وإحنا هنضيفها فورًا. ` +
    `ولو محتاجين تسألوا عن أي مشروع أو عندكم أي طلب بشكل عام — أنا في الخدمة 🤝\n\n` +
    `إنت أدمن في الجروب، فتقدر تضيف أي حد من فريقك.\n\n` +
    `لو مش عايز الجروب ده، قولّي وهشيلك فورًا — مفيش مشكلة خالص.\n\n` +
    `لوحة التحكم بتاعتك: ${SITE}/supplier/dashboard`
  )
}

if (!SEND) {
  console.log('\n👀 معاينة بس.\n')
  console.log('─── نص التعريف ───')
  console.log(introFor('مثال', 3))
  process.exit(0)
}

if (!WA_SECRET) {
  console.error('\n🔴 EDGE_GATEWAY_SECRET ناقص')
  process.exit(1)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let ok = 0
let fail = 0

console.log('\n─── جاري الإنشاء ───\n')

for (let i = 0; i < batch.length; i++) {
  const s = batch[i]
  const phone = phoneOf[s.profile_id]
  const name = s.business_name || 'شريكنا'
  const subject = `مضمونة × ${name}`.slice(0, 60)
  const intro = introFor(name, s.listings_count || 0)

  try {
    const res = await fetch(GATEWAY, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-secret': WA_SECRET },
      body: JSON.stringify({ subject, participants: [phone, ...TEAM], intro }),
    })
    const data = await res.json().catch(() => ({}))

    if (data?.ok) {
      await db.from('supplier_wa_groups').insert({
        supplier_id: s.id,
        group_jid: data.group_jid,
        subject,
        purpose: 'followup',
        participants: [phone, ...TEAM],
        intro_message: intro,
        created_by: 'سكريبت — دفعة العقارات',
      })
      ok++
      console.log(`  ✅ ${subject}`)
    } else {
      fail++
      console.log(`  🔴 ${name}  ${data?.error || res.status}`)
    }
  } catch (e) {
    fail++
    console.log(`  🔴 ${name}  ${e.message}`)
  }

  if (i < batch.length - 1) {
    const wait = 60_000 + Math.floor(Math.random() * 90_000)
    console.log(`     … استنى ${Math.round(wait / 1000)}ث`)
    await sleep(wait)
  }
}

console.log(`\n═══ خلص: ${ok} جروب · ${fail} فشل ═══\n`)
