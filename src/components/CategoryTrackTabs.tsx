'use client'

// src/components/CategoryTrackTabs.tsx
// Client component for switching between rental/service/hybrid category tracks
// on the homepage. Filters the categories grid by track to reduce visual fatigue.
// Added May 16 2026.

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageProvider'
import { catNameFor, groupNameFor } from '@/lib/i18n/catName'

type Category = {
  id: string
  name_ar: string
  name_en: string | null
  name_i18n?: Record<string, string> | null
  group_name_i18n?: Record<string, string> | null
  slug: string
  icon: string | null
  image_url: string | null
  track: string | null
  group_slug?: string | null
  group_name_ar?: string | null
  group_emoji?: string | null
  group_display_order?: number | null
}

// 🗂️ (17 Jul 2026) طلب محمد: «المستخدم مايتوهش» — الهوم يعرض المجموعات الكبيرة
// (عقارات · عربيات · بيت وأثاث · سوبرماركت وصيدليات...) مش كل فئة لوحدها.
// الكارت بياخد صورة أول فئة عندها صورة جوه المجموعة، والضغط يودّي الماركت
// متفلتر على المجموعة دي.
type CatGroup = {
  key: string
  name_ar: string
  name_i18n: Record<string, string> | null
  emoji: string | null
  image_url: string | null
  order: number
  count: number
  firstSlug: string
}

function buildGroups(cats: Category[]): CatGroup[] {
  const map = new Map<string, CatGroup>()
  for (const c of cats) {
    const key = c.group_slug || c.slug
    const existing = map.get(key)
    if (existing) {
      existing.count += 1
      if (!existing.image_url && c.image_url) existing.image_url = c.image_url
    } else {
      map.set(key, {
        key,
        name_ar: c.group_name_ar || c.name_ar,
        name_i18n: c.group_slug ? (c.group_name_i18n || null) : (c.name_i18n || null),
        emoji: c.group_emoji || c.icon,
        image_url: c.image_url,
        order: c.group_display_order ?? 999,
        count: 1,
        firstSlug: c.slug,
      })
    }
  }
  return [...map.values()].sort((a, b) => a.order - b.order)
}

// 5 verticals — same identity & order as الماركت (بيع · إيجار · خدمات · مطاعم · سوبر ماركت).
// مناسبات (hybrid/events) is merged into إيجار per the new structure.
// 🛒 (٢٥ يوليو ٢٠٢٦ — محمد): «سوبر ماركت» مجال مستقل، مش مجموعة جوه «بيع».
type VKey = 'products' | 'rentals' | 'services' | 'restaurants' | 'daily'

const VERTICALS: { key: VKey; ar: string; en: string; emoji: string; accent: string; bg: string; tracks: string[] }[] = [
  { key: 'products',    ar: 'بيع',        en: 'Buy',         emoji: '🏷️', accent: '#3D7BB6', bg: '#D9E7F4', tracks: ['products', 'sales'] },
  { key: 'rentals',     ar: 'إيجار',      en: 'Rent',        emoji: '🔑', accent: '#059669', bg: '#E7F1ED', tracks: ['rentals', 'hybrid'] },
  { key: 'services',    ar: 'خدمات',      en: 'Services',    emoji: '🛠️', accent: '#D4A017', bg: '#FAEFD1', tracks: ['services'] },
  { key: 'restaurants', ar: 'مطاعم',      en: 'Restaurants', emoji: '🍽️', accent: '#E26D5C', bg: '#FAE1CB', tracks: ['restaurants'] },
  { key: 'daily',       ar: 'سوبر ماركت', en: 'Groceries',   emoji: '🛒', accent: '#7A4FA3', bg: '#EDE3F5', tracks: ['daily'] },
]

