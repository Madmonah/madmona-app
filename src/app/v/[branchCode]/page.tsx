'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import {
  Loader2, CalendarPlus, Gift, Star, ShoppingBag, User, MessageCircle,
  ChevronRight, Check, Sparkles, Heart, AlertCircle, Phone, Instagram,
  Clock, Scissors, Store, Search, Plus,
} from 'lucide-react'
import { useMadmonaAuth, AccountGate } from '@/components/AccountGate'
import InstallPWA from '@/components/InstallPWA'
import LanguageToggle from '@/components/LanguageToggle'
import { useT } from '@/lib/i18n/LanguageProvider'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(SUPABASE_URL, ANON)
const WA = '201002229982'

export default function VisitHub({ params }: { params: { branchCode: string } }) {
  const { branchCode } = params
  const router = useRouter()
  const { t, dir } = useT()
  const { checking, authed, profile, setAuthed, setProfile } = useMadmonaAuth()
  const [info, setInfo] = useState<any>(null)
  const [branding, setBranding] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data: bi } = await supabase.rpc('public_get_branch_info', { p_branch_code: branchCode })
      setInfo(bi)
      if (bi?.branch?.supplier_id) {
        const { data: br } = await supabase.rpc('public_get_supplier_branding', { p_supplier_id: bi.branch.supplier_id })
        setBranding(br)
      }
      setLoading(false)
    })()
  }, [branchCode])

  if (loading || checking) return <div className="min-h-screen bg-[#FA8125] flex items-center justify-center"><Loader2 className="w-9 h-9 text-white animate-spin" /></div>

  if (!info?.branch) return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir={dir}>
      <div className="bg-white rounded-3xl p-8 text-center max-w-sm shadow-sm">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h1 className="text-xl font-black text-[#1A2E26]">{t('visit.branch_not_found')}</h1>
      </div>
    </div>
  )

  const branch = info.branch
  const biz = branding?.business_name || ''
  const tagline = branding?.description_ar || ''

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir={dir}>
      <style>{`
@keyframes mdFadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes mdFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes mdGlow{0%,100%{box-shadow:0 10px 26px -10px rgba(250, 129, 37,.55)}50%{box-shadow:0 16px 40px -8px rgba(250, 129, 37,.85)}}
.md-fade{animation:mdFadeUp .6s ease both}
.md-float{animation:mdFloat 4.5s ease-in-out infinite}
.md-glow{animation:mdGlow 2.8s ease-in-out infinite}
`}</style>
      <Hero biz={biz} branchName={branch.name} tagline={tagline} authed={authed} name={profile?.name} gallery={branding?.gallery || []} logo={branding?.logo_url} />
      <main className="max-w-md mx-auto px-4 -mt-7 pb-10 relative z-10 md-fade">
        <InstallPWA />
        {authed
          ? <Hub branchCode={branchCode} info={info} branding={branding} router={router} />
          : <AccountGate onAuthed={(p) => { setAuthed(true); setProfile(p) }} subtitle={t('visit.gate_subtitle')} />}
        <Footer />
      </main>
    </div>
  )
}

/* ============================ HERO ============================ */
function Hero({ biz, branchName, tagline, authed, name, gallery = [], logo }: any) {
  const { t, isRTL } = useT()
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    if (gallery.length < 2) return
    const tmr = setInterval(() => setIdx((i: number) => (i + 1) % gallery.length), 5000)
    return () => clearInterval(tmr)
  }, [gallery.length])

  return (
    <header className="relative bg-[#FA8125] text-white overflow-hidden">
      {gallery.map((src: string, i: number) => (
        <img key={i} src={src} alt="" aria-hidden="true"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1200ms] ${i === idx ? 'opacity-100' : 'opacity-0'}`} />
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-[#FA8125]/70 via-[#FA8125]/55 to-[#1A2E26]/90" />
      {gallery.length === 0 && <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, white 1.5px, transparent 1.5px)', backgroundSize: '22px 22px' }} />}

      {/* Language toggle */}
      <div className="absolute top-3 left-3 z-20">
        <LanguageToggle className="bg-white/90 backdrop-blur-sm" />
      </div>

      <div className="relative max-w-md mx-auto px-5 pt-10 pb-14 text-center">
        <p className="text-[10px] font-bold tracking-[0.45em] uppercase text-white/55 mb-3">MADMONA</p>
        {logo ? (
          <div className="mx-auto mb-3 rounded-2xl overflow-hidden ring-1 ring-white/20 shadow-xl shadow-black/25 bg-[#14110f] md-float" style={{ width: 'min(78%, 300px)' }}>
            <img src={logo} alt={biz || branchName} className="w-full block" />
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 mb-1">
            <Scissors className="w-5 h-5 text-white/80" />
            <h1 className="text-[26px] leading-tight font-black tracking-tight drop-shadow-sm">{biz || branchName}</h1>
          </div>
        )}
        <p className="text-[13px] text-white/90 font-bold">{branchName}</p>
        {tagline && <p className="text-[12px] text-white/70 mt-2.5 leading-relaxed max-w-xs mx-auto">{tagline}</p>}
        {authed && (
          <div className="mt-4 inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 ring-1 ring-white/15">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-[12px] font-bold">{t('visit.hero_welcome', { name: name || (isRTL ? 'بيكي' : 'there') })}</span>
          </div>
        )}
        {gallery.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-5">
            {gallery.map((_: any, i: number) => (
              <span key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === idx ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`} />
            ))}
          </div>
        )}
      </div>
    </header>
  )
}

