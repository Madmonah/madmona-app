'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  ArrowRight, Loader2, Lock, AlertCircle, Newspaper, Pin, PinOff,
  Eye, EyeOff, Trash2, Edit3, Save, CheckCircle, X, ShieldAlert,
  Plus, Filter, Image as ImageIcon, Upload, Link as LinkIcon,
  DollarSign, Home, Car, Briefcase, Plane, Sparkles, Camera, ShieldCheck,
} from 'lucide-react'

// ============================================================================
// /admin/news — Manage manually-curated news entries that show alongside RSS
// in the home page CompactNewsTabs widget.
// ============================================================================

type Stage = 'loading' | 'unauthenticated' | 'forbidden' | 'ready'

type Category = 'madmona' | 'economy' | 'real_estate' | 'automotive' | 'business' | 'tourism' | 'fashion' | 'tech'

interface AdminNewsRow {
  id: string
  title: string
  link: string | null
  image_url: string | null
  category: Category
  source_label: string | null
  is_pinned: boolean
  is_published: boolean
  sort_order: number
  pub_date: string
  created_at: string
}

const CATEGORIES: { id: Category; label: string; icon: React.ElementType; accent: string }[] = [
  { id: 'madmona',     label: 'أخبار مضمونة', icon: ShieldCheck, accent: '#2B4521' },
  { id: 'economy',     label: 'اقتصاد',      icon: DollarSign, accent: '#10b981' },
  { id: 'real_estate', label: 'عقارات',      icon: Home,       accent: '#2B4521' },
  { id: 'automotive',  label: 'سيارات',      icon: Car,        accent: '#3b82f6' },
  { id: 'business',    label: 'أعمال',       icon: Briefcase,  accent: '#2FA084' },
  { id: 'tourism',     label: 'سياحة',       icon: Plane,      accent: '#06b6d4' },
  { id: 'fashion',     label: 'موضة وأعراس', icon: Sparkles,   accent: '#ec4899' },
  { id: 'tech',        label: 'تكنولوجيا',   icon: Camera,     accent: '#a855f7' },
]

const EMPTY_FORM = {
  title: '',
  link: '',
  image_url: '',
  category: 'madmona' as Category,
  source_label: 'مضمونة',
  is_pinned: false,
  is_published: true,
}

