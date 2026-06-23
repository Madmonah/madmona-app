// telegram-webhook v4 — مضمون على تليجرام (قناة إضافية، منفصلة تمامًا عن الواتساب)
// v4 (23 Jun 2026): + voice-in (Groq Whisper STT) + best-effort voice-out (Orpheus TTS) in PRIVATE chats.
// v3: + group/supergroup support (mention/reply-only). Private 1:1 flow unchanged.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CLAUDE_MODEL = 'claude-sonnet-4-6'
const SITE_URL = 'https://madmonacairo.com'
const sb = () => createClient(SUPABASE_URL, SERVICE)

const CATALOG_SYNONYMS: Array<[string, string]> = [
  ['عربيه','vehicles'],['عربيات','vehicles'],['سياره','vehicles'],['سيارات','vehicles'],['كار','vehicles'],
  ['يخت','marine'],['لانش','marine'],['قارب','marine'],
  ['شقه','properties-residential'],['شقق','properties-residential'],['فيلا','properties-residential'],['استوديو','properties-residential'],['apartment','properties-residential'],
  ['شاليه','properties-tourism'],['منتجع','properties-tourism'],
  ['مكتب','workspaces'],['مكاتب','workspaces'],['اجتماعات','workspaces'],
  ['قاعه','halls'],['فرح','weddings'],['كوشه','weddings'],
  ['كاميرا','equipment-camera'],['درون','media-drone'],
  ['رحله','tourism'],['رحلات','tourism'],
]

function normAr(s: string): string {
  return (s || '').toLowerCase().replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/ـ/g,'').replace(/\s+/g,' ').trim()
}

function enforceBrandName(text: string): string {
  if (!text) return text
  return text
    .replace(/مدمونة/g,'مضمونة').replace(/مدمونه/g,'مضمونة').replace(/مظمونة/g,'مضمونة').replace(/مظمونه/g,'مضمونة')
    .replace(/Madmoonah?/gi,'Madmona')
    .replace(/\/list-your-asset/g,'/add-listing').replace(/\/supplier\/register/g,'/add-listing')
    .replace(/\/auth\/signup\?role=supplier/g,'/add-listing').replace(/\/auth\/signup/g,'/add-listing')
}

async function getCfg(key: string, fallback = ''): Promise<string> {
  try {
    const { data } = await sb().from('whatsapp_config').select('value').eq('key', key).maybeSingle()
    return (data as { value?: string } | null)?.value || fallback
  } catch { return fallback }
}

let cachedKey: string | null = null
async function getAnthropicKey(): Promise<string> {
  if (cachedKey) return cachedKey
  const { data } = await sb().rpc('get_anthropic_key')
  if (!data) throw new Error('No Anthropic key')
  cachedKey = data as string
  return cachedKey
}

async function tgCall(method: string, payload: Record<string, unknown>): Promise<any> {
  const token = await getCfg('telegram_bot_token', '')
  if (!token) { console.error('[tg] no bot token configured'); return { ok: false } }
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  })
  return await r.json().catch(() => ({ ok: false }))
}

async function tgSend(chatId: number, text: string, replyMarkup?: unknown): Promise<any> {
  const body: Record<string, unknown> = { chat_id: chatId, text: enforceBrandName(text), disable_web_page_preview: false }
  if (replyMarkup) body.reply_markup = replyMarkup
  return await tgCall('sendMessage', body)
}

// --- group helpers (v3) ---
let botInfo: { id: number; username: string } | null = null
async function getBotInfo(): Promise<{ id: number; username: string }> {
  if (botInfo) return botInfo
  try {
    const r = await tgCall('getMe', {})
    if (r?.ok && r.result) { botInfo = { id: r.result.id, username: r.result.username || '' }; return botInfo }
  } catch (_) { /* ignore */ }
  botInfo = { id: 0, username: '' }
  return botInfo
}

function isBotMentioned(msg: any, username: string): boolean {
  if (!username) return false
  const text: string = msg.text || msg.caption || ''
  const ents: any[] = msg.entities || msg.caption_entities || []
  const uname = '@' + username.toLowerCase()
  for (const e of ents) {
    const seg = (text.substr(e.offset, e.length) || '').toLowerCase()
    if (e.type === 'mention' && seg === uname) return true
    if (e.type === 'bot_command' && seg.includes(uname)) return true
  }
  return text.toLowerCase().includes(uname)
}

