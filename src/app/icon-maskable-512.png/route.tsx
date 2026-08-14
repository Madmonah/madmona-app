import { ImageResponse } from 'next/og'

// Maskable icon 512x512 — same composition as 192 but high-res for splash.
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
            borderRadius: 64,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${SITE_URL}/madmona-logo.png`}
            alt="Madmona"
            width={290}
            height={290}
            style={{ objectFit: 'contain' }}
          />
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  )
}
