'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  ArrowRight, Calendar, Building2, ShoppingBag,
  LogOut, Loader2, Lock, User, Phone, Crown, ChevronLeft,
  CheckCircle, Clock, AlertCircle, FolderTree, Edit2, Check, X, Heart,
  BarChart3,
} from 'lucide-react'

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
  const [favoritesCount, setFavoritesCount] = useState(0)
  const [signingOut, setSigningOut] = useState(false)

  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

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
      const { count: bCount } = await supabaseBrowser
        .from('marketplace_bookings')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', session.user.id)

      setBookingsCount(bCount || 0)

      // @ts-expect-error
      const { count: fCount } = await supabaseBrowser
        .from('favorites')
        .select('listing_id', { count: 'exact', head: true })
        .eq('customer_id', session.user.id)

      setFavoritesCount(fCount || 0)
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

  const startEditingName = () => {
    setNewName(profile?.full_name || '')
    setNameError(null)
    setEditingName(true)
  }

  const saveName = async () => {
    if (!profile) return
    const trimmed = newName.trim()
    if (!trimmed) {
      setNameError('الاسم مينفعش يبقى فاضي')
      return
    }
    if (trimmed.length > 100) {
      setNameError('الاسم طويل جداً')
      return
    }
    setSavingName(true)
    setNameError(null)
    // @ts-expect-error
    const { error } = await supabaseBrowser
      .from('profiles')
      .update({ full_name: trimmed })
      .eq('id', profile.id)

    setSavingName(false)
    if (error) {
      setNameError('فشل الحفظ: ' + error.message)
      return
    }
    setProfile({ ...profile, full_name: trimmed })
    setEditingName(false)
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
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-start gap-3 mb-2">
            <div className="w-14 h-14 bg-[#1F5F3F]/10 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-7 h-7 text-[#1F5F3F]" />
            </div>
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    maxLength={100}
                    autoFocus
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30 focus:border-[#1F5F3F]"
                    placeholder="الاسم بالكامل"
                  />
                  {nameError && <p className="text-xs text-red-600">{nameError}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={saveName}
                      disabled={savingName}
                      className="flex items-center gap-1 px-3 py-1.5 bg-[#1F5F3F] text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                    >
                      {savingName ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      حفظ
                    </button>
                    <button
                      onClick={() => { setEditingName(false); setNameError(null) }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium"
                    >
                      <X className="w-3 h-3" />
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-gray-900 truncate">
                      {profile?.full_name || 'مستخدم'}
                    </h2>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5" dir="ltr">
                      <Phone className="w-3 h-3" />
                      {profile?.phone}
                    </p>
                  </div>
                  <button
                    onClick={startEditingName}
                    className="p-1.5 text-gray-400 hover:text-[#1F5F3F] hover:bg-gray-50 rounded-lg flex-shrink-0"
                    title="تعديل الاسم"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            {isAdmin && !editingName && (
              <span className="bg-[#B8860B]/10 text-[#B8860B] text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 flex-shrink-0">
                <Crown className="w-3 h-3" /> أدمن
              </span>
            )}
          </div>

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

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">العميل</h3>
          </div>
          <Link
            href="/account/bookings"
            className="flex items-center gap-3 p-4 hover:bg-gray-50 border-b border-gray-100"
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
            href="/account/favorites"
            className="flex items-center gap-3 p-4 hover:bg-gray-50 border-b border-gray-100"
          >
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Heart className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">المفضلة</p>
              <p className="text-xs text-gray-500">
                {favoritesCount > 0 ? `${favoritesCount} listing` : 'مفيش حاجة محفوظة'}
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
                <p className="text-xs text-gray-500">listings + الحجوزات + الإيراد</p>
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

        {isAdmin && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="text-xs font-semibold text-[#B8860B] uppercase tracking-wider flex items-center gap-1">
                <Crown className="w-3 h-3" /> الإدارة
              </h3>
            </div>
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-3 p-4 hover:bg-gray-50 border-b border-gray-100"
            >
              <div className="w-10 h-10 bg-[#B8860B]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-5 h-5 text-[#B8860B]" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">لوحة الإحصائيات</p>
                <p className="text-xs text-gray-500">الحجوزات + الإيراد + الموردين + Top listings</p>
              </div>
              <ChevronLeft className="w-4 h-4 text-gray-400" />
            </Link>
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

        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full bg-white border border-red-200 text-red-600 rounded-2xl p-4 hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
        >
          {signingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
          {signingOut ? 'جاري الخروج...' : 'تسجيل خروج'}
        </button>

        <p className="text-xs text-center text-gray-400 pt-2">
          Madmona Marketplace v1.0
        </p>
      </main>
    </div>
  )
}
