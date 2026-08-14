import { ImageResponse } from 'next/og'

// Maskable icon 192x192 — green outer with the real Madmona logo on a white
// inner safe-zone. Android adaptive icons crop to various shapes (circle,
// squircle, rounded square), so the inner padded white frame keeps the
// wordmark visible regardless of the device mask.
export const runtime = 'edge'
export const contentType = 'image/png'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://madmonacairo.com'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#059669',
        }}
      >
        <div
          style={{
            width: '70%',
            height: '70%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FFFFFF',
            borderRadius: 24,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${SITE_URL}/madmona-logo.png`}
            alt="Madmona"
            width={110}
            height={110}
            style={{ objectFit: 'contain' }}
          />
        </div>
      </div>
    ),
    { width: 192, height: 192 }
  )
}
