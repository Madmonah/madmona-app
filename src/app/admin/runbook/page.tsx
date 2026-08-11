// src/app/admin/runbook/page.tsx
// System Runbook viewer — institutional knowledge / engineering decisions log.
// Added May 16 2026 as part of admin dashboard redesign.

import { supabase as supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type RunbookEntry = {
  id: string
  topic: string
  category: string | null
  title: string
  content: string
  status: string
  related_functions: string[] | null
  related_cron_jobs: string[] | null
  blocker: string | null
  next_steps: string | null
  last_verified_at: string | null
  created_at: string
  updated_at: string
}

export default async function RunbookPage({
  searchParams,
}: {
  searchParams: { category?: string; status?: string; q?: string }
}) {
  let query = supabaseAdmin
    .from('system_runbook')
    .select('*')
    .order('updated_at', { ascending: false })

  if (searchParams.category) query = query.eq('category', searchParams.category)
  if (searchParams.status) query = query.eq('status', searchParams.status)
  if (searchParams.q) query = query.or(`title.ilike.%${searchParams.q}%,topic.ilike.%${searchParams.q}%`)

  const { data } = await query.limit(200)
  const entries = (data ?? []) as RunbookEntry[]

  // Categories for filter chips
  const { data: catRows } = await supabaseAdmin
    .from('system_runbook')
    .select('category')
    .not('category', 'is', null)
  const categories = Array.from(new Set((catRows ?? []).map(r => r.category).filter(Boolean))) as string[]

  return (
    <div dir="rtl" style={pageStyle}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Header
          title="📓 System Runbook"
          subtitle={`${entries.length} entry · institutional knowledge & engineering decisions`}
        />

        {/* Filter bar */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <a href="/admin/runbook" style={searchParams.category || searchParams.status ? chipStyle : chipActiveStyle}>الكل</a>
          {categories.map(cat => (
            <a key={cat} href={`/admin/runbook?category=${encodeURIComponent(cat)}`}
              style={searchParams.category === cat ? chipActiveStyle : chipStyle}>
              {cat}
            </a>
          ))}
          <a href="/admin/runbook?status=active" style={searchParams.status === 'active' ? chipActiveStyle : chipStyle}>
            ✓ active فقط
          </a>
        </div>

        {/* Entries list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {entries.length === 0 && (
            <div style={emptyStyle}>مفيش entries مطابقة للفلتر</div>
          )}
          {entries.map(e => (
            <article key={e.id} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
                <h3 style={{ margin: 0, color: '#FA8125', fontSize: 16 }}>{e.title}</h3>
                <span style={statusBadgeStyle(e.status)}>{e.status}</span>
              </div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                <span style={{ background: '#f3f0e8', padding: '2px 6px', borderRadius: 4, marginInlineEnd: 6 }}>
                  {e.topic}
                </span>
                {e.category && <span>category: {e.category} · </span>}
                <span>آخر تحديث: {new Date(e.updated_at).toLocaleDateString('ar-EG')}</span>
              </div>
              <pre style={{
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                fontFamily: 'inherit', fontSize: 13, color: '#333',
                marginTop: 10, marginBottom: 0, maxHeight: 200, overflow: 'auto',
                background: '#fafaf7', padding: 10, borderRadius: 6,
              }}>
                {e.content.length > 800 ? e.content.slice(0, 800) + '\n…' : e.content}
              </pre>
              {(e.blocker || e.next_steps) && (
                <div style={{ marginTop: 8, fontSize: 12 }}>
                  {e.blocker && <div style={{ color: '#6FCF97' }}><strong>blocker:</strong> {e.blocker}</div>}
                  {e.next_steps && <div style={{ color: '#FA8125' }}><strong>next:</strong> {e.next_steps}</div>}
                </div>
              )}
            </article>
          ))}
        </div>

        <BackToDashboard />
      </div>
    </div>
  )
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header style={{ marginBottom: 20, textAlign: 'center' }}>
      <h1 style={{ color: '#FA8125', margin: 0, fontSize: 26 }}>{title}</h1>
      <p style={{ color: '#666', marginTop: 6, fontSize: 13 }}>{subtitle}</p>
    </header>
  )
}

function BackToDashboard() {
  return (
    <div style={{ marginTop: 24, textAlign: 'center' }}>
      <a href="/admin/ai-os" style={{
        color: '#FA8125', textDecoration: 'none', fontSize: 13,
        padding: '8px 16px', background: '#fff', borderRadius: 8,
        border: '1px solid #FA8125', display: 'inline-block',
      }}>← رجوع للداشبورد</a>
    </div>
  )
}

const pageStyle: React.CSSProperties = {
  fontFamily: 'Tahoma, Arial, sans-serif',
  background: '#FAF7F0', minHeight: '100vh',
  padding: '24px 20px', color: '#1a1a1a',
}
const cardStyle: React.CSSProperties = {
  background: '#fff', padding: 16, borderRadius: 10,
  border: '1px solid #E5E5E0',
}
const chipStyle: React.CSSProperties = {
  fontSize: 12, padding: '6px 12px', background: '#fff',
  borderRadius: 20, border: '1px solid #E5E5E0',
  color: '#FA8125', textDecoration: 'none',
}
const chipActiveStyle: React.CSSProperties = {
  ...chipStyle, background: '#FA8125', color: '#fff', borderColor: '#FA8125',
}
const emptyStyle: React.CSSProperties = {
  textAlign: 'center', padding: 40, color: '#888',
  background: '#fff', borderRadius: 10, border: '1px dashed #E5E5E0',
}
function statusBadgeStyle(status: string): React.CSSProperties {
  const colors: Record<string, string> = {
    active: '#10B981', resolved: '#888', blocked: '#DC2626', deferred: '#2FA084',
  }
  return {
    fontSize: 10, padding: '3px 8px', borderRadius: 12,
    background: colors[status] ?? '#888', color: '#fff', flexShrink: 0,
  }
}
