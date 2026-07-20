#!/usr/bin/env node
// =====================================================================
// حارس قناة الواتساب
//
// بيمنع تكرار المشكلة الجذرية: أي ملف بينفّذ إرسال واتساب بنفسه
// بدل ما يعدّي من نقطة الإرسال الموحّدة.
//
// التشغيل:  node scripts/check-wa-channel.mjs
// بيرجع كود ١ لو لقى مخالفة — عشان يقدر يتحط في CI.
// =====================================================================

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()

// الملفات المسموح لها تنادي Graph مباشرة
const ALLOWED = new Set([
  'src/lib/whatsapp.ts',                       // نقطة الإرسال نفسها
  'src/app/api/internal/wa-send/route.ts',     // البوابة الموحّدة
])

// دوال Edge ميتة — متوثّقة في SECURITY-AUDIT.md، هتتشال لاحقًا
const KNOWN_DEAD = /supabase\/functions\/(madmona-otp|owner-wa-otp|whatsapp-(bulk-template|send-draft|send-real|test-send|webhook|signup-bot)|wa-outreach-util|admin-whatsapp-bot)\//

// ── استثناءات معروفة (٢٠ يوليو ٢٠٢٦) ─────────────────────────────────────
// كل واحد ليه سبب محدد وخطة. الحارس بيعدّيها عشان يقدر يشتغل في CI
// ويمسك أي مخالفة **جديدة** — لكنه بيفضل يعرضها كديون مفتوح.
//
// ⚠️ ماتضيفش هنا إلا بسبب حقيقي مكتوب. الغرض إن القايمة تفضل تصغر.
const KNOWN_DEBT = new Map([
  [
    'supabase/functions/admin-command/index.ts',
    'إرسال الصور بس — البوابة نصية. الحل: نضيف ميديا للبوابة (wa-service عنده /send-media)',
  ],
  [
    'supabase/functions/unified-agents/index.ts',
    'بيبعت قوالب Meta — مالهاش وجود في Baileys. التحويل بيغيّر نص الرسالة للعملاء → محتاج مراجعة محمد',
  ],
  [
    'supabase/functions/booking-notifications-cron/index.ts',
    'مش منشورة على Supabase (اتأكدنا بـ functions list) — كود ميت',
  ],
  [
    'supabase/functions/customer-birthday-cron/index.ts',
    'مش منشورة على Supabase (اتأكدنا بـ functions list) — كود ميت',
  ],
])

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', '.git', '.wa-profile', '.wa-dl'].includes(e.name)) continue
    const p = join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.(ts|tsx|js|mjs)$/.test(e.name)) out.push(p)
  }
  return out
}

const violations = []

for (const file of walk(join(ROOT, 'src')).concat(walk(join(ROOT, 'supabase', 'functions')))) {
  const rel = relative(ROOT, file).replace(/\\/g, '/')
  if (ALLOWED.has(rel)) continue

  const src = readFileSync(file, 'utf8')
  const sendsWhatsApp =
    src.includes('graph.facebook.com') &&
    /messaging_product['"\s:]+.{0,4}whatsapp/i.test(src)

  if (sendsWhatsApp) {
    violations.push({ rel, dead: KNOWN_DEAD.test(rel) })
  }
}

const dead = violations.filter((v) => v.dead)
const known = violations.filter((v) => !v.dead && KNOWN_DEBT.has(v.rel))
const fresh = violations.filter((v) => !v.dead && !KNOWN_DEBT.has(v.rel))

console.log('═══ حارس قناة الواتساب ═══\n')

if (fresh.length === 0) {
  console.log('✅ مفيش مخالفة جديدة\n')
} else {
  console.log(`🔴 ${fresh.length} ملف جديد بينادي Graph للإرسال مباشرة:\n`)
  for (const v of fresh) console.log('   ' + v.rel)
  console.log('\n   الحل: استخدم sendText من @/lib/whatsapp')
  console.log('   أو (لدوال Deno) waSend من ../_shared/wa-send.ts\n')
}

if (known.length) {
  console.log(`⚠️  ${known.length} ديون معروفة (مسموح بيها مؤقتًا):\n`)
  for (const v of known) console.log(`   ${v.rel}\n      └─ ${KNOWN_DEBT.get(v.rel)}`)
  console.log('')
}

if (dead.length) {
  console.log(`ℹ️  ${dead.length} دالة Edge ميتة معروفة (موثّقة، هتتشال لاحقًا)\n`)
}

// بيفشل على الجديد بس — عشان يقدر يشتغل في CI من غير ما يكسر كل رفعة
process.exit(fresh.length ? 1 : 0)
