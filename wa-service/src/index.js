// خدمة المارد — واتساب متعدد الأرقام (Baileys)
//
// كل رقم = جلسة مستقلة. الرقم بيفضل شغال على الموبايل عادي —
// الخدمة بتتربط كجهاز مرتبط (Linked Device).
//
// المتغيرات (Railway → Variables):
//   APP_WEBHOOK_URL = https://www.madmonacairo.com/api/whatsapp/baileys
//   SHARED_SECRET   = سر مشترك مع Vercel
//   AUTH_DIR        = /data/auth   ← لازم Volume على /data
//   GROUP_MODE      = all | mentioned | off
//   SESSIONS        = 201002229982:المارد,201xxxxxxxxx:المبيعات   (اختياري)

import express from 'express'
import pino from 'pino'
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync } from 'node:fs'
import { join } from 'node:path'
import {
  startSession,
  listSessions,
  getSession,
  logoutSession,
  knownSessionIds,
  downloadMediaMessage,
} from './sessions.js'

const APP_WEBHOOK_URL = process.env.APP_WEBHOOK_URL || ''
const SHARED_SECRET = process.env.SHARED_SECRET || ''
const AUTH_DIR = process.env.AUTH_DIR || '/data/auth'
const PORT = process.env.PORT || 3000
const MAX_MEDIA_MB = Number(process.env.MAX_MEDIA_MB || 12)

const GROUP_MODE = (process.env.GROUP_MODE || 'all').toLowerCase()
const GROUP_ALLOWLIST = (process.env.GROUP_ALLOWLIST || '').split(',').map((s) => s.trim()).filter(Boolean)

// SESSIONS=رقم:اسم,رقم:اسم — لو فاضي بنشغّل اللي على الديسك
const CONFIGURED = (process.env.SESSIONS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .map((s) => {
    const [id, ...rest] = s.split(':')
    return { id: id.trim(), label: rest.join(':').trim() || id.trim() }
  })

const START_TIME = Date.now()
const log = pino({ level: 'info' })
if (!existsSync(AUTH_DIR)) mkdirSync(AUTH_DIR, { recursive: true })

// ── أدوات ─────────────────────────────────────────────────────────────────
// ⚠️ مهم — الـ LID:
// واتساب بقى بيبعت مُعرّف مخفي (`xxxx@lid`) بدل الرقم الحقيقي.
// النسخة 6.7.9 مافيهاش أي طريقة ترجّع الرقم منه (MessageKey فيه ٤ حقول بس).
// فالقاعدة: **نرد على نفس الـ JID اللي جت منه الرسالة** — ماننفعش نعيد
// تركيب رقم، لأن `23889212117111@s.whatsapp.net` رقم مش موجود؛
// Baileys بيقبله ويدّي ID والرسالة بتروح في الفراغ.
function toJid(raw) {
  const s = String(raw)
  if (s.includes('@')) return s // JID جاهز (lid أو s.whatsapp.net) — نسيبه زي ما هو
  let n = s.replace(/[^\d]/g, '')
  if (n.startsWith('00')) n = n.slice(2)
  if (n.startsWith('0')) n = '20' + n.slice(1)
  return `${n}@s.whatsapp.net`
}

async function forwardToApp(payload) {
  if (!APP_WEBHOOK_URL) return log.warn({ payload }, 'APP_WEBHOOK_URL ناقص')
  try {
    const res = await fetch(APP_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-madmona-secret': SHARED_SECRET },
      body: JSON.stringify(payload),
    })
    if (!res.ok) log.error({ status: res.status, body: await res.text() }, 'التطبيق رفض الرسالة')
  } catch (e) {
    log.error({ err: e.message }, 'فشل الاتصال بالتطبيق')
  }
}

