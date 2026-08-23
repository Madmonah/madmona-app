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
import { adminRpc } from '@/lib/adminRpc'
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
  category: string | null; city: string | null; district: string | null
  phone: string | null; phone_verified: boolean; unclaimed: boolean
  created_at: string; published_at: string | null
  rejection_reason: string | null; rejected_at: string | null
  pause_reason: string | null; paused_at: string | null
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

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setOffset(0) }, 350)
    return () => clearTimeout(t)
  }, [search])
  useEffect(() => { setOffset(0) }, [tier, status, category, city, hasPhone, claimed])

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
        p_has_phone: hasPhone, p_claimed: claimed,
        p_search: debounced || null, p_limit: PAGE, p_offset: offset,
      })
      setRows((data?.rows || []) as Row[])
      setTotal(data?.total || 0)
      setSel({})
    } catch (e: any) {
      setErr(e?.message || 'مقدرناش نحمّل الليستنجات'); setRows([]); setTotal(0)
    }
    setLoading(false)
  }, [tier, status, category, city, hasPhone, claimed, debounced, offset])

  useEffect(() => { if (stage === 'ready') { loadFacets() } }, [stage, loadFacets])
  useEffect(() => { if (stage === 'ready') { load() } }, [stage, load])

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
          <Link href="/supplier/marketplace/new" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.green, color: '#fff', padding: '8px 14px', borderRadius: 12, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            <Plus style={{ width: 16, height: 16 }} /> أضف خدمة
          </Link>
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

        {/* filters */}
        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: 14, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: C.sub, marginInlineEnd: 4 }}>النوع:</span>
            {[['all', 'الكل'], ['real', 'حقيقي'], ['directory', 'دليل']].map(([v, l]) => (
              <button key={v} style={sChip(tier === v)} onClick={() => setTier(v)}>{l}</button>
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
