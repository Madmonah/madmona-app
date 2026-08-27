// scripts/apply-attribute-i18n.mjs â€” ÙŠØ±ÙØ¹ ØªØ±Ø¬Ù…Ø© Ø£Ø³Ù…Ø§Ø¡ Ø§Ù„Ø®ØµØ§Ø¦Øµ ÙˆØ§Ø®ØªÙŠØ§Ø±Ø§ØªÙ‡Ø§ (Ø¨Ø¯ÙˆÙ† Ø£ÙŠ Ù†Ø¯Ø§Ø¡ AI)
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { A } = require('../sql/i18n/attr.cjs')
const { O } = require('../sql/i18n/opt.cjs')
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => /^[A-Z_]+=/.test(l)).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const L = ['en', 'uk', 'ru', 'ja', 'zh']
const obj = (arr) => Object.fromEntries(L.map((l, i) => [l, arr[i]]))
const { data: rows, error } = await sb.from('attributes').select('id,name_ar,options')
if (error) { console.error(error.message); process.exit(1) }
let n = 0, optN = 0, missName = new Set(), missOpt = new Set()
for (const r of rows) {
  const nm = A[(r.name_ar || '').trim()]
  if (!nm) missName.add(r.name_ar)
  const oi = {}
  for (const o of (r.options || [])) {
    const hit = O[(o.label_ar || '').trim()]
    if (hit) { oi[o.key] = obj(hit); optN++ }
    else if (o.label_ar && /[\u0600-\u06FF]/.test(o.label_ar)) missOpt.add(o.label_ar)
  }
  const patch = {}
  if (nm) patch.name_i18n = obj(nm)
  if (Object.keys(oi).length) patch.options_i18n = oi
  if (!Object.keys(patch).length) continue
  const { error: e2 } = await sb.from('attributes').update(patch).eq('id', r.id)
  if (e2) console.error('save', r.id, e2.message); else n++
}
console.log('attributes updated:', n, '| option translations:', optN)
console.log('missing names:', [...missName].filter(Boolean).length, [...missName].filter(Boolean).slice(0, 20).join(' | '))
console.log('missing options:', [...missOpt].length, [...missOpt].slice(0, 25).join(' | '))