// ── معالج الرسايل الواردة (مشترك لكل الجلسات) ────────────────────────────
async function handleMessage({ sessionId, sock, m }) {
  if (m.key.fromMe) return
  const jid = m.key.remoteJid || ''
  if (jid === 'status@broadcast') return

  const isGroup = jid.endsWith('@g.us')

  // Baileys بيغلّف بعض الرسايل — لازم نفكّ الغلاف الأول
  // (رسايل مؤقتة، عرض مرة واحدة، مستند بتعليق)
  const inner =
    m.message?.ephemeralMessage?.message ||
    m.message?.viewOnceMessage?.message ||
    m.message?.viewOnceMessageV2?.message ||
    m.message?.documentWithCaptionMessage?.message ||
    m.message ||
    {}

  const text =
    inner.conversation ||
    inner.extendedTextMessage?.text ||
    inner.imageMessage?.caption ||
    inner.videoMessage?.caption ||
    inner.documentMessage?.caption ||
    // ردود الأزرار والقوايم
    inner.buttonsResponseMessage?.selectedDisplayText ||
    inner.templateButtonReplyMessage?.selectedDisplayText ||
    inner.listResponseMessage?.title ||
    ''

  // أنواع مالهاش نص — نوصفها بدل ما نسيبها فاضية
  const noTextHint = inner.stickerMessage
    ? '[استيكر]'
    : inner.contactMessage || inner.contactsArrayMessage
    ? '[جهة اتصال]'
    : inner.locationMessage || inner.liveLocationMessage
    ? '[موقع]'
    : inner.reactionMessage
    ? null // تفاعل — نتجاهله تمامًا
    : inner.pollCreationMessage || inner.pollUpdateMessage
    ? '[استطلاع]'
    : ''

  // التفاعلات (لايك على رسالة) مش محتاجة رد
  if (noTextHint === null) return

  if (isGroup) {
    if (GROUP_MODE === 'off') return
    if (GROUP_MODE === 'mentioned') {
      const mentions = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
      const myNum = (getSession(sessionId)?.me || '').split(':')[0].split('@')[0]
      const mentioned = mentions.some((j) => j.startsWith(myNum))
      const quoted = m.message?.extendedTextMessage?.contextInfo?.participant || ''
      const repliedToUs = quoted.startsWith(myNum)
      if (!mentioned && !repliedToUs && !GROUP_ALLOWLIST.includes(jid)) return
    }
  }

  const kind = inner.audioMessage
    ? 'audio'
    : inner.imageMessage
    ? 'image'
    : inner.videoMessage
    ? 'video'
    : inner.documentMessage
    ? 'document'
    : 'text'

  let media = null
  let mediaError = null
  if (kind !== 'text') {
    // 🔁 تنزيل الميديا بيفشل أحيانًا لأسباب مؤقتة (الشبكة، إعادة الرفع).
    //    كان بيتجاهل الفشل في صمت — والصورة تضيع للأبد.
    //
    //    ٢٠ يوليو: مطعم Shawari بعت ٣ صور منيو الساعة ٨:٣٧،
    //    كلها فشلت، ومحصلش أي أثر غير كلمة [image] في الرسالة.
    //    وممنوع نطلب منه يبعتها تاني — دي غلطتنا مش غلطته.
    //
    //    دلوقتي: محاولتين، والفشل بيتبعت للتطبيق عشان يتسجّل
    //    ويتنبّه عليه بدل ما يضيع.
    try {
      let buf = null
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          buf = await downloadMediaMessage(m, 'buffer', {}, {
            logger: pino({ level: 'silent' }),
            reuploadRequest: sock.updateMediaMessage,
          })
          break
        } catch (e) {
          if (attempt === 2) throw e
          log.warn({ err: e.message, attempt }, 'فشل تنزيل الميديا — بنعيد')
          await new Promise((r) => setTimeout(r, 1500))
        }
      }
      if (buf.length / (1024 * 1024) <= MAX_MEDIA_MB) {
        const node =
          inner.audioMessage ||
          inner.imageMessage ||
          inner.videoMessage ||
          inner.documentMessage
        media = {
          mimetype: node?.mimetype || 'application/octet-stream',
          filename: inner.documentMessage?.fileName || null,
          seconds: inner.audioMessage?.seconds || null,
          is_voice_note: !!inner.audioMessage?.ptt,
          size_bytes: buf.length,
          data_base64: buf.toString('base64'),
        }
      } else {
        log.warn({ mb: (buf.length / 1048576).toFixed(1) }, 'ميديا كبيرة — اتجاهلت')
      }
    } catch (e) {
      log.error({ err: e.message, kind }, 'فشل تنزيل الميديا')
    }
  }

  const payload = {
    session_id: sessionId,
    from: isGroup ? (m.key.participant || '').split('@')[0] : jid.split('@')[0],
    // الـ JID اللي نرد عليه — دايمًا نستخدمه بدل إعادة تركيب رقم من `from`
    reply_jid: isGroup ? jid : jid,
    is_lid: jid.endsWith('@lid'),
    name: m.pushName || null,
    message_id: m.key.id,
    timestamp: Number(m.messageTimestamp) || Math.floor(Date.now() / 1000),
    type: kind,
    text: text || noTextHint || '',
    is_group: isGroup,
    group_jid: isGroup ? jid : null,
    media,
  }

  log.info(
    { session: sessionId, from: payload.from, kind, group: isGroup || undefined },
    isGroup ? '👥 جروب' : '📩 وارد'
  )
  await forwardToApp(payload)
}

