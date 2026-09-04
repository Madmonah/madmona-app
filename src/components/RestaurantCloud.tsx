'use client'
// src/components/RestaurantCloud.tsx
// ============================================================================
// 🍽️ منيو المطعم/الكافيه بأسلوب TableQR (٤ سبتمبر ٢٠٢٦)
//
// محمد: «عايزين نعمل ديزاين المطاعم والمطاعم الكلود زي اللي في
// demo.tableqr.co — سواء في عرض الماركتبليس أو في صفحة المورد، ونبدأ بلمونة».
//
// اللي اتاخد من المرجع: هيدر براند (لوجو + سلوجن + أيقونات: لوكيشن ·
// واتساب · مشاركة) → كروت أقسام كبيرة بصورة → أقسام متتالية بشرائح لاصقة
// → كارت صنف (صورة · اسم · وصف مختصر · مقاسات بأسعارها · زرار أضف)
// → شريط «طلبي» لاصق تحت بعدد الأصناف والإجمالي وزرار واتساب.
// الكارت والطلب = نفس منطق OrderActions (useCart/addToCart) — مفيش نسخة
// تانية من الكارت. العملة من الصنف نفسه (لمونة درهم) مش «ج» ثابتة.
// ============================================================================

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { MapPin, MessageCircle, Share2, Plus, Minus, ShoppingBag, ChevronLeft } from 'lucide-react'
import { addToCart, useCart, setItemQuantity, cartItemCount, cartSubtotal } from '@/lib/cart'
import { useT } from '@/lib/i18n/LanguageProvider'
import { currencyLabel, priceLabel } from '@/lib/currency'

export type CloudSize = { id: string; name_ar: string; price: number }
export type CloudItem = {
  id: string
  name_ar: string
  name_en?: string | null
  description_ar?: string | null
  price: number
  currency?: string | null
  category?: string | null
  photo_url?: string | null
  is_available?: boolean | null
  sizes?: CloudSize[]
}

export interface RestaurantCloudProps {
  business: {
    name: string
    logo?: string | null
    tagline?: string | null
    phone?: string | null       // رقم الطلبات/الواتساب بتاع البيزنس (دولي)
    city?: string | null
    address?: string | null
    mapsUrl?: string | null
  }
  listing: { id: string; slug?: string | null }
  supplier: { id: string; business_name: string }
  items: CloudItem[]
  /** لو الصفحة عندها هيدر بتاعها (صفحة الإعلان) — نعرض المنيو بس */
  hideHeader?: boolean
}

const PALETTE = { bg: '#F4EFE8', ink: '#1F1B16', muted: '#6B655E', accent: '#0F5132', card: '#FFFFFF' }

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, '-').replace(/^-+|-+$/g, '') || 'cat'
}

