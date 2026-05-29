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

type TrackKey = 'rentals' | 'services' | 'hybrid' | 'restaurants' | 'products'

const TRACK_LABELS: Record<TrackKey, { labelKey: string; emoji: string; sublabel: string }> = {
  rentals:  { labelKey: 'tracktab.rentals',  emoji: '🏠', sublabel: 'RENTALS'  },
  services: { labelKey: 'tracktab.services', emoji: '🛎️', sublabel: 'SERVICES' },
  hybrid:   { labelKey: 'tracktab.hybrid',   emoji: '💍', sublabel: 'EVENTS'   },
  restaurants: { labelKey: 'tracktab.restaurants', emoji: '🍽️', sublabel: 'RESTAURANTS' },
  products: { labelKey: 'tracktab.products', emoji: '🛍️', sublabel: 'PRODUCTS' },
}

const DEFAULT_FALLBACK = 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=600&q=80&auto=format&fit=crop'

export default function CategoryTrackTabs({ categories }: { categories: Category[] }) {
  const { t, lang } = useT()
  const [active, setActive] = useState<TrackKey>('rentals')

  const grouped: Record<TrackKey, Category[]> = {
    rentals:  categories.filter(c => c.track === 'rentals'),
    services: categories.filter(c => c.track === 'services'),
    hybrid:   categories.filter(c => c.track === 'hybrid'),
    restaurants: categories.filter(c => c.track === 'restaurants'),
    products: categories.filter(c => c.track === 'products'),
  }

  const visible = grouped[active]

  return (
    <div>
      {/* Tab switcher */}
      <div className="flex gap-2 mb-6 md:mb-8 overflow-x-auto pb-1 -mx-1 px-1">
        {(Object.keys(TRACK_LABELS) as TrackKey[]).map(key => {
          const isActive = active === key
          const count = grouped[key].length
          if (count === 0) return null
          return (
            <button
              key={key}
              onClick={() => setActive(key)}
              type="button"
              className={`flex-shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold transition-all border-2 ${
                isActive
                  ? 'bg-[#1F6F5F] text-white border-[#1F6F5F] shadow-soft'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-[#1F6F5F]'
              }`}
            >
              <span className="text-base">{TRACK_LABELS[key].emoji}</span>
              <span>{t(TRACK_LABELS[key].labelKey)}</span>
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20' : 'bg-gray-100'
                }`}
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
