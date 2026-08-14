'use client'

// AdminShell — شيل موحّد لكل صفحات الأدمن بتصميم «Madmona Admin v2» (أغسطس 2026).
// توب بار (لوجو + سيرش شامل + حالة النظام + التنبيهات) + سايدبار ثابت بمجموعات قابلة للطي.
// بيتطبق من admin/layout.tsx على كل الراوتس تحت /admin — غير مدمّر: محتوى الصفحات زي ما هو.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const MADMONA_ERP = '/admin/business-finance/c8b7b9d7-6178-4d0c-abdf-66f34b628e9d'

type NavItem = { href: string; label: string }
type NavGroup = { title: string; emoji: string; items: NavItem[] }

const NAV: NavGroup[] = [
  { title: 'القيادة', emoji: '🎛️', items: [
    { href: '/admin/dashboard', label: 'الأوفرفيو' },
    { href: '/admin/overview', label: 'كل الأدوات' },
    { href: '/admin/hq', label: 'HQ · مركز القيادة' },
    { href: '/admin/company', label: 'الشركة' },
    { href: '/admin/permissions', label: 'الصلاحيات' },
    { href: '/admin/workflows', label: 'الورك فلو' },
  ] },
  { title: 'إدارة مضمونة (ERP)', emoji: '💼', items: [
    { href: MADMONA_ERP, label: 'الإدارة الكاملة' },
  ] },
  { title: 'شركاء B2B', emoji: '🤝', items: [
    { href: '/admin/business-partners', label: 'الشركاء' },
    { href: '/admin/leads', label: 'Leads' },
    { href: '/admin/leads-feed', label: 'Leads Feed' },
  ] },
  { title: 'الماركت بليس', emoji: '🛍️', items: [
    { href: '/admin/listings', label: 'الإعلانات' },
    { href: '/admin/listing-drafts', label: 'المسودّات' },
    { href: '/admin/categories', label: 'الفئات' },
    { href: '/admin/marketplace-bookings', label: 'الحجوزات' },
    { href: '/admin/marketplace-orders', label: 'الطلبات' },
    { href: '/admin/payouts', label: 'المدفوعات' },
    { href: '/admin/projects', label: 'المشاريع' },
    { href: '/admin/projects-media', label: 'ميديا المشاريع' },
  ] },
  { title: 'الموردين', emoji: '👥', items: [
    { href: '/admin/sup', label: 'الموردين' },
    { href: '/admin/supplier-posts', label: 'منشورات الموردين' },
  ] },
  { title: 'AI / المارد', emoji: '🤖', items: [
    { href: '/admin/orchestrator', label: 'تحكم الكرونات 🧞' },
    { href: '/admin/ai-os', label: 'AI OS' },
    { href: '/admin/agent-health', label: 'صحة الوكلاء' },
    { href: '/admin/agent-runs', label: 'Runs Logs' },
    { href: '/admin/prompt-versions', label: 'Prompts' },
    { href: '/admin/marid', label: 'المارد' },
    { href: '/admin/pipelines', label: 'Pipelines' },
    { href: '/admin/alerts', label: 'التنبيهات' },
  ] },
  { title: 'الرسائل', emoji: '💬', items: [
    { href: '/admin/messages', label: 'المحادثات' },
    { href: '/admin/wa-review', label: 'مراجعة واتساب' },
    { href: '/admin/wa-numbers', label: 'أرقام واتساب' },
    { href: '/admin/daily-messages', label: 'رسالة اليوم' },
    { href: '/admin/welcome-messages', label: 'رسائل الترحيب' },
    { href: '/admin/email-queue', label: 'طابور الإيميل' },
    { href: '/admin/notifications', label: 'الإشعارات' },
  ] },
  { title: 'ماركتنج', emoji: '📣', items: [
    { href: '/admin/marketing-hq', label: 'Marketing HQ' },
    { href: '/admin/news', label: 'الأخبار' },
    { href: '/admin/reels', label: 'الريلز' },
    { href: '/admin/social-groups', label: 'الجروبات' },
    { href: '/admin/social-packs', label: 'الباقات' },
    { href: '/admin/ad-builder', label: 'منشئ الإعلانات' },
    { href: '/admin/ad-review', label: 'مراجعة الإعلانات' },
    { href: '/admin/sponsorships', label: 'الرعاية' },
  ] },
  { title: 'النظام', emoji: '⚙️', items: [
    { href: '/admin/site-settings', label: 'إعدادات الموقع' },
    { href: '/admin/email-templates', label: 'قوالب الإيميل' },
    { href: '/admin/subscriptions', label: 'الاشتراكات' },
    { href: '/admin/wallets', label: 'المحافظ' },
    { href: '/admin/careers', label: 'الوظائف' },
    { href: '/admin/runbook', label: 'Runbook' },
  ] },
]

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ 'ماركتنج': true, 'النظام': true })
  const [mobileNav, setMobileNav] = useState(false)
  const [w, setW] = useState(1200)

  useEffect(() => {
    const onR = () => setW(window.innerWidth)
    onR()
    window.addEventListener('resize', onR)
    return () => window.removeEventListener('resize', onR)
  }, [])

  // اقفل درج الموبايل مع أي تنقّل
  useEffect(() => { setMobileNav(false); setQuery('') }, [pathname])

  const isMobile = w < 900
  const showSidebar = !isMobile || mobileNav

  const allPages = useMemo(
    () => NAV.flatMap((g) => g.items.map((it) => ({ ...it, group: g.title }))),
    [],
  )
  const q = query.trim()
  const results = q
    ? allPages.filter((p) => p.label.includes(q) || p.group.includes(q) || p.href.includes(q)).slice(0, 8)
    : []

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <div dir="rtl" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', color: '#22322C', background: '#F7F6F1', fontFamily: "'Cairo', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;800;900&display=swap');
        @keyframes msh-pulse { 0%,100% { opacity: 1 } 50% { opacity: .4 } }
        .msh-scroll::-webkit-scrollbar { width: 6px; height: 6px }
        .msh-scroll::-webkit-scrollbar-thumb { background: rgba(250, 129, 37,.2); border-radius: 3px }
        .msh-item:hover { background: #F0EFE8 !important; color: #059669 !important }
        .msh-group:hover { color: #22322C !important }
        .msh-result:hover { background: #F7F6F1 }
        .msh-search:focus { border-color: #059669 !important; background: #fff !important }
        .msh-alerts:hover { background: #FAEEDC !important }
      `}</style>

      {/* ===== TOP BAR ===== */}
      <header style={{ height: 58, flex: 'none', display: 'flex', alignItems: 'center', gap: 14, padding: '0 20px', background: '#FFFFFF', borderBottom: '1px solid #E9E7DF', position: 'relative', zIndex: 40 }}>
        {isMobile && (
          <button onClick={() => setMobileNav((v) => !v)} aria-label="القائمة" style={{ width: 36, height: 36, border: '1px solid #E9E7DF', borderRadius: 10, background: '#fff', color: '#22322C', fontSize: 16, cursor: 'pointer', flex: 'none' }}>☰</button>
        )}
        <Link href="/admin/dashboard" style={{ display: 'flex', alignItems: 'baseline', gap: 8, flex: 'none', textDecoration: 'none' }}>
          <span style={{ fontWeight: 900, fontSize: 16, color: '#059669' }}>مضمونة</span>
          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.25em', color: '#A8A395' }}>ADMIN</span>
        </Link>
        <div style={{ flex: 1, maxWidth: 460, position: 'relative' }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث في كل الصفحات..."
            className="msh-search"
            style={{ width: '100%', height: 36, border: '1px solid #E9E7DF', borderRadius: 99, background: '#F7F6F1', color: '#22322C', padding: '0 16px', fontFamily: "'Cairo', sans-serif", fontSize: 12.5, outline: 'none' }}
          />
          {q.length > 0 && (
            <div className="msh-scroll" style={{ position: 'absolute', top: 44, right: 0, left: 0, background: '#fff', border: '1px solid #E9E7DF', borderRadius: 14, boxShadow: '0 12px 32px rgba(34,50,44,.12)', overflow: 'hidden auto', maxHeight: 320, zIndex: 50 }}>
              {results.map((r) => (
                <button
                  key={r.href}
                  onClick={() => { setQuery(''); router.push(r.href) }}
                  className="msh-result"
                  style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: "'Cairo', sans-serif", textAlign: 'right' }}
                >
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: '#22322C' }}>{r.label}</span>
                  <span style={{ fontSize: 10, color: '#A8A395' }}>{r.group}</span>
                </button>
              ))}
              {results.length === 0 && (
                <p style={{ margin: 0, padding: 14, fontSize: 12, color: '#A8A395', textAlign: 'center' }}>مفيش نتايج</p>
              )}
            </div>
          )}
        </div>
        <div style={{ flex: 1 }} />
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #E9E7DF', borderRadius: 99, padding: '5px 12px', background: '#fff' }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: '#2FA084', animation: 'msh-pulse 2.5s infinite' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#5D6B64' }}>النظام شغّال</span>
          </div>
        )}
        <Link
          href="/admin/alerts"
          className="msh-alerts"
          style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #F0DCC4', background: '#FDF6EC', color: '#8A5A00', borderRadius: 99, padding: '6px 12px', fontSize: 11, fontWeight: 800, cursor: 'pointer', textDecoration: 'none' }}
        >🔔 التنبيهات</Link>
      </header>

      <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>
        {/* ===== SIDEBAR ===== */}
        {showSidebar && (
          <nav
            className="msh-scroll"
            style={{
              ...(isMobile
                ? { position: 'absolute' as const, top: 0, bottom: 0, right: 0, zIndex: 35, width: 264, boxShadow: '-12px 0 40px rgba(34,50,44,.18)' }
                : { width: 240, flex: 'none' }),
              overflowY: 'auto', padding: '16px 10px 24px', background: '#FCFBF8', borderLeft: '1px solid #E9E7DF',
            }}
          >
            {NAV.map((g) => {
              const open = !collapsed[g.title]
              return (
                <div key={g.title} style={{ marginBottom: 4 }}>
                  <button
                    onClick={() => setCollapsed((s) => ({ ...s, [g.title]: !s[g.title] }))}
                    className="msh-group"
                    style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 8, padding: '8px 10px', border: 'none', borderRadius: 10, background: 'none', color: '#8A9590', cursor: 'pointer', fontFamily: "'Cairo', sans-serif" }}
                  >
                    <span style={{ fontSize: 13, opacity: 0.8 }}>{g.emoji}</span>
                    <span style={{ flex: 1, textAlign: 'right', fontSize: 11, fontWeight: 800, letterSpacing: '.05em' }}>{g.title}</span>
                    <span style={{ fontSize: 9, opacity: 0.5 }}>{open ? '▾' : '◂'}</span>
                  </button>
                  {open && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '0 0 6px' }}>
                      {g.items.map((it) => {
                        const active = isActive(it.href)
                        return (
                          <Link
                            key={it.href}
                            href={it.href}
                            className={active ? undefined : 'msh-item'}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', marginRight: 8,
                              border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 12.5, fontWeight: 700,
                              textAlign: 'right', width: 'calc(100% - 8px)', textDecoration: 'none',
                              ...(active ? { background: '#E8F1EE', color: '#059669' } : { background: 'none', color: '#5D6B64' }),
                            }}
                          >
                            <span style={{ flex: 1, textAlign: 'right' }}>{it.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        )}
        {isMobile && mobileNav && (
          <div onClick={() => setMobileNav(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(34,50,44,.35)', zIndex: 30 }} />
        )}

        {/* ===== MAIN ===== */}
        <main className="msh-scroll" style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
          {children}
        </main>
      </div>
    </div>
  )
}
