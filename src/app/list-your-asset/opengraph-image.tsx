import { ImageResponse } from 'next/og'

// Open Graph image for /list-your-asset
// This renders dynamically when WhatsApp / FB / Twitter scrape the page.
// 1200×630 is the standard og:image size — fits all major social platforms.

export const runtime = 'edge'
export const alt = 'أجر معانا على مضمونة - 10% عمولة بس'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #2B4521 0%, #164d32 100%)',
          color: '#FFFFFF',
          fontFamily: 'sans-serif',
          padding: 80,
          position: 'relative',
        }}
      >
        {/* Logo badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 48,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              background: '#FFFFFF',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2B4521',
              fontSize: 48,
              fontWeight: 700,
            }}
          >
            م
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 36, fontWeight: 700 }}>مضمونة</div>
            <div style={{ fontSize: 18, color: '#2FA084', letterSpacing: 4 }}>MADMONA</div>
          </div>
        </div>

        {/* Main headline */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            textAlign: 'center',
            marginBottom: 24,
            lineHeight: 1.2,
          }}
        >
          أجر معانا في 60 ثانية
        </div>

        {/* Subhead */}
        <div
          style={{
            fontSize: 30,
            color: 'rgba(255, 255, 255, 0.85)',
            textAlign: 'center',
            marginBottom: 56,
            lineHeight: 1.4,
            maxWidth: 900,
          }}
        >
          احنا بتوع التشغيل مش الإعلانات — تيمنا يقفل الصفقة
        </div>

        {/* Three pillars */}
        <div style={{ display: 'flex', gap: 24 }}>
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              borderRadius: 20,
              padding: '20px 32px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: 40, fontWeight: 700, color: '#2FA084' }}>10%</div>
            <div style={{ fontSize: 20 }}>عمولة بس</div>
          </div>
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              borderRadius: 20,
              padding: '20px 32px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: 40, fontWeight: 700, color: '#2FA084' }}>AI</div>
            <div style={{ fontSize: 20 }}>matching ذكي</div>
          </div>
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              borderRadius: 20,
              padding: '20px 32px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: 40, fontWeight: 700, color: '#2FA084' }}>2019</div>
            <div style={{ fontSize: 20 }}>تأسسنا من</div>
          </div>
        </div>

        {/* Footer URL */}
        <div
          style={{
            position: 'absolute',
            bottom: 32,
            fontSize: 22,
            color: 'rgba(255, 255, 255, 0.6)',
            letterSpacing: 2,
          }}
        >
          madmonacairo.com
        </div>
      </div>
    ),
    { ...size }
  )
}
