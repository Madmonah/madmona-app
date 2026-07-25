// إدارة جلسات واتساب ويب (whatsapp-web.js) — جلسة لكل رقم.
//
// ليه المكتبة دي مش Baileys:
//   Baileys بيعيد بناء البروتوكول من الصفر. دي بتشغّل **صفحة واتساب ويب
//   الرسمية** في متصفح مخفي وتتحكم فيها. أتقل، بس هو العميل الرسمي —
//   والتليفون بيفضل شغال عادي لأنه جهاز مرتبط زي أي واتساب ويب.
//
// جرّبناها في معمل معزول قبل ما نبنيها: ربطت رقم جديد وبعتت ووصلت واتقريت.
// (OpenWA اتجرب كمان وفشل في الإقلاع مرتين — الحقن بتاعه بيتكسر مع
//  تحديثات واتساب ويب.)
import pkg from 'whatsapp-web.js'
const { Client, LocalAuth } = pkg
import QRCode from 'qrcode'
import pino from 'pino'
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const log = pino({ level: 'info' })

const MAX_MEDIA_MB = Number(process.env.MAX_MEDIA_MB || 12)
const MAX_MESSAGE_AGE_MIN = Number(process.env.MAX_MESSAGE_AGE_MIN || 30)

/** أنواع whatsapp-web.js → نفس اتحاد أنواع wa-service بالحرف */
const KIND = {
  chat: 'text',
  image: 'image',
  sticker: 'image',
  video: 'video',
  audio: 'audio',
  ptt: 'audio',
  document: 'document',
}

/** أنواع مالهاش نص — نوصفها بدل ما نسيبها فاضية (زي wa-service) */
const NO_TEXT_HINT = {
  sticker: '[استيكر]',
  vcard: '[جهة اتصال]',
  multi_vcard: '[جهة اتصال]',
  location: '[موقع]',
  poll_creation: '[استطلاع]',
}

/** رسايل مش محتاجة رد أصلاً */
const IGNORED = new Set(['reaction', 'revoked', 'e2e_notification', 'notification_template', 'call_log'])

/** id → { client, connected, qr, me, label, starting } */
const sessions = new Map()

export function listSessions() {
  return [...sessions.entries()].map(([id, s]) => ({
    id,
    label: s.label,
    connected: s.connected,
    me: s.me,
    waiting_for_qr: !!s.qr,
  }))
}

export function getSession(id) {
  return sessions.get(id) || null
}

/** الجلسات اللي ليها مجلد على الديسك (LocalAuth بيسمّيه session-<id>) */
export function knownSessionIds(authRoot) {
  if (!existsSync(authRoot)) return []
  return readdirSync(authRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith('session-'))
    .map((d) => d.name.slice('session-'.length))
}

