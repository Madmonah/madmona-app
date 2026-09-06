'use client'

// ============================================================================
// 📣 CampaignLinks — لينكات حملات الدعاية + ليداتها قدام الأدمن في الداشبورد
//
// (٦/٩/٢٠٢٦) محمد: «حط اللينكات بتاعت الدعاية دي في أي مكان في الداشبورد
//    بحيث تكون قدامنا كأدمن». وبعدها: «عايزك تتولى الحملة بالكامل أورجانيك
//    ونفسي موديول يتابع كل حاجة لوحده» — فالكارت بقى بيعرض لكل حملة
//    عدّاد الليدات (الكل · النهارده · جديد · اتحوّل) وآخر الليدات بحالتها.
//    المصدر: /api/admin/campaign-leads (جدول campaign_leads — UTM من الصفحات).
//
// حملة جديدة = سطر في CAMPAIGNS بس (campaign = نفس المفتاح اللي الصفحة بتبعته).
// ============================================================================
import { useCallback, useEffect, useState } from 'react'

const ORIGIN = 'https://www.madmonacairo.com'

const CAMPAIGNS: { key: string; emoji: string; name: string; path: string; note: string }[] = [
  {
    key: 'erp1000',
    emoji: '💼',
    name: 'سيستم إدارة البيزنس — ١٠٠٠ ج بدل ٢٠٠٠',
    path: '/pro',
    note: 'الحملة الأساسية لأصحاب البيزنس (أورجانيك): ERP + CRM + بوت واتساب + دليفري. فورم → ليد هنا + پوش.',
  },
  {
    key: 'title',
    emoji: '🏷️',
    name: 'من صورتك هنقولك شغلك',
    path: '/title',
    note: 'وجهة ريلز التيك توك — بيرفع صورة (كاميرا أو معرض) والموديل بيقوله مهنته ونشاطه',
  },
  {
    key: 'expo',
    emoji: '🏗️',
    name: 'معرض Egypt Projects 2026 — العارضين',
    path: '/expo',
    note: 'نبذة مضمونة للعارضين + فورم التواصل بالإيميل',
  },
]

type Counts = Record<string, { total: number; today: number; new: number; converted: number }>
type Lead = { id: string; campaign: string; name: string | null; phone: string; business_type: string | null; city: string | null; message: string | null; utm_source: string | null; status: string; created_at: string }

const STATUS_AR: Record<string, string> = { new: '🆕 جديد', contacted: '📞 اتكلمنا', converted: '✅ اشترك', lost: '✖️ مش مهتم' }

