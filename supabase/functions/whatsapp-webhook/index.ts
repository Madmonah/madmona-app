// whatsapp-webhook v40 (6 Jul 2026) — «سوّق واكسب» + DEMAND ALERTS:
//  • unmet_demand → instant owner WhatsApp alert (كل طلب عميل بيوصل لمحمد فورًا).
//  • Share-proof intake: referred user sends screenshot + «شير» → referrals.status=share_submitted + owner alert («اعتماد شير <رقم>»).
//  • «كودي/سوق واكسب» fast-path: replies with the user's referral code + share link (deterministic).
//  • Brain knows the referral program (50ج credit / سقف عمولة الأوردر / شرط الشير).
// v39 (5 Jul 2026) — 🧞 THE MARID BRAIN:
//  • Persona renamed to «المارد» — self-aware (knows its powers + full platform
//    capabilities: Excel bulk, menu sizes, ERP sync, CRM+ERP paid sub, World Cup page).
//  • MULTI-PRODUCT INTAKE: supplier text lists «اسم = سعر» → listing_drafts[] (≤8).
//  • 🔥 HOT-LEAD ALERT: marid-contacted lead replies → instant owner WhatsApp + marid_notifications.
//  • Commission fixed everywhere: unified 10% (0% offer REMOVED from prompt + fallbacks).
// v34 (19 Jun 2026) — 🔐 INBOUND REVERSE-OTP:
//  Customer sends a MADxxxxx confirmation code to OUR number -> we verify their phone
//  (wa_confirm_inbound_verification). Sidesteps Meta 24h-window / template problems.
//  Handler runs BEFORE restaurant parsers & AI, on the very first text pass.
// v33: voice replies. v32: instant listing drafts. v29: vision+voice-in. v28: one-reply-per-burst.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CLAUDE_MODEL = 'claude-sonnet-4-6'
const SITE_URL = 'https://madmonacairo.com'
const DEBOUNCE_MS = 8000 // v41 (6 Jul): كان 25000 — المارد كان بيرد براحة أوي؛ 8 ثواني كفاية لتجميع الرسايل المتتالية
const MAX_BATCH = 12

const LISTABLE_SLUGS = 'properties-residential|properties-commercial|properties-industrial|properties-tourism|sale-properties-residential|sale-properties-commercial|sale-properties-industrial|sale-properties-tourism|vehicles|sale-vehicles|marine|sale-marine|workspaces|halls|weddings|equipment|tech-equipment|media|tourism|recreation|fashion-rental|shop-electronics|shop-fashion|shop-home|shop-appliances|shop-auto|shop-beauty|shop-sports|shop-baby|shop-books|shop-misc|home-services|contractors|auto-services|beauty|medical-clinics|consultations|professionals|printing|education-courses|events-photography|food-catering|catering-events|catering-weddings|catering-corporate|catering-buffet|events-full-planning|catering-desserts|events-equipment|childcare|pet-services|religious-services'

const CATEGORY_SLUGS = [
  'properties', 'vehicles', 'workspaces', 'equipment',
  'media', 'weddings', 'tourism', 'recreation', 'marine',
  'apartments', 'chalets', 'villas', 'cars', 'cameras', 'workspace'
]

const CATALOG_SYNONYMS: Array<[string, string]> = [
  ['عربيه','vehicles'],['عربيات','vehicles'],['سياره','vehicles'],['سيارات','vehicles'],
  ['كار','vehicles'],['اوتوبيس','vehicles'],['ميكروباص','vehicles'],['ليموزين','vehicles'],
  ['موتوسيكل','vehicles'],['تروسيكل','vehicles'],
  ['يخت','marine'],['لانش','marine'],['جت سكي','marine'],['قارب','marine'],['كاياك','marine'],
  ['شقه','properties-residential'],['شقق','properties-residential'],['سكن','properties-residential'],
  ['فيلا','properties-residential'],['فله','properties-residential'],['دوبلكس','properties-residential'],
  ['روف','properties-residential'],['استوديو','properties-residential'],['غرفه','properties-residential'],
  ['apartment','properties-residential'],['flat','properties-residential'],
  ['شاليه','properties-tourism'],['شاليهات','properties-tourism'],['منتجع','properties-tourism'],['chalet','properties-tourism'],
  ['مكتب','workspaces'],['مكاتب','workspaces'],['كوركينج','workspaces'],['ميتنج','workspaces'],['اجتماعات','workspaces'],
  ['قاعه','halls'],['قاعات','halls'],['فرح','weddings'],['افراح','weddings'],['كوشه','weddings'],['زفه','weddings'],
  ['كاميرا','equipment-camera'],['كاميرات','equipment-camera'],['درون','media-drone'],['بروجيكتور','media-projector'],['اضاءه','media-lighting'],
  ['بلايستيشن','recreation-gaming'],['جيم','recreation-gym'],['سكوتر','recreation-scooter'],['دراجه','recreation-bicycles'],
  ['سفاري','tourism-safari'],['غطس','tourism-diving'],['رحله','tourism'],['رحلات','tourism'],
  // 🎉 (17 Jul 2026) قسم كاترينج وإيفنتس — محمد: «ضيف عندنا section خاص بالكاترينج والإيفنتس وإن المارد يرشح»
  ['كاترينج','catering-events'],['كاترنج','catering-events'],['كيترينج','catering-events'],['catering','catering-events'],
  ['بوفيه','catering-events'],['ضيافه','catering-events'],['ايفنت','catering-events'],['إيفنت','catering-events'],
  ['مناسبه','catering-events'],['مناسبات','catering-events'],['حفله','catering-events'],['حفلات','catering-events'],
  ['تورته','catering-desserts'],['تورت','catering-desserts'],['منظم افراح','events-full-planning'],['تنظيم فرح','events-full-planning'],
]

function normAr(s: string): string {
  return (s || '').toLowerCase()
    .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ـ/g, '')
    .replace(/\s+/g, ' ').trim()
}

function normalizePhone(s: string): string {
  return (s || '').replace(/[^0-9]/g, '')
}

function isNoise(s: string): boolean {
  const stripped = (s || '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '')
    .replace(/[.\u06D4،؟?!,;:\-_*~'"()\[\]{}\s]/g, '')
  return stripped.length < 2
}

function periodAr(p: string | null): string {
  switch (p) {
    case 'hourly': return 'ساعة'
    case 'daily': return 'يوم'
    case 'weekly': return 'أسبوع'
    case 'monthly': return 'شهر'
    case 'sale': return 'بيع'
    default: return 'الوحدة'
  }
}

// 🧠 (16 Jul 2026) مذاكرة المشاريع — محمد: «عايزك تكون مذاكر كل المشاريع».
// المارد كان بيعرف كتالوج الإعلانات بس — صفر معلومات عن مشاريع المطورين.
// دلوقتي: قايمة كل المشاريع (كاش 10 دقايق) + تفاصيل بيع كاملة لأقرب 3 للسؤال.
let projCache: { at: number; block: string; names: Array<{ n: string; row: Record<string, unknown> }> } | null = null
async function projectsStudyBlock(text: string): Promise<string> {
  try {
    const n = normAr(text || '')
    const now = Date.now()
    if (!projCache || now - projCache.at > 10 * 60 * 1000) {
      const { data } = await sb().from('property_market_items')
        .select('slug, title, developer, city, district, price_from, price_to, unit_label, payment_plan, delivery_label, note, brochure_url, video_url, booking_enabled, booking_fee')
        .eq('segment', 'developer').eq('status', 'published').eq('is_active', true).eq('embargoed', false)
      if (!data || !data.length) return ''
      const fmtM = (v: number) => v >= 1e6 ? `${(v / 1e6).toFixed(v % 1e6 ? 1 : 0)} مليون` : `${Math.round(v / 1000)} ألف`
      const lines = (data as Array<Record<string, unknown>>).map((p) => {
        const pf = p.price_from as number | null
        const price = pf ? `من ${fmtM(pf)} ج` : 'السعر بالتواصل'
        const loc = [p.city, p.district].filter(Boolean).join('·')
        return `• ${p.title} | ${p.developer || '؟'} | ${loc} | ${price} | ${SITE_URL}/real-estate/projects/${p.slug}`
      })
      projCache = {
        at: now, block: lines.join('\n'),
        names: (data as Array<Record<string, unknown>>).map((p) => ({ n: normAr(`${p.title} ${p.developer || ''}`), row: p })),
      }
    }
    // التفعيل: كلمة عقارية في الرسالة أو اسم مشروع/مطوّر ظهر فيها
    const HINT = /شق|عقار|كمبوند|كومباوند|مشروع|فيل|تاون|دوبلكس|بنتهاوس|شاليه|ساحل|عاصم|تجمع|زايد|اكتوبر|أكتوبر|مستقبل|حكم|سخن|شروق|هليوبوليس|استلام|تقسيط|مقدم|متر|بورص|مطور|وحد|حجز|compound|villa|apartment|zayed|coast/
    const hits = projCache.names.filter(({ n: pn }) =>
      pn.split(/\s+/).some((w) => w.length >= 4 && n.includes(w))
    ).slice(0, 3)
    if (!HINT.test(n) && hits.length === 0) return ''
    let details = ''
    if (hits.length) {
      details = '\n\n— تفاصيل بيع كاملة للمشاريع الأقرب لكلام العميل:\n' + hits.map(({ row: p }) => {
        const pf = p.price_from as number | null, pt = p.price_to as number | null
        return [
          `📌 ${p.title} — ${p.developer || ''} (${[p.city, p.district].filter(Boolean).join(' · ')})`,
          p.unit_label ? `   الوحدات: ${p.unit_label}` : '',
          pf ? `   الأسعار: من ${pf.toLocaleString('en-US')} ج${pt ? ` لـ ${pt.toLocaleString('en-US')} ج` : ''}` : '',
          p.payment_plan ? `   السداد: ${p.payment_plan}` : '',
          p.delivery_label ? `   التسليم: ${p.delivery_label}` : '',
          p.note ? `   تفاصيل: ${String(p.note).slice(0, 380)}` : '',
          p.booking_enabled ? `   ⚡ فيه حجز فوري للوحدات 48 ساعة من صفحة المشروع${p.booking_fee ? ` (رسوم الحجز ${Number(p.booking_fee).toLocaleString('en-US')} ج)` : ''} — بيع بيها!` : '',
          `   اللينك: ${SITE_URL}/real-estate/projects/${p.slug}${p.brochure_url ? ' · فيه بروشور PDF' : ''}${p.video_url ? ' · وفيديو' : ''}`,
        ].filter(Boolean).join('\n')
      }).join('\n')
    }
    return `\n\n=== 🏗️ بورصة عقارات مضمونة — انت مذاكر الـ${projCache.names.length} مشروع دول كويس ===\n` +
      `قواعد البيع: عرّف بالسعر وخطة السداد واللينك من المعلومات دي بالظبط — متخترعش أرقام. ` +
      `اسأل عن الميزانية والمنطقة ورشّح 2-3 مشاريع مناسبة. لو المشروع المطلوب مش هنا: قول بحماس إن الفريق يجيبله كل التفاصيل وسجّل unmet_demand. ` +
      `اقفل دايماً بخطوة واضحة: زيارة/مكالمة (احجز الميعاد) أو اللينك.\n${projCache.block}${details}\n=== نهاية البورصة ===`
  } catch (_e) { return '' }
}

// 🗂️ (16 Jul 2026) طلب الوحدات من المطوّر — بدل رسالة باردة مش هتوصل (برة النافذة)،
// المارد بيطلبها في سياق الرد أول ما المطوّر يكلمه. محمد: «خلي كل مطور يعمل
// ابديت للوحدات المتاحة وتكلفة الحجز».
async function devUnitsNudge(contactPhone: string): Promise<string> {
  try {
    const tail = (contactPhone || '').replace(/\D/g, '').slice(-10)
    if (tail.length < 10) return ''
    const { data: projs } = await sb().from('property_market_items')
      .select('id, title, booking_enabled, source_lead_phone')
      .eq('segment', 'developer').not('source_lead_phone', 'is', null)
    const mine = (projs || []).filter((p: Record<string, unknown>) =>
      String(p.source_lead_phone || '').replace(/\D/g, '').slice(-10) === tail)
    if (!mine.length) return ''
    const ids = mine.map((p: Record<string, unknown>) => p.id)
    const { count } = await sb().from('project_units')
      .select('id', { count: 'exact', head: true }).in('project_id', ids)
    if ((count || 0) > 0) return ''   // عنده وحدات متسجلة خلاص — مفيش داعي
    const names = mine.map((p: Record<string, unknown>) => p.title).join(' · ')
    return `\n\n🗂️ DEVELOPER UNITS NUDGE: المتكلم ده مطوّر معروف عندنا — مشاريعه: ${names}. ` +
      `مفيش وحدات متسجلة لمشاريعه، وإحنا مفعّلين خدمة «حجز الوحدة من الماستر بلان 48 ساعة عبر مضمونة». ` +
      `لو سياق الرد مناسب (مش بتقفل موضوع تاني مهم)، اطلب منه في نهاية ردك وبلطف: ` +
      `(1) يبعتلك قايمة الوحدات المتاحة (كود الوحدة · النوع · المساحة · السعر) وإنت هتظبطها، ` +
      `(2) ولو حابب يفعّل الحجز الفوري يقولك تكلفة الحجز وهل بتتخصم من المقدم — ` +
      `أو يظبط كل ده بنفسه من ${SITE_URL}/my-projects. ` +
      `⛔ لو طلبت ده قبل كده في HISTORY متكررهوش خالص.`
  } catch (_e) { return '' }
}

async function fetchCatalogForText(text: string): Promise<Array<Record<string, unknown>>> {
  try {
    const n = normAr(text)
    let slug: string | null = null
    for (const [kw, s] of CATALOG_SYNONYMS) { if (n.includes(kw)) { slug = s; break } }
    const { data, error } = await sb().rpc('search_listings_catalog', {
      p_query: text, p_category_slug: slug, p_city: null, p_limit: 4
    })
    if (error || !Array.isArray(data)) return []
    return data as Array<Record<string, unknown>>
  } catch (_e) { return [] }
}

function buildCatalogBlock(listings: Array<Record<string, unknown>>): string {
  if (!listings.length) return ''
  const lines = listings.map((l, i) => {
    const price = l.price ? `${l.price} ${(l.currency as string) || 'EGP'}/${periodAr(l.period as string | null)}` : 'السعر بالتواصل'
    const loc = [l.city, l.district].filter(Boolean).join(' - ')
    return `${i + 1}. ${l.title}${loc ? ` (${loc})` : ''} — ${price}\n   ${l.url}`
  }).join('\n')
  return `\n\n=== منتجات حقيقية متاحة دلوقتي ===\nلو العميل بيدور على حاجة واللي تحت مناسب ليه، اعرض عليه 1-3 منها بالسعر واللينك بالظبط داخل نفس الرد. متخترعش لينكات ولا أسعار.\n${lines}\n=== نهاية المنتجات ===`
}

function enforceBrandName(text: string): string {
  if (!text) return text
  let out = text
    .replace(/مدمونة/g, 'مضمونة').replace(/مدمونه/g, 'مضمونة')
    .replace(/مظمونة/g, 'مضمونة').replace(/مظمونه/g, 'مضمونة')
    .replace(/مذمونة/g, 'مضمونة').replace(/متمونة/g, 'مضمونة')
    .replace(/Madmoonah?/gi, 'Madmona')
    .replace(/\/list-your-asset/g, '/add-listing').replace(/\/supplier\/register/g, '/add-listing')
    .replace(/\/auth\/signup\?role=supplier/g, '/add-listing').replace(/\/auth\/signup/g, '/add-listing')
  for (const slug of CATEGORY_SLUGS) {
    const re1 = new RegExp(`/categories/${slug}(?![a-z\\-])`, 'g')
    const re2 = new RegExp(`/marketplace/${slug}(?![a-z\\-])`, 'g')
    out = out.replace(re1, `/marketplace?category=${slug}`)
    out = out.replace(re2, `/marketplace?category=${slug}`)
  }
  return out
}

const sb = () => createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

let cachedKey: string | null = null
async function getAnthropicKey(): Promise<string> {
  if (cachedKey) return cachedKey
  const { data } = await sb().rpc('get_anthropic_key')
  if (!data) throw new Error('No Anthropic key')
  cachedKey = data as string
  return cachedKey
}

async function getCfg(key: string, fallback: string): Promise<string> {
  try {
    const { data } = await sb().from('whatsapp_config').select('value').eq('key', key).maybeSingle()
    return (data as { value?: string } | null)?.value || fallback
  } catch (_e) { return fallback }
}

async function getVerifyToken(): Promise<string> {
  const { data } = await sb().from('whatsapp_config').select('value').eq('key','verify_token').single()
  return (data as { value: string } | null)?.value ?? ''
}

async function getMetaCreds(): Promise<{ phone_id: string; token: string }> {
  const { data } = await sb().from('whatsapp_config').select('key, value').in('key', ['phone_number_id','access_token'])
  const m = Object.fromEntries((data || []).map((r: { key: string; value: string }) => [r.key, r.value]))
  return { phone_id: m.phone_number_id, token: m.access_token }
}

// 🆕 (13 Jul 2026) دعم الجروبات — لو `to` هو group_id بنبعت recipient_type:'group'.
// قبل كده كان بيبعت individual دايماً، فالرد على رسالة جروب كان بيروح للشخص في الخاص
// (أو يفشل) بدل ما ينزل في الجروب نفسه.
async function sendWhatsAppText(to: string, body: string, isGroup = false): Promise<{ wa_id?: string; error?: string }> {
  const { phone_id, token } = await getMetaCreds()
  const finalBody = enforceBrandName(body)
  const r = await fetch(`https://graph.facebook.com/v21.0/${phone_id}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: isGroup ? 'group' : 'individual',
      to,
      type: 'text',
      text: { body: finalBody, preview_url: true },
    })
  })
  const data = await r.json()
  if (!r.ok) return { error: data?.error?.message || `HTTP ${r.status}` }
  return { wa_id: data?.messages?.[0]?.id }
}

// 🔐 INBOUND REVERSE-OTP — match a MADxxxxx code the user sent us, confirm their phone
async function handleInboundVerification(fullPhone: string, fromPhone: string, text: string, convId: string): Promise<boolean> {
  const m = (text || '').toUpperCase().match(/MAD[A-Z0-9]{5}/)
  if (!m) return false
  const code = m[0]
  const { data, error } = await sb().rpc('wa_confirm_inbound_verification', { p_code: code, p_sender_phone: fullPhone })
  if (error) { console.error('[inbound-verifier] rpc error:', error); return false }
  const res = (data || null) as { success?: boolean; error?: string; purpose?: string } | null
  if (!res) return false
  if (res.error === 'no_pending_code') return false  // not one of ours / already used — let normal flow handle it
  let reply: string
  if (res.success) {
    // 🔑 (16 Jul 2026) app_login = فلو الدخول الموحّد — الصفحة بتعمل poll وبتدخّله لوحدها
    reply = res.purpose === 'app_login'
      ? '✅ تمام يا باشا! ارجع لصفحة مضمونة المفتوحة عندك — هتلاقي نفسك دخلت لوحدك 🧞\nمعاملاتك مضمونة 💚'
      : '✅ تم تأكيد رقمك بنجاح في مضمونة.\nترجع للموقع وتكمّل عادي — معاملاتك مضمونة.'
  } else if (res.error === 'expired') {
    reply = '⏰ كود التأكيد ده انتهت صلاحيته. ارجع للموقع واطلب كود جديد وابعته تاني.'
  } else if (res.error === 'phone_mismatch') {
    reply = '⚠️ الرقم اللي بتبعت منه مختلف عن الرقم اللي سجّلته على الموقع. ابعت الكود من نفس الرقم اللي كتبته.'
  } else {
    reply = 'حصلت مشكلة في تأكيد الرقم. ارجع للموقع واطلب كود تأكيد جديد.'
  }
  const sendResult = await sendWhatsAppText(fromPhone, reply)
  await sb().from('whatsapp_messages').insert({
    conversation_id: convId, direction: 'outbound', wa_message_id: sendResult.wa_id,
    body: reply, message_type: 'text', status: sendResult.error ? 'failed' : 'sent',
    status_updated_at: new Date().toISOString(), ai_generated: false, agent_name: 'inbound-verifier',
    error_message: sendResult.error, metadata: { code, verify_result: res }
  })
  await sb().from('whatsapp_conversations').update({
    last_outbound_at: new Date().toISOString(), last_message_direction: 'outbound'
  }).eq('id', convId)
  return true
}

// 🔗 (16 Jul 2026) لينكات ممغنطة — أي لينك مضمونة في رد المارد بيتغلف بتوكن
// يدخّل صاحب الرقم تلقائي لما يفتحه (/l/<token>). السبب: أوردرات اتلغت عشان
// الناس مش مسجلة دخول. في الجروبات مفيش تغليف — اللينك هناك لكل الناس.
async function wrapMagicLinks(reply: string, fullPhone: string, isGroup: boolean): Promise<string> {
  if (isGroup || !reply) return reply
  const re = /(https?:\/\/)?(www\.)?madmonacairo\.com(\/[^\s"'«»()\]]*)?/g
  const matches = [...reply.matchAll(re)]
  if (!matches.length) return reply
  let out = reply
  const seen = new Map<string, string>()
  for (const m of matches) {
    let orig = m[0]
    const tm = orig.match(/[.,،!؟:؛]+$/)
    if (tm) orig = orig.slice(0, -tm[0].length)
    const path = orig.replace(/^(https?:\/\/)?(www\.)?madmonacairo\.com/, '') || '/'
    if (path.startsWith('/admin') || path.startsWith('/l/')) continue
    let wrapped = seen.get(orig)
    if (!wrapped) {
      const { data, error } = await sb().from('wa_login_tokens')
        .insert({ phone: fullPhone, next_path: path })
        .select('token').single()
      if (error || !data?.token) { console.error('[magic-wrap] insert error:', error); continue }
      wrapped = `${SITE_URL}/l/${data.token}`
      seen.set(orig, wrapped)
    }
    out = out.split(orig).join(wrapped)
  }
  return out
}

// —— 🎙️ TTS: Arabic voice via Groq (Orpheus) — best-effort ——
function cleanForSpeech(s: string): string {
  return (s || '')
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '')
    .replace(/[#*_~`>\[\]]/g, '')
    .replace(/madmonacairo\.com[^\s]*/gi, 'موقع مضمونة')
    .replace(/\s+/g, ' ').trim().slice(0, 380)
}

async function ttsArabic(text: string): Promise<{ b64: string; mime: string } | null> {
  try {
    const key = await getCfg('groq_api_key', '')
    if (!key) return null
    const model = await getCfg('tts_model', 'canopylabs/orpheus-arabic-saudi')
    const voice = await getCfg('tts_voice', 'fahad')
    const format = await getCfg('tts_format', 'mp3')
    const speech = cleanForSpeech(text)
    if (speech.length < 5) return null
    const r = await fetch('https://api.groq.com/openai/v1/audio/speech', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, voice, input: speech, response_format: format })
    })
    if (!r.ok) { console.error('[tts] error:', (await r.text()).slice(0, 200)); return null }
    const buf = new Uint8Array(await r.arrayBuffer())
    if (buf.length < 500) return null
    let bin = ''
    const CHUNK = 0x8000
    for (let i = 0; i < buf.length; i += CHUNK) bin += String.fromCharCode(...buf.subarray(i, i + CHUNK))
    return { b64: btoa(bin), mime: format === 'wav' ? 'audio/wav' : format === 'ogg' ? 'audio/ogg' : 'audio/mpeg' }
  } catch (e) { console.error('[tts] exception:', e); return null }
}