function stripMention(text: string, username: string): string {
  if (!username) return text
  try { return text.replace(new RegExp('@' + username, 'gi'), ' ').replace(/\s+/g, ' ').trim() }
  catch { return text }
}

function contactKeyboard() {
  return { keyboard: [[{ text: '📱 شارك رقمك مع مضمونة', request_contact: true }]], resize_keyboard: true, one_time_keyboard: true }
}

// --- voice (v4): STT in (Groq Whisper) + best-effort TTS out (Orpheus) ---
async function tgGetFileBytes(fileId: string, maxBytes = 20 * 1024 * 1024): Promise<{ b64: string; mime: string } | null> {
  try {
    const token = await getCfg('telegram_bot_token', '')
    if (!token) return null
    const gf = await fetch(`https://api.telegram.org/bot${token}/getFile`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file_id: fileId }),
    })
    const gd = await gf.json().catch(() => ({}))
    const fp = gd?.result?.file_path
    if (!gd?.ok || !fp) return null
    const fr = await fetch(`https://api.telegram.org/file/bot${token}/${fp}`)
    if (!fr.ok) return null
    const buf = new Uint8Array(await fr.arrayBuffer())
    if (buf.length > maxBytes || buf.length < 100) return null
    const lower = String(fp).toLowerCase()
    const mime = (lower.endsWith('.oga') || lower.endsWith('.ogg')) ? 'audio/ogg'
      : lower.endsWith('.mp3') ? 'audio/mpeg'
      : (lower.endsWith('.m4a') || lower.endsWith('.mp4')) ? 'audio/mp4'
      : lower.endsWith('.wav') ? 'audio/wav' : 'audio/ogg'
    let bin = ''; const CHUNK = 0x8000
    for (let i = 0; i < buf.length; i += CHUNK) bin += String.fromCharCode(...buf.subarray(i, i + CHUNK))
    return { b64: btoa(bin), mime }
  } catch (_e) { return null }
}

async function transcribeAudio(b64: string, mime: string): Promise<string | null> {
  try {
    const key = await getCfg('groq_api_key', '')
    if (!key) return null
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
    const ext = mime.includes('ogg') ? 'ogg' : mime.includes('mp4') ? 'm4a' : mime.includes('mpeg') ? 'mp3' : mime.includes('wav') ? 'wav' : 'ogg'
    const form = new FormData()
    form.append('file', new Blob([bytes], { type: mime }), `voice.${ext}`)
    form.append('model', 'whisper-large-v3')
    form.append('language', 'ar')
    const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST', headers: { 'Authorization': `Bearer ${key}` }, body: form,
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok || !d?.text) return null
    return String(d.text).trim() || null
  } catch (_e) { return null }
}

function cleanForSpeech(s: string): string {
  return (s || '')
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '')
    .replace(/[#*_~`>\[\]]/g, '')
    .replace(/madmonacairo\.com[^\s]*/gi, 'موقع مضمونة')
    .replace(/\s+/g, ' ').trim().slice(0, 380)
}

async function ttsArabicOgg(text: string): Promise<Uint8Array | null> {
  try {
    const key = await getCfg('groq_api_key', '')
    if (!key) return null
    const model = await getCfg('tts_model', 'canopylabs/orpheus-arabic-saudi')
    const voice = await getCfg('tts_voice', 'noura')
    const speech = cleanForSpeech(text)
    if (speech.length < 5) return null
    const r = await fetch('https://api.groq.com/openai/v1/audio/speech', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, voice, input: speech, response_format: 'ogg' }),
    })
    if (!r.ok) { console.error('[tg-tts] error:', (await r.text()).slice(0, 200)); return null }
    const buf = new Uint8Array(await r.arrayBuffer())
    if (buf.length < 500) return null
    return buf
  } catch (e) { console.error('[tg-tts] exception:', e); return null }
}