export async function startSession({ id, label, authRoot, onMessage, onStatus }) {
  const existing = sessions.get(id)
  if (existing?.connected || existing?.starting) return existing

  if (!existsSync(authRoot)) mkdirSync(authRoot, { recursive: true })

  const entry = existing || { client: null, connected: false, qr: null, me: null, label: label || id }
  entry.label = label || entry.label
  entry.starting = true
  sessions.set(id, entry)

  // ⚠️ درس من wa-service: كل إعادة اتصال لازم تقفل اللي قبلها، وإلا يفضل
  //    فيه أكتر من عميل حي على نفس الحساب.
  if (entry.client) {
    try { await entry.client.destroy() } catch { /* تجاهل */ }
    entry.client = null
  }

  // 🔒 قفل البروفايل الميّت — أخطر لغم في الخدمة دي.
  //
  //    كروميوم بيسيب `SingletonLock` جوه مجلد البروفايل ومربوط باسم الجهاز.
  //    رايلواي بيقتل الحاوية عند كل نشر، فالقفل بيفضل على الفوليوم واسم
  //    جهاز الحاوية القديمة معاه. الحاوية الجديدة بتقرا القفل وترفض تشتغل:
  //      "The profile appears to be in use by another Chromium process
  //       (13) on another computer (75f7249329e4)"
  //
  //    وده **مابيتصلّحش لوحده أبدًا** — جرّبناه ٢٥ يوليو: الرقمين فضلوا
  //    ميّتين ٦ دقايق وإعادة المحاولة كل ١٥ ثانية بتقع على نفس القفل.
  //    يعني أي نشر عادي كان هيوقّف الأرقام لحد ما حد يمسح الملف بإيده.
  //
  //    إحنا الحاوية الوحيدة اللي شغّالة على الفوليوم ده، فمفيش كروميوم تاني
  //    حي ممكن القفل يحميه. بنمسحه قبل كل إقلاع.
  const profileDir = join(authRoot, `session-${id}`)
  for (const lock of ['SingletonLock', 'SingletonCookie', 'SingletonSocket']) {
    try { rmSync(join(profileDir, lock), { force: true, recursive: true }) } catch { /* تجاهل */ }
  }

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: id, dataPath: authRoot }),
    puppeteer: {
      headless: true,
      executablePath: process.env.CHROME_PATH || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // مهم على رايلواي: /dev/shm صغيرة
        '--disable-gpu',
        '--no-first-run',
      ],
    },
  })
  entry.client = client

  client.on('qr', async (qr) => {
    entry.qr = await QRCode.toDataURL(qr, { width: 320, margin: 1 })
    entry.connected = false
    log.info({ session: id }, 'QR جاهز')
  })

  client.on('authenticated', () => log.info({ session: id }, '🔐 اتوثّق'))
  client.on('auth_failure', (m) => log.error({ session: id, m }, '❌ فشل التوثيق'))
  client.on('loading_screen', (p) => log.info({ session: id, p }, '⏳ بيحمّل'))

  client.on('ready', () => {
    entry.connected = true
    entry.qr = null
    entry.starting = false
    entry.me = client.info?.wid?._serialized || null
    log.info({ session: id, me: entry.me }, '✅ الجلسة جاهزة')
  })

  client.on('disconnected', (reason) => {
    entry.connected = false
    entry.starting = false
    log.warn({ session: id, reason }, 'الجلسة اتفصلت')
    // LOGOUT = الجهاز اتفك من الموبايل → نمسح الجلسة ونطلّع QR جديد تلقائيًا
    if (String(reason).toUpperCase().includes('LOGOUT')) {
      try { rmSync(join(authRoot, `session-${id}`), { recursive: true, force: true }) } catch { /* تجاهل */ }
    }
    setTimeout(() => startSession({ id, label: entry.label, authRoot, onMessage, onStatus }), 5000)
  })

  // ── الوارد ────────────────────────────────────────────────────────────
  // نفس شكل الحمولة اللي wa-service بيبعتها بالحرف، عشان التطبيق مايفرقش
  // بين الخدمتين ولا يحتاج أي تعديل في مسار الاستقبال.
  client.on('message', async (msg) => {
    try {
      if (msg.fromMe) return
      if (IGNORED.has(msg.type)) return

      // 📵 حالات واتساب (الاستوري) — مش رسايل موجّهة لينا.
      //
      //    ٢٥ يوليو: أول ما الجلسة اتربطت، فيد الحالات اتزامن: ٧٤ حالة في
      //    ثانية واحدة (أدعية، إعلانات عربيات بصورها، لينكات فيسبوك) دخلت
      //    النظام كإنها رسايل عملاء، والمارد ابتدى يرد عليها.
      //
      //    والرد على `status@broadcast` **بيتنشر كحالة عامة** يشوفها كل
      //    جهات الاتصال — يعني كان هيبقى المارد بينشر ردود على حيطة الحالة.
      //    المكتبة وقعت في مسار إرسال الحالة قبل ما ده يحصل، فالحماية جت
      //    بالصدفة. `wa-service` عنده السطر ده من الأول، wa-web كان ناقصه.
      if (msg.from === 'status@broadcast' || msg.to === 'status@broadcast') return

      // ⏳ واتساب ويب بيزامن تاريخ الشاتات عند كل ربط أو إعادة اتصال.
      //    من غير الحارس ده، أي إعادة تشغيل = ردود على رسايل من شهور
      //    لعملاء حقيقيين. نفس حارس wa-service.
      const ageMin = (Date.now() / 1000 - Number(msg.timestamp || 0)) / 60
      if (msg.timestamp && ageMin > MAX_MESSAGE_AGE_MIN) {
        log.info({ session: id, age_min: Math.round(ageMin) }, 'رسالة قديمة من المزامنة — اتجاهلت')
        return
      }

      const chat = await msg.getChat()
      const isGroup = !!chat?.isGroup
      const from = isGroup ? (msg.author || '') : (msg.from || '')
      const contact = await msg.getContact().catch(() => null)

      // ⚠️ الذاكرة المشتركة بين المَرَدة مفهرسة بالرقم — مش بالـLID.
      //    لو الـjid جه `@lid` وأخدنا الرقم منه، هيتخزن العميل مرتين.
      //    whatsapp-web.js بيدّينا الرقم الحقيقي من جهة الاتصال، فنقدّمه.
      const contactNumber = contact?.number ? String(contact.number).replace(/\D/g, '') : ''

      const kind = KIND[msg.type] || 'text'

      // ── تنزيل الميديا ─────────────────────────────────────────────────
      // ⚠️ درس ٢٠ يوليو من wa-service: مطعم Shawari بعت ٣ صور منيو،
      //    كلها فشلت في التنزيل واتجاهلت في صمت — والصور ضاعت للأبد.
      //    فمحاولتين، والفشل بيتسجّل بصوت عالي بدل ما يعدّي ساكت.
      let media = null
      if (msg.hasMedia) {
        try {
          let m = null
          for (let attempt = 1; attempt <= 2; attempt++) {
            try {
              m = await msg.downloadMedia()
              if (m?.data) break
            } catch (e) {
              if (attempt === 2) throw e
              log.warn({ session: id, err: e.message, attempt }, 'فشل تنزيل الميديا — بنعيد')
              await new Promise((r) => setTimeout(r, 1500))
            }
          }
          if (!m?.data) throw new Error('الميديا رجعت فاضية')

          const sizeBytes = Buffer.byteLength(m.data, 'base64')
          if (sizeBytes / (1024 * 1024) <= MAX_MEDIA_MB) {
            media = {
              mimetype: m.mimetype || 'application/octet-stream',
              filename: m.filename || null,
              seconds: Number(msg.duration) || null,
              is_voice_note: msg.type === 'ptt',
              size_bytes: sizeBytes,
              data_base64: m.data,
            }
          } else {
            log.warn({ session: id, mb: (sizeBytes / 1048576).toFixed(1) }, 'ميديا كبيرة — اتجاهلت')
          }
        } catch (e) {
          log.error({ session: id, err: e.message, kind }, 'فشل تنزيل الميديا')
        }
      }

      onMessage?.({
        session_id: id,
        from: contactNumber || String(from).split('@')[0],
        reply_jid: msg.from,
        is_lid: String(msg.from).includes('@lid'),
        name: contact?.pushname || contact?.name || null,
        message_id: msg.id?._serialized || msg.id?.id || null,
        timestamp: msg.timestamp || Math.floor(Date.now() / 1000),
        type: kind,
        text: msg.body || NO_TEXT_HINT[msg.type] || '',
        is_group: isGroup,
        group_jid: isGroup ? msg.from : null,
        media,
      })
    } catch (e) {
      log.error({ session: id, err: e.message }, 'فشل معالجة رسالة واردة')
    }
  })

  // ── الإيصالات (✓ / ✓✓ / اتقرت) ───────────────────────────────────────
  // ack: 1=اتبعت 2=اتسلّمت 3=اتقرت 4=اتسمعت. بنرفع الحالة بس زي wa-service.
  client.on('message_ack', (msg, ack) => {
    try {
      const messageId = msg.id?._serialized || msg.id?.id
      if (!messageId) return
      const status = ack >= 3 ? 'read' : ack === 2 ? 'delivered' : null
      if (!status) return
      onStatus?.({ session_id: id, message_id: messageId, status })
    } catch (e) {
      log.error({ session: id, err: e.message }, 'فشل إيصال')
    }
  })

  client.initialize().catch((e) => {
    entry.starting = false
    log.error({ session: id, err: e.message }, 'فشل تشغيل الجلسة — هيحاول تاني')
    setTimeout(() => startSession({ id, label: entry.label, authRoot, onMessage, onStatus }), 15000)
  })

  return entry
}

