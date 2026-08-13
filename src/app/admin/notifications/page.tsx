'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  ArrowRight, Loader2, Lock, AlertCircle, Bell, Send, Crown,
  Users, User, Building2, CheckCircle, X, Search, Filter,
  MessageCircle, Sparkles, ChevronLeft,
} from 'lucide-react'

// ============================================================================
// /admin/notifications
//
// Send custom push notifications to specific users or groups.
// Notifications are queued in notification_queue and dispatched IMMEDIATELY
// by calling /api/push/process-queue right after insert.
// ============================================================================

type Stage = 'loading' | 'unauthenticated' | 'forbidden' | 'ready'
type AudienceType = 'single' | 'all_customers' | 'all_suppliers' | 'all_users' | 'selected'

interface UserRow {
  id: string
  full_name: string | null
  phone: string
  role: 'customer' | 'supplier' | 'admin'
  has_subscription: boolean
}

const QUICK_TEMPLATES = [
  {
    label: 'إعلان عرض جديد',
    title: 'عرض جديد على Madmona ✨',
    body: 'عرض حصري لفترة محدودة - شوف التفاصيل دلوقتي',
    url: '/marketplace',
  },
  {
    label: 'تذكير بالحجوزات',
    title: 'تذكير من Madmona 📅',
    body: 'متنساش حجوزاتك القادمة - شوفها من حسابك',
    url: '/account/bookings',
  },
  {
    label: 'تحديث مهم',
    title: 'تحديث جديد على المنصة 🎉',
    body: 'فيه مميزات جديدة على Madmona - جربها دلوقتي',
    url: '/marketplace',
  },
  {
    label: 'رسالة شكر',
    title: 'شكراً ليك من Madmona ❤️',
    body: 'بنقدر ثقتك فينا - عندك أي ملاحظات تواصل معانا على واتساب',
    url: '/',
  },
]

