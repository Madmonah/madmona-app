import { ImageResponse } from 'next/og'

// PWA icon at 192x192 — Madmona logo on white background.
// Simple, clean, recognizable.
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
            fontSize: 130,
            fontWeight: 700,
            color: '#1F5F3F',
            lineHeight: 1,
            marginTop: -10,
          }}
        >
          م
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#1F5F3F',
            letterSpacing: '0.25em',
            marginTop: 6,
          }}
        >
          MADMONA
        </div>
      </div>
    ),
    { width: 192, height: 192 }
  )
}
