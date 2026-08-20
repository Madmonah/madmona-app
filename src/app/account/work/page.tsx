'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Loader2, ArrowRight, Clock, Inbox, Wallet, MessageCircle, ShieldCheck,
  Building2, Crown, Check, Minus, ClipboardList, Users, LogIn, CalendarDays,
} from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import BottomNav from '@/components/BottomNav'

/* ============================================================================
   /account/work — «شغلي» — كل الإداريات جوّه الأبليكيشن
   ============================================================================
   🎯 (٢٠ أغسطس ٢٠٢٦) محمد:
      «عايز تاب حسابي يعرض كل حاجة ليها علاقة بالإداريات (حضور وانصراف —
       طلبات — مصاريف...) كل واحد وصلاحياته. عايز العرض ده يتم عن طريق
       الأبليكيشن نفسه، ويكون مربوط كمان بشات المارد».

   المشكلة اللي بيحلها:
     الموظف كان لازم يخرج من الأبليكيشن ويروح على لوحة الأدمن (لينك طويل
     مالوش باب من حسابي) عشان يشوف حضوره أو يقدّم طلب. ومحدش كان بيوصل.

   كل قسم هنا بيظهر **بالصلاحية بتاعته** — نفس المفاتيح اللي في تاب
   «الصلاحيات» (`permission_catalog`)، مفيش أسماء مخترعة.
   الداتا كلها من نداء واحد: `get_my_work_home()`.
   ============================================================================ */

type Perm = Record<string, boolean>
type Attendance = {
  date: string; clock_in_at: string | null; clock_out_at: string | null
  hours_worked: number | null; status: string | null
} | null
type Req = {
  id: string; leave_type: string | null; start_date: string | null
  end_date: string | null; days: number | null; status: string; reason: string | null
}
type Biz = {
  supplier_id: string; business_name: string; is_platform_owner: boolean
  relation: 'owner' | 'employee'
  employee_id: string | null; role_ar: string | null
  branch_id: string | null; branch_name: string | null; branch_code: string | null
  permissions: Perm
  attendance: Attendance
  my_requests: Req[]
  pending_for_me: number
  expenses: { month_count: number; month_total: number } | null
  chat_room_id: string | null
}
type Home = { authenticated: boolean; account_kind: string; today: string; businesses: Biz[] }

const KIND_LABEL: Record<string, string> = {
  madmona_admin: 'أدمن', business_owner: 'إدارة', b2b_employee: 'موظف', customer: 'عميل',
}

const REQ_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'مستنية الرد', cls: 'bg-amber-50 text-amber-700' },
  approved: { label: 'اتوافق عليها', cls: 'bg-[#34D399]/10 text-[#059669]' },
  rejected: { label: 'اترفضت', cls: 'bg-red-50 text-red-600' },
}

function fmtTime(iso: string | null) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) } catch { return '—' }
}

