'use client'

/* ============================================================================
   /admin/drafts — الإعلانات الواقفة، وناقصها إيه بالظبط
   ============================================================================
   🎯 (٢١ أغسطس ٢٠٢٦) محمد: «عندك ٢٢ إعلان درافت بياناتهم كاملة مش عارف
      منزلوش ليه؟»

   السبب الجذري اللي طلع من التحقيق:
     الإعلانات الدرافت **مالهاش ناشر**. الشغلانة الوحيدة اللي بتنشر
     أوتوماتيك بتشتغل على إعلانات البورصة بس (`directory_source='bourse-sync'`).
     أي إعلان جاي من وكيل أو استيراد أو إدخال يدوي بيقعد درافت **للأبد** —
     مش عشان فيه مشكلة، لكن عشان **محدش كان عارف إنه موجود**.
     أقدم واحد فيهم قاعد من ٧٧ يوم.

   الشاشة دي بتحل ده بحاجتين:
     ١) بتخلّيهم ظاهرين — قايمة واحدة، مفيش دفن.
     ٢) بتقول لكل واحد **الناقص إيه** (صور حقيقية / سعر / تصنيف) بدل ما
        تفتحه وتدوّر. واللي مش ناقصه حاجة → زرار «انشر» على طول.

   ⚠️ «صور حقيقية» ≠ «صور». إعلان ممكن يكون عنده صورة وهي صورة تصنيف عامة
      من `/ads/categories/` — دي مش صورة المنتج، فالعدّاد بيستبعدها.
      ده اللي بيخلّي إعلان مكتوب جنبه «١ صورة» ولسه ناقصه صور.

   🔐 الدالتين محميّين بـ`is_madmona_staff() OR is_admin_or_service()` —
      يعني أدمن المنصة **وموظفين مضمونة** يقدروا يفتحوها (محمد: «الأدمن
      وموظفين مضمونة يعدّلوا أي إعلان — دول أدمن»).
      وعشان اللوحة ممكن تتفتح بجلسة الأبليكيشن أو بكوكي الأدمن، بننادي
      بالجلسة الأول وبنرجع لبوابة /api/admin/rpc لو مفيش جلسة.
   ============================================================================ */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { adminRpc } from '@/lib/adminRpc'
import { fmtDateTime, sinceLabel } from '@/lib/arDateTime'
import {
  ArrowRight, Loader2, ShieldAlert, Eye, Edit2, ImageOff, Tag,
  CircleDollarSign, CheckCircle2, Clock, RefreshCw, AlertTriangle,
} from 'lucide-react'

const C = {
  bg: '#FAFAF7', card: '#ffffff', ink: '#16241f', sub: '#5b6b64',
  green: '#059669', green2: '#2FA084', line: '#e7e9e5',
  danger: '#b3261e', warn: '#9a6b00', gold: '#d4a017',
}

type Draft = {
  id: string; title: string; slug: string
  business: string | null; supplier_id: string
  category: string | null; city: string | null
  created_at: string; updated_at: string | null; days_stuck: number
  source: string; photo: string | null
  photos_real: number; photos_all: number
  price: number | null; price_on_request: boolean
  missing: string[]
}

const MISSING_ICON: Record<string, React.ReactNode> = {
  'صور حقيقية': <ImageOff style={{ width: 13, height: 13 }} />,
  'سعر': <CircleDollarSign style={{ width: 13, height: 13 }} />,
  'تصنيف': <Tag style={{ width: 13, height: 13 }} />,
}

/* بننادي بجلسة الأبليكيشن الأول (ده اللي بيخلّي موظفين مضمونة يشتغلوا)،
   ولو مفيش جلسة بنرجع لبوابة الأدمن بالكوكي. */
async function callRpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  try {
    const { data: { session } } = await supabaseBrowser.auth.getSession()
    if (session?.user) {
      const { data, error } = await (supabaseBrowser.rpc as unknown as (
        f: string, a: Record<string, unknown>,
      ) => Promise<{ data: T | null; error: { message: string } | null }>)(fn, args)
      if (!error && data != null) {
        const asObj = data as unknown as { ok?: boolean; error?: string }
        if (asObj?.ok !== false || asObj?.error !== 'forbidden') return data
      }
    }
  } catch {
    /* بنكمل على البوابة */
  }
  return await adminRpc<T>(fn, args)
}

