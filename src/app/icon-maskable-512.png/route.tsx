import { ImageResponse } from 'next/og'

// Maskable icon 512x512 — same composition as 192 but high-res for splash.
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
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1F5F3F',
        }}
      >
        <div
          style={{
            width: '70%',
            height: '70%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FFFFFF',
            borderRadius: 64,
          }}
        >
          <div
            style={{
              fontSize: 240,
              fontWeight: 700,
              color: '#1F5F3F',
              lineHeight: 1,
            }}
          >
            م
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: '#1F5F3F',
              letterSpacing: '0.3em',
              marginTop: 10,
            }}
          >
            MADMONA
          </div>
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  )
}