/* ============================ HUB (tabs) ============================ */
function Hub({ branchCode, info, branding, router }: any) {
  const { t } = useT()
  const [tab, setTab] = useState<'book' | 'services' | 'social' | 'madmona'>('book')
  const [panel, setPanel] = useState<null | 'tip' | 'rate' | 'products'>(null)
  const stylists = info.stylists || []
  const services = info.services || []
  const products = (info.products || []).filter((p: any) => Number(p.selling_price_egp) > 0)
  const social = branding?.social_links || {}

  if (panel === 'tip') return <TipFlow branchCode={branchCode} stylists={stylists} onBack={() => setPanel(null)} />
  if (panel === 'rate') return <RateFlow branchCode={branchCode} stylists={stylists} onBack={() => setPanel(null)} />
  if (panel === 'products') return <Products products={products} onBack={() => setPanel(null)} branch={info.branch.name} />

  const tabs: any = [
    { k: 'book', label: t('visit.tab_book'), icon: CalendarPlus },
    { k: 'services', label: t('visit.tab_services'), icon: Scissors },
    { k: 'social', label: t('visit.tab_contact'), icon: Instagram },
    { k: 'madmona', label: t('visit.tab_madmona'), icon: Store },
  ]

  return (
    <div>
      <div className="bg-white rounded-2xl border border-gray-100 p-1.5 flex gap-1 mb-4 shadow-[0_8px_24px_-14px_rgba(26,46,38,0.25)]">
        {tabs.map((tb: any) => (
          <button key={tb.k} onClick={() => setTab(tb.k)}
            className={`flex-1 py-2.5 px-1 rounded-xl text-[12px] font-black flex items-center justify-center gap-1 transition-all ${tab === tb.k ? 'bg-[#FA8125] text-white shadow-md shadow-[#FA8125]/25' : 'text-[#6B7280] hover:text-[#1A2E26]'}`}>
            <tb.icon className="w-3.5 h-3.5" /> {tb.label}
          </button>
        ))}
      </div>

      {tab === 'book' && <BookTab branchCode={branchCode} router={router} setPanel={setPanel} hasProducts={products.length > 0} />}
      {tab === 'services' && <ServicesTab services={services} branchCode={branchCode} router={router} />}
      {tab === 'social' && <SocialTab social={social} branch={info.branch.name} />}
      {tab === 'madmona' && <MadmonaTab router={router} />}
    </div>
  )
}

