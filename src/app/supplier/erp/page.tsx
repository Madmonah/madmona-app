'use client'
// ============================================================================
// 🏛️ /supplier/erp — صفحة الـERP الكاملة — لأي بيزنس
//
// (١ سبتمبر ٢٠٢٦) محمد: «لوحة التحكم بتاعت مضمونة تبقى فيها كل ما يخص
//   البيزنس بتاعنا أو بتاع غيرنا (حسابات · قيود · موظفين · مخزون · منتج …)
//   الصفحة بتاعت الـERP كاملة وجواها موديول الـCRM».
//
// 🎯 صفحة واحدة · تابات · بيانات من erp_dashboard() في نداء واحد.
//    نفس الصفحة لمضمونة (كأدمن) ولأي صاحب بيزنس — بس البيانات بتاعته.
//    ?business=<id> يخلّي الأدمن يشوف بيزنس تاني.
// ============================================================================
import { useEffect, useState, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  Loader2, Wallet, Users, Package, ShoppingBag, Phone, LayoutDashboard,
  TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Clock, ArrowLeft,
  BookOpen, Building2, ChevronLeft,
} from 'lucide-react'

type Dash = {
  ok: boolean; error?: string
  business: { id: string; name: string; logo: string | null; industry: string | null; is_platform: boolean }
  finance: { accounts: number; revenue_month: number; expense_month: number; entries_month: number; entries_draft: number; cash: number }
  journal: Array<{ id: string; no: string | null; date: string; memo: string | null; amount: number; status: string }>
  employees: { total: number; present_today: number; tasks_today: number; tasks_done: number
    list: Array<{ id: string; name: string; role: string | null; tasks: number; done: number; present: boolean }> }
  inventory: { products: number; low_stock: number; value: number; movements_month: number
    list: Array<{ id: string; name: string; sku: string | null; qty: number | null; reorder: number | null; cost: number | null; price: number | null; unit: string | null }> }
  products: { listings: number; orders_month: number; bookings_month: number }
  crm: { contacts: number; leads_new: number; interested: number; calls_today: number; calls_month: number
    followups_due: number; customers: number
    recent: Array<{ name: string | null; phone: string; status: string; last: string | null; next: string | null }> }
}

type Tab = 'overview' | 'finance' | 'staff' | 'inventory' | 'products' | 'crm'

const TABS: Array<{ key: Tab; label: string; icon: React.ElementType }> = [
  { key: 'overview',  label: 'نظرة عامة', icon: LayoutDashboard },
  { key: 'finance',   label: 'الحسابات',  icon: Wallet },
  { key: 'staff',     label: 'الموظفين',  icon: Users },
  { key: 'inventory', label: 'المخزون',   icon: Package },
  { key: 'products',  label: 'المنتجات',  icon: ShoppingBag },
  { key: 'crm',       label: 'العملاء',   icon: Phone },
]

const EGP = (n: number) => new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 0 }).format(n)
const N = (n: number) => new Intl.NumberFormat('ar-EG').format(n)

// ── الألوان: أخضر مضمونة للنجاح · كهرماني للتنبيه · أحمر للنقص ──
const INK = '#1F2A24'
const MUTED = '#6B7770'
const LINE = '#E3E8E4'
const GREEN = '#0F7A4F'
const GREEN_BG = '#E6F4EC'
const AMBER = '#9A6400'
const AMBER_BG = '#FBF1DC'
const RED = '#A32D2D'
const RED_BG = '#FCEBEB'

export default function ErpPage() {
  return (
    <Suspense fallback={
      <div dir="rtl" style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
        <Loader2 className="animate-spin" size={28} color={GREEN} />
      </div>
    }>
      <ErpInner />
    </Suspense>
  )
}

