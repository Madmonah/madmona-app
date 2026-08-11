'use client'

// ============================================================================
// ActionHub — مركز كل المهام المعلّقة في مضمونة
// ============================================================================

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'

interface ActionHubData {
  careers_pending: Array<{
    id: string; full_name: string; phone: string; job_title: string; city: string | null;
    email: string | null; created_at: string; is_madmona_company: boolean;
    supplier_name: string; last_salary_egp: number | null; expected_salary_egp: number | null;
    metadata: { source?: string; experience_years?: number; why_join?: string; cv_url?: string } | null
  }>
  careers_total_pending: number
  alerts_unread: Array<{
    id: string; alert_type: string; severity: string; title: string;
    summary: string | null; action_url: string | null; created_at: string
  }>
  alerts_total_unread: number
  clinic_leads: {
    total: number; new: number; contacted: number;
    top_5: Array<{ id: string; name: string; specialty_ar: string; area: string; rating: number | null;
      reviews: number | null; phone: string; has_whatsapp: boolean; status: string }>
  }
  restaurant_leads: { total: number; new: number }
  cold_leads: { total: number; pending: number }
  sales_leads_pending: number
  bookings_pending: Array<{ id: string; service_name: string; customer_name: string; customer_phone: string; scheduled_at: string; status: string; deposit_status: string | null; price_egp: number }>
  bookings_summary_7d: { total: number; confirmed: number; completed: number; no_show: number; pending: number }
  wa_queue: { pending: number; sent_24h: number; failed_24h: number }
  suppliers_summary: { total: number; industries: Record<string, number> }
  listings_summary: { published: number; drafts: number; paused: number }
  fraud_alerts_open: number
  generated_at: string
}