async function sendWhatsAppVoice(to: string, b64: string, mime: string): Promise<{ wa_id?: string; error?: string }> {
  try {
    const { phone_id, token } = await getMetaCreds()
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
    const ext = mime.includes('ogg') ? 'ogg' : mime.includes('wav') ? 'wav' : 'mp3'
    const form = new FormData()
    form.append('messaging_product', 'whatsapp')
    form.append('type', mime)
    form.append('file', new Blob([bytes], { type: mime }), `reply.${ext}`)
    const up = await fetch(`https://graph.facebook.com/v21.0/${phone_id}/media`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: form
    })
    const upD = await up.json()
    if (!up.ok || !upD?.id) return { error: upD?.error?.message || `media upload HTTP ${up.status}` }
    const r = await fetch(`https://graph.facebook.com/v21.0/${phone_id}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'audio', audio: { id: upD.id } })
    })
    const d = await r.json()
    if (!r.ok) return { error: d?.error?.message || `HTTP ${r.status}` }
    return { wa_id: d?.messages?.[0]?.id }
  } catch (e) { return { error: String(e).slice(0, 150) } }
}

async function fetchWAMedia(mediaId: string, maxBytes = 8 * 1024 * 1024): Promise<{ b64: string; mime: string } | null> {
  try {
    const { token } = await getMetaCreds()
    const metaR = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, { headers: { 'Authorization': `Bearer ${token}` } })
    const meta = await metaR.json()
    if (!metaR.ok || !meta?.url) return null
    const fileR = await fetch(meta.url, { headers: { 'Authorization': `Bearer ${token}` } })
    if (!fileR.ok) return null
    const buf = new Uint8Array(await fileR.arrayBuffer())
    if (buf.length > maxBytes) return null
    let bin = ''
    const CHUNK = 0x8000
    for (let i = 0; i < buf.length; i += CHUNK) bin += String.fromCharCode(...buf.subarray(i, i + CHUNK))
    return { b64: btoa(bin), mime: meta.mime_type || 'application/octet-stream' }
  } catch (_e) { return null }
}

// 🆕 (4 Aug 2026) Sender-scoped path: `wa-inbound/{phoneLast8}/{YYYYMMDD}/{filename}`.
// Was flat `wa-inbound/{timestamp}-{id}.{ext}` — every supplier's photos in one bucket.
// A photo scraper for supplier A could accidentally link to supplier B's listing.
// Real bug (Aug 4): Talda listing (مستقبل سيتي) got HDP's coastal-tower photos as primary.
// Now: each sender's uploads live under their own folder, grouped by day, so intake
// pipelines can only pull photos scoped to the actual sender.
// Existing files at old flat paths keep working (public URLs unchanged) — this only
// affects NEW uploads. See wa-inbound-photo-mismatch.md in project memory.
async function persistInboundImage(
  b64: string, mime: string, waMsgId: string, fromPhone: string,
): Promise<string | null> {
  try {
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
    const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg'
    const phone8 = (fromPhone || '').replace(/\D/g, '').slice(-8) || 'unknown'
    const day = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const safeId = waMsgId.slice(-10).replace(/[^\w]/g, '')
    const path = `wa-inbound/${phone8}/${day}/${Date.now()}-${safeId}.${ext}`
    const { error } = await sb().storage.from('content-images').upload(path, bytes, { contentType: mime, upsert: true })
    if (error) return null
    const { data } = sb().storage.from('content-images').getPublicUrl(path)
    return data.publicUrl
  } catch (_e) { return null }
}

// 🆕 (12 Jul 2026) حفظ الملفات الواردة (بروشورات PDF من المطورين).
// قبل كده الـdocument كان بيتساب من غير ما يتحفظ — البروشورات كانت بتضيع خالص.
//
// ⚠️ مهم: مبنعدّيش على base64 هنا زي الصور. البروشورات الديجيتال بتوصل 30–45 ميجا،
// والـbase64 بيكبّر الحجم 33% وبيبني string عملاق → الإيدج فانكشن بتقع من الميموري.
// فبنحمّل الـbytes وندفعها للستوريدج على طول.
// 🐛 (15 Jul 2026) كان 45MB — وده اللي ضيّع «RITZ New Zayed Brochure.pdf» (64MB)!
// مكنش عطل عشوائي: الملف كبير → `too big` → null → ضياع نهائي.
// بكت project-media سقفه 60MB، وسقف المشروع العام 50MB — فأي حاجة فوق 50 مش هتترفع
// أصلاً. بنرفض بدري وننبّه بدل ما نضيّع في صمت، والأدمن بياخد تنبيه من مسار الفشل.
const DOC_MAX_BYTES = 48 * 1024 * 1024

async function fetchAndStoreDocument(
  mediaId: string, waMsgId: string, fromPhone: string, filename?: string,
): Promise<{ url: string; size: number } | null> {
  try {
    const { token } = await getMetaCreds()

    const metaR = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    const meta = await metaR.json()
    if (!metaR.ok || !meta?.url) {
      console.error('[doc] meta fetch failed', metaR.status, meta?.error?.message)
      return null
    }

    const fileR = await fetch(meta.url, { headers: { 'Authorization': `Bearer ${token}` } })
    if (!fileR.ok) { console.error('[doc] file fetch failed', fileR.status); return null }

    const bytes = new Uint8Array(await fileR.arrayBuffer())
    if (bytes.length > DOC_MAX_BYTES) {
      // 🐛 (15 Jul 2026) ده اللي ضيّع بروشور RITZ (64MB). التنبيه لازم يقول الحجم
      // عشان نعرف إنها مشكلة حجم مش عطل — ووقتها نضغط الملف بدل ما نحتار.
      const mb = (bytes.length / 1048576).toFixed(1)
      console.error('[doc] TOO BIG:', mb, 'MB >', (DOC_MAX_BYTES / 1048576).toFixed(0), 'MB —', filename)
      try {
        const alertTo = await getCfg('admin_alert_phone', '')
        if (alertTo) {
          await sendWhatsAppText(alertTo,
            `⚠️ ملف كبير اترفض!\n\nالملف: ${filename || 'ملف'}\nالحجم: ${mb} ميجا (الحد ${(DOC_MAX_BYTES / 1048576).toFixed(0)})\n\nاطلب نسخة أخف، أو اضغطه يدوي وارفعه.`)
        }
      } catch (_e) { /* التنبيه فشل — مش هنوقف */ }
      return null
    }

    const mime = meta.mime_type || 'application/octet-stream'
    const safeName = (filename || 'file')
      .replace(/[^\w.\-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'file'
    // 🆕 (4 Aug 2026) Sender-scoped path (matches persistInboundImage above).
    const phone8 = (fromPhone || '').replace(/\D/g, '').slice(-8) || 'unknown'
    const day = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const path = `wa-inbound/${phone8}/${day}/${Date.now()}-${waMsgId.slice(-8).replace(/[^\w]/g, '')}-${safeName}`

    const { error } = await sb().storage.from('project-media')
      .upload(path, bytes, { contentType: mime, upsert: true })
    if (error) { console.error('[doc] upload failed:', error.message); return null }

    const { data } = sb().storage.from('project-media').getPublicUrl(path)
    return { url: data.publicUrl, size: bytes.length }
  } catch (e) {
    console.error('[doc] error:', String(e).slice(0, 200))
    return null
  }
}

async function transcribeAudio(b64: string, mime: string): Promise<string | null> {
  try {
    const key = await getCfg('groq_api_key', '')
    if (!key) return null
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
    const ext = mime.includes('ogg') ? 'ogg' : mime.includes('mp4') ? 'm4a' : mime.includes('mpeg') ? 'mp3' : 'ogg'
    const form = new FormData()
    form.append('file', new Blob([bytes], { type: mime }), `voice.${ext}`)
    form.append('model', 'whisper-large-v3')
    form.append('language', 'ar')
    const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST', headers: { 'Authorization': `Bearer ${key}` }, body: form
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok || !d?.text) return null
    return String(d.text).trim() || null
  } catch (_e) { return null }
}

function extFromMime(mime: string): string {
  if (/mpeg|mp3/i.test(mime)) return 'mp3'
  if (/mp4|m4a|aac/i.test(mime)) return 'm4a'
  if (/ogg|opus/i.test(mime)) return 'ogg'
  if (/wav/i.test(mime)) return 'wav'
  return 'mp3'
}

async function handleAdminMusicIntake(convId: string, fromPhone: string, mediaId: string, suggestedName: string): Promise<void> {
  const media = await fetchWAMedia(mediaId, 25 * 1024 * 1024)
  if (!media) {
    await sendWhatsAppText(fromPhone, '❌ معرفتش أنزل التراك (أكبر من 25MB أو اللينك انتهى) — جرب تاني أو اضغطه أصغر.')
    return
  }
  const bytes = Uint8Array.from(atob(media.b64), c => c.charCodeAt(0))
  const ext = extFromMime(media.mime)
  const cleanName = (suggestedName || '').replace(/\.[a-z0-9]{2,4}$/i, '').trim() || `تراك ${new Date().toISOString().slice(5, 16).replace('T', ' ')}`
  const safePath = `tracks/${Date.now()}-${cleanName.replace(/[^\w\u0600-\u06FF-]+/g, '_').slice(0, 60)}.${ext}`
  const { error: upErr } = await sb().storage.from('music').upload(safePath, bytes, { contentType: media.mime, upsert: true })
  if (upErr) {
    await sendWhatsAppText(fromPhone, '❌ مشكلة في تخزين التراك: ' + upErr.message.slice(0, 120))
    return
  }
  const { data: urlData } = sb().storage.from('music').getPublicUrl(safePath)
  await sb().from('music_library').insert({
    name: cleanName, storage_path: safePath, public_url: urlData.publicUrl, mime: media.mime, source: 'whatsapp_admin'
  })
  const { count } = await sb().from('music_library').select('id', { count: 'exact', head: true })
  const confirm = `🎵 اتسجل في المكتبة: «${cleanName}» (${(bytes.length / 1048576).toFixed(1)}MB)\nإجمالي التراكات: ${count ?? '—'}\n\nعشان تركبه على آخر ريل جاهز اكتب:\nركب ${cleanName}\nوعشان تشوف المكتبة اكتب: المزيكا`
  const res = await sendWhatsAppText(fromPhone, confirm)
  await sb().from('whatsapp_messages').insert({
    conversation_id: convId, direction: 'outbound', wa_message_id: res.wa_id,
    body: confirm, message_type: 'text', status: res.error ? 'failed' : 'sent',
    status_updated_at: new Date().toISOString(), ai_generated: false, agent_name: 'music-intake',
    metadata: { track: cleanName, path: safePath }
  })
}

async function handleAdminComposeCommand(convId: string, fromPhone: string, rawText: string): Promise<boolean> {
  const listM = rawText.match(/^(المزيكا|الموسيقى|التراكات)\s*$/u)
  if (listM) {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/reel-composer`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'list' })
    })
    const d = await r.json().catch(() => ({ tracks: [] }))
    const tracks = (d.tracks || []) as Array<any>
    const msg = tracks.length
      ? `🎵 مكتبة المزيكا (${tracks.length}):\n` + tracks.slice(0, 15).map((t: any, i: number) => `${i + 1}. ${t.name}${t.times_used ? ` (اتستخدم ${t.times_used})` : ''}`).join('\n') + `\n\nعشان تركب تراك: ركب <الاسم>`
      : 'المكتبة فاضية — ابعت أي ملف MP3 من Epidemic وأنا هسجله على طول 🎵'
    const res = await sendWhatsAppText(fromPhone, msg)
    await sb().from('whatsapp_messages').insert({
      conversation_id: convId, direction: 'outbound', wa_message_id: res.wa_id, body: msg,
      message_type: 'text', status: res.error ? 'failed' : 'sent', status_updated_at: new Date().toISOString(),
      ai_generated: false, agent_name: 'music-intake'
    })
    return true
  }
  const m = rawText.match(/^ركّ?ب\s+(.+)$/u)
  if (!m) return false
  const track = m[1].replace(/\s*على\s*(آخر|اخر)?\s*(ال)?ريل\s*$/u, '').trim()
  const r = await fetch(`${SUPABASE_URL}/functions/v1/reel-composer`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'compose_latest', track })
  })
  const d = await r.json().catch(() => ({ ok: false, error: 'compose call failed' }))
  const msg = d.ok
    ? `✅ اتركبت «${d.track}» على الريل واتحدث في reel_scripts — النشر الجاي لـ Metricool هياخد النسخة بالمزيكا 🎬\n${d.composed_url}`
    : `❌ معرفتش أركب: ${d.error || ''}${d.hint ? '\n💡 ' + d.hint : ''}`
  const res = await sendWhatsAppText(fromPhone, msg)
  await sb().from('whatsapp_messages').insert({
    conversation_id: convId, direction: 'outbound', wa_message_id: res.wa_id, body: msg,
    message_type: 'text', status: res.error ? 'failed' : 'sent', status_updated_at: new Date().toISOString(),
    ai_generated: false, agent_name: 'music-intake', metadata: { track, ok: !!d.ok }
  })
  return true
}

