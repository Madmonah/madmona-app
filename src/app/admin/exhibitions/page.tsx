'use client'
// ============================================================================
// 🏢 /admin/exhibitions — تاب المعارض
//
// (١ سبتمبر ٢٠٢٦) محمد: «عايز تاب اسمه معارض يتحط فيه كل الشركات اللي
//   عملنالها بيزنس كموديل (الصفحة B2B) ويكون فيها تاب الاستور بتاعه
//   والـQR كود اللي صاحب البيزنس هيستلم بيه».
//
// 🎯 الفريق في المعرض يفتح الشركة → يوري صاحبها صفحته الجاهزة →
//    يمسح الـQR بموبايله → يستلم الصفحة والـERP في دقيقة.
// ============================================================================
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  Loader2, Building2, Search, CheckCircle2, Circle, Phone, Globe, MapPin,
  Package, QrCode, ArrowRight, ExternalLink, Store, Tag, ChevronLeft, X,
} from 'lucide-react'

type Co = {
  id: string; name: string; booth: string | null; logo: string | null; industry: string | null
  claimed: boolean; products_collected: boolean; priced: boolean; interest: string | null
  listings_count: number; has_phone: boolean; complete: boolean
  // 📬 (٤ سبتمبر ٢٠٢٦) حالة آخر رسالة واتساب + هل ليه صفحة — من exhibition_companies_list
  event?: string; phone?: string | null; has_page?: boolean
  wa_status?: string | null; wa_at?: string | null; wa_error?: string | null
}
type Card = Co & {
  claim_token: string; supplier_id: string; cover: string | null; description: string | null
  phone: string | null; email: string | null; website: string | null; city: string | null
  wa_status?: string | null; wa_at?: string | null; wa_error?: string | null; wa_message?: string | null; contact_source?: string | null
  district: string | null; address: string | null; store_slug: string | null
  listings: Array<{ id: string; title: string; slug: string; category: string; photo: string | null }>
  gallery: string[] | null
}

const INK = '#1F2A24', MUTED = '#6B7770', LINE = '#E3E8E4'
const GREEN = '#0F7A4F', GREEN_BG = '#E6F4EC', AMBER = '#9A6400', AMBER_BG = '#FBF1DC'
const SITE = 'https://www.madmonacairo.com'

