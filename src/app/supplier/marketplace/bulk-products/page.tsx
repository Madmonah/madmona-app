'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  ArrowRight, Loader2, AlertCircle, FileSpreadsheet, Package,
  ChevronDown, Plus, ExternalLink, ChefHat,
} from 'lucide-react'
import ExcelImportModal from '@/components/supplier/ExcelImportModal'

// ============================================================================
// /supplier/marketplace/bulk-products
// إضافة منتجات بالجملة (Excel) لأي مورد — أثاث، بقالة، قطع غيار... إلخ.
// المورد يختار الإعلان/المعرض من دروب ليست ويرفع شيت Excel واحد بكل منتجاته.
// المطاعم بتتحول لصفحة المنيو (ليها استيراد خاص بيها بالأحجام).
// ============================================================================

type Stage = 'loading' | 'unauthenticated' | 'no-supplier' | 'ready'
type ImportKind = 'products' | 'listings'

interface ListingOpt {
  id: string
  title: string
  status: string
  track: string | null
  products_count?: number
}

interface CatOpt {
  id: string
  name_ar: string
  group_name_ar: string | null
}

export default function BulkProductsPage() {
  const [stage, setStage] = useState<Stage>('loading')
  const [kind, setKind] = useState<ImportKind>('listings')
  const [listings, setListings] = useState<ListingOpt[]>([])
  const [restaurants, setRestaurants] = useState<ListingOpt[]>([])
  const [cats, setCats] = useState<CatOpt[]>([])
  const [defaultCat, setDefaultCat] = useState<string>('')
  const [selected, setSelected] = useState<string>('')
  const [showImport, setShowImport] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) { setStage('unauthenticated'); return }

      // owner supplier — or staff with listings permission
      const { data: own } = await supabaseBrowser
        .from('marketplace_suppliers')
        .select('id')
        .eq('profile_id', session.user.id)
        .maybeSingle()

      let supplierId: string | null = own?.id ?? null
      if (!supplierId) {
        const { data: staff } = await supabaseBrowser
          .from('supplier_staff')
          .select('supplier_id, can_manage_listings')
          .eq('profile_id', session.user.id)
          .eq('is_active', true)
          .eq('can_manage_listings', true)
          .maybeSingle()
        supplierId = staff?.supplier_id ?? null
      }
      if (!supplierId) { setStage('no-supplier'); return }

      const { data: ls } = await supabaseBrowser
        .from('listings')
        .select('id, title, status, category:categories(track)')
        .eq('supplier_id', supplierId)
        .in('status', ['published', 'draft', 'paused'])
        .order('created_at', { ascending: false })

      const all = ((ls || []) as { id: string; title: string; status: string; category?: { track?: string | null } | null }[])
        .map((l) => ({ id: l.id, title: l.title, status: l.status, track: l.category?.track ?? null }))

      const rest = all.filter((l) => l.track === 'restaurants')
      const nonRest = all.filter((l) => l.track !== 'restaurants')

      // products count per listing (for the dropdown labels)
      if (nonRest.length > 0) {
        const { data: counts } = await supabaseBrowser
          .from('mart_products')
          .select('listing_id')
          .in('listing_id', nonRest.map((l) => l.id))
        const map = new Map<string, number>()
        for (const c of (counts || []) as { listing_id: string }[]) {
          map.set(c.listing_id, (map.get(c.listing_id) || 0) + 1)
        }
        for (const l of nonRest) l.products_count = map.get(l.id) || 0
      }

      setListings(nonRest)
      setRestaurants(rest)
      if (nonRest.length > 0) setSelected(nonRest[0].id)

      // categories for the listings-mode default dropdown (non-restaurant, active)
      const { data: allCats } = await supabaseBrowser
        .from('categories')
        .select('id, name_ar, group_name_ar, track, is_active')
        .eq('is_active', true)
        .neq('track', 'restaurants')
        .order('group_display_order', { ascending: true })
        .order('display_order', { ascending: true })
      setCats(((allCats || []) as (CatOpt & { track: string })[]).map((c) => ({ id: c.id, name_ar: c.name_ar, group_name_ar: c.group_name_ar })))

      setStage('ready')
    }
    init()
  }, [refreshKey])

  if (stage === 'loading') {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center" dir="rtl">
        <Loader2 className="w-8 h-8 text-[#FA8125] animate-spin" />
      </div>
    )
  }
  if (stage === 'unauthenticated') {
    return <Blocked title="سجل دخول الأول" sub="محتاج تسجل دخول كمورد" href="/auth/login" label="سجل دخول" />
  }
  if (stage === 'no-supplier') {
    return <Blocked title="مفيش حساب مورد" sub="سجل كمورد الأول وبعدين ضيف منتجاتك" href="/add-listing" label="ضيف الليستنج" />
  }

  const chosen = listings.find((l) => l.id === selected)

  return (
    <div className="min-h-screen gradient-mesh pb-12" dir="rtl">
      <header className="sticky top-0 z-40 glass border-b border-white/40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
          <Link href="/supplier/marketplace" className="w-9 h-9 bg-white shadow-soft hover:shadow-card rounded-full flex items-center justify-center transition-all">
            <ArrowRight className="w-4 h-4 text-gray-700" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">استيراد جماعي</p>
            <h1 className="text-sm font-bold text-gray-700">منتجات بالجملة من Excel</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">

        {/* mode toggle */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setKind('listings')}
            className={`text-right p-4 rounded-2xl border-2 transition-all ${kind === 'listings' ? 'border-[#FA8125] bg-[#FA8125]/5 shadow-card' : 'border-gray-200 bg-white'}`}
          >
            <p className="text-sm font-black text-gray-900">📑 إعلانات منفصلة</p>
            <p className="text-[11px] font-bold text-gray-500 mt-1 leading-relaxed">كل صف في الشيت = إعلان لوحده على الماركت (زي معرض عربيات/موتوسيكلات/أثاث)</p>
          </button>
          <button
            onClick={() => setKind('products')}
            className={`text-right p-4 rounded-2xl border-2 transition-all ${kind === 'products' ? 'border-[#FA8125] bg-[#FA8125]/5 shadow-card' : 'border-gray-200 bg-white'}`}
          >
            <p className="text-sm font-black text-gray-900">🗂️ كتالوج جوه إعلان واحد</p>
            <p className="text-[11px] font-bold text-gray-500 mt-1 leading-relaxed">منتجات كتير تحت إعلان واحد (زي سوبرماركت/صيدلية) + مزامنة ERP</p>
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-soft p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-[#FA8125]/10 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6 text-[#FA8125]" />
            </div>
            <div>
              <h2 className="font-black text-gray-900">{kind === 'listings' ? 'ضيف إعلاناتك كلها مرة واحدة' : 'ضيف كل منتجاتك مرة واحدة'}</h2>
              <p className="text-xs font-bold text-gray-500 mt-0.5">
                {kind === 'listings' ? 'أثاث · عربيات · شقق · أي حاجة — شيت واحد لحد ٢٠٠ إعلان' : 'أثاث · بقالة · قطع غيار · أي منتجات — شيت واحد لحد ٥٠٠ منتج'}
              </p>
            </div>
          </div>

          {kind === 'listings' ? (
            <>
              <label className="block text-xs font-black text-gray-600 mb-1.5">الفئة الافتراضية (للصفوف اللي مش مكتوب فيها فئة)</label>
              <div className="relative">
                <select
                  value={defaultCat}
                  onChange={(e) => setDefaultCat(e.target.value)}
                  className="w-full appearance-none px-4 py-3.5 rounded-2xl border-2 border-gray-200 focus:border-[#FA8125] outline-none text-sm font-bold bg-white"
                >
                  <option value="">— من غير فئة افتراضية (لازم عمود الفئة يبقى متملي) —</option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.group_name_ar ? `${c.group_name_ar} — ${c.name_ar}` : c.name_ar}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <button
                onClick={() => setShowImport(true)}
                className="mt-4 w-full py-4 rounded-2xl bg-[#FA8125] text-white font-black text-sm shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
              >
                <FileSpreadsheet className="w-5 h-5" /> ارفع شيت الإعلانات (Excel)
              </button>

              <p className="mt-4 text-[11px] font-bold text-gray-500 bg-[#FAFAF7] rounded-xl p-3 leading-relaxed">
                💡 الأعمدة: العنوان · الفئة · السعر (أو "نعم" في عمود اتصل للسعر) · الوصف · المنطقة · المدينة · رابط الصورة.
                الإعلان اللي ليه صورة بينزل فوراً — من غيرها بيتسجل مسودة. المكرر بنفس العنوان بيتخطى تلقائياً.
              </p>
            </>
          ) : listings.length === 0 ? (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 text-center">
              <Package className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="text-sm font-black text-gray-800 mb-1">محتاج إعلان واحد الأول (معرضك)</p>
              <p className="text-xs font-bold text-gray-500 leading-relaxed mb-4">
                اعمل إعلان واحد باسم معرضك أو متجرك (مثلاً: «معرض النور للأثاث المكتبي»)
                وبعدين ارجع هنا وضيف كل منتجاتك جواه بشيت واحد.
              </p>
              <Link
                href="/supplier/marketplace/new"
                className="inline-flex items-center gap-2 bg-[#FA8125] text-white px-5 py-2.5 rounded-xl text-sm font-black"
              >
                <Plus className="w-4 h-4" /> اعمل الإعلان الأول
              </Link>
            </div>
          ) : (
            <>
              {/* dropdown: اختار الإعلان */}
              <label className="block text-xs font-black text-gray-600 mb-1.5">هتضيف المنتجات تحت أنهي إعلان؟</label>
              <div className="relative">
                <select
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  className="w-full appearance-none px-4 py-3.5 rounded-2xl border-2 border-gray-200 focus:border-[#FA8125] outline-none text-sm font-bold bg-white"
                >
                  {listings.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title} {typeof l.products_count === 'number' ? `— ${l.products_count} منتج` : ''} {l.status !== 'published' ? `(${l.status === 'draft' ? 'مسودة' : 'موقوف'})` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <button
                onClick={() => setShowImport(true)}
                disabled={!selected}
                className="mt-4 w-full py-4 rounded-2xl bg-[#FA8125] text-white font-black text-sm shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <FileSpreadsheet className="w-5 h-5" /> ارفع شيت Excel
              </button>

              {chosen && (
                <Link
                  href={`/supplier/marketplace/${chosen.id}/products`}
                  className="mt-3 flex items-center justify-center gap-1.5 text-xs font-black text-[#FA8125] hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> افتح إدارة منتجات «{chosen.title}» (تعديل / حذف / مخزون)
                </Link>
              )}

              <p className="mt-4 text-[11px] font-bold text-gray-500 bg-[#FAFAF7] rounded-xl p-3 leading-relaxed">
                💡 المنتجات هتظهر في صفحة الإعلان على الماركت بليس، ولو حسابك مشترك في نظام الإدارة (CRM+ERP)
                هتتسجل تلقائياً في المخزون كمان.
              </p>
            </>
          )}
        </div>

        {/* restaurants pointer */}
        {restaurants.length > 0 && (
          <div className="bg-white rounded-3xl shadow-soft p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center flex-shrink-0">
              <ChefHat className="w-5 h-5 text-orange-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-gray-900">عندك مطعم؟</p>
              <p className="text-[11px] font-bold text-gray-500">منيو المطاعم ليه استيراد Excel خاص بيه (بالأحجام والأسعار)</p>
            </div>
            <Link
              href={`/supplier/marketplace/${restaurants[0].id}/menu`}
              className="bg-orange-500 text-white px-4 py-2 rounded-xl text-xs font-black flex-shrink-0"
            >
              افتح المنيو
            </Link>
          </div>
        )}
      </main>

      {showImport && kind === 'products' && selected && (
        <ExcelImportModal
          mode="products"
          listingId={selected}
          onClose={() => setShowImport(false)}
          onDone={() => setRefreshKey((k) => k + 1)}
        />
      )}
      {showImport && kind === 'listings' && (
        <ExcelImportModal
          mode="listings"
          defaultCategoryId={defaultCat || null}
          onClose={() => setShowImport(false)}
          onDone={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  )
}

function Blocked({ title, sub, href, label }: { title: string; sub: string; href: string; label: string }) {
  return (
    <div className="min-h-screen gradient-mesh flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-3xl shadow-card p-10 text-center max-w-sm">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-gray-400" />
        </div>
        <h1 className="font-black text-xl mb-2">{title}</h1>
        <p className="text-sm text-gray-500 mb-5">{sub}</p>
        <Link href={href} className="inline-flex items-center gap-2 bg-[#FA8125] text-white px-5 py-2.5 rounded-xl font-bold shadow-soft">
          {label}
        </Link>
      </div>
    </div>
  )
}
