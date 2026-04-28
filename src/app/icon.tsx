import { ImageResponse } from 'next/og'

// Auto-generated favicon — a green square with a white "م" (Arabic letter
// meem, the first letter of مضمونة). Simple and recognizable at 32x32.
export const runtime = 'edge'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

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
          backgroundColor: '#1F5F3F',
          color: '#FFFFFF',
          fontSize: 24,
          fontWeight: 700,
          borderRadius: 6,
        }}
      >
        م
      </div>
    ),
    { ...size }
  )
}
