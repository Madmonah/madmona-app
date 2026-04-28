import { ImageResponse } from 'next/og'

// Auto-generated Open Graph image (1200x630) used when the site is shared
// on WhatsApp, Facebook, Twitter, LinkedIn, etc. Designed to match the brand:
// deep green background, gold accent, white wordmark, Aesop/Byredo aesthetic.

export const runtime = 'edge'
export const contentType = 'image/png'
export const size = {
  width: 1200,
  height: 630,
}

export const alt = 'مضمونة - مساحة عمل بوتيك في مصر الجديدة'

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
          backgroundColor: '#1F5F3F',
          backgroundImage:
            'radial-gradient(circle at 30% 20%, rgba(184, 134, 11, 0.15) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(255, 255, 255, 0.05) 0%, transparent 50%)',
          fontFamily: 'system-ui, sans-serif',
          padding: 80,
        }}
      >
        {/* Subtle gold accent bar at the top */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            backgroundColor: '#B8860B',
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
            color: '#B8860B',
            letterSpacing: '0.4em',
            marginBottom: 60,
            display: 'flex',
          }}
        >
          MADMONA
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 44,
            color: 'rgba(255, 255, 255, 0.9)',
            fontWeight: 400,
            marginBottom: 16,
            display: 'flex',
          }}
        >
          مساحتك اللي بتخصك
        </div>

        <div
          style={{
            fontSize: 28,
            color: 'rgba(255, 255, 255, 0.6)',
            fontWeight: 400,
            display: 'flex',
          }}
        >
          Coworking · Meeting Rooms · Private Office
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
          <span>مصر الجديدة، القاهرة</span>
          <span style={{ color: '#B8860B' }}>·</span>
          <span>madmonacairo.com</span>
        </div>
      </div>
    ),
    { ...size }
  )
}
