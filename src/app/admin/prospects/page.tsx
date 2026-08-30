'use client'
// ============================================================================
// 🎪 /admin/prospects — تجهيز البيزنس قبل المعرض
//
// (٢٨ أغسطس ٢٠٢٦) محمد: «عايز أجهّز عرض لكل عارض بتفاصيل شغله وأعمل
//   مفاجأة ليه» — Pharmaconex ١–٣ سبتمبر، ٣٥٠ عارض.
//
// الفكرة: تحضّر البيزنس هنا قبل المعرض، وتاخد معاك رابط/QR لكل شركة.
// العارض يمسح فيلاقي نظامه جاهز باسمه — ويستلمه بموافقته.
// ============================================================================
import { useEffect, useState, useCallback } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  Loader2, Plus, X, Copy, Check, Tent, Search, ExternalLink, TrendingUp,
} from 'lucide-react'

type Prospect = {
  id: string; source_event: string; business_name: string; business_name_en: string | null
  booth_number: string | null; contact_phone: string | null; industry_slug: string | null
  status: string; claim_token: string; sample_products: { name: string; description?: string }[]
  presented_at: string | null; claimed_at: string | null
  priority_tier: number | null; data_score: number | null
  brand: { logo?: string; primary?: string } | null
  description: string | null
}
type Industry = { slug: string; name_ar: string }

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  prepared:  { label: 'محضّر',  bg: '#F1EEE6', fg: '#6B7280' },
  presented: { label: 'اتعرض',  bg: '#FEF3C7', fg: '#B45309' },
  claimed:   { label: 'اتستلم', bg: '#34D39922', fg: '#059669' },
  declined:  { label: 'رفض',    bg: '#FEE2E2', fg: '#B91C1C' },
}

