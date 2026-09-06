'use client'

// ============================================================================
// 📣 CampaignLinks — لينكات حملات الدعاية قدام الأدمن في الداشبورد
//
// (٦/٩/٢٠٢٦) محمد: «حط اللينكات بتاعت الدعاية دي في أي مكان في الداشبورد
//    بحيث تكون قدامنا كأدمن». الريلز بتودّي الناس على الصفحات دي، فلازم
//    اللينك يبقى جاهز للنسخ من غير ما حد يدوّر عليه.
//
// حملة جديدة = سطر في CAMPAIGNS بس.
// ============================================================================
import { useState } from 'react'

const ORIGIN = 'https://www.madmonacairo.com'

const CAMPAIGNS: { emoji: string; name: string; path: string; note: string }[] = [
  {
    emoji: '🏷️',
    name: 'من صورتك هنقولك شغلك',
    path: '/title',
    note: 'وجهة ريلز التيك توك — بيرفع صورة (كاميرا أو معرض) والموديل بيقوله مهنته ونشاطه',
  },
  {
    emoji: '🏗️',
    name: 'معرض Egypt Projects 2026 — العارضين',
    path: '/expo',
    note: 'نبذة مضمونة للعارضين + فورم التواصل بالإيميل',
  },
]

export function CampaignLinks() {
  const [copied, setCopied] = useState<string | null>(null)

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(url)
      setTimeout(() => setCopied(null), 1500)
    } catch { /* المتصفح مانع الكليب بورد — اللينك ظاهر ينفع يتعلّم عليه */ }
  }

  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ fontSize: 15, fontWeight: 900, color: '#14231E', marginBottom: 4 }}>📣 لينكات الحملات</h2>
      <p style={{ fontSize: 12, color: '#8A9690', marginBottom: 14 }}>
        الصفحات اللي الدعاية بتودّي عليها — انسخ اللينك وحطه في الكابشن أو البايو.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
        {CAMPAIGNS.map((c) => {
          const url = ORIGIN + c.path
          return (
            <div key={c.path}
              style={{ background: '#fff', border: '1px solid rgba(0,0,0,.07)', borderRadius: 14, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 18 }}>{c.emoji}</span>
                <strong style={{ fontSize: 13.5, color: '#14231E' }}>{c.name}</strong>
              </div>
              <p style={{ fontSize: 11.5, color: '#5A6660', margin: '0 0 8px' }}>{c.note}</p>
              <code dir="ltr" style={{ display: 'block', fontSize: 12, color: '#1F6F5F', background: '#F3F6F4',
                borderRadius: 8, padding: '6px 8px', marginBottom: 8, overflowX: 'auto', textAlign: 'left' }}>
                {url}
              </code>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" onClick={() => copy(url)}
                  style={{ flex: 1, border: 'none', borderRadius: 9, padding: '7px 10px', fontSize: 12, fontWeight: 800,
                    background: copied === url ? '#2FA084' : '#04352A', color: '#fff', cursor: 'pointer' }}>
                  {copied === url ? '✓ اتنسخ' : 'انسخ اللينك'}
                </button>
                <a href={url} target="_blank" rel="noopener noreferrer"
                  style={{ flex: 1, textAlign: 'center', borderRadius: 9, padding: '7px 10px', fontSize: 12, fontWeight: 800,
                    background: '#F3F6F4', color: '#14231E', textDecoration: 'none' }}>
                  افتح ↗
                </a>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