function ErpInner() {
  const sp = useSearchParams()
  const businessParam = sp?.get('business') || null
  const [tab, setTab] = useState<Tab>('overview')
  const [d, setD] = useState<Dash | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setErr(null)
    try {
      const { data, error } = await (supabaseBrowser.rpc as unknown as (
        f: string, a?: Record<string, unknown>,
      ) => Promise<{ data: Dash | null; error: { message: string } | null }>)(
        'erp_dashboard', businessParam ? { p_supplier: businessParam } : {})
      if (error) throw new Error(error.message)
      if (!data?.ok) throw new Error(data?.error || 'مفيش بيانات')
      setD(data)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'حصل خطأ')
    } finally { setLoading(false) }
  }, [businessParam])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div dir="rtl" style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
        <Loader2 className="animate-spin" size={28} color={GREEN} />
      </div>
    )
  }

  if (err || !d) {
    return (
      <div dir="rtl" style={{ maxWidth: 480, margin: '80px auto', padding: 24, textAlign: 'center' }}>
        <AlertCircle size={36} color={RED} style={{ margin: '0 auto 12px' }} />
        <p style={{ fontSize: 15, fontWeight: 700, color: INK, margin: '0 0 6px' }}>{err || 'مفيش بيانات'}</p>
        <Link href="/auth/login?redirect=/supplier/erp" style={{ color: GREEN, fontSize: 13 }}>سجّل دخولك</Link>
      </div>
    )
  }

  const { business: b, finance: f, employees: e, inventory: inv, products: p, crm: c } = d
  const net = f.revenue_month - f.expense_month
  const taskPct = e.tasks_today ? Math.round(100 * e.tasks_done / e.tasks_today) : 0

  return (
    <div dir="rtl" style={{ minHeight: '100dvh', background: '#F7F9F7', color: INK, fontFamily: 'inherit' }}>
      {/* ── رأس البيزنس ── */}
      <header style={{ background: '#fff', borderBottom: `1px solid ${LINE}`, padding: '14px 16px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {b.logo
            ? <img src={b.logo} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', border: `1px solid ${LINE}` }} />
            : <div style={{ width: 44, height: 44, borderRadius: 10, background: GREEN_BG, display: 'grid', placeItems: 'center' }}>
                <Building2 size={20} color={GREEN} />
              </div>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 17, fontWeight: 800, margin: 0, lineHeight: 1.2 }}>{b.name}</h1>
            <p style={{ fontSize: 12, color: MUTED, margin: '2px 0 0' }}>
              {b.is_platform ? 'لوحة المنصة' : (b.industry || 'نظام الإدارة')}
            </p>
          </div>
          {b.is_platform && (
            <Link href="/admin/company" style={{ fontSize: 12, color: GREEN, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
              الإدارة الكاملة <ChevronLeft size={14} />
            </Link>
          )}
        </div>

        {/* ── التابات ── */}
        <nav style={{ maxWidth: 1080, margin: '12px auto 0', display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 2 }}>
          {TABS.map(t => {
            const Icon = t.icon; const active = tab === t.key
            return (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10,
                border: 'none', background: active ? INK : 'transparent', color: active ? '#fff' : MUTED,
                fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
                <Icon size={15} /> {t.label}
              </button>
            )
          })}
        </nav>
      </header>

      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '18px 16px 60px' }}>

        {/* ═══ نظرة عامة ═══ */}
        {tab === 'overview' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
              <Stat label="صافي الشهر" value={`${EGP(net)} ج`} tone={net >= 0 ? 'green' : 'red'} icon={net >= 0 ? TrendingUp : TrendingDown} />
              <Stat label="الكاش" value={`${EGP(f.cash)} ج`} icon={Wallet} />
              <Stat label="حاضر النهاردة" value={`${N(e.present_today)} / ${N(e.total)}`} icon={Users} />
              <Stat label="إنجاز التاسكات" value={`${taskPct}٪`} tone={taskPct >= 60 ? 'green' : taskPct >= 30 ? 'amber' : 'red'} icon={CheckCircle2} />
              <Stat label="متابعات مستحقة" value={N(c.followups_due)} tone={c.followups_due > 0 ? 'amber' : undefined} icon={Clock} />
              <Stat label="نقص مخزون" value={N(inv.low_stock)} tone={inv.low_stock > 0 ? 'red' : undefined} icon={Package} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14, marginTop: 18 }}>
              <Panel title="الموظفين النهاردة" action={() => setTab('staff')}>
                {e.list.length === 0 ? <Empty text="مفيش موظفين" /> : e.list.slice(0, 6).map(m => (
                  <Row key={m.id}>
                    <Dot on={m.present} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{m.name.split(' ').slice(0, 2).join(' ')}</span>
                    <span style={{ fontSize: 12, color: MUTED }}>{m.done}/{m.tasks}</span>
                  </Row>
                ))}
              </Panel>

              <Panel title="آخر القيود" action={() => setTab('finance')}>
                {d.journal.length === 0 ? <Empty text="مفيش قيود الشهر ده" /> : d.journal.slice(0, 6).map(j => (
                  <Row key={j.id}>
                    <span style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.memo || `قيد ${j.no || ''}`}</span>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{EGP(j.amount)} ج</span>
                  </Row>
                ))}
              </Panel>

              <Panel title="آخر العملاء" action={() => setTab('crm')}>
                {c.recent.length === 0 ? <Empty text="مفيش عملاء لسه" /> : c.recent.slice(0, 6).map((r, i) => (
                  <Row key={i}>
                    <Status s={r.status} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{r.name || r.phone}</span>
                  </Row>
                ))}
              </Panel>
            </div>
          </>
        )}

        {/* ═══ الحسابات ═══ */}
        {tab === 'finance' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
              <Stat label="إيرادات الشهر" value={`${EGP(f.revenue_month)} ج`} tone="green" />
              <Stat label="مصروفات الشهر" value={`${EGP(f.expense_month)} ج`} tone="red" />
              <Stat label="الصافي" value={`${EGP(net)} ج`} tone={net >= 0 ? 'green' : 'red'} />
              <Stat label="الكاش" value={`${EGP(f.cash)} ج`} />
              <Stat label="دليل الحسابات" value={N(f.accounts)} />
              <Stat label="قيود مسودّة" value={N(f.entries_draft)} tone={f.entries_draft > 0 ? 'amber' : undefined} />
            </div>
            <Panel title="القيود" style={{ marginTop: 18 }} link="/supplier/erp/accounting" linkLabel="دفتر اليومية الكامل">
              {d.journal.length === 0 ? <Empty text="مفيش قيود — ابدأ بتسجيل أول قيد" /> : (
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <thead><tr style={{ color: MUTED, fontSize: 11.5 }}>
                    <th style={th}>التاريخ</th><th style={th}>البيان</th><th style={{ ...th, textAlign: 'left' }}>المبلغ</th><th style={th}>الحالة</th>
                  </tr></thead>
                  <tbody>{d.journal.map(j => (
                    <tr key={j.id} style={{ borderTop: `1px solid ${LINE}` }}>
                      <td style={td}>{new Date(j.date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}</td>
                      <td style={td}>{j.memo || `قيد ${j.no || ''}`}</td>
                      <td style={{ ...td, textAlign: 'left', fontWeight: 700 }}>{EGP(j.amount)}</td>
                      <td style={td}><Pill text={j.status === 'posted' ? 'مرحّل' : 'مسودّة'} tone={j.status === 'posted' ? 'green' : 'amber'} /></td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </Panel>
          </>
        )}

        {/* ═══ الموظفين ═══ */}
        {tab === 'staff' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
              <Stat label="الفريق" value={N(e.total)} />
              <Stat label="حاضر" value={N(e.present_today)} tone={e.present_today >= e.total * 0.7 ? 'green' : 'amber'} />
              <Stat label="تاسكات النهاردة" value={N(e.tasks_today)} />
              <Stat label="خلّصت" value={`${N(e.tasks_done)} (${taskPct}٪)`} tone={taskPct >= 60 ? 'green' : 'amber'} />
            </div>
            <Panel title="الفريق" style={{ marginTop: 18 }} link={b.is_platform ? '/admin/staff' : undefined} linkLabel="إدارة الفريق">
              {e.list.map(m => {
                const pct = m.tasks ? Math.round(100 * m.done / m.tasks) : 0
                return (
                  <Row key={m.id}>
                    <Dot on={m.present} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700 }}>{m.name}</p>
                      <p style={{ margin: 0, fontSize: 11.5, color: MUTED }}>{m.role || '—'}</p>
                    </div>
                    <div style={{ width: 110 }}>
                      <div style={{ height: 5, background: LINE, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: pct >= 60 ? GREEN : pct >= 30 ? AMBER : RED }} />
                      </div>
                      <p style={{ margin: '3px 0 0', fontSize: 11, color: MUTED, textAlign: 'left' }}>{m.done}/{m.tasks} تاسك</p>
                    </div>
                  </Row>
                )
              })}
            </Panel>
          </>
        )}

        {/* ═══ المخزون ═══ */}
        {tab === 'inventory' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
              <Stat label="أصناف" value={N(inv.products)} />
              <Stat label="نقص" value={N(inv.low_stock)} tone={inv.low_stock > 0 ? 'red' : 'green'} />
              <Stat label="قيمة المخزون" value={`${EGP(inv.value)} ج`} />
              <Stat label="حركات الشهر" value={N(inv.movements_month)} />
            </div>
            <Panel title="الأصناف" style={{ marginTop: 18 }} link="/supplier/erp/materials" linkLabel="إدارة المخزون">
              {inv.list.length === 0 ? <Empty text="مفيش أصناف — أضف أول صنف" /> : (
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <thead><tr style={{ color: MUTED, fontSize: 11.5 }}>
                    <th style={th}>الصنف</th><th style={{ ...th, textAlign: 'center' }}>الكمية</th><th style={{ ...th, textAlign: 'left' }}>التكلفة</th><th style={{ ...th, textAlign: 'left' }}>البيع</th>
                  </tr></thead>
                  <tbody>{inv.list.map(it => {
                    const low = it.qty != null && it.reorder != null && it.qty <= it.reorder
                    return (
                      <tr key={it.id} style={{ borderTop: `1px solid ${LINE}` }}>
                        <td style={td}>{it.name}{it.sku && <span style={{ color: MUTED, fontSize: 11, marginRight: 6 }}>{it.sku}</span>}</td>
                        <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: low ? RED : INK }}>{it.qty ?? '—'} {it.unit || ''}</td>
                        <td style={{ ...td, textAlign: 'left' }}>{it.cost != null ? EGP(it.cost) : '—'}</td>
                        <td style={{ ...td, textAlign: 'left' }}>{it.price != null ? EGP(it.price) : '—'}</td>
                      </tr>
                    )
                  })}</tbody>
                </table>
              )}
            </Panel>
          </>
        )}

        {/* ═══ المنتجات ═══ */}
        {tab === 'products' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
              <Stat label="إعلانات منشورة" value={N(p.listings)} tone="green" />
              <Stat label="طلبات الشهر" value={N(p.orders_month)} />
              <Stat label="حجوزات الشهر" value={N(p.bookings_month)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginTop: 18 }}>
              <Shortcut href={b.is_platform ? '/admin/listings' : '/supplier/erp/products'} label="الإعلانات والمنتجات" desc="اللي معروض في الماركت بليس" icon={ShoppingBag} />
              <Shortcut href="/supplier/erp/catalog" label="الكتالوج" desc="المنتجات والخدمات القابلة للبيع" icon={BookOpen} />
              {b.is_platform && <Shortcut href="/real-estate/market" label="البورصة العقارية" desc="مشاريع المطوّرين" icon={Building2} />}
            </div>
          </>
        )}

        {/* ═══ CRM ═══ */}
        {tab === 'crm' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
              <Stat label="كل الأرقام" value={N(c.contacts)} />
              <Stat label="جديد" value={N(c.leads_new)} />
              <Stat label="مهتم" value={N(c.interested)} tone="green" />
              <Stat label="متابعات مستحقة" value={N(c.followups_due)} tone={c.followups_due > 0 ? 'amber' : undefined} />
              <Stat label="مكالمات النهاردة" value={N(c.calls_today)} />
              <Stat label="مكالمات الشهر" value={N(c.calls_month)} />
              <Stat label="عملاء فعليين" value={N(c.customers)} tone="green" />
            </div>
            <Panel title="آخر التواصل" style={{ marginTop: 18 }} link={b.is_platform ? '/crm' : '/supplier/erp/crm'} linkLabel="مكالماتي والعملاء">
              {c.recent.length === 0 ? <Empty text="مفيش أرقام لسه — ابدأ بإضافة عميل" /> : c.recent.map((r, i) => (
                <Row key={i}>
                  <Status s={r.status} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700 }}>{r.name || r.phone}</p>
                    <p style={{ margin: 0, fontSize: 11.5, color: MUTED }}>
                      {r.last ? `آخر تواصل ${ago(r.last)}` : 'ماتكلمش لسه'}
                      {r.next && ` · متابعة ${ago(r.next)}`}
                    </p>
                  </div>
                </Row>
              ))}
            </Panel>
          </>
        )}
      </main>
    </div>
  )
}

