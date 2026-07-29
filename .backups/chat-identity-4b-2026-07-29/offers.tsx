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
    <div dir="rtl" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#FAFAF7', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ background: '#075E54', color: '#fff', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 20, fontWeight: 800, flex: 1 }}>عروض مضمونة 🏷️</div>
        <Link href="/marketplace" style={{ color: '#fff', fontSize: 13, textDecoration: 'none', opacity: .9 }}>السوق كامل ←</Link>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#8a8a8a', padding: 40 }}>بنحمّل أحدث العروض…</div>
        ) : err ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📡</div>
            <div style={{ color: '#667', marginBottom: 12 }}>مش قادرين نحمّل العروض دلوقتي</div>
            <button onClick={() => setNonce((n) => n + 1)} style={{ background: '#128C7E', color: '#fff', border: 'none', borderRadius: 16, padding: '8px 16px', fontWeight: 700, cursor: 'pointer' }}>🔄 جرّب تاني</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {offers.map((o) => (
              <Link key={o.id} href={`/marketplace/${o.slug}`} style={{ textDecoration: 'none', background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #eee', display: 'block' }}>
                <div style={{ aspectRatio: '1 / 1', background: '#f0efe9' }}>
                  {o.photo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={o.photo} alt={o.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                  )}
                </div>
                <div style={{ padding: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.title}</div>
                  {o.price != null && <div style={{ fontSize: 13, color: '#1F6F5F', fontWeight: 800, marginTop: 2 }}>{o.price.toLocaleString('ar-EG')} ج.م</div>}
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
