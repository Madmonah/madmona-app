'use client'

// ============================================================================
// /admin/listings — إدارة المنتجات الموحّدة (مدمجة)
// ----------------------------------------------------------------------------
// مبنية على RPCs آمنة بـ pagination على السيرفر:
//   admin_listings_facets / admin_listings_search / admin_bulk_set_status
//   (كلها مقفولة على is_admin()). بتشيل كل المنتج — حقيقي + دليل مصر (8000+).
// فلاتر (نوع/حالة/تصنيف/مدينة/رقم/استلام/بحث) + نشر بالجملة + لكل صف:
//   معاينة · تغيير حالة · تعديل · حذف/أرشفة.
// ============================================================================

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { adminPanelStage } from '@/lib/platform-staff'
// 🔐 الـRPCs دي محميّة بصلاحية — لازم تعدّي من بوابة الأدمن على السيرفر
// 🧑‍💼 (٢٥/٨) staffAuthHeaders — موظفين الأبليكيشن (جلسة Supabase) بيبعتوا
// التوكن مع كل نداء عشان حارس /api/admin/* يقبلهم (شهد وسامية وباقي الفريق).
import { adminRpc, staffAuthHeaders } from '@/lib/adminRpc'
// 🕒 (٢١ أغسطس ٢٠٢٦) محمد: «عايز وقت وتاريخ كل إعلان سواء منشور أو درافت
//    أو أي إعلان عمومًا». التنسيق مركزي في lib/arDateTime.
import { fmtDateTime, sinceLabel } from '@/lib/arDateTime'
import {
  ArrowRight, Loader2, Lock, ShieldAlert, Plus, Eye, Edit2, Trash2,
  SlidersHorizontal, Archive, Building2, Clock,
} from 'lucide-react'

const supabase = supabaseBrowser as any

type Stage = 'loading' | 'unauthenticated' | 'forbidden' | 'ready'
const PAGE = 50

const C = {
  bg: '#FAFAF7', card: '#ffffff', ink: '#16241f', sub: '#5b6b64',
  green: '#059669', green2: '#2FA084', line: '#e7e9e5',
  chip: '#eef4f1', danger: '#b3261e', warn: '#9a6b00', gold: '#d4a017',
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'مسودة', pending_review: 'مراجعة', published: 'منشور',
  paused: 'موقوف', rejected: 'مرفوض',
}
const STATUS_COLOR: Record<string, string> = {
  draft: '#5b6b64', pending_review: '#9a6b00', published: '#059669',
  paused: '#b3261e', rejected: '#8a1c16',
}
const STATUS_ORDER = ['published', 'draft', 'paused', 'pending_review', 'rejected']

type Row = {
  id: string; title: string; slug: string; status: string
  is_directory: boolean; directory_source: string | null
  category: string | null; track: string | null; city: string | null; district: string | null
  phone: string | null; phone_verified: boolean; unclaimed: boolean
  owner_name: string | null
  seller_kind: 'individual' | 'business' | null
  created_at: string; published_at: string | null
  rejection_reason: string | null; rejected_at: string | null
  pause_reason: string | null; paused_at: string | null
}
// 📥 صف من ويزارد الإضافة (جدول listing_drafts) — شوف تعليق الدمج تحت
type WizDraft = {
  id: string; title: string | null; description: string | null
  category_slug: string | null; city: string | null; price: number | null
  contact_name: string | null; contact_phone: string | null
  account_type: 'individual' | 'business'; business_name: string | null
  photos: { url: string }[] | null
  status: 'draft' | 'submitted' | 'claimed' | 'rejected' | 'expired'
  created_at: string
}
const WIZ_LABEL: Record<string, string> = {
  draft: 'لسه بيملا', submitted: 'محتاجة مراجعة ⏳', claimed: 'عمل حساب ✅',
  rejected: 'مرفوضة', expired: 'منتهية',
}
type Facets = {
  total: number
  by_tier: { real: number; directory: number }
  by_status: Record<string, number>
  cities: string[]
  categories: { id: string; name: string }[]
}

