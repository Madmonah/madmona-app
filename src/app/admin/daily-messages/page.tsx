'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  ArrowRight, Loader2, Lock, ShieldAlert, Plus, Save, X, Edit2,
  Trash2, MessageSquare, Eye, EyeOff, AlertCircle, CheckCircle,
  Calendar, Tag, ExternalLink,
} from 'lucide-react'

// ============================================================================
// /admin/daily-messages
// Admin CRUD for the daily message pool surfaced on the home page.
// Built on the daily_messages table + RLS policy "daily_messages_admin_all"
// (profiles.role='admin' gates writes; reads are public for active rows).
// ============================================================================

type Stage = 'loading' | 'unauthenticated' | 'forbidden' | 'ready'

interface DailyMessage {
  id: string
  title: string
  body: string
  category: string
  image_url: string | null
  cta_label: string | null
  cta_url: string | null
  deal_code: string | null
  is_active: boolean
  start_date: string | null
  end_date: string | null
  priority: number
  show_once_per_user: boolean
  send_as_push: boolean       // Phase Ω: also broadcast as push notification
  push_hour: number           // Phase Ω: Cairo hour 0-23 (default 9)
  last_push_sent_at: string | null  // Phase Ω: idempotency guard
  created_at: string
}

const CATEGORIES = [
  { value: 'greeting',     label: '👋 ترحيب',     color: 'bg-amber-50 text-amber-800 border-amber-200' },
  { value: 'tip',          label: '💡 نصيحة',     color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { value: 'announcement', label: '📢 إعلان',     color: 'bg-blue-50 text-blue-800 border-blue-200' },
  { value: 'deal',         label: '🎁 عرض',       color: 'bg-rose-50 text-rose-800 border-rose-200' },
  { value: 'motivation',   label: '⭐ تحفيز',     color: 'bg-sky-50 text-sky-800 border-sky-200' },
]

const EMPTY_DRAFT: Partial<DailyMessage> = {
  title: '',
  body: '',
  category: 'tip',
  image_url: null,
  cta_label: null,
  cta_url: null,
  deal_code: null,
  is_active: true,
  start_date: null,
  end_date: null,
  priority: 5,
  show_once_per_user: false,
  send_as_push: false,
  push_hour: 9,
}

export default function AdminDailyMessagesPage() {
  const [stage, setStage] = useState<Stage>('loading')
  const [messages, setMessages] = useState<DailyMessage[]>([])
  const [editing, setEditing] = useState<Partial<DailyMessage> | null>(null)
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null)
  const [viewStats, setViewStats] = useState<Record<string, { views: number; dismissed: number }>>({})

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { session } } = await supabaseBrowser.auth.getSession()
    if (!session?.user) { setStage('unauthenticated'); return }

    const { data: prof } = await supabaseBrowser
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .maybeSingle()
    if (prof?.role !== 'admin') { setStage('forbidden'); return }

    await loadMessages()
    setStage('ready')
  }

  async function loadMessages() {
    const { data, error } = await supabaseBrowser
      .from('daily_messages')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('load messages error', error)
      return
    }
    setMessages((data || []) as DailyMessage[])

    // Aggregate view stats per message (lightweight summary)
    const { data: views } = await supabaseBrowser
      .from('user_message_views')
      .select('message_id, dismissed_at')

    if (views) {
      const stats: Record<string, { views: number; dismissed: number }> = {}
      ;(views as { message_id: string; dismissed_at: string | null }[]).forEach(v => {
        if (!stats[v.message_id]) stats[v.message_id] = { views: 0, dismissed: 0 }
        stats[v.message_id].views++
        if (v.dismissed_at) stats[v.message_id].dismissed++
      })
      setViewStats(stats)
    }
  }

  async function handleSave() {
    if (!editing || !editing.title || !editing.body) {
      setFlash({ ok: false, text: 'العنوان والنص مطلوبين' })
      return
    }
    setSaving(true)

    const payload = {
      title: editing.title,
      body: editing.body,
      category: editing.category || 'tip',
      image_url: editing.image_url || null,
      cta_label: editing.cta_label || null,
      cta_url: editing.cta_url || null,
      deal_code: editing.deal_code || null,
      is_active: editing.is_active ?? true,
      start_date: editing.start_date || null,
      end_date: editing.end_date || null,
      priority: editing.priority ?? 5,
      show_once_per_user: editing.show_once_per_user ?? false,
      send_as_push: editing.send_as_push ?? false,
      push_hour: editing.push_hour ?? 9,
      updated_at: new Date().toISOString(),
    }

    try {
      if (editing.id) {
        const { error } = await supabaseBrowser
          .from('daily_messages')
          .update(payload)
          .eq('id', editing.id)
        if (error) throw error
      } else {
        const { error } = await supabaseBrowser
          .from('daily_messages')
          .insert(payload)
        if (error) throw error
      }
      setFlash({ ok: true, text: editing.id ? 'تم التعديل بنجاح' : 'تم إضافة الرسالة' })
      setEditing(null)
      await loadMessages()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'حصل خطأ'
      setFlash({ ok: false, text: 'فشل الحفظ: ' + msg })
    }
    setSaving(false)
    setTimeout(() => setFlash(null), 4000)
  }

  async function handleDelete(msg: DailyMessage) {
    if (!confirm(`تأكد إنك عاوز تشيل "${msg.title}"؟`)) return
    const { error } = await supabaseBrowser
      .from('daily_messages')
      .delete()
      .eq('id', msg.id)
    if (error) {
      setFlash({ ok: false, text: 'فشل الحذف: ' + error.message })
    } else {
      setFlash({ ok: true, text: 'تم الحذف' })
      await loadMessages()
    }
    setTimeout(() => setFlash(null), 4000)
  }

  async function toggleActive(msg: DailyMessage) {
    const { error } = await supabaseBrowser
      .from('daily_messages')
      .update({ is_active: !msg.is_active, updated_at: new Date().toISOString() })
      .eq('id', msg.id)
    if (!error) await loadMessages()
  }

  if (stage === 'loading') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-6 h-6 text-[#059669] animate-spin" />
      </div>
    )
  }
  if (stage === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl border p-8 text-center max-w-sm">
          <Lock className="w-8 h-8 text-[#059669] mx-auto mb-3" />
          <h1 className="font-bold mb-4">سجّل دخول الأول</h1>
          <Link href="/auth/login?redirect=/admin/daily-messages" className="block bg-[#34D399] text-[#04352A] py-3 rounded-xl font-semibold">دخول</Link>
        </div>
      </div>
    )
  }
  if (stage === 'forbidden') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl border p-8 text-center max-w-sm">
          <ShieldAlert className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <h1 className="font-bold mb-2">الصفحة دي للأدمن فقط</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] pb-20" dir="rtl">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/admin/dashboard" className="w-9 h-9 bg-white shadow rounded-full flex items-center justify-center">
            <ArrowRight className="w-4 h-4 text-gray-700" />
          </Link>
          <MessageSquare className="w-5 h-5 text-[#059669]" />
          <h1 className="text-lg font-black text-gray-900 flex-1">رسائل الصفحة الرئيسية</h1>
          <button
            type="button"
            onClick={() => setEditing(EMPTY_DRAFT)}
            className="bg-[#34D399] text-[#04352A] px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 hover:bg-[#34D399]/90"
          >
            <Plus className="w-4 h-4" /> رسالة جديدة
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-3">
        {flash && (
          <div className={`p-3 rounded-xl border flex items-start gap-2 text-sm ${
            flash.ok ? 'bg-green-50 border-green-200 text-green-900' : 'bg-red-50 border-red-200 text-red-900'
          }`}>
            {flash.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
            <span>{flash.text}</span>
          </div>
        )}

        <div className="bg-gradient-to-l from-[#34D399] to-[#34D399] text-white rounded-2xl p-5">
          <h2 className="font-black text-lg mb-1">إدارة الرسائل اليومية</h2>
          <p className="text-sm text-white/80">
            الرسائل دي بتظهر للزوار على الصفحة الرئيسية فوق النيوز. كل يوزر بيشوف رسالة مختلفة من البول.
          </p>
          <p className="text-xs text-white/70 mt-2">
            {messages.filter(m => m.is_active).length} نشطة · {messages.length} إجمالي
          </p>
        </div>

        {messages.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">مفيش رسائل لسة. اضغط "رسالة جديدة" تبدأ.</p>
          </div>
        )}

        {messages.map(m => {
          const cat = CATEGORIES.find(c => c.value === m.category) || CATEGORIES[1]
          const stat = viewStats[m.id] || { views: 0, dismissed: 0 }
          return (
            <div key={m.id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cat.color}`}>
                      {cat.label}
                    </span>
                    {!m.is_active && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                        موقّفة
                      </span>
                    )}
                    {m.show_once_per_user && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                        مرة واحدة لكل يوزر
                      </span>
                    )}
                    <span className="text-[10px] text-gray-500">
                      أولوية: {m.priority}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">{m.title}</h3>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{m.body}</p>
                  {m.deal_code && (
                    <span className="inline-block mt-2 text-xs font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      كود: {m.deal_code}
                    </span>
                  )}
                  {m.cta_url && (
                    <a href={m.cta_url} target="_blank" rel="noopener noreferrer"
                       className="inline-flex items-center gap-1 mt-2 me-2 text-xs text-[#059669] hover:underline">
                      <ExternalLink className="w-3 h-3" />
                      {m.cta_label || m.cta_url}
                    </a>
                  )}
                </div>
                <div className="flex-shrink-0 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleActive(m)}
                    className={`p-2 rounded-lg ${m.is_active ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    title={m.is_active ? 'إيقاف' : 'تفعيل'}
                  >
                    {m.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(m)}
                    className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                    title="تعديل"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(m)}
                    className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4 pt-2 border-t border-gray-100 text-[11px] text-gray-500">
                <span>👁 {stat.views} مشاهدة</span>
                <span>✕ {stat.dismissed} تجاهل</span>
                {m.start_date && <span>من: {m.start_date}</span>}
                {m.end_date && <span>إلى: {m.end_date}</span>}
              </div>
            </div>
          )
        })}
      </main>

      {/* Edit modal */}
      {editing && (
        <EditModal
          draft={editing}
          onChange={setEditing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
          saving={saving}
        />
      )}
    </div>
  )
}

