'use client'

import Image, { type ImageProps } from 'next/image'
import { useState } from 'react'

// ============================================================================
// SmartImage — wrapper around next/image that handles Supabase URLs gracefully
//
// Why: next/image needs domains whitelisted in next.config.mjs. We've added
// our Supabase URL there, but if the URL is dynamic or from an unknown host,
// next/image will throw. This component falls back to a regular <img> in
// that case (with the same styling).
//
// Usage:
//   <SmartImage src={url} alt="..." width={400} height={300} className="..." />
//   <SmartImage src={url} alt="..." fill className="object-cover" />
// ============================================================================

const ALLOWED_HOSTS = [
  'media.canva.com',
  'mjhflxpxunwycbiquoig.supabase.co',
  'images.unsplash.com',
]

function isAllowedHost(src: string): boolean {
  if (!src) return false
  // Local images (start with /)
  if (src.startsWith('/')) return true
  if (src.startsWith('data:') || src.startsWith('blob:')) return false

  try {
    const url = new URL(src)
    return ALLOWED_HOSTS.some(h => url.hostname === h || url.hostname.endsWith('.supabase.co'))
  } catch {
    return false
  }
}

interface SmartImageProps extends Omit<ImageProps, 'src'> {
  src: string | null | undefined
  fallback?: React.ReactNode
}

export default function SmartImage({ src, fallback, alt, ...rest }: SmartImageProps) {
  const [errored, setErrored] = useState(false)

  if (!src || errored) {
    return fallback ? <>{fallback}</> : null
  }

  // If the host is whitelisted, use Next.js Image (with optimization)
  if (isAllowedHost(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        onError={() => setErrored(true)}
        {...rest}
      />
    )
  }

  // Fallback: regular <img> for unknown hosts
  // Apply the same className but lose Next/Image optimizations
  const { className, style, sizes, fill, width, height, priority, loading, ...imgRest } = rest
  // Avoid passing Next-specific props to <img>
  void sizes; void fill; void priority; void loading
  void imgRest

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt as string}
      className={className as string}
      style={style as React.CSSProperties | undefined}
      width={typeof width === 'number' ? width : undefined}
      height={typeof height === 'number' ? height : undefined}
      onError={() => setErrored(true)}
    />
  )
}
