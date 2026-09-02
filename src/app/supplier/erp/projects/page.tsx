'use client'
// ============================================================================
// 🏗️ /supplier/erp/projects — مشاريعي في البورصة
//
// (٢٨ أغسطس ٢٠٢٦) محمد: «أنا متأكد إن كله يكون مربوط ببعضه ويكون مربوط
//   كمان بالبيزنس B2B».
//
// 🐞 كان عندنا مصدرين مش مربوطين: البورصة (property_market_items)
//    والماركت بليس (listings). والمطوّر مربوط بالاسم النصي بس — فمشروعه
//    في البورصة مالوش أي علاقة بحسابه في الـB2B.
//
// ✅ دلوقتي المطوّر بيفتح نظامه ويلاقي مشاريعه، ويعدّل نظام السداد
//    والتسليم — والتعديل بيظهر في البورصة على طول.
// ============================================================================
import { useEffect, useState, useCallback } from 'react'
import { useT } from '@/lib/i18n/LanguageProvider'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { resolveBusiness, type Business } from '@/lib/business-access'
import {
  Loader2, ArrowRight, Building2, X, Wallet, CalendarClock,
  ExternalLink, Search, LinkIcon,
} from 'lucide-react'

type Project = {
  project_id: string
  title: string
  slug: string | null
  area_label: string | null
  city: string | null
  segment: string | null
  price_from: number | null
  price_to: number | null
  نظام_السداد: string | null
  التسليم: string | null
  cover_url: string | null
  is_active: boolean
  مربوط_بإعلان: boolean
  booking_enabled: boolean | null
}

