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

const log = pino({ level: 'info' })
if (!existsSync(AUTH_DIR)) mkdirSync(AUTH_DIR, { recursive: true })

// ── أدوات ─────────────────────────────────────────────────────────────────
function toJid(raw) {
  const s = String(raw)
  if (s.includes('@')) return s
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

  const text =
    m.message?.conversation ||
    m.message?.extendedTextMessage?.text ||
    m.message?.imageMessage?.caption ||
    m.message?.videoMessage?.caption ||
    ''

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

  const kind = m.message?.audioMessage
    ? 'audio'
    : m.message?.imageMessage
    ? 'image'
    : m.message?.videoMessage
    ? 'video'
    : m.message?.documentMessage
    ? 'document'
    : 'text'

  let media = null
  if (kind !== 'text') {
    try {
      const buf = await downloadMediaMessage(m, 'buffer', {}, {
        logger: pino({ level: 'silent' }),
        reuploadRequest: sock.updateMediaMessage,
      })
      if (buf.length / (1024 * 1024) <= MAX_MEDIA_MB) {
        const node =
          m.message?.audioMessage ||
          m.message?.imageMessage ||
          m.message?.videoMessage ||
          m.message?.documentMessage
        media = {
          mimetype: node?.mimetype || 'application/octet-stream',
          filename: m.message?.documentMessage?.fileName || null,
          seconds: m.message?.audioMessage?.seconds || null,
          is_voice_note: !!m.message?.audioMessage?.ptt,
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
    name: m.pushName || null,
    message_id: m.key.id,
    timestamp: Number(m.messageTimestamp) || Math.floor(Date.now() / 1000),
    type: kind,
    text,
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

// ── تشغيل الجلسات ─────────────────────────────────────────────────────────
async function bootSessions() {
  const migrated = migrateLegacySession()

  const fromDisk = knownSessionIds(AUTH_DIR).map((id) => ({ id, label: id }))
  const all = CONFIGURED.length ? CONFIGURED : fromDisk

  // لو الترحيل حصل وماكانش في القايمة، ضيفه
  if (migrated && !all.some((s) => s.id === migrated)) {
    all.unshift({ id: migrated, label: 'المارد' })
  }

  if (all.length === 0) {
    all.push({ id: 'default', label: 'المارد' })
  }

  for (const s of all) {
    try {
      await startSession({ id: s.id, label: s.label, authRoot: AUTH_DIR, onMessage: handleMessage })
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
  if (wanted) return { id: wanted, entry: getSession(wanted) }
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
  })
})

app.get('/sessions', (_req, res) => res.json({ ok: true, sessions: listSessions() }))

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
    await startSession({ id: String(session), label: label || String(session), authRoot: AUTH_DIR, onMessage: handleMessage })
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
  const { to, text } = req.body || {}
  if (!to || !text) return res.status(400).json({ ok: false, error: 'to و text مطلوبين' })
  const { id, entry } = pickSession(req)
  if (!entry?.connected) return res.status(503).json({ ok: false, error: 'مفيش جلسة متصلة' })
  try {
    const sent = await entry.sock.sendMessage(toJid(to), { text })
    log.info({ session: id, to }, '📤 اتبعت')
    res.json({ ok: true, wa_message_id: sent?.key?.id, session: id })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

app.post('/send-voice', auth, async (req, res) => {
  const { to, audio_base64, seconds } = req.body || {}
  if (!to || !audio_base64) return res.status(400).json({ ok: false, error: 'to و audio_base64 مطلوبين' })
  const { id, entry } = pickSession(req)
  if (!entry?.connected) return res.status(503).json({ ok: false, error: 'مفيش جلسة متصلة' })
  try {
    const sent = await entry.sock.sendMessage(toJid(to), {
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
  const { to, data_base64, mimetype, filename, caption } = req.body || {}
  if (!to || !data_base64) return res.status(400).json({ ok: false, error: 'to و data_base64 مطلوبين' })
  const { id, entry } = pickSession(req)
  if (!entry?.connected) return res.status(503).json({ ok: false, error: 'مفيش جلسة متصلة' })
  try {
    const buf = Buffer.from(data_base64, 'base64')
    const isImage = (mimetype || '').startsWith('image/')
    const content = isImage
      ? { image: buf, caption: caption || undefined }
      : { document: buf, mimetype: mimetype || 'application/pdf', fileName: filename || 'file', caption: caption || undefined }
    const sent = await entry.sock.sendMessage(toJid(to), content)
    res.json({ ok: true, wa_message_id: sent?.key?.id, session: id })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

app.listen(PORT, () => log.info(`الخدمة على المنفذ ${PORT}`))
bootSessions().catch((e) => log.error({ err: e.message }, 'فشل تشغيل الجلسات'))