export default function ExhibitionsPage() {
  const [list, setList] = useState<Co[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<Card | null>(null)
  const [tab, setTab] = useState<'page' | 'store' | 'qr'>('page')
  const [qr, setQr] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data } = await (supabaseBrowser.rpc as unknown as (
      f: string, a?: Record<string, unknown>,
    ) => Promise<{ data: Co[] | null }>)('exhibition_companies_list', {})
    setList(data || []); setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const openCo = async (id: string) => {
    const { data } = await (supabaseBrowser.rpc as unknown as (
      f: string, a: Record<string, unknown>,
    ) => Promise<{ data: Card | null }>)('exhibition_company_card', { p_id: id })
    if (!data) return
    setOpen(data); setTab('page'); setQr(null)
    // 🔲 QR — يتولّد في المتصفح
    try {
      const QR = (await import('qrcode')).default
      const url = data.claim_token ? `${SITE}/claim-business/${data.claim_token}` : ''
      setQr(await QR.toDataURL(url, { width: 320, margin: 2, color: { dark: INK, light: '#FFFFFF' } }))
    } catch { /* الـQR تحسين */ }
  }

  const filtered = list.filter(c => !q || c.name.toLowerCase().includes(q.toLowerCase()) || (c.booth || '').includes(q))
  const done = list.filter(c => c.complete).length
  const claimed = list.filter(c => c.claimed).length

  if (loading) return <div dir="rtl" style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}><Loader2 className="animate-spin" size={28} color={GREEN} /></div>

  return (
    <div dir="rtl" style={{ minHeight: '100dvh', background: '#F7F9F7', color: INK }}>
      <header style={{ background: '#fff', borderBottom: `1px solid ${LINE}`, padding: '14px 16px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>🏢 المعارض — Pharmaconex 2026</h1>
              <p style={{ fontSize: 12, color: MUTED, margin: '2px 0 0' }}>
                {list.length} شركة · {list.filter(c => c.has_page).length} ليها صفحة · {list.filter(c => c.wa_status === 'delivered' || c.wa_status === 'read').length} وصلتها رسالة · {claimed} استلمت
              </p>
            </div>
          </div>
          <div style={{ position: 'relative', marginTop: 10 }}>
            <Search size={15} color={MUTED} style={{ position: 'absolute', right: 12, top: 11 }} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="اسم الشركة أو رقم الاستاند"
              style={{ width: '100%', padding: '9px 36px 9px 12px', borderRadius: 10, border: `1px solid ${LINE}`, fontSize: 13, background: '#F7F9F7' }} />
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '14px 16px 60px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
          {filtered.map(c => (
            <button key={c.id} onClick={() => openCo(c.id)} style={{
              textAlign: 'right', background: '#fff', border: `1px solid ${c.claimed ? GREEN : LINE}`, borderRadius: 12,
              padding: '12px 14px', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center',
            }}>
              {c.logo ? <img src={c.logo} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'contain', border: `1px solid ${LINE}`, background: '#fff' }} />
                : <div style={{ width: 44, height: 44, borderRadius: 10, background: GREEN_BG, display: 'grid', placeItems: 'center', flexShrink: 0 }}><Building2 size={20} color={GREEN} /></div>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11.5, color: MUTED }}>
                  {c.booth && <span style={{ fontWeight: 700 }}>{c.booth}</span>}
                  {c.industry && ` · ${c.industry}`}
                </p>
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <Chip on={c.complete} label="صفحة" />
                  <Chip on={c.listings_count > 0} label={`${c.listings_count} منتج`} />
                  <Chip on={c.has_phone} label="تليفون" />
                  <Chip on={!!c.has_page} label="صفحة" />
                  <Chip on={c.wa_status === 'delivered' || c.wa_status === 'read'} label={(() => { const m: Record<string,string> = { read: 'اتقري', delivered: 'اتسلّم', sent: 'اتبعت', queued: 'في الطابور', failed: 'اترفض', cancelled: 'اتلغى' }; return c.wa_status ? ('واتساب: ' + (m[c.wa_status] || c.wa_status)) : 'مفيش رسالة' })()} />
                  <Chip on={c.claimed} label="استلمت" strong />
                </div>
              </div>
              <ChevronLeft size={16} color={MUTED} />
            </button>
          ))}
        </div>
      </main>

      {/* ── بطاقة الشركة ── */}
      {open && (
        <div onClick={() => setOpen(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', width: '100%', maxWidth: 560, maxHeight: '92vh', borderRadius: '18px 18px 0 0', overflow: 'auto' }}>
            {/* رأس */}
            <div style={{ position: 'sticky', top: 0, background: '#fff', borderBottom: `1px solid ${LINE}`, padding: '12px 16px', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {open.logo ? <img src={open.logo} alt="" style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'contain', border: `1px solid ${LINE}` }} />
                  : <div style={{ width: 40, height: 40, borderRadius: 10, background: GREEN_BG, display: 'grid', placeItems: 'center' }}><Building2 size={18} color={GREEN} /></div>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14.5, fontWeight: 800 }}>{open.name}</p>
                  <p style={{ margin: 0, fontSize: 11.5, color: MUTED }}>استاند {open.booth} · {open.industry || '—'}</p>
                </div>
                <button onClick={() => setOpen(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color={MUTED} /></button>
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
                {([['page', 'الصفحة B2B', Building2], ['store', 'الاستور', Store], ['qr', 'QR الاستلام', QrCode]] as const).map(([k, l, Icon]) => (
                  <button key={k} onClick={() => setTab(k)} style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px', borderRadius: 9,
                    border: 'none', background: tab === k ? INK : '#F1F4F2', color: tab === k ? '#fff' : MUTED, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}><Icon size={14} />{l}</button>
                ))}
              </div>
            </div>

            <div style={{ padding: 16 }}>
              {/* ═══ الصفحة B2B ═══ */}
              {tab === 'page' && (
                <>
                  {open.cover && <img src={open.cover} alt="" style={{ width: '100%', height: 130, objectFit: 'cover', borderRadius: 12, marginBottom: 12 }} />}
                  <p style={{ fontSize: 13, lineHeight: 1.7, color: INK, margin: '0 0 14px' }}>{open.description || <span style={{ color: MUTED }}>الوصف لسه ماتجمعش</span>}</p>
                  <Info icon={Phone} label="التليفون" value={open.phone} />
                  <Info icon={Phone} label="واتساب" value={open.wa_status ? `${({ read:'اتقري', delivered:'اتسلّم', sent:'اتبعت — مستني إيصال', queued:'في الطابور', failed:'اترفض' } as Record<string,string>)[open.wa_status] || open.wa_status}${open.wa_at ? ' · ' + new Date(open.wa_at).toLocaleString('ar-EG') : ''}${open.wa_error ? ' — ' + open.wa_error : ''}` : 'مفيش رسالة اتبعتت'} />
                  <Info icon={Globe} label="الموقع" value={open.website} link />
                  <Info icon={MapPin} label="العنوان" value={[open.district, open.city, open.address].filter(Boolean).join(' · ') || null} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <Link href={`/supplier/erp?business=${open.supplier_id}`} style={btnStyle(GREEN)}>نظام الإدارة <ArrowRight size={14} /></Link>
                    {open.email && <a href={`mailto:${open.email}`} style={btnStyle(MUTED, true)}>إيميل</a>}
                  </div>
                  {open.claimed && <p style={{ marginTop: 12, fontSize: 12, color: GREEN, fontWeight: 700 }}>✅ الشركة استلمت صفحتها</p>}
                </>
              )}

              {/* ═══ الاستور ═══ */}
              {tab === 'store' && (
                <>
                  <p style={{ fontSize: 12, color: MUTED, margin: '0 0 10px' }}>
                    {open.listings.length} منتج معروض في تاب «شركات وصناعة» — بعرض سعر
                  </p>
                  {/* ➕ (٣ سبتمبر ٢٠٢٦) ضيف منتج **من جوّه الشركة**.
                      في PharmaConex اتعمل ٥١ حساب مورد و**الـ٥١ كلهم فضلوا
                      صفر إعلانات**: المندوب كان بيسيب الشاشة دي ويضيف من
                      /admin/listings، وهناك الرقم بيتكتب بالإيد أو يتنسى،
                      فالإعلان بيتحجز على حساب مضمونة بدل حساب الشركة.
                      اللينك ده بيمرّر اسم الشركة ورقمها، والربط بيتم بالرقم. */}
                  <Link
                    href={`/admin/listings?add=1&co=${encodeURIComponent(open.name)}${open.phone ? `&phone=${encodeURIComponent(open.phone)}` : ''}`}
                    style={{ ...btnStyle(GREEN), width: '100%', marginBottom: 12 }}
                  >
                    <Package size={14} /> ضيف منتج للشركة دي
                  </Link>
                  {!open.phone && (
                    <p style={{ fontSize: 11.5, color: AMBER, background: AMBER_BG, borderRadius: 8, padding: '7px 10px', margin: '0 0 12px' }}>
                      ⚠️ الشركة من غير رقم — المنتج مش هيعرف يتربط بحسابها. هات الرقم الأول.
                    </p>
                  )}
                  {open.listings.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 24, background: AMBER_BG, borderRadius: 12 }}>
                      <Package size={28} color={AMBER} style={{ margin: '0 auto 8px' }} />
                      <p style={{ fontSize: 13, fontWeight: 700, color: AMBER, margin: 0 }}>لسه مفيش منتجات</p>
                      <p style={{ fontSize: 11.5, color: MUTED, margin: '4px 0 0' }}>صوّر الكتالوج من الاستاند واضغط «ضيف منتج» فوق</p>
                    </div>
                  ) : open.listings.map(l => (
                    <Link key={l.id} href={`/marketplace/${l.slug}`} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderTop: `1px solid ${LINE}`, textDecoration: 'none', color: INK }}>
                      {l.photo && <img src={l.photo} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700 }}>{l.title.replace(/ — .*$/, '')}</p>
                        <p style={{ margin: 0, fontSize: 11, color: MUTED }}><Tag size={10} style={{ verticalAlign: -1 }} /> {l.category}</p>
                      </div>
                      <ExternalLink size={14} color={MUTED} />
                    </Link>
                  ))}
                  <Link href={`/marketplace?track=industry&view=stores`} style={{ ...btnStyle(GREEN), marginTop: 14, justifyContent: 'center' }}>
                    شوف تاب الشركات <ArrowRight size={14} />
                  </Link>
                </>
              )}

              {/* ═══ QR الاستلام ═══ */}
              {tab === 'qr' && (
                <div style={{ textAlign: 'center' }}>
                  {open.claimed ? (
                    <div style={{ padding: 24, background: GREEN_BG, borderRadius: 12 }}>
                      <CheckCircle2 size={36} color={GREEN} style={{ margin: '0 auto 8px' }} />
                      <p style={{ fontSize: 14, fontWeight: 800, color: GREEN, margin: 0 }}>الشركة استلمت صفحتها ✅</p>
                    </div>
                  ) : (
                    <>
                      <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 4px' }}>خلّي صاحب الشركة يمسح الكود ده</p>
                      <p style={{ fontSize: 11.5, color: MUTED, margin: '0 0 14px' }}>هيسجّل بموبايله ويستلم الصفحة ونظام الإدارة في دقيقة</p>
                      {qr ? <img src={qr} alt="QR" style={{ width: 240, height: 240, borderRadius: 12, border: `1px solid ${LINE}` }} />
                        : <div style={{ width: 240, height: 240, margin: '0 auto', display: 'grid', placeItems: 'center' }}><Loader2 className="animate-spin" color={GREEN} /></div>}
                      <p style={{ fontSize: 10.5, color: MUTED, margin: '10px 0 0', direction: 'ltr', wordBreak: 'break-all' }}>
                        {SITE}/claim-business/{open.claim_token}
                      </p>
                      <button onClick={() => { navigator.clipboard?.writeText(`${SITE}/claim-business/${open.claim_token}`) }}
                        style={{ ...btnStyle(MUTED, true), marginTop: 10, justifyContent: 'center', width: '100%' }}>نسخ الرابط</button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Chip({ on, label, strong }: { on: boolean; label: string; strong?: boolean }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 3,
      background: on ? (strong ? GREEN : GREEN_BG) : '#F1F4F2', color: on ? (strong ? '#fff' : GREEN) : MUTED }}>
      {on ? <CheckCircle2 size={9} /> : <Circle size={9} />}{label}
    </span>
  )
}
function Info({ icon: Icon, label, value, link }: { icon: React.ElementType; label: string; value: string | null; link?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '7px 0', borderTop: `1px solid ${LINE}`, fontSize: 12.5 }}>
      <Icon size={14} color={MUTED} />
      <span style={{ color: MUTED, width: 60 }}>{label}</span>
      {value ? (link ? <a href={value} target="_blank" rel="noreferrer" style={{ color: GREEN, direction: 'ltr' }}>{value.replace(/^https?:\/\//, '')}</a> : <span style={{ direction: 'ltr' }}>{value}</span>)
        : <span style={{ color: AMBER, fontSize: 11.5 }}>يتجمع في المعرض</span>}
    </div>
  )
}
const btnStyle = (color: string, outline?: boolean): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, fontSize: 12.5, fontWeight: 700,
  textDecoration: 'none', cursor: 'pointer', border: outline ? `1px solid ${LINE}` : 'none',
  background: outline ? '#fff' : color, color: outline ? color : '#fff', flex: 1, justifyContent: 'center',
})
