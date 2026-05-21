'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import {
  Loader2, CalendarPlus, Gift, Star, ShoppingBag, User, MessageCircle,
  ChevronRight, Check, Sparkles, Heart, AlertCircle, Phone, Instagram,
  Clock, Scissors, ArrowLeft, ShieldCheck,
} from 'lucide-react'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(SUPABASE_URL, ANON)
const WA = '201002229982'
const fmt = (n: any) => Number(n || 0).toLocaleString('ar-EG')
const tok = () => (typeof window !== 'undefined' ? localStorage.getItem('madmona_token') : null)

export default function VisitHub({ params }: { params: { branchCode: string } }) {
  const { branchCode } = params
  const router = useRouter()
  const [info, setInfo] = useState<any>(null)
  const [branding, setBranding] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [profile, setProfile] = useState<{ name: string } | null>(null)

  useEffect(() => {
    (async () => {
      // @ts-expect-error rpc typing
      const { data: bi } = await supabase.rpc('public_get_branch_info', { p_branch_code: branchCode })
      setInfo(bi)
      if (bi?.branch?.supplier_id) {
        // @ts-expect-error rpc typing
        const { data: br } = await supabase.rpc('public_get_supplier_branding', { p_supplier_id: bi.branch.supplier_id })
        setBranding(br)
      }
      const t = tok()
      if (t) {
        // @ts-expect-error rpc typing
        const { data: r } = await supabase.rpc('madmona_resolve', { p_token: t })
        if (r?.authenticated) { setAuthed(true); setProfile({ name: r.full_name || r.name || '' }) }
        else localStorage.removeItem('madmona_token')
      }
      setLoading(false)
    })()
  }, [branchCode])

  if (loading) return <div className="min-h-screen bg-[#1F6F5F] flex items-center justify-center"><Loader2 className="w-9 h-9 text-white animate-spin" /></div>

  if (!info?.branch) return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-3xl p-8 text-center max-w-sm">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h1 className="text-xl font-black text-[#1A2E26]">الفرع مش موجود</h1>
      </div>
    </div>
  )

  const branch = info.branch
  const biz = branding?.business_name || ''
  const tagline = branding?.description_ar || ''

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <Hero biz={biz} branchName={branch.name} tagline={tagline} authed={authed} name={profile?.name} />
      <main className="max-w-md mx-auto px-4 -mt-6 pb-12">
        {authed
          ? <Hub branchCode={branchCode} info={info} branding={branding} router={router} />
          : <SignupGate onDone={(p) => { setAuthed(true); setProfile(p) }} />}
      </main>
    </div>
  )
}

/* ============================ HERO ============================ */
function Hero({ biz, branchName, tagline, authed, name }: any) {
  return (
    <header className="relative bg-[#1F6F5F] text-white overflow-hidden">
      {/* decorative pattern */}
      <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, white 1.5px, transparent 1.5px)', backgroundSize: '22px 22px' }} />
      <div className="absolute -top-16 -left-16 w-48 h-48 rounded-full bg-white/5" />
      <div className="absolute -bottom-20 -right-10 w-56 h-56 rounded-full bg-white/5" />

      <div className="relative max-w-md mx-auto px-5 pt-9 pb-12 text-center">
        <p className="text-[10px] font-bold tracking-[0.4em] uppercase text-white/55 mb-3">MADMONA</p>
        <div className="inline-flex items-center gap-2 mb-1">
          <Scissors className="w-5 h-5 text-white/80" />
          <h1 className="text-2xl font-black tracking-tight">{biz || branchName}</h1>
        </div>
        <p className="text-[13px] text-white/85">{branchName}</p>
        {tagline && <p className="text-[12px] text-white/65 mt-2 leading-relaxed max-w-xs mx-auto">{tagline}</p>}
        {authed && (
          <div className="mt-4 inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3.5 py-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-[12px] font-bold">أهلاً {name || 'بيكي'} · إنتي في المكان الصح</span>
          </div>
        )}
      </div>
    </header>
  )
}

