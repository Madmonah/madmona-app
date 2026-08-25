'use client'

/* ============================================================================
   /admin/drafts — كل إعلان واقف: مسودة · موقوف · مرفوض — وليه واقف
   ============================================================================
   🎯 محمد:
     (٢١ أغسطس) «عندك ٢٢ إعلان درافت بياناتهم كاملة مش عارف منزلوش ليه؟»
     (٢١ أغسطس) «الإعلانات اللي في المسودة عايز أعرف مشكلتها إيه،
                 والإعلانات الموقوفة برضو عايز أعرف اتوقفت ليه»

   الشاشة بترد على السؤالين بتلات حاجات جنب كل إعلان:

     ١) **السبب المسجّل** — لو حد أوقفه أو رفضه وكتب سبب.
     ٢) **ناقصه إيه دلوقتي** — حقيقة محسوبة من الداتا (صور حقيقية / سعر /
        تصنيف). لو الليستة فاضية يبقى الإعلان **مالوش عيب ظاهر**،
        والوقفة كانت قرار مش نقص بيانات — وده فرق مهم.
     ٣) **الوقفة الجماعية** — «اتوقف مع ١٢٤ إعلان في نفس الدقيقة». ده اللي
        كشف إن ١٢٥ إعلان اتوقفوا مرة واحدة يوم ١٨/٠٨ ١٢:٤١ص، كلهم أصناف
        منيو لـ١١ مطعم، وكل مطعم فضل ليه إعلان واحد منشور.

   ⚠️ «صور حقيقية» ≠ «صور». إعلان ممكن يكون عنده صورة وهي صورة تصنيف عامة
      من `/ads/categories/` — دي مش صورة المنتج، فالعدّاد بيستبعدها.

   🔐 محميّة بـ`is_madmona_staff() OR is_admin_or_service()` — الأدمن
      وموظفين مضمونة. بننادي بجلسة الأبليكيشن الأول وبنرجع لبوابة
      /api/admin/rpc لو اللوحة مفتوحة بكوكي الأدمن.
   ============================================================================ */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { adminRpc } from '@/lib/adminRpc'
import { fmtDateTime, sinceLabel } from '@/lib/arDateTime'
import {
  ArrowRight, Loader2, ShieldAlert, Eye, Edit2, ImageOff, Tag,
  CircleDollarSign, CheckCircle2, Clock, RefreshCw, AlertTriangle, Layers,
  UploadCloud,
} from 'lucide-react'

const C = {
  bg: '#FAFAF7', card: '#ffffff', ink: '#16241f', sub: '#5b6b64',
  green: '#059669', green2: '#2FA084', line: '#e7e9e5',
  danger: '#b3261e', warn: '#9a6b00', gold: '#d4a017',
}

type Kind = 'draft' | 'paused' | 'rejected'

type Row = {
  id: string; title: string; slug: string
  business: string | null; supplier_id: string
  category: string | null; city: string | null
  status: Kind
  created_at: string; stopped_at: string | null; days_stuck: number
  reason: string | null; batch_size: number
  source: string; photo: string | null
  photos_real: number; photos_all: number
  price: number | null; price_on_request: boolean
  missing: string[]
}

const TABS: { key: Kind; label: string; hint: string }[] = [
  { key: 'draft',    label: 'مسودة',  hint: 'اتعملت ومانزلتش — مفيش حاجة بتنشرها لوحدها' },
  { key: 'paused',   label: 'موقوف',  hint: 'كانت منشورة واتوقفت' },
  { key: 'rejected', label: 'مرفوض',  hint: 'اترفضت — والسبب مكتوب' },
]

const MISSING_ICON: Record<string, React.ReactNode> = {
  'صور حقيقية': <ImageOff style={{ width: 13, height: 13 }} />,
  'سعر': <CircleDollarSign style={{ width: 13, height: 13 }} />,
  'تصنيف': <Tag style={{ width: 13, height: 13 }} />,
}

async function callRpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  try {
    const { data: { session } } = await supabaseBrowser.auth.getSession()
    if (session?.user) {
      const { data, error } = await (supabaseBrowser.rpc as unknown as (
        f: string, a: Record<string, unknown>,
      ) => Promise<{ data: T | null; error: { message: string } | null }>)(fn, args)
      if (!error && data != null) {
        const o = data as unknown as { ok?: boolean; error?: string }
        if (o?.ok !== false || o?.error !== 'forbidden') return data
      }
    }
  } catch { /* بنكمل على البوابة */ }
  return await adminRpc<T>(fn, args)
}

