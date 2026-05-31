import { ImageResponse } from 'next/og'

// Auto-generated Open Graph image (1200x630) used when the site is shared
// on WhatsApp, Facebook, Twitter, LinkedIn, etc.
// STRICT palette v3 (May 18 2026): #1F6F5F primary green, #FAFAF7 cream,
// #FFFFFF white only. NO gold/amber/orange/yellow/mint anywhere.

export const runtime = 'edge'
export const contentType = 'image/png'
export const size = {
  width: 1200,
  height: 630,
}

export const alt = 'مضمونة - سوق مصر المضمون'

export default function OpenGraphImage() {
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
          backgroundColor: '#1F6F5F',
          backgroundImage:
            'radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.08) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(255, 255, 255, 0.04) 0%, transparent 50%)',
          fontFamily: 'system-ui, sans-serif',
          padding: 80,
        }}
      >
        {/* Subtle cream accent bar at the top */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            backgroundColor: '#FAFAF7',
          }}
        />

        {/* Arabic wordmark */}
        <div
          style={{
            fontSize: 180,
            fontWeight: 700,
            color: '#FFFFFF',
            letterSpacing: '-0.02em',
            marginBottom: 20,
            display: 'flex',
          }}
        >
          مضمونة
        </div>

        {/* Latin wordmark in small caps */}
        <div
          style={{
            fontSize: 36,
            fontWeight: 500,
            color: 'rgba(255, 255, 255, 0.85)',
            letterSpacing: '0.4em',
            marginBottom: 60,
            display: 'flex',
          }}
        >
          MADMONA
        </div>

        {/* Tagline - الشعار الجديد */}
        <div
          style={{
            fontSize: 52,
            color: '#FFFFFF',
            fontWeight: 500,
            marginBottom: 16,
            display: 'flex',
          }}
        >
          معاملاتك مضمونة
        </div>

        <div
          style={{
            fontSize: 28,
            color: 'rgba(255, 255, 255, 0.65)',
            fontWeight: 400,
            display: 'flex',
          }}
        >
          أجّر · اشتري · خدمات · مطاعم · بيوتي
        </div>

        {/* Bottom location strip */}
        <div
          style={{
            position: 'absolute',
            bottom: 50,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 22,
            color: 'rgba(255, 255, 255, 0.5)',
          }}
        >
          <span>القاهرة، مصر</span>
          <span>·</span>
          <span>madmonacairo.com</span>
        </div>
      </div>
    ),
    { ...size }
  )
}
