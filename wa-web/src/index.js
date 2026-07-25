// خدمة المارد — واتساب ويب الرسمي (whatsapp-web.js)
//
// خدمة تانية جنب `wa-service` (Baileys) — **مش بديلة ليها**.
//   • 201002229982  → يفضل على Baileys (اتربط من شهور وبيسلّم؛ ماينفعش يتلمس)
//   • الأرقام الجديدة → هنا
//
// بتتكلم **نفس عقد wa-service بالحرف**: نفس مسارات HTTP، نفس شكل الحمولة
// للويبهوك، نفس هيدر السر. فالتطبيق مايفرقش بين الاتنين.
//
// المتغيرات (رايلواي → Variables):
//   APP_WEBHOOK_URL = https://www.madmonacairo.com/api/whatsapp/baileys
//   SHARED_SECRET   = نفس السر بتاع wa-service
//   AUTH_DIR        = /data/auth   ← لازم Volume على /data
//   SESSIONS        = 201114621551:المساعد,201026222337:محمد ناصف
import express from 'express'
import pino from 'pino'
import { startSession, listSessions, getSession, logoutSession, knownSessionIds } from './sessions.js'

const APP_WEBHOOK_URL = process.env.APP_WEBHOOK_URL || ''
const SHARED_SECRET = process.env.SHARED_SECRET || ''
const AUTH_DIR = process.env.AUTH_DIR || '/data/auth'
const PORT = process.env.PORT || 3000

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

