'use client'

import { useEffect, useState } from 'react'

// شريط متحرك داكن — تاجلاينز + أسعار لايف من /api/financial-data (٧ أغسطس ٢٠٢٦)
const TAGLINES = [
  'كل مورد متوثّق',
  'ضمان استرداد خلال ٤٨ ساعة',
  'الجني بيرد ٢٤ ساعة',
  'توصيل لكل مصر',
  'معاملاتك مضمونة',
]

export default function RedesignMarquee() {
  const [items, setItems] = useState<string[]>(TAGLINES)

  useEffect(() => {
    let alive = true
    fetch(`/api/financial-data?t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (!alive || !d?.ok) return
        const live: string[] = []
        for (const g of d.gold || []) live.push(`${g.label}: ${Number(g.price_per_gram_egp).toLocaleString('ar-EG')} ج·م`)
        for (const c of d.currencies || []) live.push(`${c.flag} ${c.name_ar}: ${Number(c.rate).toFixed(2)} ج·م`)
        const merged: string[] = []
        const max = Math.max(live.length, TAGLINES.length)
        for (let i = 0; i < max; i++) {
          if (live[i]) merged.push(live[i])
          if (TAGLINES[i]) merged.push(TAGLINES[i])
        }
        setItems(merged)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  const loop = [...items, ...items]

  return (
    <div dir="ltr" style={{ background: '#0E332C', color: '#F4EFE4', overflow: 'hidden', padding: '14px 0', borderTop: '2px solid #0E332C', borderBottom: '2px solid #0E332C' }}>
      <div className="rz-mq" style={{ display: 'flex', gap: 48, width: 'max-content', paddingLeft: 48 }}>
        {loop.map((t, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 14, whiteSpace: 'nowrap', fontWeight: 700, fontSize: 14, fontFamily: 'var(--font-alex), sans-serif' }}>
            <span style={{ color: '#2B4521' }}>✦</span>
            <span>{t}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
