// src/app/admin/policy-rules/page.tsx
// Policy Rules viewer — content/WhatsApp/creative policies enforced at DB layer.
// Added May 16 2026 as part of admin dashboard redesign.

import { supabase as supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Rule = {
  id: string
  rule_key: string
  scope: string | null
  enforcement_level: string | null
  rule_arabic: string | null
  rule_english: string | null
  rationale: string | null
  source: string | null
  enabled: boolean
  added_at: string
  updated_at: string
}

export default async function PolicyRulesPage({
  searchParams,
}: {
  searchParams: { scope?: string; enabled?: string }
}) {
  let query = supabaseAdmin
    .from('policy_rules')
    .select('*')
    .order('scope', { ascending: true })
    .order('rule_key', { ascending: true })

  if (searchParams.scope) query = query.eq('scope', searchParams.scope)
  if (searchParams.enabled === 'true') query = query.eq('enabled', true)
  if (searchParams.enabled === 'false') query = query.eq('enabled', false)

  const { data } = await query.limit(200)
  const rules = (data ?? []) as Rule[]

  const { data: scopeRows } = await supabaseAdmin.from('policy_rules').select('scope').not('scope', 'is', null)
  const scopes = Array.from(new Set((scopeRows ?? []).map(r => r.scope).filter(Boolean))) as string[]

  return (
    <div dir="rtl" style={pageStyle}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <header style={{ marginBottom: 20, textAlign: 'center' }}>
          <h1 style={{ color: '#1F6F5F', margin: 0, fontSize: 26 }}>📋 Policy Rules</h1>
          <p style={{ color: '#666', marginTop: 6, fontSize: 13 }}>
            {rules.length} rule · enforcement عند DB trigger أو AI prompt
          </p>
        </header>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <a href="/admin/policy-rules" style={!searchParams.scope ? chipActiveStyle : chipStyle}>الكل</a>
          {scopes.map(scope => (
            <a key={scope} href={`/admin/policy-rules?scope=${encodeURIComponent(scope)}`}
              style={searchParams.scope === scope ? chipActiveStyle : chipStyle}>
              {scope}
            </a>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rules.length === 0 && (
            <div style={emptyStyle}>مفيش rules مطابقة</div>
          )}
          {rules.map(r => (
            <article key={r.id} style={{
              ...cardStyle,
              opacity: r.enabled ? 1 : 0.55,
              borderRight: `4px solid ${r.enabled ? enforcementColor(r.enforcement_level) : '#888'}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ margin: 0, color: '#1F6F5F', fontSize: 14, wordBreak: 'break-word' }}>
                    {r.rule_key}
                  </h3>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                    {r.scope && <span style={{ background: '#f3f0e8', padding: '2px 6px', borderRadius: 4, marginInlineEnd: 6 }}>scope: {r.scope}</span>}
                    {r.enforcement_level && <span>enforcement: {r.enforcement_level} · </span>}
                    {r.source && <span>source: {r.source}</span>}
                  </div>
                </div>
                <span style={r.enabled ? activeBadge : disabledBadge}>
                  {r.enabled ? '✓ enabled' : 'disabled'}
                </span>
              </div>
              {r.rule_arabic && (
                <p style={{ margin: '8px 0 0', fontSize: 13, color: '#333' }}>{r.rule_arabic}</p>
              )}
              {r.rule_english && (
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#555', fontStyle: 'italic' }}>{r.rule_english}</p>
              )}
              {r.rationale && (
                <p style={{ margin: '8px 0 0', fontSize: 11, color: '#888' }}>
                  <strong>السبب:</strong> {r.rationale}
                </p>
              )}
            </article>
          ))}
        </div>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <a href="/admin/ai-os" style={{
            color: '#1F6F5F', textDecoration: 'none', fontSize: 13,
            padding: '8px 16px', background: '#fff', borderRadius: 8,
            border: '1px solid #1F6F5F', display: 'inline-block',
          }}>← رجوع للداشبورد</a>
        </div>
      </div>
    </div>
  )
}

function enforcementColor(level: string | null): string {
  switch (level) {
    case 'hard': case 'block': case 'block_and_log': return '#DC2626'
    case 'soft': case 'auto_correct': return '#2FA084'
    case 'warn': return '#0EA5E9'
    default: return '#10B981'
  }
}

const pageStyle: React.CSSProperties = {
  fontFamily: 'Tahoma, Arial, sans-serif',
  background: '#FAF7F0', minHeight: '100vh',
  padding: '24px 20px', color: '#1a1a1a',
}
const cardStyle: React.CSSProperties = {
  background: '#fff', padding: 14, borderRadius: 10,
  border: '1px solid #E5E5E0',
}
const chipStyle: React.CSSProperties = {
  fontSize: 12, padding: '6px 12px', background: '#fff',
  borderRadius: 20, border: '1px solid #E5E5E0',
  color: '#1F6F5F', textDecoration: 'none',
}
const chipActiveStyle: React.CSSProperties = {
  ...chipStyle, background: '#1F6F5F', color: '#fff', borderColor: '#1F6F5F',
}
const activeBadge: React.CSSProperties = {
  fontSize: 10, padding: '3px 8px', borderRadius: 12,
  background: '#10B981', color: '#fff', flexShrink: 0,
}
const disabledBadge: React.CSSProperties = {
  ...activeBadge, background: '#888',
}
const emptyStyle: React.CSSProperties = {
  textAlign: 'center', padding: 40, color: '#888',
  background: '#fff', borderRadius: 10, border: '1px dashed #E5E5E0',
}
