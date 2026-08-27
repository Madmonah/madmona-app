// scripts/translate-listings.mjs
// 🌍 (٢٧ أغسطس ٢٠٢٦) يترجم عنوان ووصف الإعلانات المنشورة اللي i18n بتاعها فاضي
// لـ en/uk/ru/ja بهايكو ويخزّنها في listings.i18n.
//   node scripts/translate-listings.mjs            → كل المنشور الناقص
//   node scripts/translate-listings.mjs --limit 50 → دفعة محدودة
// آمن يتشغّل أي وقت: مش بيلمس إعلان اتترجم خلاص، والتريجر بيفضّي i18n لو الأصل اتغيّر.
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'

const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => /^[A-Z_]+=/.test(l)).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const ai = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
const limitArg = process.argv.indexOf('--limit'); const LIMIT = limitArg > -1 ? Number(process.argv[limitArg + 1]) : 100000
const BATCH = 8
const LANGS = ['en', 'uk', 'ru', 'ja']

const SYSTEM = `You translate Egyptian marketplace listings (rentals, sales, services, restaurants) from Arabic (Egyptian dialect) into English, Ukrainian, Russian and Japanese.
Rules: keep meaning and tone, natural and concise; keep numbers, prices (EGP), phone numbers, brand names, place names (Cairo, Heliopolis, North Coast...) accurate; do not add or remove information; do not add commentary.
Output ONLY a JSON array, same order as input, each item: {"id":"...","en":{"title":"","description":""},"uk":{...},"ru":{...},"ja":{...}}. If description is empty, return "" for it.`

const { data: rows, error } = await sb.from('listings').select('id,title,description').eq('status', 'published').is('i18n', null).order('published_at', { ascending: false, nullsFirst: false }).limit(LIMIT)
if (error) { console.error(error.message); process.exit(1) }
console.log('to translate:', rows.length)
let done = 0, failed = 0, inTok = 0, outTok = 0
for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH).map(r => ({ id: r.id, title: r.title || '', description: (r.description || '').slice(0, 1500) }))
  try {
    const res = await ai.messages.create({ model: 'claude-haiku-4-5', max_tokens: 8000, system: SYSTEM, messages: [{ role: 'user', content: JSON.stringify(batch) }] })
    inTok += res.usage?.input_tokens || 0; outTok += res.usage?.output_tokens || 0
    const text = res.content.map(c => c.type === 'text' ? c.text : '').join('').replace(/```json|```/g, '').trim()
    const arr = JSON.parse(text)
    for (const item of arr) {
      if (!item?.id || !LANGS.every(l => item[l] && typeof item[l].title === 'string')) { failed++; continue }
      const i18n = Object.fromEntries(LANGS.map(l => [l, { title: item[l].title, description: item[l].description || '' }]))
      const { error: e2 } = await sb.from('listings').update({ i18n }).eq('id', item.id).is('i18n', null)
      if (e2) { failed++; console.error('save', item.id, e2.message) } else done++
    }
  } catch (e) { failed += batch.length; console.error('batch', i, e.message) }
  process.stdout.write(`\r${done} ok / ${failed} failed`)
}
console.log(`\ndone ${done}, failed ${failed}, tokens in ${inTok} out ${outTok}`)
