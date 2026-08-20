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

// ⚠️ لازم تفضل مطابقة لـ images.remotePatterns في next.config.mjs.
// لو ضفت هوست هناك ومضفتوش هنا، الصورة هتشتغل بس من غير تحسين (هتقع على <img>).
const ALLOWED_HOSTS = [
  'media.canva.com',
  'mjhflxpxunwycbiquoig.supabase.co',
  'images.unsplash.com',
  'res.cloudinary.com',
  'assets.wuiltweb.com',
  'yallamenu.shop',
  'graph.facebook.com',
  'dynamic-media-cdn.tripadvisor.com',
  'sharkawy-almaza.com',
  'wikilist.vip',
  'images.deliveryhero.io',
  'ugc.production.linktr.ee',
]

/* 🛡️ (٢٠ أغسطس ٢٠٢٦) SVG **عمره ما يعدّي على optimizer الصور**.
   next/image بيرفض SVG افتراضيًا (`dangerouslyAllowSVG` مقفول عن قصد —
   فتحه بيسمح بـSVG من **أي** دومين مسموح، ومنهم storage اللي المستخدمين
   بيرفعوا عليه، وده باب سكريبت). النتيجة: `/_next/image` بيرجّع **400**
   والصورة **متختفي من غير أي رسالة خطأ** — نفس الفشل الصامت اللي حصل
   يوم ١٦ أغسطس («إعلانات نزلت الصور بتاعتها محطوطة غلط»).

   اتأكدت لايف: كارت المشروع مباشرةً = 200، ومن خلال الـoptimizer = 400.

   الكروت اللي بنولّدها (`/api/project-card/…` و`/api/logo/…`) كلها SVG،
   فبتروح على `<img>` عادي — بتشتغل، والـSVG جوّه `<img>` مابينفّذش سكريبت.
   ⚠️ الفحص ده مبني على **الامتداد والمسار**، مش على الدومين — عشان
   يفضل صح حتى لو حد ضاف دومينّا في `remotePatterns` بعدين. */
function isSvgLike(src: string): boolean {
  if (!src) return false
  const clean = src.split('?')[0].split('#')[0].toLowerCase()
  return clean.endsWith('.svg')
    || clean.includes('/api/project-card/')
    || clean.includes('/api/logo/')
    || src.startsWith('data:image/svg')
}

function isAllowedHost(src: string): boolean {
  if (!src) return false
  if (isSvgLike(src)) return false          // 👈 SVG مايعدّيش على الـoptimizer
  // Local images (start with /)
  if (src.startsWith('/')) return true
  if (src.startsWith('data:') || src.startsWith('blob:')) return false

  try {
    const url = new URL(src)
    return ALLOWED_HOSTS.some(h => url.hostname === h)
      || url.hostname.endsWith('.supabase.co')
      || url.hostname.endsWith('.lovable.app')
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

  // Fallback: regular <img> for unknown hosts.
  // We lose Next's format/size optimization here, but we still keep the two
  // browser-native wins that cost nothing: lazy-loading below-the-fold images
  // and off-main-thread decoding. Without these the fallback path was eagerly
  // downloading every image on the page at full size.
  const { className, style, sizes, fill, width, height, priority, loading, ...imgRest } = rest
  void sizes; void imgRest

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt as string}
      className={className as string}
      style={
        fill
          ? { position: 'absolute', inset: 0, width: '100%', height: '100%', ...(style as React.CSSProperties | undefined) }
          : (style as React.CSSProperties | undefined)
      }
      width={typeof width === 'number' ? width : undefined}
      height={typeof height === 'number' ? height : undefined}
      loading={priority ? 'eager' : (loading as 'eager' | 'lazy' | undefined) ?? 'lazy'}
      decoding="async"
      onError={() => setErrored(true)}
    />
  )
}