/** إرسال نص. بيرجّع معرّف الرسالة زي wa-service بالظبط. */
export async function sendText({ id, to, jid, text }) {
  const entry = sessions.get(id)
  if (!entry?.connected) throw new Error('الجلسة مش متصلة')

  // whatsapp-web.js بيستخدم `<رقم>@c.us` للأفراد و`@g.us` للجروبات.
  // الـjid الجاي من الوارد ممكن يكون `@c.us` أو `@lid` أو `@g.us` — نسيبه
  // زي ما هو لو جاهز، وإلا نركّبه من الرقم.
  const target = (jid && jid.includes('@'))
    ? jid.replace('@s.whatsapp.net', '@c.us')
    : `${String(to).replace(/\D/g, '')}@c.us`

  // 🚫 حزام أمان تاني: ماينفعش نبعت لحيطة الحالات مهما كان اللي طلب.
  //    الرد هناك بيتنشر لكل جهات الاتصال، مش لشخص. لو أي صف قديم في
  //    الداتابيز لسه شايل الهوية دي، بيقف هنا مش بيوصل لواتساب.
  if (String(target).includes('status@broadcast')) {
    throw new Error('ممنوع الإرسال لـstatus@broadcast — ده بيتنشر كحالة عامة')
  }

  const sent = await entry.client.sendMessage(target, text)
  return { wa_message_id: sent?.id?._serialized || sent?.id?.id || null, target }
}

export async function logoutSession(id, authRoot) {
  const s = sessions.get(id)
  if (s?.client) {
    try { await s.client.logout() } catch { /* تجاهل */ }
    try { await s.client.destroy() } catch { /* تجاهل */ }
  }
  sessions.delete(id)
  try { rmSync(join(authRoot, `session-${id}`), { recursive: true, force: true }) } catch { /* تجاهل */ }
  return true
}