function BookTab({ branchCode, router, setPanel, hasProducts }: any) {
  const { t } = useT()
  const tile = 'bg-white border border-gray-100 rounded-2xl p-4 text-start active:scale-[0.98] transition-all hover:border-[#FA8125]/40 hover:shadow-md hover:shadow-[#1A2E26]/5'
  return (
    <div className="space-y-4">
      {/* PRIMARY: book */}
      <button onClick={() => router.push(`/book/${branchCode}`)}
        className="w-full bg-[#FA8125] text-white rounded-2xl p-5 flex items-center justify-between shadow-lg shadow-[#FA8125]/20 active:scale-[0.99] transition-transform md-glow">
        <div className="flex items-center gap-3 text-start">
          <div className="w-11 h-11 rounded-xl bg-white/15 grid place-items-center"><CalendarPlus className="w-6 h-6" /></div>
          <div>
            <p className="font-black text-base">{t('visit.book_now_title')}</p>
            <p className="text-[12px] text-white/75">{t('visit.book_now_sub')}</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-white/70 rtl:rotate-180" />
      </button>

      {/* QUICK: products + account */}
      <div className="grid grid-cols-2 gap-3">
        {hasProducts && (
          <button onClick={() => setPanel('products')} className={tile}>
            <div className="w-10 h-10 rounded-xl bg-[#FA8125]/10 text-[#FA8125] grid place-items-center mb-2.5"><ShoppingBag className="w-5 h-5" /></div>
            <p className="font-black text-sm text-[#1A2E26]">{t('visit.products')}</p>
            <p className="text-[11px] text-[#6B7280] mt-0.5">{t('visit.products_sub')}</p>
          </button>
        )}
        <button onClick={() => router.push('/home')} className={tile}>
          <div className="w-10 h-10 rounded-xl bg-[#FA8125]/10 text-[#FA8125] grid place-items-center mb-2.5"><User className="w-5 h-5" /></div>
          <p className="font-black text-sm text-[#1A2E26]">{t('visit.account')}</p>
          <p className="text-[11px] text-[#6B7280] mt-0.5">{t('visit.account_sub')}</p>
        </button>
      </div>

      {/* AFTER SERVICE: tip + rate */}
      <div className="bg-[#FA8125]/[0.06] border border-[#FA8125]/15 rounded-2xl p-4">
        <p className="text-[11px] font-black tracking-wider uppercase text-[#FA8125] mb-0.5 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> {t('visit.after_service')}</p>
        <p className="text-[12px] text-[#6B7280] mb-3">{t('visit.after_service_sub')}</p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setPanel('tip')} className={tile}>
            <div className="w-10 h-10 rounded-xl bg-[#FA8125]/10 text-[#FA8125] grid place-items-center mb-2.5"><Gift className="w-5 h-5" /></div>
            <p className="font-black text-sm text-[#1A2E26]">{t('visit.tip_title')}</p>
            <p className="text-[11px] text-[#6B7280] mt-0.5">{t('visit.tip_sub')}</p>
          </button>
          <button onClick={() => setPanel('rate')} className={tile}>
            <div className="w-10 h-10 rounded-xl bg-[#FA8125]/10 text-[#FA8125] grid place-items-center mb-2.5"><Star className="w-5 h-5" /></div>
            <p className="font-black text-sm text-[#1A2E26]">{t('visit.rate_title')}</p>
            <p className="text-[11px] text-[#6B7280] mt-0.5">{t('visit.rate_sub')}</p>
          </button>
        </div>
      </div>
    </div>
  )
}

function ServicesTab({ services, branchCode, router }: any) {
  const { t, lang } = useT()
  if (!services.length) return <p className="text-center text-sm text-[#6B7280] py-6">{t('visit.no_services')}</p>
  return (
    <div className="space-y-2.5">
      {services.map((s: any) => (
        <button key={s.id} onClick={() => router.push(`/book/${branchCode}?service=${s.id}`)}
          className="w-full bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between text-start active:scale-[0.99] transition-all hover:border-[#FA8125]/40 hover:shadow-md hover:shadow-[#1A2E26]/5">
          <div>
            <p className="font-black text-sm text-[#1A2E26]">{lang === 'en' && s.name_en ? s.name_en : s.name_ar}</p>
            <p className="text-[11px] text-[#6B7280] mt-0.5 flex items-center gap-2">
              {s.duration_minutes ? <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {s.duration_minutes} {t('visit.min')}</span> : null}
            </p>
          </div>
          <div className="text-end flex items-center gap-2">
            <span className="font-mono font-black text-[#FA8125] text-sm">{Number(s.price_egp || 0).toLocaleString('en-US')} {t('visit.egp')}</span>
            <span className="w-7 h-7 rounded-lg bg-[#FA8125]/10 text-[#FA8125] grid place-items-center"><ChevronRight className="w-4 h-4 rtl:rotate-180" /></span>
          </div>
        </button>
      ))}
    </div>
  )
}

