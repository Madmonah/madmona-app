// =====================================================================
// 🗂️ /admin/projects-media — جرد الميديا
// بيوريك: كل مشروع + الصور والملفات اللي وصلت المارد من صاحبه على واتساب.
// تقدر تربط أي صورة كـ Cover أو أي PDF كـ بروشور بضغطة.
// الهدف: منطلبش من مطوّر حاجة هو بعتهالنا قبل كده.
// (13 Jul 2026)
// =====================================================================
'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, ImageIcon, FileText, CheckCircle2, AlertTriangle } from 'lucide-react'

type Media = { url: string; kind: string; name: string; at: string; from: string }
type Project = {
  id: string
  title: string
  developer: string | null
  area_label: string | null
  price_from: number | null
  cover_url: string | null
  brochure_url: string | null
  video_url: string | null
  source_lead_phone: string | null
  owner: string
  media_available: number
  media_unlinked: number
  media: Media[]
  gaps: string[]
  embargoed: boolean
}

export default function ProjectsMediaAdmin() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Project[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [filter, setFilter] = useState<'gaps' | 'linkable' | 'all'>('linkable')

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/admin/projects-media')
    const d = await r.json()
    setRows(d.projects || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function link(p: Project, m: Media, field: 'cover_url' | 'brochure_url' | 'video_url') {
    setBusy(p.id + m.url)
    try {
      const r = await fetch(`/api/projects/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: m.url }),
      })
      if (!r.ok) throw new Error()
      setRows((rs) => rs.map((x) => (x.id === p.id ? { ...x, [field]: m.url } : x)))
    } catch {
      alert('حصلت مشكلة — جرّب تاني.')
    }
    setBusy(null)
  }

  const shown = rows.filter((p) => {
    if (p.embargoed) return false
    if (filter === 'gaps') return p.gaps.length > 0
    if (filter === 'linkable') return p.gaps.length > 0 && p.media_available > 0
    return true
  })

  const stats = {
    total: rows.length,
    noCover: rows.filter((p) => !p.cover_url && !p.embargoed).length,
    linkable: rows.filter((p) => p.gaps.length > 0 && p.media_available > 0 && !p.embargoed).length,
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">جرد ميديا المشاريع 🗂️</h1>
        <p className="text-sm text-gray-500 mb-4">
          كل مشروع والصور/الملفات اللي وصلتنا من صاحبه على واتساب — قبل ما نطلب منه أي حاجة.
        </p>

        <div className="flex flex-wrap gap-3 mb-5">
          <Stat label="كل المشاريع" value={stats.total} />
          <Stat label="من غير صورة" value={stats.noCover} warn />
          <Stat label="⚡ عندنا ميديا مش مربوطة" value={stats.linkable} good />
        </div>

        <div className="flex gap-2 mb-5">
          {([
            ['linkable', '⚡ ينفع نربطه دلوقتي'],
            ['gaps', 'كل الناقص'],
            ['all', 'الكل'],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                filter === k
                  ? 'bg-[#34D399] text-[#04352A] border-[#059669]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[#059669]" />
          </div>
        ) : shown.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <CheckCircle2 className="w-10 h-10 text-[#2FA084] mx-auto mb-3" />
            <p className="text-gray-700 font-semibold">مفيش حاجة تتربط هنا.</p>
            <p className="text-sm text-gray-400 mt-1">
              كل الميديا اللي عندنا اتربطت بمشاريعها.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {shown.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{p.title}</h3>
                    <p className="text-xs text-gray-500">
                      {p.developer || '—'} · {p.area_label || '—'} · {p.owner || p.source_lead_phone}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {p.gaps.map((g) => (
                      <span
                        key={g}
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200"
                      >
                        ناقص {g}
                      </span>
                    ))}
                    {p.gaps.length === 0 && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                        كامل ✅
                      </span>
                    )}
                  </div>
                </div>

                {p.media_available === 0 ? (
                  <p className="text-xs text-gray-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    مفيش ميديا وصلتنا من صاحب المشروع ده — لازم نطلبها منه.
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-gray-500 mb-2">
                      وصلنا منه <b>{p.media_available}</b> ملف — دوس على أي واحد تربطه:
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {p.media.map((m) => {
                        const isCover = p.cover_url === m.url
                        const isPdf = p.brochure_url === m.url
                        const b = busy === p.id + m.url
                        return (
                          <div key={m.url} className="shrink-0 w-32">
                            <div className="relative">
                              {m.kind === 'image' ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={m.url}
                                  alt=""
                                  className={`w-32 h-24 object-cover rounded-lg border-2 ${
                                    isCover ? 'border-[#059669]' : 'border-gray-100'
                                  }`}
                                />
                              ) : (
                                <a
                                  href={m.url}
                                  target="_blank"
                                  rel="noopener"
                                  className={`w-32 h-24 rounded-lg border-2 flex flex-col items-center justify-center gap-1 bg-gray-50 ${
                                    isPdf ? 'border-[#059669]' : 'border-gray-100'
                                  }`}
                                >
                                  <FileText className="w-5 h-5 text-gray-400" />
                                  <span className="text-[9px] text-gray-500 px-1 text-center line-clamp-2">
                                    {m.name || 'ملف'}
                                  </span>
                                </a>
                              )}
                              {(isCover || isPdf) && (
                                <span className="absolute top-1 right-1 bg-[#34D399] text-[#04352A] text-[9px] px-1.5 py-0.5 rounded-full font-semibold">
                                  {isCover ? 'Cover' : 'بروشور'}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-1 mt-1">
                              {m.kind === 'image' && !isCover && (
                                <button
                                  onClick={() => link(p, m, 'cover_url')}
                                  disabled={b}
                                  className="flex-1 text-[10px] font-semibold py-1 rounded bg-gray-100 hover:bg-[#34D399] hover:text-[#04352A] disabled:opacity-50 transition-colors"
                                >
                                  {b ? '...' : 'اعملها Cover'}
                                </button>
                              )}
                              {m.kind === 'document' && !isPdf && (
                                <button
                                  onClick={() => link(p, m, 'brochure_url')}
                                  disabled={b}
                                  className="flex-1 text-[10px] font-semibold py-1 rounded bg-gray-100 hover:bg-[#34D399] hover:text-[#04352A] disabled:opacity-50 transition-colors"
                                >
                                  {b ? '...' : 'بروشور'}
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, warn, good }: { label: string; value: number; warn?: boolean; good?: boolean }) {
  return (
    <div
      className={`px-4 py-2.5 rounded-xl border ${
        good
          ? 'bg-emerald-50 border-emerald-200'
          : warn
            ? 'bg-amber-50 border-amber-200'
            : 'bg-white border-gray-100'
      }`}
    >
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  )
}
