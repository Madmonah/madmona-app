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

const live = violations.filter((v) => !v.dead)
const dead = violations.filter((v) => v.dead)

console.log('═══ حارس قناة الواتساب ═══\n')

if (live.length === 0) {
  console.log('✅ مفيش أي ملف حي بينفّذ الإرسال بنفسه\n')
} else {
  console.log(`🔴 ${live.length} ملف بينادي Graph للإرسال مباشرة:\n`)
  for (const v of live) console.log('   ' + v.rel)
  console.log('\n   الحل: استخدم sendText من @/lib/whatsapp')
  console.log('   أو (لدوال Deno) POST على /api/internal/wa-send\n')
}

if (dead.length) {
  console.log(`ℹ️  ${dead.length} دالة Edge ميتة معروفة (موثّقة، هتتشال لاحقًا)\n`)
}

process.exit(live.length ? 1 : 0)
