// scripts/apply-category-i18n.mjs — يطبّق ترجمات التصنيفات من sql/2026-08-27_category_i18n.cjs
// عبر service role (من .env.local). التشغيل: node scripts/apply-category-i18n.mjs
import { createClient } from '@supabase/supabase-js'
import { createRequire } from 'module'
import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => /^[A-Z_]+=/.test(l)).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
// نستخرج الخرائط من ملف المولّد من غير ما نطبع الـSQL
const src = fs.readFileSync('sql/2026-08-27_category_i18n.cjs', 'utf8')
const mod = { exports: {} }
new Function('module', 'process', src.replace(/process\.stdout\.write[\s\S]*$/, 'module.exports={C,G}'))(mod, { stdout: { write() {} } })
const { C, G } = mod.exports
let ok = 0, miss = []
for (const [ar, a] of Object.entries(C)) {
  const i18n = { en: a[0], uk: a[1], ru: a[2], ja: a[3] }
  const { data, error } = await sb.from('categories').update({ name_i18n: i18n }).eq('name_ar', ar).select('id,name_en')
  if (error) { console.error('ERR', ar, error.message); continue }
  if (!data.length) { miss.push(ar); continue }
  ok += data.length
  for (const row of data) if (!row.name_en) await sb.from('categories').update({ name_en: a[0] }).eq('id', row.id)
}
for (const [slug, a] of Object.entries(G)) {
  const { error } = await sb.from('categories').update({ group_name_i18n: { en: a[0], uk: a[1], ru: a[2], ja: a[3] } }).eq('group_slug', slug)
  if (error) console.error('ERR group', slug, error.message)
}
const { data: left } = await sb.from('categories').select('slug,name_ar').eq('is_active', true).eq('name_i18n', '{}')
console.log('updated rows:', ok, '| map entries with no row:', miss.length, miss.join(', '))
console.log('active still untranslated:', (left || []).length, (left || []).map(r => r.slug).join(', '))