async function handleRestaurantReply(
  fullPhone: string, fromPhone: string, text: string, convId: string,
): Promise<boolean> {
  const cleaned = (text || '').trim()
  const m = cleaned.match(/^(قبول|تعديل|رفض|قبل|أقبل|اقبل|ارفض|إرفض|عدّل|عدل)(?:\s+([A-Za-z0-9_-]{4,}))?\s*$/u)
  if (!m) return false
  let command: 'قبول' | 'تعديل' | 'رفض'
  if (/^(قبول|قبل|أقبل|اقبل)$/u.test(m[1])) command = 'قبول'
  else if (/^(تعديل|عدّل|عدل)$/u.test(m[1])) command = 'تعديل'
  else command = 'رفض'
  const explicitRef = m[2] || null
  const normIncoming = normalizePhone(fullPhone)

  const { data: queueRows } = await sb()
    .from('whatsapp_outbound_queue')
    .select('id, recipient_phone, metadata, status, created_at')
    .eq('campaign', 'restaurant_order_notify')
    .gte('created_at', new Date(Date.now() - 48 * 3600 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(50)
  const candidates = (queueRows || []) as Array<any>
  const phoneMatches = candidates.filter((q: any) => {
    const recipientNorm = normalizePhone(q.recipient_phone || '')
    if (!recipientNorm || !normIncoming) return false
    return recipientNorm === normIncoming
      || recipientNorm.endsWith(normIncoming.slice(-10))
      || normIncoming.endsWith(recipientNorm.slice(-10))
  })
  if (phoneMatches.length === 0) return false

  let match: any = null
  if (explicitRef) match = phoneMatches.find((q: any) => q?.metadata?.reference_code === explicitRef)
  if (!match) match = phoneMatches.find((q: any) => !q?.metadata?.replied)
  if (!match) return false
  const orderId = match.metadata?.order_id as string | undefined
  const ref = match.metadata?.reference_code as string | undefined
  if (!orderId) return false
  const { data: order } = await sb().from('marketplace_orders')
    .select('id, status, guest_phone, guest_name, total_amount, primary_listing_id')
    .eq('id', orderId).single()
  if (!order) return false

  const commissionLine = await getCfg('commission_line_restaurants', 'عمولة مضمونة الموحدة = 10٪ من قيمة الطلب.')
  let restaurantAck = ''
  let customerMsg = ''
  if (command === 'قبول') {
    await sb().from('marketplace_orders').update({
      status: 'accepted', accepted_at: new Date().toISOString(), updated_at: new Date().toISOString()
    }).eq('id', orderId)
    restaurantAck = `تم — اتسجل تأكيدك على الطلب ${ref}. بنبلّغ العميل دلوقتي.\n${commissionLine}`
    customerMsg = `طلبك على مضمونة تأكّد ✅\nمرجع: ${ref}\nالمطعم وافق على الطلب وبيحضّره.\n\nشكراً لاستخدامك مضمونة — معاملاتك مضمونة.`
  } else if (command === 'رفض') {
    await sb().from('marketplace_orders').update({
      status: 'cancelled', cancelled_at: new Date().toISOString(),
      cancellation_reason: 'restaurant_rejected', updated_at: new Date().toISOString()
    }).eq('id', orderId)
    restaurantAck = `تم — تم إلغاء الطلب ${ref} وإبلاغ العميل.`
    customerMsg = `نأسف 🙏\nمرجع طلبك: ${ref}\nالمطعم مش قادر يقبل الطلب ده دلوقتي. لو الدفع تم خصمه، هيتم استرداده كامل خلال 24-48 ساعة.\nمضمونة بتغطّيك.`
  } else {
    await sb().from('marketplace_orders').update({
      supplier_notes: 'awaiting_price_edit', updated_at: new Date().toISOString()
    }).eq('id', orderId)
    restaurantAck = `تمام — ابعت لنا الأسعار الجديدة بالشكل ده، كل صنف في سطر:\n<اسم الصنف> = <السعر بالجنيه>\nمثال:\nبيتزا مارجريتا = 195`
    customerMsg = `المطعم بيراجع طلبك ومحتاج يعدّل سعر بسيط — مرجع ${ref}. هنبعتلك الأسعار النهائية للتأكيد في خلال لحظات.`
  }
  const newMeta = { ...(match.metadata || {}), replied: command, replied_at: new Date().toISOString() }
  await sb().from('whatsapp_outbound_queue').update({ metadata: newMeta }).eq('id', match.id)
  try { await sendWhatsAppText(fromPhone, restaurantAck) } catch (_e) {}
  if (order.guest_phone) {
    await sb().from('whatsapp_outbound_queue').insert({
      recipient_phone: order.guest_phone,
      recipient_name: order.guest_name || 'عميل مضمونة',
      message: customerMsg, campaign: 'restaurant_order_customer_notify',
      agent_name: 'restaurant-order-notify', status: 'pending',
      metadata: {
        order_id: orderId, listing_id: order.primary_listing_id,
        reference_code: ref, command, triggered_by: 'restaurant-reply-parser'
      }
    })
  }
  await sb().from('whatsapp_messages').insert({
    conversation_id: convId, direction: 'outbound',
    body: restaurantAck, message_type: 'text', status: 'sent',
    status_updated_at: new Date().toISOString(),
    ai_generated: false, agent_name: 'restaurant-reply-parser',
    metadata: { command, ref, order_id: orderId }
  })
  return true
}

function findItemMatch(priceName: string, items: Array<any>): any {
  const norm = normAr(priceName)
  if (!norm) return null
  let m = items.find(it => normAr(it.name_snapshot) === norm)
  if (m) return m
  const subs = items.filter(it => {
    const i = normAr(it.name_snapshot)
    return i.includes(norm) || norm.includes(i)
  })
  if (subs.length === 1) return subs[0]
  if (subs.length > 1) {
    return subs.sort((a, b) => {
      const ia = normAr(a.name_snapshot), ib = normAr(b.name_snapshot)
      return Math.abs(ia.length - norm.length) - Math.abs(ib.length - norm.length)
    })[0]
  }
  return null
}

async function handleRestaurantPriceEdit(
  fullPhone: string, fromPhone: string, text: string, convId: string,
): Promise<boolean> {
  const rawLines = (text || '').split(/[\n\r\u060c؍,؛;]+/).map(l => l.trim()).filter(Boolean)
  if (rawLines.length === 0) return false
  const parsed: Array<{ name: string; price: number }> = []
  for (const line of rawLines) {
    if (/^(قبول|تعديل|رفض|إلغاء|الغاء)\b/u.test(line)) continue
    let m = line.match(/^(.+?)\s*[=:]\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:ج|جنيه|EGP|le)?\s*$/i)
    if (!m) m = line.match(/^(.+?)\s+([0-9]+(?:[.,][0-9]+)?)\s*(?:ج|جنيه|EGP|le)?\s*$/i)
    if (m && m[1].length >= 2 && Number(m[2].replace(',', '.')) > 0) {
      parsed.push({ name: m[1].trim(), price: Number(m[2].replace(',', '.')) })
    }
  }
  if (parsed.length === 0) return false

  const normIncoming = normalizePhone(fullPhone)
  const { data: queueRows } = await sb()
    .from('whatsapp_outbound_queue')
    .select('id, recipient_phone, metadata')
    .eq('campaign', 'restaurant_order_notify')
    .gte('created_at', new Date(Date.now() - 48 * 3600 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(50)
  const matches = (queueRows || []).filter((q: any) => {
    if (q?.metadata?.replied !== 'تعديل') return false
    if (q?.metadata?.price_edit_completed) return false
    const recipientNorm = normalizePhone(q.recipient_phone || '')
    return recipientNorm.endsWith(normIncoming.slice(-10)) || normIncoming.endsWith(recipientNorm.slice(-10))
  })
  if (matches.length === 0) return false
  const queueRow = matches[0] as any
  const orderId = queueRow.metadata?.order_id
  const ref = queueRow.metadata?.reference_code
  if (!orderId) return false
  const { data: order } = await sb().from('marketplace_orders').select('*').eq('id', orderId).single()
  if (!order || order.supplier_notes !== 'awaiting_price_edit') return false
  const { data: items } = await sb().from('marketplace_order_items')
    .select('id, name_snapshot, unit_price, quantity, line_total')
    .eq('order_id', orderId)
  if (!items || items.length === 0) return false

  type Upd = { id: string; old_price: number; new_price: number; quantity: number; new_line_total: number; name: string }
  const updates: Upd[] = []
  for (const pl of parsed) {
    const it = findItemMatch(pl.name, items as any)
    if (!it) continue
    if (updates.some(u => u.id === it.id)) continue
    const newLine = pl.price * Number(it.quantity)
    updates.push({
      id: it.id, old_price: Number(it.unit_price), new_price: pl.price,
      quantity: Number(it.quantity), new_line_total: newLine, name: it.name_snapshot
    })
  }
  if (updates.length === 0) return false
  for (const u of updates) {
    await sb().from('marketplace_order_items').update({
      unit_price: u.new_price, line_total: u.new_line_total
    }).eq('id', u.id)
  }
  const { data: refreshed } = await sb().from('marketplace_order_items')
    .select('line_total').eq('order_id', orderId)
  const newSubtotal = (refreshed || []).reduce((s: number, it: any) => s + Number(it.line_total || 0), 0)
  const newTotal = newSubtotal + Number(order.delivery_fee || 0) + Number(order.tax_amount || 0)
  await sb().from('marketplace_orders').update({
    subtotal_amount: newSubtotal, total_amount: newTotal, supplier_payout: newTotal,
    status: 'accepted', accepted_at: new Date().toISOString(),
    supplier_notes: 'price_edited', updated_at: new Date().toISOString()
  }).eq('id', orderId)
  await sb().from('whatsapp_outbound_queue').update({
    metadata: {
      ...(queueRow.metadata || {}),
      price_edit_completed: true,
      price_edit_completed_at: new Date().toISOString(),
      price_edit_updates: updates.map(u => ({ name: u.name, old: u.old_price, new: u.new_price }))
    }
  }).eq('id', queueRow.id)
  const commissionLine = await getCfg('commission_line_restaurants', 'عمولة مضمونة الموحدة = 10٪ من قيمة الطلب.')
  const updatesTxt = updates.map(u => `• ${u.name}: ${u.old_price} ← ${u.new_price} ج`).join('\n')
  const restaurantAck =
    `تم تحديث الأسعار وتأكيد الطلب ${ref} ✅\n${updatesTxt}\n` +
    `الإجمالي الجديد: ${newTotal.toFixed(0)} ج\nبنبلّغ العميل دلوقتي. ${commissionLine}`
  try { await sendWhatsAppText(fromPhone, restaurantAck) } catch (_e) {}
  if (order.guest_phone) {
    const customerUpd = updates.map(u => `• ${u.name}: ${u.old_price} → ${u.new_price} ج`).join('\n')
    const customerMsg =
      `تحديث على طلبك من مضمونة 📝\nمرجع: ${ref}\n` +
      `المطعم عدّل أسعار بعض الأصناف:\n${customerUpd}\n` +
      `الإجمالي الجديد: ${newTotal.toFixed(0)} ج\n` +
      `الطلب اتأكّد وبيتم تجهيزه. لو الأسعار الجديدة مش مناسبة، رد بـ: إلغاء ${ref}.`
    await sb().from('whatsapp_outbound_queue').insert({
      recipient_phone: order.guest_phone,
      recipient_name: order.guest_name || 'عميل مضمونة',
      message: customerMsg,
      campaign: 'restaurant_order_customer_notify',
      agent_name: 'restaurant-reply-parser',
      status: 'pending',
      metadata: {
        order_id: orderId, listing_id: order.primary_listing_id,
        reference_code: ref, command: 'price_edited',
        triggered_by: 'restaurant-price-edit-parser',
        new_total: newTotal,
        updates: updates.map(u => ({ name: u.name, old: u.old_price, new: u.new_price }))
      }
    })
  }
  await sb().from('whatsapp_messages').insert({
    conversation_id: convId, direction: 'outbound',
    body: restaurantAck, message_type: 'text', status: 'sent',
    status_updated_at: new Date().toISOString(),
    ai_generated: false, agent_name: 'restaurant-price-edit-parser',
    metadata: { ref, order_id: orderId, updates }
  })
  return true
}

async function handleCustomerCancellation(
  fullPhone: string, fromPhone: string, text: string, convId: string,
): Promise<boolean> {
  const cleaned = (text || '').trim()
  const m = cleaned.match(/^(إلغاء|الغاء|cancel)\s+([A-Za-z0-9_-]{4,})\s*$/iu)
  if (!m) return false
  const ref = m[2]
  const normIncoming = normalizePhone(fullPhone)

  const { data: queueRows } = await sb()
    .from('whatsapp_outbound_queue')
    .select('id, recipient_phone, metadata')
    .eq('campaign', 'restaurant_order_customer_notify')
    .gte('created_at', new Date(Date.now() - 48 * 3600 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(50)
  const matches = (queueRows || []).filter((q: any) => {
    if (q?.metadata?.reference_code !== ref) return false
    const recipientNorm = normalizePhone(q.recipient_phone || '')
    return recipientNorm.endsWith(normIncoming.slice(-10)) || normIncoming.endsWith(recipientNorm.slice(-10))
  })
  if (matches.length === 0) return false
  const queueRow = matches[0] as any
  const orderId = queueRow.metadata?.order_id
  if (!orderId) return false

  const { data: order } = await sb().from('marketplace_orders')
    .select('id, status, guest_phone, guest_name, total_amount, primary_listing_id, supplier_id, listings(contact_phone)')
    .eq('id', orderId).single()
  if (!order) return false
  if (['completed','delivered','cancelled','refunded'].includes(order.status)) return false

  await sb().from('marketplace_orders').update({
    status: 'cancelled', cancelled_at: new Date().toISOString(),
    cancellation_reason: 'customer_rejected_price_edit',
    updated_at: new Date().toISOString()
  }).eq('id', orderId)

  await sb().from('whatsapp_outbound_queue').update({
    metadata: {
      ...(queueRow.metadata || {}),
      customer_cancelled: true,
      customer_cancelled_at: new Date().toISOString()
    }
  }).eq('id', queueRow.id)

  const customerAck =
    `تم إلغاء طلبك ${ref} — مفيش أي خصومات عليك ✅\nلو الدفع تم خصمه، هيتم استرداده كامل خلال 24-48 ساعة.\nمضمونة بتغطّيك — معاملاتك مضمونة.`
  try { await sendWhatsAppText(fromPhone, customerAck) } catch (_e) {}

  const restaurantPhone = (order as any)?.listings?.contact_phone
  if (restaurantPhone) {
    const restaurantNotice =
      `تنبيه — العميل رفض الأسعار الجديدة للطلب ${ref} وتم إلغاء الطلب.\nماتجهّزش أي حاجة.`
    await sb().from('whatsapp_outbound_queue').insert({
      recipient_phone: restaurantPhone,
      recipient_name: 'المطعم',
      message: restaurantNotice,
      campaign: 'restaurant_order_notify',
      agent_name: 'customer-cancellation-parser',
      status: 'pending',
      metadata: {
        order_id: orderId, listing_id: order.primary_listing_id,
        reference_code: ref, command: 'customer_cancelled', triggered_by: 'customer-cancellation-parser'
      }
    })
  }

  await sb().from('whatsapp_messages').insert({
    conversation_id: convId, direction: 'outbound',
    body: customerAck, message_type: 'text', status: 'sent',
    status_updated_at: new Date().toISOString(),
    ai_generated: false, agent_name: 'customer-cancellation-parser',
    metadata: { ref, order_id: orderId, action: 'cancelled' }
  })
  return true
}

async function handleMediaAck(convId: string, fromPhone: string, myCreatedAt: string, msgType: string): Promise<void> {
  try {
    const { data: conv } = await sb().from('whatsapp_conversations')
      .select('agent_name, contact_type').eq('id', convId).single()
    const owner = (conv as { agent_name?: string } | null)?.agent_name || ''
    const contactType = (conv as { contact_type?: string } | null)?.contact_type || ''
    if (owner && owner !== 'inbound-responder') return
    await new Promise(resolve => setTimeout(resolve, 5000))
    const { data: laterMsgs } = await sb().from('whatsapp_messages').select('id')
      .eq('conversation_id', convId).eq('direction', 'inbound')
      .gt('created_at', myCreatedAt).limit(1)
    if (laterMsgs && laterMsgs.length > 0) return
    const since = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const { data: recentAck } = await sb().from('whatsapp_messages').select('id')
      .eq('conversation_id', convId).eq('agent_name', 'media-ack')
      .gte('created_at', since).limit(1)
    if (recentAck && recentAck.length > 0) return
    let ack: string
    if (msgType === 'audio') {
      ack = 'وصلتنا الرسالة الصوتية 🎙️\nعشان نخدمك أسرع دلوقتي، اكتبلنا طلبك في رسالة وإحنا معاك فوراً.\nمضمونة — معاملاتك مضمونة ✅'
    } else if (contactType === 'restaurant_supplier') {
      ack = 'وصلتنا الصورة 📎\nلو دي أسعار أو منيو معدّل، ابعتهولنا نصياً بالشكل ده:\nاسم الصنف = السعر'
    } else if (msgType === 'document') {
      ack = 'وصلنا الملف 📎\nعشان نخدمك أسرع، اكتبلنا في رسالة إنت محتاج إيه بالظبط.\nمضمونة — معاملاتك مضمونة ✅'
    } else {
      ack = 'وصلتنا الرسالة 📎\nعشان نخدمك أسرع، اكتبلنا في رسالة إنت محتاج إيه بالظبط.\nمضمونة — معاملاتك مضمونة ✅'
    }
    const sendResult = await sendWhatsAppText(fromPhone, ack)
    await sb().from('whatsapp_messages').insert({
      conversation_id: convId, direction: 'outbound', wa_message_id: sendResult.wa_id,
      body: ack, message_type: 'text', status: sendResult.error ? 'failed' : 'sent',
      status_updated_at: new Date().toISOString(), ai_generated: true, agent_name: 'media-ack',
      error_message: sendResult.error, metadata: { trigger: 'media_inbound', inbound_type: msgType }
    })
    await sb().from('whatsapp_conversations').update({
      last_outbound_at: new Date().toISOString(), last_message_direction: 'outbound'
    }).eq('id', convId)
  } catch (err) { console.error('[media-ack] error:', err) }
}

type ListingDraft = { title?: string; description?: string; category_slug?: string; price_egp?: number | null; period?: string | null } | null
type AIResult = {
  intent: string; lead_type: string; supplier_kind?: 'individual' | 'company' | null;
  category: string | null; reply: string; unmet_demand?: boolean; requested_item?: string | null;
  erp_interest?: boolean
  listing_draft?: ListingDraft
  listing_drafts?: Array<NonNullable<ListingDraft>> | null
  // 🆕 (15 Jul 2026) المارد بقى يحجز مواعيد حقيقي في جدول meetings
  meeting?: { action?: 'book' | 'cancel' | 'none'; at?: string; kind?: string } | null
}

// 📅 بيجيب حقيقة الميعاد من الجدول — ده اللي بيتحط في البرومبت بدل ذاكرة المحادثة
async function meetingContext(phone: string): Promise<string> {
  try {
    const { data } = await sb().rpc('my_meeting', { p_phone: phone })
    const m = data as Record<string, unknown> | null
    if (!m?.ok) return 'حالة الميعاد: مش معروفة.'
    if (m['عنده_ميعاد']) {
      const at = new Date(String(m['متى']))
      const cairo = at.toLocaleString('ar-EG', { timeZone: 'Africa/Cairo', dateStyle: 'full', timeStyle: 'short' })
      const فات = m['فات'] ? ' ⚠️ (الوقت ده فات خلاص — اسأله كان إيه بدل ما تأكّد)' : ''
      return `حالة الميعاد: ✅ عنده ميعاد مؤكّد — ${cairo} (${m['نوع']})${m['مكان'] ? ' في ' + m['مكان'] : ''}.${فات}`
    }
    if (m['آخر_ميعاد']) {
      const at = new Date(String(m['آخر_ميعاد']))
      const cairo = at.toLocaleString('ar-EG', { timeZone: 'Africa/Cairo', dateStyle: 'full', timeStyle: 'short' })
      return `حالة الميعاد: ❌ مفيش ميعاد نشط. آخر ميعاد كان ${cairo} وحالته «${m['حالته']}» — ده خلص، ماتأكّدش عليه تاني.`
    }
    return 'حالة الميعاد: ❌ مفيش أي ميعاد مسجّل — لو حدد وقت، احجزه.'
  } catch (_e) { return 'حالة الميعاد: مش معروفة.' }
}

async function generateReply(
  inboundText: string, contactPhone: string, contactName: string | null,
  adContext: { headline?: string; body?: string } | null,
  fullHistory: string, isFirstReply: boolean,
  image?: { b64: string; mime: string } | null,
  meetingCtx?: string          // 🆕 (15 Jul 2026) حقيقة الميعاد من جدول meetings
): Promise<AIResult> {
  const apiKey = await getAnthropicKey()
  const adInfo = adContext?.headline ? `\nIMPORTANT: User came from a Meta ad: "${adContext.headline}"` : ''
  const firstReplyBanner = isFirstReply
    ? `\n\n✨ FIRST REPLY ONLY — open warm and personal (زي ما تكون بترحّب بضيف في بيتك): «أهلاً بيك في مضمونة 💚» then ONE warm line explaining what مضمونة is: «السوق المصري اللي كل معاملة فيه مضمونة — تأجّر، تشتري، تحجز خدمات، وتطلب أكل من ناس موثوقين، وفلوسك محمية لحد ما تستلم». If they look like a SUPPLIER add one line: «والتسجيل والنشر ببلاش، وعمولتنا موحدة 10% على الصفقة الناجحة بس» — and if relevant mention: «ولو حابب تدير شغلك كله من مكان واحد، في نظام إدارة متكامل (CRM+ERP) باشتراك شهري بالاتفاق». Mention AI matching in one clean line. Close with «معاملاتك مضمونة» if natural.`
    : `\n\n⛔ NOT the first reply — NEVER re-greet, NEVER re-introduce the platform, NEVER repeat what you already said in HISTORY.`
  let catalogBlock = ''
  try { catalogBlock = buildCatalogBlock(await fetchCatalogForText(inboundText)) } catch (_e) { catalogBlock = '' }
  // 🧠 مذاكرة المشاريع — بيتفعل مع أي كلام عقاري (الرسالة + آخر حتة من التاريخ)
  let projectsBlock = ''
  try { projectsBlock = await projectsStudyBlock(inboundText + ' ' + fullHistory.slice(-600)) } catch (_e) { projectsBlock = '' }
  // 🗂️ لو المتكلم مطوّر ومشاريعه من غير وحدات — المارد يطلبها في سياق الرد
  let unitsNudge = ''
  try { unitsNudge = await devUnitsNudge(contactPhone) } catch (_e) { unitsNudge = '' }
  const commissionLine = await getCfg('commission_line_restaurants_prompt', 'Commission: UNIFIED 10% for EVERYONE — فرد وشركة نفس النسبة. NEVER mention 0% or free commission or any limited-time offer.')
  // 📅 (15 Jul 2026) قاعدة المواعيد. قبلها كان المارد بيقول «اتسجّل الميعاد» ومفيش
  // جدول أصلاً، فبيفتكر من المحادثة — والمحادثة بتبرد. النتيجة: بعت لإنَس غنيم
  // ٤ رسايل متضاربة في ٢٤ ساعة واعتذر، وبعت تأكيد لناس اتقابلوا خلاص.
  const meetingRule = `\n\n📅📅 MEETINGS — READ THE FACTS, DON'T GUESS 📅📅\n${meetingCtx || 'حالة الميعاد: مفيش ميعاد مسجّل.'}\n` +
    `⛔ NEVER infer a meeting from HISTORY — the history is stale and WRONG. The block above is the ONLY truth.\n` +
    `⛔ NEVER say «اتسجّل الميعاد» / «مستنيينك» / «متشوقين نشوفك» UNLESS the block above shows an active meeting.\n` +
    `⛔ If the block says the meeting is done/past — the meeting ALREADY HAPPENED. NEVER re-confirm it. Ask how it went, or move forward.\n` +
    `✅ TO BOOK/CHANGE: when the customer states a time (بكره الساعة ١٢، الاتنين الجاي، يوم الخميس الصبح...), fill "meeting":\n` +
    `   {"action":"book","at":"<ISO 8601 with +03:00 Cairo offset>","kind":"visit|call|online"}\n` +
    `   Resolve relative words against NOW = ${new Date().toISOString()} (UTC). Cairo is UTC+3.\n` +
    `   Only then may you confirm it — the system saves it for real when you fill this field.\n` +
    `✅ TO CANCEL: {"action":"cancel"}. If no meeting talk at all: omit "meeting" or use {"action":"none"}.\n` +
    `⛔ If you are NOT SURE of the exact time, DON'T fill "meeting" — ask them to confirm the time instead. A wrong booking is worse than asking.`
  const imageRule = image ? `\n\n🖼️ IMAGE ATTACHED: the customer sent a photo — LOOK at it carefully and respond about what you actually SEE (car model/condition, apartment, menu, product...). Mention concrete visual details so they know you really saw it.\n⚡ INSTANT LISTING: if this is a SUPPLIER showing an asset they want to list/sell/rent → BUILD the listing yourself: fill "listing_draft" with a catchy Arabic title (≤60 chars), a professional 2-3 sentence Arabic description based on what you SEE + what they SAID, the best category_slug, price_egp if they mentioned one (else null), and period (hourly|daily|weekly|monthly|sale). In the reply, tell them excitedly that you already prepared their listing and the team will publish it right away — «من غير ما تكتب ولا حرف». If price is missing, ask for it in the same reply.` : ''
  const system = `You are المارد 🧞 (The Genie) — Madmona's official AI assistant on WhatsApp for ${SITE_URL}.\nBrand: مضمونة (with ض). Slogan: "معاملاتك مضمونة". Egyptian Arabic only. Your name is «المارد» — never call yourself bot/assistant/concierge.\n\n🧞 SELF-AWARENESS: if asked who you are / what you can do (مين انت، بتعمل ايه، ايه خدماتك، مساعدة...), introduce yourself proudly in 1 line: «أنا المارد 🧞 — مساعد مضمونة الشخصي، تحت أمرك ٢٤ ساعة» then list your powers briefly:\n١) أسجّلك على المنصة وأجهّز إعلانك بنفسي من الشات — من غير فورمات\n٢) أضيف منتجاتك: ابعتلي قايمة «اسم = سعر» أو صور منتجاتك وأنا أجهزها\n٣) أرشحلك أماكن ومنتجات حقيقية من المنصة على ذوقك وميزانيتك\n٤) أرد على أي سؤال عن مضمونة (عمولة، تسجيل، طلبات، اشتراكات)\n٥) أوصلك بفريق مضمونة لو محتاج حد يكلمك\n\n🏪 PLATFORM KNOWLEDGE (accurate — only claim these): Madmona is Egypt's GUARANTEED marketplace: إيجار · بيع وشراء · خدمات · مطاعم وأكل · كاترينج وتنظيم إيفنتس ومناسبات · بيوتي · أثاث منزلي ومكتبي. الفلوس محمية للطرفين لحد الاستلام. الطلب أونلاين ومنيو المطاعم بأحجام (صغير/وسط/كبير). التسجيل ببلاش من ${SITE_URL}/add-listing (٥ خطوات بسيطة) وفيه رفع Excel يضيف لحد ٢٠٠ صنف أو إعلان مرة واحدة. المورد ليه لوحة تحكم (منيو/منتجات/طلبات) ومزامنة مخزون تلقائية لمشتركي نظام الإدارة. نظام CRM+ERP متكامل باشتراك شهري مدفوع بالاتفاق. عمولة موحدة 10٪ على الصفقة الناجحة بس — التسجيل والعرض ببلاش. برنامج «شير واكسب»: عن كل أكونت جديد بينضم بكود إحالتك بتكسب 100 جنيه رصيد في محفظتك (بشرط الأكونت الجديد يعمل شير لصفحة مضمونة ويبعتلي الإثبات هنا)، والرصيد بيتستخدم كخصم على الطلبات بحد أقصى عمولة مضمونة في الطلب — اللي عايز كوده يبعتلي «كودي». فيه صفحة نتايج كأس العالم لايف: ${SITE_URL}/world-cup (اطلب أكل الماتش من عندنا 😉).\n\n🎯 PERSONALIZATION RULE (18 Jul 2026 — أمر محمد): اعرف مين اللي قدامك الأول وفصّل كلامك على مقاسه. من الهيستوري والاسم وأي بيانات متاحة، حدد: هو تاجر إيه/نشاطه إيه/عميل بيدور على إيه — وخاطبه بلغته وباللي يهمه هو تحديدًا (صاحب مطعم → المنيو والأوردرات · تاجر/معرض → عرض بضاعته ببلاش والمارد يرد على زباينه · مطوّر → البورصة العقارية ومشاريعه · عميل → اللي بيدور عليه). ماتبعتش كلام عام لحد تعرف عنه معلومة تخليه أقرب.\n\n🧠 STUDY-FIRST RULE: Read the FULL history below BEFORE writing. Your single reply must address ALL unanswered points together, in order, in ONE coherent message. Never answer message-by-message. Never repeat yourself.\n\n👤/🏢 SUPPLIER SEPARATION RULE: for supplier_lead, figure out فرد vs شركة. العمولة موحدة 10٪ على الكل — فرد وشركة نفس النسبة (الفرق بس في الحجم/الفروع). Set "supplier_kind".\n\n📝 ONE-TIME-SETUP PITCH (للموردين): «سجّل وتعب معانا مرة واحدة» — register once at ${SITE_URL}/add-listing with EVERY detail (صور، أسعار، مواصفات، مواعيد، عنوان) so customers book directly من غير أسئلة. لو عنده أصناف كتير: اقترح رفع Excel من نفس الصفحة، أو يبعتهملك هنا وإنت تجهزهم.\n\n⚡ MULTI-PRODUCT INTAKE (text): if a SUPPLIER sends a list of products/items in text (lines like «اسم = سعر» or «اسم - سعر» or numbered items), BUILD them yourself: fill "listing_drafts" (array, max 8) — each with catchy Arabic title (≤60 chars), short professional description, best category_slug, price_egp (null if missing), period (hourly|daily|weekly|monthly|sale). Tell them happily you prepared N items and the team will publish right away. If more than 8 items or they mention a big catalog → also point to Excel upload at ${SITE_URL}/add-listing.\n\n🔗 ALWAYS-LINK RULE (17 Jul 2026): EVERY private reply MUST contain exactly ONE contextual madmonacairo.com link — links are auto-wrapped into magic login links that sign the person in with NO password: supplier who just sent products/menu/got listing_drafts → ${SITE_URL}/supplier/dashboard («لوحة تحكمك — هتلاقي فيها منيوك وطلباتك لايف») · new supplier still registering → ${SITE_URL}/add-listing · customer browsing → ${SITE_URL}/marketplace?category=<slug> or the exact listing/project link · project developer → ${SITE_URL}/my-projects. NEVER send a reply with zero links (except group chats). NEVER invent paths not listed here or in the catalog.\n\n🎯 RECOMMEND RULE: if the customer asks for suggestions (رشح، اقترح، فين ألاقي، عايز آكل، محتاج، دلني...), use ONLY the real catalog items below — present 2-3 with name + price + link. NEVER invent listings, prices, or links.\n\n💼 ERP PITCH RULE (نظام الإدارة): Madmona has a FULL business management system (CRM+ERP) — مخزون بيتزامن أوتوماتيك مع متجرك على مضمونة، فواتير وحسابات، مرتبات وحضور موظفين بالـQR، مصروفات ومشاريع، تقارير وأرباح — كله من مكان واحد. It is a PAID monthly subscription (السعر بالاتفاق مع الفريق). ACTIVELY pitch it in ONE line when a supplier: has many products/branches, asks about إدارة/مخزون/حسابات/موظفين/فواتير, or complains about تنظيم شغله. If they show ANY interest in it (عايز أعرف أكتر، بكام، ماشي...) → set "erp_interest": true so the team calls them — and tell them فريق مضمونة هيكلمهم يظبطوا الاشتراك والسعر. NEVER promise a price or say it is free.\n\n🚫🚫 THE #1 RULE — NEVER CLAIM SOMETHING IS SAVED WHEN IT ISN'T 🚫🚫\nYou CANNOT write to the database. You do NOT create projects, listings, or accounts. The team does.\nTherefore you are FORBIDDEN from ever saying (in any wording):\n«اتسجّل» «اتسجل» «اتنزّل» «اتضاف» «البيانات اتسجلت» «الأبديت اتعمل» «الملف اكتمل» «جاهز في البورصة» «نزّلناه» «موجود على المنصة دلوقتي»\n— about ANY project/listing/product the customer just sent you. It is NOT saved. Saying it is a LIE that destroys trust.\n✅ INSTEAD say honestly: «وصلني كل ده وسجّلته عندي ✍️ — فريق مضمونة بيراجعه وهينزل على المنصة، وهقولك أول ما يظهر.»\n✅ You MAY say: «وصل» «شكراً» «تمام» «هنراجعه» «الفريق شايف كل التفاصيل».\n⛔ ARQA incident (13 Jul 2026): a developer sent full data for 3 projects. المارد said «اتسجّل» 6 times. NOTHING was saved. He waited 2 days for an account. NEVER AGAIN.\n\nHARD RULES:\n- Never ask for name/email/personal info via WhatsApp\n- Supplier URLs: ${SITE_URL}/add-listing · Customer URLs: ${SITE_URL}/marketplace?category=<slug>\n- ${commissionLine}\n- Pillars: حماية كاملة · دفع سريع · دعم 24/7\n- NEVER claim the platform existed before May 2026. NEVER "من 2019" or "أكبر منصة".\n- CRM+ERP is a PAID monthly subscription — NEVER say it's free.\n- FULL-COVERAGE RULE: NEVER say a field is unavailable — we can source ANYTHING. If not in catalog: confirm enthusiastically, ask 1-2 clarifying questions, promise team follow-up, set "unmet_demand": true + "requested_item".\n- HUMAN HANDOFF: if they insist on a person (عايز أكلم حد، اتصلوا بيا), confirm warmly فريق مضمونة هيتواصل معاهم قريب — the team sees this conversation.\n- JOB APPLICANTS: hiring/CV messages → intent "job_application", direct to ${SITE_URL}/careers.<<<CACHE_SPLIT>>>${adInfo}${firstReplyBanner}${meetingRule}${imageRule}\n\nCategory slugs (for category): properties|vehicles|workspaces|equipment|media|weddings|tourism|recreation|marine\nlisting_draft category_slug MUST be one of: ${LISTABLE_SLUGS}${catalogBlock}${projectsBlock}${unitsNudge}\n\n=== HISTORY (اقرأها كلها قبل ما ترد) ===\n${fullHistory}\n=== END ===\n\nRespond ONLY with JSON:\n{\"intent\":\"signup_supplier|book_rental|ask_question|job_application|spam_or_other\",\"lead_type\":\"supplier_lead|customer_lead|unknown\",\"supplier_kind\":\"individual|company|null\",\"category\":\"...|null\",\"unmet_demand\":true,\"requested_item\":\"...|null\",\"erp_interest\":false,\"listing_draft\":{\"title\":\"...\",\"description\":\"...\",\"category_slug\":\"...\",\"price_egp\":1234,\"period\":\"daily\"}|null,\"listing_drafts\":[{\"title\":\"...\",\"description\":\"...\",\"category_slug\":\"...\",\"price_egp\":1234,\"period\":\"sale\"}]|null,\"meeting\":{\"action\":\"book|cancel|none\",\"at\":\"2026-07-18T12:00:00+03:00\",\"kind\":\"visit|call|online\"}|null,\"reply\":\"...\"}`
  // 💰 Prompt caching (cost optimization, 27 Jul 2026) — split the big STABLE rulebook
  // into a cached block and the VARIABLE tail (ad/first-reply/meeting/image/catalog/history)
  // into an uncached block. Joining the two block texts reproduces the ORIGINAL prompt
  // byte-for-byte (the marker is stripped), so the Marid's behavior is identical — we just
  // stop paying full input price for the stable prefix on every message (~90% cheaper reads).
  const _sysParts = system.split('<<<CACHE_SPLIT>>>')
  const systemBlocks: Array<Record<string, unknown>> = _sysParts.length === 2
    ? [
        { type: 'text', text: _sysParts[0], cache_control: { type: 'ephemeral', ttl: '1h' } },
        { type: 'text', text: _sysParts[1] },
      ]
    : [{ type: 'text', text: _sysParts.join('') }]
  const userText = `Unanswered inbound message(s) from ${contactPhone}${contactName ? ' (' + contactName + ')' : ''} — reply to ALL of them in ONE message:\n\"${inboundText}\"`
  const userContent: Array<Record<string, unknown>> = []
  if (image) userContent.push({ type: 'image', source: { type: 'base64', media_type: image.mime, data: image.b64 } })
  userContent.push({ type: 'text', text: userText })
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 4000, system: systemBlocks, messages: [{ role: 'user', content: userContent }] })
  })
  const data = await r.json()
  if (!r.ok) throw new Error(`Claude error: ${JSON.stringify(data).slice(0, 200)}`)
  // 📊 usage observability — proves prompt caching is working (cache_read should dominate after warm-up)
  try { const u = data?.usage; if (u) console.log(`[claude-usage] model=${CLAUDE_MODEL} in=${u.input_tokens} cache_write=${u.cache_creation_input_tokens ?? 0} cache_read=${u.cache_read_input_tokens ?? 0} out=${u.output_tokens}`) } catch (_e) { /* best-effort */ }
  const text = data?.content?.[0]?.text || ''
  const cleaned = text.replace(/^```(json)?/i, '').replace(/```$/, '').trim()
  const m = cleaned.match(/\{[\s\S]*\}/)

  // المحاولة الأساسية: JSON سليم
  if (m) {
    try {
      const parsed = JSON.parse(m[0])
      if (parsed.reply && typeof parsed.reply === 'string') parsed.reply = enforceBrandName(parsed.reply)
      if (parsed.supplier_kind === 'null') parsed.supplier_kind = null
      return parsed
    } catch (_e) { /* الرد اتقطع أو JSON مكسور — ننقذ الرد تحت */ }
  }

  // 🛟 إنقاذ: الرد اتقطع (max_tokens) أو JSON مكسور.
  // بدل ما العميل يتساب من غير رد خالص، نستخرج نص الـ reply ونبعته.
  const salvaged = salvageReply(cleaned)
  if (salvaged) {
    return {
      intent: 'ask_question',
      lead_type: 'unknown',
      supplier_kind: null,
      category: null,
      unmet_demand: false,
      requested_item: null,
      erp_interest: false,
      listing_draft: null,
      listing_drafts: null,
      reply: enforceBrandName(salvaged),
    } as AIResult
  }
  throw new Error('parse failed')
}

/** يستخرج قيمة "reply" من JSON مقطوع/مكسور — عشان العميل ميتسابش من غير رد. */
function salvageReply(raw: string): string | null {
  // "reply":"...."  — لحد آخر علامة تنصيص مقفولة أو لآخر النص لو اتقطع
  const i = raw.search(/"reply"\s*:\s*"/)
  if (i === -1) return null
  // امشِ من بعد فتح علامة التنصيص واقرأ لحد القفلة غير الـ escaped
  const start = raw.indexOf('"', raw.indexOf(':', i) + 1) + 1
  let out = ''
  for (let k = start; k < raw.length; k++) {
    const ch = raw[k]
    if (ch === '\\') {
      const nx = raw[k + 1]
      if (nx === 'n') { out += '\n'; k++; continue }
      if (nx === 't') { out += '\t'; k++; continue }
      if (nx === '"') { out += '"'; k++; continue }
      if (nx === '\\') { out += '\\'; k++; continue }
      k++
      continue
    }
    if (ch === '"') break
    out += ch
  }
  out = out.trim()
  return out.length >= 15 ? out : null
}

async function saveInstantListingDraft(
  fullPhone: string, contactName: string | null, convId: string, draft: NonNullable<ListingDraft>, sourceText: string
): Promise<void> {
  try {
    if (!draft.title) return
    const { data: imgs } = await sb().from('whatsapp_messages')
      .select('metadata').eq('conversation_id', convId).eq('direction', 'inbound')
      .not('metadata->>image_url', 'is', null)
      .order('created_at', { ascending: false }).limit(6)
    const imageUrls = ((imgs || []) as Array<any>).map(r => r?.metadata?.image_url).filter(Boolean)
    await sb().from('instant_listing_drafts').insert({
      contact_phone: fullPhone, contact_name: contactName, conversation_id: convId,
      title: String(draft.title).slice(0, 120),
      description: draft.description ? String(draft.description).slice(0, 1500) : null,
      category_slug: draft.category_slug || null,
      price_egp: typeof draft.price_egp === 'number' ? draft.price_egp : null,
      period: draft.period || null,
      image_urls: imageUrls,
      source_text: sourceText.slice(0, 800),
      status: 'new'
    })
    const adminPhone = await getCfg('admin_alert_phone', '')
    if (adminPhone) {
      const priceLine = draft.price_egp ? `${draft.price_egp} ج/${periodAr(draft.period || null)}` : 'من غير سعر لسه'
      await sendWhatsAppText(adminPhone.replace(/^\+/, ''),
        `⚡ منتج فوري جديد من الواتساب!\n📋 «${draft.title}»\n🏷️ ${draft.category_slug || '—'} · 💰 ${priceLine}\n📸 ${imageUrls.length} صورة · 📞 ${fullPhone}${contactName ? ' (' + contactName + ')' : ''}\nالمسودة في instant_listing_drafts — جاهزة للمراجعة والنشر.`)
    }
  } catch (err) { console.error('[instant-listing] error:', err) }
}

async function logUnmetDemand(fullPhone: string, contactName: string | null, convId: string, ai: AIResult, combinedText: string): Promise<void> {
  try {
    if (!ai.unmet_demand || !ai.requested_item) return
    await sb().from('customer_demand_requests').insert({
      contact_phone: fullPhone,
      contact_name: contactName,
      requested_item: String(ai.requested_item).slice(0, 300),
      category_guess: ai.category,
      conversation_id: convId,
      source: 'whatsapp',
      status: 'new',
      notes: combinedText.slice(0, 500)
    })
    // 🚨 تنبيه فوري للمالك — أي طلب عميل غير ملبى = فرصة ديل
    try {
      const { data: cfgRows } = await sb().from('whatsapp_config').select('value').eq('key', 'admin_alert_phone').maybeSingle()
      const adminPhone = ((cfgRows as { value?: string } | null)?.value || '201002229982').replace(/^\+/, '')
      await sendWhatsAppText(adminPhone,
        `🎯 طلب عميل جديد (فرصة ديل)!\n📋 ${String(ai.requested_item).slice(0, 200)}\n🏷️ ${ai.category || 'غير محدد'}\n📞 ${fullPhone}${contactName ? ' (' + contactName + ')' : ''}\n\nالطلب اتسجل في قايمة الطلبات — دوّر على مورد واقفل الديل، والعميل مستني.`)
    } catch (_e) { /* alert best-effort */ }
  } catch (err) { console.error('[unmet-demand-log] error:', err) }
}

// 🔥 HOT LEAD — a phone the Marid contacted just replied → alert the owner instantly.
async function alertHotLeadIfMarid(fullPhone: string, contactName: string | null, text: string, convId: string): Promise<void> {
  try {
    const digits = normalizePhone(fullPhone)
    if (!digits || digits.length < 10) return
    const tail = digits.slice(-10)

    // Was this phone contacted by the Marid? (restaurant_leads OR marid outreach_log ≤ 14d)
    let leadId: string | null = null
    let leadName: string | null = null
    const { data: lead } = await sb().from('restaurant_leads')
      .select('id, name, status, phone')
      .in('status', ['contacted', 'replied'])
      .like('phone', `%${tail}`)
      .limit(1).maybeSingle()
    if (lead) { leadId = (lead as { id: string }).id; leadName = (lead as { name?: string }).name || null }
    if (!leadId) {
      const { data: touched } = await sb().from('outreach_log').select('id')
        .eq('agent_name', 'marid-restaurant-agent')
        .like('phone', `%${tail}`)
        .gte('created_at', new Date(Date.now() - 14 * 86400_000).toISOString())
        .limit(1).maybeSingle()
      if (!touched) return
    }

    // Throttle: one hot-lead alert per phone per 24h
    const { data: recentAlert } = await sb().from('marid_notifications').select('id')
      .eq('kind', 'hot_lead').eq('phone', fullPhone)
      .gte('created_at', new Date(Date.now() - 24 * 3600_000).toISOString())
      .limit(1).maybeSingle()
    if (recentAlert) return

    if (leadId) await sb().from('restaurant_leads').update({ status: 'replied' }).eq('id', leadId)

    const title = `🔥 ليد سخن رد على المارد${leadName ? ': ' + leadName : ''}`
    const body = `${contactName ? contactName + ' — ' : ''}${fullPhone}\nقال: «${(text || '').slice(0, 200)}»`
    await sb().from('marid_notifications').insert({
      kind: 'hot_lead', title, body, phone: fullPhone,
      ref_table: leadId ? 'restaurant_leads' : 'outreach_log', ref_id: leadId,
    })

    const adminPhone = await getCfg('admin_alert_phone', '')
    if (adminPhone) {
      await sendWhatsAppText(adminPhone.replace(/^\+/, ''),
        `${title}\n${body}\nكمل المحادثة: madmonacairo.com/admin/wa-review`)
    }
    void convId
  } catch (err) { console.error('[hot-lead-alert] error:', err) }
}

async function logJobApplicant(fullPhone: string, contactName: string | null, combinedText: string): Promise<void> {
  try {
    const { data: existing } = await sb().from('job_applications')
      .select('id').eq('phone', fullPhone).limit(1).maybeSingle()
    if (existing) return
    await sb().from('job_applications').insert({
      full_name: contactName || 'متقدم واتساب',
      phone: fullPhone,
      message: combinedText.slice(0, 500),
      source: 'whatsapp',
      status: 'new'
    })
  } catch (err) { console.error('[job-applicant-log] error:', err) }
}

async function handleVerification(url: URL): Promise<Response> {
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')
  const expected = await getVerifyToken()
  if (mode === 'subscribe' && token === expected && challenge) {
    return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } })
  }
  return new Response('Forbidden', { status: 403 })
}