export default function MyWorkPage() {
  const [home, setHome] = useState<Home | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: { session } } = await supabaseBrowser.auth.getSession()
        if (!session?.user) { if (!cancelled) setLoading(false); return }
        const { data } = await (supabaseBrowser.rpc as unknown as (
          fn: string,
        ) => Promise<{ data: Home | null }>)('get_my_work_home')
        if (!cancelled) setHome(data)
      } catch (e) {
        console.error('[account/work] load failed:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-7 h-7 animate-spin text-[#059669]" />
      </div>
    )
  }

  const list = home?.businesses ?? []

  return (
    <div className="min-h-screen bg-[#FAFAF7] pb-28" dir="rtl">
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-xl border-b border-black/5">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/account" className="w-9 h-9 bg-[#FAFAF7] rounded-full flex items-center justify-center hover:bg-gray-100">
            <ArrowRight className="w-4 h-4 text-[#6B7280]" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-black text-[#1A2E26] leading-none">شغلي</h1>
            <p className="text-[11px] text-[#6B7280] mt-1">
              الحضور والطلبات والمصاريف — كل واحد بصلاحياته
            </p>
          </div>
          {home?.account_kind && KIND_LABEL[home.account_kind] && (
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-gradient-to-r from-[#2FA084] to-[#d4a017] text-white flex-shrink-0">
              {KIND_LABEL[home.account_kind]}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {!home?.authenticated ? (
          <Empty icon={<LogIn className="w-8 h-8" />} title="سجّل دخولك الأول"
                 sub="ادخل بحسابك عشان تشوف شغلك وصلاحياتك." href="/auth/login" cta="تسجيل دخول" />
        ) : list.length === 0 ? (
          <Empty icon={<Building2 className="w-8 h-8" />} title="مالكش شغل مسجّل"
                 sub="لسه ماتضفتش كموظف ولا كصاحب بيزنس على مضمونة." />
        ) : (
          list.map(b => <BizCard key={b.supplier_id} b={b} />)
        )}
      </main>

      <BottomNav />
    </div>
  )
}

function BizCard({ b }: { b: Biz }) {
  const isOwner = b.relation === 'owner'
  const can = (k: string) => isOwner || b.permissions?.[k] === true
  const att = b.attendance
  const inAt = att?.clock_in_at ?? null
  const outAt = att?.clock_out_at ?? null

  return (
    <section className="bg-white rounded-3xl shadow-soft overflow-hidden">
      {/* رأس البيزنس */}
      <div className="px-5 py-4 flex items-center gap-3 border-b border-gray-100">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${
          b.is_platform_owner
            ? 'bg-gradient-to-br from-[#D4A017] via-[#2FA084] to-[#34D399] text-white'
            : 'bg-[#34D399]/10 text-[#059669]'
        }`}>
          {b.is_platform_owner ? <Crown className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-black text-[#1A2E26] truncate">{b.business_name}</p>
          <p className="text-[11px] text-[#6B7280] mt-0.5 truncate">
            {isOwner ? 'صاحب البيزنس' : (b.role_ar || 'موظف')}
            {b.branch_name ? ` · ${b.branch_name}` : ''}
          </p>
        </div>
      </div>

      {/* ⏱️ الحضور والانصراف — للموظف بس (المالك مالوش سجل حضور) */}
      {b.employee_id && (
        <div className="px-5 py-4 border-b border-gray-100">
          <SectionTitle icon={<Clock className="w-3.5 h-3.5" />} title="الحضور والانصراف" />
          <div className="grid grid-cols-3 gap-2 mb-3">
            <Stat label="حضور" value={fmtTime(inAt)} tone={inAt ? 'ok' : 'idle'} />
            <Stat label="انصراف" value={fmtTime(outAt)} tone={outAt ? 'ok' : 'idle'} />
            <Stat label="ساعات" value={att?.hours_worked != null ? String(att.hours_worked) : '—'} tone="idle" />
          </div>
          {b.branch_code ? (
            <Link
              href={`/clock/${b.branch_code}`}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#34D399] text-[#04352A] py-3 rounded-2xl text-sm font-bold no-underline hover:bg-[#34D399]/90"
            >
              <Clock className="w-4 h-4" />
              {inAt && !outAt ? 'سجّل انصرافك' : 'سجّل حضورك'}
            </Link>
          ) : (
            <p className="text-[11px] text-[#9CA3AF] text-center">
              فرعك لسه مالوش كود بصمة — كلّم الإدارة.
            </p>
          )}
        </div>
      )}

      {/* 📝 الطلبات */}
      <div className="px-5 py-4 border-b border-gray-100">
        <SectionTitle
          icon={<Inbox className="w-3.5 h-3.5" />}
          title="الطلبات"
          extra={b.pending_for_me > 0 ? `${b.pending_for_me} مستنية منك` : undefined}
        />
        {b.my_requests.length === 0 ? (
          <p className="text-[12px] text-[#6B7280] mb-3">مفيش طلبات ليك.</p>
        ) : (
          <div className="space-y-1.5 mb-3">
            {b.my_requests.map(r => {
              const st = REQ_STATUS[r.status] || { label: r.status, cls: 'bg-gray-100 text-gray-600' }
              return (
                <div key={r.id} className="flex items-center gap-2 bg-[#FAFAF7] rounded-xl px-3 py-2">
                  <CalendarDays className="w-3.5 h-3.5 text-[#6B7280] flex-shrink-0" />
                  <span className="text-[12px] font-bold text-[#1A2E26] truncate flex-1">
                    {r.leave_type || 'إجازة'}
                    {r.days ? ` · ${r.days} يوم` : ''}
                  </span>
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${st.cls}`}>{st.label}</span>
                </div>
              )
            })}
          </div>
        )}
        <Link
          href={`/admin/business-finance/${b.supplier_id}/requests`}
          className="w-full inline-flex items-center justify-center gap-2 bg-[#FAFAF7] border border-gray-200 text-[#1A2E26] py-2.5 rounded-2xl text-[13px] font-bold no-underline hover:bg-white"
        >
          <ClipboardList className="w-4 h-4" />
          {can('can_manage_team') ? 'إدارة الطلبات' : 'اطلب إجازة'}
        </Link>
      </div>

      {/* 💰 المصاريف — بصلاحية «يشوف الفلوس والفاينانس» */}
      {can('can_view_finance') && (
        <div className="px-5 py-4 border-b border-gray-100">
          <SectionTitle icon={<Wallet className="w-3.5 h-3.5" />} title="المصاريف" extra="الشهر ده" />
          <div className="grid grid-cols-2 gap-2 mb-3">
            <Stat label="عدد" value={String(b.expenses?.month_count ?? 0)} tone="idle" />
            <Stat label="إجمالي" value={`${Number(b.expenses?.month_total ?? 0).toLocaleString('ar-EG')} ج`} tone="ok" />
          </div>
          <Link
            href={`/admin/business-finance/${b.supplier_id}/expenses`}
            className="w-full inline-flex items-center justify-center gap-2 bg-[#FAFAF7] border border-gray-200 text-[#1A2E26] py-2.5 rounded-2xl text-[13px] font-bold no-underline hover:bg-white"
          >
            <Wallet className="w-4 h-4" />
            افتح المصاريف
          </Link>
        </div>
      )}

      {/* 💬 جروب الشركة في الشات */}
      {b.chat_room_id && (
        <div className="px-5 py-4 border-b border-gray-100">
          <SectionTitle icon={<MessageCircle className="w-3.5 h-3.5" />} title="جروب الشركة" />
          <Link
            href={`/chat/team?room=${b.chat_room_id}`}
            className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-l from-[#14231E] to-[#059669] text-white py-2.5 rounded-2xl text-[13px] font-bold no-underline"
          >
            <MessageCircle className="w-4 h-4" />
            افتح جروب شركة {b.business_name}
          </Link>
        </div>
      )}

      {/* 🔐 صلاحياتي */}
      <div className="px-5 py-4">
        <SectionTitle
          icon={<ShieldCheck className="w-3.5 h-3.5" />}
          title="صلاحياتي"
          extra={isOwner ? 'كل الصلاحيات' : undefined}
        />
        {isOwner ? (
          <p className="text-[12px] text-[#6B7280]">
            انت صاحب البيزنس — كل حاجة مفتوحة ليك.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(b.permissions || {}).length === 0 ? (
              <p className="text-[12px] text-[#6B7280]">لسه مفيش صلاحيات مفتوحة — كلّم الإدارة.</p>
            ) : (
              Object.entries(b.permissions).map(([k, v]) => (
                <span
                  key={k}
                  className={`text-[10.5px] font-bold px-2 py-1 rounded-full border flex items-center gap-1 ${
                    v ? 'bg-[#34D399]/10 text-[#059669] border-[#059669]/25'
                      : 'bg-gray-50 text-gray-400 border-gray-200'
                  }`}
                >
                  {v ? <Check className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                  {PERM_AR[k] || k}
                </span>
              ))
            )}
          </div>
        )}
        {can('can_manage_team') && (
          <Link
            href={`/admin/business-finance/${b.supplier_id}/permissions`}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 bg-[#FAFAF7] border border-gray-200 text-[#1A2E26] py-2.5 rounded-2xl text-[13px] font-bold no-underline hover:bg-white"
          >
            <Users className="w-4 h-4" />
            صلاحيات الفريق
          </Link>
        )}
      </div>
    </section>
  )
}

