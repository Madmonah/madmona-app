// خدمة واتساب للمارد — Baileys
// بتمسك اتصال واتساب وتوصّل الرسايل لتطبيق مضمونة. مفيش أي منطق ذكاء هنا.
//
// المتغيرات المطلوبة (Railway → Variables):
//   APP_WEBHOOK_URL   = https://www.madmonacairo.com/api/whatsapp/baileys
//   SHARED_SECRET     = أي نص عشوائي طويل (نفسه في التطبيق)
//   AUTH_DIR          = /data/auth   (لازم Railway Volume متعمله mount على /data)
//   PORT              = بيتحط تلقائي من Railway

import express from 'express'
import pino from 'pino'
import QRCode from 'qrcode'
import qrcodeTerminal from 'qrcode-terminal'
import { existsSync, mkdirSync } from 'node:fs'
import {
  default as makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
} from '@whiskeysockets/baileys'

// أقصى حجم ميديا هنبعته للتطبيق (Claude بيقبل ~5MB للصور و32MB للـ PDF)
const MAX_MEDIA_MB = Number(process.env.MAX_MEDIA_MB || 12)

const APP_WEBHOOK_URL = process.env.APP_WEBHOOK_URL || ''
const SHARED_SECRET = process.env.SHARED_SECRET || ''
const AUTH_DIR = process.env.AUTH_DIR || '/data/auth'
const PORT = process.env.PORT || 3000

// الجروبات: all = رد على كل رسالة | mentioned = لما يتمنشن بس | off = تجاهل
const GROUP_MODE = (process.env.GROUP_MODE || 'all').toLowerCase()
const GROUP_ALLOWLIST = (process.env.GROUP_ALLOWLIST || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const log = pino({ level: 'info' })

if (!existsSync(AUTH_DIR)) mkdirSync(AUTH_DIR, { recursive: true })

let sock = null
let currentQR = null      // آخر QR (data URL) للعرض في المتصفح
let connected = false
let meJid = null

// ── تحويل الرقم لصيغة واتساب ──────────────────────────────────────────────
function toJid(raw) {
  const s = String(raw)
  if (s.includes('@')) return s                    // JID جاهز (جروب أو فرد)
  let n = s.replace(/[^\d]/g, '')
  if (n.startsWith('00')) n = n.slice(2)
  if (n.startsWith('0')) n = '20' + n.slice(1)     // أرقام مصرية
  return `${n}@s.whatsapp.net`
}

// ── إرسال الوارد لتطبيق مضمونة ────────────────────────────────────────────
async function forwardToApp(payload) {
  if (!APP_WEBHOOK_URL) {
    log.warn('APP_WEBHOOK_URL مش متظبط — الرسالة اتسجلت في اللوج بس')
    log.info(payload)
    return
  }
  try {
    const res = await fetch(APP_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-madmona-secret': SHARED_SECRET,
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) log.error({ status: res.status, body: await res.text() }, 'التطبيق رفض الرسالة')
  } catch (e) {
    log.error({ err: e.message }, 'فشل الاتصال بالتطبيق')
  }
}

// ── الاتصال بواتساب ───────────────────────────────────────────────────────
async function start() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
  const { version } = await fetchLatestBaileysVersion()

  sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    browser: ['Madmona', 'Chrome', '1.0.0'],
    markOnlineOnConnect: false,   // مهم: عشان الإشعارات تفضل تيجي على الموبايل
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (u) => {
    const { connection, lastDisconnect, qr } = u

    if (qr) {
      currentQR = await QRCode.toDataURL(qr)
      qrcodeTerminal.generate(qr, { small: true })
      log.info('امسح الـ QR — أو افتح /qr في المتصفح')
    }

    if (connection === 'open') {
      connected = true
      currentQR = null
      meJid = sock.user?.id
      log.info({ me: meJid }, '✅ المارد اتصل بواتساب')
    }

    if (connection === 'close') {
      connected = false
      const code = lastDisconnect?.error?.output?.statusCode
      const loggedOut = code === DisconnectReason.loggedOut
      log.warn({ code, loggedOut }, 'الاتصال اتقفل')
      if (!loggedOut) {
        setTimeout(start, 3000)          // إعادة اتصال تلقائي
      } else {
        log.error('اتعمل تسجيل خروج — لازم QR جديد. امسح فولدر auth وأعد التشغيل.')
      }
    }
  })

  // ── الرسايل الواردة ─────────────────────────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return

    for (const m of messages) {
      if (m.key.fromMe) continue                       // رسايلنا إحنا
      const jid = m.key.remoteJid || ''
      if (jid === 'status@broadcast') continue         // تجاهل الحالات

      const isGroup = jid.endsWith('@g.us')

      const text =
        m.message?.conversation ||
        m.message?.extendedTextMessage?.text ||
        m.message?.imageMessage?.caption ||
        m.message?.videoMessage?.caption ||
        ''

      // ── قواعد الجروبات ────────────────────────────────────────────────
      if (isGroup) {
        if (GROUP_MODE === 'off') continue

        const mentions = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
        const myNum = (meJid || '').split(':')[0].split('@')[0]
        const mentioned = mentions.some((j) => j.startsWith(myNum))

        // رد على رسالة من رسايلنا يُعتبر مخاطبة كمان
        const quoted = m.message?.extendedTextMessage?.contextInfo?.participant || ''
        const repliedToUs = quoted.startsWith(myNum)

        const allowed = GROUP_ALLOWLIST.includes(jid)

        if (GROUP_MODE === 'mentioned' && !mentioned && !repliedToUs && !allowed) continue
        // GROUP_MODE === 'all' → بيعدّي على طول
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

      // ── تنزيل الميديا وتحويلها base64 ────────────────────────────────
      let media = null
      if (kind !== 'text') {
        try {
          const buf = await downloadMediaMessage(m, 'buffer', {}, { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage })
          const sizeMB = buf.length / (1024 * 1024)
          if (sizeMB > MAX_MEDIA_MB) {
            log.warn({ sizeMB: sizeMB.toFixed(1) }, 'الميديا كبيرة — اتجاهلت')
          } else {
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
            log.info({ kind, mime: media.mimetype, kb: Math.round(buf.length / 1024) }, '📎 ميديا اتنزلت')
          }
        } catch (e) {
          log.error({ err: e.message, kind }, 'فشل تنزيل الميديا')
        }
      }

      const payload = {
        media,
        from: isGroup ? (m.key.participant || '').split('@')[0] : jid.split('@')[0],
        name: m.pushName || null,
        message_id: m.key.id,
        timestamp: Number(m.messageTimestamp) || Math.floor(Date.now() / 1000),
        type: kind,
        text,
        is_group: isGroup,
        group_jid: isGroup ? jid : null,
      }

      log.info(
        { from: payload.from, group: isGroup ? jid : undefined, kind, preview: text.slice(0, 60) },
        isGroup ? '👥 رسالة جروب' : '📩 رسالة واردة'
      )
      await forwardToApp(payload)
    }
  })
}