async function tgSendVoice(chatId: number, ogg: Uint8Array, replyTo?: number): Promise<boolean> {
  try {
    const token = await getCfg('telegram_bot_token', '')
    if (!token) return false
    const form = new FormData()
    form.append('chat_id', String(chatId))
    form.append('voice', new Blob([ogg], { type: 'audio/ogg' }), 'reply.ogg')
    if (replyTo) { form.append('reply_to_message_id', String(replyTo)); form.append('allow_sending_without_reply', 'true') }
    const r = await fetch(`https://api.telegram.org/bot${token}/sendVoice`, { method: 'POST', body: form })
    const d = await r.json().catch(() => ({ ok: false }))
    return !!d?.ok
  } catch (_e) { return false }
}

async function fetchCatalogBlock(text: string): Promise<string> {
  try {
    const n = normAr(text)
    let slug: string | null = null
    for (const [kw, s] of CATALOG_SYNONYMS) { if (n.includes(kw)) { slug = s; break } }
    const { data } = await sb().rpc('search_listings_catalog', { p_query: text, p_category_slug: slug, p_city: null, p_limit: 4 })
    const arr = Array.isArray(data) ? data as Array<Record<string, unknown>> : []
    if (!arr.length) return ''
    const lines = arr.map((l, i) => {
      const price = l.price ? `${l.price} ${(l.currency as string) || 'EGP'}` : 'السعر بالتواصل'
      const loc = [l.city, l.district].filter(Boolean).join(' - ')
      return `${i + 1}. ${l.title}${loc ? ` (${loc})` : ''} — ${price}\n   ${l.url}`
    }).join('\n')
    return `\n\n=== ليستنجات حقيقية متاحة دلوقتي ===\nلو مناسب للعميل اعرض 1-3 منها بالسعر واللينك بالظبط. متخترعش لينكات.\n${lines}\n=== نهاية ===`
  } catch { return '' }
}

type AIResult = { intent: string; lead_type: string; supplier_kind?: string | null; category: string | null; reply: string; unmet_demand?: boolean; requested_item?: string | null }

async function generateReply(inboundText: string, name: string | null, history: string, isFirst: boolean): Promise<AIResult> {
  const apiKey = await getAnthropicKey()
  const commissionLine = await getCfg('commission_line_restaurants_prompt', 'Commission: FLAT 10% for ALL suppliers (individuals & businesses & restaurants)')
  const catalogBlock = await fetchCatalogBlock(inboundText)
  const firstBanner = isFirst
    ? '\n\n✨ FIRST REPLY ONLY — افتح بسطر واحد قصير: «منصة معاملات مضمونة — بيع وشراء، إيجار، خدمات، ومطاعم من مزوّدين موثوقين بحماية كاملة». واقفل بـ«معاملاتك مضمونة» لو مناسب.'
    : '\n\n⛔ مش أول رد — متعيدش الترحيب ولا تعريف المنصة ولا اللي قلته قبل كده.'
  const system = `You are مضمون (Madmoun) 🧞 — Madmona's friendly genie assistant on Telegram — for ${SITE_URL}.\nاسمك «مضمون» (مذكّر «مضمونة») وانت مساعد منصة مضمونة. عرّف نفسك كـ«مضمون»، ولو حد سألك اسمك قول «أنا مضمون، مساعد مضمونة». متقولش إن اسمك «المارد».\nBrand: مضمونة (with ض). Slogan: \"معاملاتك مضمونة\". Egyptian Arabic only.\nMadmona is a full GUARANTEED Egyptian marketplace: rent, buy/sell, services, restaurants, beauty.\n\nHARD RULES:\n- اقرأ الـHISTORY كلها قبل ما ترد، ورد على كل النقاط في رسالة واحدة. متعيدش نفسك.\n- موردين: فرد vs شركة. العمولة موحّدة: 10٪ على الكل (أفراد وشركات ومطاعم). حدد supplier_kind.\n- روابط الموردين: ${SITE_URL}/add-listing · روابط العملاء: ${SITE_URL}/marketplace?category=<slug>\n- ${commissionLine}\n- الأعمدة: حماية كاملة · دفع سريع · دعم 24/7\n- منتقولش إن المنصة موجودة قبل مايو 2026، ولا «من 2019»، ولا «أكبر منصة».\n- FULL-COVERAGE: متقولش إن حاجة مش متوفرة — احنا بنوفر أي حاجة. لو مش في الكتالوج: أكّد بحماس، اسأل سؤال أو اتنين، ووعد بمتابعة، وحط unmet_demand=true و requested_item.\n- التوظيف/CV → intent job_application ووجّه لـ ${SITE_URL}/careers.${firstBanner}\n\nCategory slugs: properties|vehicles|workspaces|equipment|media|weddings|tourism|recreation|marine${catalogBlock}\n\n=== HISTORY ===\n${history}\n=== END ===\n\nRespond ONLY with JSON:\n{\"intent\":\"signup_supplier|book_rental|ask_question|job_application|spam_or_other\",\"lead_type\":\"supplier_lead|customer_lead|unknown\",\"supplier_kind\":\"individual|company|null\",\"category\":\"...|null\",\"unmet_demand\":true,\"requested_item\":\"...|null\",\"reply\":\"...\"}`
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 1100, system, messages: [{ role: 'user', content: `رسالة العميل${name ? ' (' + name + ')' : ''}: \"${inboundText}\"` }] }),
  })
  const data = await r.json()
  if (!r.ok) throw new Error('claude: ' + JSON.stringify(data).slice(0, 200))
  const t = data?.content?.[0]?.text || ''
  const m = t.replace(/^```(json)?/i, '').replace(/```$/, '').trim().match(/\{[\s\S]*\}/)
  if (!m) throw new Error('parse failed')
  const parsed = JSON.parse(m[0])
  if (parsed.reply) parsed.reply = enforceBrandName(parsed.reply)
  if (parsed.supplier_kind === 'null') parsed.supplier_kind = null
  return parsed
}