export default function AdminStalledPage() {
  const [tab, setTab] = useState<Kind>('draft')
  const [rows, setRows] = useState<Row[]>([])
  const [counts, setCounts] = useState<Record<Kind, number>>({ draft: 0, paused: 0, rejected: 0 })
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [flash, setFlash] = useState<{ id: string; msg: string; ok: boolean } | null>(null)
  const [onlyBlocked, setOnlyBlocked] = useState(false)

  const load = useCallback(async (k: Kind) => {
    setLoading(true); setErr(null)
    try {
      const res = await callRpc<{ ok: boolean; error?: string; rows: Row[] }>(
        'admin_stalled_listings', { p_status: k },
      )
      if (!res?.ok) { setErr(res?.error === 'forbidden' ? 'forbidden' : (res?.error || 'مقدرناش نحمّل')); setRows([]) }
      else {
        setRows(res.rows || [])
        setCounts(c => ({ ...c, [k]: (res.rows || []).length }))
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'مقدرناش نحمّل'); setRows([])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load(tab) }, [tab, load])

  // العدّادات للتابات التانية — نداء واحد لكل واحد أول ما الصفحة تفتح
  useEffect(() => {
    ;(async () => {
      for (const t of TABS) {
        if (t.key === tab) continue
        try {
          const r = await callRpc<{ ok: boolean; rows: Row[] }>('admin_stalled_listings', { p_status: t.key })
          if (r?.ok) setCounts(c => ({ ...c, [t.key]: (r.rows || []).length }))
        } catch { /* العدّاد مش حرج */ }
      }
    })()
    // مرة واحدة بس
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function publish(d: Row) {
    setBusyId(d.id); setFlash(null)
    try {
      const res = await callRpc<{ ok: boolean; error?: string }>(
        'admin_publish_listing', { p_listing_id: d.id },
      )
      if (res?.ok) {
        setFlash({ id: d.id, msg: 'اتنشر ✅', ok: true })
        setRows(prev => prev.filter(r => r.id !== d.id))
        setCounts(c => ({ ...c, [tab]: Math.max(0, c[tab] - 1) }))
      } else setFlash({ id: d.id, msg: res?.error || 'مقدرناش ننشره', ok: false })
    } catch (e) {
      setFlash({ id: d.id, msg: e instanceof Error ? e.message : 'خطأ', ok: false })
    }
    setBusyId(null)
  }

  // 📸 (٢٥/٨/٢٠٢٦ — محمد: «لحد دلوقتي هيا مش عارفة تعدل الاعلان وتضيف صور»)
  //    رفع صور مباشر من الشاشة دي — بيعدي على /api/admin/listing-photo
  //    (كوكي اللوحة + service key على السيرفر): مفيش أي اعتماد على جلسة
  //    Supabase في المتصفح، فمستحيل يقع بمشاكل الجلسات اللي كانت بتضرب
  //    الرفع من فورم التعديل.
  async function uploadPhotos(d: Row, files: FileList | null) {
    if (!files || files.length === 0) return
    setBusyId(d.id); setFlash({ id: d.id, msg: `بيرفع ${files.length} صورة…`, ok: true })
    try {
      let done = 0
      for (let i = 0; i < files.length; i++) {
        const fd = new FormData()
        fd.append('listing_id', d.id)
        fd.append('file', files[i])
        fd.append('display_order', String(d.photos_all + i))
        fd.append('is_primary', String(d.photos_all === 0 && i === 0))
        const r = await fetch('/api/admin/listing-photo', { method: 'POST', body: fd })
        const j = await r.json().catch(() => null)
        if (!r.ok || j?.ok === false) {
          throw new Error(`صورة ${i + 1}: ${j?.error || `HTTP ${r.status}`}`)
        }
        done++
        setFlash({ id: d.id, msg: `اترفعت ${done}/${files.length}…`, ok: true })
      }
      setFlash({ id: d.id, msg: `اترفعت ${done} صورة ✅ — دوس نشر لو خلصت`, ok: true })
      await load(tab)
    } catch (e) {
      setFlash({ id: d.id, msg: e instanceof Error ? e.message : 'فشل الرفع', ok: false })
    }
    setBusyId(null)
  }

  const shown = onlyBlocked ? rows.filter(r => r.missing.length > 0) : rows
  const ready = rows.filter(r => r.missing.length === 0)
  const needPhotos = rows.filter(r => r.missing.includes('صور حقيقية')).length
  const needPrice = rows.filter(r => r.missing.includes('سعر')).length

  // 🧨 الوقفات الجماعية — أكبر ٣ دقايق اتوقف فيها إعلانات كتير مرة واحدة
  const batches = Object.values(
    rows.reduce((acc: Record<string, { at: string; n: number; reason: string | null }>, r) => {
      if (r.batch_size < 3 || !r.stopped_at) return acc
      const k = r.stopped_at.slice(0, 16)
      acc[k] = acc[k] || { at: r.stopped_at, n: 0, reason: r.reason }
      acc[k].n += 1
      return acc
    }, {}),
  ).sort((a, b) => b.n - a.n).slice(0, 3)

  const chip = (active: boolean): React.CSSProperties => ({
    padding: '7px 16px', borderRadius: 999, cursor: 'pointer',
    border: `1px solid ${active ? C.green : C.line}`,
    background: active ? C.green : C.card, color: active ? '#fff' : C.ink,
    fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
  })

  if (err === 'forbidden' || err?.includes('بوابة الأدمن')) {
    return (
      <div dir="rtl" style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: '#fff', borderRadius: 24, padding: 32, textAlign: 'center', maxWidth: 380 }}>
          <ShieldAlert style={{ width: 32, height: 32, color: C.danger, margin: '0 auto 12px' }} />
          <h1 style={{ fontWeight: 800, margin: '0 0 8px' }}>الشاشة دي لفريق مضمونة</h1>
          <p style={{ fontSize: 13, color: C.sub, margin: '0 0 16px' }}>سجّل دخولك بحسابك في مضمونة وجرّب تاني.</p>
          <Link href="/auth/login?redirect=/admin/drafts" style={{ display: 'block', background: C.green, color: '#fff', padding: 12, borderRadius: 12, fontWeight: 700, textDecoration: 'none' }}>دخول</Link>
        </div>
      </div>
    )
  }

  const activeTab = TABS.find(t => t.key === tab)!

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: C.bg, color: C.ink, fontFamily: 'Cairo, Inter, system-ui, sans-serif' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/admin/listings" style={{ width: 36, height: 36, borderRadius: 999, background: '#fff', border: `1px solid ${C.line}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowRight style={{ width: 16, height: 16, color: C.sub }} />
          </Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>الإعلانات الواقفة</h1>
            <p style={{ fontSize: 12, color: C.sub, margin: '2px 0 0' }}>كل إعلان مش شغّال — وليه</p>
          </div>
          <button onClick={() => load(tab)} disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: `1px solid ${C.line}`, color: C.ink, padding: '8px 14px', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <RefreshCw style={{ width: 15, height: 15 }} className={loading ? 'animate-spin' : ''} /> تحديث
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t.key} style={chip(tab === t.key)} onClick={() => setTab(t.key)}>
              {t.label} ({counts[t.key]})
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: C.sub, margin: '0 0 14px' }}>{activeTab.hint}</p>

        {/* 🧭 السبب الجذري لكل تاب — مكتوب صريح عشان السؤال مايتكررش */}
        {tab === 'draft' && (
          <Note>
            الدرافتس واقفة مش عشان فيها غلط — عشان <b>مفيش حاجة بتنشرها لوحدها</b>.
            النشر الأوتوماتيك بيشتغل على إعلانات البورصة بس؛ أي إعلان جاي من وكيل
            أو استيراد أو إدخال يدوي محتاج حد ينشره من هنا.
          </Note>
        )}
        {tab === 'paused' && (
          <Note>
            <b>١٩٣ إعلان موقوف — وولا واحد كان عليه سبب مكتوب</b>، لأن الجدول مكانش
            فيه خانة سبب أصلًا. اتضافت النهاردة، والإيقاف بقى <b>لازم معاه سبب</b>.
            والسطر «اتوقف مع … في نفس الدقيقة» تحت هو اللي بيكشف الوقفات الجماعية.
          </Note>
        )}

        {/* 🧨 الوقفات الجماعية */}
        {tab !== 'draft' && batches.length > 0 && (
          <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 14, marginBottom: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: C.ink, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Layers style={{ width: 14, height: 14, color: C.warn }} /> وقفات جماعية
            </p>
            {batches.map((b, i) => (
              <div key={i} style={{ fontSize: 12, color: C.sub, padding: '5px 0', borderTop: i ? `1px solid ${C.line}` : 'none' }}>
                <b style={{ color: C.ink }}>{b.n} إعلان</b> اتوقفوا مرة واحدة · {fmtDateTime(b.at)}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 14 }}>
          <Stat n={rows.length} l="إجمالي" color={C.ink} />
          <Stat n={ready.length} l="مالوش عيب ظاهر" color={C.green} />
          <Stat n={needPhotos} l="ناقصه صور حقيقية" color={C.danger} />
          <Stat n={needPrice} l="ناقصه سعر" color={C.warn} />
        </div>

        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700, marginBottom: 14, cursor: 'pointer' }}>
          <input type="checkbox" checked={onlyBlocked} onChange={e => setOnlyBlocked(e.target.checked)} />
          ورّيني اللي ناقصه حاجة بس
        </label>

        {err && err !== 'forbidden' && (
          <div style={{ background: '#fdecea', color: C.danger, padding: 12, borderRadius: 12, marginBottom: 12, fontSize: 13 }}>خطأ: {err}</div>
        )}

        {loading && rows.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Loader2 className="animate-spin" style={{ width: 26, height: 26, color: C.green }} />
          </div>
        )}

        {!loading && shown.length === 0 && (
          <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: 40, textAlign: 'center' }}>
            <CheckCircle2 style={{ width: 34, height: 34, color: C.green, margin: '0 auto 10px' }} />
            <p style={{ fontWeight: 800, margin: 0 }}>مفيش حاجة هنا</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {shown.map(d => {
            const clean = d.missing.length === 0
            const canPublish = clean && d.status !== 'rejected'
            const f = flash?.id === d.id ? flash : null
            return (
              <article key={d.id} style={{ background: C.card, border: `1px solid ${canPublish ? C.green + '55' : C.line}`, borderRadius: 18, padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ width: 74, height: 74, borderRadius: 14, overflow: 'hidden', background: '#f1f5f3', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {d.photo
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={d.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <ImageOff style={{ width: 20, height: 20, color: '#b9c4bf' }} />}
                </div>

                <div style={{ flex: 1, minWidth: 210 }}>
                  <h3 style={{ fontSize: 14.5, fontWeight: 800, margin: '0 0 4px', lineHeight: 1.5 }}>{d.title}</h3>
                  <p style={{ fontSize: 12, color: C.sub, margin: '0 0 6px' }}>
                    {d.business || '—'}
                    {d.category ? ` · ${d.category}` : ''}
                    {d.city ? ` · ${d.city}` : ''}
                    {' · '}{d.price != null ? `${Number(d.price).toLocaleString('ar-EG')} ج` : d.price_on_request ? 'السعر عند الطلب' : 'من غير سعر'}
                    {' · '}{d.photos_real} صورة حقيقية{d.photos_all > d.photos_real ? ` (من ${d.photos_all})` : ''}
                  </p>

                  <p style={{ fontSize: 11.5, color: C.sub, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Clock style={{ width: 12, height: 12 }} />
                    <span>اتعمل: <b style={{ color: C.ink }}>{fmtDateTime(d.created_at)}</b> ({sinceLabel(d.created_at)})</span>
                    {d.status !== 'draft' && d.stopped_at && (
                      <span style={{ opacity: 0.85 }}>
                        · {d.status === 'paused' ? 'اتوقف' : 'اترفض'}: {fmtDateTime(d.stopped_at)}
                      </span>
                    )}
                    <span style={{ opacity: 0.85 }}>· المصدر: {d.source}</span>
                  </p>

                  {/* 🧨 دليل الوقفة الجماعية على الإعلان نفسه */}
                  {d.status !== 'draft' && d.batch_size > 2 && (
                    <p style={{ fontSize: 11.5, color: C.warn, margin: '0 0 8px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Layers style={{ width: 12, height: 12 }} />
                      اتوقف مع {d.batch_size - 1} إعلان تاني في نفس الدقيقة — وقفة جماعية
                    </p>
                  )}

                  {/* السبب المسجّل */}
                  {d.reason && (
                    <div style={{ background: d.status === 'rejected' ? '#fdecea' : '#fff8e6',
                      border: `1px solid ${d.status === 'rejected' ? '#f5c6c0' : '#f0e0b8'}`,
                      borderRadius: 12, padding: '8px 11px', marginBottom: 8 }}>
                      <p style={{ fontSize: 10.5, fontWeight: 800, margin: '0 0 3px',
                        color: d.status === 'rejected' ? C.danger : C.warn }}>
                        {d.status === 'rejected' ? 'سبب الرفض' : 'سبب الإيقاف'}
                      </p>
                      <p style={{ fontSize: 12, margin: 0, lineHeight: 1.8,
                        color: d.status === 'rejected' ? '#7a1a15' : '#6b4a00' }}>{d.reason}</p>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {clean ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: C.green + '18', color: C.green }}>
                        <CheckCircle2 style={{ width: 13, height: 13 }} />
                        {d.status === 'draft' ? 'مفيش ناقص — جاهز ينزل' : 'مالوش عيب ظاهر — الوقفة كانت قرار'}
                      </span>
                    ) : d.missing.map(m => (
                      <span key={m} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: '#fdecea', color: C.danger }}>
                        {MISSING_ICON[m]} ناقص {m}
                      </span>
                    ))}
                  </div>

                  {f && <p style={{ fontSize: 12, fontWeight: 700, margin: '8px 0 0', color: f.ok ? C.green : C.danger }}>{f.msg}</p>}
                </div>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <a href={`/marketplace/${d.slug}`} target="_blank" rel="noreferrer" title="معاينة"
                    style={{ width: 34, height: 34, borderRadius: 10, background: '#f1f5f3', color: C.sub, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Eye style={{ width: 15, height: 15 }} />
                  </a>
                  <Link href={`/supplier/marketplace/${d.id}/edit`} title="تعديل"
                    style={{ width: 34, height: 34, borderRadius: 10, background: C.green + '1a', color: C.green, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Edit2 style={{ width: 15, height: 15 }} />
                  </Link>
                  {/* 📸 (٢٥/٨) رفع صور مباشر من هنا — عبر API اللوحة، من غير
                      أي اعتماد على جلسة المتصفح (شوف uploadPhotos فوق) */}
                  <label title="ارفع صور"
                    style={{ width: 34, height: 34, borderRadius: 10, background: '#fff7e0', color: C.warn, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: busyId === d.id ? 'wait' : 'pointer' }}>
                    <UploadCloud style={{ width: 15, height: 15 }} />
                    <input type="file" accept="image/*" multiple style={{ display: 'none' }}
                      disabled={busyId === d.id}
                      onChange={(e) => { void uploadPhotos(d, e.target.files); e.target.value = '' }} />
                  </label>
                  <button
                    onClick={() => publish(d)}
                    disabled={!canPublish || busyId === d.id}
                    title={d.status === 'rejected'
                      ? 'المرفوض بيترجع من شاشة إدارة المنتجات'
                      : canPublish ? 'انشر الإعلان' : `ناقصه: ${d.missing.join(' · ')}`}
                    style={{
                      padding: '8px 16px', borderRadius: 12, border: 'none', fontSize: 13, fontWeight: 800,
                      cursor: canPublish ? 'pointer' : 'not-allowed',
                      background: canPublish ? C.green : '#eef0ee',
                      color: canPublish ? '#fff' : '#9aa7a1',
                      opacity: busyId === d.id ? 0.6 : 1,
                    }}>
                    {busyId === d.id ? '…بنشر' : d.status === 'paused' ? 'رجّعه' : 'انشر'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff8e6', border: '1px solid #f0e0b8', borderRadius: 16, padding: '12px 14px', marginBottom: 14, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <AlertTriangle style={{ width: 17, height: 17, color: C.warn, flexShrink: 0, marginTop: 2 }} />
      <p style={{ fontSize: 12.5, color: C.warn, margin: 0, lineHeight: 1.8 }}>{children}</p>
    </div>
  )
}

function Stat({ n, l, color }: { n: number; l: string; color: string }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: '12px 14px' }}>
      <div style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1 }}>{n}</div>
      <div style={{ fontSize: 11.5, color: C.sub, marginTop: 5, fontWeight: 700 }}>{l}</div>
    </div>
  )
}
