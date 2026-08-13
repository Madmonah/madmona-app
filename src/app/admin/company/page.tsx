'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  Building2, TrendingUp, Wallet, CircleDollarSign, Users, Store, ClipboardList,
  Bot, UserCog, Truck, RefreshCw, Loader2, ChevronLeft, LayoutGrid, Globe,
  ShoppingCart, ExternalLink, Plus, X, Package, FileText, Receipt, AlertTriangle,
  Pencil, Boxes, Upload, Check, CheckCircle2, XCircle,
} from 'lucide-react'

const fmt = (n: any) => Number(n || 0).toLocaleString('en-US')

/* ============ label maps (DB stores English keys; we show Arabic) ============ */
const EXPENSE_CATS: [string, string][] = [
  ['infra_tech', 'بنية تحتية تقنية'], ['ai_apis', 'واجهات AI / APIs'], ['software', 'سوفتوير واشتراكات'],
  ['internet', 'إنترنت'], ['marketing', 'تسويق وإعلانات'], ['salaries', 'مرتبات'], ['salaries_advance', 'سلفة مرتب'],
  ['equipment', 'معدات وأجهزة'], ['licenses', 'تراخيص'], ['payment_fees', 'رسوم دفع'], ['rent', 'إيجار'],
  ['utilities', 'مرافق (كهربا/مياه/غاز)'], ['maintenance', 'صيانة'], ['supplies', 'مستلزمات'],
  ['transportation', 'مواصلات'], ['training', 'تدريب'], ['other', 'أخرى'],
]
const EXPENSE_CAT_AR: Record<string, string> = Object.fromEntries(EXPENSE_CATS)
const PAY_METHODS: [string, string][] = [['cash', 'كاش'], ['instapay', 'إنستاباي'], ['transfer', 'تحويل بنكي'], ['card', 'كارت'], ['cheque', 'شيك'], ['other', 'أخرى']]
const PO_STATUS: [string, string][] = [['pending', 'قيد التنفيذ'], ['partial', 'مدفوع جزئي'], ['received', 'مستلمة'], ['cancelled', 'ملغي']]
const PO_AR: Record<string, string> = Object.fromEntries(PO_STATUS)
const DOC_TYPES: [string, string][] = [['contract', 'عقد'], ['license', 'رخصة'], ['tax_card', 'بطاقة ضريبية'], ['kyc_register', 'سجل تجاري'], ['kyc_id', 'إثبات شخصية'], ['insurance', 'تأمين'], ['permit', 'تصريح'], ['other', 'أخرى']]
const DOC_AR: Record<string, string> = Object.fromEntries(DOC_TYPES)
const VENDOR_CATS: [string, string][] = [['equipment', 'معدات'], ['consumables', 'مستهلكات'], ['utilities', 'مرافق'], ['services', 'خدمات'], ['general', 'عام']]
const INV_CATS: [string, string][] = [['office', 'مكتب'], ['electronics', 'إلكترونيات'], ['equipment', 'معدات'], ['furniture', 'أثاث'], ['supplies', 'مستلزمات'], ['general', 'عام'], ['other', 'أخرى']]
const INV_CAT_AR: Record<string, string> = Object.fromEntries(INV_CATS)

const SOURCE_AR: Record<string, string> = {
  olx_individuals: 'OLX أفراد', 'supplier-hunter-ai': 'هانتر AI', google_maps: 'جوجل مابس',
  web_search: 'بحث ويب', partner_personal: 'شخصي', manual: 'يدوي', unknown: 'غير معروف',
}
const TEAM_AR: Record<string, string> = {
  sales: 'المبيعات', marketing: 'التسويق', operations: 'العمليات', creative: 'الإبداع',
  intelligence: 'الذكاء', support: 'الدعم', growth: 'النمو', strategic: 'الاستراتيجي', unassigned: 'غير محدد',
}

