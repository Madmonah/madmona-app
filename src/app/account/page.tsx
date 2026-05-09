'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  ArrowRight, Calendar, Building2, ShoppingBag,
  LogOut, Loader2, Lock, User, Phone, Crown, ChevronLeft,
  CheckCircle, Clock, AlertCircle, FolderTree, Edit2, Check, X, Heart,
  BarChart3, Sparkles,
} from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import PushNotificationCard from '@/components/PushNotificationCard'
import AccountSwitcher from '@/components/AccountSwitcher'
import WelcomeSupplierBanner from '@/components/WelcomeSupplierBanner'

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
      <div className="min-h-screen gradient-mesh flex items-center justify-center" dir="rtl">
        <Loader2 className="w-6 h-6 text-[#1F5F3F] animate-spin" />
      </div>
    )
  }

  if (stage === 'unauthenticated') {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl shadow-luxe p-10 text-center max-w-sm animate-scale-in">
          <div className="w-16 h-16 bg-[#1F5F3F]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-[#1F5F3F]" />
          </div>
          <h1 className="font-black text-2xl mb-2">سجّل دخول الأول</h1>
          <p className="text-sm text-gray-500 mb-5">ادخل عشان تشوف حسابك</p>
          <Link
            href="/auth/login?redirect=/account"
            className="block bg-[#1F5F3F] text-white py-3.5 rounded-2xl font-bold shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 transition-all mb-3"
          >
            تسجيل دخول
          </Link>
          <Link
            href="/auth/signup?redirect=/account"
            className="block text-sm text-[#1F5F3F] font-bold hover:underline"
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
    <div className="min-h-screen gradient-mesh pb-24 md:pb-12" dir="rtl">
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-[#1F5F3F]/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      <header className="sticky top-0 z-40 glass border-b border-white/40">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/"
            className="w-9 h-9 bg-white shadow-soft hover:shadow-card hover:-translate-y-0.5 rounded-full flex items-center justify-center transition-all"
          >
            <ArrowRight className="w-4 h-4 text-gray-700" />
          </Link>
          <h1 className="text-lg font-black text-gray-900">حسابي</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4 relative">
        {/* Profile card */}
        <div className="bg-white rounded-3xl shadow-card p-6 relative overflow-hidden animate-slide-up">
          <div className="absolute top-0 left-0 w-32 h-32 bg-[#1F5F3F]/5 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-[#B8860B]/5 rounded-full blur-2xl pointer-events-none" />

          <div className="relative">
            <div className="flex items-start gap-4 mb-2">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1F5F3F] to-[#2d7a52] flex items-center justify-center flex-shrink-0 shadow-elevated">
                <User className="w-8 h-8 text-white" />
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
                      className="w-full px-3 py-2 bg-[#FAFAF7] border border-gray-100 rounded-xl text-sm font-medium focus:outline-none focus:bg-white focus:border-[#1F5F3F]/40 focus:ring-4 focus:ring-[#1F5F3F]/10 transition-all"
                      placeholder="الاسم بالكامل"
                    />
                    {nameError && <p className="text-xs text-red-600">{nameError}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={saveName}
                        disabled={savingName}
                        className="flex items-center gap-1 px-3 py-1.5 bg-[#1F5F3F] text-white rounded-lg text-xs font-bold disabled:opacity-50"
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
                      <h2 className="font-black text-xl text-gray-900 truncate">
                        {profile?.full_name || 'مستخدم'}
                      </h2>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1" dir="ltr">
                        <Phone className="w-3 h-3" />
                        {profile?.phone}
                      </p>
                    </div>
                    <button
                      onClick={startEditingName}
                      className="p-1.5 text-gray-400 hover:text-[#1F5F3F] hover:bg-gray-50 rounded-lg flex-shrink-0 transition-colors"
                      title="تعديل الاسم"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              {isAdmin && !editingName && (
                <span className="bg-gradient-to-r from-[#B8860B] to-[#d4a017] text-white text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 flex-shrink-0 shadow-soft">
                  <Crown className="w-3 h-3" /> أدمن
                </span>
              )}
            </div>

            {supplier && (
              <div className={`mt-4 p-3 rounded-2xl text-sm border ${
                isApprovedSupplier ? 'bg-green-50/80 border-green-200 text-green-900' :
                isPendingSupplier ? 'bg-yellow-50/80 border-yellow-200 text-yellow-900' :
                'bg-red-50/80 border-red-200 text-red-900'
              }`}>
                <div className="flex items-center gap-2">
                  {isApprovedSupplier ? <CheckCircle className="w-4 h-4" /> :
                   isPendingSupplier ? <Clock className="w-4 h-4" /> :
                   <AlertCircle className="w-4 h-4" />}
                  <span className="font-bold">{supplier.business_name}</span>
                  <span className="text-xs opacity-75 mr-auto">
                    {isApprovedSupplier ? 'أجر معانا موثّق' :
                     isPendingSupplier ? 'قيد المراجعة' :
                     'موقوف'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 🌟 WELCOME BANNER — shown only if user has no supplier record yet */}
        {!supplier && (
          <WelcomeSupplierBanner userName={profile?.full_name} />
        )}

        {/* 🔁 Account Switcher — switch between accounts WITHOUT browser */}
        <div className="animate-slide-up delay-75">
          <AccountSwitcher
            currentPhone={profile?.phone}
            currentLabel={profile?.full_name}
            currentRole={profile?.role}
          />
        </div>

        {/* Customer section */}
        <div className="bg-white rounded-3xl shadow-soft overflow-hidden animate-slide-up delay-100">
          <div className="px-6 py-3 border-b border-gray-100">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">أجر مننا</p>
          </div>
          <SectionLink
            href="/account/bookings"
            icon={<Calendar className="w-5 h-5" />}
            iconBg="bg-blue-50 text-blue-600"
            title="حجوزاتي"
            subtitle={bookingsCount > 0 ? `${bookingsCount} حجز` : 'لسه ما حجزتش حاجة'}
          />
          <div className="h-px bg-gray-100 mx-6" />
          <SectionLink
            href="/account/favorites"
            icon={<Heart className="w-5 h-5" />}
            iconBg="bg-red-50 text-red-500"
            title="المفضلة"
            subtitle={favoritesCount > 0 ? `${favoritesCount} listing` : 'مفيش حاجة محفوظة'}
          />
          <div className="h-px bg-gray-100 mx-6" />
          <SectionLink
            href="/marketplace"
            icon={<ShoppingBag className="w-5 h-5" />}
            iconBg="bg-purple-50 text-purple-600"
            title="تصفّح الـMarketplace"
            subtitle="دور على listings تحجزها"
          />
        </div>

        {/* Push notifications card */}
        <div className="animate-slide-up delay-150">
          <PushNotificationCard />
        </div>

        {/* Supplier section — shown only if user IS a supplier */}
        {(isApprovedSupplier || isPendingSupplier || isRejectedSupplier) && (
          <div className="bg-white rounded-3xl shadow-soft overflow-hidden animate-slide-up delay-200">
            <div className="px-6 py-3 border-b border-gray-100">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">أجر معانا</p>
            </div>
            <SectionLink
              href="/supplier/marketplace"
              icon={<Building2 className="w-5 h-5" />}
              iconBg="bg-[#1F5F3F]/10 text-[#1F5F3F]"
              title="لوحة أجر معانا"
              subtitle="listings + الحجوزات + الإيراد"
            />
          </div>
        )}

        {/* Admin section */}
        {isAdmin && (
          <div className="bg-white rounded-3xl shadow-soft overflow-hidden animate-slide-up delay-300">
            <div className="px-6 py-3 border-b border-gray-100">
              <p className="text-[10px] font-black text-[#B8860B] uppercase tracking-widest flex items-center gap-1">
                <Crown className="w-3 h-3" /> الإدارة
              </p>
            </div>
            <SectionLink
              href="/admin/dashboard"
              icon={<BarChart3 className="w-5 h-5" />}
              iconBg="bg-[#B8860B]/10 text-[#B8860B]"
              title="لوحة الإحصائيات"
              subtitle="الحجوزات + الإيراد + Top listings"
            />
            <div className="h-px bg-gray-100 mx-6" />
            <SectionLink
              href="/admin/marketplace-suppliers"
              icon={<Building2 className="w-5 h-5" />}
              iconBg="bg-[#B8860B]/10 text-[#B8860B]"
              title="طلبات أجر معانا"
              subtitle="موافقة/رفض أجر معانا الجدد"
            />
            <div className="h-px bg-gray-100 mx-6" />
            <SectionLink
              href="/admin/categories"
              icon={<FolderTree className="w-5 h-5" />}
              iconBg="bg-[#B8860B]/10 text-[#B8860B]"
              title="إدارة الفئات"
              subtitle="الفئات + الخصائص الديناميكية"
            />
          </div>
        )}

        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full bg-white border border-red-200 text-red-600 rounded-3xl p-4 hover:bg-red-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2 font-bold animate-slide-up delay-400"
        >
          {signingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
          {signingOut ? 'جاري الخروج...' : 'تسجيل خروج'}
        </button>

        <p className="text-xs text-center text-gray-400 pt-2">
          خدمات مضمونة v1.0
        </p>
      </main>

      <BottomNav />
    </div>
  )
}

function SectionLink({
  href, icon, iconBg, title, subtitle,
}: {
  href: string
  icon: React.ReactNode
  iconBg: string
  title: string
  subtitle: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 p-5 hover:bg-gray-50/60 transition-colors group no-underline"
    >
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-900">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
      </div>
      <ChevronLeft className="w-4 h-4 text-gray-400 group-hover:text-[#1F5F3F] group-hover:-translate-x-1 transition-all" />
    </Link>
  )
}
