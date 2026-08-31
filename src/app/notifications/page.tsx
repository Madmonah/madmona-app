'use client'
// ============================================================================
// 🔔 صفحة الإشعارات — /notifications
//
// (٢٨ أغسطس ٢٠٢٦) محمد: «ليه تاب النوتيفيكيشن مش بيعرض الإشعارات؟
//   ايوة اعمل شاشة اشعارات حقيقية اومال حطينها منظر!»
//
// 🔍 والسبب كان اتنين مع بعض:
//    ① **مفيش شاشة أصلًا** — زرار الجرس في TopNav بيفعّل الـpush بس،
//       وجرس الموبايل بيودّي /account.
//    ② **RLS مفعّل ومفيش ولا سياسة** — ٤٤٦١ إشعار محجوبين عن الكل.
//
// ✅ الاتنين اتصلحوا: السياسات اتضافت، ودي الشاشة.
// ============================================================================
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  Bell, CheckCheck, ClipboardList, TrendingUp, FileText,
  AlertTriangle, Loader2, Inbox, ArrowRight,
} from 'lucide-react'

type Notif = {
  id: string
  type: string
  title: string
  body: string | null
  data: Record<string, unknown> | null
  read_at: string | null
  created_at: string
}

/** 🎨 أيقونة ولون لكل نوع */
function styleFor(type: string) {
  switch (type) {
    case 'new_task':
    case 'task':
    case 'task_reminder':
      return { Icon: ClipboardList, tint: 'text-[#059669]', bg: 'bg-[#34D399]/12' }
    case 'performance_pulse':
      return { Icon: TrendingUp, tint: 'text-[#0369a1]', bg: 'bg-sky-100' }
    case 'wizard_draft':
      return { Icon: FileText, tint: 'text-amber-700', bg: 'bg-amber-100' }
    case 'warning':
    case 'blocker':
      return { Icon: AlertTriangle, tint: 'text-red-600', bg: 'bg-red-100' }
    default:
      return { Icon: Bell, tint: 'text-gray-600', bg: 'bg-gray-100' }
  }
}

/** ⏱️ «من ٥ دقايق» بدل تاريخ خام */
function ago(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'دلوقتي'
  if (s < 3600) return `من ${Math.floor(s / 60)} دقيقة`
  if (s < 86400) return `من ${Math.floor(s / 3600)} ساعة`
  if (s < 604800) return `من ${Math.floor(s / 86400)} يوم`
  return new Date(iso).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })
}