// ── HTTP API ──────────────────────────────────────────────────────────────
const app = express()
app.use(express.json({ limit: '32mb' }))   // الميديا بتتبعت base64

function auth(req, res, next) {
  if (!SHARED_SECRET) return next()
  if (req.headers['x-madmona-secret'] !== SHARED_SECRET) {
    return res.status(401).json({ ok: false, error: 'unauthorized' })
  }
  next()
}

app.get('/health', (_req, res) =>
  res.json({ ok: true, connected, me: meJid, waiting_for_qr: !!currentQR })
)

// صفحة الـ QR — افتحها في المتصفح وامسح بالموبايل
app.get('/qr', (_req, res) => {
  if (connected) return res.send('<h2 style="font-family:sans-serif">✅ المارد متصل بالفعل</h2>')
  if (!currentQR) return res.send('<h2 style="font-family:sans-serif">⏳ لسه بيجهّز الـ QR… حدّث الصفحة بعد ثانيتين</h2>')
  res.send(`<div style="text-align:center;font-family:sans-serif;padding:40px">
    <h2>امسح الكود من واتساب ← الأجهزة المرتبطة</h2>
    <img src="${currentQR}" style="width:320px;height:320px" />
    <p>الصفحة بتتحدث كل ٢٠ ثانية</p>
    <script>setTimeout(()=>location.reload(),20000)</script>
  </div>`)
})

// إرسال رسالة نصية
app.post('/send', auth, async (req, res) => {
  const { to, text } = req.body || {}
  if (!to || !text) return res.status(400).json({ ok: false, error: 'to و text مطلوبين' })
  if (!connected || !sock) return res.status(503).json({ ok: false, error: 'مش متصل بواتساب' })

  try {
    const jid = toJid(to)
    const sent = await sock.sendMessage(jid, { text })
    log.info({ to, id: sent?.key?.id }, '📤 رسالة اتبعتت')
    res.json({ ok: true, wa_message_id: sent?.key?.id })
  } catch (e) {
    log.error({ err: e.message, to }, 'فشل الإرسال')
    res.status(500).json({ ok: false, error: e.message })
  }
})

// إرسال voice note — audio_base64 لازم يكون OGG/Opus
app.post('/send-voice', auth, async (req, res) => {
  const { to, audio_base64, seconds } = req.body || {}
  if (!to || !audio_base64) return res.status(400).json({ ok: false, error: 'to و audio_base64 مطلوبين' })
  if (!connected || !sock) return res.status(503).json({ ok: false, error: 'مش متصل بواتساب' })

  try {
    const sent = await sock.sendMessage(toJid(to), {
      audio: Buffer.from(audio_base64, 'base64'),
      mimetype: 'audio/ogg; codecs=opus',
      ptt: true,                        // يظهر كرسالة صوتية مش ملف
      seconds: seconds || undefined,
    })
    log.info({ to, id: sent?.key?.id }, '🎤 voice note اتبعتت')
    res.json({ ok: true, wa_message_id: sent?.key?.id })
  } catch (e) {
    log.error({ err: e.message, to }, 'فشل إرسال الـ voice')
    res.status(500).json({ ok: false, error: e.message })
  }
})

// إرسال ملف / صورة
app.post('/send-media', auth, async (req, res) => {
  const { to, data_base64, mimetype, filename, caption } = req.body || {}
  if (!to || !data_base64) return res.status(400).json({ ok: false, error: 'to و data_base64 مطلوبين' })
  if (!connected || !sock) return res.status(503).json({ ok: false, error: 'مش متصل بواتساب' })

  try {
    const buf = Buffer.from(data_base64, 'base64')
    const isImage = (mimetype || '').startsWith('image/')
    const content = isImage
      ? { image: buf, caption: caption || undefined }
      : { document: buf, mimetype: mimetype || 'application/pdf', fileName: filename || 'file', caption: caption || undefined }

    const sent = await sock.sendMessage(toJid(to), content)
    log.info({ to, id: sent?.key?.id, isImage }, '📎 ميديا اتبعتت')
    res.json({ ok: true, wa_message_id: sent?.key?.id })
  } catch (e) {
    log.error({ err: e.message, to }, 'فشل إرسال الميديا')
    res.status(500).json({ ok: false, error: e.message })
  }
})

app.listen(PORT, () => log.info(`الخدمة شغالة على المنفذ ${PORT}`))
start().catch((e) => log.error({ err: e.message }, 'فشل بدء الخدمة'))