// أسماء الصلاحيات بالعربي — نفس اللي في `permission_catalog`
const PERM_AR: Record<string, string> = {
  can_view: 'يدخل الحساب',
  can_view_finance: 'يشوف الفلوس',
  can_add_expense: 'يضيف مصروف',
  can_manage_bookings: 'يدير الحجوزات',
  can_complete_bookings: 'يقفل الحجوزات',
  can_manage_customers: 'يدير العملاء',
  can_manage_inventory: 'يدير المخزون',
  can_manage_team: 'يدير الفريق',
  can_manage_services: 'يدير الخدمات',
  can_view_reports: 'التقارير',
  can_view_analytics: 'التحليلات',
  can_manage_branches: 'يدير الفروع',
  can_manage_pricing: 'الأسعار',
  can_manage_listings: 'يعدّل الإعلانات',
  can_publish_listings: 'ينشر إعلانات',
  can_delete_listings: 'يمسح إعلانات',
  can_respond_reviews: 'يرد على التقييمات',
}

function SectionTitle({ icon, title, extra }: { icon: React.ReactNode; title: string; extra?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[#059669]">{icon}</span>
      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex-1">{title}</p>
      {extra && <span className="text-[10px] font-black text-[#D4A017]">{extra}</span>}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone: 'ok' | 'idle' }) {
  return (
    <div className={`rounded-2xl px-3 py-2.5 text-center ${tone === 'ok' ? 'bg-[#34D399]/10' : 'bg-[#FAFAF7]'}`}>
      <p className={`text-[13px] font-black ${tone === 'ok' ? 'text-[#059669]' : 'text-[#1A2E26]'}`}>{value}</p>
      <p className="text-[10px] text-[#6B7280] mt-0.5">{label}</p>
    </div>
  )
}

function Empty({ icon, title, sub, href, cta }: {
  icon: React.ReactNode; title: string; sub: string; href?: string; cta?: string
}) {
  return (
    <div className="bg-white rounded-3xl shadow-soft p-8 text-center">
      <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-[#FAFAF7] text-[#9CA3AF] flex items-center justify-center">
        {icon}
      </div>
      <p className="font-black text-[#1A2E26] mb-1">{title}</p>
      <p className="text-[12px] text-[#6B7280] leading-relaxed">{sub}</p>
      {href && cta && (
        <Link href={href} className="mt-4 inline-flex items-center justify-center gap-2 bg-[#34D399] text-[#04352A] px-5 py-2.5 rounded-2xl text-sm font-bold no-underline">
          {cta}
        </Link>
      )}
    </div>
  )
}
