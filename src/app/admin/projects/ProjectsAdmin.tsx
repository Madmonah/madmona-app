'use client'

// src/app/admin/projects/ProjectsAdmin.tsx
// إدارة مشاريع البورصة — إضافة / تعديل / نشر / حذف + رفع البروشور والفيديو.
import { useState } from 'react'
import { Plus, Pencil, Trash2, Eye, EyeOff, FileText, PlayCircle, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import ProjectForm from '@/components/projects/ProjectForm'
import { projectCode, type Project } from '@/lib/projects'

export default function ProjectsAdmin({ initial }: { initial: Project[] }) {
  const [rows, setRows] = useState<Project[]>(initial)
  const [editing, setEditing] = useState<Project | null>(null)
  const [adding, setAdding] = useState(false)

  async function refresh() {
    const res = await fetch('/api/projects')
    const data = await res.json()
    if (res.ok) setRows(data.projects || [])
  }

  async function patch(id: string, body: Record<string, unknown>) {
    await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    await refresh()
  }

  async function remove(p: Project) {
    if (!confirm(`متأكد تمسح «${p.title}»؟ مش هينفع ترجّعه.`)) return
    await fetch(`/api/projects/${p.id}`, { method: 'DELETE' })
    await refresh()
  }

  const drafts = rows.filter((r) => r.status === 'draft')

  return (
    <div dir="rtl" className="min-h-screen bg-[#FAFAF7] p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1F6F5F]">🏗️ مشاريع البورصة</h1>
            <p className="text-xs text-gray-500 mt-1">
              {rows.length} مشروع · {drafts.length} مسودة مستنية مراجعتك
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/projects/inquiries"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-[#1F6F5F]/40"
            >
              <MessageSquare className="w-4 h-4" />
              الاستفسارات
            </Link>
            <button
              onClick={() => { setAdding(true); setEditing(null) }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1F6F5F] text-white text-sm font-bold"
            >
              <Plus className="w-4 h-4" />
              مشروع جديد
            </button>
          </div>
        </header>

        {(adding || editing) && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">
                {editing ? `تعديل: ${editing.title}` : 'مشروع جديد'}
              </h2>
              <button
                onClick={() => { setAdding(false); setEditing(null) }}
                className="text-sm text-gray-500 hover:underline"
              >
                إلغاء
              </button>
            </div>
            <ProjectForm
              mode="admin"
              initial={editing ?? undefined}
              onSaved={async () => {
                setAdding(false)
                setEditing(null)
                await refresh()
              }}
            />
          </div>
        )}

        <div className="space-y-2">
          {rows.map((p) => (
            <div
              key={p.id}
              className={`bg-white rounded-xl border p-4 flex flex-wrap items-center gap-3 ${
                p.embargoed ? 'border-red-300 bg-red-50/40' : 'border-gray-100'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-gray-900 text-sm">{p.title}</p>
                  {p.developer && <span className="text-xs text-gray-500">· {p.developer}</span>}
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1F6F5F]/10 text-[#1F6F5F] font-semibold">
                    {p.area_label}
                  </span>
                  {p.status !== 'published' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
                      {p.status === 'draft' ? 'مسودة' : 'مؤرشف'}
                    </span>
                  )}
                  {p.embargoed && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-600 text-white font-bold">
                      ⛔ ممنوع النشر
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  {projectCode(p.id)}
                  {p.brochure_url && ' · بروشور 📄'}
                  {p.video_url && ' · فيديو 🎬'}
                  {p.commission_pct != null && ` · عمولة ${p.commission_pct}٪`}
                </p>
                {p.embargo_note && (
                  <p className="text-[11px] text-red-700 mt-1 leading-relaxed">{p.embargo_note}</p>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {p.brochure_url && (
                  <a href={p.brochure_url} target="_blank" rel="noopener"
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:border-[#1F6F5F]/40" title="البروشور">
                    <FileText className="w-4 h-4" />
                  </a>
                )}
                {p.video_url && (
                  <a href={p.video_url} target="_blank" rel="noopener"
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:border-[#1F6F5F]/40" title="الفيديو">
                    <PlayCircle className="w-4 h-4" />
                  </a>
                )}
                <button
                  onClick={() => patch(p.id, { status: p.status === 'published' ? 'draft' : 'published' })}
                  disabled={p.embargoed}
                  title={p.embargoed ? 'ممنوع النشر — فيه حظر على المشروع ده' : p.status === 'published' ? 'اخفيه' : 'انشره'}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:border-[#1F6F5F]/40 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {p.status === 'published' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => { setEditing(p); setAdding(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:border-[#1F6F5F]/40"
                  title="عدّل"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => remove(p)}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-red-600 hover:border-red-300"
                  title="امسح"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
