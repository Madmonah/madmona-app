import { NextResponse } from 'next/server'

// بيصرف بيانات TURN قصيرة العمر من Cloudflare Realtime.
// المفتاح بيفضل على السيرفر بس — البراوزر بياخد username/credential مؤقتين.
// لو المفاتيح مش متظبطة، بيرجع STUN لوحده والمكالمة تشتغل على نفس الشبكة فقط.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STUN_ONLY = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
]

type IceServer = { urls: string[] | string; username?: string; credential?: string }

const noStore = { headers: { 'Cache-Control': 'no-store' } }

// ملاحظة تشغيلية (30 يوليو 2026): القيمتين على Vercel مقلوبين —
// CLOUDFLARE_TURN_KEY_ID فيه التوكن (64 حرف) والعكس. Cloudflare يرد
// 404 "cannot find specified key" لو الترتيب غلط. بنجرّب العكس مرة
// ونحفظ الترتيب الناجح في الميموري، فالطلب الزيادة بيحصل مرة واحدة
// بعد كل deploy بس. تفاصيل: runbook chat_calls_turn_features_jul30
let cachedOrder: 'normal' | 'swapped' | null = null

async function askCloudflare(id: string, tok: string) {
  return fetch(
    `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(id)}/credentials/generate-ice-servers`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: 86400 }),
      cache: 'no-store',
    },
  )
}

export async function GET() {
  const keyId = process.env.CLOUDFLARE_TURN_KEY_ID
  const token = process.env.CLOUDFLARE_TURN_API_TOKEN

  if (!keyId || !token) {
    return NextResponse.json({ iceServers: STUN_ONLY, turn: false, reason: 'no_credentials' }, noStore)
  }

  try {
    // لو عارفين الترتيب الصح من طلب سابق، نستخدمه على طول
    const first: [string, string] = cachedOrder === 'swapped' ? [token, keyId] : [keyId, token]
    let res = await askCloudflare(first[0], first[1])
    let usedSwap = cachedOrder === 'swapped'

    if (res.status === 404 && cachedOrder === null) {
      const alt = await askCloudflare(token, keyId)
      if (alt.ok) { res = alt; usedSwap = true }
      else {
        const a = (await res.text().catch(() => '')).slice(0, 200)
        const b = (await alt.text().catch(() => '')).slice(0, 200)
        return NextResponse.json({
          iceServers: STUN_ONLY, turn: false, reason: 'cf_404',
          diag: { as_configured: a, if_swapped: b, key_id_len: keyId.length, token_len: token.length },
        }, noStore)
      }
    }

    if (!res.ok) {
      const cfBody = (await res.text().catch(() => '')).slice(0, 200)
      cachedOrder = null
      return NextResponse.json({
        iceServers: STUN_ONLY, turn: false, reason: `cf_${res.status}`,
        diag: { cf_error: cfBody },
      }, noStore)
    }

    cachedOrder = usedSwap ? 'swapped' : 'normal'

    const json = (await res.json()) as { iceServers?: IceServer[] }
    const raw = Array.isArray(json?.iceServers) ? json.iceServers : []

    // بورت 53 محجوب في المتصفحات وبيعمل timeout — نشيله من القايمة
    const servers = raw
      .map((s) => {
        const urls = (Array.isArray(s.urls) ? s.urls : [s.urls]).filter((u) => !!u && !u.includes(':53'))
        return { ...s, urls }
      })
      .filter((s) => s.urls.length > 0)

    if (servers.length === 0) {
      return NextResponse.json({ iceServers: STUN_ONLY, turn: false, reason: 'empty' }, noStore)
    }

    return NextResponse.json({ iceServers: [...servers, ...STUN_ONLY], turn: true, swapped: usedSwap }, noStore)
  } catch {
    return NextResponse.json({ iceServers: STUN_ONLY, turn: false, reason: 'fetch_failed' }, noStore)
  }
}