async function getOrCreateConv(msg: any): Promise<{ id: string; isNew: boolean; outCount: number; contactPhone: string | null }> {
  const chatId = msg.chat.id
  const name = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ') || msg.from?.username || null
  const { data: existing } = await sb().from('telegram_conversations').select('id, contact_phone').eq('chat_id', chatId).maybeSingle()
  if (existing) {
    await sb().from('telegram_conversations').update({
      last_message_at: new Date().toISOString(), last_inbound_at: new Date().toISOString(), status: 'active',
      first_name: name ?? undefined,
    }).eq('id', (existing as any).id)
    const { count } = await sb().from('telegram_messages').select('id', { count: 'exact', head: true })
      .eq('conversation_id', (existing as any).id).eq('direction', 'outbound')
    return { id: (existing as any).id, isNew: false, outCount: count || 0, contactPhone: (existing as any).contact_phone }
  }
  const { data: created } = await sb().from('telegram_conversations').insert({
    chat_id: chatId, tg_user_id: msg.from?.id, username: msg.from?.username, first_name: name,
    status: 'active', last_message_at: new Date().toISOString(), last_inbound_at: new Date().toISOString(), message_count: 0,
  }).select('id').single()
  return { id: (created as any).id, isNew: true, outCount: 0, contactPhone: null }
}

// --- group handler (v3): replies only when the bot is @mentioned or its message is replied to ---
async function handleGroupMessage(msg: any): Promise<void> {
  const chatId = msg.chat.id
  const bot = await getBotInfo()
  const repliedToBot = !!(msg.reply_to_message && msg.reply_to_message.from && bot.id && msg.reply_to_message.from.id === bot.id)
  const mentioned = isBotMentioned(msg, bot.username)
  if (!mentioned && !repliedToBot) return // policy: only when addressed — no spam

  const raw: string = msg.text || msg.caption || ''
  const text = stripMention(raw, bot.username).trim()
  if (!text) {
    await tgCall('sendMessage', { chat_id: chatId, text: 'أيوة أنا معاك 🧞 — اكتب سؤالك وأنا أساعدك.', reply_to_message_id: msg.message_id, allow_sending_without_reply: true })
    return
  }
  const senderName = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ') || msg.from?.username || null

  const conv = await getOrCreateConv(msg)
  await sb().from('telegram_conversations').update({ username: msg.chat.title ?? undefined, metadata: { is_group: true, chat_type: msg.chat.type, title: msg.chat.title ?? null } }).eq('id', conv.id)
  await sb().from('telegram_messages').insert({ conversation_id: conv.id, direction: 'inbound', tg_message_id: msg.message_id, body: (senderName ? `[${senderName}] ` : '') + text, message_type: 'text' })

  const { data: histRows } = await sb().from('telegram_messages').select('direction, body, ai_generated, created_at')
    .eq('conversation_id', conv.id).order('created_at', { ascending: false }).limit(20)
  const hist = ((histRows || []) as Array<any>).reverse()
  const history = hist.map(r => `${r.direction === 'inbound' ? 'عضو' : (r.ai_generated ? 'مضمون(AI)' : 'مضمون')}: ${r.body || ''}`).join('\n')

  try {
    const ai = await generateReply(text, senderName, history, false)
    const res = await tgCall('sendMessage', { chat_id: chatId, text: enforceBrandName(ai.reply), reply_to_message_id: msg.message_id, allow_sending_without_reply: true, disable_web_page_preview: false })
    await sb().from('telegram_messages').insert({
      conversation_id: conv.id, direction: 'outbound', tg_message_id: res?.result?.message_id,
      body: ai.reply, message_type: 'text', ai_generated: true, agent_name: 'telegram-group-responder',
      metadata: { intent: ai.intent, category: ai.category, group: true },
    })
    await sb().from('telegram_conversations').update({ last_outbound_at: new Date().toISOString() }).eq('id', conv.id)
  } catch (err) {
    console.error('[tg-group] error:', err)
  }
}