async function handleInboundMessage(message: Record<string, unknown>, contacts: Array<Record<string, unknown>>): Promise<void> {
  const fromPhone = String(message.from)
  const waMsgId = String(message.id)
  const msgType = String(message.type)

  // 🆕 (13 Jul 2026) رسايل الجروبات — ميتا بتبعت group_id جنب `from` (اللي هو الشخص اللي بعت).
  // قبل كده كنا بنتجاهل group_id تماماً، فالرد كان بيروح للشخص في الخاص بدل الجروب.
  // دلوقتي: بنرد على الـgroup_id نفسه، والمحادثة بتتخزن باسم الجروب.
  const groupId = String(
    (message.group_id as string | undefined) ||
    ((message.context as { group_id?: string } | undefined)?.group_id) || ''
  ).trim()
  const isGroup = groupId.length > 0
  // وجهة الرد: الجروب لو جروب، الشخص لو خاص
  const replyTo = isGroup ? groupId : fromPhone

  // 🔍 DEBUG — نطبع الـpayload الخام لأي رسالة مش خاص عادي، عشان نشوف ميتا بتبعت الجروب إزاي
  // (مفاتيح الجروب ممكن تكون group_id أو جوه context — لازم نتأكد بالعين مش بالتخمين)
  const knownKeys = ['from','id','timestamp','type','text','image','audio','document','video','sticker','context','referral','errors']
  const oddKeys = Object.keys(message).filter(k => !knownKeys.includes(k))
  if (isGroup || oddKeys.length > 0) {
    console.log('[GROUP-DEBUG] isGroup=', isGroup, 'groupId=', groupId, 'oddKeys=', JSON.stringify(oddKeys),
      'raw=', JSON.stringify(message).slice(0, 700))
  }
  let text = (message.text as { body?: string } | undefined)?.body || ''
  const contact = contacts?.find((c: Record<string, unknown>) => c.wa_id === fromPhone)
  const contactName = (contact?.profile as { name?: string } | undefined)?.name ?? null
  const referral = message.referral as Record<string, unknown> | undefined
  const adData = referral ? {
    source_url: referral.source_url as string | undefined,
    source_id: referral.source_id as string | undefined,
    headline: referral.headline as string | undefined,
    body: referral.body as string | undefined,
    ctwa_clid: referral.ctwa_clid as string | undefined,
  } : null

  let isAdminChannel = false
  try {
    const { data: adminCfg } = await sb().from('whatsapp_config').select('value').eq('key', 'admin_alert_phone').maybeSingle()
    const adminPhone = (adminCfg as { value?: string } | null)?.value || ''
    const a = normalizePhone(adminPhone), bph = normalizePhone('+' + fromPhone)
    isAdminChannel = !!(a && bph && (a === bph || a.endsWith(bph.slice(-10)) || bph.endsWith(a.slice(-10))))
  } catch (_e) { isAdminChannel = false }

  let imageData: { b64: string; mime: string } | null = null
  let inboundImageUrl: string | null = null
  let inboundDocUrl: string | null = null   // 🆕 بروشورات PDF من المطورين
  let inboundDocName: string | null = null
  let inboundVideoUrl: string | null = null // 🆕 (15 Jul 2026) فيديوهات المشاريع
  let storedBody = text || `[${msgType}]`
  let voiceFailed = false
  // 🐛 (15 Jul 2026) لو التحميل فشل كان الـmedia_id بيضيع خالص — الـmetadata تفضل {}
  // فمفيش طريقة نعيد المحاولة. كده ضاع 144 ملف (منهم بروشور RITZ). دلوقتي بنخزّنه دايماً.
  let inboundMediaId: string | null = null
  let adminMusicMediaId: string | null = null
  let adminMusicName = ''
  const audMeta = message.audio as { id?: string; voice?: boolean } | undefined
  const docMeta = message.document as { id?: string; filename?: string; mime_type?: string; caption?: string } | undefined
  const vidMeta = message.video as { id?: string; caption?: string; mime_type?: string } | undefined
  // ==== «شير واكسب» — مسارات حتمية قبل الذكاء ====
  if (!isAdminChannel && text) {
    const tnorm = text.trim()
    // (أ) طلب الكود: «كودي» / «كود الاحالة» / «شير واكسب» (والاسم القديم «سوق واكسب» لسه شغال)
    if (/^(كودي|كود الاحاله|كود الإحالة|كود الاحالة|شير واكسب|شير و اكسب|سوق واكسب|سوّق واكسب)$/i.test(tnorm.replace(/[؟!.]/g, '').trim())) {
      try {
        const digits10 = normalizePhone(fromPhone).slice(-10)
        const { data: prof } = await sb().from('profiles').select('id, full_name, phone').like('phone', `%${digits10}`).limit(1).maybeSingle()
        if (!prof) {
          await sendWhatsAppText(fromPhone, 'عشان تاخد كود «شير واكسب» بتاعك، لازم يكون عندك حساب على مضمونة الأول 😄\nسجّل في دقيقة من هنا:\nmadmonacairo.com/add-listing\nوبعدها ابعتلي «كودي» وأنا أجهزهولك فورًا 🧞')
        } else {
          const { data: codeRes } = await sb().rpc('get_or_create_referral_code', { p_owner_profile_id: (prof as { id: string }).id, p_owner_phone: (prof as { phone?: string }).phone || fromPhone, p_owner_type: 'customer' })
          const c = codeRes as { ok?: boolean; code?: string; share_url?: string } | null
          if (c?.code) {
            await sendWhatsAppText(fromPhone,
              `🧞 كود «شير واكسب» بتاعك: *${c.code}*\n\n🔗 لينكك الخاص:\n${c.share_url || 'https://www.madmonacairo.com/?ref=' + c.code}\n\nإزاي تكسب:\n1️⃣ ابعت اللينك لأي حد — أول ما يعمل حساب بيه\n2️⃣ يعمل شير لصفحة مضمونة على فيسبوك ويبعتلي سكرين شوت هنا مع كلمة «شير»\n3️⃣ بعد المراجعة (خلال 48 ساعة): *+100 جنيه رصيد* في محفظتك عن كل أكونت 💰\n\nالرصيد بتستخدمه خصم على طلباتك (بحد أقصى عمولة مضمونة في الطلب). الحد الأقصى 20 إحالة في الشهر.\nالتفاصيل: madmonacairo.com/terms\n— معاملاتك مضمونة 💚`)
          } else {
            await sendWhatsAppText(fromPhone, 'حصلت مشكلة صغيرة في تجهيز الكود — جرب تاني بعد دقيقة 🙏')
          }
        }
        return
      } catch (e) { console.error('[referral-code-path] error:', e) }
    }
  }

  const isAdminMusic = isAdminChannel && (
    (msgType === 'audio' && audMeta?.id && audMeta?.voice === false) ||
    (msgType === 'document' && docMeta?.id && /audio|mpeg|mp3|m4a|aac|wav|ogg/i.test(String(docMeta?.mime_type || '')))
  )
  if (isAdminMusic) {
    adminMusicMediaId = (msgType === 'audio' ? audMeta?.id : docMeta?.id) || null
    adminMusicName = docMeta?.filename || docMeta?.caption || ''
    storedBody = `[🎵 تراك جديد]${adminMusicName ? ' ' + adminMusicName : ''}`
  } else if (msgType === 'image') {
    const img = message.image as { id?: string; caption?: string } | undefined
    if (img?.id) inboundMediaId = img.id
    if (img?.id) imageData = await fetchWAMedia(img.id)
    if (imageData) inboundImageUrl = await persistInboundImage(imageData.b64, imageData.mime, waMsgId, fromPhone)
    const caption = img?.caption || ''
    text = caption || '(العميل بعت صورة من غير تعليق — بص على الصورة ورد على محتواها)'
    storedBody = `[صورة]${caption ? ' ' + caption : ''}`
    if (!imageData) { text = ''; storedBody = '[صورة]' }
  } else if (msgType === 'video' && vidMeta?.id) {
    // 🆕 (15 Jul 2026) الفيديو — كان **مالوش فرع خالص**! أي فيديو حد يبعته كان بيعدّي
    // من غير ما يتحفظ. صفر فيديو في الداتابيز من أول يوم، والفيديو أحسن حاجة بتبيع مشروع.
    // بنستخدم نفس مسار المستندات (bytes → storage مباشرة، من غير base64 عشان الميموري).
    inboundMediaId = vidMeta.id
    const vname = `video-${waMsgId.slice(-8).replace(/[^\w]/g, '')}.mp4`
    const stored = await fetchAndStoreDocument(vidMeta.id, waMsgId, fromPhone, vname)
    if (stored) inboundVideoUrl = stored.url
    else console.error('[video] ❌ FAILED TO SAVE from', fromPhone, 'media_id', vidMeta.id)
    const vcap = vidMeta.caption || ''
    storedBody = `[فيديو]${vcap ? ' ' + vcap : ''}`
    text = inboundVideoUrl
      ? `(العميل بعت فيديو${vcap ? ' وكتب: ' + vcap : ''}. الفيديو اتحفظ عندنا. لو ده فيديو مشروع، اشكره وأكدله إننا هنعرضه على صفحة مشروعه في بورصة مضمونة.)`
      : `(العميل بعت فيديو${vcap ? ' وكتب: ' + vcap : ''} بس مقدرناش نحمّله. اعتذرله واطلب منه يبعته تاني.)`
  } else if (msgType === 'document' && docMeta?.id) {
    // 🆕 (12 Jul 2026) البروشورات (PDF) — قبل كده كانت بتتساب من غير حفظ وتضيع.
    // 🐛 (13 Jul 2026) وكانت بتضيع بصمت لو التحميل فشل — الأمين للتوريدات بعت ٦ ملفات
    // وكلهم ضاعوا، والمارد قاله "البيانات اتسجلت". دلوقتي بنسجّل الفشل وننبّه الأدمن.
    inboundDocName = docMeta.filename || 'ملف'
    inboundMediaId = docMeta.id
    const stored = await fetchAndStoreDocument(docMeta.id, waMsgId, fromPhone, docMeta.filename)
    if (stored) inboundDocUrl = stored.url
    else {
      console.error('[doc] ❌ FAILED TO SAVE:', inboundDocName, 'from', fromPhone, 'media_id', docMeta.id)
      // ننبّه الأدمن — ملف ضاع يعني عميل ممكن يضيع
      try {
        const alertTo = await getCfg('admin_alert_phone', '')
        if (alertTo) {
          await sendWhatsAppText(
            alertTo,
            `⚠️ ملف ضاع!\n\nمن: ${contactName || fromPhone}\nالملف: ${inboundDocName}\n\nمقدرناش نحمّله — كلّم العميل يبعته تاني.`,
          )
        }
      } catch (_e) { /* التنبيه فشل — مش هنوقف المعالجة */ }
    }
    const cap = docMeta.caption || ''
    storedBody = `[ملف: ${inboundDocName}]${cap ? ' ' + cap : ''}`
    text = inboundDocUrl
      ? `(العميل بعت ملف اسمه «${inboundDocName}»${cap ? ' وكتب: ' + cap : ''}. الملف اتحفظ عندنا. لو ده بروشور مشروع، اشكره وأكدله إننا هنرفعه على صفحة مشروعه في بورصة مضمونة.)`
      : `(العميل بعت ملف اسمه «${inboundDocName}» بس مقدرناش نحمّله${cap ? '. وكتب: ' + cap : ''}. اعتذرله واطلب منه يبعته تاني أو يرفعه من madmonacairo.com/add-project)`
  } else if (msgType === 'audio') {
    // 🛡️ (17 Jul 2026) صفر فويسات كانت متسجلة في الداتابيز — أي exception هنا
    // كان بيسقط الرسالة كلها قبل التسجيل. دلوقتي أي فشل = voiceFailed بس،
    // والرسالة بتتسجل وبيتبعت acknowledgement. «أي فويس لازم يتفرغ ويترد عليه» — محمد.
    try {
      if (audMeta?.id) {
        const media = await fetchWAMedia(audMeta.id)
        if (media) {
          const transcript = await transcribeAudio(media.b64, media.mime)
          if (transcript) { text = transcript; storedBody = `🎙️ ${transcript}` }
          else { voiceFailed = true; storedBody = '[رسالة صوتية]' }
        } else { voiceFailed = true; storedBody = '[رسالة صوتية]' }
      } else { voiceFailed = true; storedBody = '[رسالة صوتية]' }
    } catch (audioErr) {
      console.error('[audio-intake] hard failure:', audioErr)
      voiceFailed = true; storedBody = '[رسالة صوتية]'
    }
  }

  // 🆕 الجروب بياخد محادثة خاصة بيه (مفتاحها group_id) عشان السياق ميتلغبطش مع الخاص
  const fullPhone = isGroup ? `group:${groupId}` : '+' + fromPhone
  const { data: existing } = await sb().from('whatsapp_conversations').select('id, ad_id, contact_type, metadata, status').eq('contact_phone', fullPhone).maybeSingle()
  let convId: string
  let isNewConversation = false
  // 🔇 (18 Jul 2026 — أمر محمد بعد لوب بوت «ويليز») محادثة paused = المارد ساكت فيها
  // نهائيًا: بنسجّل الوارد بس من غير أي رد، ومبنرجعهاش active. الأدمن يفكها يدويًا.
  const isPausedConv = !isNewConversation && (existing as { status?: string } | null)?.status === 'paused'
  if (existing) {
    convId = (existing as { id: string }).id
    const updates: Record<string, unknown> = {
      last_message_at: new Date().toISOString(), last_message_direction: 'inbound',
      last_inbound_at: new Date().toISOString(), contact_name: contactName ?? undefined,
      ...(isPausedConv ? {} : { status: 'active' })
    }
    if (adData && !(existing as { ad_id?: string }).ad_id) {
      updates.ad_id = adData.source_id; updates.ad_headline = adData.headline; updates.ctwa_clid = adData.ctwa_clid
    }
    await sb().from('whatsapp_conversations').update(updates).eq('id', convId)
  } else {
    isNewConversation = true
    const { data: newConv } = await sb().from('whatsapp_conversations').insert({
      contact_phone: fullPhone, contact_name: contactName, contact_type: 'unknown',
      agent_name: 'inbound-responder', status: 'active',
      last_message_at: new Date().toISOString(), last_message_direction: 'inbound',
      last_inbound_at: new Date().toISOString(), message_count: 0,
      ad_id: adData?.source_id, ad_headline: adData?.headline, ctwa_clid: adData?.ctwa_clid,
    }).select('id').single()
    convId = (newConv as { id: string }).id
  }
  const inboundMeta: Record<string, unknown> = adData ? { has_ad_referral: true } : {}
  if (inboundMediaId) inboundMeta.wa_media_id = inboundMediaId
  // علّم الفشل صراحةً — عشان جوب الإعادة يلاقيه بسهولة
  if (inboundMediaId && !inboundImageUrl && !inboundDocUrl && !inboundVideoUrl) inboundMeta.media_download_failed = true
  if (inboundImageUrl) inboundMeta.image_url = inboundImageUrl
  if (inboundVideoUrl) inboundMeta.video_url = inboundVideoUrl   // 🆕 فيديو المشروع
  if (inboundDocUrl) {                       // 🆕 بروشور/ملف — بيتحفظ ويتسجّل هنا
    inboundMeta.document_url = inboundDocUrl
    inboundMeta.document_name = inboundDocName
  }

  // ==== «سوّق واكسب» (ب): استقبال إثبات الشير — بعد تجهيز الصورة ====
  if (!isAdminChannel && inboundImageUrl) {
    try {
      const tnorm = (text || '').trim()
      const hasShareWord = /شير|مشاركه|مشاركة|share/i.test(tnorm)
      const digits10 = normalizePhone(fromPhone).slice(-10)
      const { data: pend } = await sb().from('referrals').select('id, status')
        .eq('status', 'pending').like('referred_phone', `%${digits10}`)
        .order('created_at', { ascending: true }).limit(1).maybeSingle()
      // يدخل المسار فقط لو: كلمة شير موجودة، أو عنده إحالة معلقة والرسالة صورة من غير كلام منتجات
      if (pend && (hasShareWord || tnorm.length < 15)) {
        const r = pend as { id: string }
        await sb().from('referrals').update({ status: 'share_submitted', metadata: { share_proof_url: inboundImageUrl, submitted_at: new Date().toISOString() } }).eq('id', r.id)
        const { data: cfgRow } = await sb().from('whatsapp_config').select('value').eq('key', 'admin_alert_phone').maybeSingle()
        const adminPhone = ((cfgRow as { value?: string } | null)?.value || '201002229982').replace(/^\+/, '')
        await sendWhatsAppText(adminPhone, `🖼️ إثبات شير جديد وصل!\n📞 من: ${fullPhone}\n🔗 الصورة: ${inboundImageUrl}\n\nللاعتماد رد بـ:\nاعتماد شير ${normalizePhone(fromPhone)}\nللرفض:\nرفض شير ${normalizePhone(fromPhone)}`)
        await sendWhatsAppText(fromPhone, 'وصل إثبات المشاركة 🙌\nجاري المراجعة خلال 48 ساعة، وأول ما يتعتمد — الـ 100 جنيه بينزلوا في محفظة اللي دعاك (وهيوصله إشعار).\nشكرًا إنك جزء من مضمونة 💚')
        return
      }
    } catch (e) { console.error('[share-proof-path] error:', e) }
  }
  const { data: insertedMsg } = await sb().from('whatsapp_messages').insert({
    conversation_id: convId, direction: 'inbound', wa_message_id: waMsgId,
    body: storedBody, message_type: msgType === 'text' ? 'text' : msgType,
    status: 'delivered', status_updated_at: new Date().toISOString(),
    ai_generated: false, referral: adData, metadata: inboundMeta
  }).select('id, created_at').single()
  const myCreatedAt = (insertedMsg as { id: string; created_at: string } | null)?.created_at
  const myMsgId = (insertedMsg as { id: string; created_at: string } | null)?.id
  if (!myCreatedAt || !myMsgId) return

  // 🔇 محادثة موقوفة (paused): الوارد اتسجّل فوق — ومفيش أي رد ولا معالجة.
  if (isPausedConv && !isAdminChannel) {
    console.log('[paused-conv] skipping reply for', fullPhone)
    return
  }

  if (isAdminChannel) {
    try {
      if (adminMusicMediaId) {
        await handleAdminMusicIntake(convId, fromPhone, adminMusicMediaId, adminMusicName)
        return
      }
      if (text) {
        // 📋 (17 Jul 2026) «أي تعديل أو أوردر اتبعت في الشات ده يتحفظ ويتعمم» — محمد.
        // كل نص من الأدمن بيتسجل في admin_directives قبل أي معالجة، فمفيش أمر بيضيع
        // حتى لو التنفيذ فشل — الفريق يراجع الجدول ويعمم القواعد الجديدة.
        try {
          await sb().from('admin_directives').insert({
            source_phone: fromPhone, directive: text,
            message_type: storedBody.startsWith('🎙️') ? 'voice' : 'text',
          })
        } catch (dirErr) { console.error('[admin-directives] log error:', dirErr) }
        // 🔐 (17 Jul 2026) محمد بيبعت من رقم الأدمن نفسه — كود الدخول MADxxxxx
        // كان بيتبلع في admin-command («كود تتبع؟») قبل ما يوصل للفاحص. الأكواد الأول.
        if (/MAD[A-Z0-9]{5}/i.test(text)) {
          try {
            const verified = await handleInboundVerification(fullPhone, fromPhone, text, convId)
            if (verified) return
          } catch (err) { console.error('[inbound-verifier:admin] error:', err) }
        }
        const composed = await handleAdminComposeCommand(convId, fromPhone, text.trim())
        if (composed) return
        await fetch(`${SUPABASE_URL}/functions/v1/admin-command`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-relay-key': 'mdmn-probe-8f3a2c91e7d44b06' },
          body: JSON.stringify({ phone: fromPhone, conversation_id: convId, text })
        }).catch((err) => console.error('[admin-command] dispatch error:', err))
        return
      }
      if (msgType === 'audio' && voiceFailed) {
        await sendWhatsAppText(fromPhone, '🎙️ وصلت الرسالة الصوتية بس معرفتش أفرّغها — جرب تاني أو اكتب الأمر.')
      }
      return
    } catch (err) { console.error('[admin-channel] error:', err); return }
  }

  // 🆕 (12 Jul 2026) لو الملف اتحفظ بنجاح، سيبه يعدّي للمارد يرد عليه رد حقيقي
  // (زمان كل document كان بياخد رسالة جاهزة ويقف — فالبروشورات كانت بتضيع).
  const docHandled = msgType === 'document' && !!inboundDocUrl
  // 🐛 (15 Jul 2026) `msgType === 'video'` كان مكتوب هنا صراحةً → كل فيديو بياخد رد
  // جاهز ويقف، فمبيوصلش للمارد ولا بيتحفظ. ده سبب إن الداتابيز فيها صفر فيديو.
  const vidHandled = msgType === 'video' && !!inboundVideoUrl

  if ((msgType === 'audio' && voiceFailed) || (msgType === 'image' && !imageData && !text) ||
      (msgType === 'document' && !docHandled) || (msgType === 'video' && !vidHandled) ||
      (msgType !== 'text' && msgType !== 'image' && msgType !== 'audio' && msgType !== 'document' && msgType !== 'video' && !text)) {
    if (['image', 'document', 'video', 'audio'].includes(msgType)) {
      await handleMediaAck(convId, fromPhone, myCreatedAt, msgType)
    }
    return
  }
  if (!text) return

  // 🔥 HOT LEAD ALERT — marid-contacted lead replied → ping the owner (never blocks the flow)
  try { await alertHotLeadIfMarid(fullPhone, contactName, text, convId) } catch (_e) { /* non-fatal */ }

  // 🔐 INBOUND REVERSE-OTP — did they send a MADxxxxx confirmation code? Handle first.
  try {
    const verified = await handleInboundVerification(fullPhone, fromPhone, text, convId)
    if (verified) return
  } catch (err) { console.error('[inbound-verifier] error:', err) }

  try {
    const handled = await handleRestaurantReply(fullPhone, fromPhone, text, convId)
    if (handled) {
      await sb().from('whatsapp_conversations').update({
        contact_type: 'restaurant_supplier', last_outbound_at: new Date().toISOString()
      }).eq('id', convId)
      return
    }
  } catch (err) { console.error('[restaurant-reply-parser] error:', err) }

  try {
    const handled = await handleRestaurantPriceEdit(fullPhone, fromPhone, text, convId)
    if (handled) {
      await sb().from('whatsapp_conversations').update({
        contact_type: 'restaurant_supplier', last_outbound_at: new Date().toISOString()
      }).eq('id', convId)
      return
    }
  } catch (err) { console.error('[restaurant-price-edit-parser] error:', err) }

  try {
    const handled = await handleCustomerCancellation(fullPhone, fromPhone, text, convId)
    if (handled) {
      await sb().from('whatsapp_conversations').update({ last_outbound_at: new Date().toISOString() }).eq('id', convId)
      return
    }
  } catch (err) { console.error('[customer-cancellation-parser] error:', err) }

  await new Promise(resolve => setTimeout(resolve, DEBOUNCE_MS))

  const { data: laterMsgs } = await sb().from('whatsapp_messages').select('id')
    .eq('conversation_id', convId).eq('direction', 'inbound')
    .gt('created_at', myCreatedAt).limit(1)
  if (laterMsgs && laterMsgs.length > 0) return

  const { data: laterOut } = await sb().from('whatsapp_messages').select('id')
    .eq('conversation_id', convId).eq('direction', 'outbound')
    .gt('created_at', myCreatedAt).limit(1)
  if (laterOut && laterOut.length > 0) return

  const { error: claimErr } = await sb().from('wa_reply_claims').insert({
    conversation_id: convId, last_inbound_id: myMsgId, claimed_by: 'inbound-responder'
  })
  if (claimErr) return

  const { data: lastOutRow } = await sb().from('whatsapp_messages').select('created_at')
    .eq('conversation_id', convId).eq('direction', 'outbound')
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  const sinceTs = (lastOutRow as { created_at?: string } | null)?.created_at || new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  const { data: unanswered } = await sb().from('whatsapp_messages').select('id, body')
    .eq('conversation_id', convId).eq('direction', 'inbound')
    .gt('created_at', sinceTs).order('created_at', { ascending: true }).limit(MAX_BATCH)
  const inbounds = (unanswered || []) as Array<{ id: string; body: string }>
  const combinedText = inbounds.map(m => m.body).filter(Boolean).join('\n---\n')
  if (!combinedText) return

  // 🔁🛑 (18 Jul 2026 — قاعدة محمد بعد لوب «بوت ويليز») كاشف اللوب:
  // أول ما المارد يحس إن المحادثة لوب — يوقف الإرسال فورًا (paused) ويبلغ الأدمن.
  // الإشارات: (أ) كثافة: ≥12 صادر في آخر ساعة · (ب) 3 من آخر 4 ردود صادرة بنفس
  // البداية · (ج) آخر 3 رسايل واردة متطابقة تقريبًا (بوت بيكرر).
  if (!isAdminChannel) {
    try {
      const hourAgo = new Date(Date.now() - 3600 * 1000).toISOString()
      // ⚠️ (18 Jul — بعد false positives وقّفت الصياد وMezo وشعبان): النصوص بس!
      // رشقات الصور بتتسجل «[صورة]» متطابقة، وmedia-ack بيكرر نفس الرد بالتصميم —
      // فالفحص يستبعد الميديا والبلايس-هولدرز [\...] وأي agent غير inbound-responder.
      const { data: recentOutRaw } = await sb().from('whatsapp_messages').select('body')
        .eq('conversation_id', convId).eq('direction', 'outbound')
        .eq('message_type', 'text').eq('agent_name', 'inbound-responder')
        .gt('created_at', hourAgo).order('created_at', { ascending: false }).limit(15)
      const norm = (s?: string) => (s || '').replace(/\s+/g, ' ').trim().slice(0, 32)
      const isRealText = (s?: string) => { const t = (s || '').trim(); return t.length > 0 && !t.startsWith('[') }
      const recentOut = ((recentOutRaw || []) as Array<{ body?: string }>).filter(m => isRealText(m.body))
      const outPrefixes = recentOut.slice(0, 4).map(m => norm(m.body))
      const dupOut = outPrefixes.length >= 3 && outPrefixes.filter(p => p === outPrefixes[0]).length >= 3
      const { data: recentInRaw } = await sb().from('whatsapp_messages').select('body')
        .eq('conversation_id', convId).eq('direction', 'inbound')
        .eq('message_type', 'text')
        .gt('created_at', hourAgo).order('created_at', { ascending: false }).limit(3)
      const inTexts = ((recentInRaw || []) as Array<{ body?: string }>).filter(m => isRealText(m.body))
      const inPrefixes = inTexts.map(m => norm(m.body))
      const dupIn = inPrefixes.length >= 3 && inPrefixes.every(p => p === inPrefixes[0])
      const flood = recentOut.length >= 12
      if (flood || dupOut || dupIn) {
        await sb().from('whatsapp_conversations').update({ status: 'paused' }).eq('id', convId)
        const reason = flood
          ? `كثافة غير طبيعية: ${recentOut.length} رسالة صادرة في آخر ساعة`
          : dupOut ? 'المارد بيكرر نفس الرد' : 'الطرف التاني بيكرر نفس الرسالة (بوت غالبًا)'
        console.log('[loop-guard] auto-paused', fullPhone, '-', reason)
        try {
          const { data: cfgRow } = await sb().from('whatsapp_config').select('value').eq('key', 'admin_alert_phone').maybeSingle()
          const adminPhone = ((cfgRow as { value?: string } | null)?.value || '201026222337').replace(/^\+/, '')
          await sendWhatsAppText(adminPhone, `🔁🛑 المارد وقّف محادثة لوب أوتوماتيك\n📞 ${fullPhone}${contactName ? `\n👤 ${contactName}` : ''}\n🧭 السبب: ${reason}\n\nالمحادثة بقت paused — مفيش أي رسايل هتتبعت فيها لحد ما تتفك يدويًا.`)
        } catch (_alertErr) { /* التنبيه best-effort */ }
        return
      }
    } catch (loopErr) { console.error('[loop-guard] error:', loopErr) }
  }

  // 🆕 (13 Jul 2026) في الجروبات: المارد بيرد على أي رسالة (طلب محمد).
  // الحماية الوحيدة: ميردش على نفسه (لو رقمنا هو اللي بعت) عشان ميدخلش في لوب.
  if (isGroup) {
    const ourNumber = (await getCfg('display_phone_number', '')).replace(/\D/g, '')
    if (ourNumber && fromPhone.replace(/\D/g, '').endsWith(ourNumber.slice(-10))) {
      console.log('[group] skipped — our own message')
      return
    }
  }

  if (!imageData && inbounds.every(m => isNoise(m.body))) {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { data: recentReply } = await sb().from('whatsapp_messages').select('id')
      .eq('conversation_id', convId).eq('direction', 'outbound')
      .gte('created_at', tenMinAgo).limit(1)
    if (recentReply && recentReply.length > 0) return
  }

  const { data: histRows } = await sb().from('whatsapp_messages').select('direction, body, ai_generated, created_at')
    .eq('conversation_id', convId).order('created_at', { ascending: false }).limit(24)
  const hist = ((histRows || []) as Array<any>).reverse()
  const fullHistory = hist.map((r: any) => {
    const speaker = r.direction === 'inbound' ? 'العميل' : (r.ai_generated ? 'مضمونة(AI)' : 'مضمونة')
    return `${speaker}: ${r.body || ''}`
  }).join('\n')
  const priorOutbounds = hist.filter((r: any) => r.direction === 'outbound').length
  const isFirstReply = priorOutbounds === 0

  try {
    const adContext = adData ? { headline: adData.headline, body: adData.body } : null
    // 📅 حقيقة الميعاد من الجدول — مش من ذاكرة المحادثة (دي بتبرد وبتكذب)
    const meetingCtx = await meetingContext(fullPhone)
    const ai = await generateReply(combinedText, fromPhone, contactName, adContext, fullHistory, isFirstReply, imageData, meetingCtx)

    // 📅 (15 Jul 2026) احجز الميعاد **قبل** ما نبعت الرد. لو الحجز فشل، ماينفعش
    // نأكّد للعميل — ده بالظبط اللي كان بيحصل قبل الجدول: تأكيد على لا شيء.
    if (ai.meeting?.action === 'book' && ai.meeting.at) {
      try {
        const at = new Date(ai.meeting.at)
        if (isNaN(at.getTime())) throw new Error('تاريخ غير صالح: ' + ai.meeting.at)
        const { data: booked } = await sb().rpc('book_meeting', {
          p_phone: fullPhone, p_at: at.toISOString(),
          p_kind: ai.meeting.kind || 'visit', p_name: contactName,
          p_location: await getCfg('office_address', '٧ شارع سليمان عزمي — النزهة، مصر الجديدة'),
          p_conv: convId, p_notes: null,
        })
        const b = booked as { ok?: boolean; error?: string; action?: string } | null
        if (b?.ok) console.log('[meeting]', b.action, fullPhone, at.toISOString())
        else console.error('[meeting] ❌ الحجز فشل:', b?.error, '— الرد بيأكّد على حاجة متسجلتش!')
      } catch (e) { console.error('[meeting] error:', String(e).slice(0, 120)) }
    } else if (ai.meeting?.action === 'cancel') {
      // ⚠️ لا تستخدم normalizePhone هنا — الجدول متخزّن بـmadmona_norm_phone
      // (الاتنين بيختلفوا: القديمة بتقبل أرضي، الجديدة بترفضه) → الإلغاء مش هيلاقي الصف.
      try {
        await sb().rpc('cancel_meeting', { p_phone: fullPhone })
        console.log('[meeting] cancelled', fullPhone)
      } catch (e) { console.error('[meeting] cancel error:', String(e).slice(0, 120)) }
    }

    const { data: lateOut2 } = await sb().from('whatsapp_messages').select('id')
      .eq('conversation_id', convId).eq('direction', 'outbound')
      .gt('created_at', myCreatedAt).limit(1)
    if (lateOut2 && lateOut2.length > 0) return

    if (ai.intent === 'job_application') {
      const sendResult = await sendWhatsAppText(fromPhone, ai.reply)
      await sb().from('whatsapp_messages').insert({
        conversation_id: convId, direction: 'outbound', wa_message_id: sendResult.wa_id,
        body: ai.reply, message_type: 'text', status: sendResult.error ? 'failed' : 'sent',
        status_updated_at: new Date().toISOString(), ai_generated: true, agent_name: 'inbound-responder',
        error_message: sendResult.error,
        metadata: { intent: ai.intent, lead_type: 'job_applicant', reply_to_count: inbounds.length, is_first_reply: isFirstReply }
      })
      await sb().from('whatsapp_conversations').update({
        contact_type: 'job_applicant', first_intent: 'job_application',
        last_outbound_at: new Date().toISOString()
      }).eq('id', convId)
      await logJobApplicant(fullPhone, contactName, combinedText)
      return
    }

    // 🎙️ VOICE-FOR-VOICE: customer sent a voice note → reply with VOICE first, then text (best-effort)
    const wasVoice = storedBody.startsWith('🎙️')
    let voiceSent = false
    if (wasVoice) {
      try {
        const tts = await ttsArabic(ai.reply)
        if (tts) {
          const vRes = await sendWhatsAppVoice(replyTo, tts.b64, tts.mime)
          if (!vRes.error) {
            voiceSent = true
            await sb().from('whatsapp_messages').insert({
              conversation_id: convId, direction: 'outbound', wa_message_id: vRes.wa_id,
              body: '[🎙️ رد صوتي] ' + cleanForSpeech(ai.reply).slice(0, 150), message_type: 'audio',
              status: 'sent', status_updated_at: new Date().toISOString(),
              ai_generated: true, agent_name: 'inbound-responder-voice',
              metadata: { tts: true }
            })
          } else { console.error('[voice-reply] send error:', vRes.error) }
        }
      } catch (e) { console.error('[voice-reply] error:', e) }
    }

    // 🆕 لو الرسالة جت من جروب — الرد بينزل في الجروب نفسه (مش في خاص الشخص)
    // 🔗 غلّف لينكات مضمونة بلينكات ممغنطة تدخّل العميل تلقائي (خاص بس، مش جروبات)
    let finalReply = ai.reply
    try { finalReply = await wrapMagicLinks(ai.reply, fullPhone, isGroup) } catch (e) { console.error('[magic-wrap]', e) }
    const sendResult = await sendWhatsAppText(replyTo, finalReply, isGroup)
    await sb().from('whatsapp_messages').insert({
      conversation_id: convId, direction: 'outbound', wa_message_id: sendResult.wa_id,
      body: finalReply, message_type: 'text', status: sendResult.error ? 'failed' : 'sent',
      status_updated_at: new Date().toISOString(), ai_generated: true, agent_name: 'inbound-responder',
      error_message: sendResult.error,
      metadata: { intent: ai.intent, lead_type: ai.lead_type, supplier_kind: ai.supplier_kind ?? null, category: ai.category, unmet_demand: !!ai.unmet_demand, instant_listing: !!ai.listing_draft, reply_to_count: inbounds.length, had_ad_referral: !!adData, is_first_reply: isFirstReply, had_image: !!imageData, was_voice: wasVoice, voice_reply_sent: voiceSent, is_group: isGroup, group_id: isGroup ? groupId : null }
    })
    if (ai.listing_draft && ai.listing_draft.title && ai.lead_type === 'supplier_lead') {
      await saveInstantListingDraft(fullPhone, contactName, convId, ai.listing_draft, combinedText)
    }
    // ⚡ multi-product intake — supplier sent a text list → save each as an instant draft
    if (Array.isArray(ai.listing_drafts) && ai.lead_type === 'supplier_lead') {
      const singleTitle = ai.listing_draft?.title
      for (const d of ai.listing_drafts.slice(0, 8)) {
        if (!d?.title || d.title === singleTitle) continue
        await saveInstantListingDraft(fullPhone, contactName, convId, d, combinedText)
      }
    }
    await logUnmetDemand(fullPhone, contactName, convId, ai, combinedText)
    // 💼 ERP interest — paid subscription lead → notify owner instantly (once per conversation)
    if (ai.erp_interest === true) {
      try {
        const prevMetaErp = ((existing as any)?.metadata || {}) as Record<string, unknown>
        if (!prevMetaErp.erp_interest_alerted) {
          const title = '💼 مورد مهتم بنظام الإدارة (CRM+ERP)'
          const body = `${contactName ? contactName + ' — ' : ''}${fullPhone}\nقال: «${combinedText.slice(0, 200)}»\nده اشتراك مدفوع — يستاهل مكالمة منك.`
          await sb().from('marid_notifications').insert({
            kind: 'hot_lead', title, body, phone: fullPhone, ref_table: 'whatsapp_conversations', ref_id: convId,
          })
          const adminPhoneErp = await getCfg('admin_alert_phone', '')
          if (adminPhoneErp) {
            await sendWhatsAppText(adminPhoneErp.replace(/^\+/, ''), `${title}\n${body}\nالمحادثة: madmonacairo.com/admin/wa-review`)
          }
          await sb().from('whatsapp_conversations').update({
            metadata: { ...prevMetaErp, erp_interest_alerted: true, erp_interest_at: new Date().toISOString() }
          }).eq('id', convId)
        }
      } catch (err) { console.error('[erp-interest-alert] error:', err) }
    }
    const prevMeta = ((existing as any)?.metadata || {}) as Record<string, unknown>
    const convUpdate: Record<string, unknown> = { last_outbound_at: new Date().toISOString(), message_count: 1 }
    if (ai.lead_type === 'supplier_lead' || ai.lead_type === 'customer_lead') convUpdate.contact_type = ai.lead_type
    if (ai.intent) convUpdate.first_intent = ai.intent
    if (ai.category) convUpdate.first_category = ai.category
    if (ai.supplier_kind) convUpdate.metadata = { ...prevMeta, supplier_kind: ai.supplier_kind }
    await sb().from('whatsapp_conversations').update(convUpdate).eq('id', convId)
    if (isNewConversation && (ai.lead_type === 'supplier_lead' || ai.lead_type === 'customer_lead')) {
      await sb().from('sales_leads').insert({
        source: ai.lead_type === 'supplier_lead' ? 'whatsapp_supplier_inbound' : 'whatsapp_customer_inbound',
        source_ref: waMsgId, contact_phone: fullPhone, contact_name: contactName,
        interested_category: ai.category,
        intent: ai.intent === 'signup_supplier' ? 'signup' : ai.intent === 'book_rental' ? 'book' : 'inquire',
        lead_score: ai.lead_type === 'supplier_lead' ? 80 : 50,
        last_action_at: new Date().toISOString(),
        notes: combinedText.slice(0, 500),
        metadata: { ai_classified: ai, supplier_kind: ai.supplier_kind ?? null, aggregated_count: inbounds.length, has_ad_referral: !!adData, ad_id: adData?.source_id, conversation_id: convId, auto_sent: true }
      })
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'unknown'
    await sb().from('whatsapp_messages').insert({
      conversation_id: convId, direction: 'outbound', body: '[AI reply failed: ' + errMsg + ']',
      message_type: 'text', status: 'failed', ai_generated: true, agent_name: 'inbound-responder', error_message: errMsg
    })
  }
}

