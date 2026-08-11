'use client'

// ============================================================================
// /supplier/dashboard — Self-service dashboard for clinic/beauty/restaurant owners
// Industry-aware: shows different fields based on suppliers.industry
// Admin (Mohamed) can test any supplier via ?supplier=<id>
// ============================================================================

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import MediaTab from './MediaTab'

type Stage = 'loading' | 'unauthenticated' | 'no_supplier' | 'ready'
type Tab = 'overview' | 'branches' | 'team' | 'services' | 'media' | 'settings'

interface Branch {
  id: string; name: string; code: string; address: string | null; city: string | null;
  district: string | null; phone: string | null; lat: number | null; lng: number | null;
  opens_at: string | null; closes_at: string | null; booking_enabled: boolean; status: string;
  manager_name: string | null; manager_phone: string | null; employee_count: number; image_url: string | null;
}
interface Practitioner {
  title_ar: string | null; specialty_label_ar: string | null;
  consultation_fee_egp: number | null; accepted_insurance: string[] | null;
  years_experience: number | null; bio: string | null; languages: string[] | null;
}
interface Employee {
  id: string; full_name: string; phone: string | null; role: string | null;
  role_ar: string | null; status: string; salary_egp: number | null;
  personal_commission_rate: number | null; branch_id: string | null; branch_name: string | null;
  avatar_initial: string | null; photo_url: string | null; practitioner: Practitioner | null;
}
interface Service {
  id: string; name_ar: string; name_en: string | null; category: string | null;
  price_egp: number; duration_minutes: number | null; description: string | null;
  status: string; provider_employee_id: string | null; provider_name: string | null;
  commission_pct: number | null;
}
interface Supplier {
  id: string; business_name: string; industry: string;
  logo_url: string | null; contact_phone: string | null; contact_email: string | null;
  description_ar: string | null; join_slug: string; city: string | null;
  commission_rate: number | null; public_url: string; cover_url: string | null; gallery: any[] | null;
}
interface DashboardData {
  supplier: Supplier; branches: Branch[]; employees: Employee[]; services: Service[];
  stats: { bookings_30d: number; revenue_30d: number; active_branches: number;
    active_employees: number; active_services: number };
}

const INDUSTRY_LABELS: Record<string, string> = {
  polyclinic: 'بوليكلينك', clinic: 'عيادة', medical: 'طب',
  beauty_salon: 'صالون تجميل', beauty: 'تجميل', salon: 'صالون', spa: 'سبا',
  restaurant: 'مطعم', cafe: 'كافيه',
}

function isMedical(industry: string) {
  return ['clinic','medical','polyclinic'].includes(industry)
}
function isBeauty(industry: string) {
  return ['beauty','salon','beauty_salon','spa'].includes(industry)
}
function showsPractitioner(industry: string) {
  return isMedical(industry) || isBeauty(industry)
}
function isRestaurant(industry: string) {
  return ['restaurant','cafe','bakery','cloud_kitchen'].includes(industry)
}
function isCommercial(industry: string) {
  return ['commercial','retail','store','shop','products','trading','ecommerce'].includes(industry)
}

// نفس تاب "الخدمات" بيحمل حاجات مختلفة حسب المجال:
// صالون/عيادة = خدمات · مطعم = أصناف منيو · شركة تجارية = منتجات
interface ItemCfg {
  tab: string; noun: string; addBtn: string; empty: string;
  catLabel: string; catPlaceholder: string; namePlaceholder: string;
  stepTitle: string; statLabel: string; modalNew: string; modalEdit: string;
  showDuration: boolean; showProvider: boolean;
}
function itemCfg(industry: string): ItemCfg {
  if (isRestaurant(industry)) return {
    tab: 'المنيو', noun: 'صنف', addBtn: '+ ضيف صنف', empty: 'لسه مفيش أصناف في المنيو.',
    catLabel: 'القسم', catPlaceholder: 'مشويات / بيتزا / حلويات', namePlaceholder: 'فراخ مشوية',
    stepTitle: 'ضيف أصناف المنيو', statLabel: 'أصناف', modalNew: 'صنف جديد', modalEdit: 'تعديل صنف',
    showDuration: false, showProvider: false,
  }
  if (isCommercial(industry)) return {
    tab: 'المنتجات', noun: 'منتج', addBtn: '+ ضيف منتج', empty: 'لسه مفيش منتجات.',
    catLabel: 'فئة المنتج', catPlaceholder: 'إلكترونيات / ملابس', namePlaceholder: 'اسم المنتج',
    stepTitle: 'ضيف منتجاتك', statLabel: 'منتجات', modalNew: 'منتج جديد', modalEdit: 'تعديل منتج',
    showDuration: false, showProvider: false,
  }
  return {
    tab: 'الخدمات', noun: 'خدمة', addBtn: '+ ضيف خدمة', empty: 'لسه مفيش خدمات.',
    catLabel: 'التصنيف', catPlaceholder: isMedical(industry) ? 'كشف' : 'مكياج', namePlaceholder: isMedical(industry) ? 'كشف باطنة' : 'مكياج عرايس',
    stepTitle: isMedical(industry) ? 'ضيف خدماتك (كشف، تحاليل، إلخ)' : 'ضيف خدماتك', statLabel: 'خدمات',
    modalNew: 'خدمة جديدة', modalEdit: 'تعديل خدمة',
    showDuration: true, showProvider: true,
  }
}

