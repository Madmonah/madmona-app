'use client'
// src/components/DeveloperLogosMarquee.tsx
// =====================================================================
// 🏛️ شريط لوجوهات المطورين المتعاقدين — marquee بيلف لوحده بنعومة.
// بيجيب اللوجوهات دينامك من /api/developer-logos (اللي بيقرا مجلد
// public/developers/). ترفع أو تشيل أي لوجو → الشريط يتحدّث لوحده.
// بيخفي نفسه لو مفيش لوجوهات (fail-safe).
// =====================================================================
import { useEffect, useState } from 'react'

type Logo = { src: string; name: string }

export default function DeveloperLogosMarquee({ multiRow = false }: { multiRow?: boolean }) {
  const [logos, setLogos] = useState<Logo[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/developer-logos')
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return
        setLogos(Array.isArray(d?.logos) ? d.logos : [])
        setReady(true)
      })
      .catch(() => {
        if (alive) setReady(true)
      })
    return () => {
      alive = false
    }
  }, [])

  if (!ready || logos.length === 0) return null

  // (29 Jul 2026) الموبايل بس (multiRow): نقسّم اللوجوهات لشرايط، كل شريط 5 شركات،
  // كل شريط مفصول لوحده وبيتحرك في عكس اتجاه اللي قبله. الديسكتوب: شريط واحد زي الأول.
  const ROW_SIZE = 5
  const rows: Logo[][] = []
  if (multiRow) {
    for (let i = 0; i < logos.length; i += ROW_SIZE) {
      rows.push(logos.slice(i, i + ROW_SIZE))
    }
  } else {
    rows.push(logos)
  }

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gray-200" />
        <p className="text-[10px] md:text-[11px] font-bold tracking-[0.2em] uppercase text-gray-400 whitespace-nowrap">
          نخبة المطورين المتعاقدين
        </p>
        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gray-200" />
      </div>

      <div className="flex flex-col">
        {rows.map((row, rowIdx) => {
          // نطوّل محتوى الشريط لحد 10 عناصر على الأقل عشان اللف يفضل متواصل
          // حتى لو الشريط فيه لوجوهات قليلة، وبعدين نكرّره مرتين للـ loop.
          const base: Logo[] = []
          while (base.length < 10) base.push(...row)
          const loop = [...base, ...base]
          const reverse = rowIdx % 2 === 1
          return (
            <div
              key={`row-${rowIdx}`}
              className={`marquee-mask relative overflow-hidden py-3 ${rowIdx > 0 ? 'border-t border-gray-100' : ''}`}
            >
              <div
                className={`marquee-track flex items-center gap-10 md:gap-14 w-max ${reverse ? 'marquee-reverse' : ''}`}
              >
                {loop.map((logo, i) => (
                  <div
                    key={`${logo.src}-${i}`}
                    className="shrink-0 flex items-center justify-center h-10 md:h-12 opacity-90 hover:opacity-100 transition-opacity"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logo.src}
                      alt={logo.name}
                      className="h-full w-auto object-contain hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      draggable={false}
                    />
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <style jsx>{`
        .marquee-mask {
          -webkit-mask-image: linear-gradient(
            to right,
            transparent 0,
            #000 8%,
            #000 92%,
            transparent 100%
          );
          mask-image: linear-gradient(
            to right,
            transparent 0,
            #000 8%,
            #000 92%,
            transparent 100%
          );
        }
        .marquee-track {
          animation: marquee-scroll 32s linear infinite;
        }
        .marquee-track.marquee-reverse {
          animation-name: marquee-scroll-reverse;
        }
        .marquee-mask:hover .marquee-track {
          animation-play-state: paused;
        }
        @keyframes marquee-scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        @keyframes marquee-scroll-reverse {
          from {
            transform: translateX(-50%);
          }
          to {
            transform: translateX(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .marquee-track {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}
