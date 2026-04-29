import { ImageResponse } from 'next/og'

// Maskable icon 192x192 — white frame with logo inside, on green outer.
// Android adaptive icons crop to various shapes, so the inner white frame
// keeps the logo safely visible regardless of the device's mask.
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
            borderRadius: 24,
          }}
        >
          <div
            style={{
              fontSize: 90,
              fontWeight: 700,
              color: '#1F5F3F',
              lineHeight: 1,
            }}
          >
            م
          </div>
          <div
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: '#1F5F3F',
              letterSpacing: '0.25em',
              marginTop: 4,
            }}
          >
            MADMONA
          </div>
        </div>
      </div>
    ),
    { width: 192, height: 192 }
  )
}
