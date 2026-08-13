'use client'

import { useEffect, useState, useMemo, type ReactNode } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  ChevronLeft, Loader2, X, Check, Plus,
  ShoppingCart, Truck, Scissors, Zap, DollarSign,
  HandCoins, Star, ArrowDownCircle, CalendarPlus, ShoppingBag,
  TrendingUp, TrendingDown, Heart, Receipt, Sparkles,
  Building2, Users, Package, Wallet, AlertCircle,
} from 'lucide-react'

/* ============================================================
   /admin/business-finance/[supplierId]/operations
   
   Central data-entry hub. All actions log to financial_transactions
   via auto-triggers. KPIs update in real-time.
   ============================================================ */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// الإكرامية (tip) ميزة خاصة بالصالونات بس — تظهر للـ industries دي فقط
const SALON_INDUSTRIES = ['beauty_salon', 'salon', 'beauty', 'spa', 'barber', 'nails']

type Branch = { id: string; name: string; code: string | null }
type Employee = { id: string; full_name: string; role_ar: string; branch_id: string | null }
type Service = { id: string; name_ar: string; price_egp: number; duration_minutes: number; category: string | null }
type Item = { id: string; name_ar: string; unit: string; default_cost_per_unit_egp: number; selling_price_egp: number | null; is_for_resale: boolean }
type Bill = { id: string; bill_type_ar: string; provider_name: string | null; estimated_monthly_amount_egp: number; branch_id: string | null }
type Vendor = { id: string; name: string; category: string | null }
type Txn = {
  id: string; direction: string; amount_egp: number; category_snapshot: string | null;
  description: string | null; customer_name: string | null; occurred_at: string;
  madmona_commission_amount: number | null;
}

type ModalType =
  | null
  | 'walk_in_booking'
  | 'tip'
  | 'withdrawal'
  | 'advance'
  | 'bill_pay'
  | 'purchase'
  | 'transfer'
  | 'consumption'
  | 'pay_salary'
  | 'add_service'
  | 'add_item'
  | 'add_vendor'

