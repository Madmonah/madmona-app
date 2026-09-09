'use client'
// ============================================================================
// 🚪 signOutEverywhere — «تسجيل خروج» يقفل كل الأبواب مش باب واحد
//
// (٩/٩/٢٠٢٦) محمد: «لما محمد بيفتح الأبليكيشن بيبان كأنه مسجّل دخول، وكل ما
//   أكتب تسجيل خروج مش بتسمع». الجذر: ٧ أزرار خروج في المشروع كلها كانت
//   بتعمل `supabaseBrowser.auth.signOut()` **بس** — يعني بتقفل جلسة Supabase
//   وبتسيب `madmona_token` في localStorage وصفّه في `madmona_sessions` حي.
//   فأول ما الصفحة تتفتح تاني التطبيق يلاقي التوكن ويرجّعه «داخل» (ومن
//   النهارده session-upgrade كمان بتفتحله الباب التاني من التوكن ده).
//   نفس مرض «البابين» (٢٥/٨ · ٩/٩) بس على الخروج.
//
//   القاعدة: أي زرار خروج في أي شاشة ينادي دي — ممنوع signOut() لوحدها.
//   بتقفل: صف الجلسة في السيرفر (madmona_logout) · التوكن ومفاتيح الجلسة
//   المحلية · كوكي لوحة الأدمن · جلسة Supabase (محليًا، بمهلة عشان قفل
//   الـPWA مايعلّقش الزرار).
// ============================================================================
import { supabaseBrowser } from '@/lib/supabase-browser'
import { safeStorage } from '@/lib/safe-storage'
import { withTimeout } from '@/lib/session-safe'
import { clearMadmonaSession } from '@/lib/madmonaSession'

const LOCAL_KEYS = ['madmona_token', 'madmona_owner_token']

export async function signOutEverywhere(): Promise<void> {
  const token = safeStorage.get('madmona_token')
  const ownerToken = safeStorage.get('madmona_owner_token')

  // ١) السيرفر: امسح صف الجلسة عشان التوكن مايرجعش يشتغل من أي نسخة متخزنة
  const serverCalls: Promise<unknown>[] = []
  if (token) serverCalls.push(Promise.resolve(supabaseBrowser.rpc('madmona_logout', { p_token: token })))
  if (ownerToken) serverCalls.push(Promise.resolve(supabaseBrowser.rpc('owner_logout', { p_token: ownerToken })))
  serverCalls.push(fetch('/api/admin-entry', { method: 'DELETE' }).catch(() => null))
  try { await withTimeout(Promise.allSettled(serverCalls), 4000, null) } catch { /* best-effort */ }

  // ٢) المحلي: كل مفاتيح الهوية
  for (const k of LOCAL_KEYS) { try { safeStorage.remove(k) } catch { /* */ } }
  try { clearMadmonaSession() } catch { /* */ }
  try { sessionStorage.removeItem('madmona_admin_pw') } catch { /* */ }

  // ٣) جلسة Supabase — محليًا وبمهلة (signOut بيقدر يعلّق على الشبكة/القفل)
  try { await withTimeout(supabaseBrowser.auth.signOut({ scope: 'local' }), 4000, null) } catch { /* */ }
}
