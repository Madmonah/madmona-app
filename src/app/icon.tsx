import { ImageResponse } from 'next/og'

// Favicon (32x32) — small icon shown in the browser tab. Uses the real
// Madmona logo on cream so the brand reads consistently across the site,
// installed PWA, and browser tabs.
export const runtime = 'edge'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://madmonacairo.com'

export default function Icon() {
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
          borderRadius: 6,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${SITE_URL}/madmona-logo.png`}
          alt="Madmona"
          width={28}
          height={28}
          style={{ objectFit: 'contain' }}
        />
      </div>
    ),
    { ...size }
  )
}