async function handleStatusUpdate(status: Record<string, unknown>): Promise<void> {
  const waMsgId = String(status.id)
  const statusValue = String(status.status)
  const errors = status.errors as Array<{ code?: number; title?: string; message?: string }> | undefined
  const patch = {
    status: statusValue, status_updated_at: new Date().toISOString(),
    error_code: errors?.[0]?.code?.toString(), error_message: errors?.[0]?.title ?? errors?.[0]?.message
  }
  const { data: updated } = await sb().from('whatsapp_messages')
    .update(patch).eq('wa_message_id', waMsgId).select('id')

  // 🛟 الرسالة اتبعتت من برّه التطبيق (API مباشر / أدوات) → مش متسجّلة عندنا.
  // بدل ما نضيّع تأكيد التسليم، نسجّلها عشان نعرف اتسلّمت ولا فشلت.
  if (!updated || updated.length === 0) {
    try {
      const recipient = String(status.recipient_id || '')
      if (!recipient) return
      const full = recipient.startsWith('+') ? recipient : '+' + recipient
      let convId: string | null = null
      const { data: conv } = await sb().from('whatsapp_conversations')
        .select('id').eq('contact_phone', full).limit(1).maybeSingle()
      if (conv?.id) convId = conv.id
      else {
        const { data: created } = await sb().from('whatsapp_conversations')
          .insert({ contact_phone: full, contact_type: 'customer_lead', agent_name: 'external-send', status: 'active' })
          .select('id').single()
        convId = created?.id ?? null
      }
      if (!convId) return
      await sb().from('whatsapp_messages').insert({
        conversation_id: convId, direction: 'outbound', wa_message_id: waMsgId,
        message_type: 'template', agent_name: 'external-send', ai_generated: false,
        body: '[sent via API]', ...patch
      })
    } catch (e) { console.error('[status] backfill failed:', e) }
  }
}