export default function AdminNotificationsPage() {
  const [stage, setStage] = useState<Stage>('loading')
  const [users, setUsers] = useState<UserRow[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserRow[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'customer' | 'supplier' | 'admin'>('all')

  // Form state
  const [audienceType, setAudienceType] = useState<AudienceType>('single')
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [url, setUrl] = useState('/')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => { init() }, [])

  useEffect(() => {
    let f = users
    if (roleFilter !== 'all') {
      f = f.filter(u => u.role === roleFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      f = f.filter(u =>
        (u.full_name && u.full_name.toLowerCase().includes(q)) ||
        u.phone.includes(q)
      )
    }
    setFilteredUsers(f)
  }, [users, searchQuery, roleFilter])

  const init = async () => {
    const { data: { session } } = await supabaseBrowser.auth.getSession()
    if (!session?.user) { setStage('unauthenticated'); return }

    const { data: prof } = await supabaseBrowser
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .maybeSingle()

    if (prof?.role !== 'admin') { setStage('forbidden'); return }

    await loadUsers()
    setStage('ready')
  }

  const loadUsers = async () => {
    const { data: profiles } = await supabaseBrowser
      .from('profiles')
      .select('id, full_name, phone, role')
      .order('created_at', { ascending: false })
      .limit(500)

    // Get push subscription presence
    const { data: subs } = await supabaseBrowser
      .from('push_subscriptions')
      .select('profile_id')

    const subsSet = new Set((subs || []).map((s: { profile_id: string }) => s.profile_id))

    const enriched = ((profiles || []) as UserRow[]).map(u => ({
      ...u,
      has_subscription: subsSet.has(u.id),
    }))

    setUsers(enriched)
  }

  const toggleUserSelection = (userId: string) => {
    const next = new Set(selectedUserIds)
    if (next.has(userId)) next.delete(userId)
    else next.add(userId)
    setSelectedUserIds(next)
  }

  const applyTemplate = (template: typeof QUICK_TEMPLATES[number]) => {
    setTitle(template.title)
    setBody(template.body)
    setUrl(template.url)
  }

  const computeRecipients = (): string[] => {
    if (audienceType === 'single' || audienceType === 'selected') {
      return Array.from(selectedUserIds)
    }
    if (audienceType === 'all_customers') {
      return users.filter(u => u.role === 'customer').map(u => u.id)
    }
    if (audienceType === 'all_suppliers') {
      return users.filter(u => u.role === 'supplier').map(u => u.id)
    }
    if (audienceType === 'all_users') {
      return users.map(u => u.id)
    }
    return []
  }

  const subscribedRecipientsCount = (): number => {
    const ids = computeRecipients()
    const idsSet = new Set(ids)
    return users.filter(u => idsSet.has(u.id) && u.has_subscription).length
  }

  const handleSend = async () => {
    setResult(null)
    if (!title.trim() || !body.trim()) {
      setResult({ ok: false, message: 'الرسالة مش كاملة. اكتب العنوان والمحتوى الأول.' })
      return
    }
    if (title.length > 100) {
      setResult({ ok: false, message: 'العنوان طويل جداً (الحد الأقصى 100 حرف)' })
      return
    }
    if (body.length > 300) {
      setResult({ ok: false, message: 'المحتوى طويل جداً (الحد الأقصى 300 حرف)' })
      return
    }

    const recipients = computeRecipients()
    if (recipients.length === 0) {
      setResult({ ok: false, message: 'مفيش مستلمين. اختار أو حدد المستخدمين.' })
      return
    }

    if (recipients.length > 10) {
      if (!confirm(`هتبعت لـ${recipients.length} شخص. متأكد؟`)) return
    }

    setSending(true)

    try {
      // Step 1: Insert one row per recipient into notification_queue
      const rows = recipients.map(rid => ({
        recipient_id: rid,
        type: 'admin_broadcast',
        title: title.trim(),
        body: body.trim(),
        url: url.trim() || '/',
        data: { source: 'admin_broadcast' },
      }))

      const { error } = await supabaseBrowser
        .from('notification_queue')
        .insert(rows)

      if (error) {
        setResult({ ok: false, message: 'فشل الإرسال: ' + error.message })
        setSending(false)
        return
      }

      // Step 2: Trigger immediate processing via /api/push/process-queue
      // Pass user JWT so endpoint can verify admin role.
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      const accessToken = session?.access_token || ''

      let processResult: { sent?: number; processed?: number; error?: string } = {}
      try {
        const res = await fetch('/api/push/process-queue', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        })
        processResult = await res.json()
      } catch (e) {
        // Network error — notifications are still queued
        processResult = { error: 'network' }
      }

      const subscribedCount = subscribedRecipientsCount()

      if (processResult.error) {
        setResult({
          ok: true,
          message: `تم إضافة ${recipients.length} إشعار للقائمة. ${subscribedCount} منهم مفعّلة عندهم. (لاحظة: حصلت مشكلة في الإرسال الفوري - الإشعارات هتتبعت في أول call.)`,
        })
      } else {
        const sent = processResult.sent || 0
        setResult({
          ok: true,
          message: `✅ تم إرسال ${sent} إشعار فوراً من أصل ${recipients.length}. (${subscribedCount} مفعّلين الإشعارات)`,
        })
      }

      setTitle('')
      setBody('')
      setUrl('/')
      setSelectedUserIds(new Set())
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'unknown'
      setResult({ ok: false, message: 'حصل خطأ: ' + msg })
    }
    setSending(false)
  }

  // ===========================================================================
  if (stage === 'loading') {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center" dir="rtl">
        <Loader2 className="w-6 h-6 text-[#FA8125] animate-spin" />
      </div>
    )
  }

  if (stage === 'unauthenticated') {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl shadow-luxe p-8 text-center max-w-sm">
          <Lock className="w-8 h-8 text-[#FA8125] mx-auto mb-3" />
          <h1 className="font-bold mb-4">سجّل دخول الأول</h1>
          <Link
            href="/auth/login?redirect=/admin/notifications"
            className="block bg-[#FA8125] text-white py-3 rounded-xl font-semibold"
          >
            دخول
          </Link>
        </div>
      </div>
    )
  }

  if (stage === 'forbidden') {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl shadow-luxe p-8 text-center max-w-sm">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <h1 className="font-bold mb-2">مش مسموح</h1>
          <p className="text-sm text-gray-600 mb-4">الصفحة دي للأدمن فقط.</p>
          <Link href="/account" className="inline-block bg-[#FA8125] text-white px-5 py-2.5 rounded-xl font-semibold">
            ارجع للحساب
          </Link>
        </div>
      </div>
    )
  }

  const recipientCount = computeRecipients().length
  const subscribedCount = subscribedRecipientsCount()
  const totalSubscribed = users.filter(u => u.has_subscription).length

  return (
    <div className="min-h-screen gradient-mesh pb-20" dir="rtl">
      <header className="sticky top-0 z-40 glass border-b border-white/40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/admin/dashboard"
            className="w-9 h-9 bg-white shadow-soft hover:shadow-card hover:-translate-y-0.5 rounded-full flex items-center justify-center transition-all"
          >
            <ArrowRight className="w-4 h-4 text-gray-700" />
          </Link>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#FA8125]" />
            <h1 className="text-lg font-black text-gray-900">إرسال إشعارات</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl shadow-soft p-4">
            <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg mb-2 bg-[#FA8125]/10 text-[#FA8125]">
              <Users className="w-4 h-4" />
            </div>
            <p className="text-[11px] text-gray-500 mb-1">إجمالي المستخدمين</p>
            <p className="text-xl font-black text-gray-900 tabular">{users.length}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-soft p-4">
            <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg mb-2 bg-blue-100 text-blue-700">
              <Bell className="w-4 h-4" />
            </div>
            <p className="text-[11px] text-gray-500 mb-1">مفعّلين الإشعارات</p>
            <p className="text-xl font-black text-gray-900 tabular">{totalSubscribed}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-soft p-4">
            <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg mb-2 bg-[#2FA084]/10 text-[#2FA084]">
              <Sparkles className="w-4 h-4" />
            </div>
            <p className="text-[11px] text-gray-500 mb-1">معدل التفعيل</p>
            <p className="text-xl font-black text-gray-900 tabular">
              {users.length > 0 ? Math.round((totalSubscribed / users.length) * 100) : 0}%
            </p>
          </div>
        </div>

        {/* Audience selection */}
        <div className="bg-white rounded-3xl shadow-soft p-5">
          <h2 className="font-black text-gray-900 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#FA8125]" />
            مين هيوصله الإشعار؟
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
            <AudienceButton
              active={audienceType === 'single'}
              onClick={() => { setAudienceType('single'); setSelectedUserIds(new Set()) }}
              icon={<User className="w-4 h-4" />}
              label="شخص واحد"
            />
            <AudienceButton
              active={audienceType === 'selected'}
              onClick={() => { setAudienceType('selected') }}
              icon={<Users className="w-4 h-4" />}
              label="مجموعة محددة"
            />
            <AudienceButton
              active={audienceType === 'all_customers'}
              onClick={() => { setAudienceType('all_customers'); setSelectedUserIds(new Set()) }}
              icon={<User className="w-4 h-4" />}
              label="كل العملاء"
            />
            <AudienceButton
              active={audienceType === 'all_suppliers'}
              onClick={() => { setAudienceType('all_suppliers'); setSelectedUserIds(new Set()) }}
              icon={<Building2 className="w-4 h-4" />}
              label="كل الموردين"
            />
            <AudienceButton
              active={audienceType === 'all_users'}
              onClick={() => { setAudienceType('all_users'); setSelectedUserIds(new Set()) }}
              icon={<Users className="w-4 h-4" />}
              label="كل المستخدمين"
            />
          </div>

          {/* User picker — shows when single or selected */}
          {(audienceType === 'single' || audienceType === 'selected') && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex gap-2 mb-3">
                <div className="flex-1 relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث بالاسم أو رقم الموبايل..."
                    className="w-full pr-10 pl-3 py-2.5 bg-[#FAFAF7] border border-gray-100 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-[#FA8125]/40"
                  />
                </div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
                  className="px-3 py-2.5 bg-[#FAFAF7] border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-[#FA8125]/40"
                >
                  <option value="all">الكل</option>
                  <option value="customer">عملاء</option>
                  <option value="supplier">موردين</option>
                  <option value="admin">أدمن</option>
                </select>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                {filteredUsers.length === 0 ? (
                  <p className="text-center text-sm text-gray-500 py-8">مفيش نتائج</p>
                ) : (
                  filteredUsers.map(user => {
                    const isSelected = selectedUserIds.has(user.id)
                    const isSingleMode = audienceType === 'single'

                    return (
                      <button
                        key={user.id}
                        onClick={() => {
                          if (isSingleMode) {
                            setSelectedUserIds(new Set([user.id]))
                          } else {
                            toggleUserSelection(user.id)
                          }
                        }}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all text-right ${
                          isSelected
                            ? 'border-[#FA8125] bg-[#FA8125]/5'
                            : 'border-gray-100 hover:border-gray-200 bg-white'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-[#FA8125] text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {isSelected ? <CheckCircle className="w-4 h-4" /> : <User className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0 text-right">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-bold text-sm text-gray-900 truncate">
                              {user.full_name || 'مستخدم'}
                            </p>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                              user.role === 'admin' ? 'bg-[#2FA084]/10 text-[#2FA084]' :
                              user.role === 'supplier' ? 'bg-[#FA8125]/10 text-[#FA8125]' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {user.role === 'admin' ? 'أدمن' : user.role === 'supplier' ? 'مورد' : 'عميل'}
                            </span>
                            {user.has_subscription && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-700 inline-flex items-center gap-0.5">
                                <Bell className="w-2.5 h-2.5" /> مفعّل
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-500 mt-0.5" dir="ltr">{user.phone}</p>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Templates */}
        <div className="bg-white rounded-3xl shadow-soft p-5">
          <h2 className="font-black text-gray-900 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#2FA084]" />
            قوالب جاهزة
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {QUICK_TEMPLATES.map(t => (
              <button
                key={t.label}
                onClick={() => applyTemplate(t)}
                className="px-3 py-2 bg-[#2FA084]/5 hover:bg-[#2FA084]/10 border border-[#2FA084]/20 text-[#2FA084] rounded-xl text-xs font-bold transition-colors text-center"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message form */}
        <div className="bg-white rounded-3xl shadow-soft p-5 space-y-3">
          <h2 className="font-black text-gray-900 mb-1 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-[#FA8125]" />
            محتوى الإشعار
          </h2>

          <div>
            <label className="text-xs font-bold text-gray-700 mb-1 block">العنوان</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: عرض جديد على Madmona ✨"
              maxLength={100}
              className="w-full px-4 py-2.5 bg-[#FAFAF7] border border-gray-100 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-[#FA8125]/40"
            />
            <p className="text-[10px] text-gray-400 mt-1">{title.length}/100</p>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 mb-1 block">المحتوى</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="مثال: عرض حصري على مساحاتنا - 20% خصم لفترة محدودة"
              maxLength={300}
              rows={3}
              className="w-full px-4 py-2.5 bg-[#FAFAF7] border border-gray-100 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-[#FA8125]/40 resize-y"
            />
            <p className="text-[10px] text-gray-400 mt-1">{body.length}/300</p>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 mb-1 block">الرابط لما يضغط الإشعار</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="/marketplace أو /account/bookings"
              className="w-full px-4 py-2.5 bg-[#FAFAF7] border border-gray-100 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-[#FA8125]/40"
              dir="ltr"
              style={{ textAlign: 'left' }}
            />
          </div>

          {/* Preview */}
          {(title || body) && (
            <div className="bg-gray-900 rounded-2xl p-4 border-2 border-gray-200">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2">معاينة</p>
              <div className="bg-white rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 bg-[#FA8125] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Bell className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate">{title || 'العنوان'}</p>
                    <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">{body || 'المحتوى'}</p>
                    <p className="text-[10px] text-gray-400 mt-1">Madmona · دلوقتي</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Result */}
        {result && (
          <div className={`p-4 rounded-2xl border-2 flex items-start gap-2 ${
            result.ok
              ? 'bg-green-50 border-green-200 text-green-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}>
            {result.ok ? <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-600" /> :
                         <X className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />}
            <p className="text-sm">{result.message}</p>
          </div>
        )}

        {/* Send button */}
        <div className="bg-gradient-to-l from-[#FA8125] to-[#F98F2A] text-white rounded-3xl p-5 shadow-luxe">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <p className="text-xs text-white/70 uppercase tracking-widest font-bold">سيوصل لـ</p>
              <p className="text-2xl font-black tabular">
                {recipientCount}
                <span className="text-sm font-medium text-white/80 mr-2">شخص</span>
              </p>
              {recipientCount > 0 && (
                <p className="text-xs text-white/70 mt-0.5">
                  {subscribedCount} منهم مفعّلين الإشعارات
                </p>
              )}
            </div>
            <button
              onClick={handleSend}
              disabled={sending || recipientCount === 0 || !title.trim() || !body.trim()}
              className="bg-white text-[#FA8125] px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              {sending ? 'جاري الإرسال...' : 'ابعت الإشعار'}
            </button>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-3 text-xs text-yellow-900 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold mb-0.5">ملاحظة:</p>
            <p className="leading-relaxed">
              الإشعارات بتوصل للناس اللي مفعّلين الـPush من حسابهم بس. لما تضغط "ابعت الإشعار" بيتبعت فوراً.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

function AudienceButton({
  active, onClick, icon, label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${
        active
          ? 'border-[#FA8125] bg-[#FA8125]/5 text-[#FA8125]'
          : 'border-gray-100 bg-white text-gray-600 hover:border-gray-200'
      }`}
    >
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
        active ? 'bg-[#FA8125] text-white' : 'bg-gray-100 text-gray-500'
      }`}>
        {icon}
      </div>
      <span>{label}</span>
    </button>
  )
}
