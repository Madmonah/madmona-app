#!/usr/bin/env node
// =====================================================================
// 🏷️  تسمية الجروبات بأسماء أصحابها الحقيقية
//
// الجروبات دي كانت اسمها «موردة جديدة» أو «حساب 1060138703» —
// أسماء وهمية من التسجيل التلقائي. اتغيّروا مؤقتًا لـ«مضمونة 🤝 متابعة»،
// ودلوقتي بناخد الاسم الحقيقي من مصدرين:
//
//   ١. اسم الواتساب اللي هما نفسهم حاطينه (push name)
//   ٢. عنوان إعلاناتهم — لما اسم الواتساب مالوش لازمة
//      («.» · «None» · حروف مزخرفة)
//
// وبنحدّث business_name في الداتابيز كمان — عشان الاسم الوهمي
// ما يرجعش يظهر في أي مكان تاني.
//
//   node scripts/name-groups.mjs           معاينة
//   node scripts/name-groups.mjs --send    تنفيذ
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

// راجعتهم واحد واحد. اللي اسم الواتساب بتاعه واضح خدته زي ما هو،
// واللي اسمه «.» أو «None» أو حروف مزخرفة وصفته من إعلاناته.
const NAMES = {
  '120363429455169315@g.us': 'United Real Estate Developments',
  '120363411747775840@g.us': 'عادل إبراهيم — استشارات عقارية',
  '120363426871843087@g.us': 'Eb Sadek',
  '120363430458471641@g.us': 'Maged Aboelwafa',
  '120363429795463525@g.us': 'Enas Ghonem',
  '120363409711280682@g.us': 'Nancy — بورتو جولف',
  '120363410630229388@g.us': 'Nadia — عقارات الساحل',
  '120363429547167615@g.us': 'Yasmine — بيو بيلا',
  '120363430724925794@g.us': 'El Hewey',
  '120363409829609951@g.us': 'عقارات العاصمة الإدارية',
  '120363429929079963@g.us': 'عقارات مارينا جاردنز',
  '120363431821970489@g.us': 'سكن طالبات — القبة',
}

const { data: groups, error } = await db
  .from('supplier_wa_groups')
  .select('id, subject, group_jid, supplier_id')
  .eq('is_active', true)
  .in('group_jid', Object.keys(NAMES))

if (error) {
  console.error('🔴', error.message)
  process.exit(1)
}

console.log(`\n═══ تسمية الجروبات ═══\n`)
for (const g of groups) {
  console.log(`   ${g.subject.padEnd(22)} →  مضمونة × ${NAMES[g.group_jid]}`)
}

if (!SEND) {
  console.log(`\n👀 معاينة بس. ${groups.length} جروب.\n`)
  process.exit(0)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let ok = 0
let fail = 0

console.log('\n─── جاري التغيير ───\n')

for (let i = 0; i < groups.length; i++) {
  const g = groups[i]
  const name = NAMES[g.group_jid]
  const subject = `مضمونة × ${name}`.slice(0, 90)

  try {
    const res = await fetch(GATEWAY, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-secret': env.EDGE_GATEWAY_SECRET },
      body: JSON.stringify({ action: 'rename', group_jid: g.group_jid, subject }),
    })
    const data = await res.json().catch(() => ({}))

    if (data?.ok) {
      await db.from('supplier_wa_groups').update({ subject }).eq('id', g.id)
      // 🔑 الإصلاح الجذري — الاسم الوهمي مش هيرجع يظهر تاني
      await db.from('marketplace_suppliers').update({ business_name: name }).eq('id', g.supplier_id)
      ok++
      console.log(`  ✅ ${subject}`)
    } else {
      fail++
      const err = String(data?.error || res.status)
      console.log(`  🔴 ${name}  ${err}`)
      if (/rate.?overlimit|too.?many|429/i.test(err)) {
        console.log('\n⛔ تحذير سرعة من واتساب. بنوقف.\n')
        break
      }
    }
  } catch (e) {
    fail++
    console.log(`  🔴 ${name}  ${e.message}`)
  }
  if (i < groups.length - 1) await sleep(6000)
}

console.log(`\n═══ خلص: ${ok} اتسمّى · ${fail} فشل ═══\n`)
