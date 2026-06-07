'use client'

/* ============================================================
   QuickHub — Top-of-dashboard navigation hub.
   8 big tiles, each pointing to a major Madmona admin section.
   Live counters pull from get_admin_quickhub_counts RPC.
   ============================================================ */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'

type Counts = {
  listings_published: number
  pending_payouts_count: number
  new_leads_today: number
  posts_this_week: number
  agents_active: number
  open_alerts: number
  careers_new: number
  suppliers_active: number
}

const DEFAULTS: Counts = {
  listings_published: 0,
  pending_payouts_count: 0,
  new_leads_today: 0,
  posts_this_week: 0,
  agents_active: 0,
  open_alerts: 0,
  careers_new: 0,
  suppliers_active: 0,
}

type Tile = {
  emoji: string
  label: string
  sub: string
  href: string
  accent: 'green' | 'gold' | 'teal' | 'ink' | 'rose' | 'purple' | 'blue' | 'orange'
  count?: number
  countLabel?: string
}

export function QuickHub() {
  const [c, setC] = useState<Counts>(DEFAULTS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const sb = supabaseBrowser as any
        const { data } = await sb.rpc('get_admin_quickhub_counts')
        if (!cancelled && data) setC({ ...DEFAULTS, ...data })
        if (!cancelled) setLoaded(true)
      } catch {
        if (!cancelled) setLoaded(true)
      }
    }
    load()
    const id = setInterval(load, 90000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  const tiles: Tile[] = [
    { emoji: '🛒', label: 'السوق والليستنجز', sub: 'ليستنجز · حجوزات · فئات', href: '/admin/listings', accent: 'green', count: c.listings_published, countLabel: 'منشور' },
    { emoji: '💰', label: 'المالية والعهدة', sub: 'مستحقات · مدفوعات · شركاء', href: '/admin/payouts', accent: 'gold', count: c.pending_payouts_count, countLabel: 'بانتظار الدفع' },
    { emoji: '👥', label: 'الموردين والشركاء', sub: 'KYC · شراكات · B2B', href: '/admin/marketplace-suppliers', accent: 'teal', count: c.suppliers_active, countLabel: 'نشط' },
    { emoji: '📲', label: 'الليدز والتواصل', sub: 'Outreach · WhatsApp · funnel', href: '/admin/outreach-leads', accent: 'blue', count: c.new_leads_today, countLabel: 'lead جديد' },
    { emoji: '🎨', label: 'المحتوى والإعلانات', sub: 'سوشيال · إيميل · إعلانات', href: '/admin/marketing-hq', accent: 'rose', count: c.posts_this_week, countLabel: 'بوست' },
    { emoji: '🤖', label: 'الـ AI OS', sub: 'Agents · workflows · pipelines', href: '/admin/ai-os', accent: 'purple', count: c.agents_active, countLabel: 'agent' },
    { emoji: '📊', label: 'المراقبة والتنبيهات', sub: 'insights · alerts · activity', href: '/admin/alerts', accent: 'orange', count: c.open_alerts, countLabel: 'مفتوح' },
    { emoji: '💼', label: 'الموارد البشرية', sub: 'توظيف · فريق · حضور', href: '/admin/careers', accent: 'ink', count: c.careers_new, countLabel: 'طلب جديد' },
  ]

  return (
    <section className="qhub-sec">
      <div className="qhub-head">
        <div>
          <div className="qhub-kicker">مراكز التحكم</div>
          <h2>كل حاجة في إيدك من هنا</h2>
          <p>اضغط على أي مركز لتدخل أدواته الكاملة.</p>
        </div>
        {!loaded && <div className="qhub-loading" />}
      </div>

      <div className="qhub-grid">
        {tiles.map((t, i) => (
          <Link key={t.href} href={t.href} className={`qhub-tile a-${t.accent}`} style={{ animationDelay: `${0.04 * i}s` }}>
            <div className="qhub-emoji">{t.emoji}</div>
            <div className="qhub-body">
              <div className="qhub-label">{t.label}</div>
              <div className="qhub-sub">{t.sub}</div>
              {t.count !== undefined && (
                <div className="qhub-stat">
                  <b>{t.count.toLocaleString('en-US')}</b>
                  <span>{t.countLabel}</span>
                </div>
              )}
            </div>
            <div className="qhub-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 6l-6 6 6 6" /></svg>
            </div>
          </Link>
        ))}
      </div>

      <style jsx>{`
        .qhub-sec{margin:0 0 28px}
        .qhub-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:18px;flex-wrap:wrap}
        .qhub-kicker{display:inline-flex;align-items:center;gap:8px;font-size:11px;font-weight:800;letter-spacing:.08em;color:#1F6F5F;margin-bottom:6px}
        .qhub-kicker::before{content:"";width:6px;height:6px;border-radius:50%;background:linear-gradient(118deg,#D4A017,#2FA084,#1F6F5F)}
        .qhub-head h2{font-size:22px;font-weight:800;letter-spacing:-.02em;margin:0;color:#0A0A0A}
        .qhub-head p{font-size:13px;color:#7C8A84;font-weight:500;margin:3px 0 0}
        .qhub-loading{width:18px;height:18px;border-radius:50%;border:2.5px solid #E7F1ED;border-top-color:#1F6F5F;animation:qhsp 1s linear infinite}
        @keyframes qhsp{to{transform:rotate(360deg)}}

        .qhub-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}

        .qhub-tile{
          display:flex;align-items:center;gap:14px;padding:18px;
          background:rgba(255,255,255,.92);backdrop-filter:blur(8px);
          border:1px solid rgba(10,10,10,.07);border-radius:18px;
          box-shadow:0 1px 2px rgba(16,40,34,.04), 0 8px 22px -10px rgba(16,40,34,.12);
          transition:transform .22s,box-shadow .22s,border-color .22s;
          text-decoration:none;color:#0A0A0A;cursor:pointer;
          opacity:0;animation:qhrise .55s cubic-bezier(.2,.7,.2,1) forwards;
          position:relative;overflow:hidden;
        }
        .qhub-tile::before{
          content:"";position:absolute;top:0;inset-inline-start:0;width:5px;height:100%;
          background:var(--ax,#1F6F5F);border-start-end-radius:18px;border-end-end-radius:18px;
          opacity:.85;transition:width .22s;
        }
        .qhub-tile:hover{transform:translateY(-4px);box-shadow:0 22px 50px -22px rgba(16,40,34,.28);border-color:var(--ax,#1F6F5F)}
        .qhub-tile:hover::before{width:7px}
        @keyframes qhrise{to{opacity:1;transform:translateY(0)}}

        .qhub-emoji{
          width:54px;height:54px;border-radius:14px;
          background:var(--bg,linear-gradient(135deg,#E7F1ED,#F3F1EA));
          display:grid;place-items:center;font-size:28px;flex:none;
          border:1px solid rgba(10,10,10,.06);
        }
        .qhub-body{flex:1;min-width:0}
        .qhub-label{font-size:15px;font-weight:800;letter-spacing:-.01em;line-height:1.2;margin-bottom:3px}
        .qhub-sub{font-size:11.5px;color:#7C8A84;font-weight:600;line-height:1.35;margin-bottom:8px;
          overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .qhub-stat{display:flex;align-items:baseline;gap:6px}
        .qhub-stat b{font-size:18px;font-weight:700;color:var(--ax,#1F6F5F);font-family:var(--font-inter),system-ui,sans-serif}
        .qhub-stat span{font-size:10.5px;color:#7C8A84;font-weight:600}

        .qhub-arrow{color:#7C8A84;opacity:.5;transition:.22s;flex:none}
        .qhub-arrow svg{width:18px;height:18px}
        .qhub-tile:hover .qhub-arrow{opacity:1;color:var(--ax,#1F6F5F);transform:translateX(-3px)}

        /* accent palette per tile */
        .a-green   { --ax:#1F6F5F; --bg:linear-gradient(135deg,#E7F1ED,#F3F1EA) }
        .a-gold    { --ax:#D4A017; --bg:linear-gradient(135deg,#FAEFD1,#F3F1EA) }
        .a-teal    { --ax:#2FA084; --bg:linear-gradient(135deg,#D7EFE6,#F3F1EA) }
        .a-blue    { --ax:#3D7BB6; --bg:linear-gradient(135deg,#D9E7F4,#F3F1EA) }
        .a-rose    { --ax:#C75D8A; --bg:linear-gradient(135deg,#F4DCE5,#F3F1EA) }
        .a-purple  { --ax:#7A5AC9; --bg:linear-gradient(135deg,#E2D9F5,#F3F1EA) }
        .a-orange  { --ax:#D4711A; --bg:linear-gradient(135deg,#FAE1CB,#F3F1EA) }
        .a-ink     { --ax:#0F3D2C; --bg:linear-gradient(135deg,#D5E0DB,#F3F1EA) }

        @media(max-width:1180px){.qhub-grid{grid-template-columns:repeat(3,1fr)}}
        @media(max-width:780px){.qhub-grid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:480px){.qhub-grid{grid-template-columns:1fr}}
      `}</style>
    </section>
  )
}
