'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { safeStorage } from '@/lib/safe-storage'
// 🔴 rpcSafe: نفس السلوك، بس الخطأ مبيعدّيش في صمت (13 Jul 2026)
import { rpcSafe } from '@/lib/rpc'
import {
  Loader2, LogOut, Store, Calendar, QrCode, Wallet, Clock, Briefcase,
  Heart, Plus, Search, Building2, ChevronLeft, ShieldCheck, CalendarCheck,
  UserPlus, Check, X, Star, Gift, Coins, ShoppingBag, Minus,
} from 'lucide-react'
import MyAssetsCard from '@/components/MyAssetsCard'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const CARD = 'bg-white rounded-2xl border border-gray-100 shadow-[0_10px_30px_-18px_rgba(26,46,38,0.35)]'
const SECTION_TITLE = 'text-xs font-bold tracking-wider uppercase text-[#6B7280] mb-3 flex items-center gap-1.5'

export default function MadmonaHome() {
  const router = useRouter()
  const [me, setMe] = useState<any>(null)
  const [empSummary, setEmpSummary] = useState<any>(null)
  const [custBookings, setCustBookings] = useState<any>(null)
  const [pendingReviews, setPendingReviews] = useState<any[]>([])
  const [ratings, setRatings] = useState<Record<string, { service: number; stylist: number; comment: string }>>({})
  const [busyReview, setBusyReview] = useState<string | null>(null)
  const [tipTargets, setTipTargets] = useState<any[]>([])
  const [tipBranch, setTipBranch] = useState<string>('')
  const [tipEmp, setTipEmp] = useState<string>('')
  const [tipAmount, setTipAmount] = useState<number>(0)
  const [tipMethod, setTipMethod] = useState<'instapay' | 'cash'>('instapay')
  const [tipBusy, setTipBusy] = useState(false)
  const [tipResult, setTipResult] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [cart, setCart] = useState<Record<string, number>>({})
  const [storeMethod, setStoreMethod] = useState<'instapay' | 'cash'>('instapay')
  const [orderBusy, setOrderBusy] = useState(false)
  const [orderResult, setOrderResult] = useState<any>(null)
  const [bookBranches, setBookBranches] = useState<any[]>([])
  const [joinReqs, setJoinReqs] = useState<Record<string, any[]>>({})
  const [busyReq, setBusyReq] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadJoinReqs(token: string, admins: any[]) {
    const map: Record<string, any[]> = {}
    for (const a of admins) {
      if (a.role !== 'owner' && a.role !== 'manager') continue
      // @ts-expect-error rpc typing
      const { data } = await supabase.rpc('admin_list_employee_join_requests', { p_token: token, p_supplier_id: a.supplier_id })
      if (data?.ok && data.requests?.length) map[a.supplier_id] = data.requests
    }
    setJoinReqs(map)
  }

  async function init() {
    const token = safeStorage.get('madmona_token')
    if (!token) { router.push('/login'); return }
    // @ts-expect-error rpc typing
    const { data } = await supabase.rpc('madmona_resolve', { p_token: token })
    if (!data?.authenticated) { safeStorage.remove('madmona_token'); router.push('/login'); return }
    setMe(data)

    if (data.is_employee) {
      // @ts-expect-error rpc typing
      const { data: emp } = await supabase.rpc('madmona_employee_summary', { p_token: token })
      if (emp?.ok) setEmpSummary(emp)
    }
    if (data.is_customer) {
      // @ts-expect-error rpc typing
      const { data: cb } = await supabase.rpc('madmona_customer_bookings', { p_token: token })
      if (cb?.ok) setCustBookings(cb)
      // @ts-expect-error rpc typing
      const { data: pr } = await supabase.rpc('madmona_customer_pending_reviews', { p_token: token })
      if (pr?.ok && pr.pending?.length) setPendingReviews(pr.pending)
      // @ts-expect-error rpc typing
      const { data: tt } = await supabase.rpc('madmona_tip_targets', { p_token: token })
      if (tt?.ok && tt.targets?.length) setTipTargets(tt.targets)
      // @ts-expect-error rpc typing
      const { data: pd } = await supabase.rpc('madmona_list_products', { p_token: token })
      if (pd?.ok && pd.products?.length) setProducts(pd.products)
      // @ts-expect-error rpc typing
      const { data: bi } = await supabase.rpc('madmona_booking_info', { p_token: token })
      if (bi?.ok && bi.options?.length) {
        const brs = bi.options.flatMap((o: any) => (o.branches || []).map((b: any) => ({ ...b, business: o.business_name })))
        setBookBranches(brs)
      }
    }
    if (data.is_admin) await loadJoinReqs(token, data.roles.admin || [])
    setLoading(false)
  }

  useEffect(() => { init() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [])

  async function reviewReq(supplierId: string, reqId: string, action: 'approve' | 'reject') {
    const token = safeStorage.get('madmona_token'); if (!token) return
    setBusyReq(reqId)
    await rpcSafe(supabase, 'admin_review_employee_join', { p_token: token, p_request_id: reqId, p_action: action })
    setJoinReqs(prev => ({ ...prev, [supplierId]: (prev[supplierId] || []).filter(r => r.id !== reqId) }))
    setBusyReq(null)
  }

  function setRate(bid: string, field: 'service' | 'stylist' | 'comment', val: any) {
    setRatings(prev => ({ ...prev, [bid]: { service: 0, stylist: 0, comment: '', ...prev[bid], [field]: val } }))
  }

  async function submitReview(bid: string) {
    const r = ratings[bid]
    if (!r || !r.service) return
    setBusyReview(bid)
    await rpcSafe(supabase, 'public_submit_review', {
      p_booking_id: bid, p_rating: r.service, p_comment: r.comment || null,
      p_stylist_rating: r.stylist || null,
    })
    setPendingReviews(prev => prev.filter(p => p.booking_id !== bid))
    setBusyReview(null)
  }

  async function sendTip() {
    if (!tipEmp || !tipAmount) return
    const token = safeStorage.get('madmona_token'); if (!token) return
    setTipBusy(true)
    // @ts-expect-error rpc typing
    const { data } = await supabase.rpc('madmona_create_tip', {
      p_token: token, p_employee_id: tipEmp, p_amount: tipAmount, p_method: tipMethod,
    })
    if (data?.ok) { setTipResult(data); setTipEmp(''); setTipAmount(0) }
    setTipBusy(false)
  }

  function changeQty(pid: string, delta: number) {
    setCart(prev => {
      const q = (prev[pid] || 0) + delta
      const next = { ...prev }
      if (q <= 0) delete next[pid]; else next[pid] = q
      return next
    })
  }

  async function placeOrder() {
    const items = Object.entries(cart).map(([product_id, qty]) => ({ product_id, qty }))
    if (!items.length) return
    const token = safeStorage.get('madmona_token'); if (!token) return
    setOrderBusy(true)
    // @ts-expect-error rpc typing
    const { data } = await supabase.rpc('madmona_create_product_order', {
      p_token: token, p_items: items, p_method: storeMethod,
    })
    if (data?.ok) { setOrderResult(data); setCart({}) }
    setOrderBusy(false)
  }

  async function logout() {
    const token = safeStorage.get('madmona_token')
    if (token) {
      await rpcSafe(supabase, 'madmona_logout', { p_token: token })
      safeStorage.remove('madmona_token')
    }
    router.push('/login')
  }

  if (loading) return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#1F6F5F] animate-spin" /></div>

  const admins = me?.roles?.admin || []
  const employees = me?.roles?.employee || []
  const STATUS_AR: Record<string, string> = {
    scheduled: 'محجوز', confirmed: 'مؤكد', in_progress: 'جاري', completed: 'تم', cancelled: 'ملغي', no_show: 'لم يحضر',
  }

  const today: { title: string; time: string }[] = []
  if (Array.isArray(empSummary?.today)) {
    empSummary.today.forEach((bk: any) => today.push({
      title: [bk.service, bk.customer].filter(Boolean).join(' — ') || 'موعد',
      time: String(bk.time || '').slice(0, 5),
    }))
  }
  if (today.length === 0 && Array.isArray(custBookings?.upcoming)) {
    custBookings.upcoming.slice(0, 3).forEach((bk: any) => today.push({
      title: [bk.service, bk.branch].filter(Boolean).join(' · ') || 'حجز',
      time: String(bk.time || '').slice(0, 5),
    }))
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      {/* ===== HERO HEADER ===== */}
      <header className="relative bg-[#1F6F5F] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, white 1.5px, transparent 1.5px)', backgroundSize: '22px 22px' }} />
        <div className="absolute -top-16 -left-12 w-44 h-44 rounded-full bg-white/5" />
        <div className="relative max-w-3xl mx-auto px-4 pt-8 pb-12 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[0.45em] uppercase text-white/55">مضمونة</p>
            <h1 className="text-[26px] leading-tight font-black mt-1">أهلاً {me?.full_name || ''} 👋</h1>
            <p className="text-[12px] text-white/70 mt-1.5">حساب واحد يخدمك في كل حاجة</p>
          </div>
          <button onClick={logout} className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-bold flex items-center gap-1.5 backdrop-blur-sm ring-1 ring-white/10">
            <LogOut className="w-4 h-4" /> خروج
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 -mt-6 pb-12 space-y-7 relative z-10">

        {/* ===== TODAY ===== */}
        <section>
          <div className="bg-[#1F6F5F] text-white rounded-2xl p-5 shadow-lg shadow-[#1F6F5F]/20 relative overflow-hidden">
            <div className="absolute -top-10 -left-8 w-32 h-32 rounded-full bg-white/5" />
            <div className="relative">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[11px] font-black tracking-[0.2em] uppercase text-white/70">النهارده</p>
                <span className="text-[11px] text-white/80">{new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              </div>
              {today.length > 0 ? (
                <div className="space-y-1.5">
                  {today.slice(0, 3).map((it, i) => (
                    <div key={i} className="flex items-center justify-between bg-white/10 rounded-xl px-3 py-2.5">
                      <span className="text-sm font-bold truncate ml-2">{it.title}</span>
                      {it.time && <span className="text-[12px] font-mono text-white/90 flex-shrink-0" dir="ltr">{it.time}</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/90">يومك فاضي 🌿 — تحب تحجز خدمة جديدة؟</p>
              )}
            </div>
          </div>
        </section>

        {/* ===== 🔑 حاجاتي — كل أصل مربوط برقم المستخدم =====
            (15 Jul 2026) صاحب 14 أصل كان بيدخل ويلاقي «يومك فاضي» وحاجات
            عميل بس — وحاجاته مدفونة في /account اللي محدش بيدوّر عليها.
            الكارت بيختفي لوحده لو مفيش أصول، فالزبون العادي مبيتأثرش. */}
        <MyAssetsCard />

        {/* ===== ADMIN / OWNER ===== */}
        {admins.length > 0 && (
          <section>
            <h2 className={SECTION_TITLE}><Building2 className="w-3.5 h-3.5" /> بوابة الأعمال</h2>
            <div className="space-y-2.5">
              {admins.map((a: any) => (
                <div key={a.supplier_id} className="space-y-2.5">
                  <Link href={`/owner/${a.supplier_id}`} className={`${CARD} p-4 flex items-center justify-between hover:border-[#1F6F5F]/40 hover:shadow-md transition-all`}>
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-[#1F6F5F]/10 grid place-items-center"><Briefcase className="w-5 h-5 text-[#1F6F5F]" /></div>
                      <div>
                        <p className="font-black text-[#1A2E26]">{a.business_name}</p>
                        <p className="text-[11px] text-[#6B7280]">إدارة · {a.role === 'owner' ? 'مالك' : a.role === 'manager' ? 'مدير' : a.role}</p>
                      </div>
                    </div>
                    <ChevronLeft className="w-5 h-5 text-[#6B7280]" />
                  </Link>

                  {/* Pending employee join requests */}
                  {(joinReqs[a.supplier_id]?.length > 0) && (
                    <div className="bg-white rounded-2xl border border-[#1F6F5F]/30 p-4 shadow-[0_10px_30px_-18px_rgba(26,46,38,0.35)]">
                      <div className="flex items-center gap-1.5 mb-3">
                        <UserPlus className="w-4 h-4 text-[#1F6F5F]" />
                        <p className="text-sm font-black text-[#1A2E26]">طلبات انضمام موظفين</p>
                        <span className="px-1.5 py-0.5 rounded-full bg-[#1F6F5F] text-white text-[10px] font-bold">{joinReqs[a.supplier_id].length}</span>
                      </div>
                      <div className="space-y-2">
                        {joinReqs[a.supplier_id].map((r: any) => (
                          <div key={r.id} className="flex items-center justify-between gap-2 border-b border-gray-50 pb-2 last:border-0">
                            <div className="min-w-0">
                              <p className="font-bold text-[#1A2E26] text-sm truncate">{r.full_name} {r.name_match && <span className="text-[10px] text-[#1F6F5F]">(مطابق لموظف موجود)</span>}</p>
                              <p className="text-[11px] text-[#6B7280] truncate">{r.job_title || 'موظف'} · {r.branch_name} · <span dir="ltr">{r.phone}</span></p>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button onClick={() => reviewReq(a.supplier_id, r.id, 'approve')} disabled={busyReq === r.id} className="w-9 h-9 rounded-xl bg-[#1F6F5F] text-white grid place-items-center disabled:opacity-50" title="موافقة">
                                {busyReq === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                              </button>
                              <button onClick={() => reviewReq(a.supplier_id, r.id, 'reject')} disabled={busyReq === r.id} className="w-9 h-9 rounded-xl bg-gray-100 text-[#6B7280] grid place-items-center disabled:opacity-50" title="رفض">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ===== EMPLOYEE ===== */}
        {employees.length > 0 && (
          <section>
            <h2 className={SECTION_TITLE}><Briefcase className="w-3.5 h-3.5" /> شغلي</h2>
            <div className="space-y-2.5">
              {employees.map((emp: any) => (
                <Link key={emp.employee_id} href="/me" className={`${CARD} p-4 flex items-center justify-between hover:border-[#1F6F5F]/40 hover:shadow-md transition-all`}>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[#1F6F5F]/10 grid place-items-center"><Briefcase className="w-5 h-5 text-[#1F6F5F]" /></div>
                    <div>
                      <p className="font-black text-[#1A2E26]">{emp.business_name}</p>
                      <p className="text-[11px] text-[#6B7280]">لوحة شغلي · حضور، تاسكات، اكراميات، مواعيد</p>
                    </div>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-[#6B7280]" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ===== PENDING REVIEWS ===== */}
        {pendingReviews.length > 0 && (
          <section>
            <h2 className={SECTION_TITLE}><Star className="w-3.5 h-3.5" /> قيّم زياراتك</h2>
            <div className="space-y-3">
              {pendingReviews.map((p: any) => {
                const r = ratings[p.booking_id] || { service: 0, stylist: 0, comment: '' }
                return (
                  <div key={p.booking_id} className={`${CARD} p-4`}>
                    <div className="mb-3">
                      <p className="font-black text-[#1A2E26]">{p.service}</p>
                      <p className="text-[11px] text-[#6B7280]">{p.branch}{p.employee ? ' · ' + p.employee : ''} · {p.date}</p>
                    </div>

                    <p className="text-[11px] font-bold text-[#6B7280] mb-1">تقييم الخدمة</p>
                    <div className="flex gap-1 mb-3" dir="ltr">
                      {[1,2,3,4,5].map(n => (
                        <button key={n} onClick={() => setRate(p.booking_id, 'service', n)}>
                          <Star className={`w-7 h-7 ${n <= r.service ? 'fill-[#1F6F5F] text-[#1F6F5F]' : 'text-gray-300'}`} />
                        </button>
                      ))}
                    </div>

                    {p.employee && (
                      <>
                        <p className="text-[11px] font-bold text-[#6B7280] mb-1">تقييم {p.employee}</p>
                        <div className="flex gap-1 mb-3" dir="ltr">
                          {[1,2,3,4,5].map(n => (
                            <button key={n} onClick={() => setRate(p.booking_id, 'stylist', n)}>
                              <Star className={`w-6 h-6 ${n <= r.stylist ? 'fill-[#1F6F5F] text-[#1F6F5F]' : 'text-gray-300'}`} />
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    <textarea value={r.comment} onChange={e => setRate(p.booking_id, 'comment', e.target.value)} placeholder="رأيك يهمنا (اختياري)" rows={2} className="w-full px-3 py-2.5 rounded-xl bg-[#FAFAF7] text-sm mb-3 resize-none outline-none focus:bg-white border border-transparent focus:border-[#1F6F5F]/30 transition-colors" />

                    <button onClick={() => submitReview(p.booking_id)} disabled={busyReview === p.booking_id || !r.service} className="w-full py-3 rounded-2xl bg-[#1F6F5F] text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#1F6F5F]/20 active:scale-[0.99] transition-all">
                      {busyReview === p.booking_id ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الإرسال...</> : <><Star className="w-4 h-4" /> ابعت تقييمك</>}
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ===== CUSTOMER ===== */}
        {me?.is_customer && (
          <section>
            <h2 className={SECTION_TITLE}><Heart className="w-3.5 h-3.5" /> حجوزاتي</h2>
            <div className={`${CARD} p-4`}>
              {custBookings?.upcoming?.length > 0 ? (
                <div className="space-y-2 mb-3">
                  {custBookings.upcoming.map((b: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm border-b border-gray-50 pb-2 last:border-0">
                      <div>
                        <p className="font-bold text-[#1A2E26]">{b.service}</p>
                        <p className="text-[11px] text-[#6B7280]">{b.branch} · {b.date} · <span dir="ltr">{b.time}</span></p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-[#1F6F5F]/10 text-[#1F6F5F] text-[10px] font-bold">{STATUS_AR[b.status] || b.status}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-[#6B7280] mb-3">مفيش حجوزات قادمة</p>}
              {bookBranches.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-[#6B7280]">احجز خدمة جديدة:</p>
                  {bookBranches.map((b: any) => (
                    <Link key={b.branch_id} href={`/book/${b.code}`} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-[#1F6F5F]/5 hover:bg-[#1F6F5F]/10 transition-colors">
                      <span className="text-sm font-bold text-[#1A2E26] flex items-center gap-2"><Calendar className="w-4 h-4 text-[#1F6F5F]" /> {b.name}</span>
                      <ChevronLeft className="w-4 h-4 text-[#6B7280]" />
                    </Link>
                  ))}
                </div>
              ) : (
                <Link href="/marketplace" className="w-full py-3 rounded-2xl bg-[#1F6F5F] text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#1F6F5F]/20">
                  <Calendar className="w-4 h-4" /> احجز خدمة جديدة
                </Link>
              )}
            </div>
          </section>
        )}

        {/* ===== TIPS (اكرامية) ===== */}
        {tipTargets.length > 0 && (() => {
          const branches = tipTargets.flatMap((t: any) => (t.branches || []).map((b: any) => ({ ...b })))
          const emps = branches.find((b: any) => b.branch_id === tipBranch)?.employees || []
          return (
            <section>
              <h2 className={SECTION_TITLE}><Gift className="w-3.5 h-3.5" /> كرّم اللي خدمك (اكرامية)</h2>
              <div className={`${CARD} p-4`}>
                {tipResult ? (
                  <div className="text-center py-2">
                    <div className="w-14 h-14 rounded-full bg-[#1F6F5F]/10 grid place-items-center mx-auto mb-3"><Gift className="w-7 h-7 text-[#1F6F5F]" /></div>
                    <p className="font-black text-[#1A2E26] mb-1">شكراً! 🎉 اكرامية {tipResult.amount} ج لـ {tipResult.employee}</p>
                    <p className="text-sm text-[#6B7280] leading-relaxed">{tipResult.message}</p>
                    {tipResult.instapay && (
                      <div className="mt-3 bg-[#FAFAF7] rounded-xl p-3 text-right border border-[#1F6F5F]/15">
                        <p className="text-[11px] font-bold text-[#6B7280] mb-2">حوّل على حساب مضمونة:</p>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between"><span className="text-[12px] text-[#6B7280]">البنك</span><span className="font-bold text-[#1A2E26]">بنك مصر</span></div>
                          <div className="flex items-center justify-between"><span className="text-[12px] text-[#6B7280]">اسم الحساب</span><span className="font-bold text-[#1A2E26]">مضمونة</span></div>
                          <div className="flex items-center justify-between"><span className="text-[12px] text-[#6B7280]">رقم الحساب / إنستاباي</span><span className="font-mono font-black text-[#1F6F5F] select-all" dir="ltr">{tipResult.instapay}</span></div>
                        </div>
                      </div>
                    )}
                    <button onClick={() => setTipResult(null)} className="mt-4 text-xs font-bold text-[#1F6F5F]">اكرامية تانية</button>
                  </div>
                ) : (
                  <>
                    <select value={tipBranch} onChange={e => { setTipBranch(e.target.value); setTipEmp('') }} className="w-full px-3 py-3 rounded-xl bg-[#FAFAF7] text-sm mb-3 outline-none">
                      <option value="">اختار الفرع</option>
                      {branches.map((b: any) => <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>)}
                    </select>

                    {tipBranch && (
                      <select value={tipEmp} onChange={e => setTipEmp(e.target.value)} className="w-full px-3 py-3 rounded-xl bg-[#FAFAF7] text-sm mb-3 outline-none">
                        <option value="">اختار الموظف</option>
                        {emps.map((e: any) => <option key={e.employee_id} value={e.employee_id}>{e.name}{e.role_ar ? ' — ' + e.role_ar : ''}</option>)}
                      </select>
                    )}

                    <p className="text-[11px] font-bold text-[#6B7280] mb-1.5">المبلغ</p>
                    <div className="flex gap-2 mb-3">
                      {[20, 50, 100].map(a => (
                        <button key={a} onClick={() => setTipAmount(a)} className={`flex-1 py-2.5 rounded-xl font-bold text-sm border transition-all ${tipAmount === a ? 'bg-[#1F6F5F] text-white border-[#1F6F5F]' : 'bg-white text-[#1A2E26] border-gray-200'}`}>{a} ج</button>
                      ))}
                      <input type="number" value={tipAmount || ''} onChange={e => setTipAmount(Number(e.target.value))} placeholder="غير ده" className="w-20 px-2 py-2 rounded-xl bg-[#FAFAF7] text-sm text-center outline-none" dir="ltr" />
                    </div>

                    <p className="text-[11px] font-bold text-[#6B7280] mb-1.5">طريقة الدفع</p>
                    <div className="flex gap-2 mb-4">
                      <button onClick={() => setTipMethod('instapay')} className={`flex-1 py-2.5 rounded-xl font-bold text-sm border flex items-center justify-center gap-1.5 ${tipMethod === 'instapay' ? 'bg-[#1F6F5F] text-white border-[#1F6F5F]' : 'bg-white text-[#1A2E26] border-gray-200'}`}><Coins className="w-4 h-4" /> إنستاباي</button>
                      <button onClick={() => setTipMethod('cash')} className={`flex-1 py-2.5 rounded-xl font-bold text-sm border flex items-center justify-center gap-1.5 ${tipMethod === 'cash' ? 'bg-[#1F6F5F] text-white border-[#1F6F5F]' : 'bg-white text-[#1A2E26] border-gray-200'}`}><Wallet className="w-4 h-4" /> كاش في الفرع</button>
                    </div>

                    <button onClick={sendTip} disabled={tipBusy || !tipEmp || !tipAmount} className="w-full py-3 rounded-2xl bg-[#1F6F5F] text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#1F6F5F]/20 active:scale-[0.99] transition-all">
                      {tipBusy ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري...</> : <><Gift className="w-4 h-4" /> ابعت الاكرامية</>}
                    </button>
                  </>
                )}
              </div>
            </section>
          )
        })()}

        {/* ===== PRODUCTS STORE ===== */}
        {products.length > 0 && (() => {
          const cartItems = Object.entries(cart)
          const total = cartItems.reduce((sum, [pid, qty]) => {
            const p = products.find((x: any) => x.product_id === pid)
            return sum + (p ? p.price * qty : 0)
          }, 0)
          return (
            <section>
              <h2 className={SECTION_TITLE}><ShoppingBag className="w-3.5 h-3.5" /> منتجات للبيع</h2>
              <div className={`${CARD} p-4`}>
                {orderResult ? (
                  <div className="text-center py-2">
                    <div className="w-14 h-14 rounded-full bg-[#1F6F5F]/10 grid place-items-center mx-auto mb-3"><ShoppingBag className="w-7 h-7 text-[#1F6F5F]" /></div>
                    <p className="font-black text-[#1A2E26] mb-1">تم استلام طلبك! 🛍️</p>
                    <p className="text-sm text-[#6B7280] leading-relaxed">{orderResult.message}</p>
                    {orderResult.instapay && (
                      <div className="mt-3 bg-[#FAFAF7] rounded-xl p-3 text-right border border-[#1F6F5F]/15">
                        <p className="text-[11px] font-bold text-[#6B7280] mb-2">حوّل على حساب مضمونة:</p>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between"><span className="text-[12px] text-[#6B7280]">البنك</span><span className="font-bold text-[#1A2E26]">بنك مصر</span></div>
                          <div className="flex items-center justify-between"><span className="text-[12px] text-[#6B7280]">اسم الحساب</span><span className="font-bold text-[#1A2E26]">مضمونة</span></div>
                          <div className="flex items-center justify-between"><span className="text-[12px] text-[#6B7280]">رقم الحساب / إنستاباي</span><span className="font-mono font-black text-[#1F6F5F] select-all" dir="ltr">{orderResult.instapay}</span></div>
                        </div>
                      </div>
                    )}
                    <button onClick={() => setOrderResult(null)} className="mt-4 text-xs font-bold text-[#1F6F5F]">اطلب تاني</button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 max-h-72 overflow-y-auto mb-3">
                      {products.map((p: any) => (
                        <div key={p.product_id} className="flex items-center justify-between gap-2 border-b border-gray-50 pb-2 last:border-0">
                          <div className="min-w-0">
                            <p className="font-bold text-[#1A2E26] text-sm truncate">{p.name}</p>
                            <p className="text-[11px] text-[#1F6F5F] font-bold">{Number(p.price).toLocaleString()} ج</p>
                          </div>
                          {cart[p.product_id] ? (
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button onClick={() => changeQty(p.product_id, -1)} className="w-7 h-7 rounded-lg bg-gray-100 grid place-items-center"><Minus className="w-3.5 h-3.5" /></button>
                              <span className="font-black text-sm w-5 text-center">{cart[p.product_id]}</span>
                              <button onClick={() => changeQty(p.product_id, 1)} className="w-7 h-7 rounded-lg bg-[#1F6F5F] text-white grid place-items-center"><Plus className="w-3.5 h-3.5" /></button>
                            </div>
                          ) : (
                            <button onClick={() => changeQty(p.product_id, 1)} className="px-3 py-1.5 rounded-lg bg-[#1F6F5F]/10 text-[#1F6F5F] text-xs font-bold flex-shrink-0">ضيف</button>
                          )}
                        </div>
                      ))}
                    </div>

                    {total > 0 && (
                      <div className="border-t border-gray-100 pt-3">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-bold text-[#6B7280]">الإجمالي</span>
                          <span className="text-lg font-black text-[#1A2E26]">{total.toLocaleString()} ج</span>
                        </div>
                        <div className="flex gap-2 mb-3">
                          <button onClick={() => setStoreMethod('instapay')} className={`flex-1 py-2.5 rounded-xl font-bold text-sm border flex items-center justify-center gap-1.5 ${storeMethod === 'instapay' ? 'bg-[#1F6F5F] text-white border-[#1F6F5F]' : 'bg-white text-[#1A2E26] border-gray-200'}`}><Coins className="w-4 h-4" /> إنستاباي</button>
                          <button onClick={() => setStoreMethod('cash')} className={`flex-1 py-2.5 rounded-xl font-bold text-sm border flex items-center justify-center gap-1.5 ${storeMethod === 'cash' ? 'bg-[#1F6F5F] text-white border-[#1F6F5F]' : 'bg-white text-[#1A2E26] border-gray-200'}`}><Wallet className="w-4 h-4" /> كاش في الفرع</button>
                        </div>
                        <button onClick={placeOrder} disabled={orderBusy} className="w-full py-3 rounded-2xl bg-[#1F6F5F] text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#1F6F5F]/20 active:scale-[0.99] transition-all">
                          {orderBusy ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري...</> : <><ShoppingBag className="w-4 h-4" /> اطلب ({cartItems.length})</>}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>
          )
        })()}

        {/* ===== MARKETPLACE (everyone) ===== */}
        <section>
          <h2 className={SECTION_TITLE}><Store className="w-3.5 h-3.5" /> سوق مضمونة</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/add-listing" className={`${CARD} p-5 flex flex-col items-center gap-2 hover:border-[#1F6F5F]/40 hover:shadow-md transition-all`}>
              <div className="w-11 h-11 rounded-xl bg-[#1F6F5F]/10 grid place-items-center"><Plus className="w-5 h-5 text-[#1F6F5F]" /></div>
              <p className="font-black text-[#1A2E26] text-sm">اعرض حاجة للإيجار</p>
              <p className="text-[11px] text-[#6B7280] text-center">شقة، عربية، كاميرا، أي حاجة</p>
            </Link>
            <Link href="/marketplace" className={`${CARD} p-5 flex flex-col items-center gap-2 hover:border-[#1F6F5F]/40 hover:shadow-md transition-all`}>
              <div className="w-11 h-11 rounded-xl bg-[#1F6F5F]/10 grid place-items-center"><Search className="w-5 h-5 text-[#1F6F5F]" /></div>
              <p className="font-black text-[#1A2E26] text-sm">دوّر على إيجار</p>
              <p className="text-[11px] text-[#6B7280] text-center">اتصفّح كل المعروض</p>
            </Link>
          </div>
        </section>

        <section className="bg-[#1F6F5F]/5 border border-[#1F6F5F]/20 rounded-2xl p-4 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-[#1F6F5F] flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-[#6B7280] leading-relaxed">حساب واحد على مضمونة — بتستخدمه كعميل، موظف، أو لعرض وتأجير أي حاجة. كل واحد بيشوف اللي يخصّه بس.</p>
        </section>

        <p className="text-center text-[11px] text-[#6B7280]">madmonacairo.com · اللي بتأجره مضمون</p>
      </main>
    </div>
  )
}
