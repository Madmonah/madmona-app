'use client'

// ============================================================
// CartButton — header cart icon with a live item-count badge.
// Links to /cart. Renders nothing while the cart is empty.
// Gives DESKTOP/laptop users persistent cart access — the
// floating CartCheckoutBar is mobile-only (lg:hidden), so on
// desktop there was previously no visible way to reach the cart.
// Added 8 Jun 2026 (Mohamed: "el kart msh zahra 3al laptop").
// ============================================================

import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { useCart, cartItemCount } from '@/lib/cart'

export default function CartButton({
  className = '',
  iconClass = 'w-5 h-5',
  iconColorClass = 'text-gray-700',
}: {
  className?: string
  iconClass?: string
  iconColorClass?: string
}) {
  const cart = useCart()
  const count = cartItemCount(cart)
  if (count === 0) return null

  return (
    <Link
      href="/cart"
      aria-label="السلة"
      title="السلة"
      className={`relative inline-flex items-center justify-center no-underline transition-all ${className}`}
    >
      <ShoppingCart className={`${iconClass} ${iconColorClass}`} />
      <span className="absolute -top-1.5 ltr:-right-1.5 rtl:-left-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#2B4521] text-white text-[10px] font-black flex items-center justify-center shadow-soft">
        {count > 99 ? '99+' : count}
      </span>
    </Link>
  )
}
