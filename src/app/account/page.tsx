'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  ArrowRight, Calendar, Building2, Settings, ShoppingBag,
  LogOut, Loader2, Lock, User, Phone, Crown, ChevronLeft,
  CheckCircle, Clock, AlertCircle, FolderTree,
} from 'lucide-react'

// ============================================================================
// /account
// 
// Customer/supplier/admin account hub. Single landing page after login that
// adapts to the user's role and surfaces all relevant actions in one place.
// ============================================================================

type Stage = 'loading' | 'unauthenticated' | 'ready'

interface Profile {
  id: string
  phone: string
  full_name: string | null
  role: 'customer' | 'supplier' | 'admin'
}

interface Supplier {
  id: string
  business_name: string
  kyc_status: 'pending' | 'approved' | 'rejected' | 'suspended'
}

export default function AccountPage() {
  const router = useRouter()

  const [stage, setStage] = useState<Stage>('loading')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [bookingsCount, setBookingsCount] = useState(0)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) {
        setStage('unauthenticated')
        return
      }

      // @ts-expect-error
      const { data: prof } = await supabaseBrowser
        .from('profiles')
        .select('id, phone, full_name, role')
        .eq('id', session.user.id)
        .maybeSingle()

      setProfile(prof as Profile | null)

      // @ts-expect-error
      const { data: sup } = await supabaseBrowser
        .from('marketplace_suppliers')
        .select('id, business_name, kyc_status')
        .eq('profile_id', session.user.id)
        .maybeSingle()

      setSupplier(sup as Supplier | null)

      // @ts-expect-error
      const { count } = await supabaseBrowser
        .from('marketplace_bookings')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', session.user.id)

      setBookingsCount(count || 0)
      setStage('ready')
    }
    init()
  }, [])

  const handleSignOut = async () => {
    if (!confirm('متأكد إنك عايز تخرج؟')) return
    setSigningOut(true)
    await supabaseBrowser.auth.signOut()
    router.push('/')
    router.refresh()
  }

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
            href="/auth/login?redirect=/account"
            className="block bg-[#1F5F3F] text-white py-3 rounded-xl font-semibold mb-2"
          >
            تسجيل دخول
          </Link>
          <Link
            href="/auth/signup?redirect=/account"
            className="block text-sm text-gray-600 hover:text-[#1F5F3F]"
          >
            مفيش حساب؟ اعمل حساب جديد
          </Link>
        </div>
      </div>
    )
  }

  const isAdmin = profile?.role === 'admin'
  const isApprovedSupplier = supplier?.kyc_status === 'approved'
  const isPendingSupplier = supplier?.kyc_status === 'pending'
  const isRejectedSupplier = supplier && ['rejected', 'suspended'].includes(supplier.kyc_status)

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="p-1 hover:bg-gray-50 rounded-full">
            <ArrowRight className="w-5 h-5 text-gray-700" />
          </Link>
          <h1 className="text-lg font-bold text-gray-900">حسابي</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 bg-[#1F5F3F]/10 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-7 h-7 text-[#1F5F3F]" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-gray-900 truncate">
                {profile?.full_name || 'مستخدم'}
              </h2>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5" dir="ltr">
                <Phone className="w-3 h-3" />
                {profile?.phone}
              </p>
            </div>
            {isAdmin && (
              <span className="bg-[#B8860B]/10 text-[#B8860B] text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                <Crown className="w-3 h-3" /> أدمن
              </span>
            )}
          </div>

          {/* Supplier status badges */}
          {supplier && (
            <div className={`mt-3 p-3 rounded-xl border text-sm ${
              isApprovedSupplier ? 'bg-green-50 border-green-200 text-green-900' :
              isPendingSupplier ? 'bg-yellow-50 border-yellow-200 text-yellow-900' :
              'bg-red-50 border-red-200 text-red-900'
            }`}>
              <div className="flex items-center gap-2">
                {isApprovedSupplier ? <CheckCircle className="w-4 h-4" /> :
                 isPendingSupplier ? <Clock className="w-4 h-4" /> :
                 <AlertCircle className="w-4 h-4" />}
                <span className="font-semibold">{supplier.business_name}</span>
                <span className="text-xs opacity-75 mr-auto">
                  {isApprovedSupplier ? 'مورد موثّق' :
                   isPendingSupplier ? 'قيد المراجعة' :
                   'موقوف'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Customer actions */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">العميل</h3>
          </div>
          <Link
            href="/account/bookings"
            className="flex items-center gap-3 p-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
          >
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">حجوزاتي</p>
              <p className="text-xs text-gray-500">
                {bookingsCount > 0 ? `${bookingsCount} حجز` : 'لسه ما حجزتش حاجة'}
              </p>
            </div>
            <ChevronLeft className="w-4 h-4 text-gray-400" />
          </Link>
          <Link
            href="/marketplace"
            className="flex items-center gap-3 p-4 hover:bg-gray-50"
          >
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">تصفح الـMarketplace</p>
              <p className="text-xs text-gray-500">دور على listings تحجزها</p>
            </div>
            <ChevronLeft className="w-4 h-4 text-gray-400" />
          </Link>
        </div>

        {/* Supplier actions */}
        {(isApprovedSupplier || isPendingSupplier || isRejectedSupplier) && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">المورد</h3>
            </div>
            <Link
              href="/supplier/marketplace"
              className="flex items-center gap-3 p-4 hover:bg-gray-50"
            >
              <div className="w-10 h-10 bg-[#1F5F3F]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-[#1F5F3F]" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">لوحة المورد</p>
                <p className="text-xs text-gray-500">listings + الحجوزات</p>
              </div>
              <ChevronLeft className="w-4 h-4 text-gray-400" />
            </Link>
          </div>
        )}

        {!supplier && (
          <Link
            href="/supplier/register"
            className="block bg-white rounded-2xl border border-gray-100 p-4 hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#1F5F3F]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-[#1F5F3F]" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">سجّل كمورد</p>
                <p className="text-xs text-gray-500">عندك مساحة أو خدمة تأجير؟ اعرضها</p>
              </div>
              <ChevronLeft className="w-4 h-4 text-gray-400" />
            </div>
          </Link>
        )}

        {/* Admin actions */}
        {isAdmin && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="text-xs font-semibold text-[#B8860B] uppercase tracking-wider flex items-center gap-1">
                <Crown className="w-3 h-3" /> الإدارة
              </h3>
            </div>
            <Link
              href="/admin/marketplace-suppliers"
              className="flex items-center gap-3 p-4 hover:bg-gray-50 border-b border-gray-100"
            >
              <div className="w-10 h-10 bg-[#B8860B]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-[#B8860B]" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">طلبات الموردين</p>
                <p className="text-xs text-gray-500">موافقة/رفض الموردين الجدد</p>
              </div>
              <ChevronLeft className="w-4 h-4 text-gray-400" />
            </Link>
            <Link
              href="/admin/categories"
              className="flex items-center gap-3 p-4 hover:bg-gray-50"
            >
              <div className="w-10 h-10 bg-[#B8860B]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <FolderTree className="w-5 h-5 text-[#B8860B]" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">إدارة الفئات</p>
                <p className="text-xs text-gray-500">الفئات + الخصائص الديناميكية</p>
              </div>
              <ChevronLeft className="w-4 h-4 text-gray-400" />
            </Link>
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full bg-white border border-red-200 text-red-600 rounded-2xl p-4 hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
        >
          {signingOut ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <LogOut className="w-4 h-4" />
          )}
          {signingOut ? 'جاري الخروج...' : 'تسجيل خروج'}
        </button>

        <p className="text-xs text-center text-gray-400 pt-2">
          Madmona Marketplace v1.0
        </p>
      </main>
    </div>
  )
}
