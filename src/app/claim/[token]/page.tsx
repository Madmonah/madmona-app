'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'

// ============================================================
// /claim/[token] — Listing claim landing page
// A business owner opens this from a WhatsApp invite. It shows
// the ready-made Madmona page we built for them and lets them
// claim it. Full onboarding (logo / menu edits) follows up.
// RPCs: claim_get_by_token (display), claim_mark_by_token (claim).
// ============================================================

const GREEN_GRAD = 'linear-gradient(135deg,#143A33 0%,#FA8125 52%,#2FA084 100%)'
const GOLD_GRAD = 'linear-gradient(120deg,#d4a017,#2FA084,#FA8125)'
const WA = 'https://wa.me/201002229982'

type ClaimData = {
  ok?: boolean
  status?: string
  listing_id?: string
  title?: string
  slug?: string
  cuisine?: string
  hero?: string
  error?: string
}

export default function ClaimPage() {
  const params = useParams()
  const token = String((params as Record<string, string>)?.token || '')

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ClaimData | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [claimed, setClaimed] = useState(false)
  const [invalid, setInvalid] = useState(false)
  const [err, setErr] = useState('')

  async function load() {
    setLoading(true)
    setErr('')
    try {
      const { data: res, error } = await supabaseBrowser.rpc('claim_get_by_token', { p_token: token })
      if (error || !res || res.error === 'invalid_token') { setInvalid(true); setLoading(false); return }
      setData(res as ClaimData)
      if (res.status === 'claimed') setClaimed(true)
    } catch {
      setInvalid(true)
    }
    setLoading(false)
  }

  useEffect(() => { if (token) load() /* eslint-disable-next-line */ }, [token])

  async function handleClaim() {
    setClaiming(true); setErr('')
    try {
      const { data: res, error } = await supabaseBrowser.rpc('claim_mark_by_token', { p_token: token })
      if (error || !res?.ok) { setErr('حصل خطأ، حاول تاني أو كلّمنا واتساب.'); setClaiming(false); return }
      setClaimed(true)
    } catch {
      setErr('حصل خطأ، حاول تاني أو كلّمنا واتساب.')
    }
    setClaiming(false)
  }

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#FAFAF7', fontFamily: 'Cairo, system-ui, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 0 48px' }}>
      <div style={{ width: '100%', background: GREEN_GRAD, padding: '22px 16px', textAlign: 'center', boxShadow: '0 6px 24px rgba(20,58,51,.18)' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: '#fff' }}>
          <span style={{ width: 18, height: 18, borderRadius: '50%', background: GOLD_GRAD, boxShadow: '0 0 0 6px rgba(255,255,255,.08)' }} />
          <span style={{ fontWeight: 900, fontSize: 26 }}>مضمونة</span>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 520, padding: '0 16px', marginTop: 22 }}>
        {loading && (
          <div style={{ textAlign: 'center', color: '#FA8125', fontWeight: 700, padding: '60px 0' }}>جاري التحميل…</div>
        )}

        {!loading && invalid && (
          <div style={cardStyle}>
            <div style={{ fontSize: 44, marginBottom: 8 }}>🔍</div>
            <h2 style={{ fontWeight: 900, color: '#0A0A0A', margin: '0 0 6px' }}>اللينك مش صحيح</h2>
            <p style={{ color: '#555', margin: '0 0 18px' }}>يمكن اللينك قديم أو اتغيّر. كلّمنا واتساب ونظبّطهالك.</p>
            <a href={WA} style={goldBtn}>كلّمنا واتساب 💬</a>
          </div>
        )}

        {!loading && !invalid && data && (
          <div style={cardStyle}>
            {data.hero && (
              <img src={data.hero} alt={data.title || ''} style={{ width: '100%', borderRadius: 16, marginBottom: 16, boxShadow: '0 8px 24px rgba(0,0,0,.12)' }} />
            )}
            <h1 style={{ fontWeight: 900, fontSize: 24, color: '#0A0A0A', margin: '0 0 4px' }}>{data.title}</h1>
            {data.cuisine && <div style={{ color: '#FA8125', fontWeight: 700, marginBottom: 14 }}>{data.cuisine}</div>}

            {!claimed && (
              <>
                <div style={{ background: '#F1FAF6', border: '1px solid #d9efe6', borderRadius: 16, padding: 16, marginBottom: 16, textAlign: 'right' }}>
                  <div style={{ fontWeight: 900, color: '#143A33', marginBottom: 10 }}>دي صفحتك جاهزة على مضمونة 🎉</div>
                  <div style={{ color: '#234', lineHeight: 2, fontSize: 15 }}>
                    ✅ حماية كاملة للمعاملات<br />
                    💸 تحويل مستحقاتك بسرعة<br />
                    🤖 مطابقة ذكية بالـAI توصّلك عملاء<br />
                    🕐 دعم ٢٤/٧ — عمولة بسيطة ١٠٪ ثابتة
                  </div>
                </div>
                <button onClick={handleClaim} disabled={claiming} style={{ ...goldBtn, width: '100%', border: 'none', cursor: 'pointer', opacity: claiming ? 0.6 : 1 }}>
                  {claiming ? 'لحظة…' : 'استلم صفحتك دلوقتي'}
                </button>
                {err && <div style={{ color: '#b3261e', marginTop: 12, fontWeight: 700 }}>{err}</div>}
                <a href={WA} style={{ ...ghostBtn, width: '100%', marginTop: 10 }}>أو كلّمنا واتساب 💬</a>
                <p style={{ color: '#888', fontSize: 13, marginTop: 14, lineHeight: 1.8 }}>
                  بعد الاستلام هنتواصل معاك تكمّل لوجو مكانك وتظبّط المنيو والأسعار. الأسعار المعروضة دلوقتي استرشادية.
                </p>
              </>
            )}

            {claimed && (
              <div style={{ textAlign: 'center', paddingTop: 6 }}>
                <div style={{ fontSize: 48, marginBottom: 6 }}>✅</div>
                <h2 style={{ fontWeight: 900, color: '#FA8125', margin: '0 0 6px' }}>تم استلام صفحتك!</h2>
                <p style={{ color: '#555', margin: '0 0 18px', lineHeight: 1.9 }}>هنتواصل معاك قريب جداً تكمّل بياناتك (لوجو/منيو/أسعار). مبروك انضمامك لمضمونة 💚</p>
                {data.slug && <a href={`/marketplace/${data.slug}`} style={{ ...goldBtn, width: '100%' }}>شوف صفحتك</a>}
                <a href={WA} style={{ ...ghostBtn, width: '100%', marginTop: 10 }}>كلّمنا واتساب 💬</a>
              </div>
            )}
          </div>
        )}

        <div style={{ textAlign: 'center', color: '#9aa', fontSize: 13, marginTop: 22 }}>
          معاملاتك مضمونة • <a href="https://www.madmonacairo.com" style={{ color: '#FA8125', textDecoration: 'none', fontWeight: 700 }}>madmonacairo.com</a>
        </div>
      </div>
    </div>
  )
}

const cardStyle: React.CSSProperties = { background: '#fff', borderRadius: 22, padding: 20, boxShadow: '0 10px 40px rgba(20,58,51,.10)', textAlign: 'center' }
const goldBtn: React.CSSProperties = { display: 'inline-block', background: GOLD_GRAD, color: '#fff', fontWeight: 900, fontSize: 17, padding: '14px 22px', borderRadius: 999, textDecoration: 'none', boxShadow: '0 12px 30px rgba(212,160,23,.30)', textAlign: 'center' }
const ghostBtn: React.CSSProperties = { display: 'inline-block', background: '#fff', color: '#FA8125', fontWeight: 800, fontSize: 16, padding: '12px 22px', borderRadius: 999, textDecoration: 'none', border: '1.5px solid #FA8125', textAlign: 'center' }