export function CampaignLinks() {
  const [copied, setCopied] = useState<string | null>(null)
  const [counts, setCounts] = useState<Counts>({})
  const [recent, setRecent] = useState<Lead[]>([])
  const [showLeads, setShowLeads] = useState(false)

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/campaign-leads', { cache: 'no-store' }).then((x) => x.json())
      if (r?.ok) { setCounts(r.counts || {}); setRecent(r.recent || []) }
    } catch { /* الداشبورد بيشتغل من غيرها */ }
  }, [])
  useEffect(() => { load(); const t = setInterval(load, 60_000); return () => clearInterval(t) }, [load])

  async function copy(url: string) {
    try { await navigator.clipboard.writeText(url); setCopied(url); setTimeout(() => setCopied(null), 1500) } catch { /* اللينك ظاهر */ }
  }
  async function setStatus(id: string, status: string) {
    await fetch('/api/admin/campaign-leads', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, status }) })
    load()
  }

  const totalNew = Object.values(counts).reduce((a, c) => a + c.new, 0)

  return (
    <section id="campaigns" style={{ marginTop: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
        <h2 style={{ fontSize: 15, fontWeight: 900, color: '#14231E', margin: 0 }}>📣 الحملات وليداتها</h2>
        <button type="button" onClick={() => setShowLeads((v) => !v)}
          style={{ border: 'none', borderRadius: 999, padding: '5px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer',
            background: totalNew ? '#B4552F' : '#F3F6F4', color: totalNew ? '#fff' : '#14231E' }}>
          {totalNew ? `${totalNew} ليد جديد` : 'آخر الليدات'} {showLeads ? '▴' : '▾'}
        </button>
      </div>
      <p style={{ fontSize: 12, color: '#8A9690', marginBottom: 14 }}>
        الصفحات اللي الدعاية بتودّي عليها — انسخ اللينك (أو نسخة بـUTM للمنصة) وحطه في الكابشن أو البايو. العدّاد من الفورمات فعلًا.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
        {CAMPAIGNS.map((c) => {
          const url = ORIGIN + c.path
          const k = counts[c.key]
          return (
            <div key={c.path} style={{ background: '#fff', border: '1px solid rgba(0,0,0,.07)', borderRadius: 14, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 18 }}>{c.emoji}</span>
                <strong style={{ fontSize: 13.5, color: '#14231E', flex: 1 }}>{c.name}</strong>
              </div>
              <p style={{ fontSize: 11.5, color: '#5A6660', margin: '0 0 8px' }}>{c.note}</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8, fontSize: 11, fontWeight: 800 }}>
                <span style={{ background: '#F3F6F4', borderRadius: 8, padding: '3px 8px' }}>الكل {k?.total ?? 0}</span>
                <span style={{ background: '#F3F6F4', borderRadius: 8, padding: '3px 8px' }}>النهارده {k?.today ?? 0}</span>
                <span style={{ background: k?.new ? '#FDECE4' : '#F3F6F4', color: k?.new ? '#B4552F' : '#14231E', borderRadius: 8, padding: '3px 8px' }}>جديد {k?.new ?? 0}</span>
                <span style={{ background: '#E6F4EE', color: '#1F6F5F', borderRadius: 8, padding: '3px 8px' }}>اشترك {k?.converted ?? 0}</span>
              </div>
              <code dir="ltr" style={{ display: 'block', fontSize: 12, color: '#1F6F5F', background: '#F3F6F4',
                borderRadius: 8, padding: '6px 8px', marginBottom: 8, overflowX: 'auto', textAlign: 'left' }}>
                {url}
              </code>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button type="button" onClick={() => copy(url)}
                  style={{ flex: 1, border: 'none', borderRadius: 9, padding: '7px 10px', fontSize: 12, fontWeight: 800,
                    background: copied === url ? '#2FA084' : '#04352A', color: '#fff', cursor: 'pointer' }}>
                  {copied === url ? '✓ اتنسخ' : 'انسخ اللينك'}
                </button>
                {(['tiktok', 'instagram', 'facebook'] as const).map((src) => {
                  const u = `${url}?utm_source=${src}&utm_medium=organic&utm_content=${c.key}`
                  return (
                    <button key={src} type="button" onClick={() => copy(u)} title={`نسخة بـUTM لـ${src}`}
                      style={{ border: '1px solid rgba(0,0,0,.08)', borderRadius: 9, padding: '7px 8px', fontSize: 11, fontWeight: 800,
                        background: copied === u ? '#2FA084' : '#fff', color: copied === u ? '#fff' : '#14231E', cursor: 'pointer' }}>
                      {copied === u ? '✓' : src === 'tiktok' ? 'TT' : src === 'instagram' ? 'IG' : 'FB'}
                    </button>
                  )
                })}
                <a href={url} target="_blank" rel="noopener noreferrer"
                  style={{ borderRadius: 9, padding: '7px 10px', fontSize: 12, fontWeight: 800, background: '#F3F6F4', color: '#14231E', textDecoration: 'none' }}>
                  افتح ↗
                </a>
              </div>
            </div>
          )
        })}
      </div>

      {showLeads && (
        <div style={{ marginTop: 12, background: '#fff', border: '1px solid rgba(0,0,0,.07)', borderRadius: 14, padding: '10px 12px' }}>
          {recent.length === 0 ? (
            <p style={{ fontSize: 12, color: '#8A9690', margin: 0 }}>لسه مفيش ليدات من الحملات.</p>
          ) : recent.map((l) => (
            <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderTop: '1px solid rgba(0,0,0,.05)', fontSize: 12 }}>
              <span style={{ fontWeight: 800, minWidth: 70 }}>{CAMPAIGNS.find((c) => c.key === l.campaign)?.emoji ?? '📣'} {l.campaign}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <b>{l.name || '—'}</b> <span dir="ltr" style={{ color: '#5A6660' }}>+{l.phone}</span>
                {l.business_type ? ` · ${l.business_type}` : ''}{l.city ? ` · ${l.city}` : ''}{l.utm_source ? ` · من ${l.utm_source}` : ''}
                {l.message ? <span style={{ display: 'block', color: '#5A6660' }}>{l.message}</span> : null}
              </span>
              <select value={l.status} onChange={(e) => setStatus(l.id, e.target.value)}
                style={{ fontSize: 11, fontWeight: 800, borderRadius: 8, border: '1px solid rgba(0,0,0,.1)', padding: '4px 6px' }}>
                {Object.entries(STATUS_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <a href={`https://wa.me/${l.phone}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, fontWeight: 800, color: '#1F6F5F', textDecoration: 'none' }}>واتساب</a>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
