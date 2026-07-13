// =====================================================================
// 🏗️ /my-projects — لوحة المطوّر
// الدخول بالموبايل عن طريق واتساب (من /login) — من غير إيميل ولا باسورد.
// المطوّر بيشوف مشاريعه بس، ويقدر يرفع صورة ويظبط السعر والتفاصيل.
// (13 Jul 2026)
// =====================================================================
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Building2, ImagePlus, Loader2, CheckCircle2, ExternalLink } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

type Project = {
  id: string
  slug: string
  title: string
  developer: string | null
  area_label: string | null
  unit_label: string | null
  price_from: number | null
  price_to: number | null
  payment_plan: string | null
  note: string | null
  cover_url: string | null
  brochure_url: string | null
}

const money = (n: number | null) =>
  n == null ? '' : n >= 1e6 ? `${(n / 1e6).toFixed(1)} مليون` : n.toLocaleString('en-US')

export default function MyProjectsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [phone, setPhone] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)

  const token = typeof window !== 'undefined' ? localStorage.getItem('madmona_token') || '' : ''

  const load = useCallback(async () => {
    if (!token) { router.push('/login'); return }
    try {
      const r = await fetch('/api/my-projects', { headers: { 'x-madmona-token': token } })
      if (r.status === 401) { localStorage.removeItem('madmona_token'); router.push('/login'); return }
      const d = await r.json()
      setProjects(d.projects || [])
      setPhone(d.phone || '')
    } catch { /* ignore */ }
    setLoading(false)
  }, [token, router])

  useEffect(() => { load() }, [load])

  async function uploadCover(p: Project, file: File) {
    setBusyId(p.id); setSavedId(null)
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `projects/${p.slug || p.id}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('project-media')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr
      const { data } = supabase.storage.from('project-media').getPublicUrl(path)

      const r = await fetch('/api/my-projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-madmona-token': token },
        body: JSON.stringify({ id: p.id, cover_url: data.publicUrl }),
      })
      if (!r.ok) throw new Error('save failed')
      setProjects((ps) => ps.map((x) => (x.id === p.id ? { ...x, cover_url: data.publicUrl } : x)))
      setSavedId(p.id)
    } catch {
      alert('حصلت مشكلة في رفع الصورة — جرّب تاني.')
    }
    setBusyId(null)
  }

  async function savePrice(p: Project, from: string, to: string) {
    setBusyId(p.id); setSavedId(null)
    try {
      const r = await fetch('/api/my-projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-madmona-token': token },
        body: JSON.stringify({
          id: p.id,
          price_from: from ? Number(from) : null,
          price_to: to ? Number(to) : null,
        }),
      })
      if (!r.ok) throw new Error()
      setProjects((ps) =>
        ps.map((x) =>
          x.id === p.id
            ? { ...x, price_from: from ? Number(from) : null, price_to: to ? Number(to) : null }
            : x,
        ),
      )
      setSavedId(p.id)
    } catch {
      alert('حصلت مشكلة في الحفظ — جرّب تاني.')
    }
    setBusyId(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-6 h-6 animate-spin text-[#1F6F5F]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] py-8 px-4" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">مشاريعي على مضمونة 🏗️</h1>
          <p className="text-sm text-gray-500">
            {phone} · {projects.length} مشروع
          </p>
        </div>

        {projects.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 mb-1">مفيش مشاريع مربوطة بالرقم ده لسه.</p>
            <p className="text-sm text-gray-400">
              ابعت مشروعك للمارد على واتساب 01002229982 وهيتضاف هنا فوراً.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {projects.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="flex flex-col sm:flex-row">
                {/* الصورة */}
                <div className="sm:w-56 shrink-0 relative">
                  {p.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.cover_url} alt={p.title} className="w-full h-40 object-cover" />
                  ) : (
                    <div className="w-full h-40 bg-gradient-to-br from-[#1F6F5F] to-[#2FA084] flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-white/80" />
                    </div>
                  )}
                  <label className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                    <span className="text-white text-xs font-semibold flex items-center gap-1.5">
                      {busyId === p.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ImagePlus className="w-4 h-4" />
                      )}
                      {p.cover_url ? 'غيّر الصورة' : 'ارفع صورة'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={busyId === p.id}
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) uploadCover(p, f)
                      }}
                    />
                  </label>
                </div>

                {/* التفاصيل */}
                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-bold text-gray-900">{p.title}</h3>
                      {p.area_label && <p className="text-xs text-gray-500">{p.area_label}</p>}
                    </div>
                    {savedId === p.id && (
                      <span className="text-[11px] text-[#1F6F5F] font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> اتحفظ
                      </span>
                    )}
                  </div>

                  {!p.cover_url && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5 mb-3">
                      ⚠️ المشروع من غير صورة — الصورة بتزوّد الاستفسارات كتير.
                    </p>
                  )}
                  {p.price_from == null && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5 mb-3">
                      ⚠️ من غير سعر — الباحثين بيفلتروا بالسعر.
                    </p>
                  )}

                  <PriceEditor p={p} busy={busyId === p.id} onSave={savePrice} />

                  <a
                    href={`/real-estate/market`}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center gap-1 text-xs text-[#1F6F5F] font-semibold mt-3 hover:underline"
                  >
                    شوفه في البورصة <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PriceEditor({
  p,
  busy,
  onSave,
}: {
  p: Project
  busy: boolean
  onSave: (p: Project, from: string, to: string) => void
}) {
  const [from, setFrom] = useState(p.price_from?.toString() || '')
  const [to, setTo] = useState(p.price_to?.toString() || '')
  const changed = from !== (p.price_from?.toString() || '') || to !== (p.price_to?.toString() || '')

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-500">السعر:</span>
        <input
          value={from}
          onChange={(e) => setFrom(e.target.value.replace(/\D/g, ''))}
          placeholder="من"
          inputMode="numeric"
          className="w-28 px-2 py-1 text-sm border border-gray-200 rounded-lg focus:border-[#2FA084] outline-none"
        />
        <span className="text-gray-400 text-xs">—</span>
        <input
          value={to}
          onChange={(e) => setTo(e.target.value.replace(/\D/g, ''))}
          placeholder="لحد"
          inputMode="numeric"
          className="w-28 px-2 py-1 text-sm border border-gray-200 rounded-lg focus:border-[#2FA084] outline-none"
        />
        <span className="text-xs text-gray-400">جنيه</span>
        {changed && (
          <button
            onClick={() => onSave(p, from, to)}
            disabled={busy}
            className="px-3 py-1 text-xs font-semibold rounded-lg bg-[#1F6F5F] text-white hover:bg-[#185849] disabled:opacity-50"
          >
            {busy ? '...' : 'احفظ'}
          </button>
        )}
      </div>
      {(p.price_from || p.price_to) && (
        <p className="text-[11px] text-gray-400 mt-1">
          الظاهر دلوقتي: {money(p.price_from)}
          {p.price_to ? ` – ${money(p.price_to)}` : p.price_from ? ' فأكتر' : ''}
        </p>
      )}
    </div>
  )
}