// ── ترحيل الجلسة القديمة (كانت في AUTH_DIR مباشرة) ───────────────────────
// مهم جدًا: من غير ده، أول deploy هيضيّع الربط الحالي ويطلب QR جديد.
function migrateLegacySession() {
  const legacyCreds = join(AUTH_DIR, 'creds.json')
  if (!existsSync(legacyCreds)) return null

  // نقرا الرقم من الـ creds عشان نسمّي المجلد بيه
  let id = 'default'
  try {
    const creds = JSON.parse(readFileSync(legacyCreds, 'utf8'))
    const me = creds?.me?.id || ''
    const num = me.split(':')[0].split('@')[0]
    if (num) id = num
  } catch { /* نكمّل بـ default */ }

  const target = join(AUTH_DIR, id)
  if (!existsSync(target)) mkdirSync(target, { recursive: true })

  let moved = 0
  for (const f of readdirSync(AUTH_DIR, { withFileTypes: true })) {
    if (f.isDirectory()) continue
    renameSync(join(AUTH_DIR, f.name), join(target, f.name))
    moved++
  }
  log.info({ id, moved }, '🔄 اتنقلت الجلسة القديمة لمجلد فرعي — الربط محفوظ')
  return id
}

// ⚠️ كانت معرّفة جوّه bootSessions، فمسار `POST /sessions` كان بيرمي
//    «forwardLidMap is not defined» ويفشل ربط أي رقم جديد.
//    مكانها هنا عشان الاتنين يشوفوها.
const forwardLidMap = (m) => forwardToApp({ kind: 'lid_map', ...m })
// ✓/✓✓/seen — تحديث حالة الرسايل اللي بعتناها (بيتحدّث في اللوحة)
const forwardStatus = (s) => forwardToApp({ kind: 'status', ...s })

// ── تشغيل الجلسات ─────────────────────────────────────────────────────────
async function bootSessions() {
  const migrated = migrateLegacySession()

  const fromDisk = knownSessionIds(AUTH_DIR).map((id) => ({ id, label: id }))

  // ⚠️ كان: `CONFIGURED.length ? CONFIGURED : fromDisk` — يعني لو
  //    SESSIONS متظبطة، أي رقم اتربط بعدين (بـ POST /sessions) بيتجاهل
  //    تمامًا وبيضيع أول إعادة تشغيل، رغم إن بياناته متسجّلة على القرص.
  //
  //    رقم اتربط ماينفعش يختفي عشان حد نسي يحدّث متغيّر بيئة.
  //    بندمج الاتنين: المتغيّر بيدّي الأسماء، والقرص بيضمن ما حدّش يضيع.
  const all = [...CONFIGURED]
  for (const d of fromDisk) {
    if (!all.some((s) => s.id === d.id)) all.push(d)
  }

  // لو الترحيل حصل وماكانش في القايمة، ضيفه
  if (migrated && !all.some((s) => s.id === migrated)) {
    all.unshift({ id: migrated, label: 'المارد' })
  }

  if (all.length === 0) {
    all.push({ id: 'default', label: 'المارد' })
  }

  for (const s of all) {
    try {
      await startSession({ id: s.id, label: s.label, authRoot: AUTH_DIR, onMessage: handleMessage, onLidMap: forwardLidMap, onStatus: forwardStatus })
      log.info({ session: s.id }, 'الجلسة بدأت')
    } catch (e) {
      log.error({ session: s.id, err: e.message }, 'فشل بدء الجلسة')
    }
  }
}

// ── HTTP ──────────────────────────────────────────────────────────────────
const app = express()
app.use(express.json({ limit: '32mb' }))

