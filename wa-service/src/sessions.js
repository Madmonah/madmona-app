// إدارة جلسات واتساب المتعددة
// كل رقم = جلسة مستقلة بمجلد auth خاص بيها تحت AUTH_DIR/<sessionId>/

import pino from 'pino'
import QRCode from 'qrcode'
import { existsSync, mkdirSync, rmSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  default as makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
} from '@whiskeysockets/baileys'

const log = pino({ level: 'info' })
const silent = pino({ level: 'silent' })

/** @type {Map<string, {sock:any, connected:boolean, qr:string|null, me:string|null, label:string, retries:number}>} */
const sessions = new Map()

// ── تنبيه المالك ─────────────────────────────────────────────────────────
//
// لما المارد يقع، السكوت أخطر من العطل — محمد بيكتشفه من عميل زعلان
// بعد ساعات. التنبيه بيروح على رقمه من جلسة تانية شغالة، ولو مفيش،
// بيروح للتطبيق يبعته بأي قناة متاحة.
//
// ⚠️ الدالة دي مابترميش أبدًا. إحنا بنستخدمها وقت الأعطال —
// آخر حاجة محتاجينها إن التنبيه نفسه يوقع الخدمة.
const OWNER_PHONES = (process.env.OWNER_PHONES || '201002229982')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

let lastAlertAt = 0
const ALERT_COOLDOWN_MS = 5 * 60 * 1000

function notifyOwner(text) {
  try {
    // مانغرقش محمد بالتنبيهات لو الاتصال بيرفرف
    if (Date.now() - lastAlertAt < ALERT_COOLDOWN_MS) return
    lastAlertAt = Date.now()

    log.warn({ text }, '📢 تنبيه للمالك')

    for (const [sid, s] of sessions) {
      if (!s.connected || !s.sock) continue
      for (const p of OWNER_PHONES) {
        const jid = p.includes('@') ? p : `${p.replace(/\D/g, '')}@s.whatsapp.net`
        // بدون await — مانوقفش معالجة الاتصال على إرسال تنبيه
        s.sock.sendMessage(jid, { text }).catch(() => {})
      }
      return // جلسة واحدة تكفي
      void sid
    }

    // مفيش جلسة شغالة — نسيب أثر في اللوج على الأقل
    log.error({ text }, '🔴 مفيش جلسة تبعت التنبيه')
  } catch (e) {
    log.error({ err: e?.message }, 'فشل التنبيه نفسه')
  }
}

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

