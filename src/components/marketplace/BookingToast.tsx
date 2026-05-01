'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell, X } from 'lucide-react'

// ============================================================
// BookingToast — appears top-right when a new booking arrives.
// Auto-dismisses after 8 seconds. Click to navigate.
// ============================================================

interface BookingToastProps {
  visible: boolean
  bookingId: string | null
  onDismiss: () => void
}

export default function BookingToast({ visible, bookingId, onDismiss }: BookingToastProps) {
  const [animateIn, setAnimateIn] = useState(false)

  useEffect(() => {
    if (visible) {
      // Mount immediately, then animate in next frame
      requestAnimationFrame(() => setAnimateIn(true))
      const timer = setTimeout(() => {
        setAnimateIn(false)
        setTimeout(onDismiss, 300)
      }, 8000)
      return () => clearTimeout(timer)
    } else {
      setAnimateIn(false)
    }
  }, [visible, onDismiss])

  if (!visible) return null

  const href = bookingId ? `/supplier/marketplace/bookings/${bookingId}` : '/supplier/marketplace/bookings'

  return (
    <div
      dir="rtl"
      className={`fixed top-20 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-[9999] transition-all duration-300 ${
        animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
    >
      <Link
        href={href}
        className="block bg-white border border-[#1F5F3F]/20 rounded-2xl shadow-lg p-4 hover:shadow-xl no-underline"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-[#1F5F3F]/10 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
            <Bell className="w-5 h-5 text-[#1F5F3F]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm">حجز جديد!</p>
            <p className="text-xs text-gray-600 mt-0.5">اضغط لشوف التفاصيل وتأكيد الدفع</p>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setAnimateIn(false)
              setTimeout(onDismiss, 300)
            }}
            className="p-1 text-gray-400 hover:bg-gray-50 rounded flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </Link>
    </div>
  )
}