/* ── مكوّنات صغيرة ── */
function Stat({ label, value, tone, icon: Icon }: { label: string; value: string; tone?: 'green' | 'amber' | 'red'; icon?: React.ElementType }) {
  const col = tone === 'green' ? GREEN : tone === 'amber' ? AMBER : tone === 'red' ? RED : INK
  const bg = tone === 'green' ? GREEN_BG : tone === 'amber' ? AMBER_BG : tone === 'red' ? RED_BG : '#fff'
  return (
    <div style={{ background: bg, border: `1px solid ${tone ? 'transparent' : LINE}`, borderRadius: 12, padding: '12px 14px' }}>
      <p style={{ margin: 0, fontSize: 11.5, color: tone ? col : MUTED, display: 'flex', alignItems: 'center', gap: 5 }}>
        {Icon && <Icon size={13} />}{label}
      </p>
      <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 800, color: col, lineHeight: 1.1 }}>{value}</p>
    </div>
  )
}
function Panel({ title, children, action, link, linkLabel, style }: {
  title: string; children: React.ReactNode; action?: () => void; link?: string; linkLabel?: string; style?: React.CSSProperties
}) {
  return (
    <section style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 12, padding: '12px 14px', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 style={{ fontSize: 13.5, fontWeight: 800, margin: 0 }}>{title}</h2>
        {action && <button onClick={action} style={{ background: 'none', border: 'none', color: GREEN, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>الكل <ChevronLeft size={13} /></button>}
        {link && <Link href={link} style={{ color: GREEN, fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>{linkLabel} <ArrowLeft size={13} /></Link>}
      </div>
      {children}
    </section>
  )
}
function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: `1px solid ${LINE}` }}>{children}</div>
}
function Dot({ on }: { on: boolean }) {
  return <span style={{ width: 8, height: 8, borderRadius: '50%', background: on ? GREEN : '#C9D1CC', flexShrink: 0 }} />
}
function Pill({ text, tone }: { text: string; tone: 'green' | 'amber' | 'red' }) {
  const col = tone === 'green' ? GREEN : tone === 'amber' ? AMBER : RED
  const bg = tone === 'green' ? GREEN_BG : tone === 'amber' ? AMBER_BG : RED_BG
  return <span style={{ fontSize: 11, fontWeight: 700, color: col, background: bg, padding: '2px 8px', borderRadius: 8 }}>{text}</span>
}
function Status({ s }: { s: string }) {
  const map: Record<string, ['green' | 'amber' | 'red', string]> = {
    interested: ['green', 'مهتم'], won: ['green', 'اتفق'], contacted: ['amber', 'اتكلّم'],
    new: ['amber', 'جديد'], lost: ['red', 'رفض'], spam: ['red', 'غلط'],
  }
  const [tone, label] = map[s] || ['amber', s]
  return <Pill text={label} tone={tone} />
}
function Empty({ text }: { text: string }) {
  return <p style={{ fontSize: 12.5, color: MUTED, margin: '10px 0', textAlign: 'center' }}>{text}</p>
}
function Shortcut({ href, label, desc, icon: Icon }: { href: string; label: string; desc: string; icon: React.ElementType }) {
  return (
    <Link href={href} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 12, padding: '12px 14px', textDecoration: 'none', color: INK }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: GREEN_BG, display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon size={18} color={GREEN} /></div>
      <div style={{ flex: 1, minWidth: 0 }}><p style={{ margin: 0, fontSize: 13.5, fontWeight: 700 }}>{label}</p><p style={{ margin: 0, fontSize: 11.5, color: MUTED }}>{desc}</p></div>
      <ChevronLeft size={16} color={MUTED} />
    </Link>
  )
}
function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 0) return `بعد ${Math.abs(m) < 60 ? Math.abs(m) + ' د' : Math.round(Math.abs(m) / 60) + ' س'}`
  if (m < 60) return `من ${m} د`
  if (m < 1440) return `من ${Math.round(m / 60)} س`
  return `من ${Math.round(m / 1440)} يوم`
}
const th: React.CSSProperties = { textAlign: 'right', padding: '6px 4px', fontWeight: 600 }
const td: React.CSSProperties = { padding: '8px 4px' }
