'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import {
  Loader2, CalendarPlus, Gift, Star, ShoppingBag, User, MessageCircle,
  ChevronRight, Check, Sparkles, Heart, AlertCircle,
} from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const WA = '201002229982'
const fmt = (n: any) => Number(n || 0).toLocaleString('ar-EG')

type View = 'hub' | 'tip' | 'rate' | 'products'

export default function VisitHub({ params }: { params: { branchCode: string } }) {
  const { branchCode } = params
  const router = useRouter()
  const [info, setInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('hub')

  useEffect(() => {
    (async () => {
      // @ts-expect-error rpc typing
      const { data } = await supabase.rpc('public_get_branch_info', { p_branch_code: branchCode })
      setInfo(data)
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
  const business = info.supplier?.business_name || ''
  const stylists = info.stylists || []
  const products = (info.products || []).filter((p: any) => Number(p.selling_price_egp) > 0)

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      {/* HERO */}
      <header className="bg-[#1F6F5F] text-white">
        <div className="max-w-md mx-auto px-5 pt-8 pb-7 text-center">
          <p className="text-[10px] font-bold tracking-[0.35em] uppercase text-white/60 mb-2">MADMONA</p>
          {business && <p className="text-sm text-white/80 mb-1">{business}</p>}
          <h1 className="text-2xl font-black tracking-tight">{branch.name}</h1>
          <p className="text-[13px] text-white/75 mt-3 flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4" /> أهلاً بيكي · اختاري اللي محتاجاه
          </p>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 -mt-3 pb-10">
        {view === 'hub' && <Hub onPick={setView} branchCode={branchCode} router={router} hasProducts={products.length > 0} />}
        {view === 'tip' && <TipFlow branchCode={branchCode} stylists={stylists} onBack={() => setView('hub')} />}
        {view === 'rate' && <RateFlow branchCode={branchCode} stylists={stylists} onBack={() => setView('hub')} />}
        {view === 'products' && <Products products={products} onBack={() => setView('hub')} branch={branch.name} />}
      </main>
    </div>
  )
}

/* ============================ HUB ============================ */
function Hub({ onPick, branchCode, router, hasProducts }: any) {
  const tiles = [
    { key: 'book', icon: CalendarPlus, title: 'احجزي موعد', sub: 'اختاري الخدمة والستايلست', onClick: () => router.push(`/book/${branchCode}`), primary: true },
    { key: 'tip', icon: Gift, title: 'بقشيش للستايلست', sub: 'قدّري شغلهم', onClick: () => onPick('tip') },
    { key: 'rate', icon: Star, title: 'قيّمي زيارتك', sub: 'رأيك يفرق', onClick: () => onPick('rate') },
    ...(hasProducts ? [{ key: 'products', icon: ShoppingBag, title: 'المنتجات', sub: 'اللي بنستخدمه ونبيعه', onClick: () => onPick('products') }] : []),
    { key: 'account', icon: User, title: 'حسابي', sub: 'حجوزاتك وتقييماتك', onClick: () => router.push('/login') },
    { key: 'wa', icon: MessageCircle, title: 'تواصلي واتساب', sub: 'أي استفسار', onClick: () => { window.location.href = `https://wa.me/${WA}` } },
  ]
  return (
    <div className="space-y-3">
      <button onClick={tiles[0].onClick}
        className="w-full bg-[#1F6F5F] text-white rounded-2xl p-5 flex items-center justify-between shadow-sm active:scale-[0.99] transition-transform">
        <div className="flex items-center gap-3 text-right">
          <div className="w-11 h-11 rounded-xl bg-white/15 grid place-items-center"><CalendarPlus className="w-6 h-6" /></div>
          <div>
            <p className="font-black text-base">احجزي موعد</p>
            <p className="text-[12px] text-white/75">اختاري الخدمة والستايلست والوقت</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-white/70" />
      </button>

      <div className="grid grid-cols-2 gap-3">
        {tiles.slice(1).map((t: any) => (
          <button key={t.key} onClick={t.onClick}
            className="bg-white border border-gray-100 rounded-2xl p-4 text-right active:scale-[0.98] transition-transform hover:border-[#1F6F5F]/40">
            <div className="w-10 h-10 rounded-xl bg-[#1F6F5F]/10 text-[#1F6F5F] grid place-items-center mb-2.5"><t.icon className="w-5 h-5" /></div>
            <p className="font-black text-sm text-[#1A2E26]">{t.title}</p>
            <p className="text-[11px] text-[#6B7280] mt-0.5">{t.sub}</p>
          </button>
        ))}
      </div>

      <p className="text-center text-[11px] text-[#6B7280] pt-3">madmonacairo.com · اللي بتأجره مضمون</p>
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
    <SuccessCard onBack={onBack} icon={Heart} title="شكراً ليكي ❤️" >
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
            {stylists.map((s: any) => (
              <Chip key={s.id} active={emp === s.id} onClick={() => setEmp(s.id)}>{s.full_name}</Chip>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs font-bold text-[#1A2E26] mb-2">المبلغ</p>
      <div className="grid grid-cols-4 gap-2 mb-2">
        {chips.map((c) => (
          <button key={c} onClick={() => { setAmount(c); setCustom('') }}
            className={`py-2.5 rounded-xl font-black text-sm border transition-all ${amount === c ? 'bg-[#1F6F5F] text-white border-[#1F6F5F]' : 'bg-white text-[#1A2E26] border-gray-200'}`}>{c}</button>
        ))}
      </div>
      <input value={custom} onChange={(e) => { setCustom(e.target.value.replace(/[^0-9]/g, '')); setAmount(null) }}
        inputMode="numeric" placeholder="أو اكتبي مبلغ تاني"
        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm mb-4 focus:border-[#1F6F5F] outline-none" />

      <p className="text-xs font-bold text-[#1A2E26] mb-2">طريقة الدفع</p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button onClick={() => setMethod('instapay')} className={`py-2.5 rounded-xl font-bold text-sm border ${method === 'instapay' ? 'bg-[#1F6F5F] text-white border-[#1F6F5F]' : 'bg-white text-[#1A2E26] border-gray-200'}`}>إنستاباي</button>
        <button onClick={() => setMethod('cash')} className={`py-2.5 rounded-xl font-bold text-sm border ${method === 'cash' ? 'bg-[#1F6F5F] text-white border-[#1F6F5F]' : 'bg-white text-[#1A2E26] border-gray-200'}`}>كاش</button>
      </div>

      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمك (اختياري)"
        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm mb-4 focus:border-[#1F6F5F] outline-none" />

      <button onClick={submit} disabled={busy || !finalAmount}
        className="w-full py-3.5 rounded-xl bg-[#1F6F5F] text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-40">
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
    const { data } = await supabase.rpc('public_rate_visit', {
      p_branch_code: branchCode, p_rating: rating, p_employee_id: emp,
      p_comment: comment || null, p_customer_name: name || null,
    })
    setBusy(false)
    if (data?.ok) setDone(true)
  }

  if (done) return (
    <SuccessCard onBack={onBack} icon={Star} title="ميرسي على رأيك ⭐">
      <p className="text-sm text-[#6B7280]">تقييمك بيساعدنا نحسّن الخدمة ليكي وللكل.</p>
    </SuccessCard>
  )

  return (
    <Sheet title="قيّمي زيارتك" onBack={onBack}>
      {stylists.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-bold text-[#1A2E26] mb-2">مين خدمك؟ (اختياري)</p>
          <div className="flex flex-wrap gap-2">
            <Chip active={emp === null} onClick={() => setEmp(null)}>الفرع عموماً</Chip>
            {stylists.map((s: any) => (
              <Chip key={s.id} active={emp === s.id} onClick={() => setEmp(s.id)}>{s.full_name}</Chip>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs font-bold text-[#1A2E26] mb-2">تقييمك</p>
      <div className="flex items-center justify-center gap-2 mb-5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)}>
            <Star className={`w-9 h-9 transition-all ${n <= rating ? 'fill-[#1F6F5F] text-[#1F6F5F]' : 'text-gray-300'}`} />
          </button>
        ))}
      </div>

      <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="عايزة تقولي حاجة؟ (اختياري)"
        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm mb-3 focus:border-[#1F6F5F] outline-none resize-none" />
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمك (اختياري)"
        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm mb-4 focus:border-[#1F6F5F] outline-none" />

      <button onClick={submit} disabled={busy || rating < 1}
        className="w-full py-3.5 rounded-xl bg-[#1F6F5F] text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-40">
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
      <a href={`https://wa.me/${WA}?text=${encodeURIComponent('عايزة أطلب منتج من ' + branch)}`}
        className="w-full py-3.5 rounded-xl bg-[#1F6F5F] text-white font-black text-sm flex items-center justify-center gap-2">
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
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[12px] font-bold border transition-all ${active ? 'bg-[#1F6F5F] text-white border-[#1F6F5F]' : 'bg-white text-[#1A2E26] border-gray-200'}`}>{children}</button>
  )
}