export default function SupplierDashboardPage() {
  return (
    <Suspense fallback={<div className="sd-loading" dir="rtl"><div className="sd-spinner" /><style jsx>{styles}</style></div>}>
      <SupplierDashboardInner />
    </Suspense>
  )
}

function SupplierDashboardInner() {
  const searchParams = useSearchParams()
  const supplierParam = searchParams?.get('supplier') || null

  const [stage, setStage] = useState<Stage>('loading')
  const [data, setData] = useState<DashboardData | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [error, setError] = useState('')

  const [editingBranch, setEditingBranch] = useState<Branch | 'new' | null>(null)
  const [editingEmployee, setEditingEmployee] = useState<Employee | 'new' | null>(null)
  const [editingService, setEditingService] = useState<Service | 'new' | null>(null)

  async function load() {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) { setStage('unauthenticated'); return }

      const sb = supabaseBrowser as any
      const args = supplierParam ? { p_supplier_id: supplierParam } : {}
      const { data: result, error } = await sb.rpc('supplier_self_dashboard', args)
      if (error) throw error
      if (!result?.ok) {
        if (result?.error?.includes('مفيش supplier')) { setStage('no_supplier'); return }
        throw new Error(result?.error || 'حصل خطأ')
      }
      setData(result as DashboardData)
      setStage('ready')
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : 'حصل خطأ')
      setStage('ready')
    }
  }

  useEffect(() => { load() }, [supplierParam])

  if (stage === 'loading') {
    return <div className="sd-loading" dir="rtl"><div className="sd-spinner" /><style jsx>{styles}</style></div>
  }

  if (stage === 'unauthenticated') {
    return (
      <div className="sd-msg" dir="rtl">
        <div className="sd-card">
          <h2>سجّل دخول الأول</h2>
          <p>عشان تدير بيانات حسابك على مضمونة، لازم تسجّل دخول.</p>
          <Link href={`/auth/login?redirect=${encodeURIComponent('/supplier/dashboard')}`} className="sd-btn sd-btn-primary">
            تسجيل دخول
          </Link>
        </div>
        <style jsx>{styles}</style>
      </div>
    )
  }

  if (stage === 'no_supplier') {
    return (
      <div className="sd-msg" dir="rtl">
        <div className="sd-card">
          <h2>مالكش supplier على مضمونة لسه</h2>
          <p>سجّل عيادتك أو نشاطك دلوقتي وابدأ تدير كل حاجة بنفسك من dashboard خاص بيك.</p>
          <Link href="/supplier/register" className="sd-btn sd-btn-primary">سجّل نشاطك</Link>
        </div>
        <style jsx>{styles}</style>
      </div>
    )
  }

  if (!data || error) {
    return (
      <div className="sd-msg" dir="rtl">
        <div className="sd-card">
          <h2>حصل خطأ</h2>
          <p>{error || 'مش قادرين نحمّل بياناتك دلوقتي'}</p>
        </div>
        <style jsx>{styles}</style>
      </div>
    )
  }

  const { supplier, branches, employees, services, stats } = data
  const industryLabel = INDUSTRY_LABELS[supplier.industry] || supplier.industry
  const item = itemCfg(supplier.industry)

  return (
    <div className="sd" dir="rtl">
      <header className="sd-header">
        <div className="sd-header-inner">
          <div className="sd-brand">
            {supplier.logo_url ? (
              <img src={supplier.logo_url} alt={supplier.business_name} className="sd-logo" />
            ) : (
              <div className="sd-logo sd-logo-placeholder">{supplier.business_name.charAt(0)}</div>
            )}
            <div>
              <h1>{supplier.business_name}</h1>
              <p>{industryLabel} · {supplier.city || 'مصر'}</p>
            </div>
          </div>
          <div className="sd-header-actions">
            <a href={supplier.public_url} target="_blank" rel="noreferrer" className="sd-btn sd-btn-outline">
              شوف صفحتك العامة
            </a>
            <Link href="/" className="sd-link">الرئيسية</Link>
          </div>
        </div>
      </header>

      <nav className="sd-tabs">
        <button className={`sd-tab ${activeTab==='overview'?'on':''}`} onClick={()=>setActiveTab('overview')}>نظرة عامة</button>
        <button className={`sd-tab ${activeTab==='branches'?'on':''}`} onClick={()=>setActiveTab('branches')}>الفروع ({branches.length})</button>
        <button className={`sd-tab ${activeTab==='team'?'on':''}`} onClick={()=>setActiveTab('team')}>
          {isMedical(supplier.industry) ? 'الأطباء' : isBeauty(supplier.industry) ? 'الفريق' : 'الموظفين'} ({employees.length})
        </button>
        <button className={`sd-tab ${activeTab==='services'?'on':''}`} onClick={()=>setActiveTab('services')}>{item.tab} ({services.length})</button>
        <button className={`sd-tab ${activeTab==='media'?'on':''}`} onClick={()=>setActiveTab('media')}>الصور</button>
        <button className={`sd-tab ${activeTab==='settings'?'on':''}`} onClick={()=>setActiveTab('settings')}>الإعدادات</button>
      </nav>

      <main className="sd-main">
        {activeTab==='overview' && (
          <section>
            <div className="sd-stats">
              <StatCard label="حجوزات (٣٠ يوم)" value={stats.bookings_30d.toString()} />
              <StatCard label="إيرادات (٣٠ يوم)" value={`${stats.revenue_30d.toLocaleString('ar-EG')} ج`} />
              <StatCard label="فروع" value={stats.active_branches.toString()} />
              <StatCard label="فريق" value={stats.active_employees.toString()} />
              <StatCard label={item.statLabel} value={stats.active_services.toString()} />
            </div>

            <div className="sd-getstarted">
              <h2>خطوات ابتدائية</h2>
              <Step done={branches.length>0} num={1} title="ضيف فروعك" onClick={()=>{setActiveTab('branches'); setEditingBranch('new')}} />
              <Step done={employees.length>0} num={2} title={isMedical(supplier.industry)?'ضيف الأطباء':'ضيف فريقك'} onClick={()=>{setActiveTab('team'); setEditingEmployee('new')}} />
              <Step done={services.length>0} num={3} title={item.stepTitle} onClick={()=>{setActiveTab('services'); setEditingService('new')}} />
              <Step done={!!supplier.logo_url && !!supplier.description_ar} num={4} title="جهّز بياناتك العامة (شعار + وصف)" onClick={()=>setActiveTab('settings')} />
            </div>

            <div className="sd-callout">
              <h3>صفحتك بتتولّد تلقائياً</h3>
              <p>أي حاجة تضيفها هنا (فرع جديد، طبيب جديد، خدمة) بتظهر على صفحتك العامة على طول. ولما عميل يحجز، بييجي مباشرة في حساباتك.</p>
              <a href={supplier.public_url} target="_blank" rel="noreferrer" className="sd-btn sd-btn-primary">عاين صفحتك دلوقتي</a>
            </div>
          </section>
        )}

        {activeTab==='branches' && (
          <section>
            <div className="sd-section-head">
              <h2>الفروع</h2>
              <button onClick={()=>setEditingBranch('new')} className="sd-btn sd-btn-primary">+ ضيف فرع</button>
            </div>
            {branches.length===0 ? (
              <div className="sd-empty"><p>لسه مفيش فروع. ضيف أول فرع عشان تبدأ تستقبل حجوزات.</p></div>
            ) : (
              <div className="sd-list">
                {branches.map(b => (
                  <div key={b.id} className="sd-row">
                    <div className="sd-row-main">
                      <h3>{b.name}</h3>
                      <div className="sd-row-meta">
                        {b.address && <span>{b.address}</span>}
                        {b.phone && <span>{b.phone}</span>}
                        {b.opens_at && b.closes_at && <span>{b.opens_at.slice(0,5)} - {b.closes_at.slice(0,5)}</span>}
                        <span>{b.employee_count} موظف</span>
                      </div>
                    </div>
                    <button onClick={()=>setEditingBranch(b)} className="sd-btn sd-btn-sm">تعديل</button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab==='team' && (
          <section>
            <div className="sd-section-head">
              <h2>{isMedical(supplier.industry)?'الأطباء':isBeauty(supplier.industry)?'الفريق':'الموظفين'}</h2>
              <button onClick={()=>setEditingEmployee('new')} className="sd-btn sd-btn-primary">
                + {isMedical(supplier.industry)?'ضيف طبيب':'ضيف فرد'}
              </button>
            </div>
            {employees.length===0 ? (
              <div className="sd-empty"><p>لسه مفيش فريق.</p></div>
            ) : (
              <div className="sd-list">
                {employees.map(e => (
                  <div key={e.id} className="sd-row">
                    <div className="sd-row-avatar">{e.avatar_initial}</div>
                    <div className="sd-row-main">
                      <h3>{e.practitioner?.title_ar || e.full_name}</h3>
                      <div className="sd-row-meta">
                        {e.practitioner?.specialty_label_ar && <span>{e.practitioner.specialty_label_ar}</span>}
                        {e.role_ar && !e.practitioner && <span>{e.role_ar}</span>}
                        {e.branch_name && <span>{e.branch_name}</span>}
                        {e.practitioner?.consultation_fee_egp && <span>{e.practitioner.consultation_fee_egp} ج</span>}
                        {e.practitioner?.years_experience !== null && e.practitioner?.years_experience !== undefined && <span>{e.practitioner.years_experience} سنة خبرة</span>}
                      </div>
                    </div>
                    <button onClick={()=>setEditingEmployee(e)} className="sd-btn sd-btn-sm">تعديل</button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab==='services' && (
          <section>
            <div className="sd-section-head">
              <h2>{item.tab}</h2>
              <button onClick={()=>setEditingService('new')} className="sd-btn sd-btn-primary">{item.addBtn}</button>
            </div>
            {services.length===0 ? (
              <div className="sd-empty"><p>{item.empty}</p></div>
            ) : (
              <div className="sd-list">
                {services.map(s => (
                  <div key={s.id} className="sd-row">
                    <div className="sd-row-main">
                      <h3>{s.name_ar}</h3>
                      <div className="sd-row-meta">
                        <span className="sd-price">{s.price_egp} ج</span>
                        {item.showDuration && !!s.duration_minutes && <span>{s.duration_minutes} د</span>}
                        {item.showProvider && s.provider_name && <span>{s.provider_name}</span>}
                        {s.category && <span>{s.category}</span>}
                      </div>
                      {s.description && <p className="sd-desc">{s.description}</p>}
                    </div>
                    <button onClick={()=>setEditingService(s)} className="sd-btn sd-btn-sm">تعديل</button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab==='media' && (
          <MediaTab supplier={supplier} branches={branches} employees={employees} onSaved={load} />
        )}

        {activeTab==='settings' && (
          <SettingsTab supplier={supplier} onSaved={load} />
        )}
      </main>

      {editingBranch !== null && (
        <BranchModal supplier={supplier} initial={editingBranch === 'new' ? null : editingBranch} onClose={()=>setEditingBranch(null)} onSaved={()=>{ setEditingBranch(null); load() }} />
      )}
      {editingEmployee !== null && (
        <EmployeeModal supplier={supplier} branches={branches} initial={editingEmployee === 'new' ? null : editingEmployee} onClose={()=>setEditingEmployee(null)} onSaved={()=>{ setEditingEmployee(null); load() }} />
      )}
      {editingService !== null && (
        <ServiceModal supplier={supplier} employees={employees} initial={editingService === 'new' ? null : editingService} onClose={()=>setEditingService(null)} onSaved={()=>{ setEditingService(null); load() }} />
      )}

      <style jsx>{styles}</style>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="sd-stat">
      <div className="sd-stat-num">{value}</div>
      <div className="sd-stat-lbl">{label}</div>
    </div>
  )
}

function Step({ num, done, title, onClick }: { num: number; done: boolean; title: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`sd-step ${done?'done':''}`}>
      <span className="sd-step-num">{done ? '✓' : num}</span>
      <span>{title}</span>
      {!done && <span className="sd-step-arrow">←</span>}
    </button>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="sd-field">
      <span className="sd-field-label">{label}</span>
      {children}
    </label>
  )
}

function BranchModal({ supplier, initial, onClose, onSaved }: {
  supplier: Supplier; initial: Branch | null; onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState({
    name: initial?.name || '', address: initial?.address || '', city: initial?.city || '',
    district: initial?.district || '', phone: initial?.phone || '',
    opens_at: initial?.opens_at?.slice(0,5) || '09:00',
    closes_at: initial?.closes_at?.slice(0,5) || '22:00',
    manager_name: initial?.manager_name || '', manager_phone: initial?.manager_phone || '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const sb = supabaseBrowser as any
      const { data, error } = await sb.rpc('supplier_self_save_branch', {
        p_supplier_id: supplier.id, p_branch_id: initial?.id || null,
        p_name: form.name, p_address: form.address, p_city: form.city,
        p_district: form.district, p_phone: form.phone,
        p_opens_at: form.opens_at, p_closes_at: form.closes_at,
        p_manager_name: form.manager_name, p_manager_phone: form.manager_phone,
      })
      if (error) throw error
      if (!data?.ok) throw new Error(data?.error || 'حصل خطأ')
      onSaved()
    } catch (e) { alert(e instanceof Error ? e.message : 'حصل خطأ') } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!initial || !confirm('متأكد تمسح الفرع ده؟')) return
    setSaving(true)
    try {
      const sb = supabaseBrowser as any
      const { data, error } = await sb.rpc('supplier_self_delete_branch', { p_supplier_id: supplier.id, p_branch_id: initial.id })
      if (error) throw error
      if (!data?.ok) throw new Error(data?.error || 'حصل خطأ')
      onSaved()
    } catch (e) { alert(e instanceof Error ? e.message : 'حصل خطأ') } finally { setSaving(false) }
  }

  return (
    <Modal title={initial ? 'تعديل فرع' : 'فرع جديد'} onClose={onClose}>
      <div className="sd-form">
        <Field label="اسم الفرع *"><input type="text" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="فرع المعادي" /></Field>
        <Field label="العنوان"><input type="text" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} placeholder="٥ شارع ٩، المعادي" /></Field>
        <div className="sd-form-row">
          <Field label="المدينة"><input type="text" value={form.city} onChange={e=>setForm({...form,city:e.target.value})} placeholder="القاهرة" /></Field>
          <Field label="الحي"><input type="text" value={form.district} onChange={e=>setForm({...form,district:e.target.value})} placeholder="المعادي" /></Field>
        </div>
        <Field label="رقم الفرع"><input type="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} dir="ltr" /></Field>
        <div className="sd-form-row">
          <Field label="ساعة الفتح"><input type="time" value={form.opens_at} onChange={e=>setForm({...form,opens_at:e.target.value})} /></Field>
          <Field label="ساعة الإغلاق"><input type="time" value={form.closes_at} onChange={e=>setForm({...form,closes_at:e.target.value})} /></Field>
        </div>
        <div className="sd-form-row">
          <Field label="اسم المدير"><input type="text" value={form.manager_name} onChange={e=>setForm({...form,manager_name:e.target.value})} /></Field>
          <Field label="رقم المدير"><input type="tel" value={form.manager_phone} onChange={e=>setForm({...form,manager_phone:e.target.value})} dir="ltr" /></Field>
        </div>
      </div>
      <div className="sd-modal-actions">
        {initial && <button onClick={handleDelete} className="sd-btn sd-btn-danger" disabled={saving}>حذف</button>}
        <div style={{flex:1}}/>
        <button onClick={onClose} className="sd-btn" disabled={saving}>إلغاء</button>
        <button onClick={handleSave} className="sd-btn sd-btn-primary" disabled={saving || !form.name}>{saving ? 'بيحفظ...' : 'حفظ'}</button>
      </div>
    </Modal>
  )
}

function EmployeeModal({ supplier, branches, initial, onClose, onSaved }: {
  supplier: Supplier; branches: Branch[]; initial: Employee | null; onClose: () => void; onSaved: () => void
}) {
  const showPract = showsPractitioner(supplier.industry)
  const [form, setForm] = useState({
    full_name: initial?.full_name || '', phone: initial?.phone || '',
    branch_id: initial?.branch_id || (branches[0]?.id || ''),
    role: initial?.role || (isMedical(supplier.industry) ? 'doctor' : 'staff'),
    role_ar: initial?.role_ar || '',
    salary_egp: initial?.salary_egp?.toString() || '',
    title_ar: initial?.practitioner?.title_ar || '',
    specialty_label_ar: initial?.practitioner?.specialty_label_ar || '',
    consultation_fee_egp: initial?.practitioner?.consultation_fee_egp?.toString() || '',
    accepted_insurance: (initial?.practitioner?.accepted_insurance || []).join(', '),
    years_experience: initial?.practitioner?.years_experience?.toString() || '',
    bio: initial?.practitioner?.bio || '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const sb = supabaseBrowser as any
      const insurance = form.accepted_insurance.split(',').map(s=>s.trim()).filter(Boolean)
      const { data, error } = await sb.rpc('supplier_self_save_employee', {
        p_supplier_id: supplier.id, p_employee_id: initial?.id || null,
        p_branch_id: form.branch_id || null,
        p_full_name: form.full_name, p_phone: form.phone,
        p_role: form.role, p_role_ar: form.role_ar,
        p_salary_egp: form.salary_egp ? parseInt(form.salary_egp) : null,
        p_title_ar: showPract ? form.title_ar : null,
        p_specialty_label_ar: showPract ? form.specialty_label_ar : null,
        p_consultation_fee_egp: showPract && form.consultation_fee_egp ? parseInt(form.consultation_fee_egp) : null,
        p_accepted_insurance: showPract && insurance.length > 0 ? insurance : null,
        p_years_experience: showPract && form.years_experience ? parseInt(form.years_experience) : null,
        p_bio: showPract ? form.bio : null,
      })
      if (error) throw error
      if (!data?.ok) throw new Error(data?.error || 'حصل خطأ')
      onSaved()
    } catch (e) { alert(e instanceof Error ? e.message : 'حصل خطأ') } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!initial || !confirm('متأكد تمسح الفرد ده؟')) return
    setSaving(true)
    try {
      const sb = supabaseBrowser as any
      const { data, error } = await sb.rpc('supplier_self_delete_employee', { p_supplier_id: supplier.id, p_employee_id: initial.id })
      if (error) throw error
      if (!data?.ok) throw new Error(data?.error || 'حصل خطأ')
      onSaved()
    } catch (e) { alert(e instanceof Error ? e.message : 'حصل خطأ') } finally { setSaving(false) }
  }

  return (
    <Modal title={initial ? 'تعديل' : (isMedical(supplier.industry)?'طبيب جديد':'فرد جديد')} onClose={onClose}>
      <div className="sd-form">
        <Field label="الاسم الكامل *">
          <input type="text" value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})} placeholder={isMedical(supplier.industry)?'د. أحمد محمد':'محمد علي'} />
        </Field>
        <div className="sd-form-row">
          <Field label="الجوّال"><input type="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} dir="ltr" /></Field>
          <Field label="الفرع">
            <select value={form.branch_id} onChange={e=>setForm({...form,branch_id:e.target.value})}>
              <option value="">— اختار فرع —</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
        </div>

        {showPract && (
          <>
            <div className="sd-form-divider">{isMedical(supplier.industry)?'بيانات الطبيب':'بيانات الفرد المهنية'}</div>
            <div className="sd-form-row">
              <Field label="اللقب الكامل"><input type="text" value={form.title_ar} onChange={e=>setForm({...form,title_ar:e.target.value})} placeholder="د. أحمد محمد" /></Field>
              <Field label="التخصص">
                <input type="text" value={form.specialty_label_ar} onChange={e=>setForm({...form,specialty_label_ar:e.target.value})} placeholder={isMedical(supplier.industry)?'طب باطنة':'مكياج عرايس'} />
              </Field>
            </div>
            <div className="sd-form-row">
              <Field label={isMedical(supplier.industry)?'سعر الكشف (ج)':'سعر الجلسة (ج)'}>
                <input type="number" value={form.consultation_fee_egp} onChange={e=>setForm({...form,consultation_fee_egp:e.target.value})} />
              </Field>
              <Field label="سنين الخبرة"><input type="number" value={form.years_experience} onChange={e=>setForm({...form,years_experience:e.target.value})} /></Field>
            </div>
            {isMedical(supplier.industry) && (
              <Field label="تأمينات مقبولة (افصلها بفاصلة)">
                <input type="text" value={form.accepted_insurance} onChange={e=>setForm({...form,accepted_insurance:e.target.value})} placeholder="AXA, MetLife, Allianz" />
              </Field>
            )}
            <Field label="نبذة">
              <textarea value={form.bio} onChange={e=>setForm({...form,bio:e.target.value})} rows={3} placeholder="خبرة وخلفية مهنية..." />
            </Field>
          </>
        )}
      </div>
      <div className="sd-modal-actions">
        {initial && <button onClick={handleDelete} className="sd-btn sd-btn-danger" disabled={saving}>حذف</button>}
        <div style={{flex:1}}/>
        <button onClick={onClose} className="sd-btn" disabled={saving}>إلغاء</button>
        <button onClick={handleSave} className="sd-btn sd-btn-primary" disabled={saving || !form.full_name}>{saving ? 'بيحفظ...' : 'حفظ'}</button>
      </div>
    </Modal>
  )
}

function ServiceModal({ supplier, employees, initial, onClose, onSaved }: {
  supplier: Supplier; employees: Employee[]; initial: Service | null; onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState({
    name_ar: initial?.name_ar || '', name_en: initial?.name_en || '',
    category: initial?.category || '',
    price_egp: initial?.price_egp?.toString() || '',
    duration_minutes: initial?.duration_minutes?.toString() || '30',
    description: initial?.description || '',
    provider_employee_id: initial?.provider_employee_id || '',
  })
  const [saving, setSaving] = useState(false)
  const cfg = itemCfg(supplier.industry)

  async function handleSave() {
    setSaving(true)
    try {
      const sb = supabaseBrowser as any
      const { data, error } = await sb.rpc('supplier_self_save_service', {
        p_supplier_id: supplier.id, p_service_id: initial?.id || null,
        p_name_ar: form.name_ar, p_name_en: form.name_en,
        p_category: form.category,
        p_price_egp: parseInt(form.price_egp),
        p_duration_minutes: cfg.showDuration ? parseInt(form.duration_minutes || '30') : 0,
        p_description: form.description,
        p_provider_employee_id: form.provider_employee_id || null,
      })
      if (error) throw error
      if (!data?.ok) throw new Error(data?.error || 'حصل خطأ')
      onSaved()
    } catch (e) { alert(e instanceof Error ? e.message : 'حصل خطأ') } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!initial || !confirm(`متأكد تمسح ${cfg.noun}؟`)) return
    setSaving(true)
    try {
      const sb = supabaseBrowser as any
      const { data, error } = await sb.rpc('supplier_self_delete_service', { p_supplier_id: supplier.id, p_service_id: initial.id })
      if (error) throw error
      if (!data?.ok) throw new Error(data?.error || 'حصل خطأ')
      onSaved()
    } catch (e) { alert(e instanceof Error ? e.message : 'حصل خطأ') } finally { setSaving(false) }
  }

  return (
    <Modal title={initial ? cfg.modalEdit : cfg.modalNew} onClose={onClose}>
      <div className="sd-form">
        <Field label={`اسم ${cfg.noun} *`}><input type="text" value={form.name_ar} onChange={e=>setForm({...form,name_ar:e.target.value})} placeholder={cfg.namePlaceholder} /></Field>
        {cfg.showDuration ? (
          <div className="sd-form-row">
            <Field label="السعر (ج) *"><input type="number" value={form.price_egp} onChange={e=>setForm({...form,price_egp:e.target.value})} /></Field>
            <Field label="المدة (دقيقة)"><input type="number" value={form.duration_minutes} onChange={e=>setForm({...form,duration_minutes:e.target.value})} /></Field>
          </div>
        ) : (
          <Field label="السعر (ج) *"><input type="number" value={form.price_egp} onChange={e=>setForm({...form,price_egp:e.target.value})} /></Field>
        )}
        <Field label={cfg.catLabel}><input type="text" value={form.category} onChange={e=>setForm({...form,category:e.target.value})} placeholder={cfg.catPlaceholder} /></Field>
        {cfg.showProvider && (
          <Field label="مقدم الخدمة">
            <select value={form.provider_employee_id} onChange={e=>setForm({...form,provider_employee_id:e.target.value})}>
              <option value="">— اختار —</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
          </Field>
        )}
        <Field label="وصف"><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={3} /></Field>
      </div>
      <div className="sd-modal-actions">
        {initial && <button onClick={handleDelete} className="sd-btn sd-btn-danger" disabled={saving}>حذف</button>}
        <div style={{flex:1}}/>
        <button onClick={onClose} className="sd-btn" disabled={saving}>إلغاء</button>
        <button onClick={handleSave} className="sd-btn sd-btn-primary" disabled={saving || !form.name_ar || !form.price_egp}>{saving ? 'بيحفظ...' : 'حفظ'}</button>
      </div>
    </Modal>
  )
}

function SettingsTab({ supplier, onSaved }: { supplier: Supplier; onSaved: () => void }) {
  const [form, setForm] = useState({
    business_name: supplier.business_name,
    description_ar: supplier.description_ar || '',
    logo_url: supplier.logo_url || '',
    contact_phone: supplier.contact_phone || '',
    contact_email: supplier.contact_email || '',
    city: supplier.city || '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const sb = supabaseBrowser as any
      const { data, error } = await sb.rpc('supplier_self_update_business', {
        p_supplier_id: supplier.id,
        p_business_name: form.business_name, p_description_ar: form.description_ar,
        p_logo_url: form.logo_url, p_contact_phone: form.contact_phone,
        p_contact_email: form.contact_email, p_city: form.city,
      })
      if (error) throw error
      if (!data?.ok) throw new Error(data?.error || 'حصل خطأ')
      onSaved()
      alert('اتحفظ ✓')
    } catch (e) { alert(e instanceof Error ? e.message : 'حصل خطأ') } finally { setSaving(false) }
  }

  return (
    <section>
      <div className="sd-section-head"><h2>الإعدادات</h2></div>
      <div className="sd-form sd-settings-form">
        <Field label="اسم النشاط"><input type="text" value={form.business_name} onChange={e=>setForm({...form,business_name:e.target.value})} /></Field>
        <Field label="الوصف"><textarea value={form.description_ar} onChange={e=>setForm({...form,description_ar:e.target.value})} rows={3} /></Field>
        <Field label="رابط الشعار"><input type="url" value={form.logo_url} onChange={e=>setForm({...form,logo_url:e.target.value})} dir="ltr" /></Field>
        <div className="sd-form-row">
          <Field label="جوّال للتواصل"><input type="tel" value={form.contact_phone} onChange={e=>setForm({...form,contact_phone:e.target.value})} dir="ltr" /></Field>
          <Field label="إيميل"><input type="email" value={form.contact_email} onChange={e=>setForm({...form,contact_email:e.target.value})} dir="ltr" /></Field>
        </div>
        <Field label="المدينة"><input type="text" value={form.city} onChange={e=>setForm({...form,city:e.target.value})} /></Field>
        <button onClick={handleSave} className="sd-btn sd-btn-primary" disabled={saving} style={{alignSelf:'flex-start'}}>{saving ? 'بيحفظ...' : 'حفظ التعديلات'}</button>
      </div>
    </section>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="sd-modal-overlay" onClick={onClose}>
      <div className="sd-modal" onClick={e=>e.stopPropagation()} dir="rtl">
        <div className="sd-modal-head"><h3>{title}</h3><button onClick={onClose} className="sd-modal-close">✕</button></div>
        {children}
      </div>
    </div>
  )
}

const styles = `
.sd { min-height: 100vh; background: #FAFAF7; color: #0A0A0A; font-family: var(--font-cairo), system-ui, sans-serif; }
.sd * { box-sizing: border-box; }
.sd a { text-decoration: none; color: inherit; }
.sd-loading { min-height: 100vh; display: grid; place-items: center; background: #FAFAF7; }
.sd-spinner { width: 36px; height: 36px; border: 3px solid #E7F1ED; border-top-color: #2B4521; border-radius: 50%; animation: sd-spin 1s linear infinite; }
@keyframes sd-spin { to { transform: rotate(360deg); } }
.sd-msg { min-height: 100vh; display: grid; place-items: center; padding: 20px; background: #FAFAF7; }
.sd-card { background: white; border-radius: 16px; padding: 32px; max-width: 420px; text-align: center; box-shadow: 0 8px 32px -10px rgba(16,40,34,.15); }
.sd-card h2 { font-size: 20px; font-weight: 800; margin: 0 0 10px; }
.sd-card p { color: #41504A; line-height: 1.6; margin: 0 0 20px; font-size: 14px; }
.sd-header { background: white; border-bottom: 1px solid rgba(10,10,10,.06); position: sticky; top: 0; z-index: 10; }
.sd-header-inner { max-width: 1100px; margin: 0 auto; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.sd-brand { display: flex; align-items: center; gap: 12px; }
.sd-logo { width: 44px; height: 44px; border-radius: 12px; object-fit: cover; }
.sd-logo-placeholder { background: linear-gradient(135deg, #D4A017, #2FA084, #2B4521); color: white; display: grid; place-items: center; font-weight: 800; font-size: 20px; }
.sd-brand h1 { font-size: 18px; font-weight: 800; margin: 0; }
.sd-brand p { font-size: 12px; color: #7C8A84; font-weight: 600; margin: 2px 0 0; }
.sd-header-actions { display: flex; align-items: center; gap: 10px; }
.sd-link { font-size: 13px; color: #7C8A84; font-weight: 600; }
.sd-link:hover { color: #2B4521; }
.sd-tabs { max-width: 1100px; margin: 0 auto; padding: 0 20px; display: flex; gap: 4px; border-bottom: 1px solid rgba(10,10,10,.06); overflow-x: auto; background: white; }
.sd-tab { background: none; border: none; padding: 14px 16px; font-size: 13.5px; font-weight: 700; color: #7C8A84; cursor: pointer; border-bottom: 2px solid transparent; white-space: nowrap; font-family: inherit; }
.sd-tab:hover { color: #2B4521; }
.sd-tab.on { color: #2B4521; border-bottom-color: #2B4521; }
.sd-main { max-width: 1100px; margin: 0 auto; padding: 24px 20px; }
.sd-stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 28px; }
@media (max-width: 768px) { .sd-stats { grid-template-columns: repeat(2, 1fr); } }
.sd-stat { background: white; border: 1px solid rgba(10,10,10,.06); border-radius: 12px; padding: 14px 16px; }
.sd-stat-num { font-size: 22px; font-weight: 800; color: #2B4521; }
.sd-stat-lbl { font-size: 11px; color: #7C8A84; font-weight: 700; margin-top: 4px; }
.sd-getstarted { background: white; border-radius: 16px; padding: 22px; margin-bottom: 20px; border: 1px solid rgba(10,10,10,.06); }
.sd-getstarted h2 { font-size: 16px; font-weight: 800; margin: 0 0 14px; }
.sd-step { width: 100%; display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: #FAFAF7; border-radius: 12px; border: 1px solid transparent; margin-bottom: 8px; cursor: pointer; transition: .15s; text-align: right; font-family: inherit; }
.sd-step:hover { background: #F3F1EA; border-color: rgba(43, 69, 33,.2); }
.sd-step.done { background: #D1FAE5; opacity: .8; }
.sd-step-num { width: 28px; height: 28px; border-radius: 50%; background: white; display: grid; place-items: center; font-weight: 800; font-size: 13px; color: #2B4521; border: 1px solid rgba(43, 69, 33,.2); flex: none; }
.sd-step.done .sd-step-num { background: #2B4521; color: white; }
.sd-step > span:nth-child(2) { flex: 1; font-size: 13.5px; font-weight: 700; }
.sd-step-arrow { color: #2B4521; font-weight: 800; }
.sd-callout { background: linear-gradient(135deg, rgba(212,160,23,.08), rgba(47,160,132,.08)); border: 1px solid rgba(43, 69, 33,.15); border-radius: 16px; padding: 22px; }
.sd-callout h3 { font-size: 16px; font-weight: 800; margin: 0 0 8px; }
.sd-callout p { color: #41504A; line-height: 1.7; margin: 0 0 14px; font-size: 13.5px; }
.sd-section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.sd-section-head h2 { font-size: 18px; font-weight: 800; margin: 0; }
.sd-empty { background: white; border-radius: 12px; padding: 32px; text-align: center; color: #7C8A84; font-size: 13.5px; border: 2px dashed rgba(10,10,10,.08); }
.sd-list { display: flex; flex-direction: column; gap: 8px; }
.sd-row { background: white; border-radius: 12px; padding: 14px 16px; display: flex; align-items: center; gap: 14px; border: 1px solid rgba(10,10,10,.04); }
.sd-row-avatar { width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #E7F1ED, #FAFAF7); display: grid; place-items: center; font-weight: 800; font-size: 16px; color: #2B4521; flex: none; }
.sd-row-main { flex: 1; min-width: 0; }
.sd-row-main h3 { font-size: 14.5px; font-weight: 800; margin: 0 0 4px; }
.sd-row-meta { display: flex; flex-wrap: wrap; gap: 8px 14px; font-size: 12px; color: #7C8A84; font-weight: 600; }
.sd-row-meta .sd-price { color: #2B4521; font-weight: 800; }
.sd-desc { font-size: 12.5px; color: #41504A; margin: 6px 0 0; line-height: 1.5; }
.sd-btn { font-family: inherit; font-size: 13px; font-weight: 700; padding: 9px 16px; border-radius: 10px; border: 1px solid transparent; cursor: pointer; transition: .15s; background: white; color: #0A0A0A; }
.sd-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 10px -3px rgba(0,0,0,.1); }
.sd-btn:disabled { opacity: .5; cursor: not-allowed; }
.sd-btn-sm { font-size: 12px; padding: 7px 12px; }
.sd-btn-primary { background: #2B4521; color: white; }
.sd-btn-primary:hover { background: #175C4F; }
.sd-btn-outline { border-color: rgba(43, 69, 33,.3); color: #2B4521; }
.sd-btn-danger { background: #FEE2E2; color: #991B1B; }
.sd-modal-overlay { position: fixed; inset: 0; background: rgba(10,10,10,.5); display: grid; place-items: center; padding: 20px; z-index: 50; }
.sd-modal { background: white; border-radius: 16px; max-width: 540px; width: 100%; max-height: 90vh; overflow-y: auto; }
.sd-modal-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid rgba(10,10,10,.06); position: sticky; top: 0; background: white; }
.sd-modal-head h3 { margin: 0; font-size: 16px; font-weight: 800; }
.sd-modal-close { background: none; border: none; font-size: 18px; cursor: pointer; color: #7C8A84; padding: 4px 8px; }
.sd-modal-actions { display: flex; gap: 8px; padding: 14px 20px; border-top: 1px solid rgba(10,10,10,.06); position: sticky; bottom: 0; background: white; }
.sd-form { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
.sd-settings-form { background: white; border-radius: 16px; border: 1px solid rgba(10,10,10,.06); }
.sd-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 540px) { .sd-form-row { grid-template-columns: 1fr; } }
.sd-form-divider { font-size: 11px; font-weight: 800; color: #2B4521; letter-spacing: .08em; padding: 8px 0 0; border-top: 1px dashed rgba(10,10,10,.1); margin-top: 4px; }
.sd-field { display: flex; flex-direction: column; gap: 5px; }
.sd-field-label { font-size: 12px; font-weight: 700; color: #7C8A84; }
.sd-field input, .sd-field select, .sd-field textarea { font-family: inherit; font-size: 14px; padding: 10px 12px; border: 1px solid rgba(10,10,10,.1); border-radius: 10px; background: white; color: #0A0A0A; resize: vertical; }
.sd-field input:focus, .sd-field select:focus, .sd-field textarea:focus { outline: 2px solid #2B4521; border-color: #2B4521; }
`
