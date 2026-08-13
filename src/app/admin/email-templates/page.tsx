'use client'

// =====================================================================
// /admin/email-templates — Edit the 7 customer email templates
// Phase Ω.11 (May 18 2026)
// =====================================================================

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  ArrowRight, Loader2, Lock, ShieldAlert, FileText, Eye, EyeOff,
  Save, X, AlertCircle, CheckCircle, Edit2, Send,
} from 'lucide-react'

type Stage = 'loading' | 'unauthenticated' | 'forbidden' | 'ready'

interface EmailTemplate {
  template_key: string
  name_ar: string
  category: string
  subject_template: string
  body_html_template: string
  body_text_template: string | null
  required_vars: string[]
  description: string | null
  is_active: boolean
  language: string
  version: number
}

const CATEGORY_LABELS: Record<string, string> = {
  transactional: 'معاملة',
  marketing: 'تسويق',
  notification: 'إشعار',
  review_request: 'طلب تقييم',
  payout: 'مستحقات',
}

export default function EmailTemplatesPage() {
  const [stage, setStage] = useState<Stage>('loading')
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [editing, setEditing] = useState<EmailTemplate | null>(null)
  const [previewKey, setPreviewKey] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [testEmail, setTestEmail] = useState('madmona@madmonacairo.com')
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { session } } = await supabaseBrowser.auth.getSession()
    if (!session?.user) { setStage('unauthenticated'); return }
    const { data: prof } = await supabaseBrowser.from('profiles').select('role').eq('id', session.user.id).maybeSingle()
    if (prof?.role !== 'admin') { setStage('forbidden'); return }
    await loadTemplates()
    setStage('ready')
  }

  async function loadTemplates() {
    const { data } = await supabaseBrowser.from('email_templates').select('*').order('category').order('template_key')
    setTemplates((data as EmailTemplate[]) || [])
  }

  async function save() {
    if (!editing) return
    setSaving(true)
    const { error } = await supabaseBrowser.from('email_templates').update({
      subject_template: editing.subject_template,
      body_html_template: editing.body_html_template,
      body_text_template: editing.body_text_template,
      is_active: editing.is_active,
      version: editing.version + 1,
      updated_at: new Date().toISOString(),
    }).eq('template_key', editing.template_key)
    setSaving(false)
    if (error) {
      setFlash({ ok: false, text: `فشل: ${error.message}` })
    } else {
      setFlash({ ok: true, text: 'تم الحفظ' })
      setEditing(null)
      await loadTemplates()
    }
    setTimeout(() => setFlash(null), 4000)
  }

  async function toggleActive(t: EmailTemplate) {
    await supabaseBrowser.from('email_templates').update({
      is_active: !t.is_active, updated_at: new Date().toISOString(),
    }).eq('template_key', t.template_key)
    await loadTemplates()
  }

  async function sendTest(t: EmailTemplate) {
    if (!testEmail) { setFlash({ ok: false, text: 'اكتب test email' }); return }
    setSending(true)
    // Build sample vars from required_vars
    const vars: Record<string, string> = {}
    t.required_vars.forEach(v => { vars[v] = `[${v}]` })
    const { error } = await supabaseBrowser.rpc('send_customer_email', {
      p_to_email: testEmail,
      p_template_key: t.template_key,
      p_template_vars: vars,
      p_category: t.category,
      p_priority: 9,
      p_metadata: { source: 'admin_test_email' },
    })
    setSending(false)
    if (error) {
      setFlash({ ok: false, text: `فشل: ${error.message}` })
    } else {
      setFlash({ ok: true, text: `تم إضافة test إلى الـ queue → ${testEmail}` })
    }
    setTimeout(() => setFlash(null), 4500)
  }

  if (stage === 'loading') return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-6 h-6 text-[#FA8125] animate-spin" /></div>
  if (stage === 'unauthenticated') return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl border p-8 text-center max-w-sm">
        <Lock className="w-8 h-8 text-[#FA8125] mx-auto mb-3" />
        <h1 className="font-bold mb-4">سجّل دخول الأول</h1>
        <Link href="/auth/login?redirect=/admin/email-templates" className="block bg-[#FA8125] text-white py-3 rounded-xl font-semibold">دخول</Link>
      </div>
    </div>
  )
  if (stage === 'forbidden') return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl border p-8 text-center max-w-sm">
        <ShieldAlert className="w-8 h-8 text-red-500 mx-auto mb-3" />
        <h1 className="font-bold">الصفحة دي للأدمن فقط</h1>
      </div>
    </div>
  )

  const previewTpl = templates.find(t => t.template_key === previewKey)

  return (
    <div className="min-h-screen bg-[#FAFAF7] pb-20" dir="rtl">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/admin/dashboard" className="w-9 h-9 bg-white shadow rounded-full flex items-center justify-center">
            <ArrowRight className="w-4 h-4 text-gray-700" />
          </Link>
          <FileText className="w-5 h-5 text-[#FA8125]" />
          <h1 className="text-lg font-black text-gray-900 flex-1">قوالب الإيميل</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-3">
        {flash && (
          <div className={`p-3 rounded-xl border flex items-start gap-2 text-sm ${
            flash.ok ? 'bg-green-50 border-green-200 text-green-900' : 'bg-red-50 border-red-200 text-red-900'
          }`}>
            {flash.ok ? <CheckCircle className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
            <span>{flash.text}</span>
          </div>
        )}

        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <label className="block text-xs font-bold text-gray-700 mb-1">إيميل للاختبار</label>
          <input value={testEmail} onChange={e => setTestEmail(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono"
            dir="ltr" style={{ textAlign: 'left' }} />
          <p className="text-[10px] text-gray-500 mt-1">اضغط "اختبار" على أي template لإرسال نسخة برموز placeholder.</p>
        </div>

        <div className="space-y-2">
          {templates.map(t => (
            <div key={t.template_key} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-start gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                      {CATEGORY_LABELS[t.category] || t.category}
                    </span>
                    {!t.is_active && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                        موقّف
                      </span>
                    )}
                    <span className="text-[10px] text-gray-500">v{t.version}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">{t.name_ar}</h3>
                  <p className="text-xs text-gray-600 font-mono mt-0.5">{t.template_key}</p>
                  <p className="text-xs text-gray-700 mt-1.5 line-clamp-1">{t.subject_template}</p>
                  {t.required_vars.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {t.required_vars.map(v => (
                        <span key={v} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-mono">
                          {`{{${v}}}`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0 flex flex-col gap-1.5">
                  <button onClick={() => toggleActive(t)} className={`p-1.5 rounded-lg ${t.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {t.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => setPreviewKey(t.template_key)} className="p-1.5 rounded-lg bg-gray-100 text-gray-700">
                    <FileText className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setEditing(t)} className="p-1.5 rounded-lg bg-gray-100 text-gray-700">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => sendTest(t)} disabled={sending} className="p-1.5 rounded-lg bg-[#FA8125] text-white disabled:opacity-50">
                    {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-0 md:p-4" dir="rtl">
          <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <h2 className="font-black text-lg">{editing.name_ar}</h2>
              <button onClick={() => setEditing(null)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">العنوان (Subject)</label>
                <input value={editing.subject_template} onChange={e => setEditing({ ...editing, subject_template: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">HTML body (يستخدم {`{{var}}`})</label>
                <textarea value={editing.body_html_template} onChange={e => setEditing({ ...editing, body_html_template: e.target.value })}
                  rows={14} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Plain text body</label>
                <textarea value={editing.body_text_template || ''} onChange={e => setEditing({ ...editing, body_text_template: e.target.value })}
                  rows={5} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono" />
              </div>
              <button onClick={() => setEditing({ ...editing, is_active: !editing.is_active })}
                className={`w-full p-3 rounded-xl border-2 text-sm font-bold ${editing.is_active ? 'bg-green-50 border-green-300 text-green-800' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                {editing.is_active ? '✓ template نشط' : '○ template موقّف'}
              </button>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 flex gap-2">
              <button onClick={() => setEditing(null)} disabled={saving} className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm">إلغاء</button>
              <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl bg-[#FA8125] hover:bg-[#FA8125]/90 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {previewTpl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
              <h2 className="font-black text-lg">معاينة: {previewTpl.name_ar}</h2>
              <button onClick={() => setPreviewKey(null)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              <div className="text-xs text-gray-500 mb-2">Subject: <span className="font-bold text-gray-900">{previewTpl.subject_template}</span></div>
              <iframe srcDoc={previewTpl.body_html_template} className="w-full h-96 border border-gray-200 rounded-xl bg-white" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
