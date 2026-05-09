'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Phone OTP authentication has been retired in favor of WhatsApp-based booking.
// This route exists only to gracefully redirect any old links / bookmarks
// back to the home page.
export default function AuthPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/')
  }, [router])

  return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
      <p className="text-gray-500">جاري التحويل...</p>
    </div>
  )
}
