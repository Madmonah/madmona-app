// src/lib/madmonaSession.ts
// Central place to read/write the Madmona custom session that the magic-link page sets.
// Use this from any client component that needs to know if the user is logged in.

export type MadmonaSession = {
  token: string
  auth_user_id: string
  phone: string
  full_name: string | null
}

const KEYS = {
  session: 'madmona_session',
  token: 'madmona_session_token',
  authUserId: 'madmona_auth_user_id',
  phone: 'madmona_phone',
  fullName: 'madmona_full_name',
  isLoggedIn: 'is_logged_in',
  // Used to restore the pre-OTP state after the user returns from WhatsApp
  pendingLogin: 'madmona_pending_login',
} as const

export function getMadmonaSession(): MadmonaSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(KEYS.session)
    if (raw) {
      const parsed = JSON.parse(raw) as MadmonaSession
      if (parsed?.token) return parsed
    }
    // Legacy fallback: individual keys
    const token = localStorage.getItem(KEYS.token)
    const authUserId = localStorage.getItem(KEYS.authUserId)
    const phone = localStorage.getItem(KEYS.phone)
    if (token && authUserId && phone) {
      return {
        token,
        auth_user_id: authUserId,
        phone,
        full_name: localStorage.getItem(KEYS.fullName),
      }
    }
    return null
  } catch {
    return null
  }
}

export function setMadmonaSession(session: MadmonaSession): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(KEYS.session, JSON.stringify(session))
    localStorage.setItem(KEYS.token, session.token)
    localStorage.setItem(KEYS.authUserId, session.auth_user_id)
    localStorage.setItem(KEYS.phone, session.phone)
    if (session.full_name) localStorage.setItem(KEYS.fullName, session.full_name)
    localStorage.setItem(KEYS.isLoggedIn, '1')
  } catch {}
}

export function clearMadmonaSession(): void {
  if (typeof window === 'undefined') return
  try {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k))
    sessionStorage.removeItem(KEYS.session)
    sessionStorage.removeItem(KEYS.pendingLogin)
  } catch {}
}

// -----------------------------------------------------------------------------
// White-page-on-return fix:
// When the user is on a phone-entry / OTP-waiting screen and jumps to WhatsApp,
// iOS/Android often kills the PWA. When they come back, the app remounts with
// no memory of where they were in the flow → blank page.
//
// Call `savePendingLoginState(state)` whenever the login flow changes step.
// Call `getPendingLoginState()` in the login-screen mount to restore.
// Call `clearPendingLoginState()` after login succeeds.
// -----------------------------------------------------------------------------

export type PendingLoginState = {
  step: 'phone' | 'code_sent' | 'verifying'
  phone?: string
  name?: string
  timestamp: number
}

export function savePendingLoginState(state: Omit<PendingLoginState, 'timestamp'>): void {
  if (typeof window === 'undefined') return
  try {
    const withTs: PendingLoginState = { ...state, timestamp: Date.now() }
    // Save in BOTH storages — sessionStorage doesn't survive iOS PWA kill,
    // localStorage does but is app-wide (we prune stale entries on read).
    localStorage.setItem(KEYS.pendingLogin, JSON.stringify(withTs))
    sessionStorage.setItem(KEYS.pendingLogin, JSON.stringify(withTs))
  } catch {}
}

export function getPendingLoginState(): PendingLoginState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw =
      sessionStorage.getItem(KEYS.pendingLogin) ||
      localStorage.getItem(KEYS.pendingLogin)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PendingLoginState
    // Auto-expire pending state after 15 minutes (OTP is only valid 10)
    if (Date.now() - parsed.timestamp > 15 * 60 * 1000) {
      clearPendingLoginState()
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function clearPendingLoginState(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(KEYS.pendingLogin)
    sessionStorage.removeItem(KEYS.pendingLogin)
  } catch {}
}
