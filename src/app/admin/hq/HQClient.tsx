'use client'

// src/app/admin/hq/HQClient.tsx
// Master Admin Panel — comprehensive: dashboard + marketplace + AI OS + ops

import { useState } from 'react'

interface KPIs {
  totalGMV: number; monthGMV: number
  totalCommission: number; monthCommission: number
  totalBookings: number; monthBookings: number
  pendingBookings: number; confirmedBookings: number
  completedBookings: number; cancelledBookings: number
  totalCustomers: number; approvedSuppliers: number; pendingSuppliers: number
  publishedListings: number; draftListings: number
  totalReviews: number; averageRating: number
  pushSubscribers: number; leadsCount: number
  notificationsCount: number; categoriesCount: number
}

interface HQData {
  agents: Array<Record<string, unknown>>
  runs24hCount: number
  recentRuns: Array<Record<string, unknown>>
  runs24hList: Array<Record<string, unknown>>
  ads: Array<Record<string, unknown>>
  reels: Array<Record<string, unknown>>
  qc: Array<Record<string, unknown>>
  briefs: Array<Record<string, unknown>>
  plays: Array<Record<string, unknown>>
  insights: Array<Record<string, unknown>>
  fraud: Array<Record<string, unknown>>
  demand: Array<Record<string, unknown>>
  partnerships: Array<Record<string, unknown>>
  pricing: Array<Record<string, unknown>>
  promptVersions: Array<Record<string, unknown>>
  collabs: Array<Record<string, unknown>>
  messages: Array<Record<string, unknown>>
  customerSuccess: Array<Record<string, unknown>>
  emailResponses: Array<Record<string, unknown>>
  photoBriefs: Array<Record<string, unknown>>
  content: Array<Record<string, unknown>>
  complaints: Array<Record<string, unknown>>
  kpis: KPIs
  bookingsRecent: Array<Record<string, unknown>>
  suppliers: Array<Record<string, unknown>>
  topListings: Array<Record<string, unknown>>
  leadsRecent: Array<Record<string, unknown>>
  payouts: Array<Record<string, unknown>>
  categories: Array<Record<string, unknown>>
}

type TabId =
  | 'dashboard' | 'marketplace' | 'agents' | 'creative'
  | 'intelligence' | 'growth' | 'support' | 'self-improve'
  | 'collaborations' | 'tools'

const TABS: Array<{ id: TabId; label: string; icon: string; color: string }> = [
  { id: 'dashboard', label: 'لوحة القيادة', icon: '📊', color: '#1F5F3F' },
  { id: 'marketplace', label: 'السوق', icon: '🏪', color: '#1F5F3F' },
  { id: 'agents', label: 'الـ Agents', icon: '🤖', color: '#2c3e50' },
  { id: 'creative', label: 'إبداع', icon: '🎨', color: '#C2410C' },
  { id: 'intelligence', label: 'ذكاء البيانات', icon: '🧠', color: '#0EA5E9' },
  { id: 'growth', label: 'نمو', icon: '🚀', color: '#10B981' },
  { id: 'support', label: 'دعم', icon: '🛠️', color: '#8B5CF6' },
  { id: 'self-improve', label: 'تحسين ذاتي', icon: '🔧', color: '#B8860B' },
  { id: 'collaborations', label: 'تعاون', icon: '🎯', color: '#1F5F3F' },
  { id: 'tools', label: 'أدوات', icon: '⚙️', color: '#666' },
]

export default function HQClient({ data }: { data: HQData }) {
  const [tab, setTab] = useState<TabId>('dashboard')

  const enabledAgents = data.agents.filter(a => a.enabled).length
  const successRate = data.runs24hList.length > 0
    ? Math.round((data.runs24hList.filter(r => r.status === 'success').length / data.runs24hList.length) * 100)
    : 0
  const newInsights = data.insights.filter(i => i.status === 'new').length
  const highPriority = data.insights.filter(i => i.status === 'new' && i.priority === 'high').length
  const pendingPrompts = data.promptVersions.filter(p => !p.is_active).length
  const activeCollabs = data.collabs.filter(c => c.status === 'active').length
  const criticalFraud = data.fraud.filter(f => f.severity === 'critical' || f.severity === 'high').length

  return (
    <div dir="rtl" style={{ fontFamily: 'Tahoma, Arial', background: '#FAF7F0', minHeight: '100vh' }}>
      {/* Header */}
      <header style={{
        background: '#1F5F3F', color: '#FAF7F0',
        padding: '14px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 'bold' }}>👑 مضمونة HQ</h1>
          <p style={{ margin: '2px 0 0', fontSize: 10, opacity: 0.85 }}>
            {data.kpis.publishedListings} إعلان · {data.kpis.approvedSuppliers} مؤجر · {enabledAgents}/{data.agents.length} agent · {successRate}% نجاح
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {(highPriority + pendingPrompts + criticalFraud + data.kpis.pendingSuppliers + data.kpis.pendingBookings) > 0 && (
            <div style={{
              background: '#C2410C', padding: '4px 10px',
              borderRadius: 6, fontSize: 11, fontWeight: 'bold',
            }}>
              🚨 {highPriority + pendingPrompts + criticalFraud + data.kpis.pendingSuppliers + data.kpis.pendingBookings} alerts
            </div>
          )}
          <a href="/account" style={{
            color: '#FAF7F0', textDecoration: 'none', fontSize: 11,
            background: 'rgba(255,255,255,0.1)', padding: '4px 10px',
            borderRadius: 6,
          }}>
            ← الحساب
          </a>
        </div>
      </header>

      {/* Tabs */}
      <nav style={{
        background: '#fff', padding: '0 16px',
        borderBottom: '1px solid #eee', overflowX: 'auto',
        display: 'flex', whiteSpace: 'nowrap',
        position: 'sticky', top: 60, zIndex: 99,
      }}>
        {TABS.map(t => {
          const isActive = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '12px 14px', background: 'transparent',
                border: 'none', borderBottom: isActive ? `3px solid ${t.color}` : '3px solid transparent',
                color: isActive ? t.color : '#666',
                fontWeight: isActive ? 'bold' : 'normal',
                cursor: 'pointer', fontSize: 12,
                fontFamily: 'inherit',
              }}
            >
              {t.icon} {t.label}
            </button>
          )
        })}
      </nav>

      <main style={{ padding: 20, maxWidth: 1280, margin: '0 auto' }}>
        {tab === 'dashboard' && <DashboardTab data={data} stats={{ enabledAgents, successRate, newInsights, highPriority }} />}
        {tab === 'marketplace' && <MarketplaceTab data={data} />}
        {tab === 'agents' && <AgentsTab agents={data.agents} recentRuns={data.recentRuns} />}
        {tab === 'creative' && <CreativeTab ads={data.ads} reels={data.reels} content={data.content} />}
        {tab === 'intelligence' && <IntelligenceTab fraud={data.fraud} demand={data.demand} pricing={data.pricing} qc={data.qc} />}
        {tab === 'growth' && <GrowthTab partnerships={data.partnerships} customerSuccess={data.customerSuccess} photoBriefs={data.photoBriefs} leadsRecent={data.leadsRecent} />}
        {tab === 'support' && <SupportTab complaints={data.complaints} emails={data.emailResponses} insights={data.insights} />}
        {tab === 'self-improve' && <SelfImproveTab promptVersions={data.promptVersions} recentRuns={data.recentRuns} />}
        {tab === 'collaborations' && <CollaborationsTab collabs={data.collabs} messages={data.messages} activeCollabs={activeCollabs} />}
        {tab === 'tools' && <ToolsTab kpis={data.kpis} categories={data.categories} payouts={data.payouts} />}
      </main>
    </div>
  )
}

