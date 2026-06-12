'use client'

// src/components/CategoryTrackTabs.tsx
// Client component for switching between rental/service/hybrid category tracks
// on the homepage. Filters the categories grid by track to reduce visual fatigue.
// Added May 16 2026.

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageProvider'

type Category = {
  id: string
  name_ar: string
  name_en: string | null
  slug: string
  icon: string | null
  image_url: string | null
  track: string | null
}

// 4 verticals — same identity & order as the homepage hero (بيع · إيجار · خدمات · مطاعم).
// مناسبات (hybrid/events) is merged into إيجار per the new structure.
type VKey = 'products' | 'rentals' | 'services' | 'restaurants'

const VERTICALS: { key: VKey; ar: string; en: string; emoji: string; accent: string; bg: string; tracks: string[] }[] = [
  { key: 'products',    ar: 'بيع',   en: 'Buy',         emoji: '🛍️', accent: '#3D7BB6', bg: '#D9E7F4', tracks: ['products'] },
  { key: 'rentals',     ar: 'إيجار', en: 'Rent',        emoji: '🏠', accent: '#1F6F5F', bg: '#E7F1ED', tracks: ['rentals', 'hybrid'] },
  { key: 'services',    ar: 'خدمات', en: 'Services',    emoji: '🛠️', accent: '#D4A017', bg: '#FAEFD1', tracks: ['services'] },
  { key: 'restaurants', ar: 'مطاعم', en: 'Restaurants', emoji: '🍽️', accent: '#E26D5C', bg: '#FAE1CB', tracks: ['restaurants'] },
]

const DEFAULT_FALLBACK = 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=600&q=80&auto=format&fit=crop'

export default function CategoryTrackTabs({ categories }: { categories: Category[] }) {
  const { t, lang } = useT()

  const groupOf = (tracks: string[]) => categories.filter(c => tracks.includes(c.track || ''))
  const firstNonEmpty = VERTICALS.find(v => groupOf(v.tracks).length > 0)?.key || 'products'
  const [active, setActive] = useState<VKey>(firstNonEmpty)

  const activeVertical = VERTICALS.find(v => v.key === active) || VERTICALS[0]
  const visible = groupOf(activeVertical.tracks)

  return (
    <div>
      {/* Tab switcher — colourful pills matching the hero verticals */}
      <div className="flex gap-2.5 mb-6 md:mb-8 overflow-x-auto pb-1 -mx-1 px-1">
        {VERTICALS.map(v => {
          const count = groupOf(v.tracks).length
          if (count === 0) return null
          const isActive = active === v.key
          return (
            <button
              key={v.key}
              onClick={() => setActive(v.key)}
              type="button"
              style={{
                background: isActive ? v.accent : '#fff',
                borderColor: isActive ? v.accent : '#E5DFD3',
                color: isActive ? '#fff' : '#1A1A1A',
                boxShadow: isActive ? `0 8px 22px -6px ${v.accent}` : undefined,
              }}
              className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-extrabold transition-all border-2 hover:-translate-y-0.5"
            >
              <span className="text-base leading-none">{v.emoji}</span>
              <span>{lang === 'en' ? v.en : v.ar}</span>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                style={{
                  background: isActive ? 'rgba(255,255,255,.22)' : v.bg,
                  color: isActive ? '#fff' : v.accent,
                }}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Categories grid — square cards, all equal size */}
      {visible.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          {t('tracktab.empty')}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {visible.map(cat => (
            <Link
              key={cat.id}
              href={`/marketplace?category=${cat.slug}`}
              className="group relative block rounded-2xl overflow-hidden no-underline aspect-square"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cat.image_url || DEFAULT_FALLBACK}
                alt={cat.name_ar}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-5">
                {cat.icon && (
                  <span className="mb-2 text-xl md:text-2xl">{cat.icon}</span>
                )}
                <p className="text-white/70 font-bold tracking-[0.2em] uppercase mb-1 text-[9px] md:text-[10px]">
                  {(cat.name_en || cat.slug).toUpperCase()}
                </p>
                <h3 className="font-black text-white leading-tight text-lg md:text-xl">
                  {lang === 'en' && cat.name_en ? cat.name_en : cat.name_ar}
                </h3>
              </div>
              <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowLeft className="w-4 h-4 text-white" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