async function handleUpdate(update: any): Promise<void> {
  const msg = update.message || update.edited_message
  if (!msg || !msg.chat) return
  if (msg.from?.is_bot) return // ignore other bots (and ourselves) — prevents loops

  const chatType = msg.chat?.type
  if (chatType === 'group' || chatType === 'supergroup') { await handleGroupMessage(msg); return }

  const chatId = msg.chat.id
  const name = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ') || msg.from?.username || null

  const conv = await getOrCreateConv(msg)

  // 1) Contact shared → store phone (identity)
  if (msg.contact && msg.contact.phone_number) {
    let digits = String(msg.contact.phone_number).replace(/[^0-9]/g, '')
    const phone = '+' + digits
    await sb().from('telegram_conversations').update({ contact_phone: phone }).eq('id', conv.id)
    await sb().from('telegram_messages').insert({ conversation_id: conv.id, direction: 'inbound', body: '[shared contact] ' + phone, message_type: 'contact' })
    await tgSend(chatId, 'تمام يا فندم، استلمنا رقمك ✅ دلوقتي حسابك على مضمونة متفعّل بالرقم ده. تحب أساعدك في إيه؟', { remove_keyboard: true })
    return
  }

  let text: string = msg.text || msg.caption || ''
  let wasVoice = false

  // 2) /start (text only)
  if (text.trim().startsWith('/start')) {
    await sb().from('telegram_messages').insert({ conversation_id: conv.id, direction: 'inbound', body: text, message_type: 'command' })
    const welcome = 'أهلاً بيك! أنا مضمون 🧞‍♂️ مساعد منصة مضمونة 👋\nمنصة معاملات مضمونة — بيع وشراء، إيجار، خدمات، ومطاعم من مزوّدين موثوقين بحماية كاملة.\nاكتبلي إنت بتدوّر على إيه أو عندك إيه تعرضه، وأنا أساعدك. (تقدر كمان تبعتلي رسالة صوتية وأنا أفهمها 🎙️)\n\nتقدر كمان تشارك رقمك عشان نفعّل حسابك ونخدمك أسرع 👇\nمعاملاتك مضمونة.'
    await tgSend(chatId, welcome, contactKeyboard())
    await sb().from('telegram_messages').insert({ conversation_id: conv.id, direction: 'outbound', body: welcome, message_type: 'text', ai_generated: false, agent_name: 'telegram-start' })
    return
  }

  // 🎙️ v4 voice-in: voice note / audio / video_note → transcribe via Groq Whisper
  const voiceMeta = (msg.voice || msg.audio || msg.video_note) as { file_id?: string } | undefined
  if (!text && voiceMeta?.file_id) {
    const media = await tgGetFileBytes(voiceMeta.file_id)
    if (media) {
      const transcript = await transcribeAudio(media.b64, media.mime)
      if (transcript) { text = transcript; wasVoice = true }
    }
    if (!text) {
      await tgSend(chatId, 'وصلتنا رسالتك الصوتية 🎙️ بس معرفتش أفرّغها — جرّب تبعتها تاني أو اكتبلنا طلبك.')
      await sb().from('telegram_messages').insert({ conversation_id: conv.id, direction: 'inbound', tg_message_id: msg.message_id, body: '[رسالة صوتية]', message_type: 'voice' })
      return
    }
  }

  if (!text) {
    // media without caption (photo/document not handled)
    await tgSend(chatId, 'وصلتنا الرسالة 📎 — عشان نخدمك أسرع دلوقتي، اكتبلنا طلبك في رسالة وإحنا معاك فورًا.\nمضمونة — معاملاتك مضمونة.')
    return
  }

  // 3) store inbound, build history, call the brain
  await sb().from('telegram_messages').insert({ conversation_id: conv.id, direction: 'inbound', tg_message_id: msg.message_id, body: wasVoice ? '🎙️ ' + text : text, message_type: wasVoice ? 'voice' : 'text' })
  const { data: histRows } = await sb().from('telegram_messages').select('direction, body, ai_generated, created_at')
    .eq('conversation_id', conv.id).order('created_at', { ascending: false }).limit(20)
  const hist = ((histRows || []) as Array<any>).reverse()
  const history = hist.map(r => `${r.direction === 'inbound' ? 'العميل' : (r.ai_generated ? 'مضمون(AI)' : 'مضمون')}: ${r.body || ''}`).join('\n')

  try {
    const ai = await generateReply(text, name, history, conv.outCount === 0)
    // 🎙️ v4 voice-out: لو بعت صوت، رد بصوت كمان (best-effort) قبل النص
    let voiceSent = false
    if (wasVoice) {
      try { const ogg = await ttsArabicOgg(ai.reply); if (ogg) voiceSent = await tgSendVoice(chatId, ogg, msg.message_id) } catch (_e) { /* ignore */ }
    }
    const res = await tgSend(chatId, ai.reply)
    await sb().from('telegram_messages').insert({
      conversation_id: conv.id, direction: 'outbound', tg_message_id: res?.result?.message_id,
      body: ai.reply, message_type: 'text', ai_generated: true, agent_name: 'telegram-responder',
      metadata: { intent: ai.intent, lead_type: ai.lead_type, supplier_kind: ai.supplier_kind ?? null, category: ai.category, unmet_demand: !!ai.unmet_demand, is_first: conv.outCount === 0, was_voice: wasVoice, voice_reply_sent: voiceSent },
    })
    const upd: Record<string, unknown> = { last_outbound_at: new Date().toISOString() }
    if (ai.lead_type === 'supplier_lead' || ai.lead_type === 'customer_lead') upd.contact_type = ai.lead_type
    if (ai.intent) upd.first_intent = ai.intent
    if (ai.category) upd.first_category = ai.category
    await sb().from('telegram_conversations').update(upd).eq('id', conv.id)

    if (conv.isNew && (ai.lead_type === 'supplier_lead' || ai.lead_type === 'customer_lead')) {
      await sb().from('sales_leads').insert({
        source: ai.lead_type === 'supplier_lead' ? 'telegram_supplier_inbound' : 'telegram_customer_inbound',
        source_ref: String(msg.message_id), contact_phone: conv.contactPhone, contact_name: name,
        interested_category: ai.category,
        intent: ai.intent === 'signup_supplier' ? 'signup' : ai.intent === 'book_rental' ? 'book' : 'inquire',
        lead_score: ai.lead_type === 'supplier_lead' ? 80 : 50,
        last_action_at: new Date().toISOString(), notes: text.slice(0, 500),
        metadata: { channel: 'telegram', chat_id: chatId, ai_classified: ai, supplier_kind: ai.supplier_kind ?? null, conversation_id: conv.id, was_voice: wasVoice },
      })
    }
  } catch (err) {
    console.error('[tg-responder] error:', err)
    await sb().from('telegram_messages').insert({ conversation_id: conv.id, direction: 'outbound', body: '[AI reply failed]', message_type: 'text', ai_generated: true, agent_name: 'telegram-responder', error_message: String(err).slice(0, 200) })
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('OK', { status: 200 })
  // verify Telegram secret header
  const expected = await getCfg('telegram_webhook_secret', '')
  const got = req.headers.get('x-telegram-bot-api-secret-token') || ''
  if (expected && got !== expected) return new Response('forbidden', { status: 403 })
  try {
    const update = await req.json()
    handleUpdate(update).catch(e => console.error('[tg] handler error:', e))
  } catch (e) { console.error('[tg] parse error:', e) }
  return new Response('OK', { status: 200 })
})
