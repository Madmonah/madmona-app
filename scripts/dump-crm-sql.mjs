// 🧱 dump-crm-sql.mjs — بيولّد ملف إعادة بناء نظام الـCRM من الداتابيز نفسها
// ---------------------------------------------------------------------------
// محمد (٢٢ أغسطس ٢٠٢٦): «بلاقي حاجات بتقع بعد ما بنقفل الجلسة»
//
// السبب الجذري: دوال الداتابيز كانت بتتعمل لايف بس ومش موجودة في الريبو.
// السكريبت ده بيقفل الحكاية: بيقرا كل دوال `crm_*` + `madmona_team_accounts`
// من السيرفر، وبيكتبها في `sql/2026-08-22_crm_functions_rebuild.sql`.
//
//   شغّله بعد أي تعديل على الداتابيز:   node scripts/dump-crm-sql.mjs
//   وبعدين:                              git add sql/ && git commit
//
// كده الريبو بيفضل هو المصدر، ولو الداتابيز وقعت بنرجّعها من الملف ده.
// ---------------------------------------------------------------------------
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const ROOT = process.cwd()
const env = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/)
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] }),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

// ⚠️ محتاج RPC `admin_sql_ro` لو موجودة؛ غير كده بنستخدم PostgREST على views.
//    أبسط طريق: دالة صغيرة في الداتابيز بترجّع الدَمب.
const { data, error } = await db.rpc('crm_sql_dump')
if (error) { console.error('❌', error.message); process.exit(1) }

const HEADER = `-- ============================================================================
-- 🧱 نظام الـCRM كامل — ملف إعادة بناء (متولّد آليًا — متعدّلوش بالإيد)
-- ============================================================================
-- اتولّد بـ: node scripts/dump-crm-sql.mjs
--
-- ليه موجود؟ لأن دوال الداتابيز كانت بتتعمل لايف بس ومش موجودة في الريبو،
-- فأي جلسة تعمل نسخة تانية بتوقيع مختلف → النداء يقع على النسخة الغلط،
-- ولو الداتابيز اترجّعت من باك أب الشاشات كلها بتقع.
--
-- 🐞 والغلطة اللي كانت بتضيّع الدوال: إنشاء الدالة وبعده في **نفس النداء**
--    \`begin; … rollback;\` للتجربة. الـDDL في بوستجرس جوّه ترانزاكشن،
--    فالرollback بيلغي الإنشاء — والتجربة تطلع ناجحة والدالة مش موجودة.
--    ✅ القاعدة: الإنشاء في نداء لوحده، والتجربة في نداء تاني.
--
-- بعد ما تشغّله كله:  select jsonb_pretty(crm_health());   → "ok": true
-- ============================================================================

`
const out = path.join(ROOT, 'sql', '2026-08-22_crm_functions_rebuild.sql')
fs.writeFileSync(out, HEADER + data + '\n', 'utf8')
const n = (data.match(/CREATE OR REPLACE FUNCTION/g) || []).length
console.log(`✅ ${n} دالة → ${path.relative(ROOT, out)}`)
