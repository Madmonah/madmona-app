// app/admin/photo-audit/page.tsx
// Visual audit for listings whose primary photo may be wrong (came from the flat
// wa-inbound bucket where different suppliers' photos got mixed).
// Click the right photo → promote to primary. Click X on a bad photo → hide it.
// Confirm → clears needs_photo_audit flag → listing joins v_postiz_safe_listings.

'use client'

import { useCallback, useEffect, useState } from 'react'
import { priceLabel, currencyLabel } from '@/lib/currency'

type Photo = {
  id: string
  url: string
  is_primary: boolean
  display_order: number | null
}

type Listing = {
  id: string
  title: string
  slug: string | null
  city: string | null
  district: string | null
  price_egp: string | number | null
  supplier_name: string | null
  category_name: string | null
  photos: Photo[]
}

const fmtPrice = (v: string | number | null) => {
  if (v == null || v === '') return '—'
  const n = typeof v === 'string' ? Number(v) : v
  return isNaN(n) ? String(v) : n.toLocaleString('en-EG')
}

export default function PhotoAuditPage() {
  const [items, setItems] = useState<Listing[]>([])
  const [remaining, setRemaining] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [choices, setChoices] = useState<Record<string, { primary: string | null; hidden: Set<string> }>>({})
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const flash = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/photo-audit?limit=15', { cache: 'no-store' })
      const d = await r.json()
      setItems(d.listings || [])
      setRemaining(d.remaining ?? null)
      const init: typeof choices = {}
      for (const l of d.listings || []) {
        const currentPrimary = l.photos.find((p: Photo) => p.is_primary)
        init[l.id] = { primary: currentPrimary?.id ?? l.photos[0]?.id ?? null, hidden: new Set() }
      }
      setChoices(init)
    } catch (e) {
      console.error(e)
      flash('فشل التحميل', false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const setPrimary = (listingId: string, photoId: string) => {
    setChoices((c) => ({
      ...c,
      [listingId]: {
        primary: photoId,
        hidden: new Set([...(c[listingId]?.hidden ?? new Set())].filter((h) => h !== photoId)),
      },
    }))
  }

  const toggleHide = (listingId: string, photoId: string) => {
    setChoices((c) => {
      const cur = c[listingId] ?? { primary: null, hidden: new Set<string>() }
      const nextHidden = new Set(cur.hidden)
      if (nextHidden.has(photoId)) nextHidden.delete(photoId)
      else nextHidden.add(photoId)
      const nextPrimary = cur.primary === photoId ? null : cur.primary
      return { ...c, [listingId]: { primary: nextPrimary, hidden: nextHidden } }
    })
  }

  const confirm = async (listingId: string) => {
    const choice = choices[listingId]
    if (!choice?.primary) { flash('اختار الصورة الرئيسية الأول', false); return }
    setBusy((b) => ({ ...b, [listingId]: true }))
    try {
      const r = await fetch('/api/admin/photo-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listingId,
          primary_photo_id: choice.primary,
          hide_photo_ids: [...choice.hidden],
        }),
      })
      const d = await r.json()
      if (!r.ok || !d.ok) throw new Error(d.error || 'فشل الحفظ')
      flash(`✓ اتحفظ · مخفي ${d.hidden}`, true)
      setItems((prev) => prev.filter((l) => l.id !== listingId))
      setRemaining((n) => (n == null ? null : Math.max(0, n - 1)))
    } catch (e: any) {
      flash(e?.message || 'فشل', false)
    } finally {
      setBusy((b) => ({ ...b, [listingId]: false }))
    }
  }

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-[#FAFAF7] px-4 py-6 md:px-8">
      <header className="mx-auto mb-6 flex max-w-6xl items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🖼️ أوديت صور الإعلانات</h1>
          <p className="mt-1 text-sm text-gray-600">
            {remaining != null && (
              <>باقي <b className="text-[#059669]">{remaining}</b> إعلان يحتاج مراجعة · </>
            )}
            اختار الصورة الصح، وأخفي الصور اللي مش بتاعت المشروع، ثم اضغط تأكيد.
          </p>
        </div>
        <button
          onClick={load}
          className="rounded-lg bg-[#34D399] px-4 py-2 text-sm font-bold text-[#04352A] hover:bg-[#2ea080]"
        >
          🔄 تحديث
        </button>
      </header>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 rounded-xl px-5 py-3 shadow-lg ${toast.ok ? 'bg-[#34D399] text-[#04352A]' : 'bg-red-600 text-[#04352A]'}`}>
          {toast.msg}
        </div>
      )}

      <main className="mx-auto max-w-6xl space-y-6">
        {loading ? (
          <div className="rounded-xl bg-white p-10 text-center text-gray-500">تحميل…</div>
        ) : items.length === 0 ? (
          <div className="rounded-xl bg-white p-10 text-center">
            <div className="text-4xl">🎉</div>
            <div className="mt-3 text-lg font-bold text-gray-900">خلصنا كل الإعلانات المعلّمة</div>
            <div className="mt-1 text-sm text-gray-600">v_postiz_safe_listings كبرت — postiz جاهزة تنشر عليهم</div>
          </div>
        ) : (
          items.map((l) => {
            const choice = choices[l.id] ?? { primary: null, hidden: new Set<string>() }
            const hasPrimary = !!choice.primary
            return (
              <section key={l.id} className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-lg font-bold text-gray-900">{l.title}</h2>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    {l.category_name && <span className="rounded-full bg-[#34D399]/10 px-3 py-0.5 text-[#059669] font-medium">{l.category_name}</span>}
                    {l.supplier_name && <span>👤 {l.supplier_name}</span>}
                    {l.price_egp && <span className="font-bold text-[#059669]">{priceLabel(l.price_egp, l.currency)}</span>}
                  </div>
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  {[l.district, l.city].filter(Boolean).join('، ') || 'بدون منطقة'}
                  {l.slug && (
                    <> · <a href={`/marketplace/${l.slug}`} target="_blank" className="text-[#059669] hover:underline">عرض الإعلان ↗</a></>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {l.photos.map((p) => {
                    const isPrimary = choice.primary === p.id
                    const isHidden = choice.hidden.has(p.id)
                    const isWaInbound = p.url.includes('/wa-inbound/')
                    return (
                      <div key={p.id} className="relative">
                        <button
                          onClick={() => setPrimary(l.id, p.id)}
                          className={`block aspect-square w-full overflow-hidden rounded-xl border-4 transition ${
                            isPrimary ? 'border-[#059669] ring-2 ring-[#059669]/40' : isHidden ? 'border-red-400 opacity-40' : 'border-transparent hover:border-gray-300'
                          }`}
                          title="اضغط لاختيار كصورة رئيسية"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                        </button>
                        {isPrimary && (
                          <span className="absolute right-2 top-2 rounded-full bg-[#34D399] px-2 py-0.5 text-xs font-bold text-[#04352A] shadow">⭐ رئيسية</span>
                        )}
                        {isWaInbound && !isPrimary && !isHidden && (
                          <span className="absolute right-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">⚠️ wa-inbound</span>
                        )}
                        <button
                          onClick={() => toggleHide(l.id, p.id)}
                          className={`absolute bottom-2 left-2 rounded-full px-2 py-0.5 text-xs font-bold shadow ${
                            isHidden ? 'bg-white text-red-600 border border-red-400' : 'bg-red-600 text-white'
                          }`}
                          title={isHidden ? 'الغي الإخفاء' : 'إخفاء (الصورة غلط)'}
                        >
                          {isHidden ? '↺ رجّع' : '✕ إخفاء'}
                        </button>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-5 flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
                  <div className="text-sm text-gray-600">
                    {choice.hidden.size > 0 && <span className="mr-3">🚫 {choice.hidden.size} مخفية</span>}
                    {hasPrimary ? <span className="text-[#059669] font-medium">✓ الرئيسية متحددة</span> : <span className="text-amber-600">لسه ما اخترتش الرئيسية</span>}
                  </div>
                  <button
                    onClick={() => confirm(l.id)}
                    disabled={!hasPrimary || busy[l.id]}
                    className="rounded-lg bg-[#34D399] px-5 py-2 text-sm font-bold text-[#04352A] shadow disabled:opacity-40 hover:bg-[#2ea080]"
                  >
                    {busy[l.id] ? '⏳' : '✓ تأكيد + رفع من قائمة المراجعة'}
                  </button>
                </div>
              </section>
            )
          })
        )}
      </main>
    </div>
  )
}