export default function AdminListingsPage() {
  const [stage, setStage] = useState<Stage>('loading')

  const [facets, setFacets] = useState<Facets | null>(null)
  const [tier, setTier] = useState('all')
  const [status, setStatus] = useState('all')
  const [category, setCategory] = useState('')
  const [city, setCity] = useState('')
  const [hasPhone, setHasPhone] = useState('all')
  const [claimed, setClaimed] = useState('all')
  // 🏷️ (٢٤ أغسطس ٢٦) معرض ولا فرد — «لو معرض هنتعامل معاه B2B»
  const [seller, setSeller] = useState('all')
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [offset, setOffset] = useState(0)

  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [sel, setSel] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)

  const [statusChanging, setStatusChanging] = useState<Row | null>(null)
  const [deleting, setDeleting] = useState<Row | null>(null)
  // 🚫 (٢١ أغسطس ٢٠٢٦) محمد: «وعايزين سبب للإعلانات المرفوضة».
  //    الرفض مابقاش دوسة واحدة — لازم سبب مكتوب، والداتابيز نفسها بترفض
  //    الرفض من غير سبب (admin_bulk_set_status).
  const [stopping, setStopping] = useState<{ ids: string[]; label: string; kind: 'rejected' | 'paused' } | null>(null)
  const [reason, setReason] = useState('')

  /* 👤 (٢٣ أغسطس ٢٠٢٦) محمد: «عايز خانة باسم صاحب الإعلان بحيث لو الإعلان
     اتضاف من الأدمن بانيل أو من أي رقم مش رقم صاحب الإعلان أو البيزنس
     نقدر نغيره».

     الإعلان اللي مندوب ضايفه كان بيفضل شايل رقم المندوب ومحدش يعرف
     صاحبه مين. الخانة دي بتفصل الاتنين: مين صاحبه فعلاً، وإيه رقمه. */
  const [owner, setOwner] = useState<{ id: string; title: string; name: string; phone: string } | null>(null)

  /* ➕ (٢٤ أغسطس ٢٦) محمد: «عايزين تاب لرقم صاحب الإعلان واحنا بنضيف
     أي إعلان من الأدمن». نموذج مختصر: العنوان والتصنيف + اسم صاحبه ورقمه. */
  const [adder, setAdder] = useState<null | {
    title: string; category_id: string; city: string;
    owner_name: string; owner_phone: string; contact_phone: string;
    photos: File[]; publish: boolean;
  }>(null)
  const [adderErr, setAdderErr] = useState<string | null>(null)
  const [adderProgress, setAdderProgress] = useState<string | null>(null)
  const [ownerErr, setOwnerErr] = useState<string | null>(null)

  /* 📥 (٢٥ أغسطس ٢٠٢٦) محمد: «الإعلانات اللي في /admin/listing-drafts
     مختلفة عن اللي في /admin/listings — عايز مكان واحد يعرض الإعلانات
     كلها وهو اللي يظهر عند الموظفين».
     الفرق كان حقيقي: listing-drafts بتعرض جدول `listing_drafts` (ويزارد
     الإضافة — ناس لسه بتملا ومعملتش حساب)، ودي بتعرض `listings`. دمجنا:
     قسم «واردة الويزارد» جوّه الشاشة دي، والرابط القديم بقى تحويلة هنا.
     نفس الـAPI ونفس الأفعال (تذكير واتساب · رفض) — مفيش نسخة موازية. */
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizDrafts, setWizDrafts] = useState<WizDraft[]>([])
  const [wizLoading, setWizLoading] = useState(false)

  async function loadWizard() {
    setWizLoading(true)
    try {
      const r = await fetch('/api/admin/listing-drafts?status=all', { cache: 'no-store', headers: await staffAuthHeaders() })
      const j = await r.json()
      setWizDrafts((j.drafts || []) as WizDraft[])
    } catch { /* الشاشة الأساسية ماتتأثرش */ } finally { setWizLoading(false) }
  }

  // ---- guard ----
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      // 🚪 (٢٣ أغسطس ٢٠٢٦) الصفحة دي جوّه لوحة مقفولة بكوكي — فبنسأل عن
      // جلسة اللوحة الأول، وجلسة Supabase تبقى الطريق التاني مش الوحيد.
      const gate = await adminPanelStage(!!session?.user)
      if (gate !== 'ready') { setStage(gate); return }
      setStage('ready')
    })()
  }, [])

  // 📥 تحميل واردة الويزارد مع الشاشة + فتح القسم لو جايين من الرابط القديم
  useEffect(() => {
    if (stage !== 'ready') return
    loadWizard()
    if (typeof window !== 'undefined'
        && new URLSearchParams(window.location.search).get('stage') === 'wizard') {
      setWizardOpen(true)
      window.history.replaceState({}, '', '/admin/listings')
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [stage])

  /* ➕ (٢٤ أغسطس ٢٦) لو دخلنا الصفحة بـ?add=1 (من تاب «ضيف إعلان» في السايدبار)،
     نفتح المودال أوتوماتيك — بس بعد ما التصنيفات تحمّل عشان يكون فيه اختيار. */
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (stage !== 'ready' || !facets?.categories?.length) return
    const sp = new URLSearchParams(window.location.search)
    if (sp.get('add') === '1' && !adder) {
      setAdderErr(null)
      setAdder({
        title: '', category_id: facets.categories[0]?.id || '',
        city: '', owner_name: '', owner_phone: '', contact_phone: '',
        photos: [], publish: true, seller_kind: 'individual',
      })
      window.history.replaceState({}, '', '/admin/listings')
    }
  }, [stage, facets, adder])

  async function saveNewListing() {
    if (!adder) return
    setBusy(true); setAdderErr(null); setAdderProgress(null)
    try {
      // ١) اخلق الإعلان draft
      setAdderProgress('بنعمل الإعلان…')
      const res: any = await adminRpc('admin_add_listing', {
        p_title: adder.title.trim(),
        p_category: adder.category_id,
        p_city: adder.city.trim() || null,
        p_owner_name: adder.owner_name.trim() || null,
        p_owner_phone: adder.owner_phone.trim() || null,
        p_contact_phone: adder.contact_phone.trim() || null,
        p_seller_kind: adder.seller_kind,
      })
      const listingId = String(res?.id || '')
      if (!listingId) throw new Error('الإعلان اتخلق بس مافيش رقم')

      // ٢) ارفع الصور واحدة واحدة (multipart POST)
      let uploaded = 0
      for (let i = 0; i < adder.photos.length; i++) {
        const file = adder.photos[i]
        setAdderProgress(`بنرفع الصور… ${i + 1}/${adder.photos.length}`)
        const fd = new FormData()
        fd.append('listing_id', listingId)
        fd.append('file', file)
        fd.append('display_order', String(i))
        fd.append('is_primary', i === 0 ? 'true' : 'false')
        const up = await fetch('/api/admin/listing-photo', { method: 'POST', body: fd, headers: await staffAuthHeaders() })
        const upJ = await up.json().catch(() => null)
        if (!up.ok || upJ?.ok === false) {
          throw new Error(`صورة ${i + 1}: ${upJ?.error || 'فشل الرفع'}`)
        }
        uploaded++
      }

      // ٣) لو محمد عايز ينشر ولسه فيه صور، اعمل النشر
      if (adder.publish) {
        if (uploaded === 0) {
          setAdderProgress(null)
          setAdderErr('النشر بيحتاج صورة على الأقل — الإعلان اتحفظ كـdraft.')
          setBusy(false)
          setAdder(null)
          setFlash(`اتحفظ كـdraft (${listingId.slice(0, 8)}) — محتاج صور عشان يتنشر`)
          await load()
          return
        }
        setAdderProgress('بننشر…')
        await adminRpc('admin_publish_listing_now', { p_id: listingId })
        setFlash(`اتنشر (${listingId.slice(0, 8)}) ✓`)
      } else {
        setFlash(`اتحفظ كـdraft (${listingId.slice(0, 8)}) ✓`)
      }

      setAdder(null)
      await load()
    } catch (e: any) { setAdderErr(e?.message || 'مقدرناش نضيف') }
    finally { setBusy(false); setAdderProgress(null) }
  }

  async function saveOwner() {
    if (!owner) return
    setBusy(true); setOwnerErr(null)
    try {
      await adminRpc('admin_set_listing_owner', {
        p_id: owner.id,
        p_owner_name: owner.name.trim() || null,
        p_phone: owner.phone.trim() || null,
      })
      setOwner(null)
      setFlash('اتظبط صاحب الإعلان ✓')
      await load()
    } catch (e: any) {
      setOwnerErr(e?.message || 'مقدرناش نحفظ')
    } finally {
      setBusy(false)
    }
  }

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setOffset(0) }, 350)
    return () => clearTimeout(t)
  }, [search])
  useEffect(() => { setOffset(0) }, [tier, status, category, city, hasPhone, claimed, seller])

  // 🔐 الدوال دي محميّة بصلاحية أدمن — لازم تعدّي من /api/admin/rpc.
  // النداء المباشر من المتصفح بيرجع forbidden (اللوحة بكوكي مش Supabase Auth).
  const loadFacets = useCallback(async () => {
    try {
      const data = await adminRpc<Facets>('admin_listings_facets')
      setFacets(data)
    } catch (e: any) { setErr(e?.message || 'مقدرناش نحمّل الفلاتر') }
  }, [])

  const load = useCallback(async () => {
    setLoading(true); setErr(null)
    try {
      const data: any = await adminRpc('admin_listings_search', {
        p_tier: tier, p_status: status,
        p_category: category || null, p_city: city || null,
        p_has_phone: hasPhone, p_claimed: claimed, p_seller: seller,
        p_search: debounced || null, p_limit: PAGE, p_offset: offset,
      })
      setRows((data?.rows || []) as Row[])
      setTotal(data?.total || 0)
      setSel({})
    } catch (e: any) {
      setErr(e?.message || 'مقدرناش نحمّل الليستنجات'); setRows([]); setTotal(0)
    }
    setLoading(false)
  }, [tier, status, category, city, hasPhone, claimed, seller, debounced, offset])

  useEffect(() => { if (stage === 'ready') { loadFacets() } }, [stage, loadFacets])
  useEffect(() => { if (stage === 'ready') { load() } }, [stage, load])

  // 🔄 (٢٥/٨/٢٠٢٦ — محمد: «التابات ليها نفس المسار وكل تابة بتعرض حاجة غير
  //    التانية») كل تاب مفتوح كان بيفضل ماسك النسخة اللي اتحمّلت وقت فتحه —
  //    فتابين على نفس الرابط بيعرضوا داتا مختلفة. دلوقتي أول ما ترجع للتاب
  //    (focus/visibility) الليستة بتتحدّث لوحدها من السيرفر.
  useEffect(() => {
    if (stage !== 'ready') return
    const refresh = () => { if (document.visibilityState === 'visible') { load(); loadFacets() } }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [stage, load, loadFacets])

  const selectedIds = useMemo(() => Object.keys(sel).filter((k) => sel[k]), [sel])
  const allChecked = rows.length > 0 && rows.every((r) => sel[r.id])

  function toggleAll() {
    if (allChecked) { setSel({}); return }
    const m: Record<string, boolean> = {}
    rows.forEach((r) => { m[r.id] = true })
    setSel(m)
  }

  async function setStatusBulk(ids: string[], newStatus: string, confirmMsg?: string, rejectReason?: string) {
    if (ids.length === 0) return
    // 🚫⏸️ الرفض **والإيقاف** بيعدّوا على مودال السبب الأول — مفيش وقفة صامتة.
    //    ١٩٣ إعلان اتوقفوا قبل كده من غير أي سبب مكتوب، و١٢٥ منهم في نفس
    //    الدقيقة — ومحدش عرف يرجّعهم بثقة بعد كده.
    if ((newStatus === 'rejected' || newStatus === 'paused') && !rejectReason) {
      setStopping({ ids, kind: newStatus, label: ids.length === 1
        ? (rows.find(r => r.id === ids[0])?.title || '') : `${ids.length} نشاط` })
      setReason('')
      return
    }
    if (confirmMsg && !confirm(confirmMsg)) return
    setBusy(true); setFlash(null)
    let data: any
    try {
      data = await adminRpc('admin_bulk_set_status',
        rejectReason
          ? { p_ids: ids, p_status: newStatus, p_reason: rejectReason }
          : { p_ids: ids, p_status: newStatus })
    } catch (e: any) {
      setBusy(false); setFlash('خطأ: ' + (e?.message || 'الحفظ فشل')); return
    }
    setBusy(false)
    const u = data?.updated || 0
    const f = (data?.failed || []).length
    setFlash(`تم تحديث ${u}${f ? ` · فشل ${f} (غالباً نشاط حقيقي محتاج صورة/توثيق رقم)` : ''}`)
    setStatusChanging(null); setStopping(null); setReason('')
    await load(); await loadFacets()
  }

  async function handleDelete() {
    if (!deleting) return
    setBusy(true); setFlash(null)
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      const accessToken = session?.access_token || ''
      const res = await fetch(`/api/admin/listings/${deleting.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      })
      const result = await res.json()
      setBusy(false)
      if (!res.ok || result.error) {
        setFlash('فشل الحذف: ' + (result.message || result.error || 'خطأ'))
        return
      }
      setFlash(`✅ ${result.message || 'تم'}`)
      setDeleting(null)
      await load(); await loadFacets()
    } catch (e) {
      setBusy(false)
      setFlash('خطأ في الاتصال: ' + (e instanceof Error ? e.message : 'unknown'))
    }
  }

  const pageNo = Math.floor(offset / PAGE) + 1
  const pages = Math.max(1, Math.ceil(total / PAGE))

  // ---- styles ----
  const sChip = (active: boolean): React.CSSProperties => ({
    padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
    border: `1px solid ${active ? C.green : C.line}`,
    background: active ? C.green : C.card, color: active ? '#fff' : C.ink,
    fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
  })
  const sSelect: React.CSSProperties = {
    padding: '8px 10px', borderRadius: 12, border: `1px solid ${C.line}`,
    background: C.card, color: C.ink, fontSize: 13, minWidth: 130,
  }
  const sBtn = (bg: string): React.CSSProperties => ({
    padding: '8px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
    background: bg, color: '#fff', fontSize: 13, fontWeight: 700,
    opacity: busy || selectedIds.length === 0 ? 0.5 : 1,
  })
  const badge = (bg: string): React.CSSProperties => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: 999,
    fontSize: 11, fontWeight: 700, background: bg + '22', color: bg,
  })
  const iconBtn = (bg: string, fg: string): React.CSSProperties => ({
    width: 32, height: 32, borderRadius: 10, border: 'none', cursor: 'pointer',
    background: bg, color: fg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  })

  // ---- guard screens ----
  if (stage === 'loading') {
    return <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 className="animate-spin" style={{ width: 28, height: 28, color: C.green }} />
    </div>
  }
  if (stage === 'unauthenticated') {
    return <div dir="rtl" style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: 32, textAlign: 'center', maxWidth: 360 }}>
        <Lock style={{ width: 32, height: 32, color: C.green, margin: '0 auto 12px' }} />
        <h1 style={{ fontWeight: 800, marginBottom: 16 }}>سجّل دخول الأول</h1>
        <Link href="/auth/login?redirect=/admin/listings" style={{ display: 'block', background: C.green, color: '#fff', padding: 12, borderRadius: 12, fontWeight: 700, textDecoration: 'none' }}>دخول</Link>
      </div>
    </div>
  }
  if (stage === 'forbidden') {
    return <div dir="rtl" style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: 32, textAlign: 'center', maxWidth: 360 }}>
        <ShieldAlert style={{ width: 32, height: 32, color: C.danger, margin: '0 auto 12px' }} />
        <h1 style={{ fontWeight: 800 }}>للأدمن فقط</h1>
      </div>
    </div>
  }

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: C.bg, color: C.ink, fontFamily: 'Cairo, Inter, system-ui, sans-serif' }}>
      {/* header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/admin/dashboard" style={{ width: 36, height: 36, borderRadius: 999, background: '#fff', border: `1px solid ${C.line}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowRight style={{ width: 16, height: 16, color: C.sub }} />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            <Building2 style={{ width: 20, height: 20, color: C.green }} />
            <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>إدارة المنتجات</h1>
          </div>
          {/* 📋 (٢١ أغسطس ٢٠٢٦) باب على الإعلانات الواقفة. من غيره الدرافتس
              بتفضل مدفونة جوّه فلتر «الحالة» اللي محدش بيدوس عليه. */}
          <Link href="/admin/drafts" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: `1px solid ${C.line}`, color: C.ink, padding: '8px 14px', borderRadius: 12, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            <Clock style={{ width: 16, height: 16, color: C.warn }} /> الواقفة
          </Link>
          {/* 📥 دمج شاشة listing-drafts هنا — «مكان واحد يعرض الإعلانات كلها» */}
          <button
            onClick={() => { setWizardOpen(v => !v); if (!wizardOpen) loadWizard() }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
              background: wizardOpen ? C.green : '#fff',
              border: `1px solid ${wizardOpen ? C.green : C.line}`,
              color: wizardOpen ? '#fff' : C.ink,
              padding: '8px 14px', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            📥 واردة الويزارد
            {wizDrafts.filter(d => d.status === 'submitted').length > 0 && (
              <span style={{ background: wizardOpen ? '#fff' : C.warn, color: wizardOpen ? C.green : '#fff',
                borderRadius: 999, padding: '1px 8px', fontSize: 11, fontWeight: 800 }}>
                {wizDrafts.filter(d => d.status === 'submitted').length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setAdderErr(null); setAdder({
              title: '', category_id: facets?.categories?.[0]?.id || '',
              city: '', owner_name: '', owner_phone: '', contact_phone: '',
            }) }}
            disabled={!facets?.categories?.length}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.green, color: '#fff', padding: '8px 14px', borderRadius: 12, fontSize: 13, fontWeight: 700, border: 'none', cursor: facets?.categories?.length ? 'pointer' : 'not-allowed' }}>
            <Plus style={{ width: 16, height: 16 }} /> ضيف إعلان
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '16px' }}>
        <p style={{ color: C.sub, margin: '0 0 14px', fontSize: 13 }}>
          كل المنتج — حقيقي أو دليل مصر — فلتر، وانشر/أوقف/أخفي بالجملة، أو اتحكم في كل صف.
        </p>

        {/* summary */}
        {facets && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            <span style={badge(C.green)}>الكل {facets.total}</span>
            <span style={badge(C.green2)}>حقيقي {facets.by_tier.real}</span>
            <span style={badge(C.gold)}>دليل {facets.by_tier.directory}</span>
            {Object.entries(facets.by_status).map(([s, n]) => (
              <span key={s} style={badge(STATUS_COLOR[s] || C.sub)}>{STATUS_LABEL[s] || s} {n}</span>
            ))}
          </div>
        )}

        {/* 📥 واردة الويزارد — كانت شاشة /admin/listing-drafts المنفصلة */}
        {wizardOpen && (
          <div style={{ background: C.card, border: `2px solid ${C.green}`, borderRadius: 18, padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              <div>
                <b style={{ fontSize: 15 }}>📥 واردة الويزارد</b>
                <span style={{ fontSize: 12, color: C.sub, marginInlineStart: 8 }}>
                  ناس بدأت تضيف إعلان من الموقع ولسه معملتش حساب — راجع واتواصل قبل ما تبرد
                </span>
              </div>
              <button onClick={loadWizard} style={{ ...sBtn(C.sub), padding: '6px 12px' }}>
                {wizLoading ? '…' : 'تحديث'}
              </button>
            </div>
            {wizDrafts.length === 0 ? (
              <p style={{ fontSize: 13, color: C.sub, margin: 0 }}>{wizLoading ? 'جاري التحميل…' : 'مفيش واردة دلوقتي 📭'}</p>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {wizDrafts.slice(0, 30).map(d => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                    background: C.bg, border: `1px solid ${C.line}`, borderRadius: 12, padding: '10px 12px' }}>
                    {(d.photos?.length ?? 0) > 0 && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={d.photos![0].url} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />
                    )}
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <b style={{ fontSize: 13 }}>{d.title || '(من غير عنوان)'}</b>
                      <div style={{ fontSize: 11.5, color: C.sub }}>
                        {[d.contact_name, d.city, d.category_slug,
                          d.account_type === 'business' ? (d.business_name || 'شركة') : 'فرد',
                          d.price ? `${d.price} ج` : null].filter(Boolean).join(' · ')}
                        {' · '}{new Date(d.created_at).toLocaleDateString('ar-EG')}
                      </div>
                    </div>
                    <span style={badge(d.status === 'submitted' ? C.warn : d.status === 'claimed' ? C.green : C.sub)}>
                      {WIZ_LABEL[d.status] || d.status}
                    </span>
                    {d.contact_phone && (
                      <a href={`https://wa.me/${d.contact_phone.replace(/\D/g, '').replace(/^0/, '20')}`}
                         target="_blank" rel="noopener noreferrer"
                         style={{ ...sBtn(C.green), textDecoration: 'none' }}>واتساب</a>
                    )}
                    {d.status === 'submitted' && (
                      <>
                        <button style={sBtn(C.green2)} onClick={async () => {
                          await fetch('/api/admin/listing-drafts/nudge', { method: 'POST',
                            headers: { 'Content-Type': 'application/json', ...(await staffAuthHeaders()) }, body: JSON.stringify({ id: d.id }) })
                          setFlash('اتبعت تذكير واتساب'); loadWizard()
                        }}>تذكير</button>
                        <button style={sBtn(C.danger)} onClick={async () => {
                          if (!confirm('هترفض الوارد ده؟')) return
                          await fetch('/api/admin/listing-drafts/reject', { method: 'POST',
                            headers: { 'Content-Type': 'application/json', ...(await staffAuthHeaders()) }, body: JSON.stringify({ id: d.id }) })
                          loadWizard()
                        }}>رفض</button>
                      </>
                    )}
                  </div>
                ))}
                {wizDrafts.length > 30 && (
                  <p style={{ fontSize: 12, color: C.sub, margin: 0 }}>معروض أول ٣٠ من {wizDrafts.length}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* filters */}
        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: 14, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: C.sub, marginInlineEnd: 4 }}>النوع:</span>
            {[['all', 'الكل'], ['real', 'حقيقي'], ['directory', 'دليل']].map(([v, l]) => (
              <button key={v} style={sChip(tier === v)} onClick={() => setTier(v)}>{l}</button>
            ))}
            <span style={{ width: 1, height: 18, background: C.line, margin: '0 6px' }} />
            <span style={{ fontSize: 12, color: C.sub, marginInlineEnd: 4 }}>البائع:</span>
            {[['all', 'الكل'], ['business', '🏢 معرض/نشاط'], ['individual', '👤 فرد']].map(([v, l]) => (
              <button key={v} style={sChip(seller === v)} onClick={() => setSeller(v)}>{l}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: C.sub, marginInlineEnd: 4 }}>الحالة:</span>
            <button style={sChip(status === 'all')} onClick={() => setStatus('all')}>الكل</button>
            {STATUS_ORDER.map((s) => (
              <button key={s} style={sChip(status === s)} onClick={() => setStatus(s)}>{STATUS_LABEL[s]}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <select style={sSelect} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">كل التصنيفات</option>
              {facets?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select style={sSelect} value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">كل المدن</option>
              {facets?.cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select style={sSelect} value={hasPhone} onChange={(e) => setHasPhone(e.target.value)}>
              <option value="all">رقم: الكل</option>
              <option value="yes">معاه رقم</option>
              <option value="no">من غير رقم</option>
            </select>
            <select style={sSelect} value={claimed} onChange={(e) => setClaimed(e.target.value)}>
              <option value="all">الاستلام: الكل</option>
              <option value="unclaimed">متستلمش</option>
              <option value="claimed">متستلم</option>
            </select>
            <input style={{ ...sSelect, minWidth: 200, flex: 1 }} placeholder="ابحث بالاسم / الرقم / المدينة…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {/* bulk bar */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10, position: 'sticky', top: 64, zIndex: 5, background: C.bg, padding: '6px 0' }}>
          <span style={{ fontSize: 13, color: C.sub }}>محدّد: <b>{selectedIds.length}</b></span>
          <button style={sBtn(C.green)} disabled={busy || !selectedIds.length} onClick={() => setStatusBulk(selectedIds, 'published', `هتنشر ${selectedIds.length} نشاط. تمام؟`)}>انشر</button>
          <button style={sBtn(C.danger)} disabled={busy || !selectedIds.length} onClick={() => setStatusBulk(selectedIds, 'paused', `هتوقف ${selectedIds.length} نشاط. تمام؟`)}>أوقف</button>
          <button style={sBtn(C.sub)} disabled={busy || !selectedIds.length} onClick={() => setStatusBulk(selectedIds, 'draft', `هتخفي ${selectedIds.length} نشاط (مسودة). تمام؟`)}>إخفاء</button>
          <button style={sBtn('#8a1c16')} disabled={busy || !selectedIds.length} onClick={() => setStatusBulk(selectedIds, 'rejected', `هترفض ${selectedIds.length} نشاط. تمام؟`)}>ارفض</button>
          {flash && <span style={{ fontSize: 13, color: flash.startsWith('خطأ') || flash.startsWith('فشل') ? C.danger : C.green, marginInlineStart: 8 }}>{flash}</span>}
        </div>

        {err && (
          <div style={{ background: '#fdecea', color: C.danger, padding: 12, borderRadius: 12, marginBottom: 12, fontSize: 13 }}>
            {err.includes('admin only') ? 'الصفحة دي للأدمن بس — اتأكد إنك داخل بحساب الأدمن.' : 'خطأ: ' + err}
          </div>
        )}

        {/* table */}
        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.chip, textAlign: 'right' }}>
                  <th style={{ padding: 10, width: 36 }}><input type="checkbox" checked={allChecked} onChange={toggleAll} /></th>
                  <th style={{ padding: 10 }}>النشاط</th>
                  <th style={{ padding: 10 }}>النوع</th>
                  <th style={{ padding: 10 }}>الحالة</th>
                  <th style={{ padding: 10 }}>التصنيف</th>
                  <th style={{ padding: 10 }}>المدينة</th>
                  <th style={{ padding: 10 }}>الرقم</th>
                  <th style={{ padding: 10 }}>صاحب الإعلان</th>
                  <th style={{ padding: 10 }}>الاستلام</th>
                  {/* 🕒 (٢١ أغسطس ٢٠٢٦) العمودين دول كانوا **بيتجابوا من الداتابيز
                      ويترموا** — `created_at`/`published_at` موجودين في الـtype
                      ومكانوش معروضين، فمحدش يعرف الإعلان بقاله قد إيه. */}
                  <th style={{ padding: 10 }}>اتعمل</th>
                  <th style={{ padding: 10 }}>اتنشر</th>
                  <th style={{ padding: 10 }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={11} style={{ padding: 24, textAlign: 'center', color: C.sub }}>…بحمّل</td></tr>}
                {!loading && rows.length === 0 && <tr><td colSpan={11} style={{ padding: 24, textAlign: 'center', color: C.sub }}>مفيش نتايج بالفلاتر دي</td></tr>}
                {!loading && rows.map((r) => (
                  <tr key={r.id} style={{ borderTop: `1px solid ${C.line}` }}>
                    <td style={{ padding: 10 }}>
                      <input type="checkbox" checked={!!sel[r.id]} onChange={(e) => setSel((s) => ({ ...s, [r.id]: e.target.checked }))} />
                    </td>
                    <td style={{ padding: 10, maxWidth: 260 }}>
                      <a href={`/marketplace/${r.slug}`} target="_blank" rel="noreferrer" style={{ color: C.green, fontWeight: 700, textDecoration: 'none' }}>{r.title}</a>
                    </td>
                    <td style={{ padding: 10 }}><span style={badge(r.is_directory ? C.gold : C.green2)}>{r.is_directory ? 'دليل' : 'حقيقي'}</span></td>
                    <td style={{ padding: 10, maxWidth: 220 }}>
                      <span style={badge(STATUS_COLOR[r.status] || C.sub)}>{STATUS_LABEL[r.status] || r.status}</span>
                      {/* 🚫 (٢١ أغسطس ٢٠٢٦) سبب الرفض جنب الحالة على طول.
                          محمد: «وعايزين سبب للإعلانات المرفوضة». قبل كده
                          الإعلان كان بيترفض ومحدش يعرف ليه — لا صاحبه ولا احنا. */}
                      {r.status === 'rejected' && r.rejection_reason && (
                        <div style={{ fontSize: 11, color: C.danger, marginTop: 4, lineHeight: 1.6 }}>
                          {r.rejection_reason}
                          {r.rejected_at && (
                            <span style={{ color: C.sub, display: 'block', fontSize: 10 }}>
                              {fmtDateTime(r.rejected_at)}
                            </span>
                          )}
                        </div>
                      )}
                      {/* ⏸️ (٢١ أغسطس ٢٠٢٦) وسبب الإيقاف كمان.
                          محمد: «الإعلانات الموقوفة برضو عايز أعرف اتوقفت ليه».
                          كان ١٩٣ موقوف وولا واحد عليه سبب. */}
                      {r.status === 'paused' && r.pause_reason && (
                        <div style={{ fontSize: 11, color: C.warn, marginTop: 4, lineHeight: 1.6 }}>
                          {r.pause_reason}
                          {r.paused_at && (
                            <span style={{ color: C.sub, display: 'block', fontSize: 10 }}>
                              {fmtDateTime(r.paused_at)}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: 10, color: C.sub }}>{r.category || '—'}</td>
                    <td style={{ padding: 10, color: C.sub }}>{r.city || '—'}</td>
                    <td style={{ padding: 10, color: C.sub, direction: 'ltr', textAlign: 'right' }}>{r.phone || '—'}{r.phone && r.phone_verified ? ' ✓' : ''}</td>
                    <td style={{ padding: 10, color: C.sub, whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        onClick={() => { setOwnerErr(null); setOwner({ id: r.id, title: r.title, name: r.owner_name || '', phone: r.phone || '' }) }}
                        title="ظبّط اسم صاحب الإعلان ورقمه"
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                          font: 'inherit', color: r.owner_name ? C.ink : C.sub,
                          textDecoration: 'underline', textUnderlineOffset: 3 }}>
                        {r.owner_name || 'مش متسجّل'}
                      </button>
                      {r.seller_kind && (
                        <span style={{ display: 'block', fontSize: 10.5, marginTop: 3,
                          color: r.seller_kind === 'business' ? C.green : C.sub, fontWeight: 700 }}>
                          {r.seller_kind === 'business' ? '🏢 معرض/نشاط — B2B' : '👤 فرد'}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: 10 }}><span style={badge(r.unclaimed ? C.warn : C.green)}>{r.unclaimed ? 'متستلمش' : 'متستلم'}</span></td>
                    <td style={{ padding: 10, color: C.sub, whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 700, color: C.ink, fontSize: 12 }}>{fmtDateTime(r.created_at)}</div>
                      <div style={{ fontSize: 11, opacity: 0.8 }}>{sinceLabel(r.created_at)}</div>
                    </td>
                    <td style={{ padding: 10, color: C.sub, whiteSpace: 'nowrap' }}>
                      {r.published_at
                        ? <>
                            <div style={{ fontWeight: 700, color: C.green, fontSize: 12 }}>{fmtDateTime(r.published_at)}</div>
                            <div style={{ fontSize: 11, opacity: 0.8 }}>{sinceLabel(r.published_at)}</div>
                          </>
                        : <span style={{ fontSize: 12 }}>— لسه</span>}
                    </td>
                    <td style={{ padding: 10 }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <a href={`/marketplace/${r.slug}`} target="_blank" rel="noreferrer" title="معاينة" style={iconBtn('#f1f5f3', C.sub)}><Eye style={{ width: 15, height: 15 }} /></a>
                        <button title="تغيير الحالة" style={iconBtn('#eaf1ff', '#2456c8')} onClick={() => setStatusChanging(r)}><SlidersHorizontal style={{ width: 15, height: 15 }} /></button>
                        <Link href={`/supplier/marketplace/${r.id}/edit`} title="تعديل" style={iconBtn(C.green + '1a', C.green)}><Edit2 style={{ width: 15, height: 15 }} /></Link>
                        {/* 💅🍽️ (٢٥/٨/٢٠٢٦) محمد: «التجميل والمطاعم مينفعش كل خدمة
                            تيجي في إعلان لوحده» — الإضافة الواقعية: من نفس الشاشة
                            الموظف بيفتح منيو المطعم أو كتالوج خدمات الصالون
                            ويضيف الأصناف جوّه الإعلان الواحد. */}
                        {!r.is_directory && (
                          <Link
                            href={`/supplier/marketplace/${r.id}/${r.track === 'restaurants' ? 'menu' : 'products'}`}
                            title={r.track === 'restaurants' ? 'المنيو' : 'الخدمات والمنتجات'}
                            style={iconBtn('#fff7e0', '#9a6b00')}
                          >{r.track === 'restaurants' ? '🍽️' : '🧾'}</Link>
                        )}
                        <button title="حذف / أرشفة" style={iconBtn('#fdecea', C.danger)} onClick={() => setDeleting(r)}><Trash2 style={{ width: 15, height: 15 }} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* pagination */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center', marginTop: 14 }}>
          <button style={sChip(false)} disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>السابق</button>
          <span style={{ fontSize: 13, color: C.sub }}>صفحة {pageNo} / {pages} · إجمالي {total}</span>
          <button style={sChip(false)} disabled={pageNo >= pages} onClick={() => setOffset(offset + PAGE)}>التالي</button>
        </div>
      </div>

      {/* status modal */}
      {statusChanging && (
        <Modal onClose={() => !busy && setStatusChanging(null)}>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px' }}>تغيير حالة النشاط</h2>
          <p style={{ fontSize: 13, color: C.sub, margin: '0 0 14px' }}>«{statusChanging.title}»</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {STATUS_ORDER.map((s) => {
              const isCur = s === statusChanging.status
              return (
                <button key={s} disabled={busy || isCur} onClick={() => setStatusBulk([statusChanging.id], s)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 12, cursor: isCur ? 'default' : 'pointer', border: `2px solid ${isCur ? C.green : C.line}`, background: isCur ? C.green + '0d' : '#fff', opacity: busy ? 0.5 : 1 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 999, background: STATUS_COLOR[s] }} />
                    <b style={{ fontSize: 13 }}>{STATUS_LABEL[s]}</b>
                  </span>
                  {isCur && <span style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>الحالة الحالية</span>}
                </button>
              )
            })}
          </div>
          <button onClick={() => setStatusChanging(null)} disabled={busy} style={{ width: '100%', marginTop: 14, padding: 10, fontSize: 13, color: C.sub, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>إلغاء</button>
        </Modal>
      )}

      {/* 🚫⏸️ stop modal — الرفض والإيقاف كل واحد لازم معاه سبب */}
      {stopping && (() => {
        const isReject = stopping.kind === 'rejected'
        const quick = isReject
          ? ['صور مش واضحة أو مش للمنتج', 'السعر ناقص أو مش صحيح',
             'بيانات التواصل غلط', 'إعلان مكرر', 'محتوى مخالف']
          : ['المنيو اتجمّع في إعلان المطعم', 'الصنف خلص أو الخدمة وقفت مؤقتًا',
             'السعر اتغيّر ومحتاج تحديث', 'الرقم مش موثّق', 'طلب صاحب البيزنس']
        return (
          <Modal onClose={() => !busy && (setStopping(null), setReason(''))}>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px' }}>
              {isReject ? 'سبب الرفض' : 'سبب الإيقاف'}
            </h2>
            <p style={{ fontSize: 13, color: C.sub, margin: '0 0 4px' }}>«{stopping.label}»</p>
            <p style={{ fontSize: 12, color: C.warn, margin: '0 0 12px', lineHeight: 1.7 }}>
              السبب ده بيتسجّل على الإعلان وبيبان لصاحبه. من غيره محدش هيعرف
              بعد شهر ليه الإعلان واقف — ولا حتى إحنا.
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {quick.map((q) => (
                <button key={q} type="button" onClick={() => setReason(q)}
                  style={{ padding: '5px 10px', borderRadius: 999, border: `1px solid ${C.line}`,
                    background: reason === q ? C.green : '#fff', color: reason === q ? '#fff' : C.ink,
                    fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{q}</button>
              ))}
            </div>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="اكتب السبب بالتفصيل…"
              rows={3}
              style={{ width: '100%', padding: 10, borderRadius: 12, border: `1px solid ${C.line}`,
                fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={() => { setStopping(null); setReason('') }} disabled={busy}
                style={{ flex: 1, padding: 12, background: '#f1f1f1', color: C.ink, fontWeight: 700,
                  borderRadius: 12, border: 'none', cursor: 'pointer' }}>إلغاء</button>
              <button
                onClick={() => setStatusBulk(stopping.ids, stopping.kind, undefined, reason.trim())}
                disabled={busy || reason.trim().length < 3}
                style={{ flex: 1, padding: 12,
                  background: reason.trim().length < 3 ? '#eee' : (isReject ? C.danger : C.warn),
                  color: reason.trim().length < 3 ? '#999' : '#fff', fontWeight: 700, borderRadius: 12,
                  border: 'none', cursor: reason.trim().length < 3 ? 'not-allowed' : 'pointer' }}>
                {busy ? 'بنفّذ…' : (isReject ? 'ارفض بالسبب ده' : 'أوقف بالسبب ده')}
              </button>
            </div>
          </Modal>
        )
      })()}

      {/* 👤 مودال صاحب الإعلان */}
      {owner && (
        <Modal onClose={() => !busy && setOwner(null)}>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px' }}>صاحب الإعلان</h2>
          <p style={{ fontSize: 13, color: C.sub, margin: '0 0 4px' }}>«{owner.title}»</p>
          <p style={{ fontSize: 12, color: C.sub, margin: '0 0 14px', lineHeight: 1.7 }}>
            لو الإعلان اتضاف من اللوحة أو من رقم مندوب، اكتب هنا اسم صاحبه
            الحقيقي ورقمه. لو غيّرت الرقم، التوثيق القديم بيتشال — عشان
            مانقولش على رقم لسه ما اتأكدش منه إنه موثّق.
          </p>

          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>الاسم</label>
          <input
            value={owner.name}
            onChange={(e) => setOwner({ ...owner, name: e.target.value })}
            placeholder="اسم صاحب الإعلان"
            style={{ width: '100%', padding: 10, borderRadius: 12, border: `1px solid ${C.line}`,
              fontSize: 13, fontFamily: 'inherit', marginBottom: 12 }}
          />

          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>الموبايل</label>
          <input
            value={owner.phone}
            onChange={(e) => setOwner({ ...owner, phone: e.target.value })}
            placeholder="01xxxxxxxxx"
            inputMode="tel"
            style={{ width: '100%', padding: 10, borderRadius: 12, border: `1px solid ${C.line}`,
              fontSize: 13, fontFamily: 'inherit', direction: 'ltr', textAlign: 'right' }}
          />

          {ownerErr && (
            <p style={{ fontSize: 12, color: C.danger, margin: '10px 0 0', lineHeight: 1.7 }}>{ownerErr}</p>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={() => setOwner(null)} disabled={busy}
              style={{ flex: 1, padding: 12, background: '#f1f1f1', color: C.ink, fontWeight: 700,
                borderRadius: 12, border: 'none', cursor: 'pointer' }}>إلغاء</button>
            <button onClick={saveOwner}
              disabled={busy || (!owner.name.trim() && !owner.phone.trim())}
              style={{ flex: 1, padding: 12,
                background: (!owner.name.trim() && !owner.phone.trim()) ? '#eee' : C.green,
                color: (!owner.name.trim() && !owner.phone.trim()) ? '#999' : '#fff',
                fontWeight: 700, borderRadius: 12, border: 'none',
                cursor: (!owner.name.trim() && !owner.phone.trim()) ? 'not-allowed' : 'pointer' }}>
              {busy ? 'بنحفظ…' : 'احفظ'}
            </button>
          </div>
        </Modal>
      )}

      {/* ➕ (٢٤ أغسطس ٢٦) مودال إضافة إعلان جديد من اللوحة */}
      {adder && (
        <Modal onClose={() => !busy && setAdder(null)}>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px' }}>ضيف إعلان جديد</h2>
          <p style={{ fontSize: 12, color: C.sub, margin: '0 0 14px', lineHeight: 1.7 }}>
            الحد الأدنى بس عشان يفتح في اللوحة. الباقي التاجر يكمّله من صفحته لما يستلمه.
          </p>

          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>العنوان *</label>
          <input value={adder.title} onChange={(e) => setAdder({ ...adder, title: e.target.value })}
            placeholder="مثال: شقة ١٢٠م بالتجمع الخامس"
            style={{ width: '100%', padding: 10, borderRadius: 12, border: `1px solid ${C.line}`, fontSize: 13, fontFamily: 'inherit', marginBottom: 12 }} />

          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>التصنيف *</label>
          <select value={adder.category_id} onChange={(e) => setAdder({ ...adder, category_id: e.target.value })}
            style={{ width: '100%', padding: 10, borderRadius: 12, border: `1px solid ${C.line}`, fontSize: 13, fontFamily: 'inherit', marginBottom: 12 }}>
            {(facets?.categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>المدينة</label>
          <input value={adder.city} onChange={(e) => setAdder({ ...adder, city: e.target.value })} placeholder="القاهرة / الجيزة / …"
            style={{ width: '100%', padding: 10, borderRadius: 12, border: `1px solid ${C.line}`, fontSize: 13, fontFamily: 'inherit', marginBottom: 16 }} />

          {/* 🏷️ معرض ولا فرد — «لو معرض هنتعامل معاه B2B ولو إعلان يكون واضح» */}
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>نوع البائع *</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {([['individual', '👤 فرد — إعلان عادي'], ['business', '🏢 معرض/نشاط — B2B']] as const).map(([v, l]) => (
              <button key={v} type="button"
                onClick={() => setAdder({ ...adder, seller_kind: v })}
                style={{ flex: 1, padding: 10, borderRadius: 12, fontSize: 13, fontWeight: 700,
                  border: `2px solid ${adder.seller_kind === v ? C.green : C.line}`,
                  background: adder.seller_kind === v ? '#E3F4EE' : '#fff',
                  color: adder.seller_kind === v ? C.green : C.ink, cursor: 'pointer' }}>
                {l}
              </button>
            ))}
          </div>

          <div style={{ background: C.chip, borderRadius: 12, padding: 12, marginBottom: 4 }}>
            <p style={{ fontSize: 12, fontWeight: 800, margin: '0 0 8px', color: C.ink }}>👤 صاحب الإعلان</p>
            <p style={{ fontSize: 11, color: C.sub, margin: '0 0 10px', lineHeight: 1.7 }}>
              اكتب اسم صاحبه الحقيقي ورقمه — عشان مايبقاش الإعلان منسوب لرقم المندوب.
            </p>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>الاسم</label>
            <input value={adder.owner_name} onChange={(e) => setAdder({ ...adder, owner_name: e.target.value })} placeholder="اسم صاحب الإعلان"
              style={{ width: '100%', padding: 10, borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 13, fontFamily: 'inherit', marginBottom: 10, background: '#fff' }} />
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>موبايل صاحب الإعلان</label>
            <input value={adder.owner_phone} onChange={(e) => setAdder({ ...adder, owner_phone: e.target.value })} placeholder="01xxxxxxxxx" inputMode="tel"
              style={{ width: '100%', padding: 10, borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 13, fontFamily: 'inherit', direction: 'ltr', textAlign: 'right', background: '#fff' }} />
          </div>

          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, margin: '14px 0 6px' }}>رقم التواصل مع العميل (اختياري)</label>
          <input value={adder.contact_phone} onChange={(e) => setAdder({ ...adder, contact_phone: e.target.value })}
            placeholder="لو مختلف عن موبايل صاحب الإعلان" inputMode="tel"
            style={{ width: '100%', padding: 10, borderRadius: 12, border: `1px solid ${C.line}`, fontSize: 13, fontFamily: 'inherit', direction: 'ltr', textAlign: 'right' }} />
          <p style={{ fontSize: 11, color: C.sub, margin: '6px 0 0 0' }}>سيبه فاضي = هيتحط رقم صاحب الإعلان.</p>

          {/* 📸 الصور — لازم واحدة على الأقل عشان الإعلان يتنشر */}
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, margin: '18px 0 6px' }}>
            📸 صور الإعلان
            {adder.photos.length > 0 && (
              <span style={{ color: C.green, marginInlineStart: 6 }}>· اختار {adder.photos.length}</span>
            )}
          </label>
          <input
            type="file" accept="image/*" multiple
            onChange={(e) => setAdder({ ...adder, photos: Array.from(e.target.files || []) })}
            style={{ width: '100%', padding: 10, borderRadius: 12, border: `1px dashed ${C.line}`, fontSize: 13, fontFamily: 'inherit', background: '#fff' }}
          />
          <p style={{ fontSize: 11, color: C.sub, margin: '6px 0 0', lineHeight: 1.7 }}>
            أول صورة بتبقى صورة الغلاف. النشر بيتوقف من غير صور — الإعلان بيتحفظ كـdraft.
          </p>

          {/* 📢 النشر */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={adder.publish}
              onChange={(e) => setAdder({ ...adder, publish: e.target.checked })}
              style={{ width: 18, height: 18, cursor: 'pointer' }} />
            <span style={{ fontSize: 13, fontWeight: 700 }}>انشر فورًا بعد الرفع</span>
          </label>

          {adderProgress && (
            <p style={{ fontSize: 12, color: C.green2, margin: '10px 0 0', lineHeight: 1.7 }}>{adderProgress}</p>
          )}
          {adderErr && <p style={{ fontSize: 12, color: C.danger, margin: '10px 0 0', lineHeight: 1.7 }}>{adderErr}</p>}

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={() => setAdder(null)} disabled={busy}
              style={{ flex: 1, padding: 12, background: '#f1f1f1', color: C.ink, fontWeight: 700, borderRadius: 12, border: 'none', cursor: 'pointer' }}>إلغاء</button>
            <button onClick={saveNewListing} disabled={busy || !adder.title.trim() || !adder.category_id}
              style={{ flex: 1, padding: 12,
                background: (!adder.title.trim() || !adder.category_id) ? '#eee' : C.green,
                color: (!adder.title.trim() || !adder.category_id) ? '#999' : '#fff',
                fontWeight: 700, borderRadius: 12, border: 'none',
                cursor: (!adder.title.trim() || !adder.category_id) ? 'not-allowed' : 'pointer' }}>
              {busy ? (adderProgress || 'بنضيف…') : (adder.publish ? '➕ ضيف وانشر' : '➕ ضيف كـdraft')}
            </button>
          </div>
        </Modal>
      )}

      {/* delete modal */}
      {deleting && (
        <Modal onClose={() => !busy && setDeleting(null)}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', background: '#fdecea' }}>
              <Trash2 style={{ width: 26, height: 26, color: C.danger }} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 6px' }}>حذف النشاط</h2>
            <p style={{ fontSize: 13, color: C.sub, margin: '0 0 8px' }}>«{deleting.title}»</p>
            <div style={{ background: '#fff7e6', border: '1px solid #f3e0b3', borderRadius: 12, padding: 12, textAlign: 'right' }}>
              <p style={{ fontSize: 12, color: C.warn, margin: 0, lineHeight: 1.7 }}>
                لو النشاط عليه حجوزات هيتأرشف بس (مش هيتحذف نهائيًا للحفاظ على التاريخ). غير كده هيتحذف نهائيًا.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setDeleting(null)} disabled={busy} style={{ flex: 1, padding: 12, background: '#f1f1f1', color: C.ink, fontWeight: 700, borderRadius: 12, border: 'none', cursor: 'pointer', opacity: busy ? 0.5 : 1 }}>إلغاء</button>
            <button onClick={handleDelete} disabled={busy} style={{ flex: 1, padding: 12, background: C.danger, color: '#fff', fontWeight: 700, borderRadius: 12, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: busy ? 0.5 : 1 }}>
              {busy ? <Loader2 className="animate-spin" style={{ width: 16, height: 16 }} /> : <Archive style={{ width: 16, height: 16 }} />}
              {busy ? 'بنفّذ…' : 'احذف / أرشف'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, pointerEvents: 'none' }}>
        <div dir="rtl" style={{ background: '#fff', borderRadius: 24, padding: 24, maxWidth: 420, width: '100%', pointerEvents: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
          {children}
        </div>
      </div>
    </>
  )
}
