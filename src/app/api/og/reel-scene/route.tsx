// src/app/api/og/reel-scene/route.tsx
// Generates a single PNG frame for a reel scene with Arabic text + Madmona branding.
// Edge Runtime + @vercel/og for proper Arabic text shaping.

import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

// Cache the Cairo font (Arabic) for the lifetime of the edge worker
let cairoFontCache: ArrayBuffer | null = null
async function loadCairoFont(): Promise<ArrayBuffer> {
  if (cairoFontCache) return cairoFontCache
  const url = 'https://fonts.gstatic.com/s/cairo/v28/SLXVc1nY6Hkvalq6CKAa44Iv.ttf'
  const r = await fetch(url, { cache: 'force-cache' })
  cairoFontCache = await r.arrayBuffer()
  return cairoFontCache
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const text = searchParams.get('text') ?? 'مضمونة'
  const sceneType = searchParams.get('type') ?? 'middle'  // 'hook' | 'middle' | 'cta'
  const sceneIndex = parseInt(searchParams.get('index') ?? '0', 10)

  const cairo = await loadCairoFont()

  // Variation: tweak gradient angle per scene for visual progression
  const gradients: Record<string, string> = {
    hook: 'linear-gradient(180deg, #0F3324 0%, #1F5F3F 100%)',
    middle: `linear-gradient(${135 + sceneIndex * 15}deg, #1F5F3F 0%, #2d7a52 100%)`,
    cta: 'linear-gradient(180deg, #1F5F3F 0%, #B8860B 100%)',
  }

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
          background: gradients[sceneType] ?? gradients.middle,
          color: '#FAF7F0',
          fontFamily: 'Cairo',
          padding: '120px 80px',
          position: 'relative',
        }}
      >
        {/* Subtle decorative circles */}
        <div style={{
          position: 'absolute',
          top: -200,
          right: -200,
          width: 600,
          height: 600,
          borderRadius: 999,
          background: 'rgba(184, 134, 11, 0.15)',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute',
          bottom: -300,
          left: -300,
          width: 700,
          height: 700,
          borderRadius: 999,
          background: 'rgba(184, 134, 11, 0.1)',
          display: 'flex',
        }} />

        {/* Top brand strip */}
        <div style={{
          position: 'absolute',
          top: 60,
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#B8860B',
          fontSize: 36,
          fontWeight: 700,
          letterSpacing: 6,
        }}>
          MADMONA · مضمونة
        </div>

        {/* Main text */}
        <div
          style={{
            display: 'flex',
            textAlign: 'center',
            fontSize: text.length > 30 ? 70 : 100,
            fontWeight: 900,
            lineHeight: 1.3,
            color: '#FAF7F0',
            textShadow: '0 4px 20px rgba(0,0,0,0.3)',
            direction: 'rtl',
          }}
        >
          {text}
        </div>

        {/* Bottom brand line */}
        <div style={{
          position: 'absolute',
          bottom: 80,
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 12,
        }}>
          <div style={{
            display: 'flex',
            background: 'rgba(184, 134, 11, 0.9)',
            color: '#0F3324',
            fontSize: 32,
            fontWeight: 700,
            padding: '12px 40px',
            borderRadius: 999,
          }}>
            احنا بتوع الإيجار
          </div>
          <div style={{
            display: 'flex',
            color: 'rgba(250, 247, 240, 0.7)',
            fontSize: 24,
            letterSpacing: 2,
          }}>
            madmonacairo.com
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1920,
      fonts: [
        { name: 'Cairo', data: cairo, weight: 700, style: 'normal' },
      ],
    }
  )
}