// 🚨 (16 يوليو 2026) كان هنا `DEFAULT_FALLBACK` — لينك Unsplash واحد لصورة
//    **ممر مكتب زجاجي فاضي**، بيتحط على أي فئة مالهاش صورة. النتيجة على الهوم:
//    «خضار وفاكهة» 🥦 و«إكسسوارات عربيات» 🛞 و«قطع غيار موتوسيكلات» 🏍️
//    كلهم بيبانوا بنفس صورة ممر المكتب. تلات فئات مختلفة تماماً، صورة واحدة،
//    ومالهاش أي علاقة بأي واحدة فيهم.
//
//    الصورة الغلط أوحش من مفيش صورة: بتكرّر نفسها وبتكدب. البديل: كارت بهوية
//    مضمونة — لون الڤيرتيكال + أيقونة الفئة كبيرة. كل فئة عندها أيقونة (388/388)
//    فالكارت بيطلع مميّز لكل واحدة، وعمره ما هيوعد بحاجة مش موجودة.
//    أول ما تيجي صورة حقيقية، `image_url` بتاخد الأولوية أوتوماتيك.
//    نفس فلسفة `bannerTone` في كروت البورصة.

const TILE_TONE: Record<VKey, string> = {
  products:    'from-[#2C5F8D] to-[#5B9BD5]',
  rentals:     'from-[#34D399] to-[#2FA084]',
  services:    'from-[#8A6A0F] to-[#D4A017]',
  restaurants: 'from-[#B4453A] to-[#E26D5C]',
  daily:       'from-[#5C3A7E] to-[#9B6FC4]',
}

function IconTile({ cat, vkey }: { cat: Category; vkey: VKey }) {
  return (
    <div className={`absolute inset-0 bg-gradient-to-br ${TILE_TONE[vkey]}`}>
      {/* نقشة نقط خفيفة — عشان الكارت مايبقاش لون مصمت */}
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '20px 20px',
        }}
      />
      {/* ⚠️ الأيقونة في التلت الفوقاني مش في النص: العناوين الطويلة (زي
          «قطع غيار وإكسسوارات موتوسيكلات» = ٣ سطور) بتطلع من تحت وبتركب
          على أي حاجة في نص الكارت. */}
      <span className="absolute inset-x-0 top-[18%] flex justify-center text-5xl md:text-6xl opacity-90 drop-shadow-lg select-none">
        {cat.icon || '🏷️'}
      </span>
    </div>
  )
}

export default function CategoryTrackTabs({ categories }: { categories: Category[] }) {
  const { t, lang, locale } = useT()
  // 🌍 اسم المجموعة باللغة الحالية
  const gName = (g: CatGroup) => groupNameFor({ group_name_ar: g.name_ar, group_name_i18n: g.name_i18n }, locale)

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
              onClick={() => {
                setActive(v.key)
                // FIX (Jul 17 2026): محمد — «بدوس ضيف من تاب المطاعم في الهوم
                // بلاقي نفسي في قسم غير اللي دوست عليه». نعكس التاب في الـURL
                // (?track=) عشان زرار «ضيف منتج» يفتح الويزارد على نفس القسم.
                try {
                  const sp = new URLSearchParams(window.location.search)
                  sp.set('track', v.key)
                  window.history.replaceState(null, '', `${window.location.pathname}?${sp.toString()}`)
                } catch { /* non-blocking */ }
              }}
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
              <span>{t('mhome.v_' + v.key)}</span>
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

      {/* 🗂️ (17 Jul 2026) مجموعات مش فئات — «المستخدم مايتوهش» */}
      {visible.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          {t('tracktab.empty')}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {buildGroups(visible).map(g => (
            <Link
              key={g.key}
              href={`/marketplace?track=${activeVertical.key}&group=${encodeURIComponent(g.key)}`}
              className="group relative block rounded-2xl overflow-hidden no-underline aspect-[4/3]"
            >
              {g.image_url ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={g.image_url}
                    alt={gName(g)}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                </>
              ) : (
                <>
                  <div className={`absolute inset-0 bg-gradient-to-br ${TILE_TONE[activeVertical.key]}`}>
                    <span className="absolute inset-x-0 top-[16%] flex justify-center text-5xl md:text-6xl opacity-90 drop-shadow-lg select-none">
                      {g.emoji || '🏷️'}
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                </>
              )}
              <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-5">
                <h3 className="font-black text-white leading-tight text-lg md:text-xl flex items-center gap-2">
                  {g.image_url && g.emoji && <span className="text-xl">{g.emoji}</span>}
                  {gName(g)}
                </h3>
                <p className="text-white/70 text-[11px] font-bold mt-1">{t('mk.n_sections', { n: g.count })}</p>
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
