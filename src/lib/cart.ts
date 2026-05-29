// ============================================================
// src/lib/cart.ts
// Single-supplier cart stored in localStorage.
// Backs orders for restaurants (food) and products.
// Bookings (rentals/services/hybrid) do NOT use this cart.
// ============================================================

import { useEffect, useState } from 'react'

export type CartItemKind = 'food' | 'product'

export type CartItem = {
  // Unique key per cart line.
  // For products: equals listing_id (one product per listing).
  // For food:     equals menu_item_id (multiple menu items per restaurant listing).
  key: string
  listing_id: string
  menu_item_id?: string | null
  name: string
  photo_url?: string | null
  unit_price: number
  quantity: number
  notes?: string
}

export type Cart = {
  supplier_id: string | null
  supplier_name?: string | null
  order_type: CartItemKind | null
  // For restaurants: the restaurant listing id (constant across items).
  // For products: may be null when cart has multiple product listings from same supplier.
  primary_listing_id?: string | null
  items: CartItem[]
}

const CART_KEY = 'madmona_cart_v1'
const EVENT_NAME = 'madmona-cart-change'

function emptyCart(): Cart {
  return {
    supplier_id: null,
    supplier_name: null,
    order_type: null,
    primary_listing_id: null,
    items: [],
  }
}

// ---------- raw read/write ----------
export function readCart(): Cart {
  if (typeof window === 'undefined') return emptyCart()
  try {
    const raw = window.localStorage.getItem(CART_KEY)
    if (!raw) return emptyCart()
    const parsed = JSON.parse(raw) as Cart
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.items)) {
      return emptyCart()
    }
    return parsed
  } catch {
    return emptyCart()
  }
}

function writeCart(cart: Cart) {
  if (typeof window === 'undefined') return
  try {
    if (!cart.items || cart.items.length === 0) {
      window.localStorage.removeItem(CART_KEY)
    } else {
      window.localStorage.setItem(CART_KEY, JSON.stringify(cart))
    }
    window.dispatchEvent(new CustomEvent(EVENT_NAME))
  } catch {}
}

// ---------- derived stats ----------
export function cartItemCount(cart: Cart): number {
  return cart.items.reduce((sum, it) => sum + (it.quantity || 0), 0)
}

export function cartSubtotal(cart: Cart): number {
  return cart.items.reduce((sum, it) => sum + it.unit_price * it.quantity, 0)
}

// ---------- mutations ----------
export type AddResult =
  | { ok: true; cart: Cart }
  | { ok: false; reason: 'cross_supplier'; existing_cart: Cart }

export function addToCart(args: {
  supplier_id: string
  supplier_name?: string | null
  order_type: CartItemKind
  primary_listing_id?: string | null
  item: Omit<CartItem, 'quantity'> & { quantity?: number }
  force?: boolean // if true, clears existing cart first
}): AddResult {
  const current = readCart()

  // Cross-supplier guard: a cart can only hold items from ONE supplier.
  if (
    current.supplier_id &&
    current.supplier_id !== args.supplier_id &&
    !args.force
  ) {
    return { ok: false, reason: 'cross_supplier', existing_cart: current }
  }

  // Reset cart if force or switching supplier
  const startFresh =
    args.force ||
    !current.supplier_id ||
    current.supplier_id !== args.supplier_id

  const next: Cart = startFresh
    ? {
        supplier_id: args.supplier_id,
        supplier_name: args.supplier_name ?? null,
        order_type: args.order_type,
        primary_listing_id: args.primary_listing_id ?? null,
        items: [],
      }
    : { ...current, items: [...current.items] }

  const qty = Math.max(1, args.item.quantity ?? 1)
  const existingIdx = next.items.findIndex((it) => it.key === args.item.key)
  if (existingIdx >= 0) {
    next.items[existingIdx] = {
      ...next.items[existingIdx],
      quantity: next.items[existingIdx].quantity + qty,
    }
  } else {
    next.items.push({
      key: args.item.key,
      listing_id: args.item.listing_id,
      menu_item_id: args.item.menu_item_id ?? null,
      name: args.item.name,
      photo_url: args.item.photo_url ?? null,
      unit_price: args.item.unit_price,
      quantity: qty,
      notes: args.item.notes,
    })
  }

  writeCart(next)
  return { ok: true, cart: next }
}

export function setItemQuantity(key: string, quantity: number) {
  const cart = readCart()
  const idx = cart.items.findIndex((it) => it.key === key)
  if (idx < 0) return
  if (quantity <= 0) {
    cart.items.splice(idx, 1)
  } else {
    cart.items[idx] = { ...cart.items[idx], quantity }
  }
  if (cart.items.length === 0) {
    clearCart()
  } else {
    writeCart(cart)
  }
}

export function removeItem(key: string) {
  setItemQuantity(key, 0)
}

export function setItemNotes(key: string, notes: string | undefined) {
  const cart = readCart()
  const idx = cart.items.findIndex((it) => it.key === key)
  if (idx < 0) return
  cart.items[idx] = { ...cart.items[idx], notes: notes?.trim() || undefined }
  writeCart(cart)
}

export function clearCart() {
  writeCart(emptyCart())
}

// ---------- React hook ----------
export function useCart(): Cart {
  const [cart, setCart] = useState<Cart>(() => emptyCart())
  useEffect(() => {
    // Initial read (avoids SSR hydration mismatch)
    setCart(readCart())
    const onChange = () => setCart(readCart())
    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_KEY) setCart(readCart())
    }
    window.addEventListener(EVENT_NAME, onChange)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(EVENT_NAME, onChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [])
  return cart
}

// ---------- helper for checkout payload ----------
export function buildOrderItemsPayload(cart: Cart): Array<{
  listing_id: string
  menu_item_id?: string | null
  quantity: number
  item_notes?: string
}> {
  return cart.items.map((it) => ({
    listing_id: it.listing_id,
    menu_item_id: it.menu_item_id ?? null,
    quantity: it.quantity,
    item_notes: it.notes,
  }))
}