export default function ProspectsPage() {
  const [rows, setRows] = useState<Prospect[]>([])
  const [industries, setIndustries] = useState<Industry[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [form, setForm] = useState<Partial<Prospect> | null>(null)
  const [productsText, setProductsText] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  // 🎯 (٢٨/٨) فلتر الأولوية — الافتراضي الـ٣٨ المهمين
  const [tier, setTier] = useState<'top' | 'all'>('top')

  const db = supabaseBrowser as unknown as {
    from: (t: string) => {
      select: (c: string) => { order: (c: string, o?: unknown) => { order: (c: string, o?: unknown) => Promise<{ data: unknown }> } & Promise<{ data: unknown }> }
      insert: (v: unknown) => Promise<{ error: { message: string } | null }>
      update: (v: unknown) => { eq: (a: string, b: unknown) => Promise<{ error: { message: string } | null }> }
    }
  }

  const load = useCallback(async () => {
    const [{ data: p }, { data: i }] = await Promise.all([
      db.from('prospect_businesses').select('*').order('priority_tier').order('data_score', { ascending: false }),
      db.from('industry_profiles').select('slug, name_ar').order('sort_order'),
    ])
    setRows((p as Prospect[]) || [])
    setIndustries((i as Industry[]) || [])
    setLoading(false)
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  async function save() {
    if (!form?.business_name?.trim()) { alert('اكتب اسم الشركة'); return }
    setSaving(true)
    // 📦 المنتجات: سطر لكل منتج — «الاسم | الوصف»
    const products = productsText.split('\n').map((l) => l.trim()).filter(Boolean)
      .map((l) => { const [name, description] = l.split('|').map((x) => x.trim()); return { name, description } })
    const payload = {
      source_event: form.source_event?.trim() || 'Pharmaconex 2026',
      business_name: form.business_name.trim(),
      business_name_en: form.business_name_en || null,
      booth_number: form.booth_number || null,
      contact_phone: form.contact_phone || null,
      industry_slug: form.industry_slug || null,
      sample_products: products,
      source_note: 'من كتالوج المعرض المعلن',
    }
    const { error } = form.id
      ? await db.from('prospect_businesses').update(payload).eq('id', form.id)
      : await db.from('prospect_businesses').insert(payload)
    setSaving(false)
    if (error) { alert(error.message); return }
    setForm(null); setProductsText(''); load()
  }

  async function mark(id: string, status: string) {
    await db.from('prospect_businesses').update({
      status, ...(status === 'presented' ? { presented_at: new Date().toISOString() } : {}),
    }).eq('id', id)
    load()
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/b/${token}`
    navigator.clipboard?.writeText(url)
    setCopied(token); setTimeout(() => setCopied(null), 1800)
  }

  if (loading) return <div className="py-24 text-center"><Loader2 className="w-7 h-7 animate-spin mx-auto text-gray-400" /></div>

  const shown = rows
    .filter((r) => tier === 'all' || (r.priority_tier ?? 3) <= 2)
    .filter((r) => !q.trim() || r.business_name.includes(q.trim()))
  const stats = {
    total: rows.length,
    claimed: rows.filter((r) => r.status === 'claimed').length,
    presented: rows.filter((r) => r.status === 'presented').length,
  }

  return (
    <div className="max-w-5xl mx-auto p-4" dir="rtl">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h1 className="text-lg font-black text-gray-900 flex items-center gap-2">
          <Tent className="w-5 h-5 text-[#059669]" /> تجهيز المعارض
        </h1>
        <button onClick={() => { setForm({ source_event: 'Pharmaconex 2026' }); setProductsText('') }}
          className="px-3 py-2 rounded-xl bg-[#34D399] text-[#04352A] text-sm font-black flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> شركة جديدة
        </button>
      </div>

      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
        {([['top', '🎯 الأولوية'], ['all', 'الكل']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTier(k)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${
              tier === k ? 'bg-[#04352A] text-white' : 'bg-[#F1EEE6] text-gray-600'}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <S label="محضّر" v={stats.total} />
        <S label="اتعرض" v={stats.presented} />
        <S label="اتستلم" v={stats.claimed} good />
      </div>

      {rows.length > 4 && (
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="دوّر باسم الشركة"
            className="w-full border border-gray-200 rounded-xl pr-9 pl-3 py-2.5 text-sm" />
        </div>
      )}

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center">
          <Tent className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-gray-600">مفيش شركات محضّرة</p>
          <p className="text-[11px] text-gray-400 mt-1">
            حضّر الشركات قبل المعرض، وخد معاك الروابط.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map((r) => {
            const st = STATUS[r.status] || STATUS.prepared
            return (
              <div key={r.id} className="rounded-2xl border border-gray-200 bg-white p-3.5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  {/* 🎨 (٢٨/٨) لوجو الشركة من موقعها */}
                  {r.brand?.logo && (
                    <img src={r.brand.logo} alt="" className="w-9 h-9 rounded-lg object-contain bg-white border border-gray-100 shrink-0"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-sm text-gray-900 flex items-center gap-1.5">
                      {r.priority_tier === 1 && <span title="أولوية قصوى">🎯</span>}
                      {r.business_name}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {r.booth_number ? `استاند ${r.booth_number} · ` : ''}
                      {r.sample_products?.length || 0} منتج · جاهز {r.data_score ?? 0}٪
                      {r.contact_phone ? ` · ${r.contact_phone}` : ''}
                    </p>
                  </div>
                  <span className="text-[10.5px] font-black px-2 py-1 rounded-full shrink-0"
                    style={{ background: st.bg, color: st.fg }}>{st.label}</span>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  <button onClick={() => copyLink(r.claim_token)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#F1EEE6] text-[11.5px] font-bold flex items-center gap-1">
                    {copied === r.claim_token ? <><Check className="w-3 h-3 text-[#059669]" /> اتنسخ</> : <><Copy className="w-3 h-3" /> الرابط</>}
                  </button>
                  <a href={`/b/${r.claim_token}`} target="_blank" rel="noopener noreferrer"
                    className="px-2.5 py-1.5 rounded-lg bg-[#F1EEE6] text-[11.5px] font-bold flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> معاينة
                  </a>
                  {r.status === 'prepared' && (
                    <button onClick={() => mark(r.id, 'presented')}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-100 text-amber-800 text-[11.5px] font-bold">
                      عرضته عليه
                    </button>
                  )}
                  {r.status === 'presented' && (
                    <button onClick={() => mark(r.id, 'declined')}
                      className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 text-[11.5px] font-bold">
                      مش مهتم
                    </button>
                  )}
                  <button onClick={() => {
                    setForm(r)
                    setProductsText((r.sample_products || []).map((p) => `${p.name}${p.description ? ' | ' + p.description : ''}`).join('\n'))
                  }} className="px-2.5 py-1.5 rounded-lg bg-[#F1EEE6] text-[11.5px] font-bold">تعديل</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {form && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-3" onClick={() => setForm(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-4 max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-black text-base">{form.id ? 'تعديل' : 'شركة جديدة'}</h2>
              <button onClick={() => setForm(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <F label="المعرض"><input value={form.source_event || ''} onChange={(e) => setForm({ ...form, source_event: e.target.value })} className={INP} /></F>
            <F label="اسم الشركة *"><input value={form.business_name || ''} onChange={(e) => setForm({ ...form, business_name: e.target.value })} className={INP} /></F>
            <div className="grid grid-cols-2 gap-2">
              <F label="بالإنجليزي"><input value={form.business_name_en || ''} onChange={(e) => setForm({ ...form, business_name_en: e.target.value })} className={INP} dir="ltr" /></F>
              <F label="رقم الاستاند"><input value={form.booth_number || ''} onChange={(e) => setForm({ ...form, booth_number: e.target.value })} className={INP} /></F>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <F label="الموبايل"><input value={form.contact_phone || ''} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} className={INP} dir="ltr" /></F>
              <F label="الصناعة">
                <select value={form.industry_slug || ''} onChange={(e) => setForm({ ...form, industry_slug: e.target.value })} className={INP}>
                  <option value="">— اختار —</option>
                  {industries.map((i) => <option key={i.slug} value={i.slug}>{i.name_ar}</option>)}
                </select>
              </F>
            </div>
            <F label="منتجاته (سطر لكل منتج · الاسم | الوصف)">
              <textarea value={productsText} onChange={(e) => setProductsText(e.target.value)} rows={5}
                className={INP} placeholder={'فيتامين د ٥٠٠٠ | ٦٠ كبسولة\nكولاجين بحري | علبة ٣٠٠ جرام'} />
            </F>
            <button onClick={save} disabled={saving}
              className="w-full mt-2 py-3 rounded-xl bg-[#34D399] text-[#04352A] font-black text-sm disabled:opacity-50">
              {saving ? 'بيحفظ…' : 'حفظ'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const INP = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm'
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="mb-2.5"><label className="block text-[11px] font-bold text-gray-600 mb-1">{label}</label>{children}</div>
}
function S({ label, v, good }: { label: string; v: number; good?: boolean }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <TrendingUp className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-[11px] text-gray-500 font-bold">{label}</span>
      </div>
      <p className={`font-black tabular text-lg ${good ? 'text-[#059669]' : 'text-gray-900'}`}>{v}</p>
    </div>
  )
}
