// scripts/car-models-to-select.mjs
// 🚗 (٢٧ أغسطس ٢٠٢٦) «الموديل» في تصنيفات المركبات كان نص حر → بقى قايمة
// منسدلة. الموديلات أسماء تجارية لاتينية فمش محتاجة ترجمة — نفس القيمة
// في كل اللغات. «أخرى…» موجودة لأي موديل مش في القايمة.
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => /^[A-Z_]+=/.test(l)).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const CAR_MODELS = ['Corolla','Yaris','Camry','Hilux','Fortuner','RAV4','Land Cruiser','Elantra','Accent','Tucson','Creta','Sonata','Santa Fe','i10','i30','Cerato','Sportage','Sorento','Picanto','Rio','Seltos','Sunny','Qashqai','X-Trail','Juke','Sentra','Optra','Aveo','Captiva','Cruze','Lancer','Attrage','Xpander','Eclipse Cross','C-Class','E-Class','S-Class','GLA','GLC','GLE','A-Class','320i','520i','X1','X3','X5','X6','A3','A4','A6','Q3','Q5','Q7','Golf','Passat','Tiguan','Polo','Jetta','Octavia','Fabia','Superb','Kamiq','Karoq','Leon','Ibiza','Ateca','Arona','Formentor','Clio','Megane','Duster','Captur','Logan','208','301','2008','3008','508','C3','C4','C-Elysee','Tipo','500','Punto','Civic','CR-V','Accord','City','Swift','Vitara','Baleno','CX-5','Mazda 3','Mazda 6','Emgrand','Coolray','Azkarra','Arrizo 5','Tiggo 3','Tiggo 4','Tiggo 7','Tiggo 8','MG5','MG ZS','MG HS','MG RX5','Jolion','H6','Dargo','Glory 580','Glory 500','Saga','X50','X70','T2','Dashing','Seal','Atto 3','Song','Han','Range Rover','Discovery','Defender','Evoque','Cayenne','Macan','Panamera','Wrangler','Grand Cherokee','Compass','Renegade','Urus','Levante','Ghibli','Bentayga','Cullinan','Phantom','Model 3','Model Y'];
const MOTO_MODELS = ['CG 125','CB 150','CBR','Dream','Wave','YBR 125','Crypton','R15','MT-15','NMAX','Aerox','GS 150','GSX','Hayabusa','Ninja','Z400','Versys','Pulsar','Boxer','Discover','Dominar','TNT 150','TNT 250','302S','Apache','Star City','Ntorq','Duke 125','Duke 200','Duke 390','SR 150','Vespa Primavera','Vespa Sprint','Classic 350','Meteor 350','Himalayan','Iron 883','Sportster','Street 750'];
const YACHT_TYPES = ['Speedboat','Cabin cruiser','Yacht','Fishing boat','Sailboat','Catamaran','Jet ski','Felucca','Pontoon','Custom build'];

const pick = (slug) => {
  if (/motorcycle|tuktuk/.test(slug)) return MOTO_MODELS
  if (/marine|yacht|boat/.test(slug)) return YACHT_TYPES
  if (/vehicle|car/.test(slug)) return CAR_MODELS
  return null
}
const { data: rows, error } = await sb.from('attributes').select('id,field_key,field_type,category_id,categories(slug)').eq('field_key', 'model').eq('field_type', 'text')
if (error) { console.error(error.message); process.exit(1) }
let n = 0, skipped = 0
for (const r of rows) {
  const slug = r.categories?.slug || ''
  const list = pick(slug)
  if (!list) { skipped++; continue }
  const opts = [...list, '__other']
  const options = opts.map(m => ({ key: m, label_ar: m === '__other' ? 'موديل آخر…' : m }))
  const options_i18n = Object.fromEntries(opts.map(m => [m, m === '__other'
    ? { en: 'Other model…', uk: 'Інша модель…', ru: 'Другая модель…', ja: 'その他のモデル…', zh: '其他型号…' }
    : { en: m, uk: m, ru: m, ja: m, zh: m }]))
  const { error: e } = await sb.from('attributes').update({ field_type: 'select', options, options_i18n }).eq('id', r.id)
  if (e) console.error('save', r.id, e.message); else n++
}
console.log('model -> dropdown:', n, '| skipped (non-vehicle):', skipped)
