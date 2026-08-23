'use client'

/* 🏠 الوحدات — اسطمبة العقارات (٢٤ أغسطس ٢٦)
   محمد: «وريني أحلى موديل لإدارة بيزنس عقاري في مصر — اسطمبة محترفة».

   وحدات المكتب العقاري = إعلاناته على مضمونة. الشاشة دي **مش** نسخة
   موازية من تاب الإعلانات — دي فيو لوحدات بيزنس واحد بس، بمنطق
   العقارات: متجمّعة بالحالة (معروض/تحت الإجراء/اتباع)، بسعرها
   وموقعها وصورها، وأزرار بتوصّل لصفحات موجودة فعلاً (مفيش دوال جديدة). */

import { useCallback, useEffect, useState } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { ChevronLeft, Home, Loader2, MapPin, Plus, Camera } from 'lucide-react'

type Unit = {
  id: string; title: string; slug: string; status: string
  city: string | null; district: string | null
  contact_phone: string | null; owner_name: string | null
  created_at: string; published_at: string | null
  photos: number
}

const STATUS_META: Record<string, { l: string; cls: string }> = {
  published: { l: 'معروضة', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  draft: { l: 'مسودة', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  pending_review: { l: 'قيد المراجعة', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  paused: { l: 'موقوفة', cls: 'bg-red-50 text-red-600 border-red-200' },
  rejected: { l: 'مرفوضة', cls: 'bg-red-50 text-red-700 border-red-200' },
}

export default function UnitsPage({ params }: { params: Promise<{ supplierId: string }> }) {
  const { supplierId } = use(params)
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'published' | 'draft' | 'paused'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabaseBrowser
      .from('listings')
      .select('id, title, slug, status, city, district, contact_phone, owner_name, created_at, published_at, listing_photos(id)')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false })
      .limit(300)
    setUnits(((data || []) as any[]).map((l) => ({
      id: l.id, title: l.title, slug: l.slug, status: String(l.status),
      city: l.city, district: l.district,
      contact_phone: l.contact_phone, owner_name: l.owner_name,
      created_at: l.created_at, published_at: l.published_at,
      photos: Array.isArray(l.listing_photos) ? l.listing_photos.length : 0,
    })))
    setLoading(false)
  }, [supplierId])

  useEffect(() => { load() }, [load])

  const shown = units.filter((u) => filter === 'all' || u.status === filter)
  const counts = {
    all: units.length,
    published: units.filter((u) => u.status === 'published').length,
    draft: units.filter((u) => u.status === 'draft').length,
    paused: units.filter((u) => u.status === 'paused').length,
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Link href={`/admin/business-finance/${supplierId}`}
          className="text-xs font-bold text-[#6B7280] hover:text-[#059669] flex items-center gap-1 mb-2">
          <ChevronLeft className="w-3.5 h-3.5" /> لوحة الإدارة
        </Link>

        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#059669]/10 grid place-items-center">
              <Home className="w-5 h-5 text-[#059669]" />
            </div>
            <div>
              <h1 className="text-xl font-black text-[#1A2E26]">الوحدات</h1>
              <p className="text-xs text-[#6B7280]">كل وحدات المكتب على مضمونة — بحالتها وصورها وصاحبها</p>
            </div>
          </div>
          <Link href="/admin/listings?add=1"
            className="inline-flex items-center gap-1.5 bg-[#059669] text-white text-sm font-bold px-4 py-2.5 rounded-xl">
            <Plus className="w-4 h-4" /> ضيف وحدة
          </Link>
        </div>

        {/* الفلاتر بالحالة */}
        <div className="flex gap-2 flex-wrap mb-4">
          {([['all', 'الكل'], ['published', 'معروضة'], ['draft', 'مسودات'], ['paused', 'موقوفة']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                filter === v ? 'bg-[#059669] text-white border-[#059669]' : 'bg-white text-[#1A2E26] border-[#E5E5E0]'}`}>
              {l} {counts[v]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-16 grid place-items-center"><Loader2 className="w-7 h-7 text-[#059669] animate-spin" /></div>
        ) : shown.length === 0 ? (
          <div className="bg-white border border-[#E5E5E0] rounded-2xl p-10 text-center">
            <Home className="w-10 h-10 text-[#D1D5DB] mx-auto mb-3" />
            <p className="font-bold text-[#1A2E26] mb-1">مفيش وحدات هنا لسه</p>
            <p className="text-xs text-[#6B7280]">أول وحدة بتتضاف من زرار «ضيف وحدة» فوق — بصور وسعر واسم صاحبها.</p>
          </div>
        ) : (
          <div className="grid gap-2.5">
            {shown.map((u) => {
              const st = STATUS_META[u.status] || { l: u.status, cls: 'bg-gray-100 text-gray-600 border-gray-200' }
              return (
                <div key={u.id} className="bg-white border border-[#E5E5E0] rounded-2xl p-4 flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-[220px]">
                    <p className="font-black text-[#1A2E26] leading-snug">{u.title}</p>
                    <p className="text-xs text-[#6B7280] mt-1 flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{[u.city, u.district].filter(Boolean).join(' — ') || 'من غير موقع'}</span>
                      <span className="flex items-center gap-1"><Camera className="w-3 h-3" />{u.photos} صورة</span>
                      {u.owner_name && <span>👤 {u.owner_name}</span>}
                      {u.contact_phone && <span dir="ltr">{u.contact_phone}</span>}
                    </p>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${st.cls}`}>{st.l}</span>
                  {u.status === 'published' && (
                    <a href={`/marketplace/${u.slug}`} target="_blank" rel="noreferrer"
                      className="text-xs font-bold text-[#059669] underline underline-offset-4">شوفها لايف</a>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