function EditModal({
  draft, onChange, onSave, onCancel, saving,
}: {
  draft: Partial<DailyMessage>
  onChange: (d: Partial<DailyMessage>) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-0 md:p-4" dir="rtl">
      <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="font-black text-lg">{draft.id ? 'تعديل رسالة' : 'رسالة جديدة'}</h2>
          <button type="button" onClick={onCancel} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">النوع</label>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => onChange({ ...draft, category: c.value })}
                  className={`p-2 rounded-xl text-xs font-medium border transition-all ${
                    draft.category === c.value
                      ? 'bg-[#34D399] border-[#059669] text-[#04352A]'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">العنوان <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={draft.title || ''}
              onChange={e => onChange({ ...draft, title: e.target.value })}
              placeholder="مثلاً: مرحبا في مضمونة 👋"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-[#059669]/40"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">النص <span className="text-red-500">*</span></label>
            <textarea
              value={draft.body || ''}
              onChange={e => onChange({ ...draft, body: e.target.value })}
              rows={3}
              maxLength={300}
              placeholder="رسالة قصيرة جذابة..."
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-[#059669]/40"
            />
            <p className="text-[10px] text-gray-400 mt-1">{(draft.body || '').length}/300</p>
          </div>

          {/* CTA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">نص الزرار (اختياري)</label>
              <input
                type="text"
                value={draft.cta_label || ''}
                onChange={e => onChange({ ...draft, cta_label: e.target.value || null })}
                placeholder="مثلاً: اكتشف المتاح"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-[#059669]/40"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">رابط الزرار (اختياري)</label>
              <input
                type="text"
                value={draft.cta_url || ''}
                onChange={e => onChange({ ...draft, cta_url: e.target.value || null })}
                placeholder="/marketplace أو https://..."
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-[#059669]/40 font-mono"
                dir="ltr"
                style={{ textAlign: 'left' }}
              />
            </div>
          </div>

          {/* Deal code */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">كود خصم (اختياري)</label>
            <input
              type="text"
              value={draft.deal_code || ''}
              onChange={e => onChange({ ...draft, deal_code: e.target.value || null })}
              placeholder="مثلاً: MADMONA20"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-[#059669]/40 font-mono"
            />
          </div>

          {/* Priority + Show once */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">الأولوية</label>
              <input
                type="number"
                value={draft.priority ?? 5}
                onChange={e => onChange({ ...draft, priority: Number(e.target.value) || 0 })}
                min={0}
                max={20}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-[#059669]/40"
              />
              <p className="text-[10px] text-gray-400 mt-1">أعلى = يظهر أكتر</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">مرة واحدة لكل يوزر؟</label>
              <button
                type="button"
                onClick={() => onChange({ ...draft, show_once_per_user: !draft.show_once_per_user })}
                className={`w-full px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                  draft.show_once_per_user
                    ? 'bg-purple-100 border-purple-300 text-purple-800'
                    : 'bg-gray-50 border-gray-200 text-gray-600'
                }`}
              >
                {draft.show_once_per_user ? '✓ مرة واحدة' : '↻ متكرر'}
              </button>
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> تبدأ من
              </label>
              <input
                type="date"
                value={draft.start_date || ''}
                onChange={e => onChange({ ...draft, start_date: e.target.value || null })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-[#059669]/40"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> تنتهي في
              </label>
              <input
                type="date"
                value={draft.end_date || ''}
                onChange={e => onChange({ ...draft, end_date: e.target.value || null })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-[#059669]/40"
              />
            </div>
          </div>

          {/* Active toggle */}
          <button
            type="button"
            onClick={() => onChange({ ...draft, is_active: !draft.is_active })}
            className={`w-full p-3 rounded-xl border-2 text-sm font-bold transition-all ${
              (draft.is_active ?? true)
                ? 'bg-green-50 border-green-300 text-green-800'
                : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}
          >
            {(draft.is_active ?? true) ? '✓ الرسالة نشطة' : '○ موقّفة'}
          </button>

          {/* Phase Ω (May 18 2026): push notification toggle + hour picker.
              When send_as_push=true, the message also fires as a web-push at push_hour Cairo time.
              Wired to broadcast_daily_message_push() RPC + madmona_daily_message_push cron. */}
          <div className="p-4 rounded-xl border-2 border-blue-200 bg-blue-50/40 space-y-3">
            <button
              type="button"
              onClick={() => onChange({ ...draft, send_as_push: !draft.send_as_push })}
              className={`w-full p-3 rounded-xl border-2 text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                draft.send_as_push
                  ? 'bg-blue-100 border-blue-400 text-blue-900'
                  : 'bg-white border-gray-200 text-gray-500'
              }`}
            >
              {draft.send_as_push ? '🔔 تتبعت كـ push notification' : '○ مفعلس push (بتظهر بس على الصفحة)'}
            </button>

            {draft.send_as_push && (
              <div>
                <label className="block text-xs font-bold text-blue-900 mb-1">تتبعت الساعة كام (بتوقيت القاهرة)؟</label>
                <select
                  value={draft.push_hour ?? 9}
                  onChange={e => onChange({ ...draft, push_hour: parseInt(e.target.value, 10) })}
                  className="w-full px-4 py-2.5 bg-white border border-blue-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{i.toString().padStart(2, '0')}:00 — {i < 12 ? `${i || 12} ص` : `${i - 12 || 12} م`}</option>
                  ))}
                </select>
                <p className="text-[10px] text-blue-800/70 mt-1.5">
                  💡 الرسالة هتوصل للـ 13 مشترك اللي مفعّلين push. لو الساعة فاتت النهاردة، هتتبعت بكرة وقتها.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !draft.title || !draft.body}
            className="flex-1 py-3 rounded-xl bg-[#34D399] hover:bg-[#34D399]/90 text-[#04352A] font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </div>
      </div>
    </div>
  )
}
