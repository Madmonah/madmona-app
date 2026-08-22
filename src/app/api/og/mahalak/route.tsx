// src/app/api/og/mahalak/route.tsx
// صورة اللينك بريفيو لصفحة /mahalak («اكتب اسم محلك»).
// 1200×630 — المقاس اللي واتساب وفيسبوك ولينكدإن كلهم بيقروه.
// Edge + @vercel/og. نفس نمط تحميل خط Cairo المستخدم في /api/og/reel-scene
// (لو التحميل فشل بنقع على sans-serif وبنكمّل من غير ما الصورة تقع).

import { ImageResponse } from 'next/og'

export const runtime = 'edge'

let cairoCache: ArrayBuffer | null | 'failed' = null

async function loadCairo(): Promise<ArrayBuffer | null> {
  if (cairoCache === 'failed') return null
  if (cairoCache) return cairoCache
  try {
    const url = 'https://fonts.gstatic.com/s/cairo/v28/SLXVc1nY6Hkvalq6CKAa44Iv.ttf'
    const r = await fetch(url, { signal: AbortSignal.timeout(5000), cache: 'force-cache' })
    if (!r.ok) { cairoCache = 'failed'; return null }
    cairoCache = await r.arrayBuffer()
    return cairoCache
  } catch {
    cairoCache = 'failed'
    return null
  }
}

function Pill({ label }: { label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        border: '1px solid rgba(155,231,188,0.34)',
        borderRadius: 999,
        padding: '10px 22px',
        fontSize: 24,
        color: '#B6E7CF',
      }}
    >
      {label}
    </div>
  )
}

export async function GET() {
  const cairo = await loadCairo()

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '58px 64px',
          background: '#07120F',
          backgroundImage:
            'radial-gradient(60% 70% at 88% 4%, rgba(47,160,132,0.36), transparent 62%), radial-gradient(48% 54% at 6% 26%, rgba(212,160,23,0.16), transparent 68%)',
          color: '#EEF7F3',
          fontFamily: cairo ? 'Cairo' : 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, alignSelf: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ fontSize: 30, fontWeight: 700 }}>مضمونة</div>
            <div style={{ fontSize: 15, color: '#7FCBB0', letterSpacing: 4 }}>MADMONA</div>
          </div>
          <div
            style={{
              width: 62,
              height: 62,
              borderRadius: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(140deg,#D4A017,#2FA084 58%,#1F6F5F)',
              color: '#fff',
              fontSize: 34,
              fontWeight: 700,
            }}
          >
            م
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.12, textAlign: 'right' }}>
            اكتب اسم محلك
          </div>
          <div
            style={{
              fontSize: 76,
              fontWeight: 700,
              lineHeight: 1.12,
              color: '#F2CE6B',
              textAlign: 'right',
            }}
          >
            وشوفه على النت
          </div>
          <div
            style={{
              fontSize: 27,
              color: 'rgba(196,222,212,0.82)',
              marginTop: 22,
              textAlign: 'right',
              maxWidth: 900,
              lineHeight: 1.5,
            }}
          >
            ارفع لوجوك — واحنا نطلّع منه ألوان هويتك ونبني صفحة بيزنسك في أقل من دقيقة
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <div style={{ fontSize: 22, color: 'rgba(196,222,212,0.6)', letterSpacing: 1 }}>
            madmonacairo.com/mahalak
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Pill label="مجاني" />
            <Pill label="من غير تسجيل" />
            <Pill label="٦٠ ثانية" />
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: cairo
        ? [{ name: 'Cairo', data: cairo, weight: 700 as const, style: 'normal' as const }]
        : undefined,
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      },
    },
  )
}
