// scripts/apply-listing-i18n.mjs — يرفع ترجمات جاهزة (من غير أي نداء AI) لـ listings.i18n
//   node scripts/apply-listing-i18n.mjs _i18n/zh_1.json
// الملف: [{ "id": "...", "zh": {"title":"","description":""}, "en": {...}? ... }]
// بيدمج على الموجود (ما بيمسحش لغات تانية).
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => /^[A-Z_]+=/.test(l)).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
let ok = 0, bad = 0
for (const f of process.argv.slice(2)) {
  const items = JSON.parse(fs.readFileSync(f, 'utf8'))
  for (const it of items) {
    const { id, ...langs } = it
    const { data: row, error } = await sb.from('listings').select('i18n').eq('id', id).single()
    if (error || !row) { bad++; console.error('missing', id); continue }
    const merged = { ...(row.i18n || {}) }
    for (const [l, v] of Object.entries(langs)) if (v && typeof v.title === 'string') merged[l] = { title: v.title, description: v.description || '' }
    const { error: e2 } = await sb.from('listings').update({ i18n: merged }).eq('id', id)
    if (e2) { bad++; console.error('save', id, e2.message) } else ok++
  }
}
console.log('applied', ok, 'failed', bad)
