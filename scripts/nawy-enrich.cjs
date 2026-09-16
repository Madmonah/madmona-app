// 🔎 تحقق وتكميل من ناوي لمشاريع البورصة — محمد ١٦/٩: «أكّد المعلومات اللي عندنا برضو من برّه زي ناوي».
// بيسحب: project_area (م² → فدان ÷٤٢٠٠.٨٣ — الوحدة اتأكدت بـHelio Eye: ١٢٬٧٧٧م² = ٣ فدان زي نصّنا)
//        + primary_status (On Sale / Launch / Hold / Sold-off) + launch_start_date/not_launched.
// ⛔ مابيكتبش في الداتابيز — تقرير JSON للمراجعة بس. أي اختلاف في اسم المطوّر بيتعلّم devMatch:false
//    (المطابقة بالاسم غلطت قبل كده: Upwyde → Hassan Allam · AGEC → G Developments).
// القايمة بتتجاب من الداتابيز مباشرة: مشاريع المطوّرين بس (segment='developer') من غير وحدات مفردة
// ولا صفوف السماسرة المؤقتين — ١١١ مشروع.
const https = require('https'), fs = require('fs')
const DIR = 'E:/madmona-app/scripts/'

const env = Object.fromEntries(
  fs.readFileSync('E:/madmona-app/.env.local', 'utf8').split(/\r?\n/)
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')]))
const SB_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SB_KEY = env.SUPABASE_SERVICE_ROLE_KEY

function get(u, headers) {
  return new Promise(s => {
    https.get(u, { headers: headers || { accept: 'application/json' } }, r => {
      let b = []; r.on('data', d => b.push(d)); r.on('end', () => s({ st: r.statusCode, t: Buffer.concat(b).toString() }))
    }).on('error', e => s({ st: 0, t: String(e.message) }))
  })
}
const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

;(async () => {
  // ١) مشاريعنا من الداتابيز
  const q = SB_URL + '/rest/v1/property_market_items'
    + '?select=id,title,developer,note,unit_label,land_area_m2'
    + '&is_active=is.true&segment=eq.developer&title=not.is.null&order=title'
  const our = await get(q, { accept: 'application/json', apikey: SB_KEY, authorization: 'Bearer ' + SB_KEY })
  if (our.st !== 200) { console.log('ABORT: supabase http' + our.st, our.t.slice(0, 200)); return }
  let ours = JSON.parse(our.t)
  const skip = /مؤقت|حساب |فرد/
  const unitTitle = /^(شقة|فيلا|محل|مكتب|عيادة|كافيه|دوبلكس|توين|شاليه|قرية)/
  ours = ours.filter(o => !skip.test(o.developer || '') && !unitTitle.test(o.title) && !o.title.includes('—'))
  console.log('ours (developer projects):', ours.length)

  // ٢) قايمة ناوي
  const lr = await get('https://webapi.nawy.com/api/compounds?page_size=3000&page_number=1')
  let arr = []
  try { const list = JSON.parse(lr.t); arr = Array.isArray(list) ? list : (list.values || list.data || []) } catch (e) {}
  console.log('nawy list:', arr.length)
  if (!arr.length) { console.log('ABORT: nawy list empty (http ' + lr.st + ')'); return }
  const idx = arr.map(c => ({ id: c.id, name: c.name, n: norm(c.name) }))

  // ٣) مطابقة + سحب التفاصيل
  const FED = /([\d٠-٩]{1,4})\s*فدان/
  const ar2en = s => s.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
  const out = []
  for (const o of ours) {
    const txt = (o.note || '') + ' ' + (o.unit_label || '')
    const fm = txt.match(FED)
    const ourFeddan = fm ? Number(ar2en(fm[1])) : null

    const qn = norm(o.title)
    let hit = idx.find(c => c.n === qn)
    if (!hit && qn.length >= 6) hit = idx.filter(c => c.n.includes(qn) || qn.includes(c.n)).sort((a, b) => a.n.length - b.n.length)[0]
    if (!hit) { out.push({ id: o.id, title: o.title, ourFeddan, matched: false }); continue }

    const r = await get('https://webapi.nawy.com/api/compounds/' + hit.id)
    if (r.st !== 200) { out.push({ id: o.id, title: o.title, ourFeddan, matched: true, nawyId: hit.id, err: 'http' + r.st }); continue }
    let c
    try { const j = JSON.parse(r.t); c = j.compound || j } catch (e) { out.push({ id: o.id, title: o.title, err: 'parse' }); continue }

    const nawyDev = (c.developer && c.developer.name) || null
    const feddan = c.project_area ? +(c.project_area / 4200.83).toFixed(2) : null
    out.push({
      id: o.id, title: o.title, ourDev: o.developer || null, ourFeddan,
      matched: true, nawyId: hit.id, nawyName: c.name, nawyDev,
      devMatch: (o.developer && nawyDev) ? norm(o.developer).slice(0, 5) === norm(nawyDev).slice(0, 5) : null,
      area_m2: c.project_area || null, feddan,
      feddanGap: (ourFeddan && feddan) ? +Math.abs(ourFeddan - feddan).toFixed(1) : null,
      status: c.primary_status || c.status || null,
      launch: c.launch_start_date || null,
      not_launched: c.not_launched === true,
    })
    process.stdout.write('.')
  }

  fs.writeFileSync(DIR + 'nawy-enrich.json', JSON.stringify(out, null, 1))
  const withArea = out.filter(x => x.feddan)
  const conflicts = out.filter(x => x.devMatch === false || (x.feddanGap !== null && x.feddanGap > 1))
  console.log('\n--- تقرير ---')
  console.log('matched', out.filter(x => x.matched).length, '/', out.length,
    '| with_feddan', withArea.length,
    '| ourFeddan_from_text', out.filter(x => x.ourFeddan).length,
    '| launches', out.filter(x => x.launch).length,
    '| conflicts', conflicts.length)
  console.log('statuses:', JSON.stringify(out.reduce((a, x) => { if (x.status) a[x.status] = (a[x.status] || 0) + 1; return a }, {})))
  console.log('TOP_FEDDAN:', withArea.sort((a, b) => b.feddan - a.feddan).slice(0, 10).map(x => `${x.title}=${x.feddan}`).join(' · '))
  console.log('CONFLICTS:', conflicts.slice(0, 10).map(x => `${x.title}[dev:${x.ourDev}≠${x.nawyDev}|فدان:${x.ourFeddan}≠${x.feddan}]`).join(' · '))
})().catch(e => console.log('ERR', e.message))
