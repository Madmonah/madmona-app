// scripts/translate-categories-lang.mjs
// 🌍 (٢٧ أغسطس ٢٠٢٦) يملّى categories.name_i18n[lang] و group_name_i18n[lang]
// لأي لغة ناقصة بهايكو (من name_en/name_ar). الاستخدام:
//   node scripts/translate-categories-lang.mjs --lang zh
// آمن يتكرر: بيلمس بس اللي ناقصه اللغة دي.
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => /^[A-Z_]+=/.test(l)).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const ai = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
const li = process.argv.indexOf('--lang'); const LANG = li > -1 ? process.argv[li + 1] : null
if (!LANG) { console.error('usage: --lang zh'); process.exit(1) }
const NAMES = { zh: 'Simplified Chinese', uk: 'Ukrainian', ru: 'Russian', ja: 'Japanese', en: 'English', fr: 'French', de: 'German', tr: 'Turkish', it: 'Italian', es: 'Spanish' }
const target = NAMES[LANG] || LANG

async function translateMap(items, kind) {
  // items: [{key, ar, en}] → {key: translation}
  const out = {}
  for (let i = 0; i < items.length; i += 60) {
    const batch = items.slice(i, i + 60)
    const res = await ai.messages.create({ model: 'claude-haiku-4-5', max_tokens: 6000, system: `Translate Egyptian marketplace ${kind} names into ${target}. Short, natural, as a shopper would read them on a category chip. Keep brand/place names (Ain Sokhna, El Gouna, InstaPay...). Output ONLY a JSON object mapping each "key" to its ${target} translation.`, messages: [{ role: 'user', content: JSON.stringify(batch) }] })
    const text = res.content.map(c => c.type === 'text' ? c.text : '').join('').replace(/```json|```/g, '').trim()
    Object.assign(out, JSON.parse(text))
  }
  return out
}

const { data: cats } = await sb.from('categories').select('id,name_ar,name_en,name_i18n,group_slug,group_name_ar,group_name_i18n').eq('is_active', true)
const needCat = cats.filter(c => !(c.name_i18n || {})[LANG])
const groups = new Map()
for (const c of cats) if (c.group_slug && !(c.group_name_i18n || {})[LANG]) groups.set(c.group_slug, { key: c.group_slug, ar: c.group_name_ar, en: (c.group_name_i18n || {}).en || '' })
console.log('categories needing', LANG + ':', needCat.length, '| groups:', groups.size)
if (needCat.length) {
  // dedupe by name_ar so twins share one translation
  const byAr = new Map(); for (const c of needCat) if (!byAr.has(c.name_ar)) byAr.set(c.name_ar, { key: c.name_ar, ar: c.name_ar, en: c.name_en || (c.name_i18n || {}).en || '' })
  const tr = await translateMap([...byAr.values()], 'category')
  let n = 0
  for (const c of needCat) { const v = tr[c.name_ar]; if (!v) continue; const { error } = await sb.from('categories').update({ name_i18n: { ...(c.name_i18n || {}), [LANG]: v } }).eq('id', c.id); if (!error) n++ }
  console.log('categories updated', n)
}
if (groups.size) {
  const tr = await translateMap([...groups.values()], 'category group')
  let n = 0
  for (const [slug, g] of groups) { const v = tr[slug]; if (!v) continue; const rows = cats.filter(c => c.group_slug === slug); for (const r of rows) { const { error } = await sb.from('categories').update({ group_name_i18n: { ...(r.group_name_i18n || {}), [LANG]: v } }).eq('id', r.id); if (!error) n++ } }
  console.log('group rows updated', n)
}
