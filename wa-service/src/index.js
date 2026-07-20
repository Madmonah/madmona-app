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
} from '@whiskeysockets/baileys'

const APP_WEBHOOK_URL = process.env.APP_WEBHOOK_URL || ''
const SHARED_SECRET = process.env.SHARED_SECRET || ''
const AUTH_DIR = process.env.AUTH_DIR || '/data/auth'
const PORT = process.env.PORT || 3000

const log = pino({ level: 'info' })

if (!existsSync(AUTH_DIR)) mkdirSync(AUTH_DIR, { recursive: true })

let sock = null
let currentQR = null      // آخر QR (data URL) للعرض في المتصفح
let connected = false
let meJid = null

// ── تحويل الرقم لصيغة واتساب ──────────────────────────────────────────────
function toJid(raw) {
  let n = String(raw).replace(/[^\d]/g, '')
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
      if (jid.endsWith('@g.us')) continue              // تجاهل الجروبات
      if (jid === 'status@broadcast') continue         // تجاهل الحالات

      const text =
        m.message?.conversation ||
        m.message?.extendedTextMessage?.text ||
        m.message?.imageMessage?.caption ||
        m.message?.videoMessage?.caption ||
        ''

      const kind = m.message?.audioMessage
        ? 'audio'
        : m.message?.imageMessage
        ? 'image'
        : m.message?.documentMessage
        ? 'document'
        : 'text'

      const payload = {
        from: jid.split('@')[0],
        name: m.pushName || null,
        message_id: m.key.id,
        timestamp: Number(m.messageTimestamp) || Math.floor(Date.now() / 1000),
        type: kind,
        text,
      }

      log.info({ from: payload.from, kind, preview: text.slice(0, 60) }, '📩 رسالة واردة')
      await forwardToApp(payload)
    }
  })
}

// ── HTTP API ──────────────────────────────────────────────────────────────
const app = express()
app.use(express.json({ limit: '2mb' }))

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

// إرسال رسالة
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

app.listen(PORT, () => log.info(`الخدمة شغالة على المنفذ ${PORT}`))
start().catch((e) => log.error({ err: e.message }, 'فشل بدء الخدمة'))
