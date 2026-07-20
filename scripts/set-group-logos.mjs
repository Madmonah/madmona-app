#!/usr/bin/env node
// =====================================================================
// 🖼️  لوجو الشركة كصورة للجروب
//
// ⚠️ الواقع: من ١٤٧ مورّد، **اتنين بس** عندهم logo_url في الداتابيز.
//    فالسكريبت ده هيحط لوجو للي عنده، والباقي محتاج نجمّع لوجوهاتهم
//    الأول (المارد بيطلبها في الجروب — أنضف طريقة وبتفتح كلام كمان).
//
//   node scripts/set-group-logos.mjs           معاينة
//   node scripts/set-group-logos.mjs --send    تنفيذ
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

const SEND = process.argv.includes('--send')
const GATEWAY = 'https://www.madmonacairo.com/api/internal/wa-group'

const { data: groups, error } = await db
  .from('supplier_wa_groups')
  .select('id, subject, group_jid, supplier_id, logo_applied_at')
  .eq('is_active', true)

if (error) {
  console.error('🔴', error.message)
  process.exit(1)
}

const supIds = groups.map((g) => g.supplier_id)
const { data: sups } = await db
  .from('marketplace_suppliers')
  .select('id, business_name, logo_url, profile_id')
  .in('id', supIds)

const { data: profs } = await db
  .from('profiles')
  .select('id, phone')
  .in('id', (sups || []).map((s) => s.profile_id).filter(Boolean))

const phoneOfProfile = Object.fromEntries((profs || []).map((p) => [p.id, p.phone]))
const logoOf = Object.fromEntries((sups || []).map((s) => [s.id, s.logo_url]))
const phoneOf = Object.fromEntries(
  (sups || []).map((s) => [s.id, phoneOfProfile[s.profile_id]])
)

// 🔍 اللي مالوش لوجو في الداتابيز — بنجيب صورة بروفايله على الواتساب.
//    أغلب الشركات حاطة لوجوها هناك، وده أوفر مصدر متاح فعلاً.
const needLookup = groups.filter((g) => !logoOf[g.supplier_id] && !g.logo_applied_at)
if (needLookup.length) {
  console.log(`\n🔍 بندوّر على صور البروفايل لـ${needLookup.length} مورّد…`)
  let found = 0
  for (const g of needLookup) {
    const ph = phoneOf[g.supplier_id]
    if (!ph || String(ph).startsWith('oauth:')) continue
    try {
      const res = await fetch(GATEWAY, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-internal-secret': env.EDGE_GATEWAY_SECRET,
        },
        body: JSON.stringify({ action: 'profile_pic', phone: ph }),
      })
      const data = await res.json().catch(() => ({}))
      if (data?.url) {
        logoOf[g.supplier_id] = data.url
        found++
      }
    } catch {
      /* مفيش صورة أو الخصوصية مقفولة — عادي */
    }
    await new Promise((r) => setTimeout(r, 1200))
  }
  console.log(`   لقينا ${found} صورة\n`)
}

// 🖼️ آخر مصدر — أول صورة من إعلاناته.
//    مش لوجو بالظبط، بس جروب بصورة شغله أحسن بكتير من جروب فاضي،
//    وبيخلّي المورّد يلاقي جروبه بين ٥٠ جروب.
const fromListing = new Set()
const stillMissing = groups.filter((g) => !logoOf[g.supplier_id] && !g.logo_applied_at)
if (stillMissing.length) {
  const { data: photos } = await db
    .from('listing_photos')
    .select('url, listing_id, created_at, listings!inner(supplier_id)')
    .in(
      'listings.supplier_id',
      stillMissing.map((g) => g.supplier_id),
    )
    .order('created_at')

  for (const p of photos || []) {
    const sid = p.listings?.supplier_id
    if (sid && !logoOf[sid] && p.url) {
      logoOf[sid] = p.url
      fromListing.add(sid)
    }
  }
  const got = stillMissing.filter((g) => logoOf[g.supplier_id]).length
  if (got) console.log(`🖼️  ${got} صورة من الإعلانات\n`)
}

const ready = groups.filter((g) => logoOf[g.supplier_id] && !g.logo_applied_at)
const missing = groups.filter((g) => !logoOf[g.supplier_id])

console.log('\n═══ لوجوهات الجروبات ═══\n')
console.log(`  جروبات        : ${groups.length}`)
console.log(`  عندهم لوجو    : ${groups.length - missing.length}`)
console.log(`  من غير لوجو   : ${missing.length}`)
console.log(`  جاهز للتطبيق  : ${ready.length}\n`)

for (const g of ready) console.log(`   ✓ ${g.subject}`)

if (missing.length) {
  console.log(`\n  ⚠️ ${missing.length} جروب من غير لوجو — لازم نجمّعهم الأول.`)
}

if (!SEND) {
  console.log('\n👀 معاينة بس.\n')
  process.exit(0)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let ok = 0
let fail = 0

for (let i = 0; i < ready.length; i++) {
  const g = ready[i]
  try {
    const res = await fetch(GATEWAY, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-secret': env.EDGE_GATEWAY_SECRET },
      body: JSON.stringify({
        action: 'picture',
        group_jid: g.group_jid,
        image_url: logoOf[g.supplier_id],
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (data?.ok) {
      await db
        .from('supplier_wa_groups')
        .update({ logo_applied_at: new Date().toISOString() })
        .eq('id', g.id)
      // نحفظها كلوجو للمورّد كمان — عشان الماركتبليس يستفيد منها
      // ومانرجعش ندوّر عليها كل مرة.
      // ⚠️ صور الإعلانات مش لوجو، فمابنحفظهاش في logo_url —
      //    هتبان غلط على صفحة المورّد في الماركتبليس.
      if (!fromListing.has(g.supplier_id)) {
        await db
          .from('marketplace_suppliers')
          .update({ logo_url: logoOf[g.supplier_id] })
          .eq('id', g.supplier_id)
      }
      ok++
      console.log(`  ✅ ${g.subject}`)
    } else {
      fail++
      console.log(`  🔴 ${g.subject}  ${data?.error || res.status}`)
    }
  } catch (e) {
    fail++
    console.log(`  🔴 ${g.subject}  ${e.message}`)
  }
  if (i < ready.length - 1) await sleep(6000)
}

console.log(`\n═══ خلص: ${ok} لوجو · ${fail} فشل ═══\n`)
