// src/app/admin/prompt-versions/page.tsx
import { supabase as supabaseAdmin } from '@/lib/supabase'
import PromptVersionActions from './PromptVersionActions'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Version {
  id: string
  agent_name: string
  version: number
  prompt_text: string
  prev_version: number | null
  changes_summary: string | null
  hypothesis: string | null
  is_active: boolean
  created_at: string
}

// 🐞 (١٥ أغسطس ٢٠٢٦ — محمد: «البرومت بتاع الوكلاء القديمة، مش عايز نسخ
//    قديمة تلخبطني»)
//
//    الصفحة دي كانت بتعرض ١٧٤ نسخة برومبت وكأنها حاجة شغّالة. الحقيقة:
//
//    ١) **مفيش أي أجينت بيقرا من الجدول ده.** دوّرت على `prompt_text` في
//       `src/` كلها: بتتقري في الصفحة دي بس، وبتتكتب في phase5-runners.
//       كل الأجينتس بتشتغل من ثوابت متكتوبة في الكود (`*_PROMPT`)، فزرار
//       «Activate» هنا مابيغيّرش سلوك أي أجينت — بيقلب عمود وخلاص.
//    ٢) `prompt-optimizer` — الأجينت اللي بيولّد النسخ دي — `enabled=false`
//       و `run_count=0`، **عمره ما اشتغل**. آخر نسخة في الجدول ١١ يونيو.
//    ٣) ٥٠ نسخة من الـ١٧٤ لأجينتس **مش موجودة أصلًا** في `agent_registry`.
//    ٤) في الجدول عمودين متناقضين: `active` و `is_active`. الصفحة والراوت
//       بيستخدموا `is_active` بس؛ `active` مش مستخدم في أي حتة.
//
//    التعديل: بنعرض **آخر نسخة لكل أجينت بس** (بدل ما القديمة تلخبط)،
//    وبنقول بالبنط العريض إن ده صندوق اقتراحات مش مصدر تشغيل، وبنعلّم
//    الأجينتس اللي مابقتش موجودة.
export default async function PromptVersionsPage() {
  const [{ data }, { data: reg }] = await Promise.all([
    supabaseAdmin
      .from('prompt_versions')
      .select('*')
      .order('created_at', { ascending: false }),
    supabaseAdmin.from('agent_registry').select('agent_name'),
  ])
  const all = (data ?? []) as Version[]
  const liveAgents = new Set(((reg ?? []) as { agent_name: string }[]).map(r => r.agent_name))

  // آخر نسخة لكل أجينت بس — الترتيب فوق created_at desc، فأول واحدة هي الأحدث.
  const byAgent = new Map<string, Version[]>()
  for (const v of all) {
    if (!byAgent.has(v.agent_name)) byAgent.set(v.agent_name, [v])
  }
  const versions = Array.from(byAgent.values()).flat()

  const hiddenOlder = all.length - versions.length
  const deadAgents = versions.filter(v => !liveAgents.has(v.agent_name)).length

  return (
    <div dir="rtl" style={{ fontFamily: 'Tahoma', background: '#FAF7F0', minHeight: '100vh', padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ color: '#059669', margin: 0, fontSize: 26 }}>🧠 Prompt Versions</h1>
          <a href="/admin/performance" style={{ color: '#059669', fontSize: 13 }}>← Performance</a>
        </div>

        <div style={{
          background: '#FFF4E5', border: '2px solid #F59E0B', borderRadius: 12,
          padding: 16, marginBottom: 16, fontSize: 13, lineHeight: 1.9, color: '#7C2D12',
        }}>
          <strong style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>
            ⚠️ الصفحة دي صندوق اقتراحات — مش مصدر تشغيل
          </strong>
          كل الأجينتس بتقرا الـ prompt بتاعها من ثوابت مكتوبة في الكود، <strong>مش من الجدول ده</strong>.
          يعني زرار «Activate» هنا مابيغيّرش سلوك أي أجينت — بيقلب عمود في الداتابيز وبس.
          <br />
          و<code>prompt-optimizer</code> اللي بيولّد النسخ دي <strong>عمره ما اشتغل</strong>
          {' '}(<code>enabled=false</code> · <code>run_count=0</code>) — آخر نسخة اتكتبت ١١ يونيو ٢٠٢٦.
        </div>

        <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
          {versions.length} أجينت · بنعرض <strong>آخر نسخة لكل واحد بس</strong>
          {hiddenOlder > 0 && <> · {hiddenOlder} نسخة أقدم متخبّية عشان ماتلخبطش</>}
          {deadAgents > 0 && <> · <span style={{ color: '#B45309' }}>{deadAgents} أجينت مابقاش موجود في agent_registry</span></>}
        </p>

        {versions.length === 0 ? (
          <div style={{ background: '#fff', padding: 60, borderRadius: 12, textAlign: 'center', color: '#999' }}>
            <div style={{ fontSize: 48 }}>🧠</div>
            <p>لسه مفيش تحسينات مقترحة</p>
            <p style={{ fontSize: 12 }}>شغّل الـ prompt-optimizer من /admin/ai-os</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {Array.from(byAgent.entries()).map(([agent, vs]) => (
              <div key={agent} style={{
                background: '#fff', padding: 20, borderRadius: 12,
                border: '1px solid #eee',
              }}>
                <h2 style={{ margin: 0, color: '#059669', fontSize: 18, marginBottom: 12 }}>
                  🎯 {agent}
                  {!liveAgents.has(agent) && (
                    <span style={{
                      marginInlineStart: 8, fontSize: 11, fontWeight: 'normal',
                      background: '#FEE2E2', color: '#991B1B',
                      padding: '3px 8px', borderRadius: 999,
                    }}>
                      مش موجود في agent_registry
                    </span>
                  )}
                </h2>

                <div style={{ display: 'grid', gap: 10 }}>
                  {vs.map(v => (
                    <div key={v.id} style={{
                      background: v.is_active ? '#d4edda' : '#FAF7F0',
                      padding: 14, borderRadius: 8,
                      border: v.is_active ? '2px solid #28a745' : '1px solid #ddd',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <strong style={{ color: '#059669' }}>
                          {/* «Active» هنا معناها «معلّم عليها في الجدول» — مش
                              «الأجينت شغّال بيها». الأجينت بيقرا من الكود. */}
                          v{v.version} {v.is_active ? '✅ معلّم عليها' : '⏳ مش معلّم عليها'}
                        </strong>
                        <span style={{ fontSize: 11, color: '#666' }}>
                          {new Date(v.created_at).toLocaleString('ar-EG')}
                        </span>
                      </div>

                      {v.hypothesis && (
                        <details style={{ marginBottom: 8 }}>
                          <summary style={{ cursor: 'pointer', color: '#0EA5E9', fontWeight: 'bold', fontSize: 13 }}>
                            💡 الفرضية
                          </summary>
                          <div style={{
                            background: '#fff', padding: 10, borderRadius: 6,
                            marginTop: 6, fontSize: 13, lineHeight: 1.7,
                          }}>
                            {v.hypothesis}
                          </div>
                        </details>
                      )}

                      {v.changes_summary && (
                        <details style={{ marginBottom: 8 }}>
                          <summary style={{ cursor: 'pointer', color: '#059669', fontWeight: 'bold', fontSize: 13 }}>
                            🔧 التغييرات
                          </summary>
                          <div style={{
                            background: '#fff', padding: 10, borderRadius: 6,
                            marginTop: 6, fontSize: 12, whiteSpace: 'pre-wrap',
                          }}>
                            {v.changes_summary}
                          </div>
                        </details>
                      )}

                      <details style={{ marginBottom: 8 }}>
                        <summary style={{ cursor: 'pointer', color: '#666', fontWeight: 'bold', fontSize: 13 }}>
                          📜 الـ Prompt الكامل ({v.prompt_text.length} حرف)
                        </summary>
                        <pre style={{
                          background: '#059669', color: '#FAF7F0',
                          padding: 12, borderRadius: 6, marginTop: 6,
                          fontSize: 11, overflow: 'auto', maxHeight: 300,
                          whiteSpace: 'pre-wrap', fontFamily: 'monospace',
                        }}>
                          {v.prompt_text}
                        </pre>
                      </details>

                      {!v.is_active && (
                        <PromptVersionActions versionId={v.id} agentName={v.agent_name} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