// ============================================================
// DASHBOARD TAB — KPIs + alerts + bookings + revenue
// ============================================================
function DashboardTab({ data, stats }: { data: HQData; stats: Record<string, number> }) {
  const k = data.kpis

  return (
    <div>
      {/* HEADLINE METRICS — العمولة + GMV + الحجوزات + العملاء */}
      <h3 style={sectionHeader}>💰 الأرقام الكبرى</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
        <BigMetric
          icon="💎"
          label="عمولة الشهر"
          value={`${k.monthCommission.toLocaleString('ar-EG')} ج`}
          subtitle={`إجمالي: ${k.totalCommission.toLocaleString('ar-EG')} ج`}
          color="#1F5F3F"
        />
        <BigMetric
          icon="📈"
          label="GMV الشهر"
          value={`${k.monthGMV.toLocaleString('ar-EG')} ج`}
          subtitle={`إجمالي: ${k.totalGMV.toLocaleString('ar-EG')} ج`}
          color="#B8860B"
        />
        <BigMetric
          icon="📅"
          label="حجوزات الشهر"
          value={String(k.monthBookings)}
          subtitle={`إجمالي: ${k.totalBookings}`}
          color="#0EA5E9"
        />
        <BigMetric
          icon="👥"
          label="العملاء"
          value={String(k.totalCustomers)}
          subtitle={`${k.pushSubscribers} 🔔 · ${k.leadsCount} lead`}
          color="#8B5CF6"
        />
      </div>

      {/* Alert Banners */}
      {(stats.highPriority > 0 || k.pendingSuppliers > 0 || k.pendingBookings > 0) && (
        <div style={{ marginBottom: 16 }}>
          {k.pendingSuppliers > 0 && (
            <a href="/admin/marketplace-suppliers" style={alertBox('#C2410C') as React.CSSProperties}>
              🟡 <strong>{k.pendingSuppliers} مؤجر</strong> في انتظار الموافقة
            </a>
          )}
          {k.pendingBookings > 0 && (
            <a href="/admin/marketplace-bookings" style={alertBox('#B8860B') as React.CSSProperties}>
              ⏳ <strong>{k.pendingBookings} حجز</strong> في انتظار تأكيد الدفع
            </a>
          )}
          {stats.highPriority > 0 && (
            <div style={alertBox('#7c1d1d')}>
              🚨 <strong>{stats.highPriority} insight</strong> عالي الأولوية — في تاب "دعم"
            </div>
          )}
        </div>
      )}

      {/* Bookings status breakdown */}
      <h3 style={sectionHeader}>📋 توزيع الحجوزات</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
        <StatusBox label="بانتظار" val={k.pendingBookings} color="#B8860B" />
        <StatusBox label="مؤكّد" val={k.confirmedBookings} color="#28a745" />
        <StatusBox label="تمّ" val={k.completedBookings} color="#666" />
        <StatusBox label="ملغي" val={k.cancelledBookings} color="#C2410C" />
        <StatusBox label="تقييم" val={k.averageRating > 0 ? k.averageRating.toFixed(1) + ' ⭐' : '—'} color="#B8860B" subtitle={k.totalReviews > 0 ? `${k.totalReviews} تقييم` : ''} />
      </div>

      {/* Recent bookings + Top listings */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16 }}>
        <div>
          <h3 style={sectionHeader}>📅 آخر الحجوزات</h3>
          <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden' }}>
            {data.bookingsRecent.length === 0 ? <Empty msg="مفيش حجوزات لسه" /> :
              data.bookingsRecent.slice(0, 8).map((b, i) => {
                const status = String(b.status)
                const statusColor = status === 'confirmed' ? '#28a745' : status === 'pending_payment' ? '#B8860B' : status === 'cancelled' ? '#C2410C' : '#666'
                const listing = b.listing as { title?: string } | null
                const supplier = b.supplier as { business_name?: string } | null
                return (
                  <a key={String(b.id)} href={`/bookings/${String(b.id)}`} style={{
                    display: 'block', padding: 12,
                    borderBottom: i < 7 ? '1px solid #eee' : 'none',
                    textDecoration: 'none', color: 'inherit',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: statusColor, fontWeight: 'bold', marginBottom: 2 }}>● {status}</div>
                        <div style={{ fontSize: 13, fontWeight: 'bold' }}>{listing?.title ?? 'إعلان محذوف'}</div>
                        <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>{supplier?.business_name ?? '—'}</div>
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: 14, fontWeight: 'bold', color: '#1F5F3F' }}>{Number(b.total_amount).toLocaleString('ar-EG')} ج</div>
                        <div style={{ fontSize: 10, color: '#999' }}>{new Date(String(b.created_at)).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}</div>
                      </div>
                    </div>
                  </a>
                )
              })}
          </div>
        </div>

        <div>
          <h3 style={sectionHeader}>👀 الأكثر مشاهدة</h3>
          <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden' }}>
            {data.topListings.length === 0 ? <Empty msg="مفيش إعلانات" /> :
              data.topListings.slice(0, 8).map((l, i) => (
                <a key={String(l.id)} href={`/marketplace/${String(l.slug)}`} target="_blank" rel="noopener" style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: 12,
                  borderBottom: i < 7 ? '1px solid #eee' : 'none',
                  textDecoration: 'none', color: 'inherit',
                }}>
                  <span style={{
                    width: 22, height: 22, background: '#1F5F3F', color: '#fff',
                    borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 'bold',
                  }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(l.title)}</div>
                  </div>
                  <div style={{ fontSize: 11, color: '#666' }}>
                    👁 {String(l.views_count)}
                    {l.rating && Number(l.rating) > 0 && ` · ⭐ ${Number(l.rating).toFixed(1)}`}
                  </div>
                </a>
              ))}
          </div>
        </div>
      </div>

      {/* Top insights */}
      {newInsightsHelper(data.insights).length > 0 && (
        <>
          <h3 style={sectionHeader}>💡 أهم الـ Insights</h3>
          <div style={{ display: 'grid', gap: 10 }}>
            {newInsightsHelper(data.insights).slice(0, 3).map((i, idx) => (
              <div key={idx} style={card(i.priority === 'high' ? '#C2410C' : '#0EA5E9')}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: 13 }}>{String(i.title)}</strong>
                  <span style={priorityBadge(String(i.priority))}>{String(i.priority)}</span>
                </div>
                <p style={{ fontSize: 11, color: '#666', margin: '4px 0' }}>{String(i.description ?? '').slice(0, 200)}</p>
                {Boolean(i.recommended_action) && (
                  <div style={{ background: '#FAF7F0', padding: 6, borderRadius: 4, fontSize: 10, color: '#1F5F3F', marginTop: 4 }}>
                    👉 {String(i.recommended_action)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================
// MARKETPLACE TAB — listings, suppliers, bookings, leads
// ============================================================
function MarketplaceTab({ data }: { data: HQData }) {
  const [sub, setSub] = useState<'listings' | 'suppliers' | 'bookings' | 'leads'>('listings')
  const k = data.kpis

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <FilterBtn label={`📦 إعلانات (${k.publishedListings})`} active={sub === 'listings'} onClick={() => setSub('listings')} />
        <FilterBtn label={`👨‍💼 مؤجرين (${k.approvedSuppliers}+${k.pendingSuppliers})`} active={sub === 'suppliers'} onClick={() => setSub('suppliers')} />
        <FilterBtn label={`📅 حجوزات (${k.totalBookings})`} active={sub === 'bookings'} onClick={() => setSub('bookings')} />
        <FilterBtn label={`🎯 Leads (${k.leadsCount})`} active={sub === 'leads'} onClick={() => setSub('leads')} />
      </div>

      {sub === 'listings' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
            <StatusBox label="منشورة" val={k.publishedListings} color="#28a745" />
            <StatusBox label="مسودات" val={k.draftListings} color="#B8860B" />
            <StatusBox label="فئات" val={k.categoriesCount} color="#0EA5E9" />
          </div>
          <h4 style={{ ...sectionHeader, marginTop: 12 }}>👀 الأكثر مشاهدة</h4>
          <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#1F5F3F', color: '#FAF7F0' }}>
                  <th style={th}>العنوان</th>
                  <th style={th}>مشاهدات</th>
                  <th style={th}>حجوزات</th>
                  <th style={th}>تقييم</th>
                  <th style={th}>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {data.topListings.map((l, i) => (
                  <tr key={String(l.id)} style={{ borderBottom: '1px solid #eee', background: i % 2 === 0 ? '#fff' : '#FAF7F0' }}>
                    <td style={td}><strong>{String(l.title).slice(0, 60)}</strong></td>
                    <td style={td}>👁 {String(l.views_count)}</td>
                    <td style={td}>📅 {String(l.bookings_count ?? 0)}</td>
                    <td style={td}>{l.rating && Number(l.rating) > 0 ? `⭐ ${Number(l.rating).toFixed(1)}` : '—'}</td>
                    <td style={td}>
                      <a href={`/marketplace/${String(l.slug)}`} target="_blank" rel="noopener" style={linkBtn}>عرض ↗</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 12 }}>
            <a href="/admin/listings" style={primaryBtn}>📦 إدارة كل الإعلانات</a>
            <a href="/supplier/marketplace/new" style={{ ...primaryBtn, background: '#B8860B', marginRight: 8 }}>➕ إضافة إعلان جديد</a>
          </div>
        </div>
      )}

      {sub === 'suppliers' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
            <StatusBox label="معتمدين" val={k.approvedSuppliers} color="#28a745" />
            <StatusBox label="معلّقين" val={k.pendingSuppliers} color="#C2410C" />
          </div>

          {k.pendingSuppliers > 0 && (
            <div style={alertBox('#C2410C')}>
              🟡 <strong>{k.pendingSuppliers} مؤجر</strong> في انتظار الموافقة
            </div>
          )}

          <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#1F5F3F', color: '#FAF7F0' }}>
                  <th style={th}>الاسم التجاري</th>
                  <th style={th}>النوع</th>
                  <th style={th}>الحالة</th>
                  <th style={th}>تاريخ التسجيل</th>
                </tr>
              </thead>
              <tbody>
                {data.suppliers.slice(0, 15).map((s, i) => (
                  <tr key={String(s.id)} style={{ borderBottom: '1px solid #eee', background: i % 2 === 0 ? '#fff' : '#FAF7F0' }}>
                    <td style={td}><strong>{String(s.business_name)}</strong></td>
                    <td style={td}>{String(s.supplier_type ?? '—')}</td>
                    <td style={td}>
                      <span style={{
                        background: s.kyc_status === 'approved' ? '#d4edda' : s.kyc_status === 'pending' ? '#fff3cd' : '#f8d7da',
                        color: s.kyc_status === 'approved' ? '#155724' : s.kyc_status === 'pending' ? '#856404' : '#721c24',
                        padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 'bold',
                      }}>
                        {String(s.kyc_status)}
                      </span>
                    </td>
                    <td style={td}>{new Date(String(s.created_at)).toLocaleDateString('ar-EG')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 12 }}>
            <a href="/admin/marketplace-suppliers" style={primaryBtn}>👨‍💼 إدارة كل المؤجرين</a>
          </div>
        </div>
      )}

      {sub === 'bookings' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 12 }}>
            <StatusBox label="بانتظار" val={k.pendingBookings} color="#B8860B" />
            <StatusBox label="مؤكّد" val={k.confirmedBookings} color="#28a745" />
            <StatusBox label="تمّ" val={k.completedBookings} color="#666" />
            <StatusBox label="ملغي" val={k.cancelledBookings} color="#C2410C" />
          </div>

          <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#1F5F3F', color: '#FAF7F0' }}>
                  <th style={th}>المرجع</th>
                  <th style={th}>الإعلان</th>
                  <th style={th}>المؤجر</th>
                  <th style={th}>المبلغ</th>
                  <th style={th}>الحالة</th>
                  <th style={th}>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {data.bookingsRecent.map((b, i) => {
                  const listing = b.listing as { title?: string } | null
                  const supplier = b.supplier as { business_name?: string } | null
                  return (
                    <tr key={String(b.id)} style={{ borderBottom: '1px solid #eee', background: i % 2 === 0 ? '#fff' : '#FAF7F0' }}>
                      <td style={td}><code style={{ fontSize: 10 }}>#{String(b.reference_code ?? '—')}</code></td>
                      <td style={td}>{listing?.title ?? '—'}</td>
                      <td style={td}>{supplier?.business_name ?? '—'}</td>
                      <td style={td}><strong>{Number(b.total_amount).toLocaleString('ar-EG')} ج</strong></td>
                      <td style={td}>
                        <span style={{
                          background: b.status === 'confirmed' ? '#d4edda' : b.status === 'pending_payment' ? '#fff3cd' : b.status === 'cancelled' ? '#f8d7da' : '#e9ecef',
                          padding: '2px 6px', borderRadius: 4, fontSize: 10,
                        }}>{String(b.status)}</span>
                      </td>
                      <td style={td}>{new Date(String(b.created_at)).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 12 }}>
            <a href="/admin/marketplace-bookings" style={primaryBtn}>📅 إدارة كل الحجوزات</a>
          </div>
        </div>
      )}

      {sub === 'leads' && (
        <div>
          {data.leadsRecent.length === 0 ? <Empty msg="لسه مفيش leads" /> : (
            <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#1F5F3F', color: '#FAF7F0' }}>
                    <th style={th}>الاسم</th>
                    <th style={th}>الموبايل</th>
                    <th style={th}>المقصود</th>
                    <th style={th}>درجة</th>
                    <th style={th}>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {data.leadsRecent.map((l, i) => (
                    <tr key={String(l.id)} style={{ borderBottom: '1px solid #eee', background: i % 2 === 0 ? '#fff' : '#FAF7F0' }}>
                      <td style={td}><strong>{String(l.full_name ?? '—')}</strong></td>
                      <td style={td}><code style={{ fontSize: 10 }}>{String(l.phone_number ?? '—')}</code></td>
                      <td style={td}>{String(l.intent ?? '—')}</td>
                      <td style={td}>
                        <span style={{
                          background: Number(l.lead_score) >= 8 ? '#d4edda' : Number(l.lead_score) >= 5 ? '#fff3cd' : '#f8d7da',
                          padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 'bold',
                        }}>{String(l.lead_score ?? '?')}/10</span>
                      </td>
                      <td style={td}>{String(l.status ?? 'new')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <a href="/admin/leads-feed" style={primaryBtn}>🎯 Leads Feed كامل</a>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// AGENTS TAB
// ============================================================
function AgentsTab({ agents, recentRuns }: { agents: Array<Record<string, unknown>>; recentRuns: Array<Record<string, unknown>> }) {
  const [filter, setFilter] = useState<string>('all')
  const teams = Array.from(new Set(agents.map(a => String(a.team)))).sort()
  const filtered = filter === 'all' ? agents : agents.filter(a => a.team === filter)

  const runsByAgent = new Map<string, number>()
  recentRuns.forEach(r => {
    const n = String(r.agent_name)
    runsByAgent.set(n, (runsByAgent.get(n) ?? 0) + 1)
  })

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        <FilterBtn label={`الكل (${agents.length})`} active={filter === 'all'} onClick={() => setFilter('all')} />
        {teams.map(t => (
          <FilterBtn key={t} label={`${t} (${agents.filter(a => a.team === t).length})`} active={filter === t} onClick={() => setFilter(t)} />
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#1F5F3F', color: '#FAF7F0' }}>
              <th style={th}>Agent</th>
              <th style={th}>Team</th>
              <th style={th}>الحالة</th>
              <th style={th}>Runs (24h)</th>
              <th style={th}>Success</th>
              <th style={th}>الإجراء</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a, i) => {
              const runsRecent = runsByAgent.get(String(a.agent_name)) ?? 0
              const successRate = Number(a.run_count) > 0
                ? Math.round((Number(a.success_count) / Number(a.run_count)) * 100)
                : 0
              return (
                <tr key={String(a.agent_name)} style={{
                  borderBottom: '1px solid #eee',
                  background: i % 2 === 0 ? '#fff' : '#FAF7F0',
                }}>
                  <td style={td}><strong>{String(a.display_name ?? a.agent_name)}</strong><br/><span style={{ fontSize: 10, color: '#999' }}>{String(a.agent_name)}</span></td>
                  <td style={td}>{String(a.team)}</td>
                  <td style={td}>
                    <span style={{
                      background: a.enabled ? '#d4edda' : '#f8d7da',
                      color: a.enabled ? '#155724' : '#721c24',
                      padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 'bold',
                    }}>
                      {a.enabled ? 'ON' : 'OFF'}
                    </span>
                  </td>
                  <td style={td}>{runsRecent}</td>
                  <td style={td}>
                    <span style={{
                      background: successRate >= 90 ? '#d4edda' : successRate >= 70 ? '#fff3cd' : '#f8d7da',
                      padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 'bold',
                    }}>
                      {successRate}%
                    </span>
                  </td>
                  <td style={td}><RunAgentButton agentName={String(a.agent_name)} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RunAgentButton({ agentName }: { agentName: string }) {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const run = async () => {
    setRunning(true)
    try {
      const res = await fetch('/api/agents/scheduler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer c9aade438b57204664c496dcd43ab8a640af5061273abc6591522bf96065d0c7',
        },
        body: JSON.stringify({ agent: agentName }),
      })
      const data = await res.json()
      setResult(data.result?.success ? '✅' : '❌')
      setTimeout(() => setResult(null), 3000)
    } catch {
      setResult('❌')
    } finally {
      setRunning(false)
    }
  }

  return (
    <button onClick={run} disabled={running} style={{
      padding: '4px 10px', background: '#1F5F3F', color: '#fff',
      border: 'none', borderRadius: 4, cursor: running ? 'wait' : 'pointer',
      fontSize: 11, fontFamily: 'inherit',
    }}>
      {running ? '⏳' : result ?? '▶'}
    </button>
  )
}

// ============================================================
// CREATIVE TAB
// ============================================================
function CreativeTab({ ads, reels, content }: { ads: Array<Record<string, unknown>>; reels: Array<Record<string, unknown>>; content: Array<Record<string, unknown>> }) {
  const [sub, setSub] = useState<'ads' | 'reels' | 'posts'>('ads')
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <FilterBtn label={`🎨 ads (${ads.length})`} active={sub === 'ads'} onClick={() => setSub('ads')} />
        <FilterBtn label={`🎬 reels (${reels.length})`} active={sub === 'reels'} onClick={() => setSub('reels')} />
        <FilterBtn label={`📝 posts (${content.length})`} active={sub === 'posts'} onClick={() => setSub('posts')} />
      </div>

      {sub === 'ads' && (
        <div style={{ display: 'grid', gap: 12 }}>
          {ads.length === 0 ? <Empty msg="مفيش إعلانات" /> :
            ads.map((a, i) => (
              <div key={i} style={card('#C2410C')}>
                <h3 style={{ margin: 0, color: '#1F5F3F', fontSize: 15 }}>{String(a.headline)}</h3>
                <p style={{ fontSize: 12, color: '#444', margin: '6px 0', lineHeight: 1.6 }}>{String(a.primary_text ?? '').slice(0, 250)}</p>
                <div style={{ fontSize: 10, color: '#666' }}>📂 {String(a.category)} · CTA: {String(a.cta_text ?? '')}</div>
              </div>
            ))}
        </div>
      )}

      {sub === 'reels' && (
        <div style={{ display: 'grid', gap: 12 }}>
          {reels.length === 0 ? <Empty msg="مفيش reels" /> :
            reels.map((r, i) => (
              <div key={i} style={card('#C2410C')}>
                <h3 style={{ margin: 0, color: '#1F5F3F', fontSize: 14 }}>{String(r.title)}</h3>
                <div style={{ background: '#1F5F3F', color: '#FAF7F0', padding: 8, borderRadius: 6, margin: '6px 0', fontSize: 12, fontWeight: 'bold' }}>
                  💥 {String(r.hook)}
                </div>
              </div>
            ))}
        </div>
      )}

      {sub === 'posts' && (
        <div style={{ display: 'grid', gap: 10 }}>
          {content.length === 0 ? <Empty msg="مفيش posts" /> :
            content.map((c, i) => (
              <div key={i} style={card('#C2410C')}>
                <strong style={{ fontSize: 13 }}>{String(c.title)}</strong>
                <p style={{ fontSize: 11, color: '#666', margin: '4px 0', whiteSpace: 'pre-wrap' }}>{String(c.body ?? '').slice(0, 200)}...</p>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// INTELLIGENCE TAB
// ============================================================
function IntelligenceTab({ fraud, demand, pricing, qc }: { fraud: Array<Record<string, unknown>>; demand: Array<Record<string, unknown>>; pricing: Array<Record<string, unknown>>; qc: Array<Record<string, unknown>> }) {
  const [sub, setSub] = useState<'demand' | 'fraud' | 'pricing' | 'qc'>('demand')

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        <FilterBtn label={`📈 طلب (${demand.length})`} active={sub === 'demand'} onClick={() => setSub('demand')} />
        <FilterBtn label={`🚨 احتيال (${fraud.length})`} active={sub === 'fraud'} onClick={() => setSub('fraud')} />
        <FilterBtn label={`💰 تسعير (${pricing.length})`} active={sub === 'pricing'} onClick={() => setSub('pricing')} />
        <FilterBtn label={`✅ جودة (${qc.length})`} active={sub === 'qc'} onClick={() => setSub('qc')} />
      </div>

      {sub === 'demand' && (
        <div style={{ display: 'grid', gap: 12 }}>
          {demand.length === 0 ? <Empty msg="مفيش توقعات" /> :
            demand.map((f, i) => {
              const gap = Number(f.supply_gap ?? 0)
              return (
                <div key={i} style={card(gap < -5 ? '#C2410C' : '#1F5F3F')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: '#1F5F3F', fontSize: 14 }}>{gap < -5 ? '🔥' : '📊'} {String(f.category)}</h3>
                    <span style={{
                      background: gap < 0 ? '#fee' : '#d4edda',
                      color: gap < 0 ? '#C2410C' : '#155724',
                      padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 'bold',
                    }}>
                      Gap: {gap > 0 ? '+' : ''}{gap}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, margin: '8px 0' }}>
                    <Stat label="متوقع" val={String(f.predicted_bookings ?? 0)} />
                    <Stat label="عرض حالي" val={String(f.current_supply ?? 0)} />
                    <Stat label="ثقة" val={String(f.confidence ?? '—')} />
                  </div>
                  {Boolean(f.recommended_action) && (
                    <div style={{ background: '#1F5F3F', color: '#FAF7F0', padding: 8, borderRadius: 6, fontSize: 11 }}>
                      👉 {String(f.recommended_action)}
                    </div>
                  )}
                </div>
              )
            })}
        </div>
      )}

      {sub === 'fraud' && (
        <div style={{ display: 'grid', gap: 10 }}>
          {fraud.length === 0 ? <Empty msg="✅ المنصة آمنة" /> :
            fraud.map((a, i) => (
              <div key={i} style={card(a.severity === 'critical' || a.severity === 'high' ? '#C2410C' : '#B8860B')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <strong style={{ fontSize: 13 }}>{String(a.alert_type)}</strong>
                  <span style={{
                    background: a.severity === 'critical' ? '#7c1d1d' : a.severity === 'high' ? '#C2410C' : '#B8860B',
                    color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 'bold',
                  }}>
                    {String(a.severity).toUpperCase()}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: '#444', margin: '4px 0' }}>{String(a.description)}</p>
                <p style={{ fontSize: 10, color: '#1F5F3F', margin: 0 }}>👉 {String(a.recommended_action)}</p>
              </div>
            ))}
        </div>
      )}

      {sub === 'pricing' && (
        <div style={{ display: 'grid', gap: 10 }}>
          {pricing.length === 0 ? <Empty msg="مفيش اقتراحات تسعير" /> :
            pricing.map((p, i) => (
              <div key={i} style={card('#B8860B')}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 18, color: '#666' }}>{String(p.current_price)}ج</span>
                  <span>→</span>
                  <span style={{ fontSize: 20, color: '#1F5F3F', fontWeight: 'bold' }}>{String(p.suggested_price)}ج</span>
                  <span style={{ fontSize: 11, color: Number(p.price_change_pct) > 0 ? '#28a745' : '#C2410C', fontWeight: 'bold' }}>
                    ({Number(p.price_change_pct) > 0 ? '+' : ''}{String(p.price_change_pct)}%)
                  </span>
                </div>
                <p style={{ fontSize: 11, color: '#444' }}>{String(p.reasoning ?? '').slice(0, 200)}</p>
              </div>
            ))}
        </div>
      )}

      {sub === 'qc' && (
        <div style={{ display: 'grid', gap: 10 }}>
          {qc.length === 0 ? <Empty msg="مفيش QC" /> :
            qc.map((r, i) => (
              <div key={i} style={card(r.pass_status === 'pass' ? '#28a745' : '#C2410C')}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: 12 }}>Listing: {String(r.listing_id).slice(0, 8)}</strong>
                  <span style={{
                    background: Number(r.overall_score) >= 80 ? '#28a745' : Number(r.overall_score) >= 60 ? '#B8860B' : '#C2410C',
                    color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 'bold',
                  }}>
                    {String(r.overall_score)}/100
                  </span>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// GROWTH TAB
// ============================================================
function GrowthTab({ partnerships, customerSuccess, photoBriefs, leadsRecent }: { partnerships: Array<Record<string, unknown>>; customerSuccess: Array<Record<string, unknown>>; photoBriefs: Array<Record<string, unknown>>; leadsRecent: Array<Record<string, unknown>> }) {
  const [sub, setSub] = useState<'partnerships' | 'customers' | 'photos' | 'leads'>('partnerships')

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        <FilterBtn label={`🤝 شراكات (${partnerships.length})`} active={sub === 'partnerships'} onClick={() => setSub('partnerships')} />
        <FilterBtn label={`👥 عملاء (${customerSuccess.length})`} active={sub === 'customers'} onClick={() => setSub('customers')} />
        <FilterBtn label={`📸 صور (${photoBriefs.length})`} active={sub === 'photos'} onClick={() => setSub('photos')} />
        <FilterBtn label={`🎯 leads (${leadsRecent.length})`} active={sub === 'leads'} onClick={() => setSub('leads')} />
      </div>

      {sub === 'partnerships' && (
        <div style={{ display: 'grid', gap: 12 }}>
          {partnerships.length === 0 ? <Empty msg="مفيش فرص" /> :
            partnerships.map((o, i) => (
              <div key={i} style={card(o.priority === 'urgent' ? '#C2410C' : o.priority === 'high' ? '#B8860B' : '#1F5F3F')}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: 13 }}>{String(o.partner_name)}</strong>
                  <span style={priorityBadge(String(o.priority))}>{String(o.priority)}</span>
                </div>
                <p style={{ fontSize: 10, color: '#666', margin: '2px 0' }}>{String(o.partner_handle ?? '')} · {String(o.partner_type)}</p>
                <p style={{ fontSize: 11, color: '#444' }}>{String(o.opportunity_summary ?? '').slice(0, 200)}</p>
                <div style={{ background: '#FAF7F0', padding: 6, borderRadius: 4, fontSize: 10, color: '#1F5F3F' }}>
                  💎 {String(o.potential_value)}
                </div>
              </div>
            ))}
        </div>
      )}

      {sub === 'customers' && (
        <div style={{ display: 'grid', gap: 10 }}>
          {customerSuccess.length === 0 ? <Empty msg="مفيش customer actions" /> :
            customerSuccess.map((a, i) => (
              <div key={i} style={card('#10B981')}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: 12 }}>{String(a.customer_segment ?? '—')}</strong>
                  <span style={{ background: '#10B981', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 10 }}>
                    Health: {String(a.health_score ?? '—')}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: '#444', margin: '4px 0' }}>{String(a.recommended_action ?? '').slice(0, 200)}</p>
              </div>
            ))}
        </div>
      )}

      {sub === 'photos' && (
        <div style={{ display: 'grid', gap: 10 }}>
          {photoBriefs.length === 0 ? <Empty msg="مفيش photo briefs" /> :
            photoBriefs.map((p, i) => (
              <div key={i} style={card('#10B981')}>
                <strong style={{ fontSize: 12 }}>Listing: {String(p.listing_id).slice(0, 8)}</strong>
                <p style={{ fontSize: 10, color: '#666', margin: '4px 0' }}>الجودة: {String(p.current_photo_quality_score ?? '?')}/100 · زيادة متوقعة: {String(p.estimated_uplift ?? '?')}</p>
              </div>
            ))}
        </div>
      )}

      {sub === 'leads' && (
        <div style={{ display: 'grid', gap: 10 }}>
          {leadsRecent.length === 0 ? <Empty msg="مفيش leads" /> :
            leadsRecent.map((l, i) => (
              <div key={i} style={card('#10B981')}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: 13 }}>{String(l.full_name ?? '—')}</strong>
                  <span style={{
                    background: Number(l.lead_score) >= 8 ? '#28a745' : Number(l.lead_score) >= 5 ? '#B8860B' : '#C2410C',
                    color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 'bold',
                  }}>
                    {String(l.lead_score ?? '?')}/10
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#666', margin: '4px 0' }}>📞 {String(l.phone_number ?? '—')} · 🎯 {String(l.intent ?? '—')}</div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// SUPPORT TAB
// ============================================================
function SupportTab({ complaints, emails, insights }: { complaints: Array<Record<string, unknown>>; emails: Array<Record<string, unknown>>; insights: Array<Record<string, unknown>> }) {
  const [sub, setSub] = useState<'insights' | 'complaints' | 'emails'>('insights')
  const newInsights = insights.filter(i => i.status === 'new')

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        <FilterBtn label={`💡 insights (${newInsights.length})`} active={sub === 'insights'} onClick={() => setSub('insights')} />
        <FilterBtn label={`📞 شكاوى (${complaints.length})`} active={sub === 'complaints'} onClick={() => setSub('complaints')} />
        <FilterBtn label={`📧 إيميلات (${emails.length})`} active={sub === 'emails'} onClick={() => setSub('emails')} />
      </div>

      {sub === 'insights' && (
        <div style={{ display: 'grid', gap: 10 }}>
          {newInsights.length === 0 ? <Empty msg="مفيش insights" /> :
            newInsights.map((ins, i) => (
              <div key={i} style={card(ins.priority === 'high' ? '#C2410C' : '#0EA5E9')}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: 13 }}>{String(ins.title)}</strong>
                  <span style={priorityBadge(String(ins.priority))}>{String(ins.priority)}</span>
                </div>
                <p style={{ fontSize: 11, color: '#666', margin: '4px 0' }}>{String(ins.description ?? '').slice(0, 300)}</p>
                {Boolean(ins.recommended_action) && (
                  <div style={{ background: '#FAF7F0', padding: 6, borderRadius: 4, fontSize: 10, color: '#1F5F3F' }}>
                    👉 {String(ins.recommended_action)}
                  </div>
                )}
                <div style={{ fontSize: 10, color: '#999', marginTop: 4 }}>من: {String(ins.agent_name)}</div>
              </div>
            ))}
        </div>
      )}

      {sub === 'complaints' && (
        <div style={{ display: 'grid', gap: 10 }}>
          {complaints.length === 0 ? <Empty msg="✅ مفيش شكاوى" /> :
            complaints.map((c, i) => (
              <div key={i} style={card(c.severity === 'critical' || c.severity === 'high' ? '#C2410C' : '#B8860B')}>
                <p style={{ fontSize: 12, color: '#444' }}>{String(c.complaint_text ?? '').slice(0, 200)}</p>
                <div style={{ fontSize: 10, color: '#666' }}>{String(c.severity)} · {String(c.complaint_category)}</div>
              </div>
            ))}
        </div>
      )}

      {sub === 'emails' && (
        <div style={{ display: 'grid', gap: 10 }}>
          {emails.length === 0 ? <Empty msg="مفيش إيميلات" /> :
            emails.map((e, i) => (
              <div key={i} style={card('#8B5CF6')}>
                <strong style={{ fontSize: 12 }}>{String(e.subject)}</strong>
                <div style={{ fontSize: 10, color: '#666' }}>{String(e.from_email)} · {String(e.urgency)}</div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// SELF-IMPROVE TAB
// ============================================================
function SelfImproveTab({ promptVersions, recentRuns }: { promptVersions: Array<Record<string, unknown>>; recentRuns: Array<Record<string, unknown>> }) {
  return (
    <div>
      <h3 style={sectionHeader}>🧠 Prompt Versions</h3>

      {promptVersions.length === 0 ? <Empty msg="لسه مفيش تحسينات" /> : (
        <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
          {promptVersions.map((v, i) => (
            <div key={i} style={card(v.is_active ? '#28a745' : '#0EA5E9')}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>🎯 {String(v.agent_name)} v{String(v.version)}</strong>
                <span style={{
                  background: v.is_active ? '#28a745' : '#fff3cd',
                  color: v.is_active ? '#fff' : '#856404',
                  padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 'bold',
                }}>
                  {v.is_active ? '✅ Active' : '⏳ Pending'}
                </span>
              </div>
              {Boolean(v.hypothesis) && (
                <p style={{ fontSize: 11, color: '#444', margin: '6px 0' }}>
                  <strong>💡</strong> {String(v.hypothesis).slice(0, 250)}
                </p>
              )}
              <a href="/admin/prompt-versions" style={linkBtn}>عرض الـ prompt الكامل ↗</a>
            </div>
          ))}
        </div>
      )}

      <h3 style={sectionHeader}>📊 آخر Runs</h3>
      <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', maxHeight: 400, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead style={{ position: 'sticky', top: 0 }}>
            <tr style={{ background: '#1F5F3F', color: '#FAF7F0' }}>
              <th style={th}>Agent</th><th style={th}>Status</th><th style={th}>Time</th><th style={th}>Error</th>
            </tr>
          </thead>
          <tbody>
            {recentRuns.slice(0, 20).map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #eee', background: i % 2 === 0 ? '#fff' : '#FAF7F0' }}>
                <td style={td}><strong>{String(r.agent_name)}</strong></td>
                <td style={td}>
                  <span style={{
                    background: r.status === 'success' ? '#d4edda' : '#f8d7da',
                    padding: '2px 6px', borderRadius: 4, fontSize: 10,
                  }}>{String(r.status)}</span>
                </td>
                <td style={td}>{Math.round(Number(r.duration_ms ?? 0) / 1000)}s</td>
                <td style={{ ...td, color: '#C2410C', fontSize: 10 }}>
                  {r.error_message ? String(r.error_message).slice(0, 60) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================
// COLLABORATIONS TAB
// ============================================================
function CollaborationsTab({ collabs, messages }: { collabs: Array<Record<string, unknown>>; messages: Array<Record<string, unknown>>; activeCollabs: number }) {
  const [goal, setGoal] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const PRESETS = [
    '🎨 اطلق ad campaign للكاميرات بميزانية 1000 جنيه',
    '🚀 افتح فئة جديدة - من supplier hunting لحد ad creatives',
    '📊 تحليل شامل لأداء آخر شهر مع توصيات للنمو',
    '🤝 خطة شراكة كاملة مع 5 مؤثرين في فئة الكاميرات',
  ]

  const launch = async (g: string) => {
    if (!g.trim()) return
    setLoading(true); setFeedback(null)
    try {
      const res = await fetch('/api/agents/scheduler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer c9aade438b57204664c496dcd43ab8a640af5061273abc6591522bf96065d0c7',
        },
        body: JSON.stringify({ agent: 'orchestrator', args: { goal: g } }),
      })
      const data = await res.json()
      const r = data.result?.output_summary
      if (r) {
        setFeedback(`✅ تم!\nAgents: ${(r.participating_agents ?? []).join(' · ')}\nTasks: ${r.tasks_dispatched}\nالمدة: ${r.estimated_duration_min} دقيقة`)
        setTimeout(() => location.reload(), 4000)
      } else {
        setFeedback('❌ فشل')
      }
    } catch {
      setFeedback('❌ خطأ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg, #1F5F3F 0%, #10B981 100%)', color: '#fff', padding: 16, borderRadius: 12, marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>🚀 اطلق Collaboration</h3>
        <p style={{ fontSize: 11, opacity: 0.9, marginBottom: 10 }}>
          Orchestrator AI يخطط ويوزّع التاسكات على الـ agents المناسبين
        </p>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="اكتب الـ goal..."
          style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', fontSize: 12, fontFamily: 'Tahoma', minHeight: 50, marginBottom: 8, resize: 'vertical' }}
          dir="rtl"
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {PRESETS.map((p, i) => (
            <button key={i} onClick={() => setGoal(p)} style={{
              background: 'rgba(255,255,255,0.15)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
              fontSize: 10, fontFamily: 'inherit',
            }}>{p}</button>
          ))}
        </div>
        <button onClick={() => launch(goal)} disabled={loading || !goal.trim()} style={{
          background: loading ? '#666' : '#B8860B', color: '#fff',
          border: 'none', padding: '8px 16px', borderRadius: 6,
          fontSize: 12, fontWeight: 'bold', cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit',
        }}>
          {loading ? '⏳ بيخطط...' : '🚀 اطلق'}
        </button>
        {feedback && (
          <div style={{ marginTop: 10, padding: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 11, whiteSpace: 'pre-wrap' }}>{feedback}</div>
        )}
      </div>

      <h3 style={sectionHeader}>🤝 Collaborations</h3>
      <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
        {collabs.length === 0 ? <Empty msg="مفيش collaborations" /> :
          collabs.map((c, i) => (
            <div key={i} style={card(c.status === 'active' ? '#0EA5E9' : '#28a745')}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: 12 }}>🎯 {String(c.collaboration_name).slice(0, 80)}</strong>
                <span style={{
                  background: c.status === 'active' ? '#0EA5E9' : '#28a745', color: '#fff',
                  padding: '2px 8px', borderRadius: 4, fontSize: 10,
                }}>{String(c.status)}</span>
              </div>
              <p style={{ fontSize: 11, color: '#666', margin: '4px 0' }}>{String(c.goal).slice(0, 200)}</p>
              <div style={{ fontSize: 10, color: '#1F5F3F' }}>
                Agents: {(c.participating_agents as string[] ?? []).join(' · ')}
              </div>
            </div>
          ))}
      </div>

      <h3 style={sectionHeader}>📬 Messages</h3>
      <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', maxHeight: 350, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead style={{ position: 'sticky', top: 0 }}>
            <tr style={{ background: '#1F5F3F', color: '#FAF7F0' }}>
              <th style={th}>From → To</th><th style={th}>Subject</th><th style={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((m, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #eee', background: i % 2 === 0 ? '#fff' : '#FAF7F0' }}>
                <td style={td}><strong>{String(m.from_agent)}</strong> → {String(m.to_agent)}</td>
                <td style={td}>{String(m.subject).slice(0, 50)}</td>
                <td style={td}>{String(m.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================
// TOOLS TAB — quick links to legacy admin pages + settings
// ============================================================
function ToolsTab({ kpis, categories, payouts }: { kpis: KPIs; categories: Array<Record<string, unknown>>; payouts: Array<Record<string, unknown>> }) {
  const links = [
    { href: '/admin/listings', icon: '📦', title: 'إدارة الإعلانات', sub: `${kpis.publishedListings} منشور · ${kpis.draftListings} مسودة` },
    { href: '/admin/marketplace-suppliers', icon: '👨‍💼', title: 'المؤجرين', sub: `${kpis.approvedSuppliers} معتمد · ${kpis.pendingSuppliers} معلّق`, badge: kpis.pendingSuppliers },
    { href: '/admin/marketplace-bookings', icon: '📅', title: 'الحجوزات', sub: `${kpis.pendingBookings} بانتظار · ${kpis.confirmedBookings} مؤكّد`, badge: kpis.pendingBookings },
    { href: '/admin/categories', icon: '🗂️', title: 'الفئات', sub: `${kpis.categoriesCount} فئة` },
    { href: '/admin/payouts', icon: '💸', title: 'المدفوعات', sub: `${payouts.length} payout` },
    { href: '/admin/notifications', icon: '🔔', title: 'الإشعارات', sub: `${kpis.pushSubscribers} مفعّل` },
    { href: '/admin/site-settings', icon: '⚙️', title: 'إعدادات الموقع', sub: 'الـ Hero والصور' },
    { href: '/admin/leads-feed', icon: '🎯', title: 'Leads Feed', sub: `${kpis.leadsCount} lead` },
    { href: '/admin/ad-builder', icon: '🎨', title: 'Ad Builder', sub: 'إنشاء حملات Meta' },
    { href: '/admin/marketing-hq', icon: '📣', title: 'Marketing HQ', sub: 'مركز التسويق' },
    { href: '/admin/insights', icon: '💡', title: 'Insights', sub: 'كل insights الـ AI' },
    { href: '/admin/funnel', icon: '📊', title: 'Funnel', sub: 'تحليل المسار' },
    { href: '/admin/listing-performance', icon: '📈', title: 'أداء الإعلانات', sub: 'KPIs لكل إعلان' },
    { href: '/admin/activity', icon: '📋', title: 'Activity Log', sub: 'كل الحركات' },
    { href: '/admin/prompt-versions', icon: '🧠', title: 'Prompt Versions', sub: 'تحسينات الـ AI' },
    { href: '/admin/performance', icon: '📊', title: 'AI Performance', sub: 'أداء الـ agents' },
    { href: '/admin/collaborations', icon: '🎯', title: 'Collaborations', sub: 'تعاون agents' },
    { href: '/admin/ai-os', icon: '🤖', title: 'AI OS Hub', sub: 'مركز الـ AI' },
    { href: '/supplier/marketplace', icon: '🏪', title: 'لوحة المضمونة', sub: 'إعلاناتنا' },
    { href: '/supplier/marketplace/new', icon: '➕', title: 'إضافة إعلان', sub: 'إعلان جديد' },
    { href: '/admin/ad-creatives', icon: '🎨', title: 'Ad Creatives', sub: 'إعلانات الـ AI' },
    { href: '/admin/reels', icon: '🎬', title: 'Reels', sub: 'scripts الـ AI' },
    { href: '/admin/strategy', icon: '🧠', title: 'Strategy Plays', sub: 'خطط استراتيجية' },
    { href: '/admin/ceo-briefs', icon: '🌅', title: 'CEO Briefs', sub: 'تقارير صباحية' },
    { href: '/admin/fraud-alerts', icon: '🚨', title: 'Fraud Alerts', sub: 'تنبيهات احتيال' },
    { href: '/admin/demand-forecast', icon: '📈', title: 'Demand Forecast', sub: 'توقعات الطلب' },
    { href: '/admin/partnerships', icon: '🤝', title: 'Partnerships', sub: 'فرص شراكة' },
    { href: '/admin/qc-reports', icon: '✅', title: 'QC Reports', sub: 'مراجعة جودة' },
    { href: '/', icon: '🌐', title: 'عرض الموقع', sub: 'كما يراه العميل' },
    { href: '/account', icon: '👤', title: 'حسابي', sub: 'الإعدادات الشخصية' },
  ]

  // Group categories list
  return (
    <div>
      <h3 style={sectionHeader}>⚙️ كل الأدوات</h3>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 10,
      }}>
        {links.map((l, i) => (
          <a key={i} href={l.href} target={l.href.startsWith('/') ? '_self' : '_blank'} rel="noopener" style={{
            background: '#fff', padding: 12, borderRadius: 10,
            border: '1px solid #eee', textDecoration: 'none', color: 'inherit',
            position: 'relative',
          }}>
            {l.badge && l.badge > 0 && (
              <span style={{
                position: 'absolute', top: 6, left: 6,
                background: '#C2410C', color: '#fff',
                padding: '2px 6px', borderRadius: 8, fontSize: 9, fontWeight: 'bold',
              }}>
                {l.badge}
              </span>
            )}
            <div style={{ fontSize: 22, marginBottom: 4 }}>{l.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 'bold', color: '#1F5F3F', marginBottom: 2 }}>{l.title}</div>
            <div style={{ fontSize: 10, color: '#666' }}>{l.sub}</div>
          </a>
        ))}
      </div>

      {categories.length > 0 && (
        <>
          <h3 style={sectionHeader}>🗂️ الفئات ({categories.length})</h3>
          <div style={{ background: '#fff', borderRadius: 10, padding: 12, fontSize: 11, color: '#666' }}>
            {categories.map(c => String(c.name_ar)).join(' · ')}
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================
// SHARED COMPONENTS & STYLES
// ============================================================
function newInsightsHelper(insights: Array<Record<string, unknown>>) {
  return insights.filter(i => i.status === 'new')
}

function FilterBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 12px', background: active ? '#1F5F3F' : '#fff',
      color: active ? '#FAF7F0' : '#1F5F3F',
      border: '1px solid #1F5F3F', borderRadius: 6,
      cursor: 'pointer', fontSize: 11, fontWeight: 'bold',
      fontFamily: 'inherit',
    }}>{label}</button>
  )
}

function Empty({ msg }: { msg: string }) {
  return (
    <div style={{ background: '#fff', padding: 30, borderRadius: 12, textAlign: 'center', color: '#999' }}>
      <p style={{ fontSize: 12 }}>{msg}</p>
    </div>
  )
}

function Stat({ label, val }: { label: string; val: string }) {
  return (
    <div style={{ background: '#FAF7F0', padding: 6, borderRadius: 4, textAlign: 'center' }}>
      <div style={{ fontSize: 14, fontWeight: 'bold', color: '#1F5F3F' }}>{val}</div>
      <div style={{ fontSize: 9, color: '#666' }}>{label}</div>
    </div>
  )
}

function StatusBox({ label, val, color, subtitle }: { label: string; val: string | number; color: string; subtitle?: string }) {
  return (
    <div style={{ background: '#fff', padding: 12, borderRadius: 10, textAlign: 'center', borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 20, fontWeight: 'bold', color }}>{val}</div>
      <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>{label}</div>
      {subtitle && <div style={{ fontSize: 9, color: '#999', marginTop: 2 }}>{subtitle}</div>}
    </div>
  )
}

function BigMetric({ icon, label, value, subtitle, color }: { icon: string; label: string; value: string; subtitle?: string; color: string }) {
  return (
    <div style={{ background: '#fff', padding: 14, borderRadius: 10, borderRight: `3px solid ${color}` }}>
      <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 'bold', color }}>{value}</div>
      {subtitle && <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>{subtitle}</div>}
    </div>
  )
}

const sectionHeader: React.CSSProperties = {
  color: '#1F5F3F', fontSize: 14, marginTop: 16, marginBottom: 10, fontWeight: 'bold',
}

const th: React.CSSProperties = { padding: 8, textAlign: 'right', fontSize: 11 }
const td: React.CSSProperties = { padding: 6, fontSize: 11 }

const linkBtn: React.CSSProperties = {
  color: '#0EA5E9', textDecoration: 'none', fontSize: 11,
}

const primaryBtn: React.CSSProperties = {
  display: 'inline-block', background: '#1F5F3F', color: '#fff',
  padding: '8px 14px', borderRadius: 6, textDecoration: 'none',
  fontSize: 12, fontWeight: 'bold',
}

function alertBox(color: string): React.CSSProperties {
  return {
    display: 'block',
    background: color, color: '#fff',
    padding: 10, borderRadius: 8, marginBottom: 8, fontSize: 12,
    textDecoration: 'none',
  }
}

function card(borderColor: string): React.CSSProperties {
  return {
    background: '#fff', padding: 12, borderRadius: 10,
    border: '1px solid #eee', borderRight: `3px solid ${borderColor}`,
  }
}

function priorityBadge(priority: string): React.CSSProperties {
  const colors: Record<string, string> = {
    urgent: '#C2410C', high: '#B8860B', medium: '#1F5F3F', low: '#666',
  }
  return {
    background: colors[priority] ?? '#666', color: '#fff',
    padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 'bold',
  }
}