function auth(req, res, next) {
  if (!SHARED_SECRET) return next()
  if (req.headers['x-madmona-secret'] !== SHARED_SECRET) {
    return res.status(401).json({ ok: false, error: 'unauthorized' })
  }
  next()
}

/** يختار الجلسة: من body.session أو ?session أو أول جلسة متصلة */
function pickSession(req) {
  const wanted = req.body?.session || req.query?.session
  if (wanted) {
    const entry = getSession(wanted)
    // ⚠️ الرقم المطلوب مفصول؟ الرسالة **ماتضيعش** — بنبعت من أي
    //    رقم متصل. العميل يشوف رد من رقم تاني أحسن من إنه يستنى
    //    ومايوصلوش حاجة.
    //    (٢١ يوليو: الرقم القديم اتفصل، فالردود على ناسه كانت
    //     بتتولّد وتتسجّل وتقف — والعميل مستني.)
    if (entry?.connected) return { id: wanted, entry }
    const alt = listSessions().find((s) => s.connected)
    if (alt) {
      log.warn({ wanted, used: alt.id }, 'الرقم المطلوب مفصول — بعتنا من التاني')
      return { id: alt.id, entry: getSession(alt.id) }
    }
    return { id: wanted, entry }
  }
  const first = listSessions().find((s) => s.connected)
  return first ? { id: first.id, entry: getSession(first.id) } : { id: null, entry: null }
}

app.get('/health', (_req, res) => {
  const list = listSessions()
  const primary = list.find((s) => s.connected) || list[0] || null
  res.json({
    ok: true,
    // توافق للخلف مع الكود الحالي
    connected: !!primary?.connected,
    me: primary?.me ?? null,
    waiting_for_qr: !!primary?.waiting_for_qr,
    // الجديد
    sessions: list,
    // النسخة الشغالة فعلاً — Railway بيحقن المتغيرات دي تلقائيًا.
    // من غيرها مفيش طريقة نتأكد إن آخر رفع اتنشر ولا لأ.
    version: {
      commit: (process.env.RAILWAY_GIT_COMMIT_SHA || 'unknown').slice(0, 7),
      deployed_at: process.env.RAILWAY_DEPLOYMENT_ID ? START_TIME : null,
      uptime_sec: Math.floor((Date.now() - START_TIME) / 1000),
    },
  })
})

app.get('/sessions', (_req, res) => res.json({ ok: true, sessions: listSessions() }))

// 🌐 الـIP اللي واتساب شايفه فعلاً.
//
// سؤال بيتكرر: «الرقم بيتصل بواتساب من فين؟» الإجابة: من **السيرفر ده**،
// مش من الموبايل. الموبايل بيمسح الـQR مرة واحدة وبيسلّم المفاتيح وبس؛
// بعد كده الجهاز المرتبط بيمسك سوكيت مباشر مع واتساب من IP الكونتينر،
// طول اليوم، حتى لو الموبايل مقفول أو من غير نت.
//
// المسار ده بيرجّع الرقم ده بالظبط عشان مانفضلش نخمّن — مفيد كمان لو
// احتجنا نضيف الـIP في allowlist عند أي طرف تاني.
app.get('/debug/egress-ip', async (_req, res) => {
  const out = {}
  await Promise.all(
    [
      ['ipify', 'https://api.ipify.org?format=json'],
      ['icanhazip', 'https://icanhazip.com'],
    ].map(async ([name, url]) => {
      try {
        const r = await fetch(url, { signal: AbortSignal.timeout(6000) })
        const t = (await r.text()).trim()
        out[name] = t.startsWith('{') ? JSON.parse(t).ip : t
      } catch (e) {
        out[name] = `err: ${e.message}`
      }
    }),
  )
  res.json({ ok: true, egress_ip: out, railway_region: process.env.RAILWAY_REPLICA_REGION || null })
})