export default function AdminDraftsPage() {
  const [rows, setRows] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [flash, setFlash] = useState<{ id: string; msg: string; ok: boolean } | null>(null)
  const [filter, setFilter] = useState<'all' | 'ready' | 'blocked'>('all')

  const load = useCallback(async () => {
    setLoading(true); setErr(null)
    try {
      const res = await callRpc<{ ok: boolean; error?: string; rows: Draft[] }>('admin_draft_listings')
      if (!res?.ok) { setErr(res?.error === 'forbidden' ? 'forbidden' : (res?.error || 'مقدرناش نحمّل الدرافتس')); setRows([]) }
      else setRows(res.rows || [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'مقدرناش نحمّل الدرافتس'); setRows([])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function publish(d: Draft) {
    setBusyId(d.id); setFlash(null)
    try {
      const res = await callRpc<{ ok: boolean; error?: string; title?: string }>(
        'admin_publish_listing', { p_listing_id: d.id },
      )
      if (res?.ok) {
        setFlash({ id: d.id, msg: 'اتنشر ✅', ok: true })
        setRows(prev => prev.filter(r => r.id !== d.id))
      } else {
        setFlash({ id: d.id, msg: res?.error || 'مقدرناش ننشره', ok: false })
      }
    } catch (e) {
      setFlash({ id: d.id, msg: e instanceof Error ? e.message : 'خطأ', ok: false })
    }
    setBusyId(null)
  }

  const ready = rows.filter(r => r.missing.length === 0)
  const blocked = rows.filter(r => r.missing.length > 0)
  const shown = filter === 'ready' ? ready : filter === 'blocked' ? blocked : rows

  const needPhotos = rows.filter(r => r.missing.includes('صور حقيقية')).length
  const needPrice = rows.filter(r => r.missing.includes('سعر')).length
  const oldest = rows.reduce((a, r) => Math.max(a, r.days_stuck), 0)

  const chip = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px', borderRadius: 999, cursor: 'pointer',
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

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: C.bg, color: C.ink, fontFamily: 'Cairo, Inter, system-ui, sans-serif' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/admin/listings" style={{ width: 36, height: 36, borderRadius: 999, background: '#fff', border: `1px solid ${C.line}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowRight style={{ width: 16, height: 16, color: C.sub }} />
          </Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>الإعلانات الواقفة</h1>
            <p style={{ fontSize: 12, color: C.sub, margin: '2px 0 0' }}>إعلانات اتعملت ومانزلتش — وكل واحد ناقصه إيه</p>
          </div>
          <button onClick={load} disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: `1px solid ${C.line}`, color: C.ink, padding: '8px 14px', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <RefreshCw style={{ width: 15, height: 15 }} className={loading ? 'animate-spin' : ''} /> تحديث
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }}>
        {/* 🧭 السبب — مكتوب صريح عشان السؤال مايتكررش */}
        <div style={{ background: '#fff8e6', border: '1px solid #f0e0b8', borderRadius: 16, padding: '12px 14px', marginBottom: 14, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <AlertTriangle style={{ width: 17, height: 17, color: C.warn, flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 12.5, color: C.warn, margin: 0, lineHeight: 1.8 }}>
            الإعلانات دي واقفة مش عشان فيها غلط — عشان <b>مفيش حاجة بتنشرها لوحدها</b>.
            النشر الأوتوماتيك بيشتغل على إعلانات البورصة بس. أي إعلان جاي من وكيل أو
            استيراد أو إدخال يدوي محتاج حد ينشره من هنا.
          </p>
        </div>

        {/* أرقام سريعة */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 14 }}>
          <Stat n={rows.length} l="إعلان واقف" color={C.ink} />
          <Stat n={ready.length} l="جاهز للنشر دلوقتي" color={C.green} />
          <Stat n={needPhotos} l="ناقصه صور حقيقية" color={C.danger} />
          <Stat n={needPrice} l="ناقصه سعر" color={C.warn} />
          <Stat n={oldest} l="أقدم واحد (يوم)" color={C.gold} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <button style={chip(filter === 'all')} onClick={() => setFilter('all')}>الكل ({rows.length})</button>
          <button style={chip(filter === 'ready')} onClick={() => setFilter('ready')}>جاهز ينزل ({ready.length})</button>
          <button style={chip(filter === 'blocked')} onClick={() => setFilter('blocked')}>ناقص حاجة ({blocked.length})</button>
        </div>

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
            <p style={{ fontWeight: 800, margin: 0 }}>مفيش إعلانات واقفة هنا</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {shown.map(d => {
            const canPublish = d.missing.length === 0
            const f = flash?.id === d.id ? flash : null
            return (
              <article key={d.id} style={{ background: C.card, border: `1px solid ${canPublish ? C.green + '55' : C.line}`, borderRadius: 18, padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {/* صورة */}
                <div style={{ width: 74, height: 74, borderRadius: 14, overflow: 'hidden', background: '#f1f5f3', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {d.photo
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={d.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <ImageOff style={{ width: 20, height: 20, color: '#b9c4bf' }} />}
                </div>

                <div style={{ flex: 1, minWidth: 200 }}>
                  <h3 style={{ fontSize: 14.5, fontWeight: 800, margin: '0 0 4px', lineHeight: 1.5 }}>{d.title}</h3>
                  <p style={{ fontSize: 12, color: C.sub, margin: '0 0 6px' }}>
                    {d.business || '—'}
                    {d.category ? ` · ${d.category}` : ''}
                    {d.city ? ` · ${d.city}` : ''}
                    {' · '}{d.price != null ? `${Number(d.price).toLocaleString('ar-EG')} ج` : d.price_on_request ? 'السعر عند الطلب' : 'من غير سعر'}
                    {' · '}{d.photos_real} صورة حقيقية{d.photos_all > d.photos_real ? ` (من ${d.photos_all})` : ''}
                  </p>

                  {/* 🕒 محمد: «عايز وقت وتاريخ كل إعلان» */}
                  <p style={{ fontSize: 11.5, color: C.sub, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Clock style={{ width: 12, height: 12 }} />
                    <span>اتعمل: <b style={{ color: C.ink }}>{fmtDateTime(d.created_at)}</b> ({sinceLabel(d.created_at)})</span>
                    {d.updated_at && d.updated_at !== d.created_at && (
                      <span style={{ opacity: 0.85 }}>· آخر تعديل: {fmtDateTime(d.updated_at)}</span>
                    )}
                    <span style={{ opacity: 0.85 }}>· المصدر: {d.source}</span>
                  </p>

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {canPublish ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: C.green + '18', color: C.green }}>
                        <CheckCircle2 style={{ width: 13, height: 13 }} /> مفيش ناقص — جاهز ينزل
                      </span>
                    ) : d.missing.map(m => (
                      <span key={m} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: '#fdecea', color: C.danger }}>
                        {MISSING_ICON[m]} ناقص {m}
                      </span>
                    ))}
                  </div>

                  {f && (
                    <p style={{ fontSize: 12, fontWeight: 700, margin: '8px 0 0', color: f.ok ? C.green : C.danger }}>{f.msg}</p>
                  )}
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
                  <button
                    onClick={() => publish(d)}
                    disabled={!canPublish || busyId === d.id}
                    title={canPublish ? 'انشر الإعلان' : `ناقصه: ${d.missing.join(' · ')}`}
                    style={{
                      padding: '8px 16px', borderRadius: 12, border: 'none', fontSize: 13, fontWeight: 800,
                      cursor: canPublish ? 'pointer' : 'not-allowed',
                      background: canPublish ? C.green : '#eef0ee',
                      color: canPublish ? '#fff' : '#9aa7a1',
                      opacity: busyId === d.id ? 0.6 : 1,
                    }}>
                    {busyId === d.id ? '…بنشر' : 'انشر'}
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

function Stat({ n, l, color }: { n: number; l: string; color: string }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: '12px 14px' }}>
      <div style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1 }}>{n}</div>
      <div style={{ fontSize: 11.5, color: C.sub, marginTop: 5, fontWeight: 700 }}>{l}</div>
    </div>
  )
}