/* ============ shared helpers ============ */
// 🐛 (13 Jul 2026) كان بينادي الـRPC من المتصفح على طول — ومحصلش حفظ خالص.
// السبب: لوحة /admin مقفولة بكوكي مش بـ Supabase Auth، فـ auth.uid() = NULL
// و is_admin() = false → كل حفظ بيرجع forbidden. القراءة كانت شغالة لأن
// madmona_company_dashboard مفيهاش is_admin() — عشان كده الصفحة بتفتح والحفظ بس بيقع.
// دلوقتي الحفظ بيعدّي من /api/admin/company اللي بيتأكد من الكوكي على السيرفر.
async function callRpc(fn: string, args: any) {
  const res = await fetch('/api/admin/company', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fn, args }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json?.error || 'حصل خطأ')
  return json?.data
}
async function uploadToProofs(file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `company/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabaseBrowser.storage.from('payment-proofs').upload(path, file)
  if (error) throw error
  const { data } = supabaseBrowser.storage.from('payment-proofs').getPublicUrl(path)
  return data.publicUrl
}

/* ============================================================ PAGE ============================================================ */
export default function CompanyOverviewPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<null | 'expense' | 'vendor' | 'po' | 'product' | 'document'>(null)
  const [adjust, setAdjust] = useState<any>(null)
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  function flash(kind: 'ok' | 'err', msg: string) { setToast({ kind, msg }); setTimeout(() => setToast(null), 3500) }

  async function load() {
    setLoading(true)
    try {
      const { data: res, error } = await supabaseBrowser.rpc('get_madmona_company_overview')
      if (error) throw error
      setData(res)
    } catch { flash('err', 'مش قادر أحمّل البيانات') }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function onSaved(msg: string) { setModal(null); setAdjust(null); flash('ok', msg); load() }

  const o = data?.overview
  const leads: any[] = data?.leads_by_source || []
  const teams: any[] = data?.employees_by_team || []
  const revenue: any[] = data?.revenue_by_source || []
  const expCats: any[] = data?.expenses_by_category || []
  const recentExp: any[] = data?.recent_expenses || []
  const proc = data?.procurement || {}
  const recentPOs: any[] = data?.recent_purchase_orders || []
  const vendorsList: any[] = data?.vendors_list || []
  const inv = data?.inventory || {}
  const invStats = inv?.stats || {}
  const products: any[] = inv?.products || []
  const docs: any[] = data?.documents || []
  const maxLead = Math.max(1, ...leads.map(l => Number(l.count)))
  const maxTeam = Math.max(1, ...teams.map(t => Number(t.runs)))
  const maxCat = Math.max(1, ...expCats.map(x => Number(x.amount)))

  if (loading && !data) return <Loader />

  return (
    <div className="relative min-h-screen bg-[#FAFAF7] overflow-x-hidden text-[#1A2E26]" dir="rtl">
      <div className="pointer-events-none fixed inset-0 -z-10" style={{
        background:
          'radial-gradient(62% 50% at 86% -4%, rgba(47,160,132,0.12), transparent 60%),' +
          'radial-gradient(52% 46% at 6% 8%, rgba(250, 129, 37,0.09), transparent 60%),' +
          'radial-gradient(40% 38% at 50% 116%, rgba(212,160,23,0.06), transparent 60%)',
      }} />

      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-20 bg-white/70 backdrop-blur-xl border-b border-[#FA8125]/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href="/admin/dashboard" className="text-xs font-bold text-[#6B7280] hover:text-[#FA8125] flex items-center gap-1 mb-2">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع للداشبورد
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D4A017] via-[#2FA084] to-[#FA8125] flex items-center justify-center shadow-lg shadow-[#FA8125]/20">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-[0.3em] uppercase mb-0.5 bg-gradient-to-r from-[#D4A017] to-[#FA8125] bg-clip-text text-transparent">MADMONA · COMPANY</p>
                <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26] leading-none">مضمونة كشركة</h1>
                <p className="text-xs text-[#6B7280] mt-1.5 max-w-lg leading-relaxed">شركة تكنولوجيا — بنبني أنظمة إدارة أعمال (CRM/ERP) ومواقع، وبنشغّل منصّة مضمونة. ده مركز الشركة (ماليات · مخزون · توريدات · مستندات)، مش إدارة الأبليكيشن.</p>
              </div>
            </div>
            <button onClick={load} className="p-2.5 rounded-xl bg-white border border-gray-100 text-[#1A2E26] shadow-sm hover:border-[#FA8125]/30">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* quick add bar */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto whitespace-nowrap pb-1">
            <AddPill onClick={() => setModal('expense')} icon={<Receipt className="w-3.5 h-3.5" />} label="ضيف مصروف" primary />
            <AddPill onClick={() => setModal('product')} icon={<Boxes className="w-3.5 h-3.5" />} label="ضيف منتج مخزون" />
            <AddPill onClick={() => setModal('po')} icon={<ShoppingCart className="w-3.5 h-3.5" />} label="ضيف أمر توريد" />
            <AddPill onClick={() => setModal('vendor')} icon={<Truck className="w-3.5 h-3.5" />} label="ضيف مورّد" />
            <AddPill onClick={() => setModal('document')} icon={<FileText className="w-3.5 h-3.5" />} label="ضيف مستند" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-7 pb-20">

        {/* ===== Company products / systems ===== */}
        <Section title="منتجات الشركة وأنظمتها" subtitle="إيه اللي شركة مضمونة بتبنيه وبتشغّله">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Link href="/admin/dashboard" className="group rounded-3xl p-5 bg-white border border-gray-100 shadow-sm hover:border-[#FA8125]/30 transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-[#FA8125]"><LayoutGrid className="w-4 h-4" /><p className="text-[11px] font-bold tracking-wider uppercase text-[#6B7280]">المنتج الأساسي</p></div>
                <ExternalLink className="w-3.5 h-3.5 text-[#6B7280] group-hover:text-[#FA8125]" />
              </div>
              <p className="text-lg font-black text-[#1A2E26]">منصّة مضمونة (الأبليكيشن)</p>
              <p className="text-[11px] text-[#6B7280] mt-1">ماركتبليس التأجير والخدمات · إدارة الأبليكيشن من هنا</p>
            </Link>
            <div className="rounded-3xl p-5 bg-white border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 text-[#FA8125] mb-2"><Bot className="w-4 h-4" /><p className="text-[11px] font-bold tracking-wider uppercase text-[#6B7280]">أنظمة بنقدّمها</p></div>
              <p className="text-lg font-black text-[#1A2E26]">CRM / ERP للموردين</p>
              <p className="text-[11px] text-[#6B7280] mt-1">حجوزات · فريق · مخزون · ماليات — مجاناً لكل مورّد</p>
            </div>
            <a href="https://madmonacairo.com" target="_blank" rel="noopener noreferrer" className="group rounded-3xl p-5 bg-white border border-gray-100 shadow-sm hover:border-[#FA8125]/30 transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-[#FA8125]"><Globe className="w-4 h-4" /><p className="text-[11px] font-bold tracking-wider uppercase text-[#6B7280]">الموقع</p></div>
                <ExternalLink className="w-3.5 h-3.5 text-[#6B7280] group-hover:text-[#FA8125]" />
              </div>
              <p className="text-lg font-black text-[#1A2E26]">madmonacairo.com</p>
              <p className="text-[11px] text-[#6B7280] mt-1">الموقع الرسمي للشركة والمنصّة</p>
            </a>
          </div>
        </Section>

        {/* ===== P&L ===== */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-1 rounded-3xl p-5 bg-gradient-to-br from-[#D4A017] via-[#2FA084] to-[#FA8125] text-white shadow-xl shadow-[#FA8125]/20">
            <div className="flex items-center gap-2 mb-2 opacity-90"><CircleDollarSign className="w-4 h-4" /><p className="text-[11px] font-bold tracking-wider uppercase">صافي الربح</p></div>
            <p className="text-4xl font-black font-mono">{fmt(o?.net_profit_egp)} <span className="text-lg">ج</span></p>
            <p className="text-[11px] opacity-80 mt-1">إيراد − مصاريف</p>
          </div>
          <Stat icon={TrendingUp} label="الإيراد" value={`${fmt(o?.revenue_egp)} ج`} hint="من كل المصادر" />
          <Stat icon={Wallet} label="المصاريف" value={`${fmt(o?.expenses_egp)} ج`} hint={Number(o?.expenses_egp) ? 'مسجّلة' : 'مفيش مصاريف مسجّلة لسه'} />
        </section>

        {/* ===== INVENTORY (رصيد المخزون) ===== */}
        <Section title="رصيد المخزون" subtitle="مخزون شركة مضمونة — أجهزة ومستلزمات" action={<HeaderAdd onClick={() => setModal('product')} label="ضيف منتج" />}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <Stat icon={Boxes} label="عدد الأصناف" value={fmt(invStats.total_products)} />
            <Stat icon={Wallet} label="قيمة المخزون" value={`${fmt(invStats.total_value)} ج`} hint="رصيد × سعر التكلفة" />
            <Stat icon={AlertTriangle} label="تحت حد الطلب" value={fmt(invStats.low_stock_count)} hint={Number(invStats.low_stock_count) ? 'محتاجة إعادة طلب' : 'كله تمام'} />
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {products.length === 0 ? <Empty text="مفيش أصناف في المخزون لسه — اضغط «ضيف منتج»" /> : (
              <div className="divide-y divide-gray-50">
                {products.map((p, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-[#1A2E26] truncate">{p.name}</p>
                        {p.low && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-red-50 text-red-600">تحت الحد</span>}
                      </div>
                      <p className="text-[11px] text-[#6B7280]">{INV_CAT_AR[p.category] || p.category || 'عام'}{p.cost ? ` · تكلفة ${fmt(p.cost)}ج` : ''}{p.selling ? ` · بيع ${fmt(p.selling)}ج` : ''}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-left">
                        <p className={`text-lg font-black font-mono ${p.low ? 'text-red-600' : 'text-[#1A2E26]'}`}>{fmt(p.stock)}</p>
                        <p className="text-[10px] text-[#6B7280]">{p.unit || 'وحدة'}{p.reorder != null ? ` · حد ${fmt(p.reorder)}` : ''}</p>
                      </div>
                      <button onClick={() => setAdjust(p)} className="p-2 rounded-xl bg-[#FAFAF7] border border-gray-200 text-[#FA8125] hover:border-[#FA8125]/40" title="تعديل الرصيد">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

        {/* ===== EXPENSES (المصاريف + الفواتير) ===== */}
        <Section title="المصاريف والفواتير" subtitle="كل مصروف مع الفاتورة/الإيصال بتاعه" action={<HeaderAdd onClick={() => setModal('expense')} label="ضيف مصروف" />}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* recent expenses w/ receipts */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <h4 className="text-[11px] font-bold tracking-wider uppercase text-[#6B7280] px-4 pt-4 pb-2">آخر المصاريف</h4>
              {recentExp.length === 0 ? <Empty text="مفيش مصاريف مسجّلة لسه" /> : (
                <div className="divide-y divide-gray-50">
                  {recentExp.map((e, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#1A2E26] truncate">{EXPENSE_CAT_AR[e.category] || e.category_ar || 'مصروف'}</p>
                        <p className="text-[11px] text-[#6B7280] truncate">
                          {e.expense_date ? new Date(e.expense_date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }) : '—'}
                          {e.vendor ? ` · ${e.vendor}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2.5 flex-shrink-0">
                        {e.receipt_url
                          ? <a href={e.receipt_url} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-[#FA8125] inline-flex items-center gap-1 hover:underline"><Receipt className="w-3.5 h-3.5" /> الفاتورة</a>
                          : <span className="text-[10px] text-[#6B7280]">بدون فاتورة</span>}
                        <p className="text-sm font-black font-mono text-[#1A2E26]">{fmt(e.amount)} ج</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* by category */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <h4 className="text-[11px] font-bold tracking-wider uppercase text-[#6B7280] mb-3">المصاريف بالفئة</h4>
              {expCats.length === 0 ? <Empty text="مفيش مصاريف" /> : (
                <div className="space-y-2.5">
                  {expCats.map((x, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-[#1A2E26] w-28 shrink-0 truncate">{x.category}</span>
                      <div className="flex-1 h-2.5 rounded-full bg-[#FAFAF7] overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-l from-[#D4A017] to-[#FA8125]" style={{ width: `${(Number(x.amount) / maxCat) * 100}%` }} />
                      </div>
                      <span className="text-xs font-black font-mono text-[#1A2E26] w-16 text-left">{fmt(x.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* ===== Procurement & vendors ===== */}
        <Section title="التوريدات والموردين" subtitle="مشتريات شركة مضمونة من موردينها الخاصين"
          action={<div className="flex gap-2"><HeaderAdd onClick={() => setModal('po')} label="أمر توريد" /><HeaderAdd onClick={() => setModal('vendor')} label="مورّد" subtle /></div>}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Stat icon={ShoppingCart} label="أوامر توريد" value={fmt(proc.po_count)} hint={`${fmt(proc.received_count)} مستلمة · ${fmt(proc.pending_count)} قيد التنفيذ`} />
            <Stat icon={Wallet} label="إجمالي التوريدات" value={`${fmt(proc.total_egp)} ج`} />
            <Stat icon={CircleDollarSign} label="مدفوع" value={`${fmt(proc.paid_egp)} ج`} />
            <Stat icon={Truck} label="متبقّي للموردين" value={`${fmt(proc.outstanding_egp)} ج`} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <h4 className="text-[11px] font-bold tracking-wider uppercase text-[#6B7280] px-4 pt-4 pb-2">آخر أوامر التوريد</h4>
              {recentPOs.length === 0 ? <Empty text="مفيش توريدات مسجّلة لسه" /> : recentPOs.map((p, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                  <div><p className="text-sm font-bold text-[#1A2E26]">{p.vendor || 'مورّد'}</p><p className="text-[11px] text-[#6B7280]">{p.po_number || '—'} · {PO_AR[p.status] || p.status}</p></div>
                  <p className="text-sm font-black font-mono text-[#FA8125]">{fmt(p.total)} ج</p>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <h4 className="text-[11px] font-bold tracking-wider uppercase text-[#6B7280] px-4 pt-4 pb-2">الموردين</h4>
              {vendorsList.length === 0 ? <Empty text="مفيش موردين مسجّلين لسه" /> : vendorsList.map((v, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                  <div><p className="text-sm font-bold text-[#1A2E26]">{v.name}</p>{v.category && <p className="text-[11px] text-[#6B7280]">{v.category}{v.phone ? ` · ${v.phone}` : ''}</p>}</div>
                  <p className="text-sm font-black font-mono text-[#1A2E26]">{fmt(v.total_purchased)} ج</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ===== DOCUMENTS (المستندات) ===== */}
        <Section title="المستندات" subtitle="عقود · تراخيص · بطاقات ضريبية · أوراق رسمية" action={<HeaderAdd onClick={() => setModal('document')} label="ضيف مستند" />}>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {docs.length === 0 ? <Empty text="مفيش مستندات محفوظة لسه — اضغط «ضيف مستند»" /> : (
              <div className="divide-y divide-gray-50">
                {docs.map((d, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#FA8125]/10 text-[#FA8125] flex items-center justify-center flex-shrink-0"><FileText className="w-4 h-4" /></div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#1A2E26] truncate">{d.name}</p>
                        <p className="text-[11px] text-[#6B7280]">{DOC_AR[d.type] || d.type || 'مستند'}</p>
                      </div>
                    </div>
                    {d.url
                      ? <a href={d.url} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-[#FA8125] inline-flex items-center gap-1 hover:underline flex-shrink-0"><ExternalLink className="w-3.5 h-3.5" /> فتح</a>
                      : <span className="text-[10px] text-[#6B7280] flex-shrink-0">بدون ملف</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

        {/* ===== Customers ===== */}
        <Section title="العملاء" subtitle="عملاء الأبليكيشن — الجهتين اللي المنصّة بتخدمهم">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <Stat icon={Users} label="مؤجّرين" value={fmt(o?.renters)} hint="عملاء التطبيق" />
            <Stat icon={Store} label="مضيفين مسجّلين" value={fmt(o?.registered_listers)} hint="بيزنس معتمد" />
            <Stat icon={ClipboardList} label="مضيفين في الـpipeline" value={fmt(o?.lead_listers)} hint="ليدز جاهزة للتحويل" />
          </div>
          {leads.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <h4 className="text-[11px] font-bold tracking-wider uppercase text-[#6B7280] mb-3">الليدز حسب المصدر</h4>
              <div className="space-y-2.5">
                {leads.map((l, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-[#1A2E26] w-24 shrink-0">{SOURCE_AR[l.source] || l.source}</span>
                    <div className="flex-1 h-2.5 rounded-full bg-[#FAFAF7] overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-l from-[#2FA084] to-[#FA8125]" style={{ width: `${(Number(l.count) / maxLead) * 100}%` }} />
                    </div>
                    <span className="text-xs font-black font-mono text-[#1A2E26] w-10 text-left">{fmt(l.count)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* ===== Employees ===== */}
        <Section title="الموظفين" subtitle="فريق مضمونة — أجينتس + بشر">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <Stat icon={Bot} label="أجينتس AI" value={fmt(o?.ai_agents)} hint={`${fmt(o?.ai_agents_active)} شغّال · نجاح ${o?.ai_success_pct ?? 0}%`} />
            <Stat icon={UserCog} label="موظفين بشر" value={fmt(o?.human_employees)} hint="مضمونة-HQ" />
            <Stat icon={Truck} label="موردين" value={fmt(o?.vendors)} hint="اللي بندفعلهم" />
          </div>
          {teams.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <h4 className="text-[11px] font-bold tracking-wider uppercase text-[#6B7280] mb-3">الأجينتس حسب الفريق (بالإنتاج)</h4>
              <div className="space-y-2.5">
                {teams.map((t, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-[#1A2E26] w-20 shrink-0">{TEAM_AR[t.team] || t.team}</span>
                    <div className="flex-1 h-2.5 rounded-full bg-[#FAFAF7] overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-l from-[#6FCF97] to-[#FA8125]" style={{ width: `${(Number(t.runs) / maxTeam) * 100}%` }} />
                    </div>
                    <span className="text-[11px] text-[#6B7280] w-28 text-left shrink-0">{t.count} موظف · {fmt(t.runs)} مهمة</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* ===== Revenue by source ===== */}
        <Section title="الإيراد بالمصدر" subtitle="كل جنيه معروف جاي منين">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {revenue.length === 0 ? <Empty text="مفيش إيراد مسجّل لسه" /> : revenue.map((r, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-bold text-[#1A2E26]">{r.business || '—'}</p>
                  <p className="text-[11px] text-[#6B7280]">{r.source === 'marketplace_commission' ? 'عمولة ماركت بليس' : 'عمولة نظام'}{' · '}{r.origin === 'marketplace' ? 'من الماركت بليس' : 'بره الماركت بليس'}</p>
                </div>
                <p className="text-sm font-black font-mono text-[#FA8125]">{fmt(r.amount)} ج</p>
              </div>
            ))}
          </div>
        </Section>

      </main>

      {/* ===== MODALS ===== */}
      {modal === 'expense' && <Modal title="ضيف مصروف" onClose={() => setModal(null)}><ExpenseForm flash={flash} onClose={() => setModal(null)} onSaved={onSaved} /></Modal>}
      {modal === 'vendor' && <Modal title="ضيف مورّد" onClose={() => setModal(null)}><VendorForm flash={flash} onClose={() => setModal(null)} onSaved={onSaved} /></Modal>}
      {modal === 'po' && <Modal title="ضيف أمر توريد" onClose={() => setModal(null)}><POForm flash={flash} onClose={() => setModal(null)} onSaved={onSaved} /></Modal>}
      {modal === 'product' && <Modal title="ضيف منتج للمخزون" onClose={() => setModal(null)}><ProductForm flash={flash} onClose={() => setModal(null)} onSaved={onSaved} /></Modal>}
      {modal === 'document' && <Modal title="ضيف مستند" onClose={() => setModal(null)}><DocumentForm flash={flash} onClose={() => setModal(null)} onSaved={onSaved} /></Modal>}
      {adjust && <Modal title={`تعديل رصيد · ${adjust.name}`} onClose={() => setAdjust(null)}><AdjustForm product={adjust} flash={flash} onClose={() => setAdjust(null)} onSaved={onSaved} /></Modal>}

      {/* ===== TOAST ===== */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl text-sm font-bold text-white ${toast.kind === 'ok' ? 'bg-[#FA8125]' : 'bg-red-600'}`}>
            {toast.kind === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  )
}

/* ============================================================ FORMS ============================================================ */
function ExpenseForm({ onClose, onSaved, flash }: FormProps) {
  const [cat, setCat] = useState('infra_tech')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('instapay')
  const [vendor, setVendor] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [receipt, setReceipt] = useState('')
  const [busy, setBusy] = useState(false)
  async function save() {
    if (!amount || Number(amount) <= 0) return flash('err', 'اكتب المبلغ')
    setBusy(true)
    try {
      await callRpc('madmona_company_add_expense', { p_category: cat, p_amount: Number(amount), p_payment_method: method, p_vendor_name: vendor || null, p_receipt_url: receipt || null, p_expense_date: date, p_notes: notes || null })
      onSaved('اتسجّل المصروف ✓')
    } catch (e: any) { flash('err', e.message); setBusy(false) }
  }
  return (
    <div className="space-y-3">
      <Field label="الفئة"><Select value={cat} onChange={setCat} options={EXPENSE_CATS} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="المبلغ (ج)"><Num value={amount} onChange={setAmount} placeholder="0" /></Field>
        <Field label="طريقة الدفع"><Select value={method} onChange={setMethod} options={PAY_METHODS} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="المورّد / الجهة"><Txt value={vendor} onChange={setVendor} placeholder="اختياري" /></Field>
        <Field label="التاريخ"><input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} dir="ltr" /></Field>
      </div>
      <Attachment url={receipt} setUrl={setReceipt} flash={flash} label="الفاتورة / الإيصال" />
      <Field label="ملاحظات"><Txt value={notes} onChange={setNotes} placeholder="اختياري" /></Field>
      <SaveBar busy={busy} onSave={save} onClose={onClose} />
    </div>
  )
}

function ProductForm({ onClose, onSaved, flash }: FormProps) {
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('وحدة')
  const [stock, setStock] = useState('')
  const [cost, setCost] = useState('')
  const [selling, setSelling] = useState('')
  const [reorder, setReorder] = useState('')
  const [cat, setCat] = useState('office')
  const [busy, setBusy] = useState(false)
  async function save() {
    if (!name.trim()) return flash('err', 'اكتب اسم المنتج')
    setBusy(true)
    try {
      await callRpc('madmona_company_add_inventory_product', { p_name_ar: name, p_unit: unit || 'وحدة', p_current_stock: Number(stock || 0), p_cost: cost ? Number(cost) : null, p_selling: selling ? Number(selling) : null, p_reorder: reorder ? Number(reorder) : null, p_category: cat })
      onSaved('اتضاف المنتج للمخزون ✓')
    } catch (e: any) { flash('err', e.message); setBusy(false) }
  }
  return (
    <div className="space-y-3">
      <Field label="اسم المنتج"><Txt value={name} onChange={setName} placeholder="مثلاً: لاب توب / ورق طباعة" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="الرصيد الحالي"><Num value={stock} onChange={setStock} placeholder="0" /></Field>
        <Field label="الوحدة"><Txt value={unit} onChange={setUnit} placeholder="وحدة / علبة / كرتونة" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="سعر التكلفة (ج)"><Num value={cost} onChange={setCost} placeholder="اختياري" /></Field>
        <Field label="سعر البيع (ج)"><Num value={selling} onChange={setSelling} placeholder="اختياري" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="حد إعادة الطلب"><Num value={reorder} onChange={setReorder} placeholder="اختياري" /></Field>
        <Field label="الفئة"><Select value={cat} onChange={setCat} options={INV_CATS} /></Field>
      </div>
      <SaveBar busy={busy} onSave={save} onClose={onClose} />
    </div>
  )
}

function AdjustForm({ product, onClose, onSaved, flash }: FormProps & { product: any }) {
  const [stock, setStock] = useState(String(product?.stock ?? 0))
  const [busy, setBusy] = useState(false)
  async function save() {
    if (stock === '' || Number(stock) < 0) return flash('err', 'اكتب رصيد صحيح')
    setBusy(true)
    try {
      await callRpc('madmona_company_adjust_stock', { p_product_id: product.id, p_new_stock: Number(stock) })
      onSaved('اتعدّل الرصيد ✓')
    } catch (e: any) { flash('err', e.message); setBusy(false) }
  }
  return (
    <div className="space-y-3">
      <p className="text-xs text-[#6B7280]">الرصيد الحالي: <b className="text-[#1A2E26]">{fmt(product?.stock)} {product?.unit || 'وحدة'}</b></p>
      <Field label="الرصيد الجديد"><Num value={stock} onChange={setStock} placeholder="0" /></Field>
      <SaveBar busy={busy} onSave={save} onClose={onClose} saveLabel="حدّث الرصيد" />
    </div>
  )
}

function VendorForm({ onClose, onSaved, flash }: FormProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [cat, setCat] = useState('general')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  async function save() {
    if (!name.trim()) return flash('err', 'اكتب اسم المورّد')
    setBusy(true)
    try {
      await callRpc('madmona_company_add_vendor', { p_name: name, p_phone: phone || null, p_category: cat, p_notes: notes || null })
      onSaved('اتضاف المورّد ✓')
    } catch (e: any) { flash('err', e.message); setBusy(false) }
  }
  return (
    <div className="space-y-3">
      <Field label="اسم المورّد"><Txt value={name} onChange={setName} placeholder="اسم الشركة / الشخص" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="التليفون"><Txt value={phone} onChange={setPhone} placeholder="اختياري" /></Field>
        <Field label="الفئة"><Select value={cat} onChange={setCat} options={VENDOR_CATS} /></Field>
      </div>
      <Field label="ملاحظات"><Txt value={notes} onChange={setNotes} placeholder="اختياري" /></Field>
      <SaveBar busy={busy} onSave={save} onClose={onClose} />
    </div>
  )
}

function POForm({ onClose, onSaved, flash }: FormProps) {
  const [vendor, setVendor] = useState('')
  const [phone, setPhone] = useState('')
  const [total, setTotal] = useState('')
  const [paid, setPaid] = useState('')
  const [status, setStatus] = useState('pending')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  async function save() {
    if (!vendor.trim()) return flash('err', 'اكتب اسم المورّد')
    if (!total || Number(total) < 0) return flash('err', 'اكتب الإجمالي')
    setBusy(true)
    try {
      await callRpc('madmona_company_add_purchase_order', { p_vendor_name: vendor, p_total: Number(total), p_paid: Number(paid || 0), p_vendor_phone: phone || null, p_status: status, p_notes: notes || null })
      onSaved('اتسجّل أمر التوريد ✓')
    } catch (e: any) { flash('err', e.message); setBusy(false) }
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="المورّد"><Txt value={vendor} onChange={setVendor} placeholder="اسم المورّد" /></Field>
        <Field label="تليفون المورّد"><Txt value={phone} onChange={setPhone} placeholder="اختياري" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="الإجمالي (ج)"><Num value={total} onChange={setTotal} placeholder="0" /></Field>
        <Field label="المدفوع (ج)"><Num value={paid} onChange={setPaid} placeholder="0" /></Field>
      </div>
      <Field label="الحالة"><Select value={status} onChange={setStatus} options={PO_STATUS} /></Field>
      <Field label="ملاحظات"><Txt value={notes} onChange={setNotes} placeholder="اختياري" /></Field>
      <SaveBar busy={busy} onSave={save} onClose={onClose} />
    </div>
  )
}

function DocumentForm({ onClose, onSaved, flash }: FormProps) {
  const [type, setType] = useState('contract')
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  async function save() {
    if (!name.trim()) return flash('err', 'اكتب اسم المستند')
    setBusy(true)
    try {
      await callRpc('madmona_company_add_document', { p_document_type: type, p_document_name: name, p_file_url: url || null, p_notes: notes || null })
      onSaved('اتحفظ المستند ✓')
    } catch (e: any) { flash('err', e.message); setBusy(false) }
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="النوع"><Select value={type} onChange={setType} options={DOC_TYPES} /></Field>
        <Field label="اسم المستند"><Txt value={name} onChange={setName} placeholder="مثلاً: عقد الإيجار" /></Field>
      </div>
      <Attachment url={url} setUrl={setUrl} flash={flash} label="الملف (صورة / PDF)" />
      <Field label="ملاحظات"><Txt value={notes} onChange={setNotes} placeholder="اختياري" /></Field>
      <SaveBar busy={busy} onSave={save} onClose={onClose} />
    </div>
  )
}

/* ============================================================ UI PRIMITIVES ============================================================ */
type FormProps = { onClose: () => void; onSaved: (msg: string) => void; flash: (k: 'ok' | 'err', m: string) => void }
const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-[#1A2E26] focus:border-[#FA8125] focus:outline-none focus:ring-2 focus:ring-[#FA8125]/15 bg-white'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div><label className="text-[11px] font-bold text-[#6B7280] mb-1 block">{label}</label>{children}</div>
}
function Txt({ value, onChange, placeholder }: { value: string; onChange: (s: string) => void; placeholder?: string }) {
  return <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
}
function Num({ value, onChange, placeholder }: { value: string; onChange: (s: string) => void; placeholder?: string }) {
  return <input type="number" inputMode="decimal" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={inputCls} dir="ltr" />
}
function Select({ value, onChange, options }: { value: string; onChange: (s: string) => void; options: [string, string][] }) {
  return <select value={value} onChange={e => onChange(e.target.value)} className={inputCls}>{options.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
}

function Attachment({ url, setUrl, flash, label }: { url: string; setUrl: (s: string) => void; flash: (k: 'ok' | 'err', m: string) => void; label: string }) {
  const [busy, setBusy] = useState(false)
  async function onFile(e: any) {
    const f = e.target.files?.[0]; if (!f) return
    setBusy(true)
    try { const u = await uploadToProofs(f); setUrl(u); flash('ok', 'اترفع الملف ✓') }
    catch { flash('err', 'الرفع فشل — الصق رابط بدالها') }
    finally { setBusy(false) }
  }
  return (
    <div>
      <label className="text-[11px] font-bold text-[#6B7280] mb-1 block">{label}</label>
      <div className="flex items-center gap-2">
        <label className="cursor-pointer flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#FAFAF7] border border-gray-200 text-xs font-bold text-[#1A2E26] hover:border-[#FA8125]/40 flex-shrink-0">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} رفع صورة/PDF
          <input type="file" accept="image/*,application/pdf" className="hidden" onChange={onFile} disabled={busy} />
        </label>
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="أو الصق رابط" className={inputCls} dir="ltr" />
      </div>
      {url && <a href={url} target="_blank" rel="noreferrer" className="text-[11px] text-[#FA8125] font-bold mt-1.5 inline-flex items-center gap-1"><Check className="w-3 h-3" /> مرفق جاهز — معاينة</a>}
    </div>
  )
}

function SaveBar({ busy, onSave, onClose, saveLabel = 'حفظ' }: { busy: boolean; onSave: () => void; onClose: () => void; saveLabel?: string }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <button onClick={onSave} disabled={busy} className="flex-1 py-2.5 rounded-xl bg-gradient-to-l from-[#D4A017] via-[#2FA084] to-[#FA8125] text-white text-sm font-black shadow-lg shadow-[#FA8125]/20 disabled:opacity-60 flex items-center justify-center gap-2">
        {busy && <Loader2 className="w-4 h-4 animate-spin" />} {saveLabel}
      </button>
      <button onClick={onClose} disabled={busy} className="px-4 py-2.5 rounded-xl bg-[#FAFAF7] border border-gray-200 text-sm font-bold text-[#6B7280]">إلغا</button>
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end md:items-center justify-center p-0 md:p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:max-w-md bg-white rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white/90 backdrop-blur px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-black text-[#1A2E26]">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-[#FAFAF7] flex items-center justify-center text-[#6B7280] hover:text-[#1A2E26]"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function HeaderAdd({ onClick, label, subtle }: { onClick: () => void; label: string; subtle?: boolean }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${subtle ? 'bg-white border border-[#FA8125]/30 text-[#FA8125] hover:bg-[#FA8125]/5' : 'bg-gradient-to-l from-[#D4A017] to-[#FA8125] text-white shadow-sm hover:opacity-90'}`}>
      <Plus className="w-3.5 h-3.5" /> {label}
    </button>
  )
}
function AddPill({ onClick, icon, label, primary }: { onClick: () => void; icon: ReactNode; label: string; primary?: boolean }) {
  return (
    <button onClick={onClick} className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-black transition-all active:scale-95 ${primary ? 'bg-gradient-to-l from-[#D4A017] via-[#2FA084] to-[#FA8125] text-white shadow-md shadow-[#FA8125]/25' : 'bg-white border border-gray-200 text-[#1A2E26] hover:border-[#FA8125]/40 shadow-sm'}`}>
      {icon} {label}
    </button>
  )
}

function Stat({ icon: Icon, label, value, hint }: any) {
  return (
    <div className="rounded-3xl p-5 bg-white border border-gray-100 shadow-sm">
      <div className="flex items-center gap-2 mb-2 text-[#FA8125]"><Icon className="w-4 h-4" /><p className="text-[11px] font-bold tracking-wider uppercase text-[#6B7280]">{label}</p></div>
      <p className="text-3xl font-black text-[#1A2E26] font-mono">{value}</p>
      {hint && <p className="text-[11px] text-[#6B7280] mt-1">{hint}</p>}
    </div>
  )
}
function Section({ title, subtitle, children, action }: { title: string; subtitle?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-1 w-1 h-8 rounded-full bg-gradient-to-b from-[#D4A017] to-[#FA8125] flex-shrink-0" />
          <div>
            <h2 className="text-lg font-black text-[#1A2E26]">{title}</h2>
            {subtitle && <p className="text-xs text-[#6B7280]">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  )
}
function Empty({ text }: any) { return <div className="py-8 text-center text-sm font-bold text-[#6B7280]">{text}</div> }
function Loader() { return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#FA8125] animate-spin" /></div> }
