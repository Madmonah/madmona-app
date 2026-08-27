'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useT } from '@/lib/i18n/LanguageProvider'
import {
  ArrowRight, Trash2, Minus, Plus, ShoppingBag, Store,
  AlertCircle, ChevronLeft, Image as ImageIcon,
} from 'lucide-react'
import {
  useCart, setItemQuantity, removeItem, clearCart, cartSubtotal,
} from '@/lib/cart'

// ============================================================================
// /cart
// Single-supplier cart review page. Mobile-first.
// Cart lives in localStorage (see lib/cart.ts). This page just displays it,
// lets the user adjust quantities / remove items / continue to checkout.
// ============================================================================

export default function CartPage() {
  const { t, locale } = useT()
  const router = useRouter()
  const cart = useCart()
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const isEmpty = cart.items.length === 0
  const subtotal = cartSubtotal(cart)

  // ---- Empty state ----
  if (isEmpty) {
    return (
      <div className="min-h-screen gradient-mesh" dir="rtl">
        <header className="sticky top-0 z-40 glass border-b border-white/40">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
            <Link
              href="/marketplace"
              className="w-9 h-9 bg-white shadow-soft hover:shadow-card rounded-full flex items-center justify-center transition-all"
            >
              <ArrowRight className="w-4 h-4 text-gray-700" />
            </Link>
            <h1 className="text-sm font-bold text-gray-700">{t('cart.title')}</h1>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-3xl shadow-card p-10 max-w-md mx-auto">
            <div className="w-20 h-20 mx-auto mb-5 bg-gray-100 rounded-3xl flex items-center justify-center">
              <ShoppingBag className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2">{t('cart.empty')}</h2>
            <p className="text-sm text-gray-500 mb-6">
              {t('cart.empty_sub')}
            </p>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 bg-[#34D399] text-[#04352A] px-6 py-3 rounded-2xl font-bold shadow-elevated hover:-translate-y-0.5 hover:shadow-luxe transition-all"
            >
              {t('cart.browse')}
              <ChevronLeft className="w-4 h-4" />
            </Link>
          </div>
        </main>
      </div>
    )
  }

  // ---- Cart with items ----
  return (
    <div className="min-h-screen gradient-mesh pb-32 lg:pb-12" dir="rtl">
      <header className="sticky top-0 z-40 glass border-b border-white/40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
          <Link
            href="/marketplace"
            className="w-9 h-9 bg-white shadow-soft hover:shadow-card rounded-full flex items-center justify-center transition-all flex-shrink-0"
          >
            <ArrowRight className="w-4 h-4 text-gray-700" />
          </Link>
          <h1 className="text-sm font-bold text-gray-700 flex-1">
            {t('cart.title')} <span className="text-gray-400 tabular">({cart.items.length})</span>
          </h1>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="text-xs font-bold text-red-600 hover:text-red-700 px-3 py-1.5 rounded-full hover:bg-red-50 transition-all"
          >
            {t('cart.clear_all')}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Supplier banner */}
        {cart.supplier_name && (
          <div className="bg-white rounded-2xl shadow-soft p-4 flex items-center gap-3 animate-slide-up">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#34D399] to-[#34D399] flex items-center justify-center flex-shrink-0">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                {cart.order_type === 'food' ? t('cart.restaurant') : t('cart.store')}
              </p>
              <p className="font-bold text-gray-900 truncate">{cart.supplier_name}</p>
            </div>
          </div>
        )}

        {/* Items list */}
        <section className="bg-white rounded-3xl shadow-soft overflow-hidden animate-slide-up delay-100">
          <div className="divide-y divide-gray-100">
            {cart.items.map((item) => (
              <div key={item.key} className="p-4 flex gap-3">
                {/* Photo */}
                <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {item.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-7 h-7 text-gray-300" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 line-clamp-2 mb-1">{item.name}</h3>
                  <p className="text-xs text-gray-500 tabular mb-2">
                    {item.unit_price.toLocaleString(locale.startsWith('ar') ? 'ar-EG' : 'en-US')} {t('cart.egp')} × {item.quantity}
                  </p>

                  {item.notes && (
                    <p className="text-[11px] text-gray-500 italic mb-2 line-clamp-1">
                      {t('cart.note')} {item.notes}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    {/* Qty stepper */}
                    <div className="flex items-center gap-2 bg-gray-100 rounded-full p-1">
                      <button
                        onClick={() => setItemQuantity(item.key, Math.max(1, item.quantity - 1))}
                        disabled={item.quantity <= 1}
                        className="w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        aria-label="إنقاص"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-sm font-black tabular w-6 text-center">
                        {item.quantity.toLocaleString('ar-EG')}
                      </span>
                      <button
                        onClick={() => setItemQuantity(item.key, item.quantity + 1)}
                        className="w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 transition-all"
                        aria-label="زيادة"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Line total + remove */}
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black text-[#059669] tabular">
                        {(item.unit_price * item.quantity).toLocaleString('ar-EG')}
                        <span className="text-[10px] font-medium text-gray-500 ms-1">{t('cart.egp')}</span>
                      </p>
                      <button
                        onClick={() => removeItem(item.key)}
                        className="w-8 h-8 hover:bg-red-50 rounded-full flex items-center justify-center transition-all group"
                        aria-label="حذف"
                      >
                        <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Subtotal */}
          <div className="bg-gradient-to-l from-[#34D399]/5 to-transparent border-t border-[#059669]/10 px-4 py-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-700">{t('cart.subtotal')}</span>
              <span className="text-2xl font-black text-[#059669] tabular">
                {subtotal.toLocaleString('ar-EG')}
                <span className="text-sm font-medium text-gray-500 ms-1">{t('cart.egp')}</span>
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              {t('cart.delivery_at_checkout')}
            </p>
          </div>
        </section>

        {/* Continue shopping (desktop) */}
        <div className="hidden lg:flex justify-between items-center pt-2">
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-[#059669] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {t('cart.continue')}
          </Link>
          <button
            onClick={() => router.push('/checkout')}
            className="inline-flex items-center gap-2 bg-[#34D399] text-[#04352A] px-8 py-4 rounded-2xl font-bold shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 transition-all"
          >
            {t('cart.checkout')}
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </main>

      {/* Mobile sticky bottom CTA */}
      <div className="fixed bottom-0 inset-x-0 glass border-t border-white/40 z-50 lg:hidden shadow-luxe">
        <div className="max-w-3xl mx-auto p-3 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('cart.total')}</p>
            <p className="text-xl font-black text-[#059669] tabular leading-tight">
              {subtotal.toLocaleString('ar-EG')}
              <span className="text-xs font-medium text-gray-500 ms-1">{t('cart.egp')}</span>
            </p>
          </div>
          <button
            onClick={() => router.push('/checkout')}
            className="flex items-center gap-1.5 bg-[#34D399] text-[#04352A] px-6 py-3.5 rounded-2xl font-bold text-sm shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 transition-all"
          >
            {t('cart.confirm')}
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Clear confirm modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-luxe p-6 max-w-sm w-full animate-scale-in">
            <div className="w-12 h-12 mx-auto mb-3 bg-red-100 rounded-2xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-2 text-center">{t('cart.clear_q')}</h3>
            <p className="text-sm text-gray-500 mb-5 text-center">
              {t('cart.clear_sub')}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-all"
              >
                {t('cart.keep')}
              </button>
              <button
                onClick={() => {
                  clearCart()
                  setShowClearConfirm(false)
                }}
                className="flex-1 bg-red-600 text-white py-3 rounded-2xl font-bold text-sm shadow-card hover:bg-red-700 transition-all"
              >
                {t('cart.clear_btn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
