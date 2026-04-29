'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowRight,
  MapPin,
  Users,
  Search,
  SlidersHorizontal,
  Coffee,
  Building,
  Camera,
  Monitor,
  Users as UsersIcon,
} from 'lucide-react'

// Marketplace browse page — anyone can come here, filter, and book.
// Wrapped in <Suspense> at the bottom because useSearchParams() requires it
// for static pre-rendering in Next.js 14/15.

interface Supplier {
  id: string
  business_name: string
  district: string | null
  logo_url: string | null
}

interface Unit {
  id: string
  name_ar: string
  description_ar: string | null
  photo_urls: string[]
  capacity: number
  category_slug: string
  price_hourly: number | null
  price_daily: number | null
  price_package_10: number | null
  price_monthly: number | null
  supplier: Supplier
}

interface Category {
  slug: string
  name_ar: string
  icon: string
}

const STATIC_CATEGORIES: Category[] = [
  { slug: 'workstation', name_ar: 'مكاتب فردية', icon: 'Monitor' },
  { slug: 'meeting_room', name_ar: 'غرف اجتماعات', icon: 'Users' },
  { slug: 'office', name_ar: 'مكاتب خاصة', icon: 'Building' },
  { slug: 'amenity', name_ar: 'وسائل راحة', icon: 'Coffee' },
  { slug: 'equipment', name_ar: 'معدات', icon: 'Camera' },
]

const ICON_MAP: Record<string, typeof Monitor> = {
  Monitor,
  Users: UsersIcon,
  Building,
  Coffee,
  Camera,
}

function formatStartingPrice(unit: Unit): string {
  // Show the smallest "entry" price the unit offers
  const candidates = [
    { price: unit.price_hourly, suffix: 'ج.م/ساعة' },
    { price: unit.price_daily, suffix: 'ج.م/يوم' },
    { price: unit.price_package_10, suffix: 'ج.م/باكدج' },
    { price: unit.price_monthly, suffix: 'ج.م/شهر' },
  ].filter((p) => p.price !== null && p.price !== undefined) as Array<{ price: number; suffix: string }>

  if (candidates.length === 0) return ''
  // Pick the smallest absolute price
  const best = candidates.reduce((a, b) => (a.price < b.price ? a : b))
  return `من ${best.price.toLocaleString('ar-EG')} ${best.suffix}`
}

function BrowsePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Hydrate selected category from URL on first load.
  // This lets the home page deep-link via /browse?category=workstation.
  useEffect(() => {
    const cat = searchParams.get('category')
    if (cat && STATIC_CATEGORIES.some((c) => c.slug === cat)) {
      setSelectedCategory(cat)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (selectedCategory) params.set('category', selectedCategory)
    fetch(`/api/units?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setUnits(data.units || [])
      })
      .catch((e) => {
        console.error(e)
        setUnits([])
      })
      .finally(() => setLoading(false))
  }, [selectedCategory])

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return units
    const q = searchQuery.toLowerCase()
    return units.filter(
      (u) =>
        u.name_ar.toLowerCase().includes(q) ||
        (u.description_ar?.toLowerCase().includes(q) ?? false) ||
        (u.supplier?.business_name.toLowerCase().includes(q) ?? false) ||
        (u.supplier?.district?.toLowerCase().includes(q) ?? false)
    )
  }, [units, searchQuery])

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      {/* Header */}
      <header className="bg-[#FAFAF7] border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-gray-50 rounded-full transition-colors"
              aria-label="رجوع"
              type="button"
            >
              <ArrowRight className="w-5 h-5 text-gray-700" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">استكشف المساحات</h1>
            <div className="w-9" />
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن مساحة، حي، أو مزود..."
              className="w-full pr-10 pl-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30 focus:border-[#1F5F3F] text-sm text-right"
            />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 pb-12">
        {/* Category filters */}
        <div className="mb-5">
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scroll-smooth">
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                selectedCategory === null
                  ? 'bg-[#1F5F3F] text-white'
                  : 'bg-white border border-gray-200 text-gray-700'
              }`}
            >
              الكل
            </button>
            {STATIC_CATEGORIES.map((c) => {
              const Icon = ICON_MAP[c.icon] || Monitor
              const selected = selectedCategory === c.slug
              return (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => setSelectedCategory(c.slug)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                    selected
                      ? 'bg-[#1F5F3F] text-white'
                      : 'bg-white border border-gray-200 text-gray-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {c.name_ar}
                </button>
              )
            })}
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-16 text-gray-500 text-sm">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-sm">مفيش نتائج بالمعايير دي</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((unit) => (
              <Link
                key={unit.id}
                href={`/units/${unit.id}`}
                className="block bg-white rounded-xl border border-gray-100 overflow-hidden hover:border-[#1F5F3F]/30 hover:shadow-sm transition-all no-underline active:scale-[0.99]"
              >
                {/* Hero image (or placeholder) */}
                {unit.photo_urls && unit.photo_urls.length > 0 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={unit.photo_urls[0]}
                    alt={unit.name_ar}
                    className="w-full h-44 object-cover"
                  />
                ) : (
                  <div className="w-full h-32 bg-gradient-to-br from-[#1F5F3F]/10 via-[#B8860B]/10 to-[#1F5F3F]/5 flex items-center justify-center">
                    <span className="text-3xl font-bold text-[#1F5F3F]/30">
                      {unit.name_ar.charAt(0)}
                    </span>
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 mb-1 truncate">
                        {unit.name_ar}
                      </h3>
                      <p className="text-xs text-gray-500 truncate">
                        {unit.supplier?.business_name}
                      </p>
                    </div>
                    <div className="text-left flex-shrink-0">
                      <p className="text-sm font-bold text-[#1F5F3F]">
                        {formatStartingPrice(unit)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
                    {unit.supplier?.district && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {unit.supplier.district}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      حتى {unit.capacity}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

// Wrap in Suspense — Next.js requires this for any client component
// that calls useSearchParams() so it can statically pre-render the page.
export default function BrowsePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAFAF7]" />}>
      <BrowsePageInner />
    </Suspense>
  )
}