export default function MyProjectsPage() {
  // 🌍 (٢ سبتمبر ٢٠٢٦) ترجمة شاشات الإدارة
  const { t } = useT()
  const [biz, setBiz] = useState<Business | null>(null)
  const [rows, setRows] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState<Project | null>(null)
  const [draft, setDraft] = useState({ plan: '', delivery: '' })
  const [saving, setSaving] = useState(false)

  const db = supabaseBrowser as unknown as {
    from: (t: string) => {
      select: (c: string) => { eq: (a: string, b: unknown) => { order: (c: string) => Promise<{ data: unknown }> } }
      update: (v: unknown) => { eq: (a: string, b: unknown) => Promise<{ error: { message: string } | null }> }
    }
  }

  const load = useCallback(async (sid: string) => {
    const { data } = await db.from('v_business_projects').select('*').eq('supplier_id', sid).order('title')
    setRows((data as Project[]) || [])
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    (async () => {
      const acc = await resolveBusiness()
      if (!acc.business) { setLoading(false); return }
      setBiz(acc.business); await load(acc.business.id); setLoading(false)
    })()
  }, [load])

  async function save() {
    if (!edit || !biz) return
    setSaving(true)
    const { error } = await db.from('property_market_items')
      .update({ payment_plan: draft.plan.trim() || null, delivery_label: draft.delivery.trim() || null })
      .eq('id', edit.project_id)
    setSaving(false)
    if (error) { alert(error.message); return }
    setEdit(null); await load(biz.id)
  }

  if (loading) return <div className="py-24 text-center"><Loader2 className="w-7 h-7 animate-spin mx-auto text-gray-400" /></div>
  if (!biz) return (
    <div className="max-w-md mx-auto py-20 px-4 text-center" dir="rtl">
      <h1 className="font-black text-lg mb-2">{t('erp.suppliers_only')}</h1>
      <Link href="/marketplace" className="text-[#059669] font-bold text-sm">{t('erp.back_market')}</Link>
    </div>
  )

  const shown = q.trim() ? rows.filter((r) => (r.title || '').includes(q.trim())) : rows
  const noPlan = rows.filter((r) => !r.نظام_السداد).length

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24" dir="rtl">
      <Link href="/supplier/erp" className="text-[11px] text-gray-500 font-bold flex items-center gap-1 mb-1">
        <ArrowRight className="w-3 h-3" /> نظام الإدارة
      </Link>
      <h1 className="text-lg font-black text-gray-900 flex items-center gap-2 mb-1">
        <Building2 className="w-5 h-5 text-[#059669]" /> مشاريعي
      </h1>
      <p className="text-[11.5px] text-gray-500 mb-4 leading-relaxed">
        مشاريعك في بورصة مضمونة العقارية. تعدّل <b>{t('erp.payment_plan')}</b> و<b>{t('erp.delivery')}</b> هنا —
        والتعديل بيظهر للعملاء في البورصة على طول.
      </p>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <Stat label={t('erp.all_projects')} v={rows.length} />
        <Stat label={t('erp.visible_bourse')} v={rows.filter((r) => r.is_active).length} good />
        <Stat label={t('erp.missing_plan')} v={noPlan} warn={noPlan > 0} />
      </div>

      {noPlan > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 mb-3">
          <p className="text-xs font-black text-amber-900 flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5" /> {noPlan} مشروع من غير نظام سداد
          </p>
          <p className="text-[11px] text-amber-900 mt-0.5 leading-relaxed">
            العميل بيدوّر على المقدم والقسط قبل أي حاجة — ضيفهم عشان مشروعك يوصل لناس أكتر.
          </p>
        </div>
      )}

      {rows.length > 5 && (
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('erp.search_project')}
            className="w-full border border-gray-200 rounded-xl pr-9 pl-3 py-2.5 text-sm" />
        </div>
      )}

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center">
          <Building2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-gray-600">
            {rows.length === 0 ? t('erp.no_projects') : t('erp.no_results')}
          </p>
          {rows.length === 0 && (
            <p className="text-[11px] text-gray-400 mt-1">{t('erp.projects_hint')}</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map((p) => (
            <div key={p.project_id} className="rounded-2xl border border-gray-200 bg-white p-3.5">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="font-black text-sm text-gray-900">{p.title}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {[p.area_label, p.city].filter(Boolean).join(' · ') || '—'}
                    {p.price_from ? ` · من ${Number(p.price_from).toLocaleString('ar-EG')} ج.م` : ''}
                  </p>
                </div>
                {p.مربوط_بإعلان && (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-[#34D399]/15 text-[#059669] shrink-0 flex items-center gap-1">
                    <LinkIcon className="w-2.5 h-2.5" /> مربوط بإعلان
                  </span>
                )}
              </div>

              <div className="space-y-1 mb-2.5">
                <p className="text-[11.5px] text-gray-700 flex items-start gap-1.5">
                  <Wallet className="w-3 h-3 mt-[3px] shrink-0 text-[#2FA084]" />
                  {p.نظام_السداد || <span className="text-amber-700 font-bold">{t('erp.no_payment_plan')}</span>}
                </p>
                {p.التسليم && (
                  <p className="text-[11.5px] text-gray-700 flex items-start gap-1.5">
                    <CalendarClock className="w-3 h-3 mt-[3px] shrink-0 text-[#2FA084]" />
                    {p.التسليم}
                  </p>
                )}
              </div>

              <div className="flex gap-1.5">
                <button onClick={() => { setEdit(p); setDraft({ plan: p.نظام_السداد || '', delivery: p.التسليم || '' }) }}
                  className="px-2.5 py-1.5 rounded-lg bg-[#34D399] text-[#04352A] text-[11.5px] font-black">
                  عدّل السداد والتسليم
                </button>
                {p.slug && (
                  <a href={`/real-estate/projects/${p.slug}`} target="_blank" rel="noreferrer"
                    className="px-2.5 py-1.5 rounded-lg bg-[#F1EEE6] text-[11.5px] font-bold flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> شوفه في البورصة
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {edit && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-3" onClick={() => setEdit(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-black text-sm truncate">{edit.title}</h2>
              <button onClick={() => setEdit(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="mb-2.5">
              <label className="block text-[11px] font-bold text-gray-600 mb-1">{t('erp.payment_plan')}</label>
              <textarea value={draft.plan} onChange={(e) => setDraft({ ...draft, plan: e.target.value })} rows={3}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                placeholder="مثال: ١٠٪ مقدم · تقسيط ٨ سنين" />
              <p className="text-[10.5px] text-gray-400 mt-1">
                اكتبه زي ما بتقوله للعميل — ده اللي هيشوفه في البورصة.
              </p>
            </div>
            <div className="mb-3">
              <label className="block text-[11px] font-bold text-gray-600 mb-1">{t('erp.delivery')}</label>
              <input value={draft.delivery} onChange={(e) => setDraft({ ...draft, delivery: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                placeholder="مثال: تسليم ٣ سنين" />
            </div>
            <button onClick={save} disabled={saving}
              className="w-full py-3 rounded-xl bg-[#34D399] text-[#04352A] font-black text-sm disabled:opacity-50">
              {saving ? t('erp.saving') : t('erp.save')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, v, good, warn }: { label: string; v: number; good?: boolean; warn?: boolean }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3">
      <p className="text-[11px] text-gray-500 font-bold mb-0.5">{label}</p>
      <p className={`font-black tabular text-lg ${warn ? 'text-amber-700' : good ? 'text-[#059669]' : 'text-gray-900'}`}>{v}</p>
    </div>
  )
}
