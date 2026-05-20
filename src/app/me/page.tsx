'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import {
  Loader2, ChevronRight, Wallet, Clock, Gift, CalendarCheck, ListChecks,
  MapPin, LogIn, LogOut, CheckCircle2, Circle, Coins, AlertCircle, Briefcase,
} from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const STATUS_AR: Record<string, string> = {
  scheduled: 'محجوز', confirmed: 'مؤكد', in_progress: 'جاري', completed: 'تم', cancelled: 'ملغي', no_show: 'لم يحضر',
}
const fmt = (n: any) => Number(n || 0).toLocaleString('ar-EG')

function getLocation(): Promise<{ lat: number; lng: number; acc: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { reject(new Error('الموقع مش متاح في المتصفح ده')); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy }),
      () => reject(new Error('لازم تسمح بالـ location عشان تسجّل حضورك')),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    )
  })
}

export default function MyDashboard() {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notEmployee, setNotEmployee] = useState(false)
  const [clocking, setClocking] = useState(false)
  const [clockMsg, setClockMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [taskBusy, setTaskBusy] = useState<string | null>(null)

  const token = () => (typeof window !== 'undefined' ? localStorage.getItem('madmona_token') : null)

  const load = useCallback(async () => {
    const t = token()
    if (!t) { router.push('/login'); return }
    // @ts-expect-error rpc typing
    const { data: s } = await supabase.rpc('madmona_employee_summary', { p_token: t })
    if (!s?.ok) { setNotEmployee(true); setLoading(false); return }
    setData(s)
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  async function doClock() {
    setClocking(true); setClockMsg(null)
    try {
      const loc = await getLocation()
      // @ts-expect-error rpc typing
      const { data: r } = await supabase.rpc('madmona_employee_clock', {
        p_token: token(), p_lat: loc.lat, p_lng: loc.lng, p_accuracy_m: Math.round(loc.acc),
      })
      if (r?.ok) {
        setClockMsg({ text: r.action === 'clock_in' ? '✓ سجّلت حضورك' : `✓ سجّلت انصرافك${r.hours_worked ? ` · ${r.hours_worked} ساعة` : ''}`, ok: true })
        await load()
      } else {
        setClockMsg({ text: r?.error || 'حصل خطأ', ok: false })
      }
    } catch (e: any) {
      setClockMsg({ text: e?.message || 'مش قادر أجيب الموقع', ok: false })
    }
    setClocking(false)
    setTimeout(() => setClockMsg(null), 5000)
  }

  async function toggleTask(taskId: string, current: string) {
    setTaskBusy(taskId)
    const next = current === 'completed' ? 'pending' : 'completed'
    setData((d: any) => ({ ...d, tasks: d.tasks.map((t: any) => t.id === taskId ? { ...t, status: next } : t) }))
    // @ts-expect-error rpc typing
    await supabase.rpc('madmona_employee_toggle_task', { p_token: token(), p_task_id: taskId, p_status: next })
    setTaskBusy(null)
  }

  if (loading) return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#1F6F5F] animate-spin" /></div>

  if (notEmployee) return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
      <div className="text-center bg-white rounded-3xl p-8 border border-gray-100 max-w-sm">
        <Briefcase className="w-12 h-12 text-[#6B7280] opacity-30 mx-auto mb-3" />
        <p className="font-black text-[#1A2E26] mb-1">مفيش لوحة موظف لحسابك</p>
        <p className="text-sm text-[#6B7280] mb-5">لو إنت موظف، اطلب من الإدارة تفعيل حسابك.</p>
        <Link href="/home" className="inline-block px-5 py-2.5 rounded-xl bg-[#1F6F5F] text-white font-bold text-sm">ارجع للرئيسية</Link>
      </div>
    </div>
  )

  const att = data.attendance
  const clockState: 'in' | 'out' | 'done' = !att?.clock_in_at ? 'in' : !att?.clock_out_at ? 'out' : 'done'
  const tasks = data.tasks || []
  const tasksDone = tasks.filter((t: any) => t.status === 'completed').length
  const tips = data.tips || { month_total: 0, pending_count: 0, recent: [] }

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-[#1F6F5F] text-white">
        <div className="max-w-2xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/70">لوحة شغلي</p>
            <h1 className="text-xl font-black">{data.employee_name}</h1>
            <p className="text-[11px] text-white/80 mt-0.5">{data.role_ar} · {data.branch?.name}</p>
          </div>
          <Link href="/home" className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-bold flex items-center gap-1.5">
            الرئيسية <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* ===== ATTENDANCE (QR + location) ===== */}
        <section className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-1.5 mb-3"><MapPin className="w-4 h-4 text-[#1F6F5F]" /><p className="text-sm font-black text-[#1A2E26]">الحضور والانصراف</p></div>

          {att?.clock_in_at && (
            <div className="flex items-center gap-4 text-sm mb-3 bg-[#FAFAF7] rounded-xl p-3">
              <div><p className="text-[10px] text-[#6B7280]">حضور</p><p className="font-mono font-bold text-[#1F6F5F]" dir="ltr">{new Date(att.clock_in_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</p></div>
              {att.clock_out_at && <div><p className="text-[10px] text-[#6B7280]">انصراف</p><p className="font-mono font-bold text-[#1A2E26]" dir="ltr">{new Date(att.clock_out_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</p></div>}
              {att.hours_worked && <div><p className="text-[10px] text-[#6B7280]">ساعات</p><p className="font-mono font-bold text-[#1A2E26]">{att.hours_worked}</p></div>}
            </div>
          )}

          {clockMsg && (
            <div className={`mb-3 px-3 py-2 rounded-xl text-xs font-bold ${clockMsg.ok ? 'bg-[#1F6F5F]/10 text-[#1F6F5F]' : 'bg-red-50 text-red-600'}`}>{clockMsg.text}</div>
          )}

          {clockState === 'done' ? (
            <div className="text-center py-2 text-sm font-bold text-[#1F6F5F] flex items-center justify-center gap-2"><CheckCircle2 className="w-5 h-5" /> خلصت يومك · شكراً 🙌</div>
          ) : (
            <button onClick={doClock} disabled={clocking} className="w-full py-3 rounded-xl bg-[#1F6F5F] text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              {clocking ? <><Loader2 className="w-4 h-4 animate-spin" /> بيتأكد من موقعك...</>
                : clockState === 'in' ? <><LogIn className="w-4 h-4" /> سجّل حضور</>
                : <><LogOut className="w-4 h-4" /> سجّل انصراف</>}
            </button>
          )}
          <p className="text-[10px] text-[#6B7280] mt-2 text-center">📍 الـ system بيتأكد إنك جوه الفرع باللوكيشن</p>
        </section>

        {/* ===== EARNINGS (commission + tips) ===== */}
        <section className="grid grid-cols-2 gap-3">
          <div className="bg-[#1F6F5F] text-white rounded-2xl p-4">
            <div className="flex items-center gap-1.5 text-white/90 mb-1"><Wallet className="w-4 h-4" /><p className="text-[10px] font-bold uppercase tracking-wider">عمولة الشهر</p></div>
            <p className="text-2xl font-black">{fmt(data.commission_this_month)} <span className="text-sm">ج</span></p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <div className="flex items-center gap-1.5 text-[#6B7280] mb-1"><Clock className="w-4 h-4" /><p className="text-[10px] font-bold uppercase tracking-wider">مستحق لسه</p></div>
            <p className="text-2xl font-black text-[#1A2E26]">{fmt(data.commission_unpaid)} <span className="text-sm">ج</span></p>
          </div>
        </section>

        {/* ===== TIPS ===== */}
        <section className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5"><Gift className="w-4 h-4 text-[#1F6F5F]" /><p className="text-sm font-black text-[#1A2E26]">البقشيش</p></div>
            <div className="text-left">
              <p className="text-[10px] text-[#6B7280]">الشهر ده</p>
              <p className="font-black font-mono text-[#1F6F5F]">{fmt(tips.month_total)} ج</p>
            </div>
          </div>
          {tips.pending_count > 0 && (
            <div className="mb-3 px-3 py-2 rounded-xl bg-amber-50 text-amber-700 text-xs font-bold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> {tips.pending_count} بقشيش بانتظار تأكيد الإدارة
            </div>
          )}
          {tips.recent?.length > 0 ? (
            <div className="space-y-2">
              {tips.recent.map((t: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm border-b border-gray-50 pb-2 last:border-0">
                  <div className="flex items-center gap-2">
                    <Coins className="w-3.5 h-3.5 text-[#1F6F5F]" />
                    <span className="font-bold text-[#1A2E26]">{fmt(t.amount)} ج</span>
                    <span className="text-[11px] text-[#6B7280]">{t.method === 'instapay' ? 'إنستاباي' : 'كاش'}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${t.status === 'received' ? 'bg-[#1F6F5F]/10 text-[#1F6F5F]' : t.status === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>
                    {t.status === 'received' ? 'مستلم ✓' : t.status === 'rejected' ? 'مرفوض' : 'بانتظار'}
                  </span>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-[#6B7280]">لسه مفيش بقشيش</p>}
        </section>

        {/* ===== TODAY BOOKINGS ===== */}
        <section className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-1.5 mb-3"><CalendarCheck className="w-4 h-4 text-[#1F6F5F]" /><p className="text-sm font-black text-[#1A2E26]">مواعيدي النهاردة</p></div>
          {data.today?.length > 0 ? (
            <div className="space-y-2">
              {data.today.map((t: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm border-b border-gray-50 pb-2 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#1F6F5F]" dir="ltr">{t.time}</span>
                    <span className="text-[#1A2E26]">{t.service}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#6B7280]">{t.customer}</span>
                    <span className="px-2 py-0.5 rounded bg-[#FAFAF7] text-[#6B7280] text-[10px] font-bold">{STATUS_AR[t.status] || t.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-[#6B7280]">مفيش مواعيد محجوزة ليك النهاردة</p>}
        </section>

        {/* ===== DAILY TASKS ===== */}
        <section className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5"><ListChecks className="w-4 h-4 text-[#1F6F5F]" /><p className="text-sm font-black text-[#1A2E26]">تاسكات اليوم</p></div>
            <span className="text-[11px] font-bold text-[#6B7280]">{tasksDone}/{tasks.length}</span>
          </div>
          {tasks.length > 0 ? (
            <div className="space-y-2">
              {tasks.map((t: any) => {
                const done = t.status === 'completed'
                return (
                  <button key={t.id} onClick={() => toggleTask(t.id, t.status)} disabled={taskBusy === t.id}
                    className={`w-full text-right flex items-start gap-3 p-3 rounded-xl border transition-all ${done ? 'bg-[#1F6F5F]/5 border-[#1F6F5F]/30' : 'bg-white border-gray-100 hover:border-[#1F6F5F]'}`}>
                    {taskBusy === t.id ? <Loader2 className="w-5 h-5 text-[#1F6F5F] animate-spin flex-shrink-0 mt-0.5" />
                      : done ? <CheckCircle2 className="w-5 h-5 text-[#1F6F5F] flex-shrink-0 mt-0.5" />
                      : <Circle className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${done ? 'text-[#6B7280] line-through' : 'text-[#1A2E26]'}`}>{t.title}</p>
                      {t.due_time && <p className="text-[10px] text-[#6B7280] mt-0.5" dir="ltr">{t.due_time}</p>}
                    </div>
                    {t.priority === 'high' && !done && <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2" />}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-4">
              <AlertCircle className="w-8 h-8 text-[#6B7280] opacity-30 mx-auto mb-1" />
              <p className="text-xs text-[#6B7280]">مفيش تاسكات لليوم</p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
