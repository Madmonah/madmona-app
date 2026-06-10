'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import {
  Loader2, ChevronRight, Wallet, Clock, Gift, CalendarCheck, ListChecks,
  MapPin, LogIn, LogOut, CheckCircle2, Circle, Coins, AlertCircle, Briefcase,
  User, Check, Sparkles, ShoppingBag, Play, Bell,
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
  const [bookingBusy, setBookingBusy] = useState<string | null>(null)
  const [prepBusy, setPrepBusy] = useState<string | null>(null)
  const [notifs, setNotifs] = useState<any[]>([])
  const [unread, setUnread] = useState(0)

  const token = () => (typeof window !== 'undefined' ? localStorage.getItem('madmona_token') : null)

  const load = useCallback(async () => {
    const t = token()
    if (!t) { router.push('/login'); return }
    // @ts-expect-error rpc typing
    const { data: s } = await supabase.rpc('madmona_employee_summary', { p_token: t })
    if (!s?.ok) { setNotEmployee(true); setLoading(false); return }
    setData(s)
    // @ts-expect-error rpc typing
    const { data: n } = await supabase.rpc('madmona_employee_notifications', { p_token: t })
    if (n?.ok) { setNotifs(n.notifications || []); setUnread(n.unread_count || 0) }
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

  async function updateBooking(bookingId: string, action: string) {
    setBookingBusy(bookingId)
    const newStatus = action === 'complete' ? 'completed' : 'in_progress'
    setData((d: any) => ({ ...d, today: d.today.map((b: any) => b.booking_id === bookingId ? { ...b, status: newStatus } : b) }))
    // @ts-expect-error rpc typing
    await supabase.rpc('madmona_employee_update_booking', { p_token: token(), p_booking_id: bookingId, p_action: action })
    setBookingBusy(null)
  }

  async function togglePrep(bookingId: string, key: string, done: boolean) {
    setPrepBusy(bookingId + key)
    setData((d: any) => ({ ...d, today: d.today.map((b: any) => b.booking_id === bookingId ? { ...b, prep_checklist: { ...(b.prep_checklist || {}), [key]: done } } : b) }))
    // @ts-expect-error rpc typing
    await supabase.rpc('madmona_employee_toggle_prep', { p_token: token(), p_booking_id: bookingId, p_key: key, p_done: done })
    setPrepBusy(null)
  }

  async function markAllRead() {
    setUnread(0)
    setNotifs((ns) => ns.map((n) => ({ ...n, read: true })))
    // @ts-expect-error rpc typing
    await supabase.rpc('madmona_employee_mark_notifications_read', { p_token: token() })
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

        {/* ===== MANAGER ENTRY (admin / branch_manager only) ===== */}
        {data.is_manager && (
          <Link href="/me/team" className="flex items-center justify-between bg-[#1F6F5F] text-white rounded-2xl p-4 active:scale-[0.99] transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 grid place-items-center"><Briefcase className="w-5 h-5" /></div>
              <div>
                <p className="text-sm font-black">إدارة الموظفين والحضور</p>
                <p className="text-[11px] text-white/80">تابع حضور الفريق وعدّل بياناتهم</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 rotate-180" />
          </Link>
        )}

        {/* ===== NOTIFICATIONS ===== */}
        {notifs.length > 0 && (
          <section className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-[#1F6F5F]" />
                <p className="text-sm font-black text-[#1A2E26]">الإشعارات</p>
                {unread > 0 && <span className="text-[10px] font-black bg-[#1F6F5F] text-white rounded-full min-w-[18px] text-center px-1.5 py-0.5">{fmt(unread)}</span>}
              </div>
              {unread > 0 && <button onClick={markAllRead} className="text-[11px] font-bold text-[#1F6F5F]">تعليم الكل كمقروء</button>}
            </div>
            <div className="space-y-2">
              {notifs.map((n: any) => (
                <div key={n.id} className={`p-3 rounded-xl border ${n.read ? 'bg-white border-gray-100' : 'bg-[#1F6F5F]/5 border-[#1F6F5F]/30'}`}>
                  <div className="flex items-start gap-2.5">
                    {!n.read && <span className="w-2 h-2 rounded-full bg-[#1F6F5F] flex-shrink-0 mt-1.5" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#1A2E26]">{n.title}</p>
                      {n.body && <p className="text-[13px] text-[#1A2E26] mt-0.5">{n.body}</p>}
                      <p className="text-[10px] text-[#6B7280] mt-1" dir="ltr">{new Date(n.created_at).toLocaleString('ar-EG', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

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
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-1.5"><CalendarCheck className="w-4 h-4 text-[#1F6F5F]" /><p className="text-sm font-black text-[#1A2E26]">مواعيدي النهاردة</p></div>
            {data.today?.length > 0 && <span className="text-[11px] font-bold text-[#6B7280]">{data.today.filter((b: any) => b.status === 'completed').length}/{data.today.length} خلص</span>}
          </div>
          {data.today?.length > 0 ? (
            <div className="space-y-3">
              {data.today.map((b: any) => (
                <BookingCard key={b.booking_id} b={b} onAction={updateBooking} onPrep={togglePrep} busy={bookingBusy} prepBusyKey={prepBusy} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
              <CalendarCheck className="w-8 h-8 text-[#6B7280] opacity-30 mx-auto mb-1" />
              <p className="text-xs text-[#6B7280]">مفيش مواعيد محجوزة ليك النهاردة</p>
            </div>
          )}
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

function BookingCard({ b, onAction, onPrep, busy, prepBusyKey }: any) {
  const extras = b.extra_services || []
  const products = b.products || []
  const chk = b.prep_checklist || {}
  const prepItems = [
    ...extras.map((e: any) => ({ key: 's:' + e.service_id, label: e.name, kind: 'service' })),
    ...products.map((p: any) => ({ key: 'p:' + p.product_id, label: `${p.name} ×${p.qty}`, kind: 'product' })),
  ]
  const done = b.status === 'completed'
  const running = b.status === 'in_progress'
  return (
    <div className={`rounded-2xl border p-4 transition-all ${done ? 'bg-[#1F6F5F]/5 border-[#1F6F5F]/30' : running ? 'border-[#1F6F5F] shadow-sm bg-white' : 'border-gray-100 bg-white'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="px-2.5 py-1 rounded-lg bg-[#1F6F5F] text-white font-mono font-black text-sm" dir="ltr">{b.time}</div>
          <div>
            <p className="font-black text-[#1A2E26] text-sm">{b.service}</p>
            <p className="text-[11px] text-[#6B7280] mt-0.5 flex items-center gap-2">
              <span className="flex items-center gap-1"><User className="w-3 h-3" /> {b.customer}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {b.duration} د</span>
            </p>
          </div>
        </div>
        <div className="text-left flex-shrink-0">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${done ? 'bg-[#1F6F5F] text-white' : running ? 'bg-amber-100 text-amber-700' : 'bg-[#FAFAF7] text-[#6B7280]'}`}>{STATUS_AR[b.status] || b.status}</span>
          <p className="font-mono font-black text-[#1F6F5F] text-sm mt-1">{fmt(b.price)} ج</p>
        </div>
      </div>

      {prepItems.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-2">محتاج تجهّز</p>
          <div className="space-y-1.5">
            {prepItems.map((it: any) => {
              const isDone = !!chk[it.key]
              const isBusy = prepBusyKey === b.booking_id + it.key
              return (
                <button key={it.key} onClick={() => onPrep(b.booking_id, it.key, !isDone)} disabled={isBusy} className="w-full text-right flex items-center gap-2.5 group">
                  {isBusy ? <Loader2 className="w-5 h-5 text-[#1F6F5F] animate-spin flex-shrink-0" />
                    : <span className={`w-5 h-5 rounded-md grid place-items-center flex-shrink-0 transition-all ${isDone ? 'bg-[#1F6F5F] text-white' : 'border border-gray-300 text-transparent group-hover:border-[#1F6F5F]'}`}><Check className="w-3.5 h-3.5" /></span>}
                  {it.kind === 'product' ? <ShoppingBag className="w-3.5 h-3.5 text-[#6B7280] flex-shrink-0" /> : <Sparkles className="w-3.5 h-3.5 text-[#6B7280] flex-shrink-0" />}
                  <span className={`text-sm ${isDone ? 'text-[#6B7280] line-through' : 'text-[#1A2E26]'}`}>{it.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {b.notes && <p className="mt-2 text-[11px] text-[#6B7280] bg-[#FAFAF7] rounded-lg px-2.5 py-1.5">📝 {b.notes}</p>}

      {!done ? (
        <div className="mt-3">
          {running ? (
            <button onClick={() => onAction(b.booking_id, 'complete')} disabled={busy === b.booking_id} className="w-full py-2.5 rounded-xl bg-[#1F6F5F] text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50">
              {busy === b.booking_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} خلّصت الموعد
            </button>
          ) : (
            <button onClick={() => onAction(b.booking_id, 'start')} disabled={busy === b.booking_id} className="w-full py-2.5 rounded-xl bg-[#1F6F5F]/10 text-[#1F6F5F] font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50">
              {busy === b.booking_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} ابدأ الموعد
            </button>
          )}
        </div>
      ) : (
        <div className="mt-3 text-center text-xs font-bold text-[#1F6F5F] flex items-center justify-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> اتعمل ✓</div>
      )}
    </div>
  )
}