export function ActionHub() {
  const [data, setData] = useState<ActionHubData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  async function load() {
    try {
      // @ts-expect-error - RPC type
      const { data: result, error } = await supabaseBrowser.rpc('get_admin_action_hub')
      if (error) throw error
      setData(result as ActionHubData)
    } catch (e) {
      console.error('ActionHub load error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 60000)
    return () => clearInterval(id)
  }, [])

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: '#7C8A84', fontSize: 13 }}>
        بتحمّل قائمة المهام...
      </div>
    )
  }

  if (!data) return null

  const counts = [
    { k: 'careers', label: 'طلبات توظيف', n: data.careers_total_pending, href: '#careers-section', tone: 'gold' },
    { k: 'alerts', label: 'تنبيهات', n: data.alerts_total_unread, href: '#alerts-section', tone: 'red' },
    { k: 'clinic', label: 'عيادات leads', n: data.clinic_leads.new, href: '#clinic-leads-section', tone: 'green' },
    { k: 'restaurant', label: 'مطاعم leads', n: data.restaurant_leads.new, href: '/admin/leads', tone: 'amber' },
    { k: 'cold', label: 'cold leads', n: data.cold_leads.pending, href: '/admin/leads', tone: 'blue' },
    { k: 'bookings', label: 'حجوزات معلّقة', n: data.bookings_summary_7d.pending, href: '/admin/marketplace-bookings', tone: 'purple' },
    { k: 'wa', label: 'WA قيد الإرسال', n: data.wa_queue.pending, href: '/admin/messages', tone: 'emerald' },
    { k: 'fraud', label: 'fraud alerts', n: data.fraud_alerts_open, href: '/admin/fraud-alerts', tone: 'redx' },
  ]

  return (
    <section className="ah" style={{ marginBottom: 32 }}>
      <style>{styles}</style>
      
      <div className="kicker">مركز المهام · كل اللي محتاج تدخّلك</div>
      
      <div className="ah-grid">
        {counts.map((c) => (
          <Link key={c.k} href={c.href} className={`ah-cell ${c.n > 0 ? 'active' : 'empty'} tone-${c.tone}`}>
            <div className="ah-num">{c.n}</div>
            <div className="ah-lbl">{c.label}</div>
          </Link>
        ))}
      </div>

      {data.careers_pending.length > 0 && (
        <div id="careers-section" className="ah-section">
          <div className="ah-header">
            <h3>طلبات توظيف معلّقة ({data.careers_total_pending})</h3>
            <button onClick={() => setExpanded(expanded === 'careers' ? null : 'careers')} className="ah-toggle">
              {expanded === 'careers' ? 'إخفاء' : 'عرض الكل'}
            </button>
          </div>
          <div className="ah-list">
            {(expanded === 'careers' ? data.careers_pending : data.careers_pending.slice(0, 3)).map((app) => (
              <div key={app.id} className="ah-item">
                <div className="ah-item-main">
                  <div className="ah-item-name">{app.full_name}</div>
                  <div className="ah-item-meta">
                    <span className="ah-badge">{app.job_title || '—'}</span>
                    {app.is_madmona_company && <span className="ah-badge green">مضمونة-الشركة</span>}
                    {!app.is_madmona_company && <span className="ah-badge gray">{app.supplier_name}</span>}
                    {app.city && <span className="ah-meta">{app.city}</span>}
                    {app.metadata?.experience_years !== undefined && app.metadata.experience_years !== null && (
                      <span className="ah-meta">{app.metadata.experience_years} سنة خبرة</span>
                    )}
                    {app.expected_salary_egp != null && (
                      <span className="ah-badge gold">يطلب {app.expected_salary_egp.toLocaleString('ar-EG')} ج</span>
                    )}
                    {app.last_salary_egp != null && (
                      <span className="ah-meta">آخر راتب {app.last_salary_egp.toLocaleString('ar-EG')} ج</span>
                    )}
                  </div>
                  {app.metadata?.why_join && (
                    <div className="ah-item-bio">{app.metadata.why_join}</div>
                  )}
                </div>
                <div className="ah-item-actions">
                  <a href={`https://wa.me/${app.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="ah-btn ah-btn-wa">
                    واتساب
                  </a>
                  {app.metadata?.cv_url && (
                    <a href={app.metadata.cv_url} target="_blank" rel="noreferrer" className="ah-btn">CV</a>
                  )}
                  {app.email && (<a href={`mailto:${app.email}`} className="ah-btn">إيميل</a>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.alerts_unread.length > 0 && (
        <div id="alerts-section" className="ah-section">
          <div className="ah-header">
            <h3>تنبيهات غير مقروءة ({data.alerts_total_unread})</h3>
            <button onClick={() => setExpanded(expanded === 'alerts' ? null : 'alerts')} className="ah-toggle">
              {expanded === 'alerts' ? 'إخفاء' : 'عرض الكل'}
            </button>
          </div>
          <div className="ah-list">
            {(expanded === 'alerts' ? data.alerts_unread : data.alerts_unread.slice(0, 5)).map((alert) => (
              <Link key={alert.id} href={alert.action_url || '/admin/alerts'} className={`ah-item ah-alert ah-sev-${alert.severity}`}>
                <div className="ah-item-main">
                  <div className="ah-item-name">{alert.title}</div>
                  {alert.summary && <div className="ah-item-bio">{alert.summary}</div>}
                </div>
                <span className={`ah-badge sev-${alert.severity}`}>{alert.severity}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {data.clinic_leads.top_5.length > 0 && (
        <div id="clinic-leads-section" className="ah-section">
          <div className="ah-header">
            <h3>أفضل ٥ عيادات للتواصل ({data.clinic_leads.new} متاح)</h3>
            <span className="ah-meta">إجمالي {data.clinic_leads.total} · اتكلم معاهم {data.clinic_leads.contacted}</span>
          </div>
          <div className="ah-list">
            {data.clinic_leads.top_5.map((lead) => (
              <div key={lead.id} className="ah-item">
                <div className="ah-item-main">
                  <div className="ah-item-name">{lead.name}</div>
                  <div className="ah-item-meta">
                    <span className="ah-badge">{lead.specialty_ar}</span>
                    <span className="ah-meta">{lead.area}</span>
                    {lead.rating && <span className="ah-meta">{lead.rating} ({lead.reviews || 0} تقييم)</span>}
                  </div>
                </div>
                <div className="ah-item-actions">
                  {lead.has_whatsapp && (
                    <a href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="ah-btn ah-btn-wa">واتساب</a>
                  )}
                  <a href={`tel:${lead.phone}`} className="ah-btn">اتصال</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="ah-section">
        <div className="ah-stats">
          <div className="ah-stat"><div className="ah-stat-num">{data.suppliers_summary.total}</div><div className="ah-stat-lbl">موردين</div></div>
          <div className="ah-stat"><div className="ah-stat-num">{data.listings_summary.published}</div><div className="ah-stat-lbl">منتج منشور</div></div>
          <div className="ah-stat"><div className="ah-stat-num">{data.listings_summary.drafts}</div><div className="ah-stat-lbl">مسودات</div></div>
          <div className="ah-stat"><div className="ah-stat-num">{data.bookings_summary_7d.total}</div><div className="ah-stat-lbl">حجوزات (7 أيام)</div></div>
          <div className="ah-stat"><div className="ah-stat-num">{data.wa_queue.sent_24h}</div><div className="ah-stat-lbl">WA اتبعت (24س)</div></div>
        </div>
      </div>
    </section>
  )
}

const styles = `
.ah .kicker{display:inline-flex;align-items:center;gap:8px;font-size:11px;font-weight:800;letter-spacing:.08em;color:#FA8125;margin-bottom:14px}
.ah .kicker::before{content:"";width:6px;height:6px;border-radius:50%;background:linear-gradient(118deg,#D4A017,#2FA084,#FA8125)}
.ah-grid{display:grid;grid-template-columns:repeat(8,1fr);gap:10px;margin-bottom:24px}
@media(max-width:980px){.ah-grid{grid-template-columns:repeat(4,1fr)}}
@media(max-width:640px){.ah-grid{grid-template-columns:repeat(2,1fr)}}
.ah-cell{background:rgba(255,255,255,.85);backdrop-filter:blur(8px);border:1px solid rgba(10,10,10,.07);border-radius:14px;padding:14px;text-align:center;text-decoration:none;color:inherit;transition:.2s}
.ah-cell.active{box-shadow:0 8px 22px -10px rgba(16,40,34,.18);border-color:rgba(250, 129, 37,.2)}
.ah-cell.active:hover{transform:translateY(-2px);box-shadow:0 14px 30px -14px rgba(16,40,34,.25)}
.ah-cell.empty{opacity:.55}
.ah-cell.tone-gold.active{background:linear-gradient(135deg,#FEF3C7,#FFFFFF)}
.ah-cell.tone-red.active{background:linear-gradient(135deg,#FEE2E2,#FFFFFF)}
.ah-cell.tone-green.active{background:linear-gradient(135deg,#D1FAE5,#FFFFFF)}
.ah-cell.tone-amber.active{background:linear-gradient(135deg,#FED7AA,#FFFFFF)}
.ah-cell.tone-blue.active{background:linear-gradient(135deg,#DBEAFE,#FFFFFF)}
.ah-cell.tone-purple.active{background:linear-gradient(135deg,#E9D5FF,#FFFFFF)}
.ah-cell.tone-emerald.active{background:linear-gradient(135deg,#A7F3D0,#FFFFFF)}
.ah-cell.tone-redx.active{background:linear-gradient(135deg,#FCA5A5,#FFFFFF)}
.ah-num{font-size:30px;font-weight:800;letter-spacing:-.02em;line-height:1;margin-bottom:5px;color:#0A0A0A}
.ah-lbl{font-size:11px;font-weight:700;color:#7C8A84}
.ah-section{background:rgba(255,255,255,.82);border:1px solid rgba(10,10,10,.07);border-radius:16px;padding:18px 20px;margin-bottom:14px}
.ah-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;gap:12px}
.ah-header h3{font-size:15px;font-weight:800;margin:0}
.ah-toggle{font-size:12px;font-weight:700;color:#FA8125;background:#E7F1ED;border:none;padding:6px 12px;border-radius:8px;cursor:pointer}
.ah-toggle:hover{background:rgba(250, 129, 37,.13)}
.ah-list{display:flex;flex-direction:column;gap:8px}
.ah-item{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;background:#FAFAF7;border-radius:12px;border:1px solid rgba(10,10,10,.04);text-decoration:none;color:inherit;transition:.18s}
.ah-item:hover{background:#F3F1EA}
.ah-item-main{flex:1;min-width:0}
.ah-item-name{font-size:13.5px;font-weight:700;margin-bottom:4px;color:#0A0A0A}
.ah-item-meta{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.ah-item-bio{font-size:12px;color:#7C8A84;font-style:italic;margin-top:6px}
.ah-meta{font-size:11.5px;color:#7C8A84;font-weight:600}
.ah-badge{font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px;background:#E7F1ED;color:#FA8125}
.ah-badge.green{background:#D1FAE5;color:#065F46}
.ah-badge.gold{background:linear-gradient(135deg,#FEF3C7,#FCD34D);color:#78350F}
.ah-badge.gray{background:#F3F4F6;color:#374151}
.ah-badge.sev-critical{background:#FEE2E2;color:#991B1B}
.ah-badge.sev-warn{background:#FEF3C7;color:#92400E}
.ah-badge.sev-info{background:#DBEAFE;color:#1E40AF}
.ah-item-actions{display:flex;gap:6px;align-items:center;flex:none}
.ah-btn{font-size:12px;font-weight:700;padding:6px 10px;border-radius:8px;background:#FFFFFF;border:1px solid rgba(10,10,10,.07);color:#0A0A0A;text-decoration:none;transition:.15s}
.ah-btn:hover{transform:translateY(-1px);box-shadow:0 4px 10px -3px rgba(0,0,0,.1)}
.ah-btn-wa{background:#10B981;color:#fff;border-color:#10B981}
.ah-btn-wa:hover{background:#059669}
.ah-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:14px}
@media(max-width:640px){.ah-stats{grid-template-columns:repeat(2,1fr)}}
.ah-stat{text-align:center;padding:10px;background:#FAFAF7;border-radius:10px}
.ah-stat-num{font-size:22px;font-weight:800;color:#FA8125}
.ah-stat-lbl{font-size:11px;font-weight:700;color:#7C8A84;margin-top:3px}
`
