'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import ListingForm from '@/components/marketplace/ListingForm'
import { ArrowRight, Loader2, AlertCircle, Lock } from 'lucide-react'

// ============================================================================
// /supplier/marketplace/new
// Create a new listing. Requires authenticated + approved supplier.
// ============================================================================

type Stage = 'loading' | 'unauthenticated' | 'no-supplier' | 'not-approved' | 'ready'

export default function NewListingPage() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>('loading')
  const [supplierId, setSupplierId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) {
        setStage('unauthenticated')
        return
      }
      setUserId(session.user.id)

      // @ts-expect-error
      const { data: sup } = await supabaseBrowser
        .from('marketplace_suppliers')
        .select('id, kyc_status')
        .eq('profile_id', session.user.id)
        .maybeSingle()

      if (!sup) {
        setStage('no-supplier')
        return
      }
      if (sup.kyc_status !== 'approved') {
        setStage('not-approved')
        return
      }

      setSupplierId(sup.id)
      setStage('ready')
    }
    init()
  }, [])

  if (stage === 'loading') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    )
  }

  if (stage === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl border p-8 text-center max-w-sm">
          <Lock className="w-8 h-8 text-[#1F5F3F] mx-auto mb-3" />
          <h1 className="font-bold mb-4">سجّل دخول الأول</h1>
          <Link
            href={`/auth/login?redirect=${encodeURIComponent('/supplier/marketplace/new')}`}
            className="block bg-[#1F5F3F] text-white py-3 rounded-xl font-semibold"
          >
            تسجيل دخول
          </Link>
        </div>
      </div>
    )
  }

  if (stage === 'no-supplier' || stage === 'not-approved') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl border p-8 text-center max-w-md">
          <AlertCircle className="w-8 h-8 text-yellow-600 mx-auto mb-3" />
          <h1 className="font-bold mb-2">
            {stage === 'no-supplier' ? 'لازم تسجل كمورد الأول' : 'حسابك لسه قيد المراجعة'}
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            {stage === 'no-supplier'
              ? 'عشان تضيف listings، لازم تكون مورد موثّق على Madmona.'
              : 'لما الإدارة توافق على حسابك، هتقدر تبدأ تضيف listings.'}
          </p>
          <Link
            href={stage === 'no-supplier' ? '/supplier/register' : '/supplier/marketplace'}
            className="inline-block bg-[#1F5F3F] text-white px-5 py-2.5 rounded-xl font-semibold"
          >
            {stage === 'no-supplier' ? 'سجّل دلوقتي' : 'العودة'}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/supplier/marketplace" className="p-1 hover:bg-gray-50 rounded-full">
            <ArrowRight className="w-4 h-4 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">listing جديد</h1>
            <p className="text-xs text-gray-500">املا الـ5 خطوات لنشر الـlisting</p>
          </div>
        </div>
      </header>

      <main className="px-4 py-6">
        {supplierId && userId && (
          <ListingForm supplierId={supplierId} userId={userId} />
        )}
      </main>
    </div>
  )
}
