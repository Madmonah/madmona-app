import type { Metadata } from 'next'

// «شير واكسب» — صفحة هبوط لينك الدعوة الشخصي /r/[code]
// معاينة الواتساب = كارت OG ديناميكي باسم المعزِّم (أهم نقطة انتشار)
const BASE = 'https://www.madmonacairo.com'
const GENIE = 'https://res.cloudinary.com/duxfgqioc/image/upload/madmona/mascots/genie.png'

const clean = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)

async function codeInfo(code: string) {
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/eksab_code_info`, {
      method: 'POST',
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_code: code }),
      next: { revalidate: 120 },
    })
    return await r.json()
  } catch { return { ok: false } }
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params
  const safe = clean(code)
  const i = await codeInfo(safe)
  const title = `${i?.name || 'صاحبك'} بيعزمك على شات مضمونة 💚`
  const desc = 'جروبات ومكالمات وتسجيل بالواتساب في ثواني — معاملاتك مضمونة'
  const og = `${BASE}/api/og/eksab?code=${safe}`
  return {
    title,
    description: desc,
    openGraph: { title, description: desc, images: [{ url: og, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description: desc, images: [og] },
  }
}

export default async function EksabLanding({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const safe = clean(code)
  const i = await codeInfo(safe)
  const name = i?.name || 'صاحبك'
  const store = `try{localStorage.setItem('eksab_code','${safe}');document.cookie='eksab_code=${safe}; path=/; max-age=2592000';}catch(e){}`
  return (
    <main dir="rtl" style={{ minHeight: '100dvh', background: 'linear-gradient(135deg,#14231E,#1F6F5F)', color: '#fff', fontFamily: 'Cairo,system-ui,sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
      <img src={GENIE} alt="مضمون" width={132} height={132} style={{ borderRadius: '50%', border: '3px solid rgba(255,255,255,.35)' }} />
      <h1 style={{ fontSize: 29, fontWeight: 900, margin: '18px 0 6px', lineHeight: 1.4 }}>{name} بيعزمك على شات مضمونة 💚</h1>
      <p style={{ fontSize: 16, opacity: 0.92, margin: 0, lineHeight: 1.7 }}>جروبات ومكالمات وكل حاجة مضمونة — تسجيل بالواتساب في ثواني من غير باسورد</p>
      <p style={{ fontSize: 14, color: '#8FE3C8', margin: '12px 0 26px' }}>ولما تسجّل من اللينك ده، {name} ياخد ١٠٠ جنيه رصيد 🎁</p>
      <a href="/login?next=/chat" style={{ background: 'linear-gradient(90deg,#d4a017,#2FA084,#1F6F5F)', color: '#fff', fontWeight: 800, fontSize: 18, padding: '14px 42px', borderRadius: 999, textDecoration: 'none', boxShadow: '0 8px 24px rgba(0,0,0,.35)' }}>ادخل شات مضمونة دلوقتي</a>
      <p style={{ fontSize: 12, opacity: 0.55, marginTop: 26 }}>معاملاتك مضمونة • تُطبَّق شروط «شير واكسب»</p>
      <script dangerouslySetInnerHTML={{ __html: store }} />
    </main>
  )
}
