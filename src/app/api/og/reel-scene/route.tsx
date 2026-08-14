// src/app/api/og/reel-scene/route.tsx
// Generates a single PNG frame for a reel scene with Madmona branding.
// Edge Runtime + @vercel/og.
// Tries to load Cairo (Arabic) font; falls back to default if fetch fails.

import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

// Cairo font cache per-edge-worker (so we don't re-fetch on every request)
let cairoFontCache: ArrayBuffer | null | 'failed' = null

async function loadCairoFont(): Promise<ArrayBuffer | null> {
  if (cairoFontCache === 'failed') return null
  if (cairoFontCache) return cairoFontCache

  try {
    // Using Google Fonts CSS API to get the actual font URL, then fetch the TTF
    const fontUrl = 'https://fonts.gstatic.com/s/cairo/v28/SLXVc1nY6Hkvalq6CKAa44Iv.ttf'
    const r = await fetch(fontUrl, {
      signal: AbortSignal.timeout(5000),
      cache: 'force-cache',
    })
    if (!r.ok) {
      cairoFontCache = 'failed'
      return null
    }
    cairoFontCache = await r.arrayBuffer()
    return cairoFontCache
  } catch {
    cairoFontCache = 'failed'
    return null
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const text = searchParams.get('text') ?? 'مضمونة'
  const sceneType = (searchParams.get('type') ?? 'middle') as 'hook' | 'middle' | 'cta'
  const sceneIndex = parseInt(searchParams.get('index') ?? '0', 10)

  // Try to load Cairo. If it fails, we'll skip Arabic text overlay
  // and just show Latin "MADMONA" branding.
  const cairo = await loadCairoFont()

  const gradients: Record<string, string> = {
    hook: 'linear-gradient(180deg, #0F3324 0%, #059669 100%)',
    middle: `linear-gradient(${135 + sceneIndex * 15}deg, #059669 0%, #34D399 100%)`,
    cta: 'linear-gradient(180deg, #059669 0%, #2FA084 100%)',
  }

  const fonts = cairo
    ? [{ name: 'Cairo', data: cairo, weight: 700 as const, style: 'normal' as const }]
    : undefined

  try {
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
            fontFamily: cairo ? 'Cairo' : 'sans-serif',
            padding: '120px 80px',
            position: 'relative',
          }}
        >
          {/* Decorative circles */}
          <div style={{
            position: 'absolute', top: -200, right: -200, width: 600, height: 600,
            borderRadius: 999, background: 'rgba(43, 69, 33,0.18)', display: 'flex',
          }} />
          <div style={{
            position: 'absolute', bottom: -300, left: -300, width: 700, height: 700,
            borderRadius: 999, background: 'rgba(43, 69, 33,0.12)', display: 'flex',
          }} />

          {/* Top brand */}
          <div style={{
            position: 'absolute', top: 80, left: 0, right: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#2FA084', fontSize: 44, fontWeight: 800, letterSpacing: 8,
          }}>
            MADMONA
          </div>

          {/* Main text — only if Cairo loaded; else show big Latin label per type */}
          {cairo ? (
            <div style={{
              display: 'flex', textAlign: 'center',
              fontSize: text.length > 30 ? 70 : 100,
              fontWeight: 900, lineHeight: 1.3,
              color: '#FAF7F0',
              direction: 'rtl',
            }}>
              {text}
            </div>
          ) : (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30,
            }}>
              <div style={{
                display: 'flex', fontSize: 140, fontWeight: 900,
                color: '#FAF7F0', letterSpacing: 6,
              }}>
                {sceneType === 'hook' ? 'مضمونة' : sceneType === 'cta' ? 'احجز' : 'إيجار'}
              </div>
              <div style={{
                display: 'flex', fontSize: 50, fontWeight: 700,
                color: '#2FA084', letterSpacing: 4,
              }}>
                Scene {sceneIndex + 1}
              </div>
            </div>
          )}

          {/* Bottom brand */}
          <div style={{
            position: 'absolute', bottom: 100, left: 0, right: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
          }}>
            <div style={{
              display: 'flex', background: 'rgba(43, 69, 33,0.95)',
              color: '#0F3324', fontSize: 36, fontWeight: 800,
              padding: '14px 48px', borderRadius: 999,
            }}>
              madmonacairo.com
            </div>
          </div>
        </div>
      ),
      {
        width: 1080,
        height: 1920,
        ...(fonts ? { fonts } : {}),
      }
    )
  } catch (e) {
    // Final fallback: pure colored rectangle
    return new ImageResponse(
      (
        <div style={{
          width: '100%', height: '100%',
          background: '#059669', color: '#FAF7F0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 120, fontWeight: 900, letterSpacing: 8,
        }}>
          MADMONA
        </div>
      ),
      { width: 1080, height: 1920 }
    )
  }
}