/** الجلسات اللي ليها مجلد auth على الديسك (حتى لو لسه مااتشغلتش) */
export function knownSessionIds(authRoot) {
  if (!existsSync(authRoot)) return []
  return readdirSync(authRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
}

export async function startSession({ id, label, authRoot, onMessage, onLidMap, onStatus }) {
  if (sessions.has(id) && sessions.get(id).connected) return sessions.get(id)

  const dir = join(authRoot, id)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  const { state, saveCreds } = await useMultiFileAuthState(dir)
  const { version } = await fetchLatestBaileysVersion()

  const entry = sessions.get(id) || { sock: null, connected: false, qr: null, me: null, label: label || id }
  entry.label = label || entry.label
  sessions.set(id, entry)

  const sock = makeWASocket({
    version,
    auth: state,
    logger: silent,
    browser: ['Mac OS', 'Desktop', '10.15.7'], // يبان كـ WhatsApp Desktop رسمي بدل اسم مخصص يتفلّج
    markOnlineOnConnect: false, // إشعارات الموبايل تفضل شغالة
  })
  entry.sock = sock

  sock.ev.on('creds.update', saveCreds)

  // ── ربط المُعرّف المخفي بالرقم الحقيقي ──────────────────────────────
  //
  // واتساب بيبعت الربط ده بنفسه في حدثين:
  //   • chats.phoneNumberShare → { lid, jid }  (ربط صريح)
  //   • contacts.upsert/update → Contact.lid   (على جهة الاتصال)
  //
  // ده أدق ألف مرة من الربط بالاسم — الاسم بيتغيّر، والمُعرّف ثابت.
  // بنبعت الربط للتطبيق يخزّنه، فأي رسالة جاية بمُعرّف مخفي بنعرف
  // صاحبها الحقيقي وتاريخه كامل.
  const sendLidMap = (lid, jid) => {
    if (!lid || !jid) return
    const phone = String(jid).split('@')[0].split(':')[0]
    if (!phone || !/^\d{8,15}$/.test(phone)) return
    log.info({ session: id, lid, phone }, '🔗 ربط مُعرّف مخفي برقم')
    onLidMap?.({ sessionId: id, lid: String(lid).split('@')[0], phone })
  }

  sock.ev.on('chats.phoneNumberShare', ({ lid, jid }) => sendLidMap(lid, jid))

  for (const evt of ['contacts.upsert', 'contacts.update']) {
    sock.ev.on(evt, (contacts) => {
      for (const c of contacts || []) {
        if (c?.lid && c?.id) sendLidMap(c.lid, c.id)
      }
    })
  }

  sock.ev.on('connection.update', async (u) => {
    const { connection, lastDisconnect, qr } = u

    if (qr) {
      entry.qr = await QRCode.toDataURL(qr)
      log.info({ session: id }, 'QR جاهز')
    }

    if (connection === 'open') {
      const wasDown = entry.retries > 0
      entry.connected = true
      entry.qr = null
      entry.me = sock.user?.id || null
      entry.retries = 0
      log.info({ session: id, me: entry.me }, '✅ الجلسة اتصلت')

      if (wasDown) notifyOwner(`✅ المارد رجع اتصل (${id})`)
    }

    if (connection === 'close') {
      entry.connected = false
      const code = lastDisconnect?.error?.output?.statusCode
      const loggedOut = code === DisconnectReason.loggedOut
      log.warn({ session: id, code, loggedOut }, 'الجلسة اتقفلت')

      if (loggedOut) {
        entry.retries = 0
        log.error({ session: id }, 'تسجيل خروج — بنمسح الجلسة ونطلّع QR جديد تلقائيًا')
        notifyOwner(`🔴 المارد اتسجّل خروج من الرقم ${id}\nبنمسح الجلسة القديمة ونطلّع QR جديد تلقائيًا — افتح صفحة الـQR واسكان من واتساب.`)
        // نمسح الـcreds الميتة ونعيد التشغيل — يطلّع QR جديد لوحده بدل ما يقف مستني مسح يدوي
        try { await logoutSession(id, authRoot) } catch { /* ignore */ }
        setTimeout(() => startSession({ id, label: entry.label, authRoot, onMessage, onLidMap, onStatus }), 2000)
        return
      }

      // تصاعد تدريجي: ٣ث، ٦ث، ١٢ث… لحد دقيقة.
      // المحاولة كل ٣ث ثابتة بتضغط على واتساب لو المشكلة عندهم،
      // وممكن تتقري إساءة استخدام.
      entry.retries = (entry.retries || 0) + 1
      const wait = Math.min(3000 * 2 ** (entry.retries - 1), 60_000)
      log.info({ session: id, retry: entry.retries, wait }, '🔄 هيحاول تاني')

      // لو فضل مقطوع أكتر من ٥ محاولات (~دقيقتين) — نبلّغ محمد.
      // السكوت الطويل أخطر من العطل نفسه.
      if (entry.retries === 5) {
        notifyOwner(
          `⚠️ المارد مقطوع من حوالي دقيقتين (الرقم ${id})\n` +
            `كود الانقطاع: ${code || 'غير معروف'}\n` +
            `بيحاول يرجع لوحده — لو استمر، شوف Railway.`
        )
      }

      setTimeout(() => startSession({ id, label: entry.label, authRoot, onMessage, onLidMap, onStatus }), wait)
    }
  })

  // ⚠️ لازم نستقبل النوعين — `notify` و `append`.
  //
  // من مصدر Baileys (lib/Socket/messages-recv.js:674):
  //   upsertMessage(msg, node.attrs.offline ? 'append' : 'notify')
  //
  // يعني الرسايل اللي وصلت **والخدمة مقطوعة** بتيجي بنوع `append`
  // لما ترجع. الكود القديم كان بيرميها (`if (type !== 'notify') return`)
  // — وده اللي ضيّع رسايل موردين يوم ٢٠ يوليو أثناء إعادة التشغيل.
  //
  // بنفلتر القديم بالوقت بدل ما نفلتر بالنوع: أي رسالة أقدم من
  // MAX_AGE_MIN بنسجّلها ومانردّش عليها — عشان لو واتساب عمل مزامنة
  // تاريخ كامل مانفضلش نرد على كلام من شهر فات.
  const MAX_AGE_MIN = Number(process.env.MAX_MESSAGE_AGE_MIN || 30)

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify' && type !== 'append') return

    for (const m of messages) {
      try {
        const ts = Number(m.messageTimestamp) || 0
        const ageMin = ts ? (Date.now() / 1000 - ts) / 60 : 0

        if (ageMin > MAX_AGE_MIN) {
          log.info({ session: id, ageMin: Math.round(ageMin) }, '⏭️ رسالة قديمة — اتجاهلت')
          continue
        }

        if (type === 'append') {
          log.info({ session: id, ageMin: Math.round(ageMin) }, '📥 رسالة فايتة — بتتعالج')
        }

        await onMessage({ sessionId: id, sock, m })
      } catch (e) {
        log.error({ session: id, err: e.message }, 'فشل معالجة رسالة')
      }
    }
  })

  // ── ✓/✓✓/seen: حالة الرسايل اللي إحنا بعتناها ───────────────────────
  // Baileys بيبعت التحديث في messages.update، وحقل status رقم:
  //   2 = SERVER_ACK (اتبعت ✓)، 3 = DELIVERY_ACK (اتسلّمت ✓✓)،
  //   4 = READ (اتقرت / seen)، 5 = PLAYED (فويس اتسمع).
  // بنبعت التحديث للتطبيق عشان الحالة تبان في اللوحة — ده بيساعد
  // نعرف الرسالة وصلت فعلًا ولا اتقطعت (مهم مع مشكلة التسليم).
  sock.ev.on('messages.update', async (updates) => {
    for (const u of updates || []) {
      try {
        const st = u.update?.status
        if (st == null) continue
        const messageId = u.key?.id
        if (!messageId) continue
        const map = { 2: 'sent', 3: 'delivered', 4: 'read', 5: 'read' }
        const mapped = map[Number(st)]
        if (!mapped) continue
        onStatus?.({ sessionId: id, message_id: messageId, status: mapped })
      } catch (e) {
        log.error({ session: id, err: e.message }, 'فشل تحديث حالة رسالة')
      }
    }
  })

  return entry
}

export async function logoutSession(id, authRoot) {
  const s = sessions.get(id)
  if (s?.sock) {
    try { await s.sock.logout() } catch { /* ignore */ }
  }
  sessions.delete(id)
  const dir = join(authRoot, id)
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true })
  return true
}

export { downloadMediaMessage }
