'use client'

// src/app/admin/collaborations/LaunchCollaboration.tsx
import { useState } from 'react'

const PRESET_GOALS = [
  '🎨 اطلق ad campaign للكاميرات بميزانية 1000 جنيه',
  '🚀 افتح فئة جديدة (سيارات للأفراح) - من supplier hunting لحد ad creatives',
  '📊 تحليل شامل لأداء آخر شهر مع توصيات للنمو',
  '🤝 خطة شراكة كاملة مع 5 مؤثرين في فئة الكاميرات',
  '🔧 تحسين 10 إعلانات الكوورك الأقل أداء',
]

export default function LaunchCollaboration() {
  const [goal, setGoal] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const launch = async (g: string) => {
    if (!g.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/agents/scheduler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer c9aade438b57204664c496dcd43ab8a640af5061273abc6591522bf96065d0c7',
        },
        body: JSON.stringify({
          agent: 'orchestrator',
          args: { goal: g },
        }),
      })
      const data = await res.json()
      if (data.result?.success) {
        const r = data.result.output_summary
        setResult(`✅ تم إطلاق collaboration!
الـ Agents المشاركة: ${(r.participating_agents ?? []).join(' · ')}
المدة المتوقعة: ${r.estimated_duration_min} دقيقة
${r.plan_summary}`)
        setTimeout(() => location.reload(), 3000)
      } else {
        setResult(`❌ فشل: ${data.result?.error ?? 'unknown'}`)
      }
    } catch {
      setResult('❌ خطأ في الاتصال')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      background: '#1F5F3F', color: '#FAF7F0',
      padding: 20, borderRadius: 12, marginBottom: 24,
    }}>
      <h2 style={{ margin: '0 0 12px', fontSize: 18 }}>🚀 اطلق Collaboration جديدة</h2>
      <p style={{ fontSize: 12, opacity: 0.9, marginBottom: 16 }}>
        Orchestrator AI هياخد الـ goal بتاعك ويوزّع التاسكات على الـ agents المناسبين تلقائياً
      </p>

      <textarea
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        placeholder="اكتب الـ goal بتاعك بالعربي... مثال: اطلق حملة تسويقية للكاميرات لما الصيف"
        style={{
          width: '100%', padding: 12, borderRadius: 8,
          border: 'none', fontSize: 13, fontFamily: 'Tahoma',
          minHeight: 60, marginBottom: 12, resize: 'vertical',
        }}
        dir="rtl"
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {PRESET_GOALS.map((p, i) => (
          <button
            key={i}
            onClick={() => setGoal(p)}
            style={{
              background: 'rgba(255,255,255,0.15)', color: '#FAF7F0',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '6px 12px', borderRadius: 6,
              cursor: 'pointer', fontSize: 11,
            }}
          >
            {p}
          </button>
        ))}
      </div>

      <button
        onClick={() => launch(goal)}
        disabled={loading || !goal.trim()}
        style={{
          background: loading ? '#666' : '#B8860B',
          color: '#fff', border: 'none',
          padding: '10px 24px', borderRadius: 8,
          cursor: loading ? 'wait' : 'pointer',
          fontSize: 14, fontWeight: 'bold',
        }}
      >
        {loading ? '⏳ Orchestrator بيخطط...' : '🚀 اطلق Collaboration'}
      </button>

      {result && (
        <div style={{
          marginTop: 12, padding: 12,
          background: 'rgba(255,255,255,0.1)', borderRadius: 8,
          fontSize: 12, whiteSpace: 'pre-wrap', lineHeight: 1.7,
        }}>
          {result}
        </div>
      )}
    </div>
  )
}
