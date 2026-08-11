'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  ArrowRight, Loader2, Lock, AlertCircle, RefreshCw,
  Mail, MessageSquare, Send, CheckCircle2, XCircle, AlertTriangle,
  Users, Building2, Package, Clock, TestTube, Sparkles, Heart, Bell,
} from 'lucide-react'

/* ============================================================
   /admin/welcome-messages — Phase B.10.3
   Manage all welcome flows: Email + WhatsApp + B2B onboarding
   ============================================================ */

type Stage = 'loading' | 'unauthenticated' | 'forbidden' | 'ready'

type WelcomeData = {
  templates: Array<{
    template_key: string
    name_ar: string
    subject_template: string
    preview: string
    is_active: boolean
    version: number
    category: string
    language: string
    sent_total: number
    sent_month: number
    sent_today: number
    failed: number
    queued: number
  }>
  whatsapp_outreach: {
    madmona_welcome: { sent: number; blocked: number; today: number; this_month: number }
    madmona_intro_outreach_v3: { sent: number; today: number; this_month: number }
    supplier_outreach: { sent: number; today: number }
    supplier_approved: { sent: number; today: number }
  }
  triggers: {
    supplier_welcome_email_trigger_exists: boolean
    customer_welcome_email_trigger_exists: boolean
  }
  funnel: {
    new_profiles_this_month: number
    new_profiles_today: number
    new_suppliers_this_month: number
    new_listings_this_month: number
    leads_converted_this_month: number
  }
  recent_welcomes: Array<{
    template_key: string
    to_email: string
    status: string
    sent_at: string | null
    subject: string
    channel: 'email'
  }>
  recent_wa_outreach: Array<{
    template_name: string
    recipient_phone: string
    recipient_name: string | null
    status: string
    sent_at: string | null
    campaign: string | null
    channel: 'whatsapp'
  }>
}