export default function OperationsHub({
  params,
}: {
  params: { supplierId: string }
}) {
  const { supplierId } = params
  const [supplierName, setSupplierName] = useState('')
  const [industry, setIndustry] = useState('')
  const [branches, setBranches] = useState<Branch[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [txns, setTxns] = useState<Txn[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [modal, setModal] = useState<ModalType>(null)

  async function loadAll() {
    setLoading(true)
    const [sup, br, emp, sv, it, bl, vd, tx, sm] = await Promise.all([
      supabase.from('suppliers').select('business_name, industry').eq('id', supplierId).single(),
      supabase.from('supplier_branches').select('id, name, code').eq('supplier_id', supplierId).eq('status', 'active').order('code'),
      supabase.from('business_employees').select('id, full_name, role_ar, branch_id').eq('supplier_id', supplierId).eq('status', 'active'),
      supabase.from('services_catalog').select('*').eq('supplier_id', supplierId).eq('status', 'active').order('category'),
      supabase.from('inventory_items').select('*').eq('supplier_id', supplierId).eq('status', 'active').order('name_ar'),
      supabase.from('recurring_bills').select('*').eq('supplier_id', supplierId).eq('status', 'active'),
      supabase.from('vendors').select('*').eq('supplier_id', supplierId).eq('status', 'active'),
      supabase.from('financial_transactions').select('id, direction, amount_egp, category_snapshot, description, customer_name, occurred_at, madmona_commission_amount').eq('supplier_id', supplierId).eq('is_void', false).order('occurred_at', { ascending: false }).limit(20),
      supabase.rpc('admin_get_operations_summary', { p_supplier_id: supplierId }),
    ])
    setSupplierName((sup.data as any)?.business_name || '')
    setIndustry((sup.data as any)?.industry || '')
    setBranches((br.data || []) as Branch[])
    setEmployees((emp.data || []) as Employee[])
    setServices((sv.data || []) as Service[])
    setItems((it.data || []) as Item[])
    setBills((bl.data || []) as Bill[])
    setVendors((vd.data || []) as Vendor[])
    setTxns((tx.data || []) as Txn[])
    setSummary(sm.data)
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
    const id = setInterval(loadAll, 60000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function onSaved(msg: string) {
    setModal(null)
    showToast(msg)
    loadAll()
  }

  if (loading && !summary) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-8 h-8 text-[#FA8125] animate-spin" />
      </div>
    )
  }

  const isSalon = SALON_INDUSTRIES.includes(industry)

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`}
            className="text-xs font-bold text-[#6B7280] hover:text-[#FA8125] flex items-center gap-1 mb-2 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" />
            رجوع للـ finance
          </Link>
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#FA8125] mb-1">
            OPERATIONS HUB · DATA ENTRY
          </p>
          <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26] tracking-tight">
            عمليات اليوم — {supplierName}
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            كل اللي بـ يحصل النهارده · من حجز عميل لـ دفع فاتورة لـ صرف مرتب
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {toast && (
          <div className="fixed top-20 right-4 z-50 bg-[#FA8125] text-white rounded-xl px-4 py-3 shadow-lg flex items-center gap-2 text-sm font-bold">
            <Check className="w-4 h-4" />
            {toast}
          </div>
        )}

        {/* Today's KPIs */}
        <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KPI label="إيرادات اليوم" value={`${(summary?.today?.revenue || 0).toLocaleString('ar-EG')} ج`}
            icon={<TrendingUp className="w-4 h-4" />} primary />
          <KPI label="مصروفات" value={`${(summary?.today?.expenses || 0).toLocaleString('ar-EG')} ج`}
            icon={<TrendingDown className="w-4 h-4" />} tone="negative" />
          {isSalon && (
            <KPI label="إكراميات" value={`${(summary?.today?.tips || 0).toLocaleString('ar-EG')} ج`}
              icon={<Heart className="w-4 h-4" />} tone="amber" />
          )}
          <KPI label="حجوزات" value={summary?.today?.bookings || 0}
            icon={<CalendarPlus className="w-4 h-4" />} tone="neutral" />
          <KPI label="معاملات" value={summary?.today?.transactions || 0}
            icon={<Receipt className="w-4 h-4" />} tone="neutral" />
        </section>

        {/* Quick actions */}
        <section>
          <h2 className="text-xs font-bold tracking-wider uppercase text-[#6B7280] mb-3">
            🎬 سجّل عملية جديدة
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
            <ActionCard icon={<CalendarPlus />} label="حجز فوري" sub="عميل في الفرع" onClick={() => setModal('walk_in_booking')} accent />
            {isSalon && <ActionCard icon={<Heart />} label="إكرامية" sub="tip للموظف" onClick={() => setModal('tip')} />}
            <ActionCard icon={<ArrowDownCircle />} label="سحب كاش" sub="من خزينة الفرع" onClick={() => setModal('withdrawal')} />
            <ActionCard icon={<HandCoins />} label="سلفة موظف" sub="advance" onClick={() => setModal('advance')} />
            <ActionCard icon={<Zap />} label="دفع فاتورة" sub="كهرباء/إنترنت/إيجار" onClick={() => setModal('bill_pay')} />
            <ActionCard icon={<ShoppingCart />} label="شراء مخزن" sub="من المورد للمركزي" onClick={() => setModal('purchase')} />
            <ActionCard icon={<Truck />} label="تحويل للفرع" sub="من المركزي للفرع" onClick={() => setModal('transfer')} />
            <ActionCard icon={<Scissors />} label="استهلاك" sub="استخدام في خدمة" onClick={() => setModal('consumption')} />
            <ActionCard icon={<Wallet />} label="صرف مرتب" sub="شهري + commissions" onClick={() => setModal('pay_salary')} />
          </div>
        </section>

        {/* Catalog quick-adds */}
        <section>
          <h2 className="text-xs font-bold tracking-wider uppercase text-[#6B7280] mb-3">
            📚 ضيف للكتالوج
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
            <ActionCard icon={<Sparkles />} label="خدمة جديدة" sub={`${summary?.counts?.services || 0} موجود`} onClick={() => setModal('add_service')} small />
            <ActionCard icon={<Package />} label="منتج للمخزن" sub={`${summary?.counts?.items || 0} موجود`} onClick={() => setModal('add_item')} small />
            <ActionCard icon={<Building2 />} label="مورد جديد" sub={`${summary?.counts?.vendors || 0} موجود`} onClick={() => setModal('add_vendor')} small />
          </div>
        </section>

        {/* Low stock alerts */}
        {summary?.counts?.low_stock > 0 && (
          <section className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-sm font-black text-amber-900">⚠️ {summary.counts.low_stock} منتج وصل لحد التنبيه</p>
                <p className="text-xs text-amber-800">احتاج تعمل شراء جديد</p>
              </div>
            </div>
            <button onClick={() => setModal('purchase')}
              className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5">
              <ShoppingCart className="w-3.5 h-3.5" />
              اشتري دلوقتي
            </button>
          </section>
        )}

        {/* Recent transactions */}
        <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 bg-[#FAFAF7] border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xs font-bold tracking-wider uppercase text-[#6B7280]">آخر ٢٠ معاملة</h2>
            {summary?.today?.transactions > 0 && (
              <span className="text-[10px] text-[#6B7280]">{summary.today.transactions} النهارده</span>
            )}
          </div>
          {txns.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="w-12 h-12 text-[#6B7280] opacity-30 mx-auto mb-3" />
              <p className="text-sm font-black text-[#1A2E26] mb-1">لسه ما فيش معاملات</p>
              <p className="text-xs text-[#6B7280]">ابدأ بـ "حجز فوري" أو أي action من فوق</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {txns.map((t) => <TxnRow key={t.id} t={t} />)}
            </div>
          )}
        </section>
      </main>

      {/* Modals */}
      {modal === 'walk_in_booking' && (
        <WalkInBookingModal
          supplierId={supplierId} branches={branches} services={services} employees={employees}
          onClose={() => setModal(null)} onSaved={(msg) => onSaved(msg)} />
      )}
      {modal === 'tip' && isSalon && (
        <TipModal supplierId={supplierId} branches={branches} employees={employees}
          onClose={() => setModal(null)} onSaved={(msg) => onSaved(msg)} />
      )}
      {modal === 'withdrawal' && (
        <WithdrawalModal supplierId={supplierId} branches={branches} employees={employees}
          onClose={() => setModal(null)} onSaved={(msg) => onSaved(msg)} />
      )}
      {modal === 'advance' && (
        <AdvanceModal employees={employees}
          onClose={() => setModal(null)} onSaved={(msg) => onSaved(msg)} />
      )}
      {modal === 'bill_pay' && (
        <BillPayModal bills={bills}
          onClose={() => setModal(null)} onSaved={(msg) => onSaved(msg)} />
      )}
      {modal === 'purchase' && (
        <PurchaseModal supplierId={supplierId} items={items} vendors={vendors}
          onClose={() => setModal(null)} onSaved={(msg) => onSaved(msg)}
          onAddItem={() => setModal('add_item')} onAddVendor={() => setModal('add_vendor')} />
      )}
      {modal === 'transfer' && (
        <TransferModal supplierId={supplierId} items={items} branches={branches}
          onClose={() => setModal(null)} onSaved={(msg) => onSaved(msg)} />
      )}
      {modal === 'consumption' && (
        <ConsumptionModal supplierId={supplierId} items={items} branches={branches}
          onClose={() => setModal(null)} onSaved={(msg) => onSaved(msg)} />
      )}
      {modal === 'pay_salary' && (
        <PaySalaryModal employees={employees} isElite={isSalon}
          onClose={() => setModal(null)} onSaved={(msg) => onSaved(msg)} />
      )}
      {modal === 'add_service' && (
        <AddServiceModal supplierId={supplierId}
          onClose={() => setModal(null)} onSaved={(msg) => onSaved(msg)} />
      )}
      {modal === 'add_item' && (
        <AddItemModal supplierId={supplierId}
          onClose={() => setModal(null)} onSaved={(msg) => onSaved(msg)} />
      )}
      {modal === 'add_vendor' && (
        <AddVendorModal supplierId={supplierId}
          onClose={() => setModal(null)} onSaved={(msg) => onSaved(msg)} />
      )}
    </div>
  )
}

/* ============================================================
   COMPONENTS
   ============================================================ */
function KPI({ label, value, icon, primary, tone }: any) {
  const t = tone === 'negative' ? 'text-red-600' : tone === 'amber' ? 'text-amber-600' : 'text-[#1A2E26]'
  return (
    <div className={`rounded-2xl p-3 md:p-4 border ${primary ? 'bg-[#FA8125] border-[#FA8125] text-white' : 'bg-white border-gray-100'}`}>
      <div className={`flex items-center gap-1.5 mb-1 ${primary ? 'text-white/90' : 'text-[#6B7280]'}`}>
        {icon}
        <p className="text-[9px] font-bold tracking-wider uppercase truncate">{label}</p>
      </div>
      <p className={`text-lg md:text-2xl font-black font-mono ${primary ? 'text-white' : t}`}>{value}</p>
    </div>
  )
}

function ActionCard({ icon, label, sub, onClick, accent, small }: any) {
  return (
    <button onClick={onClick}
      className={`group rounded-2xl border p-3 md:p-4 text-right transition-all hover:shadow-md active:scale-[0.98] ${
        accent
          ? 'bg-[#FA8125] border-[#FA8125] text-white hover:bg-[#185547]'
          : 'bg-white border-gray-100 text-[#1A2E26] hover:border-[#FA8125]'
      } ${small ? 'p-2.5' : ''}`}
    >
      <div className={`inline-grid place-items-center w-9 h-9 rounded-xl mb-2 ${
        accent ? 'bg-white/15 text-white' : 'bg-[#FAFAF7] text-[#FA8125] group-hover:bg-[#FA8125] group-hover:text-white'
      }`}>
        {icon}
      </div>
      <p className={`text-sm font-black ${accent ? 'text-white' : 'text-[#1A2E26]'}`}>{label}</p>
      <p className={`text-[10px] mt-0.5 ${accent ? 'text-white/70' : 'text-[#6B7280]'}`}>{sub}</p>
    </button>
  )
}

function TxnRow({ t }: { t: Txn }) {
  const isIn = t.direction === 'in'
  const time = new Date(t.occurred_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
  const isException = ['إكرامية', 'سحب كاش'].includes(t.category_snapshot || '')
  return (
    <div className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-[#FAFAF7]/50">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={`inline-grid place-items-center w-9 h-9 rounded-lg flex-shrink-0 ${
          isIn ? 'bg-[#FA8125]/10 text-[#FA8125]' : 'bg-red-50 text-red-600'
        }`}>
          {isIn ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#1A2E26] truncate">
            {t.category_snapshot || (isIn ? 'إيراد' : 'مصروف')}
            {isException && <span className="text-[10px] text-amber-600 mr-1">(مستثنى من العمولة)</span>}
          </p>
          <p className="text-[11px] text-[#6B7280] truncate">
            {t.description} {t.customer_name && `· ${t.customer_name}`}
          </p>
        </div>
      </div>
      <div className="text-left flex-shrink-0">
        <p className={`text-base font-black font-mono ${isIn ? 'text-[#FA8125]' : 'text-red-600'}`}>
          {isIn ? '+' : '−'}{t.amount_egp.toLocaleString('ar-EG')}
        </p>
        <p className="text-[10px] text-[#6B7280]">{time}</p>
        {t.madmona_commission_amount && t.madmona_commission_amount > 0 && (
          <p className="text-[9px] text-[#FA8125]">Madmona {t.madmona_commission_amount.toLocaleString('ar-EG')}ج</p>
        )}
      </div>
    </div>
  )
}

/* ============================================================
   MODAL: Walk-in booking
   ============================================================ */
function WalkInBookingModal({ supplierId, branches, services, employees, onClose, onSaved }: any) {
  const [branchId, setBranchId] = useState(branches[0]?.id || '')
  const [serviceId, setServiceId] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [price, setPrice] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  function selectService(id: string) {
    const s = services.find((x: Service) => x.id === id)
    setServiceId(id)
    if (s) setPrice(s.price_egp)
  }

  const branchEmps = employees.filter((e: Employee) => e.branch_id === branchId)

  async function submit() {
    if (!serviceId || price <= 0) return
    setSubmitting(true)
    const { data } = await supabase.rpc('admin_log_walk_in_booking', {
      p_supplier_id: supplierId, p_branch_id: branchId, p_service_id: serviceId,
      p_price_egp: price, p_customer_name: customerName.trim() || null,
      p_customer_phone: customerPhone.trim() || null,
      p_assigned_employee_id: employeeId || null,
    })
    setSubmitting(false)
    if ((data as any)?.ok) onSaved('تم تسجيل الحجز · الإيراد + commission اتسجلوا')
    else alert((data as any)?.error || 'فشل')
  }

  return (
    <Modal title="حجز فوري · walk-in" onClose={onClose}>
      <Select label="الفرع" value={branchId} onChange={setBranchId}
        options={branches.map((b: Branch) => ({ value: b.id, label: b.name }))} />
      <Select label="الخدمة *" value={serviceId} onChange={selectService}
        options={[{ value: '', label: '— اختار —' }, ...services.map((s: Service) => ({ value: s.id, label: `${s.name_ar} (${s.price_egp}ج)` }))]} />
      <Field label="السعر (ج)">
        <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} className={INPUT} />
      </Field>
      <Select label="الموظف اللي قدم الخدمة" value={employeeId} onChange={setEmployeeId}
        options={[{ value: '', label: '— مفيش —' }, ...branchEmps.map((e: Employee) => ({ value: e.id, label: `${e.full_name} (${e.role_ar})` }))]} />
      <div className="grid grid-cols-2 gap-2">
        <Field label="اسم العميل (اختياري)">
          <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={INPUT} />
        </Field>
        <Field label="موبايل (اختياري)">
          <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className={INPUT} />
        </Field>
      </div>
      <SubmitButton onClick={submit} loading={submitting} disabled={!serviceId || price <= 0} />
    </Modal>
  )
}

/* ============================================================
   MODAL: Tip
   ============================================================ */
function TipModal({ supplierId, branches, employees, onClose, onSaved }: any) {
  const [branchId, setBranchId] = useState(branches[0]?.id || '')
  const [amount, setAmount] = useState(0)
  const [employeeId, setEmployeeId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    if (amount <= 0) return
    setSubmitting(true)
    const { data } = await supabase.rpc('admin_log_tip', {
      p_supplier_id: supplierId, p_branch_id: branchId, p_amount: amount,
      p_recipient_employee_id: employeeId || null, p_customer_name: customerName.trim() || null,
    })
    setSubmitting(false)
    if ((data as any)?.ok) onSaved(`تم تسجيل إكرامية ${amount}ج (مستثناة من commission Madmona)`)
  }

  return (
    <Modal title="إكرامية · tip" onClose={onClose}>
      <div className="bg-amber-50 rounded-xl p-3 text-[11px] text-amber-900 leading-relaxed">
        ⓘ الإكراميات بـ تتسجل في الإيرادات لكن <span className="font-bold">مستثناة من commission Madmona</span>
      </div>
      <Field label="المبلغ (ج) *">
        <input type="number" autoFocus value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))}
          className={`${INPUT} font-mono text-lg`} />
      </Field>
      <Select label="الفرع" value={branchId} onChange={setBranchId}
        options={branches.map((b: Branch) => ({ value: b.id, label: b.name }))} />
      <Select label="موجهة لـ" value={employeeId} onChange={setEmployeeId}
        options={[{ value: '', label: 'pooled — توزع على الفرع' }, ...employees.filter((e: Employee) => e.branch_id === branchId).map((e: Employee) => ({ value: e.id, label: `${e.full_name} (${e.role_ar})` }))]} />
      <Field label="اسم العميل (اختياري)">
        <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={INPUT} />
      </Field>
      <SubmitButton onClick={submit} loading={submitting} disabled={amount <= 0} />
    </Modal>
  )
}

/* ============================================================
   MODAL: Cash withdrawal
   ============================================================ */
function WithdrawalModal({ supplierId, branches, employees, onClose, onSaved }: any) {
  const [branchId, setBranchId] = useState(branches[0]?.id || '')
  const [amount, setAmount] = useState(0)
  const [reason, setReason] = useState('')
  const [withdrawnBy, setWithdrawnBy] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    if (amount <= 0 || !reason.trim()) return
    setSubmitting(true)
    const { data } = await supabase.rpc('admin_log_withdrawal', {
      p_supplier_id: supplierId, p_branch_id: branchId, p_amount: amount,
      p_reason: reason.trim(), p_withdrawn_by: withdrawnBy || null,
    })
    setSubmitting(false)
    if ((data as any)?.ok) onSaved(`تم تسجيل سحب ${amount}ج`)
  }

  return (
    <Modal title="سحب كاش من الفرع" onClose={onClose}>
      <div className="bg-amber-50 rounded-xl p-3 text-[11px] text-amber-900">
        ⓘ السحب حركة داخلية · <span className="font-bold">مستثناة من commission Madmona</span>
      </div>
      <Field label="المبلغ (ج) *">
        <input type="number" autoFocus value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} className={`${INPUT} font-mono text-lg`} />
      </Field>
      <Select label="الفرع" value={branchId} onChange={setBranchId}
        options={branches.map((b: Branch) => ({ value: b.id, label: b.name }))} />
      <Field label="السبب *">
        <input value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder="مثلاً: شراء عاجل، صرف خاص بـ المالك..." className={INPUT} />
      </Field>
      <Select label="مين سحب" value={withdrawnBy} onChange={setWithdrawnBy}
        options={[{ value: '', label: '— اختياري —' }, ...employees.filter((e: Employee) => e.branch_id === branchId).map((e: Employee) => ({ value: e.id, label: e.full_name }))]} />
      <SubmitButton onClick={submit} loading={submitting} disabled={amount <= 0 || !reason.trim()} />
    </Modal>
  )
}

/* ============================================================
   MODAL: Employee advance
   ============================================================ */
function AdvanceModal({ employees, onClose, onSaved }: any) {
  const [employeeId, setEmployeeId] = useState('')
  const [amount, setAmount] = useState(0)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    if (!employeeId || amount <= 0) return
    setSubmitting(true)
    const { data } = await supabase.rpc('admin_log_advance', {
      p_employee_id: employeeId, p_amount: amount, p_reason: reason.trim() || null,
    })
    setSubmitting(false)
    if ((data as any)?.ok) onSaved(`تم تسجيل سلفة ${amount}ج · هـ تتخصم من المرتب`)
  }

  return (
    <Modal title="سلفة موظف · advance" onClose={onClose}>
      <Select label="الموظف *" value={employeeId} onChange={setEmployeeId}
        options={[{ value: '', label: '— اختار —' }, ...employees.map((e: Employee) => ({ value: e.id, label: `${e.full_name} (${e.role_ar})` }))]} />
      <Field label="المبلغ (ج) *">
        <input type="number" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} className={`${INPUT} font-mono text-lg`} />
      </Field>
      <Field label="السبب (اختياري)">
        <input value={reason} onChange={(e) => setReason(e.target.value)} className={INPUT} />
      </Field>
      <SubmitButton onClick={submit} loading={submitting} disabled={!employeeId || amount <= 0} />
    </Modal>
  )
}

/* ============================================================
   MODAL: Bill payment
   ============================================================ */
function BillPayModal({ bills, onClose, onSaved }: any) {
  const [billId, setBillId] = useState(bills[0]?.id || '')
  const [amount, setAmount] = useState(0)
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))
  const [referenceNumber, setReferenceNumber] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    if (!billId || amount <= 0) return
    setSubmitting(true)
    const { data } = await supabase.rpc('admin_pay_bill', {
      p_recurring_bill_id: billId, p_amount_egp: amount, p_period: period,
      p_payment_method: 'cash', p_reference_number: referenceNumber.trim() || null,
    })
    setSubmitting(false)
    if ((data as any)?.ok) onSaved(`تم دفع فاتورة ${amount}ج`)
  }

  if (bills.length === 0) {
    return (
      <Modal title="دفع فاتورة" onClose={onClose}>
        <p className="text-sm text-[#6B7280]">مفيش فواتير معرّفة. اضف من الـ settings.</p>
      </Modal>
    )
  }

  return (
    <Modal title="دفع فاتورة دورية" onClose={onClose}>
      <Select label="الفاتورة *" value={billId} onChange={setBillId}
        options={bills.map((b: Bill) => ({ value: b.id, label: `${b.bill_type_ar}${b.provider_name ? ` — ${b.provider_name}` : ''}` }))} />
      <Field label="المبلغ (ج) *">
        <input type="number" autoFocus value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} className={`${INPUT} font-mono text-lg`} />
      </Field>
      <Field label="الفترة (YYYY-MM)">
        <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className={INPUT} />
      </Field>
      <Field label="رقم المرجع (اختياري)">
        <input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} className={INPUT} />
      </Field>
      <SubmitButton onClick={submit} loading={submitting} disabled={!billId || amount <= 0} />
    </Modal>
  )
}

/* ============================================================
   MODAL: Inventory purchase (vendor → central warehouse)
   ============================================================ */
function PurchaseModal({ supplierId, items, vendors, onClose, onSaved, onAddItem, onAddVendor }: any) {
  const [itemId, setItemId] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [unitCost, setUnitCost] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const total = quantity * unitCost

  async function submit() {
    if (!itemId || quantity <= 0 || unitCost <= 0) return
    setSubmitting(true)
    const { data } = await supabase.rpc('admin_record_inventory_purchase', {
      p_supplier_id: supplierId, p_item_id: itemId, p_quantity: quantity,
      p_unit_cost_egp: unitCost, p_vendor_id: vendorId || null,
    })
    setSubmitting(false)
    if ((data as any)?.ok) onSaved(`تم شراء ${quantity} × بإجمالي ${total}ج · رايح المخزن المركزي`)
  }

  return (
    <Modal title="شراء للمخزن المركزي" onClose={onClose}>
      <div className="bg-[#FA8125]/5 rounded-xl p-3 text-[11px] text-[#1A2E26] flex items-start gap-2">
        <Truck className="w-4 h-4 text-[#FA8125] flex-shrink-0 mt-0.5" />
        <span>الشراء بـ يدخل <span className="font-bold">المخزن المركزي</span> الأول · بعدين تـ توزع للفروع</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="flex-1">
          <Select label="المنتج *" value={itemId} onChange={setItemId}
            options={[{ value: '', label: '— اختار —' }, ...items.map((i: Item) => ({ value: i.id, label: `${i.name_ar} (${i.unit})` }))]} />
        </div>
        <button onClick={onAddItem} className="px-2.5 py-2 rounded-lg bg-[#FAFAF7] hover:bg-gray-100 text-[10px] font-bold text-[#FA8125] flex-shrink-0 mt-5">
          + جديد
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="الكمية *">
          <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className={`${INPUT} font-mono`} />
        </Field>
        <Field label="سعر الوحدة (ج) *">
          <input type="number" value={unitCost || ''} onChange={(e) => setUnitCost(Number(e.target.value))} className={`${INPUT} font-mono`} />
        </Field>
      </div>
      {total > 0 && (
        <div className="bg-[#FAFAF7] rounded-xl p-3 flex items-center justify-between">
          <span className="text-xs text-[#6B7280]">الإجمالي</span>
          <span className="text-xl font-black font-mono text-[#FA8125]">{total.toLocaleString('ar-EG')} ج</span>
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <div className="flex-1">
          <Select label="المورد (اختياري)" value={vendorId} onChange={setVendorId}
            options={[{ value: '', label: '— مفيش —' }, ...vendors.map((v: Vendor) => ({ value: v.id, label: v.name }))]} />
        </div>
        <button onClick={onAddVendor} className="px-2.5 py-2 rounded-lg bg-[#FAFAF7] hover:bg-gray-100 text-[10px] font-bold text-[#FA8125] flex-shrink-0 mt-5">
          + جديد
        </button>
      </div>
      <SubmitButton onClick={submit} loading={submitting} disabled={!itemId || quantity <= 0 || unitCost <= 0} />
    </Modal>
  )
}

/* ============================================================
   MODAL: Transfer (central → branch)
   ============================================================ */
function TransferModal({ supplierId, items, branches, onClose, onSaved }: any) {
  const [itemId, setItemId] = useState('')
  const [branchId, setBranchId] = useState(branches[0]?.id || '')
  const [quantity, setQuantity] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!itemId || !branchId || quantity <= 0) return
    setSubmitting(true)
    const { data } = await supabase.rpc('admin_transfer_to_branch', {
      p_supplier_id: supplierId, p_item_id: itemId, p_branch_id: branchId, p_quantity: quantity,
    })
    setSubmitting(false)
    if ((data as any)?.ok) onSaved(`تم تحويل ${quantity} للفرع`)
    else setError((data as any)?.error || 'فشل')
  }

  return (
    <Modal title="تحويل من المركزي للفرع" onClose={onClose}>
      <Select label="المنتج *" value={itemId} onChange={setItemId}
        options={[{ value: '', label: '— اختار —' }, ...items.map((i: Item) => ({ value: i.id, label: `${i.name_ar} (${i.unit})` }))]} />
      <Select label="الفرع *" value={branchId} onChange={setBranchId}
        options={branches.map((b: Branch) => ({ value: b.id, label: b.name }))} />
      <Field label="الكمية *">
        <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className={`${INPUT} font-mono`} />
      </Field>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <SubmitButton onClick={submit} loading={submitting} disabled={!itemId || quantity <= 0} />
    </Modal>
  )
}

/* ============================================================
   MODAL: Consumption (branch uses item in service)
   ============================================================ */
function ConsumptionModal({ supplierId, items, branches, onClose, onSaved }: any) {
  const [itemId, setItemId] = useState('')
  const [branchId, setBranchId] = useState(branches[0]?.id || '')
  const [quantity, setQuantity] = useState(1)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    if (!itemId || quantity <= 0) return
    setSubmitting(true)
    const { data } = await supabase.rpc('admin_record_consumption', {
      p_supplier_id: supplierId, p_item_id: itemId, p_branch_id: branchId,
      p_quantity: quantity, p_reason: reason.trim() || null,
    })
    setSubmitting(false)
    if ((data as any)?.ok) onSaved(`تم تسجيل استهلاك ${quantity}`)
  }

  return (
    <Modal title="تسجيل استهلاك" onClose={onClose}>
      <Select label="المنتج *" value={itemId} onChange={setItemId}
        options={[{ value: '', label: '— اختار —' }, ...items.map((i: Item) => ({ value: i.id, label: `${i.name_ar} (${i.unit})` }))]} />
      <Select label="الفرع *" value={branchId} onChange={setBranchId}
        options={branches.map((b: Branch) => ({ value: b.id, label: b.name }))} />
      <Field label="الكمية *">
        <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className={`${INPUT} font-mono`} />
      </Field>
      <Field label="السبب (اختياري)">
        <input value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder="مثلاً: صبغة شعر عميلة" className={INPUT} />
      </Field>
      <SubmitButton onClick={submit} loading={submitting} disabled={!itemId || quantity <= 0} />
    </Modal>
  )
}

/* ============================================================
   MODAL: Pay salary
   ============================================================ */
function PaySalaryModal({ employees, isElite, onClose, onSaved }: any) {
  const [employeeId, setEmployeeId] = useState('')
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))
  const [baseSalary, setBaseSalary] = useState(0)
  const [bonus, setBonus] = useState(0)
  const [advancesDeducted, setAdvancesDeducted] = useState(0)
  const [deductions, setDeductions] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)

  async function submit() {
    if (!employeeId || baseSalary <= 0) return
    setSubmitting(true)
    const { data } = await supabase.rpc('admin_pay_salary', {
      p_employee_id: employeeId, p_period: period,
      p_base_salary: baseSalary, p_bonus: bonus,
      p_advances_deducted: advancesDeducted, p_deductions: deductions,
    })
    setSubmitting(false)
    if ((data as any)?.ok) {
      setResult(data)
      setTimeout(() => onSaved(`تم صرف مرتب ${(data as any).net_paid}ج`), 2500)
    }
  }

  return (
    <Modal title="صرف مرتب شهري" onClose={onClose}>
      {result ? (
        <div className="bg-[#FA8125]/10 rounded-xl p-4 space-y-1 text-sm">
          <p className="font-bold text-[#1A2E26] mb-2">✅ تم الصرف</p>
          <p className="flex justify-between"><span>المرتب الأساسي:</span><span className="font-mono">{baseSalary}ج</span></p>
          <p className="flex justify-between"><span>عمولة من الخدمات:</span><span className="font-mono text-[#FA8125]">+{result.commission_calc}ج</span></p>
          {isElite && <p className="flex justify-between"><span>حصة الإكراميات:</span><span className="font-mono text-amber-600">+{result.tips_share}ج</span></p>}
          <p className="flex justify-between"><span>السلف المخصومة:</span><span className="font-mono text-red-600">−{advancesDeducted}ج</span></p>
          <p className="flex justify-between font-black text-base pt-2 border-t border-current/10 mt-2">
            <span>الصافي:</span><span className="font-mono text-[#FA8125]">{result.net_paid}ج</span>
          </p>
        </div>
      ) : (
        <>
          <Select label="الموظف *" value={employeeId} onChange={setEmployeeId}
            options={[{ value: '', label: '— اختار —' }, ...employees.map((e: Employee) => ({ value: e.id, label: `${e.full_name} (${e.role_ar})` }))]} />
          <Field label="الفترة (شهر)">
            <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className={INPUT} />
          </Field>
          <Field label="المرتب الأساسي (ج) *">
            <input type="number" value={baseSalary || ''} onChange={(e) => setBaseSalary(Number(e.target.value))} className={`${INPUT} font-mono`} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="بونص"><input type="number" value={bonus || ''} onChange={(e) => setBonus(Number(e.target.value))} className={`${INPUT} font-mono`} /></Field>
            <Field label="سلف مخصومة"><input type="number" value={advancesDeducted || ''} onChange={(e) => setAdvancesDeducted(Number(e.target.value))} className={`${INPUT} font-mono`} /></Field>
          </div>
          <Field label="خصومات أخرى"><input type="number" value={deductions || ''} onChange={(e) => setDeductions(Number(e.target.value))} className={`${INPUT} font-mono`} /></Field>
          <div className="bg-[#FAFAF7] rounded-xl p-3 text-[11px] text-[#6B7280]">
            ⓘ العمولة من الخدمات {isElite ? '+ حصة الإكراميات ' : ''}بـ تتحسب تلقائي من الـ DB
          </div>
          <SubmitButton onClick={submit} loading={submitting} disabled={!employeeId || baseSalary <= 0} />
        </>
      )}
    </Modal>
  )
}

/* ============================================================
   MODAL: Add service
   ============================================================ */
function AddServiceModal({ supplierId, onClose, onSaved }: any) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState(0)
  const [duration, setDuration] = useState(60)
  const [category, setCategory] = useState('hair')
  const [commission, setCommission] = useState(10)
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    if (!name.trim() || price <= 0) return
    setSubmitting(true)
    const { data } = await supabase.rpc('admin_add_service', {
      p_supplier_id: supplierId, p_name_ar: name.trim(), p_price_egp: price,
      p_duration_minutes: duration, p_category: category, p_performer_commission_pct: commission,
    })
    setSubmitting(false)
    if ((data as any)?.ok) onSaved('تمت إضافة الخدمة للكتالوج')
  }

  return (
    <Modal title="ضيف خدمة جديدة للكتالوج" onClose={onClose}>
      <Field label="اسم الخدمة *"><input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً: قص شعر" className={INPUT} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="السعر (ج) *"><input type="number" value={price || ''} onChange={(e) => setPrice(Number(e.target.value))} className={`${INPUT} font-mono`} /></Field>
        <Field label="المدة (دقيقة)"><input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={`${INPUT} font-mono`} /></Field>
      </div>
      <Select label="الفئة" value={category} onChange={setCategory}
        options={[
          { value: 'hair', label: 'شعر' }, { value: 'makeup', label: 'مكياج' },
          { value: 'nails', label: 'أظافر' }, { value: 'spa', label: 'سبا' },
          { value: 'other', label: 'أخرى' },
        ]} />
      <Field label="عمولة الموظف اللي يقدم الخدمة (%)">
        <input type="number" value={commission} onChange={(e) => setCommission(Number(e.target.value))} className={`${INPUT} font-mono`} />
      </Field>
      <SubmitButton onClick={submit} loading={submitting} disabled={!name.trim() || price <= 0} />
    </Modal>
  )
}

/* ============================================================
   MODAL: Add inventory item
   ============================================================ */
function AddItemModal({ supplierId, onClose, onSaved }: any) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('hair_products')
  const [unit, setUnit] = useState('piece')
  const [cost, setCost] = useState(0)
  const [forResale, setForResale] = useState(false)
  const [sellingPrice, setSellingPrice] = useState(0)
  const [minAlert, setMinAlert] = useState(5)
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    if (!name.trim()) return
    setSubmitting(true)
    const { data } = await supabase.rpc('admin_add_inventory_item', {
      p_supplier_id: supplierId, p_name_ar: name.trim(), p_category: category, p_unit: unit,
      p_default_cost: cost, p_selling_price: forResale ? sellingPrice : null,
      p_min_alert: minAlert, p_for_resale: forResale,
    })
    setSubmitting(false)
    if ((data as any)?.ok) onSaved('تمت إضافة المنتج للمخزن')
  }

  return (
    <Modal title="ضيف منتج للمخزن" onClose={onClose}>
      <Field label="اسم المنتج *"><input autoFocus value={name} onChange={(e) => setName(e.target.value)} className={INPUT} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Select label="الفئة" value={category} onChange={setCategory}
          options={[
            { value: 'hair_products', label: 'منتجات شعر' }, { value: 'nail_supplies', label: 'منتجات أظافر' },
            { value: 'makeup', label: 'مكياج' }, { value: 'supplies', label: 'مستلزمات' },
            { value: 'cleaning', label: 'تنظيف' }, { value: 'other', label: 'أخرى' },
          ]} />
        <Select label="الوحدة" value={unit} onChange={setUnit}
          options={[
            { value: 'piece', label: 'قطعة' }, { value: 'bottle', label: 'زجاجة' },
            { value: 'liter', label: 'لتر' }, { value: 'kg', label: 'كيلو' },
            { value: 'box', label: 'علبة' }, { value: 'tube', label: 'أنبوبة' },
          ]} />
      </div>
      <Field label="سعر الشراء الافتراضي (ج)">
        <input type="number" value={cost || ''} onChange={(e) => setCost(Number(e.target.value))} className={`${INPUT} font-mono`} />
      </Field>
      <Field label="حد التنبيه (لما تقل عن العدد ده)">
        <input type="number" value={minAlert} onChange={(e) => setMinAlert(Number(e.target.value))} className={`${INPUT} font-mono`} />
      </Field>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={forResale} onChange={(e) => setForResale(e.target.checked)} className="w-4 h-4" />
        <span className="text-sm text-[#1A2E26]">المنتج ده بـ نبيعه للعميل (وليس استهلاك فقط)</span>
      </label>
      {forResale && (
        <Field label="سعر البيع (ج)">
          <input type="number" value={sellingPrice || ''} onChange={(e) => setSellingPrice(Number(e.target.value))} className={`${INPUT} font-mono`} />
        </Field>
      )}
      <SubmitButton onClick={submit} loading={submitting} disabled={!name.trim()} />
    </Modal>
  )
}

/* ============================================================
   MODAL: Add vendor
   ============================================================ */
function AddVendorModal({ supplierId, onClose, onSaved }: any) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    if (!name.trim()) return
    setSubmitting(true)
    const { data } = await supabase.rpc('admin_add_vendor', {
      p_supplier_id: supplierId, p_name: name.trim(),
      p_category: category.trim() || null, p_phone: phone.trim() || null,
      p_notes: notes.trim() || null,
    })
    setSubmitting(false)
    if ((data as any)?.ok) onSaved('تمت إضافة المورد')
  }

  return (
    <Modal title="ضيف مورد جديد" onClose={onClose}>
      <Field label="اسم المورد *"><input autoFocus value={name} onChange={(e) => setName(e.target.value)} className={INPUT} /></Field>
      <Field label="الفئة"><input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="مثلاً: مورد ادوات شعر" className={INPUT} /></Field>
      <Field label="الموبايل"><input value={phone} onChange={(e) => setPhone(e.target.value)} className={INPUT} /></Field>
      <Field label="ملاحظات"><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={`${INPUT} resize-none`} /></Field>
      <SubmitButton onClick={submit} loading={submitting} disabled={!name.trim()} />
    </Modal>
  )
}

/* ============================================================
   SHARED MODAL SHELL + INPUTS
   ============================================================ */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <h3 className="text-base font-black text-[#1A2E26]">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#6B7280] hover:bg-[#FAFAF7]">
            <X className="w-4 h-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="text-xs font-bold text-[#1A2E26] mb-1 block">{label}</label>
      {children}
    </div>
  )
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={INPUT}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>
  )
}

function SubmitButton({ onClick, loading, disabled }: { onClick: () => void; loading: boolean; disabled: boolean }) {
  return (
    <button onClick={onClick} disabled={loading || disabled}
      className="w-full bg-[#FA8125] text-white rounded-xl px-5 py-3 font-black disabled:opacity-50 hover:shadow-md transition-shadow flex items-center justify-center gap-2 mt-2">
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Check className="w-4 h-4" />تأكيد</>}
    </button>
  )
}

const INPUT = "w-full px-4 py-2.5 rounded-xl bg-[#FAFAF7] border border-gray-200 text-[#1A2E26] focus:outline-none focus:border-[#FA8125] transition-colors text-sm"
