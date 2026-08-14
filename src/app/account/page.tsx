'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { safeStorage } from '@/lib/safe-storage'
import {
  ArrowRight, Calendar, Building2, ShoppingBag,
  LogOut, Loader2, Lock, User, Phone, Crown, ChevronLeft,
  CheckCircle, Clock, AlertCircle, FolderTree, Edit2, Check, X, Heart,
  BarChart3, Wallet, UtensilsCrossed, Star, PlusCircle, Users, Smartphone, Mail,
} from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import PushNotificationCard from '@/components/PushNotificationCard'
import AccountSwitcher from '@/components/AccountSwitcher'
import MyAssetsCard from '@/components/MyAssetsCard'
import { useT } from '@/lib/i18n/LanguageProvider'

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
  const { t, dir } = useT()
  const router = useRouter()

  const [stage, setStage] = useState<Stage>('loading')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [bookingsCount, setBookingsCount] = useState(0)
  const [ordersCount, setOrdersCount] = useState(0)
  const [favoritesCount, setFavoritesCount] = useState(0)
  const [signingOut, setSigningOut] = useState(false)
  const [restaurantListingId, setRestaurantListingId] = useState<string | null>(null)

  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) {
        // ⚠️ (15 Jul 2026) مفيش جلسة Supabase ≠ مش مسجّل دخول.
        // فيه ناس داخلة بالواتساب (توكن في localStorage) — دول كانوا بيشوفوا
        // «سجّل دخولك» غلط رغم إنهم داخلين فعلاً. لو معاهم توكن، بنسيبهم
        // يكمّلوا: MyAssetsCard بتفهم التوكن وهتوريهم حاجاتهم.
        const waToken =
          typeof window !== 'undefined' ? safeStorage.get('madmona_token') : null
        if (waToken) { setStage('ready'); return }
        setStage('unauthenticated')
        return
      }

      const { data: prof } = await supabaseBrowser
        .from('profiles')
        .select('id, phone, full_name, role')
        .eq('id', session.user.id)
        .maybeSingle()

      setProfile(prof as Profile | null)

      const { data: sup } = await supabaseBrowser
        .from('marketplace_suppliers')
        .select('id, business_name, kyc_status')
        .eq('profile_id', session.user.id)
        .maybeSingle()

      setSupplier(sup as Supplier | null)

      // 🍽️ صاحب مطعم؟ ندوّر على إعلان ليه فيه أصناف منيو.
      // لو لقينا، بنفتحله لينك مباشر على إدارة المنيو من «حسابي» —
      // من غير ما يلف على الماركتبليس ويدوّر على إعلانه.
      // الأنواع المولّدة ماتعرفش الجداول دي، فبنعدّي منها صراحة
      // بدل @ts-expect-error اللي بيفضل معلّق لما الأنواع تتغيّر.
      const db = supabaseBrowser as unknown as {
        from: (t: string) => any
      }
      const supRow = sup as Supplier | null

      if (supRow?.id) {
        const { data: myListings } = await db
          .from('listings')
          .select('id')
          .eq('supplier_id', supRow.id)
          .limit(50)

        const ids = ((myListings ?? []) as { id: string }[]).map((l) => l.id)
        if (ids.length > 0) {
          const { data: menuRow } = await db
            .from('restaurant_menu_items')
            .select('listing_id')
            .in('listing_id', ids)
            .limit(1)
            .maybeSingle()

          const lid = (menuRow as { listing_id?: string } | null)?.listing_id
          if (lid) setRestaurantListingId(lid)
        }
      }

      const { count: bCount } = await supabaseBrowser
        .from('marketplace_bookings')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', session.user.id)

      setBookingsCount(bCount || 0)

      const { count: oCount } = await supabaseBrowser
        .from('marketplace_orders')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', session.user.id)

      setOrdersCount(oCount || 0)

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
    if (!confirm(t('account.confirm_signout'))) return
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
      setNameError(t('account.err_name_empty'))
      return
    }
    if (trimmed.length > 100) {
      setNameError(t('account.err_name_long'))
      return
    }
    setSavingName(true)
    setNameError(null)
    const { error } = await supabaseBrowser
      .from('profiles')
      .update({ full_name: trimmed })
      .eq('id', profile.id)

    setSavingName(false)
    if (error) {
      setNameError(t('account.save_failed') + error.message)
      return
    }
    setProfile({ ...profile, full_name: trimmed })
    setEditingName(false)
  }

  if (stage === 'loading') {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center" dir={dir}>
        <Loader2 className="w-6 h-6 text-[#059669] animate-spin" />
      </div>
    )
  }

  if (stage === 'unauthenticated') {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center p-4" dir={dir}>
        <div className="bg-white rounded-3xl shadow-luxe p-10 text-center max-w-sm animate-scale-in">
          <div className="w-16 h-16 bg-[#34D399]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-[#059669]" />
          </div>
          <h1 className="font-black text-2xl mb-2">{t('booking.login_first')}</h1>
          <p className="text-sm text-gray-500 mb-5">{t('account.login_sub')}</p>
          <Link
            href="/auth/login?redirect=/account"
            className="block bg-[#34D399] text-[#04352A] py-3.5 rounded-2xl font-bold shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 transition-all mb-3"
          >
            {t('auth.login.title')}
          </Link>
          <Link
            href="/auth/signup?redirect=/account"
            className="block text-sm text-[#059669] font-bold hover:underline"
          >
            {t('auth.no_account')}
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
    <div className="min-h-screen gradient-mesh pb-24 md:pb-12" dir={dir}>
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-[#34D399]/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      <header className="sticky top-0 z-40 glass border-b border-white/40">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/"
            className="w-9 h-9 bg-white shadow-soft hover:shadow-card hover:-translate-y-0.5 rounded-full flex items-center justify-center transition-all"
          >
            <ArrowRight className="w-4 h-4 text-gray-700" />
          </Link>
          <h1 className="text-lg font-black text-gray-900">{t('nav.account')}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4 relative">
        {/* Profile card */}
        <div className="bg-white rounded-3xl shadow-card p-6 relative overflow-hidden animate-slide-up">
          <div className="absolute top-0 left-0 w-32 h-32 bg-[#34D399]/5 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-[#2FA084]/5 rounded-full blur-2xl pointer-events-none" />

          <div className="relative">
            <div className="flex items-start gap-4 mb-2">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#34D399] to-[#34D399] flex items-center justify-center flex-shrink-0 shadow-elevated">
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
                      className="w-full px-3 py-2 bg-[#FAFAF7] border border-gray-100 rounded-xl text-sm font-medium focus:outline-none focus:bg-white focus:border-[#059669]/40 focus:ring-4 focus:ring-[#059669]/10 transition-all"
                      placeholder={t('auth.name_label')}
                    />
                    {nameError && <p className="text-xs text-red-600">{nameError}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={saveName}
                        disabled={savingName}
                        className="flex items-center gap-1 px-3 py-1.5 bg-[#34D399] text-[#04352A] rounded-lg text-xs font-bold disabled:opacity-50"
                      >
                        {savingName ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        {t('common.save')}
                      </button>
                      <button
                        onClick={() => { setEditingName(false); setNameError(null) }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium"
                      >
                        <X className="w-3 h-3" />
                        {t('common.cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h2 className="font-black text-xl text-gray-900 truncate">
                        {profile?.full_name || t('listing.guest')}
                      </h2>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1" dir="ltr">
                        <Phone className="w-3 h-3" />
                        {profile?.phone}
                      </p>
                    </div>
                    <button
                      onClick={startEditingName}
                      className="p-1.5 text-gray-400 hover:text-[#059669] hover:bg-gray-50 rounded-lg flex-shrink-0 transition-colors"
                      title={t('account.edit_name')}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              {isAdmin && !editingName && (
                <span className="bg-gradient-to-r from-[#2FA084] to-[#d4a017] text-white text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 flex-shrink-0 shadow-soft">
                  <Crown className="w-3 h-3" /> {t('account.admin_badge')}
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
                    {isApprovedSupplier ? t('account.supplier_verified') :
                     isPendingSupplier ? t('account.supplier_pending') :
                     t('account.supplier_suspended')}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 🔑 حاجاتي — كل أصل مربوط برقم المستخدم (مشاريع · إعلانات · أنشطة).
            فوق خالص لأن ده سبب دخول المُعلن الأساسي. بيختفي لوحده لو مفيش أصول. */}
        <div className="animate-slide-up">
          <MyAssetsCard />
        </div>

        {/* (4 Aug 2026) عرض اللونش/بانر المورّد اتشال بقرار محمد */}

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
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('account.section_customer')}</p>
          </div>
          <SectionLink
            href="/account/bookings"
            icon={<Calendar className="w-5 h-5" />}
            iconBg="bg-blue-50 text-blue-600"
            title={t('account.my_bookings')}
            subtitle={bookingsCount > 0 ? t('account.n_bookings', { n: bookingsCount }) : t('account.no_bookings')}
          />
          <div className="h-px bg-gray-100 mx-6" />
          <SectionLink
            href="/account/orders"
            icon={<ShoppingBag className="w-5 h-5" />}
            iconBg="bg-orange-50 text-orange-600"
            title="أوردراتي"
            subtitle={ordersCount > 0 ? `${ordersCount} أوردر` : 'لسه ما طلبتش حاجة'}
          />
          <div className="h-px bg-gray-100 mx-6" />
          <SectionLink
            href="/account/wallet"
            icon={<Wallet className="w-5 h-5" />}
            iconBg="bg-emerald-50 text-emerald-600"
            title="محفظتي"
            subtitle="الرصيد، الشحن، التحويل والسحب"
          />
          <div className="h-px bg-gray-100 mx-6" />
          <SectionLink
            href="/account/devices"
            icon={<Smartphone className="w-5 h-5" />}
            iconBg="bg-teal-50 text-teal-600"
            title="الأجهزة المتصلة"
            subtitle="شوف مين فاتح حسابك واقفل أي جهاز"
          />
          <div className="h-px bg-gray-100 mx-6" />
          <SectionLink
            href="/account/email"
            icon={<Mail className="w-5 h-5" />}
            iconBg="bg-sky-50 text-sky-600"
            title="الإيميل"
            subtitle="ضيف أو غيّر إيميلك الحقيقي — عشان الأكواد توصلك"
          />
          <div className="h-px bg-gray-100 mx-6" />
          <SectionLink
            href="/account/favorites"
            icon={<Heart className="w-5 h-5" />}
            iconBg="bg-red-50 text-red-500"
            title={t('nav.favorites')}
            subtitle={favoritesCount > 0 ? t('account.n_favorites', { n: favoritesCount }) : t('account.no_favorites')}
          />
          <div className="h-px bg-gray-100 mx-6" />
          <SectionLink
            href="/marketplace"
            icon={<ShoppingBag className="w-5 h-5" />}
            iconBg="bg-purple-50 text-purple-600"
            title={t('listing.browse_marketplace')}
            subtitle={t('account.browse_sub')}
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
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('account.section_supplier')}</p>
            </div>
            <SectionLink
              href="/supplier/marketplace"
              icon={<Building2 className="w-5 h-5" />}
              iconBg="bg-[#34D399]/10 text-[#059669]"
              title={t('account.supplier_dashboard')}
              subtitle={t('account.supplier_dashboard_sub')}
            />

            {/* 🍽️ صاحب مطعم → المنيو على طول.
                ده أكتر تاب بيدخله يوميًا (سعر اتغيّر · صنف خلص)،
                فماينفعش يلف عليه من جوّه الماركتبليس كل مرة. */}
            {restaurantListingId && (
              <>
                <div className="h-px bg-gray-100 mx-6" />
                <SectionLink
                  href={`/supplier/marketplace/${restaurantListingId}/menu`}
                  icon={<UtensilsCrossed className="w-5 h-5" />}
                  iconBg="bg-orange-50 text-orange-600"
                  title="منيو المطعم"
                  subtitle="الأصناف والأسعار — عدّل أو وقّف صنف"
                />
              </>
            )}

            {/* باقي التابات — كانت كلها موجودة بس محدش بيوصلها
                غير لو عرف يلف عليها من جوّه الماركتبليس */}
            <div className="h-px bg-gray-100 mx-6" />
            <SectionLink
              href="/supplier/marketplace/orders"
              icon={<ShoppingBag className="w-5 h-5" />}
              iconBg="bg-blue-50 text-blue-600"
              title="الطلبات"
              subtitle="الطلبات الجديدة والجارية"
            />
            <div className="h-px bg-gray-100 mx-6" />
            <SectionLink
              href="/supplier/marketplace/bookings"
              icon={<Calendar className="w-5 h-5" />}
              iconBg="bg-purple-50 text-purple-600"
              title="الحجوزات"
              subtitle="مواعيد عملائك"
            />
            <div className="h-px bg-gray-100 mx-6" />
            <SectionLink
              href="/supplier/marketplace/reviews"
              icon={<Star className="w-5 h-5" />}
              iconBg="bg-amber-50 text-amber-600"
              title="التقييمات"
              subtitle="رأي العملاء في شغلك"
            />
            <div className="h-px bg-gray-100 mx-6" />
            {/* (22 يوليو 2026) وحّدنا فورم الإضافة: التاب ده بقى يفتح /add-listing
                نفسه (الفورم الكامل بخطوة اختيار مسطّحة one-tap + بيلدر المنيو)
                بدل /supplier/marketplace/new — عشان مفيش فورمين مختلفين يعملوا كونفلكت. */}
            <SectionLink
              href="/add-listing"
              icon={<PlusCircle className="w-5 h-5" />}
              iconBg="bg-green-50 text-green-600"
              title="أضف إعلان"
              subtitle="منتج أو خدمة جديدة"
            />
            <div className="h-px bg-gray-100 mx-6" />
            <SectionLink
              href="/supplier/team"
              icon={<Users className="w-5 h-5" />}
              iconBg="bg-slate-50 text-slate-600"
              title="الفريق"
              subtitle="ضيف موظفين يشتغلوا معاك"
            />
            <div className="h-px bg-gray-100 mx-6" />
            <SectionLink
              href="/supplier/erp/accounting"
              icon={<BarChart3 className="w-5 h-5" />}
              iconBg="bg-teal-50 text-teal-600"
              title="الحسابات"
              subtitle="مبيعاتك ومستحقاتك"
            />
          </div>
        )}

        {/* Admin section */}
        {isAdmin && (
          <div className="bg-white rounded-3xl shadow-soft overflow-hidden animate-slide-up delay-300">
            <div className="px-6 py-3 border-b border-gray-100">
              <p className="text-[10px] font-black text-[#2FA084] uppercase tracking-widest flex items-center gap-1">
                <Crown className="w-3 h-3" /> {t('account.admin_section')}
              </p>
            </div>
            <SectionLink
              href="/admin/dashboard"
              icon={<BarChart3 className="w-5 h-5" />}
              iconBg="bg-[#2FA084]/10 text-[#2FA084]"
              title={t('account.admin_stats')}
              subtitle={t('account.admin_stats_sub')}
            />
            <div className="h-px bg-gray-100 mx-6" />
            <SectionLink
              href="/admin/marketplace-suppliers"
              icon={<Building2 className="w-5 h-5" />}
              iconBg="bg-[#2FA084]/10 text-[#2FA084]"
              title={t('account.admin_suppliers')}
              subtitle={t('account.admin_suppliers_sub')}
            />
            <div className="h-px bg-gray-100 mx-6" />
            <SectionLink
              href="/admin/categories"
              icon={<FolderTree className="w-5 h-5" />}
              iconBg="bg-[#2FA084]/10 text-[#2FA084]"
              title={t('account.admin_categories')}
              subtitle={t('account.admin_categories_sub')}
            />
          </div>
        )}

        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full bg-white border border-red-200 text-red-600 rounded-3xl p-4 hover:bg-red-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2 font-bold animate-slide-up delay-400"
        >
          {signingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
          {signingOut ? t('account.signing_out') : t('account.sign_out')}
        </button>

        <p className="text-xs text-center text-gray-400 pt-2">
          {t('account.version')}
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
      <ChevronLeft className="w-4 h-4 text-gray-400 group-hover:text-[#059669] group-hover:-translate-x-1 transition-all" />
    </Link>
  )
}
