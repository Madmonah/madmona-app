import { ImageResponse } from 'next/og'

// PWA icon at 192x192 — fetches the actual Madmona logo from /madmona-logo.png
// at build/request time and renders it on a cream background. This way the
// PWA install icon shows the real brand logo rather than a text-based fallback.
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
          width={160}
          height={160}
          style={{ objectFit: 'contain' }}
        />
      </div>
    ),
    { width: 192, height: 192 }
  )
}
