'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { Loader2, ShieldAlert, LogIn, Lock } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

/* ============================================================
   Auth guard for /admin/business-finance/[supplierId]/*
   Only a Madmona platform admin OR the owner/manager of this
   supplier (e.g. Ahmed for Elite) may view these pages.
   Protects the index AND all sub-pages in one place.
   ============================================================ */

export default function BusinessFinanceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { supplierId: string }
}) {
  const { supplierId } = params
  const [state, setState] = useState<'checking' | 'allowed' | 'no_session' | 'denied'>('checking')

  useEffect(() => {
    (async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('madmona_token') : null
      if (!token) { setState('no_session'); return }
      // @ts-expect-error rpc typing
      const { data } = await supabase.rpc('admin_check_finance_access', {
        p_token: token, p_supplier_id: supplierId,
      })
      if (data?.allowed) setState('allowed')
      else if (data?.reason === 'no_session') setState('no_session')
      else setState('denied')
    })()
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [supplierId])

  if (state === 'checking') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-8 h-8 text-[#1F6F5F] animate-spin" />
      </div>
    )
  }

  if (state === 'allowed') return <>{children}</>

  // Gate screen (no session or not authorized)
  return (
    <div className="min-h-screen bg-[#1F6F5F] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-white grid place-items-center mx-auto mb-4">
          <Lock className="w-7 h-7 text-[#1F6F5F]" />
        </div>
        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          {state === 'no_session' ? (
            <>
              <h1 className="text-xl font-black text-[#1A2E26] mb-2">صفحة خاصة بالإدارة</h1>
              <p className="text-sm text-[#6B7280] mb-6 leading-relaxed">
                لازم تسجّل دخول الأول عشان تشوف الصفحة دي. الدخول بالموبايل + كود واتساب.
              </p>
              <Link href="/login" className="w-full py-3 rounded-xl bg-[#1F6F5F] text-white font-black text-sm flex items-center justify-center gap-2">
                <LogIn className="w-4 h-4" /> تسجيل الدخول
              </Link>
            </>
          ) : (
            <>
              <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <h1 className="text-xl font-black text-[#1A2E26] mb-2">مالكش صلاحية</h1>
              <p className="text-sm text-[#6B7280] mb-6 leading-relaxed">
                حسابك مش مصرّح له بدخول لوحة الإدارة دي. لو ده غلط، تواصل مع إدارة مضمونة.
              </p>
              <Link href="/home" className="w-full py-3 rounded-xl bg-[#FAFAF7] text-[#1A2E26] font-bold text-sm flex items-center justify-center gap-2 border border-gray-200">
                ارجع لحسابك
              </Link>
            </>
          )}
        </div>
        <p className="text-center text-[10px] text-white/60 mt-6">madmonacairo.com · إدارة</p>
      </div>
    </div>
  )
}