async function forwardToApp(payload) {
  if (!APP_WEBHOOK_URL) return log.warn('APP_WEBHOOK_URL ناقص')
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

const onMessage = (p) => forwardToApp(p)
const onStatus = (s) => forwardToApp({ kind: 'status', ...s })

async function bootSessions() {
  const fromDisk = knownSessionIds(AUTH_DIR).map((id) => ({ id, label: id }))
  const all = [...CONFIGURED]
  for (const d of fromDisk) if (!all.some((s) => s.id === d.id)) all.push(d)

  for (const s of all) {
    try {
      await startSession({ id: s.id, label: s.label, authRoot: AUTH_DIR, onMessage, onStatus })
      log.info({ session: s.id }, 'الجلسة بدأت')
    } catch (e) {
      log.error({ session: s.id, err: e.message }, 'فشل بدء الجلسة')
    }
  }
}

const app = express()
app.use(express.json({ limit: '32mb' }))

function auth(req, res, next) {
  if (!SHARED_SECRET) return next()
  if (req.headers['x-madmona-secret'] !== SHARED_SECRET) {
    return res.status(401).json({ ok: false, error: 'unauthorized' })
  }
  next()
}

app.get('/health', (_req, res) => {
  const list = listSessions()
  const primary = list.find((s) => s.connected) || list[0] || null
  res.json({
    ok: true,
    transport: 'whatsapp-web',
    connected: !!primary?.connected,
    me: primary?.me ?? null,
    waiting_for_qr: !!primary?.waiting_for_qr,
    sessions: list,
    version: {
      commit: (process.env.RAILWAY_GIT_COMMIT_SHA || 'unknown').slice(0, 7),
      uptime_sec: Math.floor((Date.now() - START_TIME) / 1000),
    },
  })
})

app.get('/sessions', (_req, res) => res.json({ ok: true, sessions: listSessions() }))

app.get('/qr', (req, res) => {
  const id = req.query.session || listSessions()[0]?.id
  const s = id ? getSession(id) : null
  if (!s) return res.send('<h2 style="font-family:sans-serif">مفيش جلسة بالاسم ده</h2>')
  if (s.connected) return res.send(`<h2 style="font-family:sans-serif">✅ ${s.label} متصل</h2>`)
  if (!s.qr) return res.send('<h2 style="font-family:sans-serif">⏳ بيجهّز الـQR… حدّث بعد ثانيتين</h2>')
  res.send(`<div style="text-align:center;font-family:sans-serif;padding:40px" dir="rtl">
    <h2>${s.label} — امسح من واتساب ← الأجهزة المرتبطة</h2>
    <img src="${s.qr}" style="width:320px;height:320px"/>
    <p>بتتحدث كل ٢٠ ثانية</p>
    <script>setTimeout(()=>location.reload(),20000)</script>
  </div>`)
})

app.post('/sessions', auth, async (req, res) => {
  const { session, label } = req.body || {}
  if (!session) return res.status(400).json({ ok: false, error: 'session مطلوب' })
  try {
    await startSession({ id: String(session), label: label || String(session), authRoot: AUTH_DIR, onMessage, onStatus })
    res.json({ ok: true, session, qr_url: `/qr?session=${encodeURIComponent(session)}` })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

app.delete('/sessions/:id', auth, async (req, res) => {
  await logoutSession(req.params.id, AUTH_DIR)
  res.json({ ok: true, removed: req.params.id })
})

// نفس عقد wa-service: { to, jid, text, session } → { ok, wa_message_id, session }
app.post('/send', auth, async (req, res) => {
  const { to, text, jid, session } = req.body || {}
  if ((!to && !jid) || !text) return res.status(400).json({ ok: false, error: 'to أو jid، و text مطلوبين' })

  // ⚠️ مفيش fallback لرقم تاني هنا — عن قصد.
  //    wa-service بيعمل كده، وده كان بيخلّي عميل يجيله رد من رقم ماكلّمهوش.
  //    هنا الرقم المطلوب أو خطأ واضح.
  const id = session || listSessions().find((s) => s.connected)?.id
  const entry = id ? getSession(id) : null
  if (!entry?.connected) return res.status(503).json({ ok: false, error: `الجلسة ${id || '—'} مش متصلة` })

  try {
    const { wa_message_id, target } = await (await import('./sessions.js')).sendText({ id, to, jid, text })
    log.info({ session: id, to, jid: target, msg: wa_message_id }, '📤 اتبعت')
    res.json({ ok: true, wa_message_id, session: id })
  } catch (e) {
    log.error({ session: id, err: e.message }, 'فشل الإرسال')
    res.status(500).json({ ok: false, error: e.message })
  }
})

// 📡 (تشخيص مؤقت): آخر إيصالات (ACK) لكل جلسة — نشوف الإرسال بيوصل لكام
const _ackLog = []
export function recordAck(session, msgId, ack, to) {
  _ackLog.push({ t: Date.now(), session, msgId, ack, to })
  if (_ackLog.length > 200) _ackLog.shift()
}
app.get('/acks', auth, (req, res) => {
  const sess = req.query.session
  let rows = _ackLog
  if (sess) rows = rows.filter((r) => r.session === sess)
  res.json({ ok: true, count: rows.length, acks: rows.slice(-50) })
})

// 🔍 (تشخيص مؤقت 25 يوليو): مقارنة مجلدات auth للجلسات — نشوف فرق الشغال عن المكسور
app.get('/diag', auth, async (req, res) => {
  try {
    const fs = await import('fs')
    const path = await import('path')
    const root = AUTH_DIR
    const out = {}
    const walk = (dir) => {
      const items = {}
      let entries = []
      try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch (e) { return { _error: e.message } }
      for (const e of entries) {
        const full = path.join(dir, e.name)
        if (e.isDirectory()) {
          items[e.name + '/'] = walk(full)
        } else {
          let sz = 0, mtime = null
          try { const st = fs.statSync(full); sz = st.size; mtime = st.mtime } catch {}
          items[e.name] = { size: sz, mtime }
        }
      }
      return items
    }
    // نلف على كل مجلد جوه /data/auth
    let top = []
    try { top = fs.readdirSync(root, { withFileTypes: true }) } catch (e) { return res.json({ error: 'cant read root: ' + e.message, root }) }
    for (const e of top) {
      if (e.isDirectory()) out[e.name] = walk(path.join(root, e.name))
    }
    res.json({ ok: true, root, tree: out })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

app.listen(PORT, () => {
  log.info({ port: PORT }, 'خدمة واتساب ويب شغالة')
  bootSessions()
})
