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

/** @type {Map<string, {sock:any, connected:boolean, qr:string|null, me:string|null, label:string}>} */
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

/** الجلسات اللي ليها مجلد auth على الديسك (حتى لو لسه مااتشغلتش) */
export function knownSessionIds(authRoot) {
  if (!existsSync(authRoot)) return []
  return readdirSync(authRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
}

export async function startSession({ id, label, authRoot, onMessage }) {
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
    browser: ['Madmona', 'Chrome', '1.0.0'],
    markOnlineOnConnect: false, // إشعارات الموبايل تفضل شغالة
  })
  entry.sock = sock

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (u) => {
    const { connection, lastDisconnect, qr } = u

    if (qr) {
      entry.qr = await QRCode.toDataURL(qr)
      log.info({ session: id }, 'QR جاهز')
    }

    if (connection === 'open') {
      entry.connected = true
      entry.qr = null
      entry.me = sock.user?.id || null
      log.info({ session: id, me: entry.me }, '✅ الجلسة اتصلت')
    }

    if (connection === 'close') {
      entry.connected = false
      const code = lastDisconnect?.error?.output?.statusCode
      const loggedOut = code === DisconnectReason.loggedOut
      log.warn({ session: id, code, loggedOut }, 'الجلسة اتقفلت')
      if (loggedOut) {
        log.error({ session: id }, 'تسجيل خروج — امسح المجلد وأعد الربط')
      } else {
        setTimeout(() => startSession({ id, label: entry.label, authRoot, onMessage }), 3000)
      }
    }
  })

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    for (const m of messages) {
      try {
        await onMessage({ sessionId: id, sock, m })
      } catch (e) {
        log.error({ session: id, err: e.message }, 'فشل معالجة رسالة')
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
