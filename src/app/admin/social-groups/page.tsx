// app/admin/social-groups/page.tsx
// Madmona Admin — Social Groups catalog
// Replace placeholder Facebook group URLs with real ones, add new groups per category.

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Group = {
  id: string
  category_slug: string
  platform: string
  group_name: string
  group_url: string
  members_count: number | null
  posting_rules: string | null
  notes: string | null
  is_active: boolean
  added_by: string | null
  created_at: string
}

const CATEGORY_NAMES_AR: Record<string, string> = {
  properties: 'عقارات للإيجار',
  vehicles: 'مركبات ونقل',
  workspaces: 'مساحات عمل',
  tourism: 'السياحة',
  weddings: 'أعراس وتجهيزات',
  media: 'معدات ميديا',
  recreation: 'ترفيه ورياضة',
  marine: 'مركبات بحرية',
  equipment: 'معدات ثقيلة',
  professionals: 'خدمات احترافية',
}

const ALL_CATS = Object.keys(CATEGORY_NAMES_AR)

export default function SocialGroupsAdmin() {
  const [groups, setGroups] = useState<Group[]>([])
  const [stats, setStats] = useState<Record<string, { total: number; real: number; placeholder: number }>>({})
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Form state for add/edit
  const [form, setForm] = useState({
    category_slug: 'properties',
    group_name: '',
    group_url: '',
    members_count: '',
    posting_rules: '',
    notes: '',
    platform: 'facebook',
  })

  const refresh = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/social-groups', { cache: 'no-store' })
      const d = await r.json()
      setGroups(d.groups || [])
      setStats(d.stats || {})
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const resetForm = () => {
    setForm({ category_slug: 'properties', group_name: '', group_url: '', members_count: '', posting_rules: '', notes: '', platform: 'facebook' })
    setShowAdd(false)
    setEditing(null)
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const saveNew = async () => {
    if (!form.group_name || !form.group_url) {
      showToast('اسم الجروب والرابط مطلوبين')
      return
    }
    try {
      const r = await fetch('/api/admin/social-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          members_count: form.members_count ? Number(form.members_count) : null,
        }),
      })
      const d = await r.json()
      if (r.ok) {
        showToast('اتضاف ✓')
        resetForm()
        await refresh()
      } else {
        showToast('خطأ: ' + d.error)
      }
    } catch (err) {
      showToast('فشل')
    }
  }

  const saveEdit = async (id: string) => {
    try {
      const r = await fetch(`/api/admin/social-groups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          members_count: form.members_count ? Number(form.members_count) : null,
        }),
      })
      if (r.ok) {
        showToast('اتعدّل ✓')
        resetForm()
        await refresh()
      } else {
        showToast('فشل التعديل')
      }
    } catch (err) {
      showToast('فشل')
    }
  }

  const toggleActive = async (g: Group) => {
    try {
      await fetch(`/api/admin/social-groups/${g.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !g.is_active }),
      })
      await refresh()
    } catch (err) {
      showToast('فشل')
    }
  }

  const deleteGroup = async (id: string) => {
    if (!confirm('متأكد تمسح الجروب ده؟')) return
    try {
      await fetch(`/api/admin/social-groups/${id}`, { method: 'DELETE' })
      showToast('اتمسح')
      await refresh()
    } catch (err) {
      showToast('فشل')
    }
  }

  const startEdit = (g: Group) => {
    setForm({
      category_slug: g.category_slug,
      group_name: g.group_name,
      group_url: g.group_url,
      members_count: g.members_count?.toString() || '',
      posting_rules: g.posting_rules || '',
      notes: g.notes || '',
      platform: g.platform,
    })
    setEditing(g.id)
    setShowAdd(false)
  }

  const filtered = categoryFilter ? groups.filter((g) => g.category_slug === categoryFilter) : groups
  const totalReal = Object.values(stats).reduce((acc, s) => acc + s.real, 0)
  const totalPlaceholder = Object.values(stats).reduce((acc, s) => acc + s.placeholder, 0)

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/admin/social-packs" className="text-xs text-gray-500 hover:text-gray-700 no-underline">
              ← Social Packs
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">إدارة جروبات السوشيال</h1>
            <p className="text-sm text-gray-600 mt-1">
              الـ packs بتقترح جروبات حسب التصنيف. ضيف URLs حقيقية بدل الـ placeholders.
            </p>
          </div>
          <button
            onClick={() => {
              setShowAdd(true)
              setEditing(null)
            }}
            className="bg-[#FA8125] text-white px-5 py-2.5 rounded-xl font-bold shadow-sm hover:shadow-md"
          >
            + ضيف جروب
          </button>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-xl p-4 mb-6 shadow-sm">
          <div className="flex items-center justify-between text-sm">
            <div className="flex gap-6">
              <span>
                <span className="font-bold text-green-700">{totalReal}</span>{' '}
                <span className="text-gray-500">جروب حقيقي</span>
              </span>
              <span>
                <span className="font-bold text-amber-600">{totalPlaceholder}</span>{' '}
                <span className="text-gray-500">placeholder محتاج تعديل</span>
              </span>
            </div>
            {totalPlaceholder > 0 && (
              <p className="text-xs text-amber-600">⚠️ استبدل الـ placeholders بـ URLs حقيقية</p>
            )}
          </div>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setCategoryFilter(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${
              !categoryFilter ? 'bg-[#FA8125] text-white' : 'bg-white border border-gray-300 text-gray-700'
            }`}
          >
            الكل ({groups.length})
          </button>
          {ALL_CATS.map((cat) => {
            const count = stats[cat]?.total || 0
            const placeholders = stats[cat]?.placeholder || 0
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat === categoryFilter ? null : cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                  categoryFilter === cat ? 'bg-[#FA8125] text-white' : 'bg-white border border-gray-300 text-gray-700'
                }`}
              >
                {CATEGORY_NAMES_AR[cat]} ({count}){placeholders > 0 && <span className="text-amber-500"> ⚠</span>}
              </button>
            )
          })}
        </div>

        {/* Toast */}
        {toast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-2.5 rounded-xl shadow-lg z-50 text-sm font-medium">
            {toast}
          </div>
        )}

        {/* Add/Edit form */}
        {(showAdd || editing) && (
          <div className="bg-white rounded-xl shadow-sm p-5 mb-6 border-2 border-[#FA8125]">
            <h2 className="font-bold text-gray-900 mb-3">{editing ? 'تعديل جروب' : 'جروب جديد'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600 font-medium block mb-1">التصنيف</label>
                <select
                  value={form.category_slug}
                  onChange={(e) => setForm({ ...form, category_slug: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {ALL_CATS.map((c) => (
                    <option key={c} value={c}>{CATEGORY_NAMES_AR[c]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 font-medium block mb-1">المنصة</label>
                <select
                  value={form.platform}
                  onChange={(e) => setForm({ ...form, platform: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="facebook">Facebook</option>
                  <option value="telegram">Telegram</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="reddit">Reddit</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600 font-medium block mb-1">اسم الجروب *</label>
                <input
                  value={form.group_name}
                  onChange={(e) => setForm({ ...form, group_name: e.target.value })}
                  placeholder="مثال: إيجارات شقق القاهرة الكبرى"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600 font-medium block mb-1">رابط الجروب *</label>
                <input
                  value={form.group_url}
                  onChange={(e) => setForm({ ...form, group_url: e.target.value })}
                  placeholder="https://facebook.com/groups/..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 font-medium block mb-1">عدد الأعضاء</label>
                <input
                  type="number"
                  value={form.members_count}
                  onChange={(e) => setForm({ ...form, members_count: e.target.value })}
                  placeholder="50000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 font-medium block mb-1">قواعد النشر</label>
                <input
                  value={form.posting_rules}
                  onChange={(e) => setForm({ ...form, posting_rules: e.target.value })}
                  placeholder="مثال: ممنوع الروابط في البوست"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600 font-medium block mb-1">ملاحظات</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => (editing ? saveEdit(editing) : saveNew())}
                className="px-5 py-2 bg-[#FA8125] text-white rounded-lg font-bold text-sm hover:opacity-90"
              >
                {editing ? 'حفظ التعديل' : 'إضافة'}
              </button>
              <button
                onClick={resetForm}
                className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        {/* Groups list */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">جاري التحميل...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-400">مفيش جروبات</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map((g) => {
                const isPlaceholder = g.group_url.includes('PLACEHOLDER')
                return (
                  <div key={g.id} className={`p-4 ${!g.is_active ? 'opacity-50' : ''}`}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                            {CATEGORY_NAMES_AR[g.category_slug] || g.category_slug}
                          </span>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            {g.platform}
                          </span>
                          {isPlaceholder && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                              ⚠ placeholder
                            </span>
                          )}
                          {g.members_count && (
                            <span className="text-xs text-gray-500">{g.members_count.toLocaleString()} عضو</span>
                          )}
                        </div>
                        <p className="font-bold text-gray-900">{g.group_name}</p>
                        <a
                          href={g.group_url}
                          target="_blank"
                          className={`text-xs no-underline ${
                            isPlaceholder ? 'text-amber-600' : 'text-[#FA8125]'
                          } hover:underline break-all`}
                          dir="ltr"
                        >
                          {g.group_url}
                        </a>
                        {g.posting_rules && (
                          <p className="text-xs text-amber-700 mt-1">⚠️ {g.posting_rules}</p>
                        )}
                        {g.notes && <p className="text-xs text-gray-500 mt-1">📝 {g.notes}</p>}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => startEdit(g)}
                          className="text-xs px-3 py-1.5 bg-[#FA8125] text-white rounded-lg font-medium hover:opacity-90"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => toggleActive(g)}
                          className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                        >
                          {g.is_active ? 'إخفاء' : 'تفعيل'}
                        </button>
                        <button
                          onClick={() => deleteGroup(g.id)}
                          className="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          مسح
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
