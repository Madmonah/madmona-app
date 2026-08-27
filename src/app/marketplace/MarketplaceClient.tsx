'use client'

import { Suspense, useEffect, useRef, useState, type MouseEvent } from 'react'
import Link from 'next/link'
import SmartImage from '@/components/SmartImage'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  Search, MapPin, Star, ImageIcon, Loader2, ArrowRight, User, LogIn, Heart,
  ChevronDown, X, SlidersHorizontal, Sparkles, ShieldCheck, CheckCircle, Clock,
} from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import CartButton from '@/components/CartButton'
import { isDemoListing, cleanListingTitle } from '@/lib/listingHelpers'
import { useT } from '@/lib/i18n/LanguageProvider'
import { catNameFor, groupNameFor, listingTitleFor, cityFor } from '@/lib/i18n/catName'

interface Category {
  id: string
  parent_id: string | null
  name_ar: string
  name_en?: string | null
  name_i18n?: Record<string, string> | null
  group_name_i18n?: Record<string, string> | null
  slug: string
  icon: string | null
  // 'sales' موجود في قيد الداتابيز (categories_track_check) و71 تصنيف بيستعمله.
  // تبويب «منتجات» بيضم sales عن قصد (٦ تصنيفات نشطة) — النوع كان ناقص القيمة
  // دي فـTS كان بيقول إن الشرط ده مستحيل، والحقيقة إنه شغال صح وقت التشغيل.
  track?: 'rentals' | 'services' | 'hybrid' | 'restaurants' | 'products' | 'daily' | 'sales' | null
  also_show_in?: string[] | null
  group_slug?: string | null
  group_name_ar?: string | null
  group_emoji?: string | null
  group_display_order?: number | null
}

interface Listing {
  id: string
  title: string
  i18n?: Record<string, { title?: string | null; description?: string | null } | null> | null
  slug: string
  city: string | null
  district: string | null
  rating: number | null
  reviews_count: number
  status: string
  created_at: string
  requires_id_verification: boolean | null
  price_egp?: number | string | null
  category: { name_ar: string; name_en: string | null; name_i18n?: Record<string, string> | null; icon: string | null; slug: string } | null
  supplier: { id?: string | null; business_name?: string | null; logo_url?: string | null; kyc_status: string | null } | null
  photos: { url: string; is_primary: boolean; quality_flag?: string | null; is_placeholder?: boolean | null }[] | null
  pricing: { price: number | string; is_active: boolean }[] | null
}

type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'rating'

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'market.sort_newest',
  price_asc: 'market.sort_price_asc',
  price_desc: 'market.sort_price_desc',
  rating: 'market.sort_rating',
}

type TrackTab = 'all' | 'rentals' | 'services' | 'hybrid' | 'restaurants' | 'products' | 'daily' | 'sales'

const TRACK_LABELS: Record<TrackTab, string> = {
  all: 'market.track_all',
  rentals: 'market.track_rentals',
  services: 'market.track_services',
  hybrid: 'market.track_hybrid',
  restaurants: 'market.track_restaurants',
  products: 'market.track_products',
  daily: 'market.track_daily',
  sales: 'market.track_products',
}

const TRACK_EMOJI: Record<TrackTab, string> = {
  all: '✨',
  rentals: '🔑',
  services: '🛠️',
  hybrid: '💒',
  restaurants: '🍽️',
  products: '🏷️',
  daily: '🛒',
  sales: '🏷️',
}

// Per-vertical colours — same identity as the homepage hero/tabs.
const TRACK_ACCENT: Record<TrackTab, { accent: string; bg: string }> = {
  all:         { accent: '#059669', bg: '#E7F1ED' },
  products:    { accent: '#3D7BB6', bg: '#D9E7F4' },
  rentals:     { accent: '#059669', bg: '#E7F1ED' },
  services:    { accent: '#D4A017', bg: '#FAEFD1' },
  restaurants: { accent: '#E26D5C', bg: '#FAE1CB' },
  hybrid:      { accent: '#059669', bg: '#E7F1ED' },
  daily:       { accent: '#7A4FA3', bg: '#EDE3F5' },
  sales:       { accent: '#3D7BB6', bg: '#D9E7F4' },
}

// Tab order: الكل + بيع · إيجار · خدمات · مطاعم · سوبر ماركت
// (مناسبات مدمجة في الإيجار)
// 🛒 (٢٥ يوليو ٢٠٢٦ — محمد، طلبها مرتين): السوبر ماركت والصيدلية كانوا
//    مجموعة جوه تاب «بيع»، والمفروض يبقوا مجال قايم بذاته. `daily` تراك
//    مستقل دلوقتي في الداتابيز كمان (`categories_track_check`).
// 15 Aug 2026 (Mohamed): drop the 'all' and 'daily' tabs. Tabs are now exactly
// buy / rent / services / restaurants. 'daily' had 3 categories, all
// is_active=false with 0 published listings, so it was an always-empty tab.
const TRACK_TAB_ORDER: TrackTab[] = ['products', 'rentals', 'services', 'restaurants']

// Vertical names — identical to the homepage hero.
const TRACK_NAME: Record<TrackTab, { ar: string; en: string }> = {
  all:         { ar: 'الكل',        en: 'All' },
  products:    { ar: 'بيع',         en: 'Buy' },
  rentals:     { ar: 'إيجار',       en: 'Rent' },
  services:    { ar: 'خدمات',       en: 'Services' },
  restaurants: { ar: 'مطاعم',       en: 'Restaurants' },
  daily:       { ar: 'سوبر ماركت',  en: 'Groceries' },
  hybrid:      { ar: 'مناسبات',     en: 'Events' },
  // `sales` مالوش تاب خاص — تصنيفاته بتتعرض جوه تاب «بيع» (شوف الفلترة فوق:
  // `activeTrack === 'products' && c.track === 'sales'`). موجود هنا عشان
  // النوع يكمل، وبنفس التسمية عشان لو اتعرض في أي مكان يبقى متسق.
  sales:       { ar: 'بيع',         en: 'Buy' },
}