export default function RestaurantCloud({ business, listing, supplier, items, hideHeader }: RestaurantCloudProps) {
  const { t, lang } = useT()
  const cart = useCart()
  const [active, setActive] = useState<string>('')
  const [openSizes, setOpenSizes] = useState<string | null>(null)
  const chipsRef = useRef<HTMLDivElement>(null)

  // الأقسام بترتيب أول ظهور — نفس قاعدة RestaurantMenu
  const groups = useMemo(() => {
    const m = new Map<string, CloudItem[]>()
    for (const it of items) {
      if (it.is_available === false) continue
      const c = (it.category || 'عام').trim()
      if (!m.has(c)) m.set(c, [])
      m.get(c)!.push(it)
    }
    return Array.from(m.entries()).map(([name, list]) => ({ name, id: slugify(name), items: list, cover: list.find((x) => x.photo_url)?.photo_url || null }))
  }, [items])

  const currency = items.find((i) => i.currency)?.currency || 'EGP'
  const count = cartItemCount(cart)
  const subtotal = cartSubtotal(cart)
  const mine = cart.supplier_id === supplier.id

  // الشريحة النشطة تتبع القسم اللي في الشاشة
  useEffect(() => {
    if (!groups.length) return
    const obs = new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting) setActive((e.target as HTMLElement).dataset.cat || '')
    }, { rootMargin: '-45% 0px -50% 0px' })
    groups.forEach((g) => { const el = document.getElementById(`cat-${g.id}`); if (el) obs.observe(el) })
    return () => obs.disconnect()
  }, [groups])

  const qtyOf = (key: string) => cart.items.find((i) => i.key === key)?.quantity || 0
  const keyFor = (it: CloudItem, sz?: CloudSize | null) => `${it.id}${sz ? ':' + sz.id : ''}`

  const add = (it: CloudItem, sz?: CloudSize | null) => {
    const res = addToCart({
      supplier_id: supplier.id, supplier_name: supplier.business_name, order_type: 'food', primary_listing_id: listing.id,
      force: !mine && count > 0,   // كارت من مطعم تاني؟ نبدأ من جديد (نفس حارس OrderActions)
      item: { key: keyFor(it, sz), listing_id: listing.id, menu_item_id: it.id, size_id: sz?.id ?? null, size_name: sz?.name_ar ?? null,
              name: sz ? `${it.name_ar} (${sz.name_ar})` : it.name_ar, photo_url: it.photo_url ?? null, unit_price: sz ? sz.price : it.price },
    })
    if (res.ok) setOpenSizes(null)
  }

  const waOrder = () => {
    if (!business.phone) return
    const lines = cart.items.map((i) => `• ${i.name} × ${i.quantity} — ${priceLabel(i.unit_price * i.quantity, currency, lang)}`)
    const text = `${lang.startsWith('ar') ? 'طلب من' : 'Order from'} ${business.name}:\n${lines.join('\n')}\n${lang.startsWith('ar') ? 'الإجمالي' : 'Total'}: ${priceLabel(subtotal, currency, lang)}`
    window.open(`https://wa.me/${business.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
  }

  const share = async () => {
    try { if (navigator.share) await navigator.share({ title: business.name, url: location.href }); else await navigator.clipboard.writeText(location.href) } catch { /* المستخدم لغى */ }
  }

  const scrollTo = (id: string) => document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div dir="rtl" style={{ background: PALETTE.bg, color: PALETTE.ink }} className="rounded-3xl overflow-hidden -mx-1">
      {!hideHeader && (
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {business.mapsUrl && <a href={business.mapsUrl} target="_blank" rel="noopener" aria-label="location" className="w-10 h-10 rounded-full bg-white/80 grid place-items-center shadow-sm"><MapPin className="w-4 h-4" /></a>}
              {business.phone && <a href={`https://wa.me/${business.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener" aria-label="whatsapp" className="w-10 h-10 rounded-full bg-white/80 grid place-items-center shadow-sm"><MessageCircle className="w-4 h-4" /></a>}
              <button onClick={share} aria-label="share" className="w-10 h-10 rounded-full bg-white/80 grid place-items-center shadow-sm"><Share2 className="w-4 h-4" /></button>
            </div>
            {business.city && <span className="text-[11px] font-bold" style={{ color: PALETTE.muted }}>{business.city}</span>}
          </div>
          <div className="mt-5">
            {business.tagline && <p className="text-[10px] tracking-[0.25em] font-bold uppercase mb-2" style={{ color: PALETTE.muted }}>{business.tagline}</p>}
            {business.logo ? <img src={business.logo} alt={business.name} className="h-14 w-auto object-contain" /> : <h1 className="text-2xl font-black">{business.name}</h1>}
          </div>
        </div>
      )}

      {/* كروت الأقسام */}
      <div className="px-4 pb-3 grid grid-cols-1 gap-3">
        {groups.map((g) => (
          <button key={g.id} onClick={() => scrollTo(g.id)} className="text-right rounded-3xl overflow-hidden shadow-sm bg-white">
            <div className="h-28" style={g.cover ? { backgroundImage: `url(${g.cover})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: 'linear-gradient(135deg,#DCE9E1,#F4EFE8)' }} />
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="font-black text-lg leading-tight">{g.name}</p>
                <p className="text-[12px]" style={{ color: PALETTE.muted }}>{g.items.length} {lang.startsWith('ar') ? 'صنف' : 'items'}</p>
              </div>
              <ChevronLeft className="w-5 h-5" style={{ color: PALETTE.muted }} />
            </div>
          </button>
        ))}
      </div>

      {/* الشرائح اللاصقة */}
      <div ref={chipsRef} className="sticky top-0 z-20 backdrop-blur px-3 py-2 flex gap-2 overflow-x-auto" style={{ background: 'rgba(244,239,232,.92)' }}>
        {groups.map((g) => (
          <button key={g.id} onClick={() => scrollTo(g.id)}
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-[12px] font-bold border ${active === g.id ? 'text-white' : 'bg-white'}`}
            style={active === g.id ? { background: PALETTE.accent, borderColor: PALETTE.accent } : { borderColor: '#E5DED4', color: PALETTE.ink }}>
            {g.name}
          </button>
        ))}
      </div>

      {/* الأقسام والأصناف */}
      <div className="px-4 pb-28 space-y-7 pt-3">
        {groups.map((g) => (
          <section key={g.id} id={`cat-${g.id}`} data-cat={g.id} className="scroll-mt-14">
            <h2 className="text-xl font-black mb-3">{g.name}</h2>
            <div className="space-y-3">
              {g.items.map((it) => {
                const hasSizes = (it.sizes?.length || 0) > 0
                const baseKey = keyFor(it)
                const q = hasSizes ? (it.sizes || []).reduce((s, z) => s + qtyOf(keyFor(it, z)), 0) : qtyOf(baseKey)
                const cur = it.currency || currency
                const minP = hasSizes ? Math.min(...(it.sizes || []).map((z) => z.price)) : it.price
                return (
                  <div key={it.id} className="rounded-3xl bg-white shadow-sm p-3 flex gap-3" style={{ opacity: it.is_available === false ? .5 : 1 }}>
                    {it.photo_url && <img src={it.photo_url} alt={it.name_ar} className="w-24 h-24 rounded-2xl object-cover flex-shrink-0" loading="lazy" />}
                    <div className="min-w-0 flex-1 flex flex-col">
                      <p className="font-black text-[15px] leading-snug">{lang.startsWith('ar') ? it.name_ar : (it.name_en || it.name_ar)}</p>
                      {it.description_ar && <p className="text-[12px] leading-relaxed mt-0.5 line-clamp-2" style={{ color: PALETTE.muted }}>{it.description_ar}</p>}
                      <div className="mt-auto pt-2 flex items-center justify-between gap-2">
                        <span className="font-black text-[15px] tabular-nums" style={{ color: PALETTE.accent }}>
                          {hasSizes && <span className="text-[11px] font-bold ml-1" style={{ color: PALETTE.muted }}>{lang.startsWith('ar') ? 'من' : 'from'}</span>}
                          {priceLabel(minP, cur, lang)}
                        </span>
                        {q > 0 && !hasSizes ? (
                          <div className="flex items-center gap-2 rounded-full px-2 py-1" style={{ background: '#EEF6F1' }}>
                            <button aria-label="minus" onClick={() => setItemQuantity(baseKey, q - 1)} className="w-7 h-7 rounded-full bg-white grid place-items-center"><Minus className="w-3.5 h-3.5" /></button>
                            <span className="font-black text-sm w-5 text-center">{q}</span>
                            <button aria-label="plus" onClick={() => setItemQuantity(baseKey, q + 1)} className="w-7 h-7 rounded-full grid place-items-center text-white" style={{ background: PALETTE.accent }}><Plus className="w-3.5 h-3.5" /></button>
                          </div>
                        ) : (
                          <button onClick={() => hasSizes ? setOpenSizes(openSizes === it.id ? null : it.id) : add(it)}
                            className="px-4 py-2 rounded-full text-[13px] font-black text-white flex items-center gap-1" style={{ background: PALETTE.accent }}>
                            <Plus className="w-3.5 h-3.5" /> {q > 0 ? q : (lang.startsWith('ar') ? 'أضف' : 'Add')}
                          </button>
                        )}
                      </div>
                      {hasSizes && openSizes === it.id && (
                        <div className="mt-2 grid grid-cols-1 gap-1.5">
                          {(it.sizes || []).map((z) => {
                            const k = keyFor(it, z); const zq = qtyOf(k)
                            return (
                              <div key={z.id} className="flex items-center justify-between rounded-2xl px-3 py-2" style={{ background: '#FAF7F2' }}>
                                <span className="text-[13px] font-bold">{z.name_ar} <span className="tabular-nums mr-1" style={{ color: PALETTE.accent }}>{priceLabel(z.price, cur, lang)}</span></span>
                                {zq > 0 ? (
                                  <div className="flex items-center gap-2">
                                    <button aria-label="minus" onClick={() => setItemQuantity(k, zq - 1)} className="w-7 h-7 rounded-full bg-white grid place-items-center"><Minus className="w-3.5 h-3.5" /></button>
                                    <span className="font-black text-sm w-5 text-center">{zq}</span>
                                    <button aria-label="plus" onClick={() => setItemQuantity(k, zq + 1)} className="w-7 h-7 rounded-full grid place-items-center text-white" style={{ background: PALETTE.accent }}><Plus className="w-3.5 h-3.5" /></button>
                                  </div>
                                ) : (
                                  <button onClick={() => add(it, z)} className="px-3 py-1.5 rounded-full text-[12px] font-black text-white" style={{ background: PALETTE.accent }}>{lang.startsWith('ar') ? 'أضف' : 'Add'}</button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
        {groups.length === 0 && <p className="text-center text-sm py-10" style={{ color: PALETTE.muted }}>{t('order.menu_empty')}</p>}
      </div>

      {/* شريط طلبي */}
      {mine && count > 0 && (
        <div className="fixed bottom-3 inset-x-3 z-30 max-w-2xl mx-auto rounded-3xl shadow-2xl px-4 py-3 flex items-center justify-between gap-3 text-white" style={{ background: PALETTE.ink }}>
          <Link href="/cart" className="flex items-center gap-2 no-underline text-white">
            <span className="w-8 h-8 rounded-full grid place-items-center font-black text-sm" style={{ background: PALETTE.accent }}>{count}</span>
            <div className="leading-tight">
              <p className="text-[12px] font-bold">{lang.startsWith('ar') ? 'طلبي' : 'My order'}</p>
              <p className="text-[12px] tabular-nums opacity-80">{priceLabel(subtotal, currency, lang)}</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            {business.phone && (
              <button onClick={waOrder} className="px-3.5 py-2 rounded-full text-[12.5px] font-black flex items-center gap-1" style={{ background: '#25D366' }}>
                <MessageCircle className="w-4 h-4" /> {lang.startsWith('ar') ? 'اطلب واتساب' : 'WhatsApp'}
              </button>
            )}
            <Link href="/cart" className="px-3.5 py-2 rounded-full text-[12.5px] font-black no-underline text-white flex items-center gap-1" style={{ background: PALETTE.accent }}>
              <ShoppingBag className="w-4 h-4" /> {lang.startsWith('ar') ? 'إتمام' : 'Checkout'}
            </Link>
          </div>
        </div>
      )}
      <p className="sr-only">{currencyLabel(currency, lang)}</p>
    </div>
  )
}
