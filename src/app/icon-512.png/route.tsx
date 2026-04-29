import { ImageResponse } from 'next/og'

// PWA icon at 512x512 — Madmona logo on white background. High-res for splash screens.
export const runtime = 'edge'
export const contentType = 'image/png'

export async function GET() {
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
          backgroundColor: '#FFFFFF',
        }}
      >
        <div
          style={{
            fontSize: 350,
            fontWeight: 700,
            color: '#1F5F3F',
            lineHeight: 1,
            marginTop: -25,
          }}
        >
          م
        </div>
        <div
          style={{
            fontSize: 38,
            fontWeight: 600,
            color: '#1F5F3F',
            letterSpacing: '0.3em',
            marginTop: 16,
          }}
        >
          MADMONA
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  )
}