function MarketplaceBrowseContent({ initialListings }: { initialListings?: Listing[] }) {
  const { t, lang, dir, locale } = useT()
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialCategorySlug = searchParams.get('category')
  const initialTrack = searchParams.get('track')
  const initialQuery = searchParams.get('q') || ''
  const initialSupplier = searchParams.get('supplier')

  const [allCategories, setAllCategories] = useState<Category[]>([])
  // Jul 2026: per-category published-listing counts → empty sections lock with "قريباً"
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number> | null>(null)
  const allRootCategories = allCategories.filter(c => c.parent_id === null)
  const [activeTrack, setActiveTrack] = useState<TrackTab>(
    (initialTrack === 'hybrid'
      ? 'rentals'
      : (['rentals', 'services', 'restaurants', 'products', 'daily', 'sales'].includes(initialTrack || '')
          ? initialTrack
          // default landing tab is now 'products' (buy) since 'all' is gone
          : 'products')) as TrackTab
  )
  const rootCategories = activeTrack === 'all'
    ? allRootCategories
    : allRootCategories.filter(c => c.track === activeTrack || (activeTrack === 'rentals' && c.track === 'hybrid') || (activeTrack === 'products' && c.track === 'sales'))

  // Group the visible root categories by their DB group_* metadata (Jun 2026).
  // Every track now carries group_slug/group_name_ar/group_emoji so the strip
  // renders tidy labeled clusters (e.g. خدمات → طبية وتجميل · منزلية · …)
  // instead of one flat wall of pills. Falls back to a single unnamed bucket.
  const rootGroups = (() => {
    const map = new Map<string, { slug: string; name_ar: string; name_i18n: Record<string, string> | null; emoji: string; order: number; cats: Category[] }>()
    for (const c of rootCategories) {
      const key = c.group_slug || '__ungrouped'
      if (!map.has(key)) {
        map.set(key, {
          slug: key,
          name_ar: c.group_name_ar || '',
          name_i18n: c.group_name_i18n || null,
          emoji: c.group_emoji || '',
          order: c.group_display_order ?? 999,
          cats: [],
        })
      }
      map.get(key)!.cats.push(c)
    }
    return Array.from(map.values()).sort((a, b) => a.order - b.order)
  })()
  // (Jul 24 2026) اتفعّلت في تاب «الكل» كمان.
  // الملاحظة القديمة («groups would collide across tracks») مالهاش أساس —
  // قِسناها من الداتابيز: **كل group_slug بيخص تراك واحد بس**، مفيش ولا تصادم.
  // والعكس هو اللي كان بيحصل: «الكل» المسطّح كان بيعرض التوأم جنب بعضه
  // («عقارات سكنية» للإيجار و«عقارات سكنية» للبيع بنفس الاسم بالظبط).
  // بالمجموعات بقى الفرق واضح من العنوان: «عقارات» مقابل «عقارات للبيع»،
  // و«مركبات» مقابل «عربيات للبيع».
  const showGroupHeadings = rootGroups.length > 1

  // Jul 2026 (Mohamed): any section with zero published listings is locked and
  // labeled "قريباً". A root section counts its own listings + its children +
  // categories cross-listed into it (also_show_in). Until counts load, nothing locks.
  const categoryHasData = (cat: Category): boolean => {
    if (!categoryCounts) return true
    if ((categoryCounts[cat.id] || 0) > 0) return true
    // 🚗 (18 Jul 2026) أي فئة ليها أطفال فيهم داتا تتفتح — يخدم المستوى التالت
    // (عربيات زيرو → سيارة) زي ما بيخدم الجذور. also_show_in للجذور بس.
    return allCategories.some(c =>
      (c.parent_id === cat.id ||
        (cat.parent_id === null && Array.isArray(c.also_show_in) && c.also_show_in.includes(cat.id))) &&
      (categoryCounts[c.id] || 0) > 0
    )
  }
  // Locked pills sink to the end of each strip so live sections come first.
  const sortByData = (cats: Category[]) =>
    [...cats].sort((a, b) => Number(!categoryHasData(a)) - Number(!categoryHasData(b)))
  // (22 يوليو 2026) نبدأ بإعلانات الـSSR (من السيرفر) — فحتى لو فetch الكلاينت فشل
  // على الموبايل/المتصفحات الجوانية، الإعلانات تفضل ظاهرة ومش بترجع فاضية.
  const [listings, setListings] = useState<Listing[]>(initialListings ?? [])
  const [loading, setLoading] = useState(!(initialListings && initialListings.length > 0))
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(initialCategorySlug)
  const [supplierFilter] = useState<string | null>(initialSupplier)
  // 🏬 (7 Aug 2026) طلب محمد: «ستور لكل مورد وطريقة العرض بالستور أو بالمنتج».
  // كل مورد ليه صفحة متجر جاهزة أصلًا على ?supplier=<id> — هنا بنضيف
  // طريقة اكتشافها: تبديل عرض السوق «منتجات / متاجر» + كارت متجر لكل تاجر.
  type StoreCard = { id: string; name: string; logo: string | null; kyc: string | null; acc: string | null; count: number; catCounts: Record<string, number>; photo: string | null; secCount?: number }
  const [viewMode, setViewMode] = useState<'products' | 'stores'>(
    searchParams.get('view') === 'stores' ? 'stores' : 'products'
  )
  const [stores, setStores] = useState<StoreCard[] | null>(null)

  useEffect(() => {
    if (viewMode !== 'stores' || stores !== null) return
    let alive = true
    // حسابات المنصة الداخلية — مش متاجر تجار فماتظهرش في الشبكة (طلب محمد ٧ أغسطس)
    const INTERNAL_SUPPLIER_IDS = ['7310f6ef-e474-4ef8-8b8a-388b5e1f5694', '9da8212a-c321-48b5-8822-525f724bcd25']
    ;(async () => {
      const { data } = await supabaseBrowser
        .from('listings')
        .select('supplier_id, title, category_id, supplier:marketplace_suppliers(id, business_name, logo_url, kyc_status, account_type), photos:listing_photos(url, is_primary)')
        .eq('status', 'published')
        .eq('is_directory', false)
        .not('supplier_id', 'is', null)
        .limit(2000)
      if (!alive) return
      const map = new Map<string, StoreCard>()
      for (const row of (data || []) as any[]) {
        const s = row.supplier
        if (!s?.id || !s.business_name) continue
        if (INTERNAL_SUPPLIER_IDS.includes(s.id)) continue
        if (isDemoListing(row.title || '')) continue
        const entry = map.get(s.id) || { id: s.id, name: s.business_name, logo: s.logo_url, kyc: s.kyc_status, acc: s.account_type || null, count: 0, catCounts: {} as Record<string, number>, photo: null }
        entry.count++
        if (row.category_id) entry.catCounts[row.category_id] = (entry.catCounts[row.category_id] || 0) + 1
        if (!entry.photo) {
          const ph = (row.photos || []).find((p: any) => p?.is_primary) || (row.photos || [])[0]
          if (ph?.url) entry.photo = ph.url
        }
        map.set(s.id, entry)
      }
      setStores([...map.values()].sort((a, b) => b.count - a.count))
    })()
    return () => { alive = false }
  }, [viewMode, stores])

  const switchView = (mode: 'products' | 'stores') => {
    setViewMode(mode)
    try {
      const sp = new URLSearchParams(window.location.search)
      if (mode === 'stores') sp.set('view', 'stores'); else sp.delete('view')
      window.history.replaceState(null, '', `/marketplace${sp.toString() ? `?${sp.toString()}` : ''}`)
    } catch { /* non-blocking */ }
  }
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  // 🏗️ (17 Jul 2026) طلب محمد: العقارات تتفصل «بريمري من المطور | ريسيل».
  // البريمري = إعلان مرتبط بمشروع مطور (project_id موجود)، الريسيل = من غير مشروع.
  const [propertySource, setPropertySource] = useState<'all' | 'primary' | 'resale'>('all')
  // 31 Jul 2026 (محمد): الإيجار يتقسّم مفروش / بدون فرش
  const [furnishedFilter, setFurnishedFilter] = useState<'all' | 'furnished' | 'unfurnished'>('all')
  // 📄 بيجينيشن «حمّل المزيد» — كان محدود بـ60 إعلان بس. بيكبر بـ60 كل ضغطة،
  //    وبيرجع 60 أول ما أي فلتر يتغيّر (تحت). loadSeqRef بيضمن إن آخر ردّ بس هو اللي يتطبّق.
  const [visibleLimit, setVisibleLimit] = useState(60)
  // 🔢 العدد الإجمالي الحقيقي لكل الإعلانات المطابقة (مش المُحمّل) — عشان العدّاد
  //    فوق يقول الرقم الصح (272 مثلًا) مش 60 (عدد أول دفعة).
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const loadSeqRef = useRef(0)
  // 👁️ مرساة التحميل التلقائي عند التمرير — بدل ما المستخدم يكبس «حمّل المزيد» ٤ مرات
  //    عشان يشوف كل الإعلانات (٢٧٢+). أول ما توصل لآخر القايمة نجيب الباقي لوحدنا.
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  // 🛡️ صمود التحميل: لو الكويري فشل (نت موبايل ضعيف/أول فتحة) بنعيد المحاولة
  // بدل ما نفضّي السوق بصمت. ده كان بيخلي الماركت يبان فاضي على الموبايل.
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const retriesRef = useRef(0)
  // 🗂️ (17 Jul 2026) drill-down: المستخدم يختار مجموعة الأول (عقارات/عربيات/بيت...)
  // وبعدها تظهر فئاتها بس — بدل شريط واحد فيه كل حاجة. بتتقرا من ?group= (الهوم بيبعتها).
  // (٧ أغسطس ٢٠٢٦) دعم الدخول المباشر بـ?group= — كانت التابات من الهوم بتفتح
  // على «الكل» لأن الجروب مكانش بيتقري من الـURL (الباج القديم المعروف).
  const [selectedGroupSlug, setSelectedGroupSlug] = useState<string | null>(searchParams.get('group'))
  useEffect(() => {
    try { setSelectedGroupSlug(new URLSearchParams(window.location.search).get('group')) } catch { /* ssr */ }
  }, [])
  // 🏗️ (٧ أغسطس ٢٠٢٦ — محمد) جوه العقارات مفيش تبديل «متاجر/منتجات» خالص —
  // العقارات ليها فلترها الخاص (من المطور/ريسيل) والمتاجر مش منطقية هناك.
  const inPropertyZone =
    selectedGroupSlug === 'sale-property' || selectedGroupSlug === 'properties' ||
    (!!selectedCategorySlug && (
      selectedCategorySlug.startsWith('sale-properties') ||
      selectedCategorySlug.startsWith('sale-tourism') ||
      selectedCategorySlug.startsWith('properties')
    ))
  const [cityFilter, setCityFilter] = useState<string | null>(null)
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const [cityMenuOpen, setCityMenuOpen] = useState(false)
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [togglingFav, setTogglingFav] = useState<string | null>(null)

  useEffect(() => {
    // 🛟 التحقق من الدخول مالوش دعوة بعرض الإعلانات.
    // لو وقع (سفاري خاص، كوكيز مقفولة) الزائر يتفرّج كضيف —
    // ماينفعش الماركت بليس كله يختفي عشان الفيفوريت.
    const checkAuth = async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      setIsAuthed(!!session?.user)
      if (session?.user) {
        setUserId(session.user.id)
        const { data: favs } = await supabaseBrowser
          .from('favorites')
          .select('listing_id')
          .eq('customer_id', session.user.id)
        setFavorites(new Set((favs || []).map((f: { listing_id: string }) => f.listing_id)))
      }
    }
    checkAuth().catch(() => setIsAuthed(false))

    const load = async () => {
      const { data } = await supabaseBrowser
        .from('categories')
        .select('id, parent_id, name_ar, name_en, name_i18n, slug, icon, track, also_show_in, group_slug, group_name_ar, group_name_i18n, group_emoji, group_display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
      // الأنواع المولّدة بتقول `track: string | null` (Supabase مابيحوّلش قيود
      // CHECK لاتحادات)، بينما `Category` هنا بيسمّي القيم الفعلية. القيد
      // `categories_track_check` في الداتابيز هو اللي بيضمن صحة القيم دي.
      setAllCategories((data || []) as Category[])
      // Auto-activate the track tab matching an incoming ?category= slug
      // (so clicking a homepage category opens its specific track tab, not 'all')
      if (initialCategorySlug && data) {
        const cat = (data as Category[]).find(c => c.slug === initialCategorySlug)
        const root = cat?.parent_id ? (data as Category[]).find(c => c.id === cat.parent_id) : cat
        if (root?.track) setActiveTrack(root.track as TrackTab)
      }

      // Published-listing counts per category (RPC) — sections with zero data
      // render locked with a "قريباً / Coming soon" badge.
      const { data: counts } = await supabaseBrowser.rpc('get_marketplace_category_counts')
      if (counts) {
        const map: Record<string, number> = {}
        for (const row of counts as { category_id: string; listing_count: number }[]) {
          map[row.category_id] = Number(row.listing_count)
        }
        setCategoryCounts(map)
      }
    }
    load().catch((e) => console.error('[marketplace] فشل تحميل التصنيفات', e))
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      // 🛡️ (18 Jul 2026) درع الردود المتأخرة: المستخدم بيدوس تاب والكويري القديم
      // بيرجع بعد الجديد فيغطي عليه — «القسم بيفتح على الكل». كل نداء ياخد رقم،
      // ولو رجع وهو مش آخر رقم نتايجه بتتكب.
      const seq = ++loadSeqRef.current

      let categoryIds: string[] | null = null
      if (selectedCategorySlug) {
        const { data: rootCat } = await supabaseBrowser
          .from('categories')
          .select('id, parent_id')
          .eq('slug', selectedCategorySlug)
          .maybeSingle()

        if (rootCat) {
          // 🌳 (18 Aug 2026 — محمد: «فين إعلانات المركبات؟») التوسيع كان مستويين
          // بس، وشجرة مركبات البيع بقت ٣ (مركبات ونقل → زيرو/مستعملة → سيارة…)
          // فالعربيات المنشورة في المستوى التالت كانت مختفية. الـRPC بيرجّع
          // الفئة وكل أحفادها مهما كان العمق.
          if (rootCat.parent_id) {
            const { data: treeIds } = await supabaseBrowser
              .rpc('category_with_descendants' as never, { roots: [rootCat.id] } as never)
            categoryIds = ((treeIds || []) as { id: string }[]).map(k => k.id)
            if (!categoryIds.length) categoryIds = [rootCat.id]
          } else {
            // Root tab clicked: full subtree + cross-listed categories
            const [treeRes, crossRes] = await Promise.all([
              supabaseBrowser.rpc('category_with_descendants' as never, { roots: [rootCat.id] } as never),
              supabaseBrowser
                .from('categories')
                .select('id')
                .contains('also_show_in', [rootCat.id]),
            ])
            const tree = (treeRes.data || []) as { id: string }[]
            const cross = (crossRes.data || []) as { id: string }[]
            categoryIds = Array.from(new Set([
              rootCat.id,
              ...tree.map(s => s.id),
              ...cross.map(c => c.id),
            ]))
          }
        }
      } else if (activeTrack !== 'all' && selectedGroupSlug && rootCategories.some(c => (c.group_slug || c.slug) === selectedGroupSlug)) {
        // 🗂️ (17 Jul 2026) مجموعة مختارة (drill-down) من غير فئة محددة —
        // الإعلانات بتتفلتر على فئات المجموعة دي + أطفالها بس.
        // ⚠️ الشرط الأخير بيمنع باج الدخول المباشر بالـURL: لو الفئات لسه
        // متحملتش بنقع على فلتر التراك، ولما تتحمل الـeffect بيعيد التشغيل.
        const groupRoots = rootCategories.filter(c => (c.group_slug || c.slug) === selectedGroupSlug)
        const groupRootIds = groupRoots.map(c => c.id)
        if (groupRootIds.length > 0) {
          // 🌳 (18 Aug 2026) الشجرة كاملة مش أطفال المستوى الأول بس
          const { data: treeIds } = await supabaseBrowser
            .rpc('category_with_descendants' as never, { roots: groupRootIds } as never)
          categoryIds = ((treeIds || []) as { id: string }[]).map(c => c.id)
          if (!categoryIds.length) categoryIds = groupRootIds
        }
      } else if (activeTrack !== 'all') {
        // Vertical/track selected (e.g. from a homepage chip) with no specific
        // category — filter listings to every category in that track.
        // Mohamed (Jun 12 2026): المناسبات (hybrid) اتحطت جوه الإيجار (rentals)،
        // فتصفح الإيجار بيورّي المناسبات كمان.
        const tracksToMatch = activeTrack === 'rentals' ? ['rentals', 'hybrid'] : activeTrack === 'products' ? ['products', 'sales'] : [activeTrack];
        const { data: trackRoots } = await supabaseBrowser
          .from('categories')
          .select('id')
          .in('track', tracksToMatch)
        const rootIds = (trackRoots || []).map((c: { id: string }) => c.id)
        if (rootIds.length > 0) {
          // 🌳 (18 Aug 2026) الشجرة كاملة — عشان المستوى التالت (سيارة زيرو/مستعملة…)
          const { data: treeIds } = await supabaseBrowser
            .rpc('category_with_descendants' as never, { roots: rootIds } as never)
          categoryIds = ((treeIds || []) as { id: string }[]).map(c => c.id)
          if (!categoryIds.length) categoryIds = rootIds
        }
      }

      let query = supabaseBrowser
        .from('listings')
        .select(`
          id, title, i18n, slug, city, district, rating, reviews_count, status, created_at, requires_id_verification, price_egp,
          category:categories(name_ar, name_en, name_i18n, icon, slug),
          supplier:marketplace_suppliers(id, business_name, logo_url, kyc_status),
          photos:listing_photos(url, is_primary, quality_flag, is_placeholder),
          pricing:pricing_rules(price, is_active)
        `, { count: 'exact' })
        .eq('status', 'published')
        .eq('is_directory', false)
        .limit(visibleLimit)

      if (sortBy === 'rating') {
        query = query.order('rating', { ascending: false, nullsFirst: false })
      } else {
        query = query.order('created_at', { ascending: false })
      }

      if (categoryIds && categoryIds.length > 0) {
        query = query.in('category_id', categoryIds)
      }
      if (searchQuery.trim()) {
        query = query.ilike('title', `%${searchQuery.trim()}%`)
      }
      if (supplierFilter) {
        query = query.eq('supplier_id', supplierFilter)
      }
      // 🏗️ بريمري/ريسيل — بس جوه عقارات البيع
      const inSaleProperties = (activeTrack === 'products' || activeTrack === 'sales') && (selectedGroupSlug === 'sale-property' || (!!selectedCategorySlug && (selectedCategorySlug.startsWith('sale-properties') || selectedCategorySlug.startsWith('sale-tourism'))))
      if (inSaleProperties && propertySource === 'primary') {
        query = query.not('project_id', 'is', null)
      } else if (inSaleProperties && propertySource === 'resale') {
        query = query.is('project_id', null)
      }

      // 🛏️ مفروش/بدون فرش — بس جوه عقارات الإيجار (properties- مش sale-properties-)
      const inRentalProperties = activeTrack === 'rentals' && !!selectedCategorySlug && selectedCategorySlug.startsWith('properties-')
      if (inRentalProperties && furnishedFilter === 'furnished') {
        query = query.eq('is_furnished', true)
      } else if (inRentalProperties && furnishedFilter === 'unfurnished') {
        query = query.eq('is_furnished', false)
      }

      const { data, error, count } = await query
      if (seq !== loadSeqRef.current) return // ردّ متأخر — فيه كويري أحدث منه شغال
      if (error) {
        // 🛡️ فشل التحميل (نت ضعيف/أول فتحة على الموبايل): بنعيد المحاولة بدل ما
        // نفضّي السوق. أقصى ٣ محاولات، وبعدها بنورّي زر «جرّب تاني».
        setLoading(false)
        if (retriesRef.current < 3) {
          retriesRef.current += 1
          setTimeout(() => setReloadKey((k) => k + 1), 1000 * retriesRef.current)
        } else {
          setLoadError(true)
        }
        return // مهم: مانعملش setListings([]) علشان مانفضّيش اللي ظاهر
      }
      retriesRef.current = 0
      setLoadError(false)
      setListings((data || []) as Listing[])
      setTotalCount(typeof count === 'number' ? count : null)
      setLoading(false)
    }
    load()
  }, [selectedCategorySlug, searchQuery, sortBy, activeTrack, supplierFilter, propertySource, furnishedFilter, selectedGroupSlug, allCategories, reloadKey, visibleLimit])

  // 📄 أول ما أي فلتر يتغيّر، نرجّع العرض لأول 60 (عشان مانفضلش محمّلين 300 إعلان
  //    من تصنيف قديم). لو كان 60 أصلًا، ده no-op فمفيش فيتش زيادة.
  useEffect(() => {
    setVisibleLimit(60)
  }, [selectedCategorySlug, searchQuery, sortBy, activeTrack, supplierFilter, propertySource, furnishedFilter, selectedGroupSlug])

  // ♾️ تحميل تلقائي عند التمرير: أول ما مرساة «حمّل المزيد» تقرب من الشاشة، نكبّر الحد لوحدنا.
  //    الشرط listings.length >= visibleLimit معناه إن آخر دفعة رجعت كاملة (يعني غالبًا فيه أكتر).
  //    أول ما دفعة ترجع أقل من الحد (آخر صفحة) الشرط يبقى false، المرساة تتفصل، فبيقف لوحده.
  //    (الزرار موجود كمان كخطة بديلة للأجهزة اللي مابتدعمش IntersectionObserver.)
  useEffect(() => {
    if (listings.length < visibleLimit) return // كله اتحمّل — مفيش أكتر
    const el = loadMoreRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) setVisibleLimit((v) => v + 60) },
      { rootMargin: '600px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [listings.length, visibleLimit])

  const toggleFavorite = async (e: MouseEvent, listingId: string) => {
    e.preventDefault()
    e.stopPropagation()

    if (!userId) {
      router.push(`/auth/login?redirect=${encodeURIComponent('/marketplace')}`)
      return
    }

    setTogglingFav(listingId)
    const isFav = favorites.has(listingId)

    if (isFav) {
      const { error } = await supabaseBrowser
        .from('favorites')
        .delete()
        .eq('customer_id', userId)
        .eq('listing_id', listingId)
      if (!error) {
        const newFavs = new Set(favorites)
        newFavs.delete(listingId)
        setFavorites(newFavs)
      }
    } else {
      const { error } = await supabaseBrowser
        .from('favorites')
        .insert({ customer_id: userId, listing_id: listingId })
      if (!error) {
        setFavorites(new Set([...favorites, listingId]))
      }
    }
    setTogglingFav(null)
  }

  const getMinPrice = (listing: Listing): number => {
    const activePrices = (listing.pricing || [])
      .filter(p => p.is_active)
      .map(p => Number(p.price))
      .filter(p => p > 0)
    if (activePrices.length > 0) return Math.min(...activePrices)
    // (7 Aug 2026) fallback على listings.price_egp — كان فيه 184 من 215 إعلان
    // منشور ليهم سعر في price_egp من غير أي صف في pricing_rules، فكانت
    // الكروت بتقول «السعر عند الطلب» والأسعار مش باينة في الماركت كله.
    const base = Number(listing.price_egp)
    return base > 0 ? base : Infinity
  }

  const cities = Array.from(
    new Set(
      listings
        .map(l => l.city)
        .filter((c): c is string => Boolean(c?.trim()))
    )
  ).sort()

  let filteredListings = cityFilter
    ? listings.filter(l => l.city === cityFilter)
    : [...listings]

  if (sortBy === 'price_asc') {
    filteredListings = filteredListings.sort((a, b) => getMinPrice(a) - getMinPrice(b))
  } else if (sortBy === 'price_desc') {
    filteredListings = filteredListings.sort((a, b) => getMinPrice(b) - getMinPrice(a))
  }

  const selectedCategory = allCategories.find(c => c.slug === selectedCategorySlug)
  // 🚗 (18 Jul 2026 — طلب محمد) شجرة 3 مستويات: مركبات ونقل → عربيات زيرو/مستعملة → سيارة.
  // بنطلع لأعلى أب (مش أول أب بس) عشان شريط الفئات الرئيسي يفضل مظبوط.
  const findTopRoot = (cat?: Category): Category | undefined => {
    let cur = cat
    let guard = 0
    while (cur?.parent_id && guard++ < 5) {
      const p = allCategories.find(c => c.id === cur!.parent_id)
      if (!p) break
      cur = p
    }
    return cur
  }
  const selectedRoot = findTopRoot(selectedCategory)
  const selectedRootSlug = selectedRoot?.slug || selectedCategorySlug
  // المستوى التاني الحالي (الفئة المختارة نفسها لو تانية، أو أبوها لو المختارة تالتة)
  const selectedMid = selectedCategory && selectedCategory.parent_id
    ? (selectedCategory.parent_id === selectedRoot?.id
        ? selectedCategory
        : allCategories.find(c => c.id === selectedCategory.parent_id))
    : undefined
  const thirdLevelCats = selectedMid
    ? allCategories.filter(c => c.parent_id === selectedMid.id)
    : []
  // Subcategories = direct children + cross-listed (also_show_in includes this root)
  type CategoryWithCross = Category & { also_show_in?: string[] | null }
  const subCategories = selectedRoot
    ? allCategories.filter(c => {
        if (c.parent_id === selectedRoot.id) return true
        const alsoIn = (c as CategoryWithCross).also_show_in
        if (Array.isArray(alsoIn) && alsoIn.includes(selectedRoot.id)) return true
        return false
      })
    : []
  const selectedCategoryNameRaw = allCategories.find(c => c.slug === selectedCategorySlug)
  const selectedCategoryName = selectedCategoryNameRaw
    ? catNameFor(selectedCategoryNameRaw, locale)
    : undefined
  const catName = (c: { name_ar: string; name_en?: string | null; name_i18n?: Record<string, string> | null }) =>
    catNameFor(c, locale)
  // 🌍 اسم المجموعة (عقارات · مركبات ...) باللغة الحالية
  const gName = (g: { name_ar: string; name_i18n?: Record<string, string> | null } | null | undefined) =>
    g ? groupNameFor({ group_name_ar: g.name_ar, group_name_i18n: g.name_i18n }, locale) : ''
  const comingSoonLabel = t('mk.coming_soon')
  const hasFilters = selectedCategorySlug || searchQuery || cityFilter || sortBy !== 'newest'
  // عرض متجر محدد (/marketplace?supplier=...) — بانر باسم التاجر + تصنيفاته
  const supplierInfo: any = supplierFilter ? (listings.find(l => (l.supplier as any)?.business_name)?.supplier || null) : null
  const supplierCatNames = supplierFilter ? (Array.from(new Set(listings.map(l => l.category?.name_ar).filter(Boolean))) as string[]) : []

  const clearAllFilters = () => {
    setSelectedCategorySlug(null)
    setSearchQuery('')
    setCityFilter(null)
    setSortBy('newest')
  }

  return (
    <div className="min-h-screen gradient-mesh pb-20 md:pb-0" dir={dir}>
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-[#34D399]/5 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="fixed top-40 left-20 w-[300px] h-[300px] bg-[#2FA084]/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      <header className="relative z-40 glass border-b border-white/40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/"
                className="w-9 h-9 bg-white shadow-soft hover:shadow-card hover:-translate-y-0.5 rounded-full flex items-center justify-center transition-all flex-shrink-0"
              >
                <ArrowRight className="w-4 h-4 text-gray-700" />
              </Link>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-[#2FA084] uppercase tracking-widest">Madmona</p>
                <h1 className="text-lg md:text-xl font-black text-gray-900 truncate">Marketplace</h1>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
            <CartButton className="w-9 h-9 bg-white shadow-soft hover:shadow-card hover:-translate-y-0.5 rounded-full" iconClass="w-4 h-4" />
            {isAuthed === true ? (
              <Link
                href="/account"
                className="w-9 h-9 bg-white shadow-soft hover:shadow-card hover:-translate-y-0.5 rounded-full flex items-center justify-center transition-all flex-shrink-0"
                title={t('nav.account')}
              >
                <User className="w-4 h-4 text-gray-700" />
              </Link>
            ) : isAuthed === false ? (
              <Link
                href="/auth/login?redirect=/marketplace"
                className="inline-flex items-center gap-1 px-4 py-2 bg-[#34D399] text-[#04352A] rounded-full text-xs font-bold shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all flex-shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" />
                {t('market.login')}
              </Link>
            ) : null}
            </div>
          </div>

          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('market.search_placeholder')}
              className="w-full pr-12 pl-4 py-3.5 bg-white/80 backdrop-blur border border-gray-100 rounded-2xl text-sm font-medium focus:outline-none focus:bg-white focus:border-[#059669]/40 focus:ring-4 focus:ring-[#059669]/10 transition-all shadow-soft"
            />
          </div>

          {/* Track tabs — الكل + بيع · إيجار · خدمات · مطاعم (colour per vertical, matching the hero) */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-1 -mx-4 px-4">
            {TRACK_TAB_ORDER.map(tab => {
              const count = tab === 'all'
                ? allRootCategories.length
                : allRootCategories.filter(c => c.track === tab || (tab === 'rentals' && c.track === 'hybrid') || (tab === 'products' && c.track === 'sales')).length
              const isActive = activeTrack === tab || (tab === 'rentals' && activeTrack === 'hybrid') || (tab === 'products' && activeTrack === 'sales')
              const col = TRACK_ACCENT[tab]
              return (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTrack(tab)
                    // FIX (Jul 17 2026): نعكس التاب في الـURL (?track=) عشان
                    // «ضيف منتج» في التوب ناف يفتح الويزارد على نفس التاب.
                    try {
                      const sp = new URLSearchParams(window.location.search)
                      if (tab === 'all') sp.delete('track'); else sp.set('track', tab)
                      window.history.replaceState(null, '', `/marketplace${sp.toString() ? `?${sp.toString()}` : ''}`)
                    } catch { /* non-blocking */ }
                    if (selectedRootSlug) {
                      const stillVisible = allRootCategories.some(
                        c => c.slug === selectedRootSlug && (tab === 'all' || c.track === tab || (tab === 'rentals' && c.track === 'hybrid'))
                      )
                      if (!stillVisible) setSelectedCategorySlug(null)
                    }
                  }}
                  style={{
                    background: isActive ? col.accent : '#fff',
                    borderColor: isActive ? col.accent : '#F0ECE3',
                    color: isActive ? '#fff' : '#374151',
                    boxShadow: isActive ? `0 8px 20px -6px ${col.accent}` : undefined,
                  }}
                  className="flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-all shadow-soft flex items-center gap-1.5 hover:-translate-y-0.5"
                >
                  <span>{TRACK_EMOJI[tab]}</span>
                  <span>{t(TRACK_LABELS[tab])}</span>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                    style={{ background: isActive ? 'rgba(255,255,255,.22)' : col.bg, color: isActive ? '#fff' : col.accent }}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {showGroupHeadings ? (
            // 🗂️ (17 Jul 2026) drill-down بدل الشريط المسطح — طلب محمد:
            // المستوى الأول: كروت المجموعات بس (عقارات · عربيات · بيت وأثاث ...).
            // تختار مجموعة → تظهر فئاتها بس + زر رجوع. المستخدم مايتوهش.
            !selectedGroupSlug && !selectedCategorySlug ? (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                {rootGroups.map(g => (
                  <button
                    key={g.slug}
                    onClick={() => { setSelectedGroupSlug(g.slug); setPropertySource('all'); setFurnishedFilter('all') }}
                    className="flex items-center gap-2 px-4 py-3.5 rounded-2xl bg-white border border-gray-100 shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all text-right"
                  >
                    <span className="text-2xl">{g.emoji || '🏷️'}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-extrabold text-gray-800 leading-tight">{gName(g) || t('market.track_all')}</span>
                      <span className="block text-[10px] font-bold text-gray-400 mt-0.5">{t('mk.n_sections', { n: g.cats.length })}</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 items-center">
                  <button
                    onClick={() => { setSelectedGroupSlug(null); setSelectedCategorySlug(null); setPropertySource('all'); setFurnishedFilter('all') }}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all flex items-center gap-1"
                  >
                    {t('mk.all_sections')}
                  </button>
                  {(() => {
                    const g = rootGroups.find(x => x.slug === selectedGroupSlug) ||
                      rootGroups.find(x => x.cats.some(c => c.slug === selectedRootSlug))
                    return g && gName(g) ? (
                      <span className="flex-shrink-0 text-xs font-extrabold text-gray-700 flex items-center gap-1">
                        {g.emoji && <span>{g.emoji}</span>}{gName(g)}
                      </span>
                    ) : null
                  })()}
                </div>
                {rootGroups
                  .filter(g => !selectedGroupSlug || g.slug === selectedGroupSlug || g.cats.some(c => c.slug === selectedRootSlug))
                  .map(g => (
                    <div key={g.slug}>
                      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
                        <CategoryPill
                          active={!selectedCategorySlug}
                          onClick={() => setSelectedCategorySlug(null)}
                          label={t('market.track_all')}
                          icon="✨"
                        />
                        {sortByData(g.cats).map(cat => (
                          <CategoryPill
                            key={cat.id}
                            active={selectedRootSlug === cat.slug}
                            onClick={() => setSelectedCategorySlug(cat.slug)}
                            label={catName(cat)}
                            icon={cat.icon || ''}
                            comingSoon={categoryHasData(cat) ? undefined : comingSoonLabel}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )
          ) : (
            <div className="flex gap-2 mt-2 overflow-x-auto pb-1 -mx-4 px-4">
              <CategoryPill
                active={!selectedCategorySlug}
                onClick={() => setSelectedCategorySlug(null)}
                label={t('market.track_all')}
                icon="✨"
              />
              {sortByData(rootCategories).map(cat => (
                <CategoryPill
                  key={cat.id}
                  active={selectedRootSlug === cat.slug}
                  onClick={() => setSelectedCategorySlug(cat.slug)}
                  label={catName(cat)}
                  icon={cat.icon || ''}
                  comingSoon={categoryHasData(cat) ? undefined : comingSoonLabel}
                />
              ))}
            </div>
          )}

          {/* Subcategory pills (visible when a root category is selected) */}
          {subCategories.length > 0 && (
            <div className="flex gap-2 mt-2 overflow-x-auto pb-1 -mx-4 px-4 animate-slide-down">
              <button
                onClick={() => setSelectedCategorySlug(selectedRootSlug || null)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all flex items-center gap-1 ${
                  selectedCategorySlug === selectedRootSlug
                    ? 'bg-[#2FA084] text-white shadow-soft'
                    : 'bg-white/80 text-gray-600 hover:bg-white border border-gray-100'
                }`}
              >
                {t('market.all_sections')}
              </button>
              {sortByData(subCategories).map(sub => {
                const locked = !categoryHasData(sub)
                return (
                  <button
                    key={sub.id}
                    onClick={() => { if (!locked) setSelectedCategorySlug(sub.slug) }}
                    disabled={locked}
                    title={locked ? comingSoonLabel : undefined}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all flex items-center gap-1 ${
                      locked
                        ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed select-none'
                        : (selectedCategorySlug === sub.slug || selectedMid?.id === sub.id)
                          ? 'bg-[#2FA084] text-white shadow-soft'
                          : 'bg-white/80 text-gray-700 hover:bg-white border border-gray-100'
                    }`}
                  >
                    {sub.icon && <span className={locked ? 'opacity-50' : ''}>{sub.icon}</span>}
                    <span className={locked ? 'opacity-70' : ''}>{catName(sub)}</span>
                    {locked && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 leading-none whitespace-nowrap">
                        🔒 {comingSoonLabel}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* 🚗 (18 Jul 2026 — طلب محمد) المستوى التالت: زيرو/مستعمل صب وتحتهم سيارة */}
          {selectedMid && thirdLevelCats.length > 0 && (
            <div className="flex gap-2 mt-2 overflow-x-auto pb-1 -mx-4 px-4 animate-slide-down">
              <button
                onClick={() => setSelectedCategorySlug(selectedMid.slug)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                  selectedCategorySlug === selectedMid.slug
                    ? 'bg-[#34D399] text-[#04352A] shadow-soft'
                    : 'bg-white/80 text-gray-600 hover:bg-white border border-gray-100'
                }`}
              >
                {t('market.all_sections')}
              </button>
              {sortByData(thirdLevelCats).map(sub => {
                const locked = !categoryHasData(sub)
                return (
                  <button
                    key={sub.id}
                    onClick={() => { if (!locked) setSelectedCategorySlug(sub.slug) }}
                    disabled={locked}
                    title={locked ? comingSoonLabel : undefined}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all flex items-center gap-1 ${
                      locked
                        ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed select-none'
                        : selectedCategorySlug === sub.slug
                          ? 'bg-[#34D399] text-[#04352A] shadow-soft'
                          : 'bg-white/80 text-gray-700 hover:bg-white border border-gray-100'
                    }`}
                  >
                    {sub.icon && <span className={locked ? 'opacity-50' : ''}>{sub.icon}</span>}
                    <span className={locked ? 'opacity-70' : ''}>{catName(sub)}</span>
                    {locked && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 leading-none whitespace-nowrap">
                        🔒 {comingSoonLabel}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* 🏗️ (17 Jul 2026) بريمري/ريسيل — يظهر بس جوه عقارات البيع */}
          {(activeTrack === 'products' || activeTrack === 'sales') && (selectedGroupSlug === 'sale-property' || (!!selectedCategorySlug && (selectedCategorySlug.startsWith('sale-properties') || selectedCategorySlug.startsWith('sale-tourism')))) && (
            <div className="flex gap-2 mt-2 overflow-x-auto pb-1 -mx-4 px-4">
              {([
                ['all', t('mk.f_all_props')],
                ['primary', t('mk.f_primary')],
                ['resale', t('mk.f_resale')],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setPropertySource(key)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                    propertySource === key
                      ? 'bg-[#173B33] text-white shadow-soft'
                      : 'bg-white/80 text-gray-600 hover:bg-white border border-gray-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* 🛏️ (31 Jul 2026 — محمد) مفروش/بدون فرش — يظهر بس جوه عقارات الإيجار */}
          {activeTrack === 'rentals' && !!selectedCategorySlug && selectedCategorySlug.startsWith('properties-') && (
            <div className="flex gap-2 mt-2 overflow-x-auto pb-1 -mx-4 px-4">
              {([
                ['all', t('mk.f_all')],
                ['furnished', t('mk.f_furnished')],
                ['unfurnished', t('mk.f_unfurnished')],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFurnishedFilter(key)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                    furnishedFilter === key
                      ? 'bg-[#173B33] text-white shadow-soft'
                      : 'bg-white/80 text-gray-600 hover:bg-white border border-gray-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2 mt-3 flex-wrap">
            <div className="relative">
              <button
                onClick={() => { setSortMenuOpen(o => !o); setCityMenuOpen(false) }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all shadow-soft hover:shadow-card ${
                  sortBy !== 'newest'
                    ? 'bg-[#34D399] border-[#059669] text-[#04352A]'
                    : 'bg-white border-gray-100 text-gray-700 hover:border-gray-200'
                }`}
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>{t(SORT_LABELS[sortBy])}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${sortMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {sortMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-52 bg-white rounded-2xl shadow-luxe border border-gray-100 z-50 overflow-hidden animate-scale-in">
                  {(Object.keys(SORT_LABELS) as SortOption[]).map(option => (
                    <button
                      key={option}
                      onClick={() => { setSortBy(option); setSortMenuOpen(false) }}
                      className={`w-full text-start px-4 py-2.5 text-xs hover:bg-[#34D399]/5 font-medium transition-colors ${
                        sortBy === option ? 'bg-[#34D399]/10 text-[#059669]' : 'text-gray-700'
                      }`}
                    >
                      {t(SORT_LABELS[option])}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {cities.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => { setCityMenuOpen(o => !o); setSortMenuOpen(false) }}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all shadow-soft hover:shadow-card ${
                    cityFilter
                      ? 'bg-[#34D399] border-[#059669] text-[#04352A]'
                      : 'bg-white border-gray-100 text-gray-700 hover:border-gray-200'
                  }`}
                >
                  <MapPin className="w-3 h-3" />
                  <span>{cityFilter || t('market.all_cities')}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${cityMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {cityMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-52 bg-white rounded-2xl shadow-luxe border border-gray-100 z-50 overflow-hidden max-h-72 overflow-y-auto animate-scale-in">
                    <button
                      onClick={() => { setCityFilter(null); setCityMenuOpen(false) }}
                      className={`w-full text-start px-4 py-2.5 text-xs hover:bg-[#34D399]/5 font-medium transition-colors ${
                        !cityFilter ? 'bg-[#34D399]/10 text-[#059669]' : 'text-gray-700'
                      }`}
                    >
                      {t('market.all_cities')}
                    </button>
                    {cities.map(city => (
                      <button
                        key={city}
                        onClick={() => { setCityFilter(city); setCityMenuOpen(false) }}
                        className={`w-full text-start px-4 py-2.5 text-xs hover:bg-[#34D399]/5 font-medium transition-colors ${
                          cityFilter === city ? 'bg-[#34D399]/10 text-[#059669]' : 'text-gray-700'
                        }`}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {hasFilters && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 rounded-full transition-colors"
              >
                <X className="w-3 h-3" />
                {t('market.clear_filters')}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 relative">
        {supplierFilter && (
          <div className="mb-6 rounded-3xl bg-white shadow-soft border border-gray-100 p-5">
            <p className="text-[11px] font-bold text-[#2FA084] uppercase tracking-widest">{t('mk.store_eyebrow')}</p>
            <h2 className="text-xl md:text-2xl font-black text-gray-900">{supplierInfo?.business_name || t('mk.store')}</h2>
            <p className="text-sm text-gray-500 mt-1">{supplierCatNames.length ? supplierCatNames.join(' · ') : t('mk.store_sub')}</p>
          </div>
        )}

        {/* 🏬 تبديل عرض السوق: منتجات ↔ متاجر — بيظهر بس بعد ما العميل يختار
            قسم فرعي (طلب محمد ٧ أغسطس: «متعرضوش في الكل») — ومخفي جوه العقارات
            وجوه صفحة متجر معيّن */}
        {!supplierFilter && !inPropertyZone && !!(selectedGroupSlug || selectedCategorySlug) && (
          <div className="mb-5 inline-flex items-center gap-1 bg-white rounded-full p-1 shadow-soft border border-gray-100">
            <button
              onClick={() => switchView('products')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${viewMode === 'products' ? 'bg-[#34D399] text-[#04352A] shadow-soft' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {t('mk.tab_products')}
            </button>
            <button
              onClick={() => switchView('stores')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${viewMode === 'stores' ? 'bg-[#34D399] text-[#04352A] shadow-soft' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {t('mk.tab_stores')}
            </button>
          </div>
        )}

        {!loading && (viewMode === 'products' || !!supplierFilter || inPropertyZone || !(selectedGroupSlug || selectedCategorySlug)) && (
          <div className="mb-6 flex items-end justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-gray-900">
                <span className="tabular">{cityFilter ? filteredListings.length : (totalCount ?? filteredListings.length)}</span>{' '}
                <span className="font-semibold text-gray-500">
                  {selectedCategoryName ? t('market.in_category', { cat: selectedCategoryName }) : t('market.results_word')}
                </span>
              </h2>
              {(searchQuery || cityFilter) && (
                <p className="text-sm text-gray-500 mt-1">
                  {searchQuery && <span>{t('market.for_query')} &quot;<strong className="text-gray-700">{searchQuery}</strong>&quot;</span>}
                  {searchQuery && cityFilter && <span> · </span>}
                  {cityFilter && <span>{t('market.in_city')} <strong className="text-gray-700">{cityFilter}</strong></span>}
                </p>
              )}
            </div>
          </div>
        )}

        {viewMode === 'stores' && !supplierFilter && !inPropertyZone && !!(selectedGroupSlug || selectedCategorySlug) ? (
          stores === null ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-white rounded-3xl p-6 shadow-soft">
                  <div className="w-14 h-14 animate-shimmer rounded-2xl mb-4" />
                  <div className="h-5 w-2/3 animate-shimmer rounded-full mb-2" />
                  <div className="h-3 w-1/2 animate-shimmer rounded-full" />
                </div>
              ))}
            </div>
          ) : stores.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-soft p-12 md:p-20 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center text-3xl">🏬</div>
              <h3 className="text-xl font-black text-gray-900 mb-2">{t('mk.no_stores')}</h3>
              <p className="text-sm text-gray-500">{t('mk.no_stores_sub')}</p>
            </div>
          ) : (() => {
            // 🗂️ تجميع المتاجر بالقسم بتاعها (طلب محمد ٧ أغسطس: «مش كلهم على بعض»)
            // كل متجر بيتحط تحت القسم الجذري اللي فيه أغلب إعلاناته، والتابات فوق بتفلتر.
            const catById = new Map(allCategories.map(c => [c.id, c]))
            const rootOf = (cid: string): Category | null => {
              let c = catById.get(cid); let g = 0
              while (c && c.parent_id && g++ < 6) { const p = catById.get(c.parent_id); if (!p) break; c = p }
              return c || null
            }
            const secMap = new Map<string, { root: Category | null; arr: StoreCard[] }>()
            for (const s of stores) {
              const rc = new Map<string, number>()
              for (const [cid, n] of Object.entries(s.catCounts)) {
                const r = rootOf(cid); const k = r ? r.id : 'other'
                rc.set(k, (rc.get(k) || 0) + n)
              }
              let bestK = 'other'; let bestN = -1
              rc.forEach((n, k) => { if (n > bestN) { bestN = n; bestK = k } })
              const root = bestK === 'other' ? null : (catById.get(bestK) || null)
              if (!secMap.has(bestK)) secMap.set(bestK, { root, arr: [] })
              secMap.get(bestK)!.arr.push({ ...s, secCount: bestN > 0 ? bestN : s.count })
            }
            const trackOk = (tr?: string | null) => activeTrack === 'all' || tr === activeTrack ||
              (activeTrack === 'rentals' && tr === 'hybrid') || (activeTrack === 'products' && tr === 'sales')
            // (٧ أغسطس ٢٠٢٦ — محمد) المتاجر بتظهر بعد اختيار قسم فرعي — فبنفلتر
            // السيكشنات على الجروب/القسم المختار بدل ما نعرض الكل على بعضه.
            const selCat = selectedCategorySlug ? allCategories.find(c => c.slug === selectedCategorySlug) : null
            const selRootId = selCat ? (rootOf(selCat.id)?.id || null) : null
            const sections = [...secMap.values()]
              .filter(sec => !sec.root || trackOk(sec.root.track))
              // (٧ أغسطس ٢٠٢٦ — محمد) «مش عايزين صفحة للمتاجر في العقارات» —
              // العقارات ليها المطور/ريسيل، فمفيش سيكشن عقارات جوه المتاجر.
              .filter(sec => !(sec.root && (sec.root.name_ar || '').includes('عقار')))
              .filter(sec => !selectedGroupSlug || (sec.root && sec.root.group_slug === selectedGroupSlug))
              .filter(sec => !selRootId || (sec.root && sec.root.id === selRootId))
              .sort((a, b) => b.arr.length - a.arr.length)
            if (sections.length === 0) return (
              <div className="bg-white rounded-3xl shadow-soft p-12 md:p-20 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center text-3xl">🏬</div>
                <h3 className="text-xl font-black text-gray-900 mb-2">{t('mk.no_stores_section')}</h3>
                <p className="text-sm text-gray-500">{t('mk.try_other_tab')}</p>
              </div>
            )
            // (٧ أغسطس ٢٠٢٦ — طلب محمد) كل قسم ليه تسميته: بيزنس مقابل أفراد.
            // «منتجات: متاجر أو معارض حسب الصنف · مركبات: معرض أو ريسيل ·
            //  قطع غيار: متاجر أو أشخاص · خدمات: سنتر تعليمي أو محامي حر وهكذا»
            type StoreNoun = { label: string; visit: string }
            const nounFor = (name: string): { biz: StoreNoun; solo: StoreNoun } => {
              if (name.includes('عقار')) return { biz: { label: t('mk.biz_devs'), visit: t('mk.visit_dev') }, solo: { label: t('mk.solo_resale'), visit: t('mk.visit_listings') } }
              if (/(قطع غيار|إكسسوار)/.test(name)) return { biz: { label: t('mk.biz_stores'), visit: t('mk.visit_store') }, solo: { label: t('mk.solo_direct'), visit: t('mk.visit_listings') } }
              if (name.includes('قاع')) return { biz: { label: t('mk.biz_venues'), visit: t('mk.visit_venue') }, solo: { label: t('mk.solo_organizers'), visit: t('mk.visit_page') } }
              if (name.includes('تعليم')) return { biz: { label: t('mk.biz_centers'), visit: t('mk.visit_center') }, solo: { label: t('mk.solo_tutors'), visit: t('mk.visit_page') } }
              if (/(محام|استشار|مهني|طباع)/.test(name)) return { biz: { label: t('mk.biz_offices'), visit: t('mk.visit_office') }, solo: { label: t('mk.solo_freelancers'), visit: t('mk.visit_page') } }
              if (/(طبي|تجميل|عناي)/.test(name)) return { biz: { label: t('mk.biz_clinics'), visit: t('mk.visit_clinic') }, solo: { label: t('mk.solo_specialists'), visit: t('mk.visit_page') } }
              if (/(صيان|منزلي|احتفال|مناسب|معدات|خدم)/.test(name)) return { biz: { label: t('mk.biz_providers'), visit: t('mk.visit_page') }, solo: { label: t('mk.solo_craftsmen'), visit: t('mk.visit_page') } }
              if (/(مطعم|مطاعم|مأكول|كافيه|حلويات|طبخ|سوبر|مشوي|جريل|برجر|آسيوي|سوشي|بدوي|شرقي)/.test(name)) return { biz: { label: t('mk.biz_restaurants'), visit: t('mk.visit_restaurant') }, solo: { label: t('mk.solo_kitchens'), visit: t('mk.visit_listings') } }
              if (/(مركب|عربي|سيار|موتوسيكل|بحري|نقل)/.test(name)) return { biz: { label: t('mk.biz_showrooms'), visit: t('mk.visit_showroom') }, solo: { label: t('mk.solo_resale_ind'), visit: t('mk.visit_listings') } }
              if (name.includes('أثاث')) return { biz: { label: t('mk.biz_showrooms'), visit: t('mk.visit_showroom') }, solo: { label: t('mk.solo_direct_ind'), visit: t('mk.visit_listings') } }
              return { biz: { label: t('mk.biz_stores'), visit: t('mk.visit_store') }, solo: { label: t('mk.solo_direct_ind'), visit: t('mk.visit_listings') } }
            }
            const storeCatNames = (s: StoreCard) => {
              const names = Object.keys(s.catCounts)
                .map(cid => { const c = catById.get(cid); return c ? catName(c) : null })
                .filter(Boolean) as string[]
              return [...new Set(names)]
            }
            return (
              <div className="space-y-10">
                {sections.map(sec => {
                  const nn = nounFor(sec.root?.name_ar || '')
                  // (٧ أغسطس ٢٠٢٦ — محمد) أي حساب عارض أكتر من منتج/صنف في نفس
                  // القسم بيتعامل كتجاري حتى لو مسجل فرد (زي توب وود ومكتب ضاحي).
                  const isBiz = (s: StoreCard) => s.acc !== 'individual' || (s.secCount ?? s.count) > 1 ||
                    /(مطعم|مطاعم|شركة|شركه|مؤسسة|مؤسسه|معرض|مكتب|سنتر|مركز|سوبر|ماركت|أسواق|اسواق|سلسلة|سلسله|كافيه|قاعة|قاعه|صيدلية|صيدليه)/.test(s.name || '')
                  const halves = [
                    { key: 'biz', n: nn.biz, arr: sec.arr.filter(isBiz) },
                    { key: 'solo', n: nn.solo, arr: sec.arr.filter(s => !isBiz(s)) },
                  ].filter(h => h.arr.length > 0)
                  return (
                  <section key={sec.root?.id || 'other'}>
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="text-lg md:text-xl font-black text-gray-900">
                        {sec.root ? `${sec.root.icon || '🏷️'} ${catName(sec.root)}` : t('mk.other_stores')}
                      </h3>
                      <span className="text-[11px] font-bold text-gray-400 bg-gray-100 rounded-full px-2 py-0.5 tabular">
                        {sec.arr.length}
                      </span>
                    </div>
                    <div className="space-y-6">
                    {halves.map(h => (
                    <div key={h.key}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-[11px] font-black rounded-full px-3 py-1 ${h.key === 'biz' ? 'bg-[#12261F] text-[#F4EFE4]' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                        {h.n.label}
                      </span>
                      <span className="text-[11px] font-bold text-gray-400 tabular">{h.arr.length}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {h.arr.map((s, i) => (
                        <Link
                          key={s.id}
                          href={`/marketplace?supplier=${s.id}`}
                          className="group block bg-white rounded-3xl p-6 shadow-soft hover:shadow-card hover:-translate-y-1 transition-all duration-500 no-underline animate-slide-up"
                          style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
                        >
                          <div className="flex items-center gap-4 mb-4">
                            {(s.logo || s.photo) ? (
                              <span className="w-14 h-14 rounded-2xl overflow-hidden border border-gray-100 flex items-center justify-center bg-white flex-shrink-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={s.logo || s.photo || ''} alt={s.name} className="w-full h-full object-cover" loading="lazy" />
                              </span>
                            ) : (
                              <span className="w-14 h-14 rounded-2xl bg-[#12261F] text-[#F4EFE4] flex items-center justify-center text-xl font-black flex-shrink-0">{(s.name || 'م').trim().charAt(0)}</span>
                            )}
                            <div className="min-w-0 flex-1">
                              <h3 className="font-black text-base text-gray-900 truncate group-hover:text-[#059669] transition-colors">{s.name}</h3>
                              <p className="text-[11px] font-bold text-gray-400 mt-0.5 tabular">{t('mk.n_listings', { n: s.count })}</p>
                            </div>
                            {s.kyc === 'approved' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 border border-green-200 rounded-full text-[10px] font-bold text-green-700 flex-shrink-0">
                                <CheckCircle className="w-2.5 h-2.5" />
                                {t('market.verified')}
                              </span>
                            )}
                          </div>
                          {storeCatNames(s).length > 0 && (
                            <p className="text-xs text-gray-500 line-clamp-1 mb-3">{storeCatNames(s).slice(0, 4).join(' · ')}</p>
                          )}
                          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                            <span className="text-[11px] font-bold text-[#2FA084]">{t('mk.guaranteed')}</span>
                            <span className="inline-flex items-center gap-1 text-[#059669] font-bold text-xs group-hover:gap-2 transition-all">
                              <span>{h.n.visit}</span>
                              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                    </div>
                    ))}
                    </div>
                  </section>
                  )
                })}
              </div>
            )
          })()
        ) : loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-3xl overflow-hidden shadow-soft">
                <div className="aspect-[4/3] animate-shimmer" />
                <div className="p-5 space-y-3">
                  <div className="h-3 w-16 animate-shimmer rounded-full" />
                  <div className="h-5 w-3/4 animate-shimmer rounded-full" />
                  <div className="h-3 w-1/2 animate-shimmer rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="bg-white rounded-3xl shadow-soft p-12 md:p-20 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-amber-50 rounded-2xl flex items-center justify-center text-3xl">📡</div>
            <h3 className="text-xl font-black text-gray-900 mb-2">{t('mk.load_fail')}</h3>
            <p className="text-sm text-gray-500 mb-6">{t('mk.load_fail_sub')}</p>
            <button
              onClick={() => { retriesRef.current = 0; setLoadError(false); setLoading(true); setReloadKey((k) => k + 1) }}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#34D399] text-[#04352A] rounded-2xl text-sm font-bold shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all"
            >
              {t('mk.retry')}
            </button>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-soft p-12 md:p-20 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">{t('market.no_results_title')}</h3>
            <p className="text-sm text-gray-500 mb-6">{t('market.no_results_sub')}</p>
            {hasFilters && (
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#34D399] text-[#04352A] rounded-2xl text-sm font-bold shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                {t('market.clear_all_filters')}
              </button>
            )}
          </div>
        ) : (
          <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredListings.map((listing, i) => {
              // (٧ أغسطس ٢٠٢٦ — محمد) صفر كروت خضرا: أي صورة حقيقية أحسن من
              // كارت فاضي. بنستبعد المكسور والـPDF بس، وبنفضّل صور التاجر
              // الحقيقية على صور التصنيف العامة.
              const photos = (listing.photos || []).filter(p => p?.url && p.quality_flag !== 'broken' && !p.url.toLowerCase().endsWith('.pdf'))
              const primary =
                photos.find(p => p.is_primary && !p.is_placeholder) ||
                photos.find(p => !p.is_placeholder) ||
                photos.find(p => p.is_primary) ||
                photos[0]
              const photoUrl = primary?.url
              const minPrice = getMinPrice(listing)
              const startingPrice = minPrice !== Infinity ? minPrice : null
              const isFav = favorites.has(listing.id)
              const isDemo = isDemoListing(listing.title)
              const displayTitle = cleanListingTitle(listingTitleFor(listing, locale))

              return (
                <Link
                  key={listing.id}
                  href={`/marketplace/${listing.slug}`}
                  className="group block bg-white rounded-3xl overflow-hidden shadow-soft hover:shadow-card hover:-translate-y-1 transition-all duration-500 no-underline animate-slide-up"
                  style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
                >
                  <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                    {photoUrl ? (
                      <>
                        {/* PERF (١ أغسطس): كان <img> خام — يعني كل صور الجريد بتتحمّل
                            مرة واحدة بحجمها الأصلي، وده اللي كان مخلّي سكور
                            /marketplace على الموبايل = 41. next/image بيحوّلها
                            AVIF/WebP بالمقاس المناسب للشاشة، وبيأجّل اللي تحت
                            الشاشة. كل صور الإعلانات على supabase أو cloudinary
                            وهما الاتنين في remotePatterns في next.config.mjs. */}
                        <SmartImage
                          src={photoUrl}
                          alt={displayTitle}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          priority={i < 3}
                          loading={i < 3 ? undefined : 'lazy'}
                          className={`object-cover group-hover:scale-110 transition-transform duration-700 ease-out ${isDemo ? 'opacity-90' : ''}`}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      </>
                    ) : (
                      // (٧ أغسطس ٢٠٢٦ — محمد: «مش عايز الكارت الأخضر») فولباك محايد
                      // بهوية الديزاين الجديد — كريمي هادي + أيقونة الفئة، من غير أخضر.
                      <div className="w-full h-full relative overflow-hidden" style={{ background: '#F4EFE4' }}>
                        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #12261F 1px, transparent 0)', backgroundSize: '18px 18px' }} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-6xl opacity-80 select-none" style={{ filter: 'grayscale(20%)' }}>{listing.category?.icon || '🏷️'}</span>
                        </div>
                      </div>
                    )}

                    {/* Coming Soon badge (DEMO listings) */}
                    {isDemo && (
                      <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-l from-amber-400 to-amber-300 text-amber-900 rounded-full text-[10px] font-black shadow-card border border-amber-500/30">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{t('market.demo_badge')}</span>
                      </div>
                    )}

                    <button
                      onClick={(e) => toggleFavorite(e, listing.id)}
                      disabled={togglingFav === listing.id}
                      className="absolute top-3 left-3 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center hover:bg-white shadow-card disabled:opacity-50 hover:scale-105 transition-all"
                      title={isFav ? t('market.remove_fav') : t('market.save_fav')}
                    >
                      {togglingFav === listing.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      ) : (
                        <Heart className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
                      )}
                    </button>

                    {listing.category && (
                      <div className={`absolute ${isDemo ? 'bottom-12' : 'top-3'} right-3 inline-flex items-center gap-1 px-2.5 py-1 bg-white/90 backdrop-blur rounded-full text-[10px] font-bold text-gray-800`}>
                        <span>{listing.category.icon}</span>
                        <span>{catName(listing.category)}</span>
                      </div>
                    )}

                    {listing.rating && Number(listing.rating) > 0 && (
                      <div className="absolute bottom-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 bg-black/60 backdrop-blur rounded-full text-[10px] font-bold text-white">
                        <Star className="w-3 h-3 fill-[#2FA084] text-[#2FA084]" />
                        <span>{Number(listing.rating).toFixed(1)}</span>
                        <span className="opacity-60">({listing.reviews_count})</span>
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <h3 className="font-black text-base md:text-lg text-gray-900 mb-2 line-clamp-1 group-hover:text-[#059669] transition-colors">
                      {displayTitle}
                    </h3>

                    {/* 🏬 لينك متجر التاجر — جوه كارت الإعلان */}
                    {listing.supplier?.id && listing.supplier?.business_name && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault(); e.stopPropagation()
                          const sid = listing.supplier?.id
                          if (sid) window.location.href = `/marketplace?supplier=${sid}`
                        }}
                        className="mb-2 inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 hover:bg-[#34D399]/10 border border-gray-200 rounded-full text-[10px] font-bold text-gray-600 hover:text-[#059669] transition-colors"
                        title="زور متجر التاجر"
                      >
                        🏬 {listing.supplier.business_name}
                      </button>
                    )}

                    {/* Trust badges */}
                    {(listing.supplier?.kyc_status === 'approved' || listing.requires_id_verification) && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {listing.supplier?.kyc_status === 'approved' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 border border-green-200 rounded-full text-[10px] font-bold text-green-700">
                            <CheckCircle className="w-2.5 h-2.5" />
                            {t('market.verified')}
                          </span>
                        )}
                        {listing.requires_id_verification && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#2FA084]/10 border border-[#2FA084]/30 rounded-full text-[10px] font-bold text-[#2FA084]">
                            <ShieldCheck className="w-2.5 h-2.5" />
                            {t('market.id_required')}
                          </span>
                        )}
                      </div>
                    )}

                    {(listing.district || listing.city) && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mb-3">
                        <MapPin className="w-3 h-3" />
                        {[listing.district, cityFor(listing.city, locale)].filter(Boolean).join(locale.startsWith('ar') ? '، ' : ', ')}
                      </p>
                    )}

                    <div className="flex items-end justify-between pt-3 border-t border-gray-100">
                      <div>
                        {isDemo ? (
                          <p className="text-[10px] text-amber-700 font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {t('market.coming_soon')}
                          </p>
                        ) : startingPrice !== null ? (
                          <>
                            <p className="text-[10px] text-gray-500 font-medium">{t('market.starts_from')}</p>
                            <p className="text-xl font-black text-[#059669] leading-none mt-0.5 tabular">
                              {startingPrice.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                              <span className="text-xs font-medium text-gray-500 ms-1">{t('common.egp')}</span>
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-gray-400 font-medium">{t('market.price_on_request')}</p>
                        )}
                      </div>
                      <div className="inline-flex items-center gap-1 text-[#059669] font-bold text-xs group-hover:gap-2 transition-all">
                        <span>{isDemo ? t('market.view_short') : t('market.details')}</span>
                        <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* 📄 حمّل المزيد — بيظهر طول ما الصفحة رجعت كاملة (يعني غالبًا فيه أكتر) */}
          {listings.length >= visibleLimit && (
            <div ref={loadMoreRef} className="mt-8 text-center">
              <button
                onClick={() => setVisibleLimit((v) => v + 60)}
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#059669] border border-[#059669]/30 rounded-2xl text-sm font-bold shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {loading ? t('common.loading') : t('market.load_more')}
              </button>
            </div>
          )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  )
}

function CategoryPill({
  active, onClick, label, icon, comingSoon,
}: {
  active: boolean
  onClick: () => void
  label: string
  icon: string
  /** When set, the section has no data yet: pill locks and shows this label. */
  comingSoon?: string
}) {
  if (comingSoon) {
    return (
      <button
        disabled
        title={comingSoon}
        className="flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed select-none"
      >
        <span className="opacity-50">{icon}</span>
        <span className="opacity-70">{label}</span>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 leading-none whitespace-nowrap">
          🔒 {comingSoon}
        </span>
      </button>
    )
  }
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 shadow-soft ${
        active
          ? 'bg-[#34D399] text-[#04352A] shadow-elevated'
          : 'bg-white text-gray-700 hover:bg-gray-50 hover:shadow-card border border-gray-100'
      }`}
    >
      <span>{icon}</span>
      {label}
    </button>
  )
}



export default function MarketplaceClient({ initialListings }: { initialListings?: Listing[] } = {}) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    }>
      <MarketplaceBrowseContent initialListings={initialListings} />
    </Suspense>
  )
}
