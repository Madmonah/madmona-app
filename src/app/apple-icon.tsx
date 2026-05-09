import { ImageResponse } from 'next/og'

// Apple touch icon (180x180) — shown when users tap "Add to Home Screen" on
// iOS. iOS doesn't support maskable icons, so we go with the same compact
// composition as the maskable: white inner square on a green outer with the
// real Madmona logo, sized to feel premium next to other native app icons.
export const runtime = 'edge'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://madmonacairo.com'

export default function AppleIcon() {
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
          width={150}
          height={150}
          style={{ objectFit: 'contain' }}
        />
      </div>
    ),
    { ...size }
  )
}
