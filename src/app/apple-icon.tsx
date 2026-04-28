import { ImageResponse } from 'next/og'

// Apple touch icon — shown when users add the site to their iPhone home
// screen. 180x180 with the same brand styling as the favicon but bigger.
export const runtime = 'edge'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
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
          color: '#FFFFFF',
          fontWeight: 700,
        }}
      >
        <div style={{ fontSize: 110, lineHeight: 1, marginTop: -8 }}>م</div>
        <div
          style={{
            fontSize: 14,
            color: '#B8860B',
            letterSpacing: '0.3em',
            marginTop: 4,
          }}
        >
          MADMONA
        </div>
      </div>
    ),
    { ...size }
  )
}
