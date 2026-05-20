'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import {
  Loader2, LogOut, Store, Calendar, QrCode, Wallet, Clock, Briefcase,
  Heart, Plus, Search, Building2, ChevronLeft, ShieldCheck, CalendarCheck,
  UserPlus, Check, X,
} from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function MadmonaHome() {
  const router = useRouter()
  const [me, setMe] = useState<any>(null)
  const [empSummary, setEmpSummary] = useState<any>(null)
  const [custBookings, setCustBookings] = useState<any>(null)
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
    const token = localStorage.getItem('madmona_token')
    if (!token) { router.push('/login'); return }
    // @ts-expect-error rpc typing
    const { data } = await supabase.rpc('madmona_resolve', { p_token: token })
    if (!data?.authenticated) { localStorage.removeItem('madmona_token'); router.push('/login'); return }
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
    }
    if (data.is_admin) await loadJoinReqs(token, data.roles.admin || [])
    setLoading(false)
  }

  useEffect(() => { init() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [])

  async function reviewReq(supplierId: string, reqId: string, action: 'approve' | 'reject') {
    const token = localStorage.getItem('madmona_token'); if (!token) return
    setBusyReq(reqId)
    // @ts-expect-error rpc typing
    await supabase.rpc('admin_review_employee_join', { p_token: token, p_request_id: reqId, p_action: action })
    setJoinReqs(prev => ({ ...prev, [supplierId]: (prev[supplierId] || []).filter(r => r.id !== reqId) }))
    setBusyReq(null)
  }

  async function logout() {
    const token = localStorage.getItem('madmona_token')
    if (token) {
      // @ts-expect-error rpc typing
      await supabase.rpc('madmona_logout', { p_token: token })
      localStorage.removeItem('madmona_token')
    }
    router.push('/login')
  }

  if (loading) return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#1F6F5F] animate-spin" /></div>

  const admins = me?.roles?.admin || []
  const employees = me?.roles?.employee || []
  const STATUS_AR: Record<string, string> = {
    scheduled: 'محجوز', confirmed: 'مؤكد', in_progress: 'جاري', completed: 'تم', cancelled: 'ملغي', no_show: 'لم يحضر',
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-[#1F6F5F] text-white">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/70">مضمونة</p>
            <h1 className="text-xl font-black">أهلاً {me?.full_name || ''} 👋</h1>
          </div>
          <button onClick={logout} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-bold flex items-center gap-1.5">
            <LogOut className="w-4 h-4" /> خروج
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* ===== ADMIN / OWNER ===== */}
        {admins.length > 0 && (
          <section>
            <h2 className="text-xs font-bold tracking-wider uppercase text-[#6B7280] mb-3 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> بوابة الأعمال</h2>
            <div className="space-y-2">
              {admins.map((a: any) => (
                <div key={a.supplier_id} className="space-y-2">
                  <Link href={`/owner/${a.supplier_id}`} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between hover:border-[#1F6F5F] hover:shadow-md transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#1F6F5F]/10 grid place-items-center"><Briefcase className="w-5 h-5 text-[#1F6F5F]" /></div>
                      <div>
                        <p className="font-black text-[#1A2E26]">{a.business_name}</p>
                        <p className="text-[11px] text-[#6B7280]">إدارة · {a.role === 'owner' ? 'مالك' : a.role === 'manager' ? 'مدير' : a.role}</p>
                      </div>
                    </div>
                    <ChevronLeft className="w-5 h-5 text-[#6B7280]" />
                  </Link>

                  {/* Pending employee join requests */}
                  {(joinReqs[a.supplier_id]?.length > 0) && (
                    <div className="bg-white rounded-2xl border border-[#1F6F5F]/30 p-4">
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
                              <button onClick={() => reviewReq(a.supplier_id, r.id, 'approve')} disabled={busyReq === r.id} className="w-8 h-8 rounded-lg bg-[#1F6F5F] text-white grid place-items-center disabled:opacity-50" title="موافقة">
                                {busyReq === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                              </button>
                              <button onClick={() => reviewReq(a.supplier_id, r.id, 'reject')} disabled={busyReq === r.id} className="w-8 h-8 rounded-lg bg-gray-100 text-[#6B7280] grid place-items-center disabled:opacity-50" title="رفض">
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
        {employees.length > 0 && employees.map((emp: any) => (
          <section key={emp.employee_id}>
            <h2 className="text-xs font-bold tracking-wider uppercase text-[#6B7280] mb-3 flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> شغلي في {emp.business_name}</h2>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-[#1F6F5F] text-white rounded-2xl p-4">
                <div className="flex items-center gap-1.5 text-white/90 mb-1"><Wallet className="w-4 h-4" /><p className="text-[10px] font-bold uppercase tracking-wider">عمولة الشهر</p></div>
                <p className="text-2xl font-black">{Number(empSummary?.commission_this_month || 0).toLocaleString()} <span className="text-sm">ج</span></p>
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl p-4">
                <div className="flex items-center gap-1.5 text-[#6B7280] mb-1"><Clock className="w-4 h-4" /><p className="text-[10px] font-bold uppercase tracking-wider">مستحق لسه</p></div>
                <p className="text-2xl font-black text-[#1A2E26]">{Number(empSummary?.commission_unpaid || 0).toLocaleString()} <span className="text-sm">ج</span></p>
              </div>
            </div>

            {emp.branch_code && (
              <Link href={`/clock/${emp.branch_code}`} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between hover:border-[#1F6F5F] hover:shadow-md transition-all mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1F6F5F]/10 grid place-items-center"><QrCode className="w-5 h-5 text-[#1F6F5F]" /></div>
                  <div>
                    <p className="font-black text-[#1A2E26]">حضور وانصراف</p>
                    <p className="text-[11px] text-[#6B7280]">سجّل حضورك بالـ QR + اللوكيشن</p>
                  </div>
                </div>
                <ChevronLeft className="w-5 h-5 text-[#6B7280]" />
              </Link>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center gap-1.5 mb-3"><CalendarCheck className="w-4 h-4 text-[#1F6F5F]" /><p className="text-sm font-black text-[#1A2E26]">مواعيدي النهاردة</p></div>
              {empSummary?.today?.length > 0 ? (
                <div className="space-y-2">
                  {empSummary.today.map((t: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm border-b border-gray-50 pb-2 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#1F6F5F]" dir="ltr">{t.time}</span>
                        <span className="text-[#1A2E26]">{t.service}</span>
                      </div>
                      <span className="text-[11px] text-[#6B7280]">{t.customer}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-[#6B7280]">مفيش مواعيد محجوزة ليك النهاردة</p>}
            </div>
          </section>
        ))}

        {/* ===== CUSTOMER ===== */}
        {me?.is_customer && (
          <section>
            <h2 className="text-xs font-bold tracking-wider uppercase text-[#6B7280] mb-3 flex items-center gap-1.5"><Heart className="w-3.5 h-3.5" /> حجوزاتي</h2>
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
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
              <Link href="/marketplace" className="w-full py-2.5 rounded-xl bg-[#1F6F5F] text-white font-bold text-sm flex items-center justify-center gap-2">
                <Calendar className="w-4 h-4" /> احجز خدمة جديدة
              </Link>
            </div>
          </section>
        )}

        {/* ===== MARKETPLACE (everyone) ===== */}
        <section>
          <h2 className="text-xs font-bold tracking-wider uppercase text-[#6B7280] mb-3 flex items-center gap-1.5"><Store className="w-3.5 h-3.5" /> سوق مضمونة</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/add-listing" className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col items-center gap-2 hover:border-[#1F6F5F] hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#1F6F5F]/10 grid place-items-center"><Plus className="w-5 h-5 text-[#1F6F5F]" /></div>
              <p className="font-black text-[#1A2E26] text-sm">اعرض حاجة للإيجار</p>
              <p className="text-[11px] text-[#6B7280] text-center">شقة، عربية، كاميرا، أي حاجة</p>
            </Link>
            <Link href="/marketplace" className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col items-center gap-2 hover:border-[#1F6F5F] hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#1F6F5F]/10 grid place-items-center"><Search className="w-5 h-5 text-[#1F6F5F]" /></div>
              <p className="font-black text-[#1A2E26] text-sm">دوّر على إيجار</p>
              <p className="text-[11px] text-[#6B7280] text-center">اتصفّح كل المعروض</p>
            </Link>
          </div>
        </section>

        <section className="bg-[#1F6F5F]/5 border border-[#1F6F5F]/20 rounded-2xl p-4 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-[#1F6F5F] flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-[#6B7280] leading-relaxed">حساب واحد على مضمونة — بتستخدمه كعميل، موظف، أو لعرض وتأجير أي حاجة. كل واحد بيشوف اللي يخصّه بس.</p>
        </section>
      </main>
    </div>
  )
}