// 🔍 (٢٥ يوليو ٢٠٢٦) تشخيص: مقارنة حالة الجلسات على الديسك.
//
//    الرقم الوحيد اللي بيسلّم جلسته اتبنت من شهور؛ أي جلسة اتعملت النهاردة
//    بتستقبل ولا تسلّم. الفرق الوحيد اللي فاضل هو **محتوى مجلد الـauth**،
//    وماكانش فيه طريقة نشوفه من برّه.
//
//    ⚠️ بيرجّع **عدد الملفات حسب النوع بس** — مفيش أسماء ولا مفاتيح ولا أي
//    بيانات. `session-*` و`pre-key-*` أسماؤها فيها معرّفات جهات اتصال،
//    فبنعدّها ومابنعرضهاش.
app.get('/debug/auth-state', (req, res) => {
  const out = {}
  try {
    for (const id of knownSessionIds(AUTH_DIR)) {
      const files = readdirSync(join(AUTH_DIR, id))
      const counts = {}
      for (const f of files) {
        // session-xxx.json → session · app-state-sync-key-xxx.json → app-state-sync-key
        const kind = f.replace(/\.json$/, '').replace(/-?[0-9]+(-[0-9]+)?$/, '').replace(/-[A-Za-z0-9+/=_%.]{6,}$/, '') || f
        counts[kind] = (counts[kind] || 0) + 1
      }
      out[id] = { total: files.length, kinds: counts }

      // ?has=201104496225,145398115078244 → هل فيه جلسة تشفير مع الهوية دي؟
      // بنجاوب بـtrue/false على قيمة **إحنا** بعتناها، فمفيش أي كشف بيانات.
      const probe = String(req.query.has || '').split(',').map((s) => s.trim()).filter(Boolean)
      if (probe.length) {
        out[id].has = Object.fromEntries(
          probe.map((p) => [p, files.some((f) => f.startsWith('session-') && f.includes(p))]),
        )
      }
    }
    res.json({ ok: true, auth_dir: AUTH_DIR, sessions: out })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

app.get('/qr', async (req, res) => {
  const id = req.query.session || listSessions()[0]?.id
  const s = id ? getSession(id) : null
  if (!s) return res.send('<h2 style="font-family:sans-serif">مفيش جلسة بالاسم ده</h2>')
  if (s.connected) return res.send(`<h2 style="font-family:sans-serif">✅ ${s.label} متصل</h2>`)
  if (!s.qr) return res.send('<h2 style="font-family:sans-serif">⏳ بيجهّز الـ QR… حدّث بعد ثانيتين</h2>')
  res.send(`<div style="text-align:center;font-family:sans-serif;padding:40px">
    <h2>${s.label} — امسح من واتساب ← الأجهزة المرتبطة</h2>
    <img src="${s.qr}" style="width:320px;height:320px"/>
    <p>بتتحدث كل ٢٠ ثانية</p>
    <script>setTimeout(()=>location.reload(),20000)</script>
  </div>`)
})

// إضافة رقم جديد (بيبدأ جلسة ويطلّع QR)
app.post('/sessions', auth, async (req, res) => {
  const { session, label } = req.body || {}
  if (!session) return res.status(400).json({ ok: false, error: 'session مطلوب' })
  try {
    await startSession({ id: String(session), label: label || String(session), authRoot: AUTH_DIR, onMessage: handleMessage, onLidMap: forwardLidMap, onStatus: forwardStatus })
    res.json({ ok: true, session, qr_url: `/qr?session=${encodeURIComponent(session)}` })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

app.delete('/sessions/:id', auth, async (req, res) => {
  await logoutSession(req.params.id, AUTH_DIR)
  res.json({ ok: true, removed: req.params.id })
})

app.post('/send', auth, async (req, res) => {
  const { to, text, jid } = req.body || {}
  if ((!to && !jid) || !text) return res.status(400).json({ ok: false, error: 'to أو jid، و text مطلوبين' })
  const { id, entry } = pickSession(req)
  if (!entry?.connected) return res.status(503).json({ ok: false, error: 'مفيش جلسة متصلة' })
  try {
    // ⚠️ (٢٥ يوليو ٢٠٢٦) اللوج كان بيطبع `to` — وده **حقل الرقم**، مش الهوية
    //    اللي اتبعت عليها فعلاً. فضلنا ساعات نستنتج «الرسالة راحت على الـLID»
    //    من غير ما نشوفها ولا مرة. الهوية الحقيقية هي `toJid(jid || to)`،
    //    ودي اللي بتحدّد وصلت ولا لأ. تتطبع صريحة.
    const target = toJid(jid || to)
    const sent = await entry.sock.sendMessage(target, { text })
    log.info({ session: id, to, jid: target, msg: sent?.key?.id }, '📤 اتبعت')
    res.json({ ok: true, wa_message_id: sent?.key?.id, session: id })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

app.post('/send-voice', auth, async (req, res) => {
  const { to, audio_base64, seconds, jid } = req.body || {}
  if ((!to && !jid) || !audio_base64) return res.status(400).json({ ok: false, error: 'to أو jid، و audio_base64 مطلوبين' })
  const { id, entry } = pickSession(req)
  if (!entry?.connected) return res.status(503).json({ ok: false, error: 'مفيش جلسة متصلة' })
  try {
    const sent = await entry.sock.sendMessage(toJid(jid || to), {
      audio: Buffer.from(audio_base64, 'base64'),
      mimetype: 'audio/ogg; codecs=opus',
      ptt: true,
      seconds: seconds || undefined,
    })
    res.json({ ok: true, wa_message_id: sent?.key?.id, session: id })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

app.post('/send-media', auth, async (req, res) => {
  // ⚠️ كان بينقص `jid` من الـ destructure رغم إنه بيستخدمه تحت في
  //    `toJid(jid || to)` — يعني ReferenceError وأي إرسال ميديا كان بيرمي 500.
  //    زي باقي المسارات: نقبل `to` أو `jid`.
  const { to, jid, data_base64, mimetype, filename, caption } = req.body || {}
  if ((!to && !jid) || !data_base64) return res.status(400).json({ ok: false, error: 'to أو jid، و data_base64 مطلوبين' })
  const { id, entry } = pickSession(req)
  if (!entry?.connected) return res.status(503).json({ ok: false, error: 'مفيش جلسة متصلة' })
  try {
    const buf = Buffer.from(data_base64, 'base64')
    const isImage = (mimetype || '').startsWith('image/')
    const content = isImage
      ? { image: buf, caption: caption || undefined }
      : { document: buf, mimetype: mimetype || 'application/pdf', fileName: filename || 'file', caption: caption || undefined }
    const sent = await entry.sock.sendMessage(toJid(jid || to), content)
    res.json({ ok: true, wa_message_id: sent?.key?.id, session: id })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// ── جروبات المتابعة ──────────────────────────────────────────────────────
//
// لكل مورد جروب: هو + فريق مضمونة. أي طلب يخصّه يتحوّل عليه هناك،
// وأي تحديث على إعلانه يتقال قدام الكل — فمفيش حاجة بتضيع في الخاص.
//
// ⚠️ إضافة رقم لجروب من غير سياق بتتقري كسبام.
// عشان كده أول رسالة في الجروب لازم تشرح إحنا مين وليه ضفناه —
// ده مش تحسين شكلي، ده اللي بيفرّق بين شراكة وإزعاج.

app.post('/group-create', auth, async (req, res) => {
  const { subject, participants, intro } = req.body || {}
  if (!subject || !Array.isArray(participants) || !participants.length) {
    return res.status(400).json({ ok: false, error: 'subject و participants مطلوبين' })
  }
  const { id, entry } = pickSession(req)
  if (!entry?.connected) return res.status(503).json({ ok: false, error: 'مفيش جلسة متصلة' })

  try {
    const jids = participants.map(toJid)
    const group = await entry.sock.groupCreate(subject, jids)

    // كل الأعضاء أدمن — عشان المورد يقدر يضيف فريقه بنفسه
    // من غير ما يستنانا. ده بيخلّي الجروب أداة شغل مش مجرد إشعارات.
    try {
      await entry.sock.groupParticipantsUpdate(group.id, jids, 'promote')
      log.info({ session: id, group: group.id }, '👑 كل الأعضاء بقوا أدمن')
    } catch (e) {
      // مش مانع — الجروب اتعمل والرسالة هتتبعت
      log.warn({ err: e.message }, 'مااتعملش ترقية للأدمن')
    }

    // رسالة التعريف — بتتبعت فورًا عشان محدش يلاقي نفسه في جروب مجهول
    if (intro) {
      await entry.sock.sendMessage(group.id, { text: intro })
    }

    log.info({ session: id, group: group.id, subject, count: jids.length }, '👥 جروب اتعمل')
    res.json({ ok: true, group_jid: group.id, subject, participants: jids.length, session: id })
  } catch (e) {
    log.error({ err: e.message, subject }, 'فشل إنشاء الجروب')
    res.status(500).json({ ok: false, error: e.message })
  }
})

app.post('/group-add', auth, async (req, res) => {
  const { group_jid, participants } = req.body || {}
  if (!group_jid || !Array.isArray(participants) || !participants.length) {
    return res.status(400).json({ ok: false, error: 'group_jid و participants مطلوبين' })
  }
  const { entry } = pickSession(req)
  if (!entry?.connected) return res.status(503).json({ ok: false, error: 'مفيش جلسة متصلة' })

  try {
    const out = await entry.sock.groupParticipantsUpdate(group_jid, participants.map(toJid), 'add')
    res.json({ ok: true, result: out })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// تغيير اسم الجروب. احتجناه لما اتعملت جروبات بأسماء وهمية جاية
// من التسجيل التلقائي («حساب 1060138703» · «موردة جديدة») —
// الاسم ده بيبان للمورّد ولكل حد في الجروب.
app.post('/group-subject', auth, async (req, res) => {
  const { group_jid, subject } = req.body || {}
  if (!group_jid || !subject) {
    return res.status(400).json({ ok: false, error: 'group_jid و subject مطلوبين' })
  }
  const { entry } = pickSession(req)
  if (!entry?.connected) return res.status(503).json({ ok: false, error: 'مفيش جلسة متصلة' })

  try {
    await entry.sock.groupUpdateSubject(group_jid, String(subject).slice(0, 100))
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// صورة البروفايل بتاعت رقم — أغلب الشركات حاطة لوجوها هناك،
// وده أوفر مصدر عندنا فعلاً (الداتابيز فيها لوجو لاتنين موردين بس).
app.get('/profile-picture', auth, async (req, res) => {
  const { phone, jid } = req.query || {}
  if (!phone && !jid) return res.status(400).json({ ok: false, error: 'phone أو jid مطلوب' })
  const { entry } = pickSession(req)
  if (!entry?.connected) return res.status(503).json({ ok: false, error: 'مفيش جلسة متصلة' })

  try {
    const target = jid || toJid(phone)
    // 'image' = الحجم الكبير. لو مفيش صورة، Baileys بيرمي.
    const url = await entry.sock.profilePictureUrl(target, 'image')
    res.json({ ok: true, url: url || null })
  } catch (e) {
    // مفيش صورة أو الخصوصية مقفولة — مش خطأ، حالة عادية
    res.json({ ok: true, url: null, note: e.message })
  }
})

// صورة الجروب — لوجو الشركة. Baileys محتاج بافر مش لينك،
// فبنجيب الصورة الأول وبنبعتها.
app.post('/group-picture', auth, async (req, res) => {
  const { group_jid, image_url } = req.body || {}
  if (!group_jid || !image_url) {
    return res.status(400).json({ ok: false, error: 'group_jid و image_url مطلوبين' })
  }
  const { entry } = pickSession(req)
  if (!entry?.connected) return res.status(503).json({ ok: false, error: 'مفيش جلسة متصلة' })

  try {
    const img = await fetch(image_url)
    if (!img.ok) {
      return res.status(400).json({ ok: false, error: `الصورة مش متاحة (${img.status})` })
    }
    const buf = Buffer.from(await img.arrayBuffer())
    // واتساب بيرفض الصور الكبيرة، وبيعملها مربّع تلقائي
    if (buf.length > 5_000_000) {
      return res.status(400).json({ ok: false, error: 'الصورة أكبر من ٥ ميجا' })
    }
    await entry.sock.updateProfilePicture(group_jid, buf)
    res.json({ ok: true, bytes: buf.length })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

app.get('/group-invite', auth, async (req, res) => {
  const { group_jid } = req.query || {}
  if (!group_jid) return res.status(400).json({ ok: false, error: 'group_jid مطلوب' })
  const { entry } = pickSession(req)
  if (!entry?.connected) return res.status(503).json({ ok: false, error: 'مفيش جلسة متصلة' })

  try {
    // لينك دعوة — أنضف من الإضافة المباشرة: المورد بيدخل بإرادته
    const code = await entry.sock.groupInviteCode(group_jid)
    res.json({ ok: true, invite_url: `https://chat.whatsapp.com/${code}` })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

app.listen(PORT, () => log.info(`الخدمة على المنفذ ${PORT}`))
bootSessions().catch((e) => log.error({ err: e.message }, 'فشل تشغيل الجلسات'))
