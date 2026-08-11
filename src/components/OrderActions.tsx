'use client'

// ============================================================
// src/components/OrderActions.tsx
// Order entry UI for restaurants (menu) + products (buy box).
// Used on the marketplace listing detail page.
// ============================================================

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Minus, ShoppingCart, AlertCircle, Check, X } from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageProvider'
import {
  addToCart,
  useCart,
  setItemQuantity,
  cartItemCount,
  cartSubtotal,
  type Cart,
} from '@/lib/cart'

// ---------- shared types ----------
export type MenuItemSize = {
  id: string
  name_ar: string
  price: number
  display_order?: number
  is_available?: boolean
}

export type MenuItem = {
  id: string
  name_ar: string
  name_en?: string | null
  description_ar?: string | null
  description_en?: string | null
  price: number
  photo_url?: string | null
  category?: string | null
  is_available: boolean
  display_order?: number
  sizes?: MenuItemSize[]
}

export type MartProduct = {
  id: string
  name_ar: string
  name_en?: string | null
  description_ar?: string | null
  price: number
  compare_at_price?: number | null
  unit?: string | null
  brand?: string | null
  category?: string | null
  photo_url?: string | null
  in_stock: boolean
  is_available: boolean
  display_order?: number
}

type Listing = { id: string; title: string }
type Supplier = { id: string; business_name: string }

