// scripts/translate-listings.mjs
// 🌍 (٢٧ أغسطس ٢٠٢٦) يترجم عنوان ووصف الإعلانات المنشورة لـ en/uk/ru/ja/zh
// بهايكو ويخزّنها في listings.i18n. بيكمّل بس اللغات الناقصة لكل إعلان.
//   node scripts/translate-listings.mjs                 → كل المنشور الناقص
//   node scripts/translate-listings.mjs --limit 50      → دفعة محدودة
//   node scripts/translate-listings.mjs --langs zh      → لغة واحدة بس
// آمن يتشغّل أي وقت: التريجر بيفضّي i18n لو الأصل اتغيّر، والسكريبت بيملّى الفاضي.
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'

const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => /^[A-Z_]+=/.test(l)).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const ai = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d }
const LIMIT = Number(arg('--limit', 100000))
const ALL_LANGS = ['en', 'uk', 'ru', 'ja', 'zh']
const LANGS = arg('--langs', ALL_LANGS.join(',')).split(',').map(s => s.trim()).filter(Boolean)
const NAMES = { en: 'English', uk: 'Ukrainian', ru: 'Russian', ja: 'Japanese', zh: 'Simplified Chinese' }
const BATCH = 4

const SYSTEM = `You translate Egyptian marketplace listings (rentals, sales, services, restaurants) from Arabic (Egyptian dialect) into: ${LANGS.map(l => `${l} = ${NAMES[l] || l}`).join(', ')}.
Rules: keep meaning and tone, natural and concise; keep numbers, prices (EGP), phone numbers, brand names, place names accurate; do not add or remove information; no commentary.
Output ONLY a JSON array, same order as input, each item: {"id":"...", ${LANGS.map(l => `"${l}":{"title":"","description":""}`).join(', ')}}. If description is empty, return "" for it. Escape quotes properly.`

const { data: rows, error } = await sb.from('listings').select('id,title,description,i18n').eq('status', 'published').order('published_at', { ascending: false, nullsFirst: false })
if (error) { console.error(error.message); process.exit(1) }
const todo = rows.filter(r => LANGS.some(l => !(r.i18n || {})[l]?.title)).slice(0, LIMIT)
console.log('to translate:', todo.length, 'langs:', LANGS.join(','))
let done = 0, failed = 0, inTok = 0, outTok = 0
for (let i = 0; i < todo.length; i += BATCH) {
  const batch = todo.slice(i, i + BATCH)
  const input = batch.map(r => ({ id: r.id, title: r.title || '', description: (r.description || '').slice(0, 1200) }))
  try {
    const res = await ai.messages.create({ model: 'claude-haiku-4-5', max_tokens: 8000, system: SYSTEM, messages: [{ role: 'user', content: JSON.stringify(input) }] })
    inTok += res.usage?.input_tokens || 0; outTok += res.usage?.output_tokens || 0
    const text = res.content.map(c => c.type === 'text' ? c.text : '').join('').replace(/```json|```/g, '').trim()
    const arr = JSON.parse(text)
    for (const item of arr) {
      const row = batch.find(r => r.id === item?.id)
      if (!row || !LANGS.every(l => item[l] && typeof item[l].title === 'string')) { failed++; continue }
      const merged = { ...(row.i18n || {}) }
      for (const l of LANGS) merged[l] = { title: item[l].title, description: item[l].description || '' }
      const { error: e2 } = await sb.from('listings').update({ i18n: merged }).eq('id', row.id)
      if (e2) { failed++; console.error('save', row.id, e2.message) } else done++
    }
  } catch (e) { failed += batch.length; console.error('batch', i, e.message) }
  process.stdout.write(`\r${done} ok / ${failed} failed`)
}
console.log(`\ndone ${done}, failed ${failed}, tokens in ${inTok} out ${outTok}`)