/* ============================ SIGNUP GATE ============================ */
function SignupGate({ onDone }: any) {
  const [step, setStep] = useState<'enter' | 'verify'>('enter')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [otp, setOtp] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [knownName, setKnownName] = useState<string | null>(null)
  const clean = (s: string) => s.replace(/[^0-9]/g, '')

  async function send() {
    if (!phone) return
    setBusy(true); setErr('')
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/madmona-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON}` },
        body: JSON.stringify({ phone: clean(phone), full_name: name || null }),
      })
      const d = await res.json()
      if (!d?.success) setErr(d?.error || 'فشل إرسال الكود')
      else { setKnownName(d?.known_name || null); setStep('verify') }
    } catch { setErr('مشكلة في الاتصال، حاولي تاني') }
    setBusy(false)
  }

  async function verify() {
    setBusy(true); setErr('')
    // @ts-expect-error rpc typing
    const { data, error } = await supabase.rpc('madmona_verify_otp', { p_phone: clean(phone), p_code: otp, p_full_name: name || null })
    if (error || !data?.success) { setErr(data?.error || error?.message || 'الكود غلط'); setBusy(false); return }
    localStorage.setItem('madmona_token', data.token)
    onDone({ name: knownName || name })
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="text-center mb-5">
        <div className="w-12 h-12 rounded-2xl bg-[#1F6F5F]/10 grid place-items-center mx-auto mb-3"><MessageCircle className="w-6 h-6 text-[#1F6F5F]" /></div>
        <h2 className="text-lg font-black text-[#1A2E26]">اعملي حسابك بثانية</h2>
        <p className="text-[13px] text-[#6B7280] mt-1">عشان تحجزي، تتابعي مواعيدك، وتاخدي عروض — هنبعتلك كود على واتساب.</p>
      </div>

      {step === 'enter' ? (
        <>
          <label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">رقم الموبايل</label>
          <div className="relative mb-3">
            <Phone className="w-4 h-4 text-[#6B7280] absolute right-3 top-1/2 -translate-y-1/2" />
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="01XXXXXXXXX" className="w-full pr-9 pl-3 py-3 rounded-xl bg-[#FAFAF7] text-sm font-mono outline-none focus:ring-2 ring-[#1F6F5F]/30" dir="ltr" />
          </div>
          <label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">اسمك</label>
          <div className="relative">
            <User className="w-4 h-4 text-[#6B7280] absolute right-3 top-1/2 -translate-y-1/2" />
            <input type="text" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="اكتبي اسمك" className="w-full pr-9 pl-3 py-3 rounded-xl bg-[#FAFAF7] text-sm outline-none focus:ring-2 ring-[#1F6F5F]/30" />
          </div>
          {err && <p className="text-xs text-red-600 mt-2">{err}</p>}
          <button onClick={send} disabled={busy || !phone} className="w-full mt-4 py-3.5 rounded-xl bg-[#1F6F5F] text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الإرسال...</> : <><MessageCircle className="w-4 h-4" /> ابعتيلي الكود على واتساب</>}
          </button>
        </>
      ) : (
        <>
          <button onClick={() => { setStep('enter'); setOtp(''); setErr('') }} className="text-xs font-bold text-[#6B7280] flex items-center gap-1 mb-3"><ArrowLeft className="w-3.5 h-3.5" /> غيّري الرقم</button>
          {knownName && <p className="text-sm text-[#1F6F5F] font-bold mb-1">أهلاً {knownName} 👋</p>}
          <p className="text-[13px] text-[#6B7280] mb-3">بعتنا كود على واتساب الرقم <span className="font-bold text-[#1A2E26]" dir="ltr">{phone}</span></p>
          <input type="text" inputMode="numeric" value={otp} onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))} onKeyDown={e => e.key === 'Enter' && verify()} placeholder="● ● ● ● ● ●" maxLength={6} className="w-full px-3 py-3 rounded-xl bg-[#FAFAF7] text-center text-2xl font-black tracking-[0.4em] outline-none" dir="ltr" />
          {err && <p className="text-xs text-red-600 mt-2">{err}</p>}
          <button onClick={verify} disabled={busy || otp.length < 6} className="w-full mt-4 py-3.5 rounded-xl bg-[#1F6F5F] text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري التأكيد...</> : <><Check className="w-4 h-4" /> دخول</>}
          </button>
          <button onClick={send} disabled={busy} className="w-full mt-2 text-xs font-bold text-[#1F6F5F]">ابعتي الكود تاني</button>
        </>
      )}

      <div className="mt-5 pt-4 border-t border-gray-100 flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-[#1F6F5F] flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-[#6B7280] leading-relaxed">دخول آمن بكود لمرة واحدة على واتساب — من غير باسورد. حسابك على مضمونة يخدمك في أي مكان.</p>
      </div>
    </div>
  )
}

/* ============================ HUB (tabs) ============================ */
function Hub({ branchCode, info, branding, router }: any) {
  const [tab, setTab] = useState<'book' | 'services' | 'social'>('book')
  const [panel, setPanel] = useState<null | 'tip' | 'rate' | 'products'>(null)
  const stylists = info.stylists || []
  const services = info.services || []
  const products = (info.products || []).filter((p: any) => Number(p.selling_price_egp) > 0)
  const social = branding?.social_links || {}

  if (panel === 'tip') return <TipFlow branchCode={branchCode} stylists={stylists} onBack={() => setPanel(null)} />
  if (panel === 'rate') return <RateFlow branchCode={branchCode} stylists={stylists} onBack={() => setPanel(null)} />
  if (panel === 'products') return <Products products={products} onBack={() => setPanel(null)} branch={info.branch.name} />

  const tabs: any = [
    { k: 'book', label: 'احجزي', icon: CalendarPlus },
    { k: 'services', label: 'الخدمات', icon: Scissors },
    { k: 'social', label: 'تواصل', icon: Instagram },
  ]

  return (
    <div>
      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 p-1.5 flex gap-1 mb-4 shadow-sm">
        {tabs.map((t: any) => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`flex-1 py-2.5 rounded-xl text-[13px] font-black flex items-center justify-center gap-1.5 transition-all ${tab === t.k ? 'bg-[#1F6F5F] text-white' : 'text-[#6B7280]'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'book' && <BookTab branchCode={branchCode} router={router} setPanel={setPanel} hasProducts={products.length > 0} />}
      {tab === 'services' && <ServicesTab services={services} branchCode={branchCode} router={router} />}
      {tab === 'social' && <SocialTab social={social} branch={info.branch.name} />}
    </div>
  )
}

