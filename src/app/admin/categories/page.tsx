'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import {
  Lock, RefreshCw, LogOut, ArrowRight, Plus, Edit2, Trash2,
  ChevronDown, ChevronLeft, Save, X, Tag, AlertCircle, FolderPlus,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

type FieldType = 'text' | 'number' | 'boolean' | 'select' | 'multi_select' | 'date' | 'file'

interface Category {
  id: string
  parent_id: string | null
  name_ar: string
  name_en: string | null
  slug: string
  description: string | null
  icon: string | null
  display_order: number
  is_active: boolean
}

interface Attribute {
  id: string
  category_id: string
  name_ar: string
  name_en: string | null
  field_key: string
  field_type: FieldType
  options: { key: string; label_ar?: string; label_en?: string }[]
  unit: string | null
  is_required: boolean
  is_filterable: boolean
  display_order: number
}

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'نص',
  number: 'رقم',
  boolean: 'نعم/لا',
  select: 'اختيار واحد',
  multi_select: 'اختيار متعدد',
  date: 'تاريخ',
  file: 'ملف',
}

// ============================================================================
// Page
// ============================================================================

export default function AdminCategoriesPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [attrsByCategory, setAttrsByCategory] = useState<Record<string, Attribute[]>>({})
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [showCatForm, setShowCatForm] = useState<{ parentId: string | null; editId?: string } | null>(null)
  const [showAttrForm, setShowAttrForm] = useState<{ categoryId: string; editId?: string } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    const stored = sessionStorage.getItem('madmona_admin_pw')
    if (stored) {
      setPassword(stored)
      tryFetch(stored, true)
    }
  }, [])

  const tryFetch = async (pw: string, silent = false) => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/categories', {
        headers: { 'X-Admin-Password': pw },
      })
      if (res.status === 401) {
        if (!silent) setAuthError('كلمة السر غلط')
        sessionStorage.removeItem('madmona_admin_pw')
        setAuthed(false)
        return
      }
      if (!res.ok) return
      const data = await res.json()
      setCategories(data.categories || [])
      setAuthed(true)
      sessionStorage.setItem('madmona_admin_pw', pw)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setAuthError('')
    tryFetch(password)
  }

  const handleLogout = () => {
    sessionStorage.removeItem('madmona_admin_pw')
    setAuthed(false)
    setPassword('')
    setCategories([])
  }

  const loadAttributes = async (categoryId: string) => {
    if (attrsByCategory[categoryId]) return
    try {
      const res = await fetch(`/api/admin/categories/${categoryId}/attributes`, {
        headers: { 'X-Admin-Password': password },
      })
      if (!res.ok) return
      const data = await res.json()
      setAttrsByCategory(prev => ({ ...prev, [categoryId]: data.attributes || [] }))
    } catch (e) {
      console.error(e)
    }
  }

  const toggleExpand = (categoryId: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
        loadAttributes(categoryId)
      }
      return next
    })
  }

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  const saveCategory = async (form: Partial<Category>, editId?: string) => {
    setErrorMsg('')
    const url = editId ? `/api/admin/categories/${editId}` : '/api/admin/categories'
    const method = editId ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setErrorMsg(data.error || 'حصل خطأ في الحفظ')
      return false
    }
    setShowCatForm(null)
    showSuccess(editId ? 'تم تعديل الفئة' : 'تم إضافة الفئة')

    // Auto-expand parent if we just added a child
    if (form.parent_id) {
      setExpanded(prev => {
        const next = new Set(prev)
        next.add(form.parent_id!)
        return next
      })
    }
    await tryFetch(password, true)
    return true
  }

  const deleteCategory = async (id: string) => {
    if (!confirm('متأكد إنك عاوز تمسح الفئة دي؟')) return
    setErrorMsg('')
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Password': password },
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setErrorMsg(data.error || 'مينفعش تتمسح')
      return
    }
    showSuccess('تم حذف الفئة')
    await tryFetch(password, true)
  }

  const saveAttribute = async (form: Partial<Attribute>, categoryId: string, editId?: string) => {
    setErrorMsg('')
    const url = editId
      ? `/api/admin/attributes/${editId}`
      : `/api/admin/categories/${categoryId}/attributes`
    const method = editId ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setErrorMsg(data.error || 'حصل خطأ')
      return false
    }
    setShowAttrForm(null)
    showSuccess(editId ? 'تم تعديل الخاصية' : 'تم إضافة الخاصية')
    setAttrsByCategory(prev => {
      const next = { ...prev }
      delete next[categoryId]
      return next
    })
    await loadAttributes(categoryId)
    return true
  }

  const deleteAttribute = async (id: string, categoryId: string) => {
    if (!confirm('مسح الخاصية دي؟')) return
    const res = await fetch(`/api/admin/attributes/${id}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Password': password },
    })
    if (!res.ok) return
    showSuccess('تم حذف الخاصية')
    setAttrsByCategory(prev => {
      const next = { ...prev }
      delete next[categoryId]
      return next
    })
    await loadAttributes(categoryId)
  }

  if (!authed) {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-luxe p-8">
          <div className="flex items-center justify-center w-12 h-12 bg-[#34D399]/10 rounded-2xl mb-4 mx-auto">
            <Lock className="w-5 h-5 text-[#059669]" />
          </div>
          <h1 className="text-xl font-black text-gray-900 text-center mb-1">إدارة الفئات والخصائص</h1>
          <p className="text-sm text-gray-500 text-center mb-6">إدخال كلمة السر للوصول</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="كلمة السر"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#059669]/30 focus:border-[#059669] text-right"
              autoFocus
            />
            {authError && <p className="text-sm text-red-600 text-center">{authError}</p>}
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-[#34D399] text-[#04352A] py-3 rounded-xl font-bold hover:bg-[#34D399]/90 disabled:opacity-50"
            >
              {loading ? 'جاري التحقق...' : 'دخول'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  const roots = categories.filter(c => !c.parent_id).sort((a, b) => a.display_order - b.display_order)
  const childrenOf = (parentId: string) =>
    categories.filter(c => c.parent_id === parentId).sort((a, b) => a.display_order - b.display_order)

  return (
    <div className="min-h-screen gradient-mesh" dir="rtl">
      <header className="bg-white/90 backdrop-blur border-b border-gray-100 sticky top-0 z-40 shadow-soft">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="w-9 h-9 hover:bg-gray-50 rounded-full flex items-center justify-center">
              <ArrowRight className="w-4 h-4 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-lg font-black text-gray-900">الفئات والخصائص</h1>
              <p className="text-xs text-gray-500 mt-0.5">{categories.length} فئة · {roots.length} رئيسية</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => tryFetch(password)}
              disabled={loading}
              className="p-2 hover:bg-gray-50 rounded-full"
              aria-label="تحديث"
            >
              <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={handleLogout} className="p-2 hover:bg-gray-50 rounded-full" aria-label="خروج">
              <LogOut className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 pb-12">
        {/* Toast messages */}
        {successMsg && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-900 animate-scale-in">
            <span className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">✓</span>
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-900">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="flex-1">{errorMsg}</span>
            <button onClick={() => setErrorMsg('')}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Help card */}
        <div className="mb-4 p-4 bg-gradient-to-l from-[#34D399]/5 to-transparent border border-[#059669]/10 rounded-2xl text-xs text-gray-700 leading-relaxed">
          💡 <strong className="text-[#059669]">إزاي تستعمل الصفحة:</strong>
          <br />• اضغط <strong>السهم</strong> لفتح أي فئة وشوف فئاتها الفرعية والخصائص.
          <br />• <strong>زرار &quot;+ ضيف فئة فرعية&quot;</strong> داخل الفئة المفتوحة بيضيف فئة فرعية تحتها.
          <br />• كل فئة فرعية ممكن يكون عندها خصائصها (specs زي السعة، الحمولة، إلخ).
        </div>

        {/* Add root category button */}
        <div className="mb-4">
          <button
            onClick={() => setShowCatForm({ parentId: null })}
            className="flex items-center gap-2 px-5 py-3 bg-[#34D399] text-[#04352A] rounded-2xl text-sm font-bold hover:bg-[#34D399]/90 shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            ضيف فئة رئيسية جديدة
          </button>
        </div>

        {showCatForm && showCatForm.parentId === null && !showCatForm.editId && (
          <div className="mb-4 p-4 bg-white rounded-2xl border-2 border-[#059669]/20 shadow-card">
            <h3 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-[#059669]" /> فئة رئيسية جديدة
            </h3>
            <CategoryForm
              parentId={null}
              initial={null}
              onCancel={() => setShowCatForm(null)}
              onSave={(form) => saveCategory(form)}
            />
          </div>
        )}

        {/* Categories tree */}
        {roots.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-white rounded-2xl shadow-soft">
            مفيش فئات لسه
          </div>
        ) : (
          <div className="space-y-3">
            {roots.map(root => (
              <CategoryNode
                key={root.id}
                category={root}
                children={childrenOf(root.id)}
                attrs={attrsByCategory[root.id]}
                isExpanded={expanded.has(root.id)}
                onToggle={() => toggleExpand(root.id)}
                onAddChild={() => setShowCatForm({ parentId: root.id })}
                onEdit={() => setShowCatForm({ parentId: root.parent_id, editId: root.id })}
                onDelete={() => deleteCategory(root.id)}
                onAddAttribute={() => setShowAttrForm({ categoryId: root.id })}
                onEditAttribute={(attrId) => setShowAttrForm({ categoryId: root.id, editId: attrId })}
                onDeleteAttribute={(attrId) => deleteAttribute(attrId, root.id)}
                renderChild={(child) => (
                  <CategoryNode
                    key={child.id}
                    category={child}
                    children={childrenOf(child.id)}
                    attrs={attrsByCategory[child.id]}
                    isExpanded={expanded.has(child.id)}
                    onToggle={() => toggleExpand(child.id)}
                    onAddChild={() => setShowCatForm({ parentId: child.id })}
                    onEdit={() => setShowCatForm({ parentId: child.parent_id, editId: child.id })}
                    onDelete={() => deleteCategory(child.id)}
                    onAddAttribute={() => setShowAttrForm({ categoryId: child.id })}
                    onEditAttribute={(attrId) => setShowAttrForm({ categoryId: child.id, editId: attrId })}
                    onDeleteAttribute={(attrId) => deleteAttribute(attrId, child.id)}
                    isChild
                    showCatForm={showCatForm}
                    showAttrForm={showAttrForm}
                    onCatFormSave={saveCategory}
                    onCatFormCancel={() => setShowCatForm(null)}
                    onAttrFormSave={saveAttribute}
                    onAttrFormCancel={() => setShowAttrForm(null)}
                  />
                )}
                showCatForm={showCatForm}
                showAttrForm={showAttrForm}
                onCatFormSave={saveCategory}
                onCatFormCancel={() => setShowCatForm(null)}
                onAttrFormSave={saveAttribute}
                onAttrFormCancel={() => setShowAttrForm(null)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

// ============================================================================
// Category node component
// ============================================================================

interface CategoryNodeProps {
  category: Category
  children: Category[]
  attrs: Attribute[] | undefined
  isExpanded: boolean
  isChild?: boolean
  onToggle: () => void
  onAddChild: () => void
  onEdit: () => void
  onDelete: () => void
  onAddAttribute: () => void
  onEditAttribute: (id: string) => void
  onDeleteAttribute: (id: string) => void
  renderChild?: (child: Category) => React.ReactNode
  showCatForm: { parentId: string | null; editId?: string } | null
  showAttrForm: { categoryId: string; editId?: string } | null
  onCatFormSave: (form: Partial<Category>, editId?: string) => Promise<boolean>
  onCatFormCancel: () => void
  onAttrFormSave: (form: Partial<Attribute>, categoryId: string, editId?: string) => Promise<boolean>
  onAttrFormCancel: () => void
}

function CategoryNode(props: CategoryNodeProps) {
  const { category, children, attrs, isExpanded, isChild, onToggle, onAddChild, onEdit, onDelete,
    onAddAttribute, onEditAttribute, onDeleteAttribute, renderChild,
    showCatForm, showAttrForm, onCatFormSave, onCatFormCancel, onAttrFormSave, onAttrFormCancel } = props

  const isEditing = showCatForm?.editId === category.id
  const isAddingChildHere = showCatForm?.parentId === category.id && !showCatForm.editId
  const isAddingAttrHere = showAttrForm?.categoryId === category.id && !showAttrForm.editId

  return (
    <div className={`bg-white rounded-2xl shadow-soft hover:shadow-card transition-all ${isChild ? 'mr-6 mt-2 border border-gray-100' : ''}`}>
      {/* Header row */}
      <div className="flex items-center gap-2 p-3">
        <button onClick={onToggle} className="p-1.5 hover:bg-gray-50 rounded-lg flex-shrink-0">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
        <span className="text-2xl">{category.icon || '📁'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-gray-900 truncate">{category.name_ar}</h3>
            {children.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 bg-[#34D399]/10 text-[#059669] rounded-full font-bold">
                {children.length} فرعية
              </span>
            )}
            {category.name_en && (
              <span className="text-xs text-gray-400 truncate">{category.name_en}</span>
            )}
          </div>
          <p className="text-xs text-gray-500 truncate" dir="ltr">{category.slug}</p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={onEdit} className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-600" title="تعديل">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 hover:bg-red-50 rounded-lg text-red-600" title="حذف">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Edit form (inline replaces the row) */}
      {isEditing && (
        <div className="border-t border-gray-100 p-4 bg-gradient-to-l from-[#34D399]/5 to-transparent">
          <h4 className="text-xs font-bold text-[#059669] mb-3 flex items-center gap-1.5">
            <Edit2 className="w-3.5 h-3.5" /> تعديل الفئة
          </h4>
          <CategoryForm
            parentId={category.parent_id}
            initial={category}
            onCancel={onCatFormCancel}
            onSave={(form) => onCatFormSave(form, category.id)}
          />
        </div>
      )}

      {/* Expanded section: children + add subcategory + attributes */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50/40 space-y-4">
          {/* Sub-categories */}
          {children.length > 0 && (
            <div>
              <h4 className="text-xs font-black text-gray-700 mb-2 px-1 flex items-center gap-1.5">
                <FolderPlus className="w-3.5 h-3.5 text-[#059669]" />
                الفئات الفرعية ({children.length})
              </h4>
              <div className="space-y-2">
                {children.map(child => renderChild?.(child))}
              </div>
            </div>
          )}

          {/* BIG, OBVIOUS "Add Subcategory" button */}
          {!isAddingChildHere && (
            <button
              onClick={onAddChild}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white border-2 border-dashed border-[#059669]/30 hover:border-[#059669]/60 hover:bg-[#34D399]/5 rounded-2xl text-sm font-bold text-[#059669] transition-all"
            >
              <FolderPlus className="w-4 h-4" />
              + ضيف فئة فرعية تحت &quot;{category.name_ar}&quot;
            </button>
          )}

          {/* Inline form for adding child here */}
          {isAddingChildHere && (
            <div className="p-4 bg-white rounded-2xl border-2 border-[#059669]/20 shadow-card">
              <h4 className="text-sm font-black text-[#059669] mb-3 flex items-center gap-1.5">
                <FolderPlus className="w-4 h-4" />
                فئة فرعية جديدة تحت &quot;{category.name_ar}&quot;
              </h4>
              <CategoryForm
                parentId={category.id}
                initial={null}
                onCancel={onCatFormCancel}
                onSave={(form) => onCatFormSave(form)}
              />
            </div>
          )}

          {/* Attributes section */}
          <div className="pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between mb-2 px-1">
              <h4 className="text-xs font-black text-gray-700 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#2FA084]" />
                الخصائص (Specs) {attrs ? `(${attrs.length})` : ''}
              </h4>
              <button
                onClick={onAddAttribute}
                className="text-xs text-[#2FA084] font-bold hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                ضيف خاصية
              </button>
            </div>

            {isAddingAttrHere && (
              <div className="mb-2 p-4 bg-white rounded-2xl border-2 border-[#2FA084]/20 shadow-card">
                <h4 className="text-sm font-black text-[#2FA084] mb-3">خاصية جديدة</h4>
                <AttributeForm
                  initial={null}
                  onCancel={onAttrFormCancel}
                  onSave={(form) => onAttrFormSave(form, category.id)}
                />
              </div>
            )}

            {attrs === undefined ? (
              <p className="text-xs text-gray-400 px-1">جاري التحميل...</p>
            ) : attrs.length === 0 && !isAddingAttrHere ? (
              <p className="text-xs text-gray-400 px-1 italic">مفيش خصائص للفئة دي. الخصائص اختيارية.</p>
            ) : (
              <div className="space-y-1.5">
                {attrs.map(attr => {
                  const isEditingAttr = showAttrForm?.editId === attr.id
                  if (isEditingAttr) {
                    return (
                      <div key={attr.id} className="p-4 bg-white rounded-2xl border-2 border-[#2FA084]/20 shadow-card">
                        <h4 className="text-sm font-black text-[#2FA084] mb-3">تعديل خاصية</h4>
                        <AttributeForm
                          initial={attr}
                          onCancel={onAttrFormCancel}
                          onSave={(form) => onAttrFormSave(form, category.id, attr.id)}
                        />
                      </div>
                    )
                  }
                  return (
                    <div key={attr.id} className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-gray-100">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-gray-900">{attr.name_ar}</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-[#2FA084]/10 text-[#2FA084] rounded font-bold">
                            {FIELD_TYPE_LABELS[attr.field_type]}
                          </span>
                          {attr.is_required && (
                            <span className="text-[10px] text-red-600 font-bold">إلزامي</span>
                          )}
                          {attr.unit && (
                            <span className="text-xs text-gray-400">({attr.unit})</span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500" dir="ltr">{attr.field_key}</p>
                      </div>
                      <button onClick={() => onEditAttribute(attr.id)} className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-600">
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button onClick={() => onDeleteAttribute(attr.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-600">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Category Form
// ============================================================================

function CategoryForm({
  parentId,
  initial,
  onCancel,
  onSave,
}: {
  parentId: string | null
  initial: Category | null
  onCancel: () => void
  onSave: (form: Partial<Category>) => Promise<boolean>
}) {
  const [nameAr, setNameAr] = useState(initial?.name_ar || '')
  const [nameEn, setNameEn] = useState(initial?.name_en || '')
  const [slug, setSlug] = useState(initial?.slug || '')
  const [icon, setIcon] = useState(initial?.icon || '')
  const [displayOrder, setDisplayOrder] = useState(initial?.display_order ?? 0)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!initial && nameEn && !slug) {
      setSlug(nameEn.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, ''))
    }
  }, [nameEn, initial, slug])

  // Auto-generate slug from Arabic name if no English (for sub-categories)
  useEffect(() => {
    if (!initial && nameAr && !nameEn && !slug) {
      // Use a transliteration-friendly fallback
      const fallback = nameAr
        .replace(/[^\u0600-\u06FFa-zA-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50)
      if (fallback) setSlug(`cat-${Date.now().toString(36).slice(-6)}`)
    }
  }, [nameAr, nameEn, initial, slug])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    const form: Partial<Category> = {
      name_ar: nameAr,
      slug,
      display_order: displayOrder,
    }
    if (parentId) form.parent_id = parentId
    if (nameEn) form.name_en = nameEn
    if (icon) form.icon = icon
    await onSave(form)
    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">الاسم بالعربي *</label>
          <input
            type="text"
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
            required
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]/30 focus:border-[#059669]"
            placeholder="مثلاً: مكتب فردي"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Name (English)</label>
          <input
            type="text"
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]/30"
            placeholder="Hot desk"
            dir="ltr"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Slug *</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
            required
            pattern="[a-z0-9-]+"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]/30"
            placeholder="hot-desk"
            dir="ltr"
          />
          <p className="text-[10px] text-gray-400 mt-1">URL-friendly، حروف إنجليزية صغيرة و-</p>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">الأيقونة (Emoji)</label>
          <input
            type="text"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            maxLength={4}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]/30"
            placeholder="🪑"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">الترتيب</label>
          <input
            type="number"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(Number(e.target.value))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]/30"
          />
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={submitting || !nameAr || !slug}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-[#34D399] text-[#04352A] rounded-xl text-sm font-bold hover:bg-[#34D399]/90 disabled:opacity-50 shadow-soft hover:shadow-card transition-all"
        >
          <Save className="w-4 h-4" />
          {submitting ? 'جاري الحفظ...' : 'حفظ'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200"
        >
          إلغاء
        </button>
      </div>
    </form>
  )
}

// ============================================================================
// Attribute Form
// ============================================================================

function AttributeForm({
  initial,
  onCancel,
  onSave,
}: {
  initial: Attribute | null
  onCancel: () => void
  onSave: (form: Partial<Attribute>) => Promise<boolean>
}) {
  const [nameAr, setNameAr] = useState(initial?.name_ar || '')
  const [nameEn, setNameEn] = useState(initial?.name_en || '')
  const [fieldKey, setFieldKey] = useState(initial?.field_key || '')
  const [fieldType, setFieldType] = useState<FieldType>(initial?.field_type || 'text')
  const [unit, setUnit] = useState(initial?.unit || '')
  const [isRequired, setIsRequired] = useState(initial?.is_required ?? false)
  const [displayOrder, setDisplayOrder] = useState(initial?.display_order ?? 0)
  const [options, setOptions] = useState<{ key: string; label_ar: string }[]>(
    (initial?.options || []).map(o => ({ key: o.key, label_ar: o.label_ar || o.key }))
  )
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!initial && nameEn && !fieldKey) {
      setFieldKey(nameEn.toLowerCase().trim().replace(/[^a-z0-9_]+/g, '_').replace(/^_|_$/g, ''))
    }
  }, [nameEn, initial, fieldKey])

  const needsOptions = fieldType === 'select' || fieldType === 'multi_select'

  const addOption = () => setOptions([...options, { key: '', label_ar: '' }])
  const updateOption = (i: number, key: string, val: string) => {
    setOptions(opts => opts.map((o, idx) => idx === i ? { ...o, [key]: val } : o))
  }
  const removeOption = (i: number) => setOptions(opts => opts.filter((_, idx) => idx !== i))

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    const form: Partial<Attribute> = {
      name_ar: nameAr,
      field_key: fieldKey,
      field_type: fieldType,
      is_required: isRequired,
      display_order: displayOrder,
    }
    if (nameEn) form.name_en = nameEn
    if (unit) form.unit = unit
    if (needsOptions) form.options = options.filter(o => o.key && o.label_ar)
    await onSave(form)
    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">اسم الخاصية بالعربي *</label>
          <input
            type="text"
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
            required
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]/30"
            placeholder="مثلاً: عدد المقاعد"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Name (English)</label>
          <input
            type="text"
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]/30"
            placeholder="Seats"
            dir="ltr"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Field key *</label>
          <input
            type="text"
            value={fieldKey}
            onChange={(e) => setFieldKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
            required
            disabled={!!initial}
            pattern="[a-z0-9_]+"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]/30 disabled:bg-gray-50"
            placeholder="seats"
            dir="ltr"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">نوع الحقل *</label>
          <select
            value={fieldType}
            onChange={(e) => setFieldType(e.target.value as FieldType)}
            disabled={!!initial}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]/30 disabled:bg-gray-50"
          >
            {Object.entries(FIELD_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">وحدة القياس</label>
          <input
            type="text"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]/30"
            placeholder="م² / كجم / HP"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">الترتيب</label>
          <input
            type="number"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(Number(e.target.value))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]/30"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isRequired}
          onChange={(e) => setIsRequired(e.target.checked)}
          className="w-4 h-4 accent-[#059669]"
        />
        <span className="text-sm font-medium text-gray-700">إلزامي (لازم المورد يدخله)</span>
      </label>

      {needsOptions && (
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-2">الاختيارات</label>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={opt.key}
                  onChange={(e) => updateOption(i, 'key', e.target.value)}
                  placeholder="key (English)"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm"
                  dir="ltr"
                />
                <input
                  type="text"
                  value={opt.label_ar}
                  onChange={(e) => updateOption(i, 'label_ar', e.target.value)}
                  placeholder="الاسم بالعربي"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-xl"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addOption}
              className="text-xs text-[#059669] font-bold hover:underline flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> ضيف اختيار
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={submitting || !nameAr || !fieldKey}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-[#2FA084] text-white rounded-xl text-sm font-bold hover:bg-[#2FA084]/90 disabled:opacity-50 shadow-soft hover:shadow-card transition-all"
        >
          <Save className="w-4 h-4" />
          {submitting ? 'جاري الحفظ...' : 'حفظ'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200"
        >
          إلغاء
        </button>
      </div>
    </form>
  )
}
