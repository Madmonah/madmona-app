import { ImageResponse } from 'next/og'

// كارت المشاركة الديناميكي لـ«شير واكسب» — بيظهر في معاينة الواتساب/فيسبوك
export const runtime = 'edge'

const GENIE = 'https://res.cloudinary.com/duxfgqioc/image/upload/madmona/mascots/genie.png'
const fontP = fetch(
  'https://github.com/google/fonts/raw/main/ofl/cairo/Cairo%5Bslnt%2Cwght%5D.ttf'
).then((r) => r.arrayBuffer())

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = (url.searchParams.get('code') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)
  let name = 'صاحبك'
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/eksab_code_info`, {
      method: 'POST',
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_code: code }),
    })
    const j = await r.json()
    if (j && j.name) name = j.name
  } catch {}
  const font = await fontP

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#14231E 0%,#1F6F5F 100%)', color: '#fff', fontFamily: 'Cairo' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={GENIE} width={180} height={180} style={{ borderRadius: 999, border: '5px solid rgba(255,255,255,.4)' }} alt="" />
        <div style={{ display: 'flex', fontSize: 58, fontWeight: 700, marginTop: 26 }}>{name + ' بيعزمك على شات مضمونة'}</div>
        <div style={{ display: 'flex', fontSize: 32, color: '#8FE3C8', marginTop: 10 }}>جروبات ومكالمات — تسجيل بالواتساب في ثواني</div>
        <div style={{ display: 'flex', direction: 'ltr', marginTop: 30, background: 'linear-gradient(90deg,#d4a017,#2FA084)', borderRadius: 999, padding: '14px 44px', fontSize: 30, fontWeight: 700 }}>{'madmonacairo.com/r/' + code}</div>
        <div style={{ display: 'flex', fontSize: 22, opacity: 0.7, marginTop: 22 }}>معاملاتك مضمونة</div>
      </div>
    ),
    { width: 1200, height: 630, fonts: [{ name: 'Cairo', data: font, weight: 700, style: 'normal' }] }
  )
}
