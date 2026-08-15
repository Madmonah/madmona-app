// src/lib/adminPw.ts
// ============================================================================
// Bug (15 Aug 2026 - Mohamed): "/admin/sending" never reached the server.
// The browser threw before sending anything:
//
//   Failed to execute 'fetch' on 'Window': Failed to read the 'headers'
//   property from 'RequestInit': String contains non ISO-8859-1 code point.
//
// The admin password contains Arabic characters. HTTP header values are
// ISO-8859-1 only, so putting it in "X-Admin-Password" makes fetch() throw
// synchronously - no request, no status code, nothing in the server logs.
// 22 call sites across 10 admin pages had the same latent crash.
//
// Since 08a2d7d/96fa02e every /api/admin/* route accepts the admin session
// cookie (isAdminRequest in lib/adminGate.ts), which the browser sends on its
// own. So when the password cannot legally travel in a header we simply omit
// it and let the cookie authenticate the request.
// ============================================================================

/** Latin-1 safe header value, or '' when the password cannot be sent as one. */
export function safePw(pw: string | null | undefined): string {
  const s = pw ?? ''
  if (s === '') return ''
  for (let i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) > 0xff) return ''
  }
  return s
}
