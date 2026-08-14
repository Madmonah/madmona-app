'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import ChatBottomNav from '@/components/ChatBottomNav'

type Offer = { id: string; title: string; slug: string; photo: string | null; price: number | null }

export default function OffersScreen() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(false)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true); setErr(false)
      try {
        const { data, error } = await supabaseBrowser
          .from('listings')
          .select('id, title, slug, photos:listing_photos(url, is_primary), pricing:pricing_rules(price, is_active)')
          .eq('status', 'published').eq('is_directory', false)
          .order('created_at', { ascending: false }).limit(24)
        if (!alive) return
        if (error) { setErr(true); setLoading(false); return }
        type Row = { id: string; title: string; slug: string; photos: { url: string; is_primary: boolean }[] | null; pricing: { price: number | string; is_active: boolean }[] | null }
        setOffers(((data || []) as Row[]).map((r) => {
          const ph = (r.photos || []).find((p) => p.is_primary) || (r.photos || [])[0]
          const pr = (r.pricing || []).find((p) => p.is_active) || (r.pricing || [])[0]
          return { id: r.id, title: r.title, slug: r.slug, photo: ph?.url || null, price: pr ? Number(pr.price) : null }
        }))
      } catch { if (alive) setErr(true) }
      if (alive) setLoading(false)
    })()
    return () => { alive = false }
  }, [nonce])

  return (
    <div dir="rtl" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#FAFAF7', fontFamily: "var(--font-cairo), system-ui, sans-serif" }}>
      <header style={{ background: 'linear-gradient(135deg,#14231E,#059669)', color: '#fff', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 2px 14px rgba(20,35,30,.28)' }}>
        <div style={{ fontSize: 17, fontWeight: 900, flex: 1 }}>عروض مضمونة 🏷️</div>
        <Link href="/marketplace" style={{ color: '#6FCF97', fontSize: 12.5, fontWeight: 700, textDecoration: 'none' }}>السوق كامل ←</Link>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#8A9690', fontWeight: 600, padding: 40 }}>بنحمّل أحدث العروض…</div>
        ) : err ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📡</div>
            <div style={{ color: '#5A6660', fontWeight: 600, marginBottom: 12 }}>مش قادرين نحمّل العروض دلوقتي</div>
            <button onClick={() => setNonce((n) => n + 1)} style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 999, padding: '9px 18px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>🔄 جرّب تاني</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {offers.map((o) => (
              <Link key={o.id} href={`/marketplace/${o.slug}`} style={{ textDecoration: 'none', background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #EAE5D9', display: 'block', boxShadow: '0 1px 2px rgba(20,35,30,.06)' }}>
                <div style={{ aspectRatio: '1 / 1', background: '#F1EEE6' }}>
                  {o.photo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={o.photo} alt={o.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                  )}
                </div>
                <div style={{ padding: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#14231E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.title}</div>
                  {o.price != null && <div style={{ fontSize: 13, color: '#059669', fontWeight: 900, marginTop: 2 }}>{o.price.toLocaleString('ar-EG')} ج.م</div>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <ChatBottomNav />
    </div>
  )
}
