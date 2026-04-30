import { ImageResponse } from 'next/og'

// PWA icon at 512x512 — uses the real Madmona logo for high-res splash screens.
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
          backgroundColor: '#FAFAF7',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${SITE_URL}/madmona-logo.png`}
          alt="Madmona"
          width={420}
          height={420}
          style={{ objectFit: 'contain' }}
        />
      </div>
    ),
    { width: 512, height: 512 }
  )
}