export default function WelcomeMessagesPage() {
  const [stage, setStage] = useState<Stage>('loading')
  const [data, setData] = useState<WelcomeData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [testingKey, setTestingKey] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  async function load() {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) { setStage('unauthenticated'); return }
      setRefreshing(true)
      // @ts-expect-error
      const { data: stats, error: e } = await supabaseBrowser.rpc('get_admin_welcome_messages')
      setRefreshing(false)
      if (e) {
        if ((e.message || '').toLowerCase().includes('forbidden')) { setStage('forbidden'); return }
        setError(e.message); setStage('ready'); return
      }
      setData(stats as WelcomeData)
      setStage('ready')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل التحميل')
      setStage('ready'); setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  async function sendTest(templateKey: string) {
    if (!testEmail) {
      setFeedback({ type: 'error', msg: 'حط إيميل للتجربة الأول' })
      setTimeout(() => setFeedback(null), 3000)
      return
    }
    setTestingKey(templateKey)
    try {
      // @ts-expect-error
      const { error: e } = await supabaseBrowser.rpc('admin_send_test_welcome', {
        p_template_key: templateKey,
        p_to_email: testEmail,
        p_to_phone: null,
        p_recipient_name: 'Mohamed (Test)',
      })
      if (e) throw e
      setFeedback({ type: 'success', msg: `✅ اتبعت test لـ ${testEmail}` })
      load()
    } catch (e) {
      setFeedback({ type: 'error', msg: e instanceof Error ? e.message : 'فشل الإرسال' })
    }
    setTestingKey(null)
    setTimeout(() => setFeedback(null), 4000)
  }

  async function toggleTemplate(templateKey: string, currentActive: boolean) {
    setToggling(templateKey)
    try {
      // @ts-expect-error
      const { error: e } = await supabaseBrowser.rpc('admin_toggle_email_template', {
        p_template_key: templateKey,
        p_is_active: !currentActive,
      })
      if (e) throw e
      setFeedback({ type: 'success', msg: `✅ ${!currentActive ? 'فعّلت' : 'وقفت'} الـ template` })
      load()
    } catch (e) {
      setFeedback({ type: 'error', msg: e instanceof Error ? e.message : 'فشل' })
    }
    setToggling(null)
    setTimeout(() => setFeedback(null), 4000)
  }

  if (stage === 'loading') {
    return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
      <Loader2 className="w-8 h-8 text-[#FA8125] animate-spin" />
    </div>
  }

  if (stage === 'unauthenticated') {
    return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-3xl p-8 text-center max-w-sm">
        <Lock className="w-8 h-8 text-[#FA8125] mx-auto mb-3" />
        <Link href="/auth/login?redirect=/admin/welcome-messages" className="block bg-[#FA8125] text-white py-3 rounded-xl font-bold mt-3">
          دخول
        </Link>
      </div>
    </div>
  }

  if (stage === 'forbidden') {
    return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-3xl p-8 text-center max-w-sm">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
        <h1 className="text-lg font-black text-[#1A2E26]">للأدمن فقط</h1>
      </div>
    </div>
  }

  if (error || !data) {
    return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-3xl p-8 text-center max-w-sm">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
        <p className="text-sm text-[#6B7280] mb-4">{error || 'مفيش data'}</p>
        <button onClick={load} className="bg-[#FA8125] text-white px-5 py-2.5 rounded-xl font-bold">حاول تاني</button>
      </div>
    </div>
  }

  const customerTpl = data.templates.find(t => t.template_key === 'customer_welcome')
  const supplierTpl = data.templates.find(t => t.template_key === 'supplier_welcome')
  const customerGap = data.funnel.new_profiles_this_month - (customerTpl?.sent_month || 0)
  const supplierGap = data.funnel.new_suppliers_this_month - (supplierTpl?.sent_month || 0)
  const hasGap = customerGap > 0 || supplierGap > 0

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 backdrop-blur-md bg-white/95">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="w-9 h-9 bg-[#FAFAF7] hover:bg-gray-100 rounded-xl flex items-center justify-center">
              <ArrowRight className="w-4 h-4 text-[#6B7280]" />
            </Link>
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#FA8125]">MADMONA · WELCOME</p>
              <h1 className="text-base md:text-lg font-black text-[#1A2E26] leading-none">💌 الرسائل الترحيبية</h1>
            </div>
          </div>
          <button onClick={load} disabled={refreshing} className="w-9 h-9 bg-[#FAFAF7] hover:bg-gray-100 rounded-xl flex items-center justify-center">
            <RefreshCw className={`w-4 h-4 text-[#6B7280] ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6 pb-12">
        {feedback && (
          <div className={`rounded-2xl p-3.5 text-sm font-bold flex items-center gap-2 ${
            feedback.type === 'success' ? 'bg-[#FA8125]/10 text-[#FA8125]' : 'bg-red-50 text-red-700'
          }`}>
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {feedback.msg}
          </div>
        )}

        {/* 🚨 GAP */}
        {hasGap && (
          <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-black text-red-900 mb-1">⚠️ الإيميل الترحيبي مش بـ يتبعت</h2>
                <p className="text-sm text-red-800 mb-3">ناس بـ تسجل بس ما بـ تستقبلش رسالة ترحيب على الإيميل.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div className="bg-white rounded-xl p-3 border border-red-200">
                    <p className="text-[10px] font-bold uppercase text-red-700 mb-1">👤 عملاء جداد الشهر</p>
                    <p className="text-2xl font-black text-red-900">{data.funnel.new_profiles_this_month} <span className="text-sm text-red-600">سجلوا</span></p>
                    <p className="text-xs text-red-700 mt-1">✗ {customerTpl?.sent_month || 0} إيميل اتبعت</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-red-200">
                    <p className="text-[10px] font-bold uppercase text-red-700 mb-1">🏪 موردين جداد الشهر</p>
                    <p className="text-2xl font-black text-red-900">{data.funnel.new_suppliers_this_month} <span className="text-sm text-red-600">سجلوا</span></p>
                    <p className="text-xs text-red-700 mt-1">✗ {supplierTpl?.sent_month || 0} إيميل اتبعت</p>
                  </div>
                </div>
                <p className="text-xs text-red-700">💡 الـ auto-triggers مش متربطة بـ flow الإيميل. استخدم Test Send لتأكد إن الـ template شغّال، بعدها هـ نفعّل الـ trigger.</p>
              </div>
            </div>
          </div>
        )}

        {/* FUNNEL */}
        <section>
          <h2 className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#6B7280] mb-3">المسار — جداد الشهر</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Kpi icon={<Users />} label="عملاء" value={data.funnel.new_profiles_this_month} note={data.funnel.new_profiles_today > 0 ? `+${data.funnel.new_profiles_today} اليوم` : 'اليوم: ٠'} />
            <Kpi icon={<Building2 />} label="موردين B2C" value={data.funnel.new_suppliers_this_month} />
            <Kpi icon={<Package />} label="إعلانات" value={data.funnel.new_listings_this_month} />
            <Kpi icon={<Sparkles />} label="شركاء B2B" value={data.funnel.leads_converted_this_month} note="متحولين" />
            <Kpi icon={<MessageSquare />} label="WA outreach" value={data.whatsapp_outreach.madmona_intro_outreach_v3.this_month} note="cold leads" tone="positive" />
          </div>
        </section>

        {/* TEST BOX */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TestTube className="w-4 h-4 text-[#FA8125]" />
            <h2 className="text-sm font-black text-[#1A2E26]">جرّب الترحيب على إيميلك</h2>
          </div>
          <p className="text-xs text-[#6B7280] mb-3">اكتب إيميل، اضغط "Test" تحت — هـ يـ queue الرسالة فورًا.</p>
          <input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)}
            placeholder="your-email@example.com"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-[#FA8125] focus:outline-none text-sm font-mono" />
        </section>

        {/* EMAIL TEMPLATES */}
        <section>
          <h2 className="text-base font-black text-[#1A2E26] mb-1">📧 الإيميلات الترحيبية</h2>
          <p className="text-[11px] text-[#6B7280] mb-3">{data.templates.length} templates · حالة الـ auto-triggers تحت</p>
          <div className="space-y-3">
            {data.templates.map((t) => (
              <div key={t.template_key} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 bg-[#FAFAF7] border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#FA8125]/10 text-[#FA8125] flex items-center justify-center flex-shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-[#1A2E26]">{t.name_ar}</p>
                      <p className="text-[10px] text-[#6B7280] font-mono">{t.template_key} · v{t.version}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                      t.is_active ? 'bg-[#FA8125]/10 text-[#FA8125]' : 'bg-gray-100 text-gray-600'
                    }`}>{t.is_active ? '✓ نشط' : '✗ معطل'}</span>
                    <button onClick={() => toggleTemplate(t.template_key, t.is_active)} disabled={toggling === t.template_key}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-lg ${
                        t.is_active ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-[#FA8125] text-white hover:bg-[#185547]'
                      } disabled:opacity-50`}>
                      {toggling === t.template_key ? '...' : (t.is_active ? 'وقف' : 'فعّل')}
                    </button>
                    <button onClick={() => sendTest(t.template_key)} disabled={testingKey === t.template_key || !testEmail}
                      className="text-[10px] font-bold bg-[#FA8125] text-white px-3 py-1.5 rounded-lg hover:bg-[#185547] flex items-center gap-1 disabled:opacity-50">
                      {testingKey === t.template_key ? <Loader2 className="w-3 h-3 animate-spin" /> : <><TestTube className="w-3 h-3" /> Test</>}
                    </button>
                  </div>
                </div>
                <div className="px-4 py-3 border-b border-gray-50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">العنوان</p>
                  <p className="text-sm font-bold text-[#1A2E26]">{t.subject_template}</p>
                </div>
                <div className="px-4 py-3 border-b border-gray-50 bg-[#FAFAF7]/50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">المحتوى</p>
                  <pre className="text-xs text-[#1A2E26] whitespace-pre-wrap font-sans leading-relaxed">{t.preview}</pre>
                </div>
                <div className="grid grid-cols-4 divide-x divide-gray-100">
                  <Stat label="إجمالي" value={t.sent_total} tone={t.sent_total > 0 ? 'positive' : 'negative'} />
                  <Stat label="الشهر" value={t.sent_month} tone={t.sent_month > 0 ? 'positive' : 'negative'} />
                  <Stat label="اليوم" value={t.sent_today} />
                  <Stat label="فشل/طابور" value={`${t.failed}/${t.queued}`} tone={t.failed > 0 ? 'negative' : 'neutral'} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* WHATSAPP */}
        <section>
          <h2 className="text-base font-black text-[#1A2E26] mb-1">📱 رسائل الترحيب على WhatsApp</h2>
          <p className="text-[11px] text-[#6B7280] mb-3">شغّالة · auto-responder + outreach</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <WaCard title="madmona_welcome" subtitle="Auto-responder للـ inbound جداد"
              sent={data.whatsapp_outreach.madmona_welcome.sent} blocked={data.whatsapp_outreach.madmona_welcome.blocked}
              today={data.whatsapp_outreach.madmona_welcome.today} month={data.whatsapp_outreach.madmona_welcome.this_month}
              icon={<Heart className="w-4 h-4" />} status="active" />
            <WaCard title="madmona_intro_outreach_v3" subtitle="Cold supplier acquisition"
              sent={data.whatsapp_outreach.madmona_intro_outreach_v3.sent}
              today={data.whatsapp_outreach.madmona_intro_outreach_v3.today}
              month={data.whatsapp_outreach.madmona_intro_outreach_v3.this_month}
              icon={<Send className="w-4 h-4" />} status="active" />
            <WaCard title="madmona_supplier_outreach" subtitle="Outreach قديم (legacy)"
              sent={data.whatsapp_outreach.supplier_outreach.sent} today={data.whatsapp_outreach.supplier_outreach.today}
              icon={<Building2 className="w-4 h-4" />} status="legacy" />
            <WaCard title="supplier_approved_v2" subtitle="إخطار الموردين بالاعتماد"
              sent={data.whatsapp_outreach.supplier_approved.sent} today={data.whatsapp_outreach.supplier_approved.today}
              icon={<CheckCircle2 className="w-4 h-4" />} status="active" />
          </div>
        </section>

        {/* B2B MISSING */}
        <section>
          <h2 className="text-base font-black text-[#1A2E26] mb-1">💼 ترحيب شركاء B2B</h2>
          <p className="text-[11px] text-[#6B7280] mb-3">لما lead يتحول لـ partner — مش موجود template</p>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-900 mb-1">مفيش welcome flow لشركاء B2B</p>
              <p className="text-xs text-amber-800 mb-2">{data.funnel.leads_converted_this_month} lead متحول الشهر — بـ يحتاج رسالة ترحيب مخصصة. لازم نبني:</p>
              <ul className="text-xs text-amber-800 space-y-0.5 mr-3">
                <li>• Email `b2b_partner_welcome` (credentials + onboarding)</li>
                <li>• WhatsApp `madmona_partner_welcome_v1` (نسخة قصيرة)</li>
                <li>• Auto-trigger يـ fire لما `contract_status` يبقى `active`</li>
              </ul>
            </div>
          </div>
        </section>

        {/* RECENT ACTIVITY */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <h2 className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#6B7280] mb-2">آخر إيميلات ترحيب</h2>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {data.recent_welcomes.length === 0 ? (
                <div className="p-6 text-center">
                  <Mail className="w-8 h-8 text-[#6B7280] opacity-30 mx-auto mb-2" />
                  <p className="text-xs text-[#6B7280]">لسه ما اتبعت إيميل ترحيب — جرب Test Send فوق</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {data.recent_welcomes.map((r, i) => (
                    <div key={i} className="px-4 py-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#1A2E26] truncate">{r.to_email}</p>
                        <p className="text-[10px] text-[#6B7280] font-mono">{r.template_key}</p>
                      </div>
                      <div className="text-left flex-shrink-0">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          r.status === 'sent' ? 'bg-[#FA8125]/10 text-[#FA8125]' :
                          r.status === 'failed' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                        }`}>{r.status}</span>
                        {r.sent_at && <p className="text-[9px] text-[#6B7280] mt-0.5">
                          {new Date(r.sent_at).toLocaleString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <h2 className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#6B7280] mb-2">آخر WhatsApp</h2>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {data.recent_wa_outreach.length === 0 ? (
                <div className="p-6 text-center">
                  <MessageSquare className="w-8 h-8 text-[#6B7280] opacity-30 mx-auto mb-2" />
                  <p className="text-xs text-[#6B7280]">مفيش رسائل</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {data.recent_wa_outreach.map((r, i) => (
                    <div key={i} className="px-4 py-2.5">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="text-xs font-bold text-[#1A2E26] truncate">{r.recipient_name || r.recipient_phone}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                          r.status === 'sent' ? 'bg-[#FA8125]/10 text-[#FA8125]' :
                          r.status === 'failed' || r.status === 'blocked' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                        }`}>{r.status}</span>
                      </div>
                      <p className="text-[10px] text-[#6B7280] font-mono truncate">{r.template_name}{r.campaign && ` · ${r.campaign}`}</p>
                      {r.sent_at && <p className="text-[9px] text-[#6B7280] mt-0.5">
                        {new Date(r.sent_at).toLocaleString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* TRIGGER STATUS */}
        <section>
          <h2 className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#6B7280] mb-3">حالة الـ Auto-Triggers</h2>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2.5">
            <TriggerStatus label="Customer welcome (عميل يسجل)" exists={data.triggers.customer_welcome_email_trigger_exists}
              fix="trigger على auth.users يـ enqueue customer_welcome" />
            <TriggerStatus label="Supplier welcome (listing يـ publish)" exists={data.triggers.supplier_welcome_email_trigger_exists}
              warning={!data.recent_welcomes.length ? 'موجود بس مش بـ يـ fire — محتاج debug' : undefined} />
            <TriggerStatus label="WhatsApp auto-welcome (inbound يجي)" exists={true}
              note={`${data.whatsapp_outreach.madmona_welcome.sent} رسالة sent · شغّال`} />
          </div>
        </section>

        {/* QUICK LINKS */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <QuickLink href="/admin/email-templates" icon={<Mail />} title="كل templates الإيميل" />
          <QuickLink href="/admin/email-queue" icon={<Clock />} title="طابور الإيميل" />
          <QuickLink href="/admin/wa-review" icon={<MessageSquare />} title="مراجعة WhatsApp" />
          <QuickLink href="/admin/messages" icon={<Bell />} title="كل المحادثات" />
        </section>
      </main>
    </div>
  )
}

function Kpi({ icon, label, value, note, tone }: { icon: ReactNode; label: string; value: number | string; note?: string; tone?: 'positive' | 'negative' | 'neutral' }) {
  const t = tone === 'positive' ? 'text-[#FA8125]' : tone === 'negative' ? 'text-red-600' : 'text-[#1A2E26]'
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-3">
      <div className="flex items-center gap-1.5 text-[#6B7280] mb-1.5">
        <span className="w-3.5 h-3.5 inline-flex">{icon}</span>
        <p className="text-[10px] font-bold tracking-wider uppercase">{label}</p>
      </div>
      <p className={`text-xl font-black ${t}`}>{value}</p>
      {note && <p className="text-[10px] text-[#6B7280] mt-0.5">{note}</p>}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: 'positive' | 'negative' | 'neutral' }) {
  const t = tone === 'positive' ? 'text-[#FA8125]' : tone === 'negative' ? 'text-red-600' : 'text-[#1A2E26]'
  return (
    <div className="px-3 py-2.5 text-center">
      <p className="text-[10px] font-bold uppercase text-[#6B7280] mb-1">{label}</p>
      <p className={`text-base font-black ${t}`}>{value}</p>
    </div>
  )
}

function WaCard({ title, subtitle, sent, blocked, today, month, icon, status }: { title: string; subtitle: string; sent: number; blocked?: number; today: number; month?: number; icon: ReactNode; status: 'active' | 'legacy' }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#FA8125]/10 text-[#FA8125] flex items-center justify-center flex-shrink-0">{icon}</div>
          <div className="min-w-0">
            <p className="text-xs font-mono font-bold text-[#1A2E26] truncate">{title}</p>
            <p className="text-[10px] text-[#6B7280]">{subtitle}</p>
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
          status === 'active' ? 'bg-[#FA8125]/10 text-[#FA8125]' : 'bg-gray-100 text-gray-500'
        }`}>{status}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[#FAFAF7] rounded-lg p-2 text-center">
          <p className="text-[9px] font-bold uppercase text-[#6B7280]">إجمالي</p>
          <p className="text-base font-black text-[#FA8125]">{sent}</p>
        </div>
        <div className="bg-[#FAFAF7] rounded-lg p-2 text-center">
          <p className="text-[9px] font-bold uppercase text-[#6B7280]">الشهر</p>
          <p className="text-base font-black text-[#1A2E26]">{month ?? '—'}</p>
        </div>
        <div className="bg-[#FAFAF7] rounded-lg p-2 text-center">
          <p className="text-[9px] font-bold uppercase text-[#6B7280]">{blocked !== undefined ? 'محظور' : 'اليوم'}</p>
          <p className={`text-base font-black ${blocked && blocked > 0 ? 'text-red-600' : 'text-[#1A2E26]'}`}>{blocked !== undefined ? blocked : today}</p>
        </div>
      </div>
    </div>
  )
}

function TriggerStatus({ label, exists, fix, warning, note }: { label: string; exists: boolean; fix?: string; warning?: string; note?: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${exists ? 'bg-[#FA8125]/10 text-[#FA8125]' : 'bg-red-50 text-red-600'}`}>
        {exists ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[#1A2E26]">{label}</p>
        {warning && <p className="text-[11px] text-amber-700 mt-0.5">⚠️ {warning}</p>}
        {note && <p className="text-[11px] text-[#FA8125] mt-0.5">✓ {note}</p>}
        {!exists && fix && <p className="text-[11px] text-[#6B7280] mt-0.5">📌 {fix}</p>}
      </div>
    </div>
  )
}

function QuickLink({ href, icon, title }: { href: string; icon: ReactNode; title: string }) {
  return (
    <Link href={href} className="bg-white rounded-2xl border border-gray-100 hover:border-[#FA8125] p-3 transition-colors group">
      <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-[#FAFAF7] text-[#FA8125] mb-2 group-hover:bg-[#FA8125] group-hover:text-white transition-colors">
        <span className="w-4 h-4 inline-flex">{icon}</span>
      </div>
      <p className="text-sm font-bold text-[#1A2E26]">{title}</p>
    </Link>
  )
}