export default function NotificationsPage() {
  const router = useRouter()
  const [items, setItems] = useState<Notif[]>([])
  const [loading, setLoading] = useState(true)
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const [marking, setMarking] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) { setSignedIn(false); setLoading(false); return }
      setSignedIn(true)

      const { data } = await (supabaseBrowser as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            order: (c: string, o: { ascending: boolean }) => {
              limit: (n: number) => Promise<{ data: unknown }>
            }
          }
        }
      }).from('employee_notifications')
        .select('id, type, title, body, data, read_at, created_at')
        .order('created_at', { ascending: false })
        .limit(60)

      setItems((data as Notif[]) || [])
    } catch { /* الشاشة بتعرض الفاضي */ }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function markAll() {
    setMarking(true)
    try {
      await (supabaseBrowser.rpc as unknown as (f: string) => Promise<unknown>)(
        'mark_all_notifications_read',
      )
      setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })))
    } catch { /* نتجاهل */ }
    setMarking(false)
  }

  /** 🔗 الإشعار بيودّي فين؟ */
  function hrefFor(n: Notif): string | null {
    const d = n.data || {}
    if (d.task_id) return '/account/work'
    if (d.listing_id) return '/account'
    if (n.type === 'performance_pulse') return '/account/work'
    return null
  }

  const unread = items.filter((n) => !n.read_at).length

  return (
    <div dir="rtl" className="min-h-screen bg-[#FAFAF7]">
      <div className="max-w-2xl mx-auto px-4 py-5">

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={() => router.back()}
              className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
              <ArrowRight className="w-4 h-4 text-gray-600" />
            </button>
            <h1 className="text-lg font-black text-gray-900">الإشعارات</h1>
            {unread > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#34D399] text-[#04352A] text-[11px] font-black">
                {unread}
              </span>
            )}
          </div>

          {unread > 0 && (
            <button onClick={markAll} disabled={marking}
              className="text-[11.5px] font-bold text-[#059669] flex items-center gap-1 disabled:opacity-50">
              {marking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
              علّم الكل كمقروء
            </button>
          )}
        </div>

        {loading && (
          <div className="py-16 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
          </div>
        )}

        {!loading && signedIn === false && (
          <div className="rounded-2xl bg-white border border-gray-200 p-8 text-center">
            <Bell className="w-9 h-9 text-gray-300 mx-auto mb-3" />
            <p className="font-bold text-gray-900 mb-1">سجّل دخولك الأول</p>
            <p className="text-[12.5px] text-gray-500 mb-4">عشان تشوف إشعاراتك</p>
            <Link href="/auth/login"
              className="inline-block px-5 py-2.5 rounded-xl bg-[#34D399] text-[#04352A] font-black text-sm no-underline">
              تسجيل الدخول
            </Link>
          </div>
        )}

        {!loading && signedIn && items.filter((n) => !n.read_at).length === 0 && items.length > 0 && (
          <div className="rounded-2xl bg-[#34D399]/8 border border-[#34D399]/30 p-6 text-center">
            <CheckCheck className="w-8 h-8 text-[#059669] mx-auto mb-2" />
            <p className="font-bold text-gray-900 text-[13.5px]">قريت كل حاجة ✅</p>
          </div>
        )}

        {!loading && signedIn && items.length === 0 && (
          <div className="rounded-2xl bg-white border border-gray-200 p-10 text-center">
            <Inbox className="w-9 h-9 text-gray-300 mx-auto mb-3" />
            <p className="font-bold text-gray-900 mb-1">مفيش إشعارات لسه</p>
            <p className="text-[12.5px] text-gray-500">
              أول ما ييجي جديد هيبان هنا 👌
            </p>
          </div>
        )}

        {/* 🆕 (٢٨/٨) الجديد أولًا — محمد: «الإشعارات مش بتبيّن الجديد
            من القديم وفاتحة كله على بعضه». */}
        {unread > 0 && (
          <p className="text-[11px] font-black text-[#059669] mb-2 px-1">
            🆕 الجديد اللي لسه ماشوفتوش ({unread})
          </p>
        )}

        <div className="space-y-2">
          {items.filter((n) => !n.read_at).map((n) => {
            const { Icon, tint, bg } = styleFor(n.type)
            const href = hrefFor(n)
            const card = (
              <div className={`rounded-2xl border p-3.5 flex gap-3 ${
                n.read_at ? 'bg-white border-gray-200' : 'bg-[#34D399]/6 border-[#34D399]/35'}`}>
                <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4 h-4 ${tint}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] font-bold text-gray-900 leading-snug">{n.title}</p>
                    <span className="text-[10.5px] text-gray-400 shrink-0 mt-0.5">{ago(n.created_at)}</span>
                  </div>
                  {n.body && (
                    <p className="text-[12px] text-gray-600 mt-1 leading-relaxed whitespace-pre-line">
                      {n.body.length > 200 ? `${n.body.slice(0, 200)}…` : n.body}
                    </p>
                  )}
                </div>
                {!n.read_at && <span className="w-2 h-2 rounded-full bg-[#34D399] shrink-0 mt-1.5" />}
              </div>
            )
            return href
              ? <Link key={n.id} href={href} className="block no-underline">{card}</Link>
              : <div key={n.id}>{card}</div>
          })}
        </div>

        {/* 📦 (٢٨/٨) المقروء مطوي — مش فاتح على بعضه */}
        {items.some((n) => n.read_at) && (
          <details className="mt-4 rounded-2xl border border-gray-200 bg-white overflow-hidden group">
            <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between">
              <span className="text-[12.5px] font-bold text-gray-600">
                اللي قريته قبل كده ({items.filter((n) => n.read_at).length})
              </span>
              <span className="text-gray-400 text-lg font-black transition-transform group-open:rotate-45">+</span>
            </summary>
            <div className="px-2 pb-2 space-y-2 border-t border-gray-100 pt-2">
              {items.filter((n) => n.read_at).map((n) => {
                const { Icon, tint, bg } = styleFor(n.type)
                const href = hrefFor(n)
                const card = (
                  <div className="rounded-2xl border border-gray-200 bg-white p-3.5 flex gap-3 opacity-70">
                    <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-4 h-4 ${tint}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[12.5px] font-bold text-gray-700 leading-snug">{n.title}</p>
                        <span className="text-[10.5px] text-gray-400 shrink-0 mt-0.5">{ago(n.created_at)}</span>
                      </div>
                    </div>
                  </div>
                )
                return href
                  ? <Link key={n.id} href={href} className="block no-underline">{card}</Link>
                  : <div key={n.id}>{card}</div>
              })}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}
