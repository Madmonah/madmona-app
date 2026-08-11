'use client'
// src/app/real-estate/projects/[slug]/ProjectGallery.tsx
// =====================================================================
// 🖼️ معرض صور المشروع — صورة كبيرة + مصغّرات + lightbox + فيديو.
// كل الصور من ميديا المشروع (media[]) — الغلاف بيتحط الأول لو مش جوّه.
// الفيديو: يوتيوب (iframe) أو ملف مرفوع (<video>).
// =====================================================================
import { useState, useCallback, useEffect } from 'react'
import { X, PlayCircle, ChevronLeft, ChevronRight, Building2 } from 'lucide-react'
import type { MediaItem } from '@/lib/projects'

/** رابط يوتيوب → embed. أي حاجة تانية = ملف فيديو عادي */
function ytEmbed(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  )
  return m ? `https://www.youtube.com/embed/${m[1]}` : null
}

export default function ProjectGallery({
  cover, images, videoUrl, title,
}: {
  cover: string | null
  images: MediaItem[]
  videoUrl: string | null
  title: string
}) {
  // الغلاف الأول، وبعدين باقي الصور (من غير تكرار)
  const urls = [
    ...(cover ? [cover] : []),
    ...images.map((m) => m.url).filter((u) => u !== cover),
  ]

  const [active, setActive] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const [playing, setPlaying] = useState(false)

  const next = useCallback(
    () => setActive((i) => (i + 1) % urls.length),
    [urls.length],
  )
  const prev = useCallback(
    () => setActive((i) => (i - 1 + urls.length) % urls.length),
    [urls.length],
  )

  // ⌨️ التنقل بالكيبورد جوّه الـlightbox
  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(false)
      // RTL: السهم الشمال = الصورة اللي بعدها
      if (e.key === 'ArrowLeft') next()
      if (e.key === 'ArrowRight') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, next, prev])

  const embed = videoUrl ? ytEmbed(videoUrl) : null

  // مفيش أي صورة؟ بانر بهوية مضمونة — مش صفحة فاضية
  if (urls.length === 0) {
    return (
      <>
        <div className="w-full h-64 md:h-80 rounded-2xl flex flex-col items-center justify-center gap-3 text-center px-6" style={{ background: '#12261F' }}>
          <Building2 className="w-12 h-12 text-[#F4EFE4]/90" strokeWidth={1.5} />
          <p className="text-[#F4EFE4] font-bold text-lg">{title}</p>
        </div>
        {videoUrl && (
          <VideoBlock embed={embed} url={videoUrl} playing={playing} setPlaying={setPlaying} />
        )}
      </>
    )
  }

  return (
    <>
      {/* الصورة الكبيرة */}
      <div className="relative rounded-2xl overflow-hidden bg-gray-100 group">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={urls[active]}
          alt={title}
          className="w-full h-64 md:h-96 object-cover cursor-zoom-in"
          onClick={() => setLightbox(true)}
        />

        {urls.length > 1 && (
          <>
            <NavBtn side="right" onClick={prev} />
            <NavBtn side="left" onClick={next} />
            <span className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
              {active + 1} / {urls.length}
            </span>
          </>
        )}

        {videoUrl && !playing && (
          <button
            onClick={() => setPlaying(true)}
            className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/65 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-black/85 transition-colors"
          >
            <PlayCircle className="w-4 h-4" /> شغّل الفيديو
          </button>
        )}
      </div>

      {/* المصغّرات */}
      {urls.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 -mx-1 px-1">
          {urls.map((u, i) => (
            <button
              key={u + i}
              onClick={() => setActive(i)}
              className={`shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                i === active
                  ? 'border-[#2B4521] ring-2 ring-[#2B4521]/20'
                  : 'border-transparent opacity-65 hover:opacity-100'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" className="w-20 h-16 object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {videoUrl && (
        <VideoBlock embed={embed} url={videoUrl} playing={playing} setPlaying={setPlaying} />
      )}

      {/* 🔍 Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            onClick={() => setLightbox(false)}
            className="absolute top-4 left-4 text-white/80 hover:text-white p-2"
            aria-label="اقفل"
          >
            <X className="w-7 h-7" />
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urls[active]}
            alt={title}
            className="max-w-full max-h-[88vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />

          {urls.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev() }}
                className="absolute right-4 text-white/70 hover:text-white p-3"
                aria-label="السابق"
              >
                <ChevronRight className="w-9 h-9" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next() }}
                className="absolute left-4 text-white/70 hover:text-white p-3"
                aria-label="التالي"
              >
                <ChevronLeft className="w-9 h-9" />
              </button>
              <span className="absolute bottom-5 text-white/70 text-sm font-medium">
                {active + 1} / {urls.length}
              </span>
            </>
          )}
        </div>
      )}
    </>
  )
}

function NavBtn({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight
  return (
    <button
      onClick={onClick}
      className={`absolute ${side === 'left' ? 'left-2' : 'right-2'} top-1/2 -translate-y-1/2 bg-black/45 hover:bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity`}
      aria-label={side === 'left' ? 'التالي' : 'السابق'}
    >
      <Icon className="w-5 h-5" />
    </button>
  )
}

function VideoBlock({
  embed, url, playing, setPlaying,
}: {
  embed: string | null
  url: string
  playing: boolean
  setPlaying: (v: boolean) => void
}) {
  if (!playing) {
    return (
      <button
        onClick={() => setPlaying(true)}
        className="mt-3 flex items-center justify-center gap-2 w-full bg-white border-2 border-[#2B4521]/20 text-[#2B4521] font-semibold py-3.5 rounded-2xl hover:bg-[#2B4521]/5 hover:border-[#2B4521]/40 transition-all"
      >
        <PlayCircle className="w-5 h-5" />
        شوف فيديو المشروع
      </button>
    )
  }
  return (
    <div className="mt-3 rounded-2xl overflow-hidden bg-black">
      {embed ? (
        <iframe
          src={`${embed}?autoplay=1`}
          title="فيديو المشروع"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full aspect-video"
        />
      ) : (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video src={url} controls autoPlay playsInline className="w-full max-h-[70vh]" />
      )}
    </div>
  )
}