// ============================================================
// 1) RestaurantMenu — full menu list for restaurant detail pages
// ============================================================
export function RestaurantMenu({
  listing,
  supplier,
  menuItems,
}: {
  listing: Listing
  supplier: Supplier
  menuItems: MenuItem[]
}) {
  const { t, lang } = useT()
  const cart = useCart()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [crossWarn, setCrossWarn] = useState<{ mi: MenuItem; size: MenuItemSize | null } | null>(null)

  const available = menuItems.filter((mi) => mi.is_available)

  if (available.length === 0) {
    return (
      <div className="bg-white rounded-3xl shadow-soft p-8 text-center">
        <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-2xl flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-sm font-bold text-gray-700">{t('order.menu_empty')}</p>
        <p className="text-xs text-gray-500 mt-1">{t('order.menu_empty_sub')}</p>
      </div>
    )
  }

  // Group by category (free-text)
  const grouped = new Map<string, MenuItem[]>()
  for (const it of available) {
    const cat = (it.category || '').trim() || '__general__'
    const arr = grouped.get(cat) || []
    arr.push(it)
    grouped.set(cat, arr)
  }
  // Stable order: respect first-seen order in array
  const orderedCats = Array.from(grouped.keys())

  function buildFoodItem(mi: MenuItem, size: MenuItemSize | null) {
    return {
      key: size ? `${mi.id}:${size.id}` : mi.id,
      listing_id: listing.id,
      menu_item_id: mi.id,
      size_id: size?.id ?? null,
      size_name: size?.name_ar ?? null,
      name: size ? `${mi.name_ar} (${size.name_ar})` : mi.name_ar,
      photo_url: mi.photo_url ?? null,
      unit_price: size ? size.price : mi.price,
    }
  }

  function attemptAdd(mi: MenuItem, size: MenuItemSize | null = null) {
    const result = addToCart({
      supplier_id: supplier.id,
      supplier_name: supplier.business_name,
      order_type: 'food',
      primary_listing_id: listing.id,
      item: buildFoodItem(mi, size),
    })
    if (!result.ok) {
      setCrossWarn({ mi, size })
      return
    }
    setPendingId(size ? `${mi.id}:${size.id}` : mi.id)
    setTimeout(() => setPendingId(null), 800)
  }

  function forceAdd() {
    if (!crossWarn) return
    addToCart({
      supplier_id: supplier.id,
      supplier_name: supplier.business_name,
      order_type: 'food',
      primary_listing_id: listing.id,
      item: buildFoodItem(crossWarn.mi, crossWarn.size),
      force: true,
    })
    setCrossWarn(null)
  }

  return (
    <div className="space-y-4">
      {orderedCats.map((cat) => {
        const items = grouped.get(cat) || []
        const catLabel =
          cat === '__general__' ? t('order.menu_section_general') : cat
        return (
          <section
            key={cat}
            className="bg-white rounded-3xl shadow-soft overflow-hidden"
          >
            <div className="px-5 pt-5 pb-3 border-b border-gray-50">
              <h3 className="text-sm font-black text-gray-900">{catLabel}</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                {items.length} {t('order.items')}
              </p>
            </div>
            <div className="divide-y divide-gray-50">
              {items.map((mi) => {
                const sizes = (mi.sizes || []).filter((s) => s.is_available !== false)
                const hasSizes = sizes.length > 0
                const inCart = cart.items.find((it) => it.menu_item_id === mi.id && !it.size_id)
                const qty = inCart?.quantity ?? 0
                const name =
                  lang === 'en' && mi.name_en ? mi.name_en : mi.name_ar
                const desc =
                  lang === 'en' && mi.description_en
                    ? mi.description_en
                    : mi.description_ar
                const minSize = hasSizes ? Math.min(...sizes.map((s) => s.price)) : mi.price
                return (
                  <div
                    key={mi.id}
                    className="flex items-start gap-3 p-4 hover:bg-gray-50/50 transition"
                  >
                    {mi.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={mi.photo_url}
                        alt={name}
                        className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 leading-tight">
                        {name}
                      </p>
                      {desc && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                          {desc}
                        </p>
                      )}
                      <p className="text-sm font-black text-[#FA8125] mt-2 tabular">
                        {hasSizes && (
                          <span className="text-xs font-normal text-gray-500">
                            {lang === 'en' ? 'from ' : 'يبدأ من '}
                          </span>
                        )}
                        {minSize.toLocaleString(
                          lang === 'ar' ? 'ar-EG' : 'en-US',
                        )}{' '}
                        <span className="text-xs font-normal text-gray-500">
                          {t('common.egp')}
                        </span>
                      </p>

                      {/* sizes selector */}
                      {hasSizes && (
                        <div className="mt-2.5 space-y-1.5">
                          {sizes.map((sz) => {
                            const line = cart.items.find(
                              (it) => it.key === `${mi.id}:${sz.id}`,
                            )
                            const szQty = line?.quantity ?? 0
                            return (
                              <div
                                key={sz.id}
                                className="flex items-center justify-between gap-2 bg-[#FAFAF7] rounded-xl px-3 py-1.5"
                              >
                                <span className="text-xs font-bold text-gray-700">
                                  {sz.name_ar}
                                  <span className="text-[#FA8125] font-black mr-2 tabular">
                                    {' '}{sz.price.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                                  </span>
                                </span>
                                {szQty > 0 ? (
                                  <QtyStepper
                                    qty={szQty}
                                    onDec={() => setItemQuantity(`${mi.id}:${sz.id}`, szQty - 1)}
                                    onInc={() => setItemQuantity(`${mi.id}:${sz.id}`, szQty + 1)}
                                  />
                                ) : (
                                  <button
                                    onClick={() => attemptAdd(mi, sz)}
                                    className="bg-[#FA8125] text-white w-7 h-7 rounded-lg flex items-center justify-center shadow-soft hover:shadow-card transition-all flex-shrink-0"
                                    aria-label={`${t('order.add')} ${sz.name_ar}`}
                                  >
                                    {pendingId === `${mi.id}:${sz.id}` ? (
                                      <Check className="w-3.5 h-3.5" />
                                    ) : (
                                      <Plus className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                    {!hasSizes && (
                      <div className="flex-shrink-0 self-center">
                        {qty > 0 ? (
                          <QtyStepper
                            qty={qty}
                            onDec={() => setItemQuantity(mi.id, qty - 1)}
                            onInc={() => setItemQuantity(mi.id, qty + 1)}
                          />
                        ) : (
                          <button
                            onClick={() => attemptAdd(mi)}
                            className="bg-[#FA8125] text-white px-3 py-2 rounded-xl text-xs font-bold shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all flex items-center gap-1"
                          >
                            {pendingId === mi.id ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <Plus className="w-3.5 h-3.5" />
                            )}
                            {pendingId === mi.id ? t('order.added') : t('order.add')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}

      {crossWarn && (
        <CrossSupplierModal
          existingCart={cart}
          incomingName={crossWarn.mi.name_ar}
          onConfirm={forceAdd}
          onCancel={() => setCrossWarn(null)}
        />
      )}
    </div>
  )
}

// ============================================================
// 1.5) MartProductsCatalog — products list under one listing
//      (mart_products) — works like RestaurantMenu but order_type=product
// ============================================================
export function MartProductsCatalog({
  listing,
  supplier,
  products,
}: {
  listing: Listing
  supplier: Supplier
  products: MartProduct[]
}) {
  const { t, lang } = useT()
  const cart = useCart()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [crossWarn, setCrossWarn] = useState<MartProduct | null>(null)

  const available = products.filter((p) => p.is_available)
  if (available.length === 0) return null

  const grouped = new Map<string, MartProduct[]>()
  for (const p of available) {
    const cat = (p.category || '').trim() || '__general__'
    const arr = grouped.get(cat) || []
    arr.push(p)
    grouped.set(cat, arr)
  }
  const orderedCats = Array.from(grouped.keys())

  function buildItem(p: MartProduct) {
    return {
      key: p.id,
      listing_id: listing.id,
      mart_product_id: p.id,
      name: p.name_ar,
      photo_url: p.photo_url ?? null,
      unit_price: p.price,
    }
  }

  function attemptAdd(p: MartProduct) {
    const result = addToCart({
      supplier_id: supplier.id,
      supplier_name: supplier.business_name,
      order_type: 'product',
      primary_listing_id: listing.id,
      item: buildItem(p),
    })
    if (!result.ok) {
      setCrossWarn(p)
      return
    }
    setPendingId(p.id)
    setTimeout(() => setPendingId(null), 800)
  }

  function forceAdd() {
    if (!crossWarn) return
    addToCart({
      supplier_id: supplier.id,
      supplier_name: supplier.business_name,
      order_type: 'product',
      primary_listing_id: listing.id,
      item: buildItem(crossWarn),
      force: true,
    })
    setCrossWarn(null)
  }

  return (
    <div className="space-y-4">
      {orderedCats.map((cat) => {
        const items = grouped.get(cat) || []
        const catLabel = cat === '__general__' ? (lang === 'en' ? 'Products' : 'المنتجات') : cat
        return (
          <section key={cat} className="bg-white rounded-3xl shadow-soft overflow-hidden">
            <div className="px-5 pt-5 pb-3 border-b border-gray-50">
              <h3 className="text-sm font-black text-gray-900">{catLabel}</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                {items.length} {t('order.items')}
              </p>
            </div>
            <div className="divide-y divide-gray-50">
              {items.map((p) => {
                const line = cart.items.find((it) => it.key === p.id)
                const qty = line?.quantity ?? 0
                const name = lang === 'en' && p.name_en ? p.name_en : p.name_ar
                const oos = !p.in_stock
                return (
                  <div key={p.id} className="flex items-start gap-3 p-4 hover:bg-gray-50/50 transition">
                    {p.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photo_url} alt={name} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 leading-tight">{name}</p>
                      {(p.brand || p.unit) && (
                        <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                          {[p.brand, p.unit].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      {p.description_ar && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{p.description_ar}</p>
                      )}
                      <p className="text-sm font-black text-[#FA8125] mt-2 tabular">
                        {p.price.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}{' '}
                        <span className="text-xs font-normal text-gray-500">{t('common.egp')}</span>
                        {p.compare_at_price && p.compare_at_price > p.price && (
                          <span className="text-xs text-gray-400 line-through mr-2 tabular">
                            {p.compare_at_price.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex-shrink-0 self-center">
                      {oos ? (
                        <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2.5 py-1.5 rounded-lg">
                          {lang === 'en' ? 'Out of stock' : 'غير متوفر'}
                        </span>
                      ) : qty > 0 ? (
                        <QtyStepper
                          qty={qty}
                          onDec={() => setItemQuantity(p.id, qty - 1)}
                          onInc={() => setItemQuantity(p.id, qty + 1)}
                        />
                      ) : (
                        <button
                          onClick={() => attemptAdd(p)}
                          className="bg-[#FA8125] text-white px-3 py-2 rounded-xl text-xs font-bold shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all flex items-center gap-1"
                        >
                          {pendingId === p.id ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                          {pendingId === p.id ? t('order.added') : t('order.add')}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}

      {crossWarn && (
        <CrossSupplierModal
          existingCart={cart}
          incomingName={crossWarn.name_ar}
          onConfirm={forceAdd}
          onCancel={() => setCrossWarn(null)}
        />
      )}
    </div>
  )
}

// ============================================================
// 2) ProductBuyBox — sidebar buy box for product detail pages
// ============================================================
export function ProductBuyBox({
  listing,
  supplier,
  price,
}: {
  listing: Listing
  supplier: Supplier
  price: number
}) {
  const { t, lang } = useT()
  const router = useRouter()
  const cart = useCart()
  const [qty, setQty] = useState(1)
  const [pending, setPending] = useState(false)
  const [crossWarn, setCrossWarn] = useState(false)

  const inCart = cart.items.find((it) => it.listing_id === listing.id)
  const sameSupplier = cart.supplier_id === supplier.id

  function attemptAdd(goToCart: boolean) {
    const result = addToCart({
      supplier_id: supplier.id,
      supplier_name: supplier.business_name,
      order_type: 'product',
      primary_listing_id: listing.id,
      item: {
        key: listing.id,
        listing_id: listing.id,
        name: listing.title,
        unit_price: price,
        quantity: qty,
      },
    })
    if (!result.ok) {
      setCrossWarn(true)
      return
    }
    setPending(true)
    setTimeout(() => {
      setPending(false)
      if (goToCart) router.push('/cart')
    }, 600)
  }

  function forceAdd() {
    addToCart({
      supplier_id: supplier.id,
      supplier_name: supplier.business_name,
      order_type: 'product',
      primary_listing_id: listing.id,
      item: {
        key: listing.id,
        listing_id: listing.id,
        name: listing.title,
        unit_price: price,
        quantity: qty,
      },
      force: true,
    })
    setCrossWarn(false)
  }

  return (
    <div className="bg-white rounded-3xl shadow-card p-6 space-y-4">
      <div>
        <p className="text-xs font-bold text-[#2FA084] uppercase tracking-widest mb-1">
          {t('order.price')}
        </p>
        <p className="text-3xl font-black text-[#FA8125] tabular leading-tight">
          {price.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
          <span className="text-base font-medium text-gray-500 ms-1">
            {t('common.egp')}
          </span>
        </p>
      </div>

      <div className="flex items-center justify-between pt-2">
        <p className="text-sm font-medium text-gray-700">{t('order.quantity')}</p>
        <QtyStepper
          qty={qty}
          onDec={() => setQty(Math.max(1, qty - 1))}
          onInc={() => setQty(qty + 1)}
        />
      </div>

      <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
        <p className="text-sm font-medium text-gray-600">{t('order.total')}</p>
        <p className="text-xl font-black text-[#FA8125] tabular">
          {(price * qty).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}{' '}
          <span className="text-xs font-normal text-gray-500">
            {t('common.egp')}
          </span>
        </p>
      </div>

      <button
        onClick={() => attemptAdd(false)}
        className="w-full bg-[#FA8125] text-white py-3.5 rounded-2xl font-bold text-sm shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
      >
        {pending ? (
          <Check className="w-4 h-4" />
        ) : (
          <ShoppingCart className="w-4 h-4" />
        )}
        {pending
          ? t('order.added')
          : inCart
            ? t('order.add_more')
            : t('order.add_to_cart')}
      </button>

      <button
        onClick={() => attemptAdd(true)}
        className="w-full bg-white border-2 border-[#FA8125] text-[#FA8125] py-3 rounded-2xl font-bold text-sm hover:bg-[#FA8125]/5 transition-all flex items-center justify-center gap-2"
      >
        <ShoppingCart className="w-4 h-4" />
        {t('order.buy_now')}
      </button>

      {sameSupplier && cartItemCount(cart) > 0 && (
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
          <span className="text-gray-500">
            {t('order.in_cart')}: {cartItemCount(cart)} {t('order.items')}
          </span>
          <button
            onClick={() => router.push('/cart')}
            className="font-bold text-[#FA8125] hover:underline"
          >
            {t('order.view_cart')} ←
          </button>
        </div>
      )}

      {crossWarn && (
        <CrossSupplierModal
          existingCart={cart}
          incomingName={listing.title}
          onConfirm={forceAdd}
          onCancel={() => setCrossWarn(false)}
        />
      )}
    </div>
  )
}

// ============================================================
// 3) CartCheckoutBar — floating bottom bar with cart total + checkout CTA
// Shows only when current page's supplier matches cart's supplier
// ============================================================
export function CartCheckoutBar({ supplierId }: { supplierId: string }) {
  const { t, lang } = useT()
  const router = useRouter()
  const cart = useCart()

  if (cart.supplier_id !== supplierId) return null
  const count = cartItemCount(cart)
  if (count === 0) return null

  const subtotal = cartSubtotal(cart)

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-100 shadow-luxe lg:hidden">
      <div className="max-w-6xl mx-auto p-3 flex items-center gap-3">
        <div className="flex-1">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            {t('order.cart_total')} · {count} {t('order.items')}
          </p>
          <p className="text-xl font-black text-[#FA8125] tabular leading-tight">
            {subtotal.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}{' '}
            <span className="text-xs font-normal text-gray-500">
              {t('common.egp')}
            </span>
          </p>
        </div>
        <button
          onClick={() => router.push('/cart')}
          className="bg-[#FA8125] text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-elevated hover:-translate-y-0.5 transition-all flex items-center gap-2"
        >
          <ShoppingCart className="w-4 h-4" />
          {t('order.checkout_now')}
        </button>
      </div>
    </div>
  )
}

// ============================================================
// shared sub-components
// ============================================================
function QtyStepper({
  qty,
  onDec,
  onInc,
}: {
  qty: number
  onDec: () => void
  onInc: () => void
}) {
  return (
    <div className="flex items-center gap-2 bg-[#FAFAF7] rounded-xl p-1">
      <button
        onClick={onDec}
        className="w-7 h-7 bg-white rounded-lg flex items-center justify-center hover:bg-gray-50 transition shadow-soft"
        type="button"
      >
        <Minus className="w-3 h-3" />
      </button>
      <span className="w-7 text-center text-sm font-black tabular text-gray-900">
        {qty}
      </span>
      <button
        onClick={onInc}
        className="w-7 h-7 bg-[#FA8125] text-white rounded-lg flex items-center justify-center hover:bg-[#FA8125]/90 transition shadow-soft"
        type="button"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  )
}

function CrossSupplierModal({
  existingCart,
  incomingName,
  onConfirm,
  onCancel,
}: {
  existingCart: Cart
  incomingName: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const { t } = useT()
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-luxe animate-scale-in">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-black text-gray-900">
            {t('order.cross_supplier_title')}
          </h3>
          <button
            onClick={onCancel}
            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-1 leading-relaxed">
          {t('order.cross_supplier_msg_1')}{' '}
          <strong className="text-gray-900">
            {existingCart.supplier_name || '-'}
          </strong>
          .
        </p>
        <p className="text-sm text-gray-600 mb-5 leading-relaxed">
          {t('order.cross_supplier_msg_2')}{' '}
          <strong className="text-gray-900">{incomingName}</strong>{' '}
          {t('order.cross_supplier_msg_3')}
        </p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition"
            type="button"
          >
            {t('order.keep_current')}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition"
            type="button"
          >
            {t('order.clear_and_add')}
          </button>
        </div>
      </div>
    </div>
  )
}
