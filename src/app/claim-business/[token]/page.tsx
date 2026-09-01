'use client'
// ============================================================================
// 🔲 /claim-business/[token] — صاحب الشركة يستلم صفحته من الـQR
//
// (١ سبتمبر ٢٠٢٦) صاحب الشركة في المعرض بيمسح QR من موبايل فريق مضمونة
// → يشوف صفحته الجاهزة → يسجّل بموبايله → يستلمها + نظام الإدارة.
// ============================================================================
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { Loader2, Building2, CheckCircle2, Phone, Globe, MapPin, Package, ShieldCheck, ArrowLeft } from 'lucide-react'

type Card = {
  ok: boolean; error?: string; id: string; name: string; booth: string | null; claimed: boolean
  logo: string | null; cover: string | null; industry: string | null; description: string | null
  phone: string | null; website: string | null; city: string | null; district: string | null
  listings: Array<{ id: string; title: string; slug: string; category: string; photo: string | null }>
}

const INK = '#1F2A24', MUTED = '#6B7770', LINE = '#E3E8E4', GREEN = '#0F7A4F', GREEN_BG = '#E6F4EC'

export default function ClaimBusinessPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [d, setD] = useState<Card | null>(null)
  const [loading, setLoading] = useState(true)
  const [signedIn, setSignedIn] = useState(false)
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      setSignedIn(!!session?.user)
      if (session?.user?.phone) setPhone(session.user.phone)
      const { data } = await (supabaseBrowser.rpc as unknown as (
        f: string, a: Record<string, unknown>,
      ) => Promise<{ data: Card | null }>)('claim_business_get', { p_token: token })
      setD(data); setLoading(false)
    })()
  }, [token])

  const claim = async () => {
    setBusy(true); setErr(null)
    try {
      const { data } = await (supabaseBrowser.rpc as unknown as (
        f: string, a: Record<string, unknown>,
      ) => Promise<{ data: { ok: boolean; error?: string; need_login?: boolean } | null }>)('claim_business_do', {
        p_token: token, p_phone: phone || null, p_name: name || null,
      })
      if (data?.need_login) { router.push(`/auth/login?redirect=/claim-business/${token}`); return }
      if (!data?.ok) { setErr(data?.error || 'حصل خطأ'); return }
      setDone(true)
    } finally { setBusy(false) }
  }

  if (loading) return <div dir="rtl" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}><Loader2 className="animate-spin" size={28} color={GREEN} /></div>
  if (!d?.ok) return <div dir="rtl" style={{ padding: 40, textAlign: 'center', color: MUTED }}>{d?.error || 'الرابط مش صحيح'}</div>

  if (done || d.claimed) return (
    <div dir="rtl" style={{ minHeight: '100dvh', background: '#F7F9F7', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 18, padding: 28, maxWidth: 420, width: '100%', textAlign: 'center', border: `1px solid ${LINE}` }}>
        <CheckCircle2 size={48} color={GREEN} style={{ margin: '0 auto 12px' }} />
        <h1 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 6px' }}>مبروك — صفحة {d.name} بقت بتاعتك 🎉</h1>
        <p style={{ fontSize: 13, color: MUTED, margin: '0 0 20px', lineHeight: 1.7 }}>
          دلوقتي عندك نظام إدارة كامل: منتجاتك · عملاؤك · حساباتك · فريقك.
          <br /><strong style={{ color: GREEN }}>والسعر اللي بتطلبه هو اللي بتاخده.</strong>
        </p>
        <Link href="/supplier/erp" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: GREEN, color: '#fff', padding: '12px', borderRadius: 12, fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>
          افتح نظام الإدارة <ArrowLeft size={16} />
        </Link>
      </div>
    </div>
  )

  return (
    <div dir="rtl" style={{ minHeight: '100dvh', background: '#F7F9F7', color: INK }}>
      {d.cover && <img src={d.cover} alt="" style={{ width: '100%', height: 160, objectFit: 'cover' }} />}
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 16px 40px' }}>
        {/* الهوية */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginTop: d.cover ? -30 : 20 }}>
          {d.logo ? <img src={d.logo} alt="" style={{ width: 72, height: 72, borderRadius: 14, objectFit: 'contain', background: '#fff', border: `1px solid ${LINE}`, padding: 6 }} />
            : <div style={{ width: 72, height: 72, borderRadius: 14, background: GREEN_BG, display: 'grid', placeItems: 'center', border: `1px solid ${LINE}` }}><Building2 size={30} color={GREEN} /></div>}
          <div style={{ paddingBottom: 6 }}>
            <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{d.name}</h1>
            <p style={{ fontSize: 12, color: MUTED, margin: '2px 0 0' }}>{d.industry} · استاند {d.booth}</p>
          </div>
        </div>

        <div style={{ background: GREEN_BG, borderRadius: 12, padding: '12px 14px', margin: '16px 0', display: 'flex', gap: 10, alignItems: 'center' }}>
          <ShieldCheck size={22} color={GREEN} />
          <p style={{ margin: 0, fontSize: 12.5, color: GREEN, fontWeight: 600, lineHeight: 1.5 }}>
            فريق مضمونة جهّز صفحتك على المنصة — استلمها دلوقتي وابدأ تستقبل طلبات
          </p>
        </div>

        {d.description && <p style={{ fontSize: 13, lineHeight: 1.7, margin: '0 0 14px' }}>{d.description}</p>}

        {/* المنتجات */}
        {d.listings.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${LINE}`, padding: '10px 14px', marginBottom: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: MUTED, margin: '0 0 6px' }}><Package size={13} style={{ verticalAlign: -2 }} /> منتجاتك على مضمونة ({d.listings.length})</p>
            {d.listings.map(l => (
              <p key={l.id} style={{ margin: '5px 0', fontSize: 13, borderTop: `1px solid ${LINE}`, paddingTop: 5 }}>• {l.title.replace(/ — .*$/, '')}</p>
            ))}
          </div>
        )}

        {/* الاستلام */}
        <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${LINE}`, padding: 18 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 12px' }}>استلم صفحتك</h2>
          {!signedIn ? (
            <>
              <p style={{ fontSize: 12.5, color: MUTED, margin: '0 0 12px', lineHeight: 1.6 }}>سجّل بموبايلك في ثواني — وهترجع هنا تلقائي</p>
              <Link href={`/auth/login?redirect=/claim-business/${token}`} style={{ display: 'block', textAlign: 'center', background: GREEN, color: '#fff', padding: 12, borderRadius: 12, fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>
                سجّل بالموبايل
              </Link>
            </>
          ) : (
            <>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="اسمك (المسؤول)"
                style={{ width: '100%', padding: 11, borderRadius: 10, border: `1px solid ${LINE}`, fontSize: 13, marginBottom: 8 }} />
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="موبايل الشركة" dir="ltr"
                style={{ width: '100%', padding: 11, borderRadius: 10, border: `1px solid ${LINE}`, fontSize: 13, marginBottom: 12 }} />
              {err && <p style={{ color: '#A32D2D', fontSize: 12, margin: '0 0 8px' }}>{err}</p>}
              <button onClick={claim} disabled={busy} style={{ width: '100%', background: GREEN, color: '#fff', padding: 12, borderRadius: 12, fontWeight: 700, border: 'none', fontSize: 14, cursor: 'pointer', opacity: busy ? .6 : 1 }}>
                {busy ? 'ثانية…' : 'استلم الصفحة ونظام الإدارة'}
              </button>
            </>
          )}
          <p style={{ fontSize: 11, color: MUTED, margin: '12px 0 0', textAlign: 'center' }}>مجاني · مفيش عمولة على مبيعاتك</p>
        </div>
      </div>
    </div>
  )
}