function SocialTab({ social, branch }: any) {
  const { t } = useT()
  const ig = social?.instagram
  const phones: string[] = social?.phones || []
  return (
    <div className="space-y-3">
      {ig && (
        <a href={`https://instagram.com/${ig}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl p-4 active:scale-[0.99] transition-all hover:shadow-md hover:shadow-[#1A2E26]/5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#FA8125]/10 text-[#FA8125] grid place-items-center"><Instagram className="w-6 h-6" /></div>
            <div>
              <p className="font-black text-sm text-[#1A2E26]">{t('visit.instagram')}</p>
              <p className="text-[12px] text-[#6B7280]" dir="ltr">@{ig}</p>
            </div>
          </div>
          <span className="text-[12px] font-black text-[#FA8125]">{t('visit.follow_us')}</span>
        </a>
      )}

      <a href={`https://wa.me/${WA}`} className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl p-4 active:scale-[0.99] transition-all hover:shadow-md hover:shadow-[#1A2E26]/5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#FA8125]/10 text-[#FA8125] grid place-items-center"><MessageCircle className="w-6 h-6" /></div>
          <div>
            <p className="font-black text-sm text-[#1A2E26]">{t('visit.whatsapp')}</p>
            <p className="text-[12px] text-[#6B7280]">{t('visit.whatsapp_sub')}</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-[#6B7280] rtl:rotate-180" />
      </a>

      {phones.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280] mb-2 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {t('visit.branch_phones')}</p>
          <div className="space-y-1.5">
            {phones.map((p) => (
              <a key={p} href={`tel:${p}`} className="block font-mono font-bold text-[#1A2E26] text-sm" dir="ltr">{p}</a>
            ))}
          </div>
        </div>
      )}

      <p className="text-center text-[11px] text-[#6B7280] pt-1">{branch}</p>
    </div>
  )
}

/* ============================ MADMONA TAB ============================ */
function MadmonaTab({ router }: any) {
  const { t } = useT()
  const items = [
    { icon: Search, title: t('visit.md_search_title'), sub: t('visit.md_search_sub'), onClick: () => router.push('/marketplace') },
    { icon: Plus, title: t('visit.md_list_title'), sub: t('visit.md_list_sub'), onClick: () => router.push('/add-listing') },
    { icon: User, title: t('visit.md_account_title'), sub: t('visit.md_account_sub'), onClick: () => router.push('/home') },
  ]
  return (
    <div className="space-y-3">
      <div className="bg-[#FA8125] text-white rounded-2xl p-5 text-center shadow-lg shadow-[#FA8125]/20">
        <div className="inline-flex items-center gap-1.5 mb-1.5">
          <span className="w-7 h-7 rounded-lg bg-white grid place-items-center text-[#FA8125] font-black">م</span>
          <p className="font-black text-lg">{t('visit.md_brand')}</p>
        </div>
        <p className="text-[13px] text-white/85 leading-relaxed">{t('visit.md_desc')}</p>
      </div>
      {items.map((a: any, i: number) => (
        <button key={i} onClick={a.onClick} className="w-full bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between text-start active:scale-[0.99] transition-all hover:border-[#FA8125]/40 hover:shadow-md hover:shadow-[#1A2E26]/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FA8125]/10 text-[#FA8125] grid place-items-center"><a.icon className="w-5 h-5" /></div>
            <div>
              <p className="font-black text-sm text-[#1A2E26]">{a.title}</p>
              <p className="text-[11px] text-[#6B7280] mt-0.5">{a.sub}</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-[#6B7280] rtl:rotate-180" />
        </button>
      ))}
      <p className="text-center text-[11px] text-[#6B7280]">{t('visit.md_footer')}</p>
    </div>
  )
}

/* ============================ ACMRAMIA (tip) ============================ */
function TipFlow({ branchCode, stylists, onBack }: any) {
  const { t } = useT()
  const [emp, setEmp] = useState<string | null>(null)
  const [amount, setAmount] = useState<number | null>(null)
  const [custom, setCustom] = useState('')
  const [method, setMethod] = useState<'instapay' | 'cash'>('instapay')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<any>(null)
  const chips = [20, 50, 100, 200]
  const finalAmount = amount ?? (custom ? Number(custom) : 0)
  const egp = t('visit.egp')

  async function submit() {
    if (!finalAmount || finalAmount <= 0) return
    setBusy(true)
    const { data } = await supabase.rpc('public_create_tip', {
      p_branch_code: branchCode, p_employee_id: emp, p_amount: finalAmount,
      p_method: method, p_customer_name: name || null, p_customer_phone: null,
    })
    setBusy(false)
    if (data?.ok) setDone(data)
  }

  if (done) return (
    <SuccessCard onBack={onBack} icon={Heart} title={t('visit.tip_done_title')}>
      <p className="text-sm text-[#6B7280] mb-3">{t('visit.tip_recorded')} <b className="text-[#FA8125]">{Number(finalAmount).toLocaleString('en-US')} {egp}</b>{done.employee_name ? ` — ${done.employee_name}` : ''}.</p>
      {method === 'instapay' && done.payout_details
        ? <div className="bg-[#FAFAF7] rounded-2xl p-4 text-sm border border-[#FA8125]/15">
            <p className="text-[11px] font-bold text-[#6B7280] mb-2">{t('visit.transfer_to')}</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between"><span className="text-[12px] text-[#6B7280]">{t('visit.bank')}</span><span className="font-bold text-[#1A2E26]">{t('visit.bank_misr')}</span></div>
              <div className="flex items-center justify-between"><span className="text-[12px] text-[#6B7280]">{t('visit.account_name')}</span><span className="font-bold text-[#1A2E26]">{t('visit.md_brand')}</span></div>
              <div className="flex items-center justify-between"><span className="text-[12px] text-[#6B7280]">{t('visit.account_or_instapay')}</span><span className="font-mono font-black text-[#FA8125] select-all" dir="ltr">{done.payout_details}</span></div>
            </div>
          </div>
        : <p className="text-[12px] text-[#6B7280]">{t('visit.tip_cash_note')}</p>}
    </SuccessCard>
  )

  return (
    <Sheet title={t('visit.tip_title')} onBack={onBack}>
      {stylists.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-bold text-[#1A2E26] mb-2">{t('visit.tip_for_whom')}</p>
          <div className="flex flex-wrap gap-2">
            <Chip active={emp === null} onClick={() => setEmp(null)}>{t('visit.whole_team')}</Chip>
            {stylists.map((s: any) => <Chip key={s.id} active={emp === s.id} onClick={() => setEmp(s.id)}>{s.full_name}</Chip>)}
          </div>
        </div>
      )}
      <p className="text-xs font-bold text-[#1A2E26] mb-2">{t('visit.amount')}</p>
      <div className="grid grid-cols-4 gap-2 mb-2">
        {chips.map((c) => (
          <button key={c} onClick={() => { setAmount(c); setCustom('') }} className={`py-2.5 rounded-xl font-black text-sm border transition-all ${amount === c ? 'bg-[#FA8125] text-white border-[#FA8125]' : 'bg-white text-[#1A2E26] border-gray-200'}`}>{c}</button>
        ))}
      </div>
      <input value={custom} onChange={(e) => { setCustom(e.target.value.replace(/[^0-9]/g, '')); setAmount(null) }} inputMode="numeric" placeholder={t('visit.custom_amount_ph')} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm mb-4 focus:border-[#FA8125] outline-none" />
      <p className="text-xs font-bold text-[#1A2E26] mb-2">{t('visit.payment_method')}</p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button onClick={() => setMethod('instapay')} className={`py-2.5 rounded-xl font-bold text-sm border ${method === 'instapay' ? 'bg-[#FA8125] text-white border-[#FA8125]' : 'bg-white text-[#1A2E26] border-gray-200'}`}>{t('visit.instapay')}</button>
        <button onClick={() => setMethod('cash')} className={`py-2.5 rounded-xl font-bold text-sm border ${method === 'cash' ? 'bg-[#FA8125] text-white border-[#FA8125]' : 'bg-white text-[#1A2E26] border-gray-200'}`}>{t('visit.cash')}</button>
      </div>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('visit.your_name_opt')} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm mb-4 focus:border-[#FA8125] outline-none" />
      <button onClick={submit} disabled={busy || !finalAmount} className="w-full py-3.5 rounded-2xl bg-[#FA8125] text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-40 shadow-lg shadow-[#FA8125]/20 active:scale-[0.99] transition-all">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />} {t('visit.pay_tip')} {finalAmount ? `· ${Number(finalAmount).toLocaleString('en-US')} ${egp}` : ''}
      </button>
    </Sheet>
  )
}

/* ============================ RATE ============================ */
function RateFlow({ branchCode, stylists, onBack }: any) {
  const { t } = useT()
  const [emp, setEmp] = useState<string | null>(null)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function submit() {
    if (rating < 1) return
    setBusy(true)
    const { data } = await supabase.rpc('public_rate_visit', { p_branch_code: branchCode, p_rating: rating, p_employee_id: emp, p_comment: comment || null, p_customer_name: name || null })
    setBusy(false)
    if (data?.ok) setDone(true)
  }

  if (done) return (
    <SuccessCard onBack={onBack} icon={Star} title={t('visit.rate_done_title')}><p className="text-sm text-[#6B7280]">{t('visit.rate_done_body')}</p></SuccessCard>
  )

  return (
    <Sheet title={t('visit.rate_title')} onBack={onBack}>
      {stylists.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-bold text-[#1A2E26] mb-2">{t('visit.who_served')}</p>
          <div className="flex flex-wrap gap-2">
            <Chip active={emp === null} onClick={() => setEmp(null)}>{t('visit.branch_general')}</Chip>
            {stylists.map((s: any) => <Chip key={s.id} active={emp === s.id} onClick={() => setEmp(s.id)}>{s.full_name}</Chip>)}
          </div>
        </div>
      )}
      <p className="text-xs font-bold text-[#1A2E26] mb-2">{t('visit.your_rating')}</p>
      <div className="flex items-center justify-center gap-2 mb-5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)}><Star className={`w-9 h-9 transition-all ${n <= rating ? 'fill-[#FA8125] text-[#FA8125] scale-110' : 'text-gray-300'}`} /></button>
        ))}
      </div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder={t('visit.comment_ph')} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm mb-3 focus:border-[#FA8125] outline-none resize-none" />
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('visit.your_name_opt')} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm mb-4 focus:border-[#FA8125] outline-none" />
      <button onClick={submit} disabled={busy || rating < 1} className="w-full py-3.5 rounded-2xl bg-[#FA8125] text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-40 shadow-lg shadow-[#FA8125]/20 active:scale-[0.99] transition-all">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {t('visit.send_review')}
      </button>
    </Sheet>
  )
}

/* ============================ PRODUCTS ============================ */
function Products({ products, onBack, branch }: any) {
  const { t, lang } = useT()
  return (
    <Sheet title={t('visit.products')} onBack={onBack}>
      <div className="space-y-2 mb-4">
        {products.map((p: any) => (
          <div key={p.id} className="flex items-center justify-between bg-[#FAFAF7] rounded-xl px-3.5 py-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#FA8125]/10 text-[#FA8125] grid place-items-center"><ShoppingBag className="w-4 h-4" /></div>
              <div>
                <p className="font-bold text-sm text-[#1A2E26]">{lang === 'en' && p.name_en ? p.name_en : p.name_ar}</p>
                {p.unit && <p className="text-[10px] text-[#6B7280]">{p.unit}</p>}
              </div>
            </div>
            <p className="font-mono font-black text-[#FA8125] text-sm">{Number(p.selling_price_egp || 0).toLocaleString('en-US')} {t('visit.egp')}</p>
          </div>
        ))}
      </div>
      <a href={`https://wa.me/${WA}?text=${encodeURIComponent('عايزة أطلب منتج من ' + branch)}`} className="w-full py-3.5 rounded-2xl bg-[#FA8125] text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#FA8125]/20">
        <MessageCircle className="w-4 h-4" /> {t('visit.order_whatsapp')}
      </a>
    </Sheet>
  )
}

/* ============================ SHARED UI ============================ */
function Footer() {
  const { t } = useT()
  return <p className="text-center text-[11px] text-[#6B7280] mt-6">{t('visit.footer')}</p>
}

function Sheet({ title, onBack, children }: any) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_8px_24px_-14px_rgba(26,46,38,0.25)]">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-[#FAFAF7] grid place-items-center text-[#6B7280] hover:text-[#1A2E26]"><ChevronRight className="w-5 h-5 rtl:rotate-180" /></button>
        <h2 className="font-black text-[#1A2E26]">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function SuccessCard({ icon: Icon, title, children, onBack }: any) {
  const { t } = useT()
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-7 text-center shadow-[0_8px_24px_-14px_rgba(26,46,38,0.25)]">
      <div className="w-16 h-16 rounded-2xl bg-[#FA8125]/10 text-[#FA8125] grid place-items-center mx-auto mb-4"><Icon className="w-8 h-8" /></div>
      <h2 className="text-xl font-black text-[#1A2E26] mb-2">{title}</h2>
      <div className="mb-5">{children}</div>
      <button onClick={onBack} className="w-full py-3 rounded-xl bg-[#FAFAF7] text-[#1A2E26] font-bold text-sm">{t('visit.back')}</button>
    </div>
  )
}

function Chip({ active, onClick, children }: any) {
  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-full text-[12px] font-bold border transition-all ${active ? 'bg-[#FA8125] text-white border-[#FA8125]' : 'bg-white text-[#1A2E26] border-gray-200'}`}>{children}</button>
  )
}
