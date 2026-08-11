// src/app/admin/orchestrator/page.tsx
// مركز تحكم المارد — الكرونات (عرض حالة فقط، read-only)
import { supabase as db } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const C = {
  green: '#2B4521', greenMid: '#2FA084', gold: '#d4a017', cream: '#FAFAF7',
  ink: '#0A0A0A', gray: '#6B7280', line: '#e8e6df', white: '#FFFFFF', red: '#c0392b',
}

type Job = {
  job_key: string; category: string | null; policy_cron: string | null
  managed: boolean; enabled: boolean; last_run_at: string | null
  last_status: string | null; run_count: number; error_count: number
}
type Run = { job_key: string | null; triggered_by: string | null; status: string | null; started_at: string }

function ago(ts: string | null): string {
  if (!ts) return '—'
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (s < 60) return `من ${s}ث`
  if (s < 3600) return `من ${Math.floor(s / 60)}د`
  if (s < 86400) return `من ${Math.floor(s / 3600)}س`
  return `من ${Math.floor(s / 86400)} يوم`
}

async function load() {
  const [jobsR, runsR] = await Promise.all([
    db.from('orchestrator_jobs')
      .select('job_key,category,policy_cron,managed,enabled,last_run_at,last_status,run_count,error_count')
      .order('category', { ascending: true }).order('job_key', { ascending: true }),
    db.from('orchestrator_job_runs')
      .select('job_key,triggered_by,status,started_at')
      .order('id', { ascending: false }).limit(25),
  ])
  return { jobs: (jobsR.data ?? []) as Job[], runs: (runsR.data ?? []) as Run[] }
}

const th = { padding: '6px 8px', fontWeight: 800, whiteSpace: 'nowrap' } as const
const td = { padding: '8px', whiteSpace: 'nowrap' } as const
const catName: Record<string, string> = { infra: '🔌 البنية التحتية', monitor: '📈 المراقبة', work: '⚙️ الشغل' }

function Tile({ v, l, tone }: { v: number; l: string; tone: 'green' | 'gray' | 'red' }) {
  const color = tone === 'red' ? C.red : tone === 'gray' ? C.gray : C.green
  return (
    <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 16, padding: '16px 18px', flex: '1 1 150px', minWidth: 150 }}>
      <div style={{ fontSize: 34, fontWeight: 900, color, lineHeight: 1.1 }}>{v}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginTop: 4 }}>{l}</div>
    </div>
  )
}

export default async function OrchestratorPage() {
  const { jobs, runs } = await load()
  const real = jobs.filter(j => j.job_key !== '_selftest_ping')
  const live = real.filter(j => j.managed && j.enabled)
  const standby = real.filter(j => j.managed && !j.enabled)
  const lastBeat = runs.find(r => r.triggered_by === 'heartbeat')?.started_at ?? runs[0]?.started_at ?? null
  const beatFresh = lastBeat ? (Date.now() - new Date(lastBeat).getTime()) < 150000 : false
  const errsTotal = real.reduce((n, j) => n + (j.error_count || 0), 0)
  const cats = ['infra', 'monitor', 'work'] as const

  return (
    <div dir="rtl" style={{ fontFamily: 'Cairo, Tahoma, sans-serif', background: C.cream, minHeight: '100vh', padding: 24 }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>

        <div style={{ background: `linear-gradient(100deg, ${C.gold} 0%, ${C.greenMid} 45%, ${C.green} 100%)`, borderRadius: 20, padding: '22px 26px', color: C.white, marginBottom: 18 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>مركز تحكم المارد — الكرونات 🧞</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, opacity: 0.92 }}>كل المهام بتتشغّل من نبضة واحدة، والمارد هو اللي بيوزّع.</p>
        </div>

        <div style={{ background: beatFresh ? '#eef7f2' : '#fdecea', border: `1px solid ${beatFresh ? '#cfe8dd' : '#f5c6c0'}`, borderRadius: 16, padding: '14px 18px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>{beatFresh ? '🟢' : '🔴'}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, color: beatFresh ? C.green : C.red, fontSize: 15 }}>
              {beatFresh ? 'النبضة شغّالة' : 'النبضة متأخرة — الحارس المفروض يرجّعها'}
            </div>
            <div style={{ fontSize: 12.5, color: C.gray, marginTop: 2 }}>آخر ضربة قلب: {ago(lastBeat)}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 22 }}>
          <Tile v={real.length} l="إجمالي المهام" tone="green" />
          <Tile v={live.length} l="شغّالة تحت المارد" tone="green" />
          <Tile v={standby.length} l="Standby (متوقفة)" tone="gray" />
          <Tile v={errsTotal} l="أخطاء متراكمة" tone={errsTotal ? 'red' : 'green'} />
        </div>

        {cats.map(cat => {
          const rows = real.filter(j => (j.category || 'work') === cat)
          if (!rows.length) return null
          return (
            <div key={cat} style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 16, padding: 16, marginBottom: 16 }}>
              <h2 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 900, color: C.green }}>
                {catName[cat]} <span style={{ color: C.gray, fontWeight: 700, fontSize: 13 }}>({rows.length})</span>
              </h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ color: C.gray, textAlign: 'right', borderBottom: `1px solid ${C.line}` }}>
                      <th style={th}>المهمة</th><th style={th}>التوقيت</th><th style={th}>الحالة</th>
                      <th style={th}>آخر تشغيل</th><th style={th}>مرات</th><th style={th}>أخطاء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(j => (
                      <tr key={j.job_key} style={{ borderBottom: `1px solid ${C.cream}` }}>
                        <td style={{ ...td, fontWeight: 700, color: C.ink }}>{j.job_key}</td>
                        <td style={{ ...td, fontFamily: 'monospace', color: C.gray, direction: 'ltr', textAlign: 'left' }}>{j.policy_cron || 'يدوي'}</td>
                        <td style={td}>
                          <span style={{ background: j.enabled ? C.green : C.gray, color: '#fff', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 999 }}>
                            {j.enabled ? 'شغّالة' : 'Standby'}
                          </span>
                        </td>
                        <td style={{ ...td, color: C.gray }}>{ago(j.last_run_at)}</td>
                        <td style={{ ...td, color: C.gray }}>{j.run_count}</td>
                        <td style={td}>{j.error_count ? <span style={{ color: C.red, fontWeight: 800 }}>{j.error_count}</span> : <span style={{ color: C.gray }}>0</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}

        <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 16, padding: 16 }}>
          <h2 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 900, color: C.green }}>آخر التشغيلات</h2>
          <div style={{ display: 'grid', gap: 6 }}>
            {runs.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, padding: '6px 8px', background: C.cream, borderRadius: 8 }}>
                <span>{r.status === 'ok' ? '✅' : r.status === 'error' ? '❌' : '⏳'}</span>
                <span style={{ fontWeight: 700, color: C.ink, flex: 1 }}>{r.job_key}</span>
                <span style={{ color: C.gray }}>{r.triggered_by}</span>
                <span style={{ color: C.gray }}>{ago(r.started_at)}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ textAlign: 'center', color: C.gray, fontSize: 12, marginTop: 20, lineHeight: 1.7 }}>
          عرض فقط. للتشغيل اليدوي: <code style={{ background: '#eee', padding: '1px 5px', borderRadius: 4 }}>select marid_run_job(&apos;اسم_المهمة&apos;)</code>
          <br />نبضة كل دقيقة · حارس كل دقيقتين · تنظيف اللوج كل يوم.
        </p>
      </div>
    </div>
  )
}