function BookTab({ branchCode, router, setPanel, hasProducts }: any) {
  const acts = [
    { k: 'tip', icon: Gift, title: 'بقشيش للستايلست', sub: 'قدّري شغلهم', onClick: () => setPanel('tip') },
    { k: 'rate', icon: Star, title: 'قيّمي زيارتك', sub: 'رأيك يفرق', onClick: () => setPanel('rate') },
    ...(hasProducts ? [{ k: 'products', icon: ShoppingBag, title: 'المنتجات', sub: 'اللي بنبيعه', onClick: () => setPanel('products') }] : []),
    { k: 'acc', icon: User, title: 'حسابي', sub: 'حجوزاتك وتقييماتك', onClick: () => router.push('/home') },
  ]
  return (
    <div className="space-y-3">
      <button onClick={() => router.push(`/book/${branchCode}`)}
        className="w-full bg-[#1F6F5F] text-white rounded-2xl p-5 flex items-center justify-between shadow-sm active:scale-[0.99] transition-transform">
        <div className="flex items-center gap-3 text-right">
          <div className="w-11 h-11 rounded-xl bg-white/15 grid place-items-center"><CalendarPlus className="w-6 h-6" /></div>
          <div>
            <p className="font-black text-base">احجزي موعدك دلوقتي</p>
            <p className="text-[12px] text-white/75">اختاري الخدمة والستايلست والوقت</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-white/70" />
      </button>
      <div className="grid grid-cols-2 gap-3">
        {acts.map((a: any) => (
          <button key={a.k} onClick={a.onClick} className="bg-white border border-gray-100 rounded-2xl p-4 text-right active:scale-[0.98] transition-transform hover:border-[#1F6F5F]/40">
            <div className="w-10 h-10 rounded-xl bg-[#1F6F5F]/10 text-[#1F6F5F] grid place-items-center mb-2.5"><a.icon className="w-5 h-5" /></div>
            <p className="font-black text-sm text-[#1A2E26]">{a.title}</p>
            <p className="text-[11px] text-[#6B7280] mt-0.5">{a.sub}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

function ServicesTab({ services, branchCode, router }: any) {
  if (!services.length) return <p className="text-center text-sm text-[#6B7280] py-6">مفيش خدمات معروضة دلوقتي</p>
  return (
    <div className="space-y-2">
      {services.map((s: any) => (
        <button key={s.id} onClick={() => router.push(`/book/${branchCode}?service=${s.id}`)}
          className="w-full bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between text-right active:scale-[0.99] transition-transform hover:border-[#1F6F5F]/40">
          <div>
            <p className="font-black text-sm text-[#1A2E26]">{s.name_ar}</p>
            <p className="text-[11px] text-[#6B7280] mt-0.5 flex items-center gap-2">
              {s.duration_minutes ? <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {s.duration_minutes} د</span> : null}
            </p>
          </div>
          <div className="text-left flex items-center gap-2">
            <span className="font-mono font-black text-[#1F6F5F] text-sm">{fmt(s.price_egp)} ج</span>
            <span className="w-7 h-7 rounded-lg bg-[#1F6F5F]/10 text-[#1F6F5F] grid place-items-center"><ChevronRight className="w-4 h-4" /></span>
          </div>
        </button>
      ))}
    </div>
  )
}

function SocialTab({ social, branch }: any) {
  const ig = social?.instagram
  const phones: string[] = social?.phones || []
  return (
    <div className="space-y-3">
      {ig && (
        <a href={`https://instagram.com/${ig}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl p-4 active:scale-[0.99] transition-transform">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#1F6F5F]/10 text-[#1F6F5F] grid place-items-center"><Instagram className="w-6 h-6" /></div>
            <div>
              <p className="font-black text-sm text-[#1A2E26]">إنستجرام</p>
              <p className="text-[12px] text-[#6B7280]" dir="ltr">@{ig}</p>
            </div>
          </div>
          <span className="text-[12px] font-black text-[#1F6F5F]">تابعينا</span>
        </a>
      )}

      <a href={`https://wa.me/${WA}`} className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl p-4 active:scale-[0.99] transition-transform">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#1F6F5F]/10 text-[#1F6F5F] grid place-items-center"><MessageCircle className="w-6 h-6" /></div>
          <div>
            <p className="font-black text-sm text-[#1A2E26]">واتساب</p>
            <p className="text-[12px] text-[#6B7280]">أي استفسار أو حجز</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-[#6B7280]" />
      </a>

      {phones.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280] mb-2 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> تليفونات الفرع</p>
          <div className="space-y-1.5">
            {phones.map((p) => (
              <a key={p} href={`tel:${p}`} className="block font-mono font-bold text-[#1A2E26] text-sm" dir="ltr">{p}</a>
            ))}
          </div>
        </div>
      )}

      <p className="text-center text-[11px] text-[#6B7280] pt-2">{branch} · على منصة مضمونة</p>
    </div>
  )
}

/* ============================ TIP ============================ */
function TipFlow({ branchCode, stylists, onBack }: any) {
  const [emp, setEmp] = useState<string | null>(null)
  const [amount, setAmount] = useState<number | null>(null)
  const [custom, setCustom] = useState('')
  const [method, setMethod] = useState<'instapay' | 'cash'>('instapay')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<any>(null)
  const chips = [20, 50, 100, 200]
  const finalAmount = amount ?? (custom ? Number(custom) : 0)

  async function submit() {
    if (!finalAmount || finalAmount <= 0) return
    setBusy(true)
    // @ts-expect-error rpc typing
    const { data } = await supabase.rpc('public_create_tip', {
      p_branch_code: branchCode, p_employee_id: emp, p_amount: finalAmount,
      p_method: method, p_customer_name: name || null, p_customer_phone: null,
    })
    setBusy(false)
    if (data?.ok) setDone(data)
  }

  if (done) return (
    <SuccessCard onBack={onBack} icon={Heart} title="شكراً ليكي ❤️">
      <p className="text-sm text-[#6B7280] mb-3">سجّلنا بقشيش <b className="text-[#1F6F5F]">{fmt(finalAmount)} ج</b>{done.employee_name ? ` لـ ${done.employee_name}` : ''}.</p>
      {method === 'instapay' && done.payout_details
        ? <div className="bg-[#FAFAF7] rounded-xl p-3 text-sm"><p className="text-[11px] text-[#6B7280] mb-1">حوّلي على إنستاباي:</p><p className="font-mono font-black text-[#1A2E26] select-all" dir="ltr">{done.payout_details}</p></div>
        : <p className="text-[12px] text-[#6B7280]">سلّميها في الكاشير أو للستايلست — واحنا سجّلناها في حسابهم.</p>}
    </SuccessCard>
  )

  return (
    <Sheet title="بقشيش للستايلست" onBack={onBack}>
      {stylists.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-bold text-[#1A2E26] mb-2">لمين؟</p>
          <div className="flex flex-wrap gap-2">
            <Chip active={emp === null} onClick={() => setEmp(null)}>الفريق كله</Chip>
            {stylists.map((s: any) => <Chip key={s.id} active={emp === s.id} onClick={() => setEmp(s.id)}>{s.full_name}</Chip>)}
          </div>
        </div>
      )}
      <p className="text-xs font-bold text-[#1A2E26] mb-2">المبلغ</p>
      <div className="grid grid-cols-4 gap-2 mb-2">
        {chips.map((c) => (
          <button key={c} onClick={() => { setAmount(c); setCustom('') }} className={`py-2.5 rounded-xl font-black text-sm border transition-all ${amount === c ? 'bg-[#1F6F5F] text-white border-[#1F6F5F]' : 'bg-white text-[#1A2E26] border-gray-200'}`}>{c}</button>
        ))}
      </div>
      <input value={custom} onChange={(e) => { setCustom(e.target.value.replace(/[^0-9]/g, '')); setAmount(null) }} inputMode="numeric" placeholder="أو اكتبي مبلغ تاني" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm mb-4 focus:border-[#1F6F5F] outline-none" />
      <p className="text-xs font-bold text-[#1A2E26] mb-2">طريقة الدفع</p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button onClick={() => setMethod('instapay')} className={`py-2.5 rounded-xl font-bold text-sm border ${method === 'instapay' ? 'bg-[#1F6F5F] text-white border-[#1F6F5F]' : 'bg-white text-[#1A2E26] border-gray-200'}`}>إنستاباي</button>
        <button onClick={() => setMethod('cash')} className={`py-2.5 rounded-xl font-bold text-sm border ${method === 'cash' ? 'bg-[#1F6F5F] text-white border-[#1F6F5F]' : 'bg-white text-[#1A2E26] border-gray-200'}`}>كاش</button>
      </div>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمك (اختياري)" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm mb-4 focus:border-[#1F6F5F] outline-none" />
      <button onClick={submit} disabled={busy || !finalAmount} className="w-full py-3.5 rounded-xl bg-[#1F6F5F] text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-40">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />} ادفعي البقشيش {finalAmount ? `· ${fmt(finalAmount)} ج` : ''}
      </button>
    </Sheet>
  )
}

/* ============================ RATE ============================ */
function RateFlow({ branchCode, stylists, onBack }: any) {
  const [emp, setEmp] = useState<string | null>(null)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function submit() {
    if (rating < 1) return
    setBusy(true)
    // @ts-expect-error rpc typing
    const { data } = await supabase.rpc('public_rate_visit', { p_branch_code: branchCode, p_rating: rating, p_employee_id: emp, p_comment: comment || null, p_customer_name: name || null })
    setBusy(false)
    if (data?.ok) setDone(true)
  }

  if (done) return (
    <SuccessCard onBack={onBack} icon={Star} title="ميرسي على رأيك ⭐"><p className="text-sm text-[#6B7280]">تقييمك بيساعدنا نحسّن الخدمة ليكي وللكل.</p></SuccessCard>
  )

  return (
    <Sheet title="قيّمي زيارتك" onBack={onBack}>
      {stylists.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-bold text-[#1A2E26] mb-2">مين خدمك؟ (اختياري)</p>
          <div className="flex flex-wrap gap-2">
            <Chip active={emp === null} onClick={() => setEmp(null)}>الفرع عموماً</Chip>
            {stylists.map((s: any) => <Chip key={s.id} active={emp === s.id} onClick={() => setEmp(s.id)}>{s.full_name}</Chip>)}
          </div>
        </div>
      )}
      <p className="text-xs font-bold text-[#1A2E26] mb-2">تقييمك</p>
      <div className="flex items-center justify-center gap-2 mb-5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)}><Star className={`w-9 h-9 transition-all ${n <= rating ? 'fill-[#1F6F5F] text-[#1F6F5F]' : 'text-gray-300'}`} /></button>
        ))}
      </div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="عايزة تقولي حاجة؟ (اختياري)" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm mb-3 focus:border-[#1F6F5F] outline-none resize-none" />
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمك (اختياري)" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm mb-4 focus:border-[#1F6F5F] outline-none" />
      <button onClick={submit} disabled={busy || rating < 1} className="w-full py-3.5 rounded-xl bg-[#1F6F5F] text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-40">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} ابعتي التقييم
      </button>
    </Sheet>
  )
}

/* ============================ PRODUCTS ============================ */
function Products({ products, onBack, branch }: any) {
  return (
    <Sheet title="المنتجات" onBack={onBack}>
      <div className="space-y-2 mb-4">
        {products.map((p: any) => (
          <div key={p.id} className="flex items-center justify-between bg-[#FAFAF7] rounded-xl px-3.5 py-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#1F6F5F]/10 text-[#1F6F5F] grid place-items-center"><ShoppingBag className="w-4 h-4" /></div>
              <div>
                <p className="font-bold text-sm text-[#1A2E26]">{p.name_ar}</p>
                {p.unit && <p className="text-[10px] text-[#6B7280]">{p.unit}</p>}
              </div>
            </div>
            <p className="font-mono font-black text-[#1F6F5F] text-sm">{fmt(p.selling_price_egp)} ج</p>
          </div>
        ))}
      </div>
      <a href={`https://wa.me/${WA}?text=${encodeURIComponent('عايزة أطلب منتج من ' + branch)}`} className="w-full py-3.5 rounded-xl bg-[#1F6F5F] text-white font-black text-sm flex items-center justify-center gap-2">
        <MessageCircle className="w-4 h-4" /> اطلبي على واتساب
      </a>
    </Sheet>
  )
}

/* ============================ SHARED UI ============================ */
function Sheet({ title, onBack, children }: any) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onBack} className="w-8 h-8 rounded-lg bg-[#FAFAF7] grid place-items-center text-[#6B7280]"><ChevronRight className="w-5 h-5" /></button>
        <h2 className="font-black text-[#1A2E26]">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function SuccessCard({ icon: Icon, title, children, onBack }: any) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-7 text-center shadow-sm">
      <div className="w-16 h-16 rounded-2xl bg-[#1F6F5F]/10 text-[#1F6F5F] grid place-items-center mx-auto mb-4"><Icon className="w-8 h-8" /></div>
      <h2 className="text-xl font-black text-[#1A2E26] mb-2">{title}</h2>
      <div className="mb-5">{children}</div>
      <button onClick={onBack} className="w-full py-3 rounded-xl bg-[#FAFAF7] text-[#1A2E26] font-bold text-sm">رجوع</button>
    </div>
  )
}

function Chip({ active, onClick, children }: any) {
  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-full text-[12px] font-bold border transition-all ${active ? 'bg-[#1F6F5F] text-white border-[#1F6F5F]' : 'bg-white text-[#1A2E26] border-gray-200'}`}>{children}</button>
  )
}