Deno.serve(async (req) => {
  const url = new URL(req.url)
  if (req.method === 'GET') return handleVerification(url)
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  try {
    const payload = await req.json()
    const entries = payload?.entry || []
    const inboundPromises: Promise<void>[] = []
    for (const entry of entries) {
      for (const change of (entry?.changes || [])) {
        const value = change?.value || {}
        for (const msg of (value?.messages || [])) inboundPromises.push(handleInboundMessage(msg, value?.contacts || []))
        for (const status of (value?.statuses || [])) await handleStatusUpdate(status)
      }
    }
    // 🐛 FIX (12 Jul 2026) — الرسايل الصوتية كانت بتضيع خالص (صفر رسالة صوتية في الداتابيز).
    // السبب: كنا بنرجّع 200 من غير waitUntil، فالـisolate بيتقفل والشغل اللي لسه شغال بيتقتل.
    // النص/الصور/الملفات كانت بتلحق تخلص (أقل من ٢ ثانية)، لكن الصوت محتاج
    // تحميل + تفريغ Whisper (٥–١٠ ثواني) → كان بيتقتل قبل ما يتسجل أو يترد عليه.
    // EdgeRuntime.waitUntil بيخلي الـisolate عايش لحد ما الشغل يخلص.
    const work = Promise.all(inboundPromises).catch(err => console.error('[webhook] error:', err))
    // deno-lint-ignore no-explicit-any
    const rt = (globalThis as any).EdgeRuntime
    if (rt?.waitUntil) rt.waitUntil(work); else await work
    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error('Webhook error:', err)
    return new Response('OK', { status: 200 })
  }
})