export default function AdminNewsPage() {
  const [stage, setStage] = useState<Stage>('loading')
  const [items, setItems] = useState<AdminNewsRow[]>([])
  const [filter, setFilter] = useState<Category | 'all'>('all')
  const [editing, setEditing] = useState<AdminNewsRow | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { session } } = await supabaseBrowser.auth.getSession()
    if (!session?.user) { setStage('unauthenticated'); return }

    // @ts-expect-error
    const { data: prof } = await supabaseBrowser
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .maybeSingle()

    if (prof?.role !== 'admin') { setStage('forbidden'); return }

    await loadItems()
    setStage('ready')
  }

  const loadItems = async () => {
    // @ts-expect-error
    const { data } = await supabaseBrowser
      .from('admin_news')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('pub_date', { ascending: false })

    setItems((data || []) as AdminNewsRow[])
  }

  const showMsg = (ok: boolean, text: string) => {
    setMessage({ ok, text })
    setTimeout(() => setMessage(null), 4000)
  }

  const startNew = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const startEdit = (row: AdminNewsRow) => {
    setEditing(row)
    setForm({
      title: row.title,
      link: row.link || '',
      image_url: row.image_url || '',
      category: row.category,
      source_label: row.source_label || 'Madmona',
      is_pinned: row.is_pinned,
      is_published: row.is_published,
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelForm = () => {
    setShowForm(false)
    setEditing(null)
    setForm({ ...EMPTY_FORM })
  }

  const handleSave = async () => {
    if (!form.title.trim()) {
      showMsg(false, 'العنوان مطلوب')
      return
    }
    if (form.title.length > 300) {
      showMsg(false, 'العنوان طويل (max 300 حرف)')
      return
    }

    setSaving(true)
    const payload = {
      title: form.title.trim(),
      link: form.link.trim() || null,
      image_url: form.image_url.trim() || null,
      category: form.category,
      source_label: form.source_label.trim() || 'Madmona',
      is_pinned: form.is_pinned,
      is_published: form.is_published,
    }

    if (editing) {
      // @ts-expect-error
      const { error } = await supabaseBrowser
        .from('admin_news')
        .update(payload)
        .eq('id', editing.id)
      if (error) { showMsg(false, 'فشل الحفظ: ' + error.message); setSaving(false); return }
      showMsg(true, 'تم تحديث الخبر')
    } else {
      const { data: { user } } = await supabaseBrowser.auth.getUser()
      // @ts-expect-error
      const { error } = await supabaseBrowser
        .from('admin_news')
        .insert({ ...payload, created_by: user?.id, pub_date: new Date().toISOString() })
      if (error) { showMsg(false, 'فشل الإضافة: ' + error.message); setSaving(false); return }
      showMsg(true, 'تم إضافة الخبر')
    }

    await loadItems()
    cancelForm()
    setSaving(false)
  }

  const togglePin = async (row: AdminNewsRow) => {
    // @ts-expect-error
    const { error } = await supabaseBrowser
      .from('admin_news')
      .update({ is_pinned: !row.is_pinned })
      .eq('id', row.id)
    if (error) { showMsg(false, 'فشل: ' + error.message); return }
    await loadItems()
  }

  const togglePublished = async (row: AdminNewsRow) => {
    // @ts-expect-error
    const { error } = await supabaseBrowser
      .from('admin_news')
      .update({ is_published: !row.is_published })
      .eq('id', row.id)
    if (error) { showMsg(false, 'فشل: ' + error.message); return }
    await loadItems()
  }

  const handleDelete = async (row: AdminNewsRow) => {
    if (!confirm(`متأكد تحذف "${row.title.slice(0, 60)}..."؟`)) return
    // @ts-expect-error
    const { error } = await supabaseBrowser
      .from('admin_news')
      .delete()
      .eq('id', row.id)
    if (error) { showMsg(false, 'فشل الحذف: ' + error.message); return }
    showMsg(true, 'تم الحذف')
    await loadItems()
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const fileName = `news-${Date.now()}.${ext}`
      // @ts-expect-error
      const { error: upErr } = await supabaseBrowser.storage
        .from('site-assets')
        .upload(fileName, file, { cacheControl: '3600', upsert: false })
      if (upErr) { showMsg(false, 'فشل الرفع: ' + upErr.message); setUploading(false); return }
      const { data: urlData } = supabaseBrowser.storage.from('site-assets').getPublicUrl(fileName)
      setForm(prev => ({ ...prev, image_url: urlData.publicUrl }))
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : 'unknown'
      showMsg(false, m)
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const filtered = filter === 'all' ? items : items.filter(i => i.category === filter)

  if (stage === 'loading') {
    return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-6 h-6 text-[#2B4521] animate-spin" /></div>
  }
  if (stage === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl shadow-luxe p-8 text-center max-w-sm">
          <Lock className="w-8 h-8 text-[#2B4521] mx-auto mb-3" />
          <h1 className="font-bold mb-4">سجّل دخول الأول</h1>
          <Link href="/auth/login?redirect=/admin/news" className="block bg-[#2B4521] text-white py-3 rounded-xl font-semibold">دخول</Link>
        </div>
      </div>
    )
  }
  if (stage === 'forbidden') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl shadow-luxe p-8 text-center max-w-sm">
          <ShieldAlert className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <h1 className="font-bold mb-2">مش مسموح</h1>
          <p className="text-sm text-gray-600 mb-4">الصفحة دي للأدمن فقط.</p>
          <Link href="/account" className="inline-block bg-[#2B4521] text-white px-5 py-2.5 rounded-xl font-semibold">ارجع للحساب</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] pb-20" dir="rtl">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/admin/site-settings" className="w-9 h-9 bg-white shadow-soft hover:shadow-card hover:-translate-y-0.5 rounded-full flex items-center justify-center transition-all">
            <ArrowRight className="w-4 h-4 text-gray-700" />
          </Link>
          <div className="flex items-center gap-2 flex-1">
            <Newspaper className="w-5 h-5 text-[#2FA084]" />
            <h1 className="text-lg font-black text-gray-900">إدارة الأخبار</h1>
          </div>
          {!showForm && (
            <button onClick={startNew} className="flex items-center gap-1.5 px-4 py-2 bg-[#2B4521] text-white rounded-xl text-sm font-bold hover:bg-[#2B4521]/90 transition-colors">
              <Plus className="w-4 h-4" /> خبر جديد
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-gradient-to-l from-[#2B4521] to-[#5A6E3A] text-white rounded-3xl p-6 shadow-luxe">
          <h2 className="text-xl font-black mb-2">أخبار يدوية لـ Madmona</h2>
          <p className="text-sm text-white/85 leading-relaxed">
            من هنا تقدر تضيف أخبار خاصة بـ Madmona تظهر في الـ news widget على الصفحة الرئيسية.
            الأخبار اللي تثبتها (Pin) هتظهر فوق كل الـ RSS news تلقائياً.
          </p>
          <div className="mt-3 flex items-center gap-3 flex-wrap text-xs">
            <span className="bg-white/15 backdrop-blur px-2.5 py-1 rounded-full">{items.length} خبر</span>
            <span className="bg-white/15 backdrop-blur px-2.5 py-1 rounded-full">{items.filter(i => i.is_pinned).length} مثبت</span>
            <span className="bg-white/15 backdrop-blur px-2.5 py-1 rounded-full">{items.filter(i => i.is_published).length} منشور</span>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-2xl border flex items-start gap-2 ${message.ok ? 'bg-green-50 border-green-200 text-green-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
            {message.ok ? <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
            <p className="text-sm">{message.text}</p>
          </div>
        )}

        {showForm && (
          <div className="bg-white rounded-3xl shadow-soft p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-gray-900">{editing ? 'تعديل خبر' : 'إضافة خبر جديد'}</h2>
              <button onClick={cancelForm} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">العنوان *</label>
                <textarea
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="مثال: مضمونة تطلق قسم السياحة - شاليهات الساحل الشمالي"
                  rows={2}
                  className="w-full px-4 py-2.5 bg-[#FAFAF7] border border-gray-100 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-[#2B4521]/40 resize-none"
                />
                <p className="text-[10px] text-gray-400 mt-1">{form.title.length} / 300</p>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">التصنيف</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(c => {
                    const Icon = c.icon
                    const isActive = form.category === c.id
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, category: c.id }))}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${isActive ? 'bg-[#2B4521] text-white' : 'bg-[#FAFAF7] text-gray-700 hover:bg-gray-100'}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {c.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5 flex items-center gap-1"><LinkIcon className="w-3 h-3" /> رابط الخبر (اختياري)</label>
                <input
                  type="url"
                  value={form.link}
                  onChange={(e) => setForm(prev => ({ ...prev, link: e.target.value }))}
                  placeholder="https://madmonacairo.com/blog/..."
                  className="w-full px-4 py-2.5 bg-[#FAFAF7] border border-gray-100 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-[#2B4521]/40 font-mono"
                  dir="ltr"
                  style={{ textAlign: 'left' }}
                />
                <p className="text-[10px] text-gray-400 mt-1">لو فاضي، الخبر هيظهر بدون رابط (مش clickable)</p>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5 flex items-center gap-1"><ImageIcon className="w-3 h-3" /> صورة الخبر (اختياري)</label>
                <input
                  type="text"
                  value={form.image_url}
                  onChange={(e) => setForm(prev => ({ ...prev, image_url: e.target.value }))}
                  placeholder="https://... أو ارفع صورة من الكمبيوتر"
                  className="w-full px-4 py-2.5 bg-[#FAFAF7] border border-gray-100 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-[#2B4521]/40 font-mono mb-2"
                  dir="ltr"
                  style={{ textAlign: 'left' }}
                />
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-full px-4 py-2.5 bg-[#FAFAF7] hover:bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl text-sm font-bold text-gray-700 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {uploading ? (<><Loader2 className="w-4 h-4 animate-spin" /> جاري الرفع...</>) : (<><Upload className="w-4 h-4" /> ارفع صورة من الكمبيوتر</>)}
                </button>
                <p className="text-[10px] text-gray-400 mt-1">لو فاضي، الخبر هيستخدم صورة Madmona-branded تلقائياً</p>
                {form.image_url && (
                  <div className="mt-2 w-full max-w-xs aspect-[16/10] rounded-xl overflow-hidden bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.image_url} alt="preview" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">اسم المصدر</label>
                <input
                  type="text"
                  value={form.source_label}
                  onChange={(e) => setForm(prev => ({ ...prev, source_label: e.target.value }))}
                  placeholder="Madmona"
                  className="w-full px-4 py-2.5 bg-[#FAFAF7] border border-gray-100 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-[#2B4521]/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, is_pinned: !prev.is_pinned }))}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all ${form.is_pinned ? 'bg-[#2FA084] text-white' : 'bg-[#FAFAF7] text-gray-700 hover:bg-gray-100'}`}
                >
                  {form.is_pinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
                  {form.is_pinned ? 'مثبت في الأعلى' : 'غير مثبت'}
                </button>
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, is_published: !prev.is_published }))}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all ${form.is_published ? 'bg-green-600 text-white' : 'bg-[#FAFAF7] text-gray-700 hover:bg-gray-100'}`}
                >
                  {form.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  {form.is_published ? 'منشور' : 'مسودة'}
                </button>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !form.title.trim()}
                  className="flex-1 px-4 py-3 bg-[#2B4521] hover:bg-[#2B4521]/90 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? (<><Loader2 className="w-4 h-4 animate-spin" /> جاري الحفظ...</>) : (<><Save className="w-4 h-4" /> {editing ? 'تحديث' : 'إضافة'}</>)}
                </button>
                <button
                  onClick={cancelForm}
                  className="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button onClick={() => setFilter('all')} className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filter === 'all' ? 'bg-[#2B4521] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            <Filter className="w-3 h-3 inline-block ml-1" /> الكل ({items.length})
          </button>
          {CATEGORIES.map(c => {
            const count = items.filter(i => i.category === c.id).length
            return (
              <button key={c.id} onClick={() => setFilter(c.id)} className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filter === c.id ? 'bg-[#2B4521] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                {c.label} ({count})
              </button>
            )
          })}
        </div>

        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center shadow-soft">
              <Newspaper className="w-10 h-10 mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-500 mb-4">لسه مفيش أخبار {filter !== 'all' ? `في "${CATEGORIES.find(c => c.id === filter)?.label}"` : ''}</p>
              <button onClick={startNew} className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2B4521] text-white rounded-xl text-sm font-bold">
                <Plus className="w-4 h-4" /> أضف أول خبر
              </button>
            </div>
          ) : (
            filtered.map(row => {
              const cat = CATEGORIES.find(c => c.id === row.category)
              const Icon = cat?.icon || Newspaper
              return (
                <div key={row.id} className={`bg-white rounded-2xl shadow-soft p-4 flex items-stretch gap-3 ${!row.is_published ? 'opacity-60' : ''}`}>
                  <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 relative">
                    {row.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.image_url} alt={row.title} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#2B4521]">
                        <Icon className="w-6 h-6 text-[#2FA084]" />
                      </div>
                    )}
                    {row.is_pinned && (
                      <div className="absolute top-1 right-1 bg-[#2FA084] rounded-full w-5 h-5 flex items-center justify-center">
                        <Pin className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ background: `${cat?.accent}22`, color: cat?.accent }}>
                        {cat?.label}
                      </span>
                      <span className="text-[10px] text-gray-500">{row.source_label}</span>
                      {!row.is_published && <span className="text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded font-bold">مسودة</span>}
                    </div>
                    <h3 className="font-bold text-sm text-gray-900 leading-snug line-clamp-2">{row.title}</h3>
                    <p className="text-[10px] text-gray-400 mt-1">{new Date(row.pub_date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>

                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button onClick={() => togglePin(row)} title={row.is_pinned ? 'إلغاء التثبيت' : 'تثبيت في الأعلى'} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-600">
                      {row.is_pinned ? <Pin className="w-4 h-4 text-[#2FA084]" /> : <PinOff className="w-4 h-4" />}
                    </button>
                    <button onClick={() => togglePublished(row)} title={row.is_published ? 'إخفاء' : 'نشر'} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-600">
                      {row.is_published ? <Eye className="w-4 h-4 text-green-600" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button onClick={() => startEdit(row)} title="تعديل" className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-600">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(row)} title="حذف" className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}
