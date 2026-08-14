'use client'

import { safeStorage } from '@/lib/safe-storage'
// 🏗️ /my-projects — لوحة المطوّر
// الدخول بالموبايل عن طريق واتساب (من /login) — من غير إيميل ولا باسورد.
// المطوّر بيشوف مشاريعه بس، ويقدر:
//   • يرفع صورة الغلاف
//   • يرفع معرض صور كامل (media[])
//   • يرفع فيديو أو يلصق لينك يوتيوب
//   • يرفع بروشور PDF
//   • يظبط السعر
// (14 Jul 2026)
// =====================================================================

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import {
  Building2, ImagePlus, Loader2, CheckCircle2, ExternalLink,
  Video, FileText, X, Images, AlertTriangle,
} from 'lucide-react'
import UnitsManager from './UnitsManager'

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
  video_url: string | null
  media: string[] | null
  booking_enabled: boolean | null
  booking_fee: number | null
  booking_fee_note: string | null
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
  const [err, setErr] = useState<string | null>(null)

  const token = typeof window !== 'undefined' ? safeStorage.get('madmona_token') || '' : ''

  const load = useCallback(async () => {
    if (!token) { router.push('/login'); return }
    try {
      const r = await fetch('/api/my-projects', { headers: { 'x-madmona-token': token } })
      if (r.status === 401) { safeStorage.remove('madmona_token'); router.push('/login'); return }
      const d = await r.json()
      setProjects(d.projects || [])
      setPhone(d.phone || '')
    } catch { setErr('مقدرناش نحمّل المشاريع — جرّب تاني') }
    setLoading(false)
  }, [token, router])

  useEffect(() => { load() }, [load])

  /** يرفع ملف على التخزين ويرجّع اللينك */
  async function upload(p: Project, file: File, kind: string): Promise<string> {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `projects/${p.slug || p.id}/${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`
    const { error } = await supabase.storage
      .from('project-media')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (error) throw error
    return supabase.storage.from('project-media').getPublicUrl(path).data.publicUrl
  }

  /** يحفظ أي تعديل — بيفحص الخطأ ومبيفشلش في صمت */
  async function patch(p: Project, body: Record<string, unknown>) {
    const r = await fetch('/api/my-projects', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-madmona-token': token },
      body: JSON.stringify({ id: p.id, ...body }),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error((j as { error?: string })?.error || 'الحفظ فشل')
  }

  function update(id: string, patchObj: Partial<Project>) {
    setProjects((ps) => ps.map((x) => (x.id === id ? { ...x, ...patchObj } : x)))
  }

  async function uploadCover(p: Project, file: File) {
    setBusyId(p.id); setSavedId(null); setErr(null)
    try {
      const url = await upload(p, file, 'cover')
      await patch(p, { cover_url: url })
      update(p.id, { cover_url: url })
      setSavedId(p.id)
    } catch (e) { setErr(e instanceof Error ? e.message : 'مشكلة في رفع الصورة') }
    setBusyId(null)
  }

  // 🖼️ معرض الصور — بيرفع أكتر من صورة مرة واحدة
  async function addPhotos(p: Project, files: FileList) {
    setBusyId(p.id); setSavedId(null); setErr(null)
    try {
      const urls: string[] = []
      for (const f of Array.from(files).slice(0, 12)) urls.push(await upload(p, f, 'photo'))
      const media = [...(p.media || []), ...urls]
      const cover = p.cover_url || urls[0] || null   // أول صورة تبقى الغلاف لو مفيش
      await patch(p, { media, cover_url: cover })
      update(p.id, { media, cover_url: cover })
      setSavedId(p.id)
    } catch (e) { setErr(e instanceof Error ? e.message : 'مشكلة في رفع الصور') }
    setBusyId(null)
  }

  async function removePhoto(p: Project, url: string) {
    setBusyId(p.id); setErr(null)
    try {
      const media = (p.media || []).filter((m) => m !== url)
      await patch(p, { media })
      update(p.id, { media })
    } catch (e) { setErr(e instanceof Error ? e.message : 'مشكلة في الحذف') }
    setBusyId(null)
  }

  // 🎬 فيديو — رفع ملف أو لصق لينك يوتيوب
  async function uploadVideo(p: Project, file: File) {
    setBusyId(p.id); setSavedId(null); setErr(null)
    try {
      if (file.size > 60 * 1024 * 1024) throw new Error('الفيديو أكبر من ٦٠ ميجا — اضغطه أو حط لينك يوتيوب')
      const url = await upload(p, file, 'video')
      await patch(p, { video_url: url })
      update(p.id, { video_url: url })
      setSavedId(p.id)
    } catch (e) { setErr(e instanceof Error ? e.message : 'مشكلة في رفع الفيديو') }
    setBusyId(null)
  }

  async function setVideoLink(p: Project, link: string) {
    setBusyId(p.id); setErr(null)
    try {
      await patch(p, { video_url: link || null })
      update(p.id, { video_url: link || null })
      setSavedId(p.id)
    } catch (e) { setErr(e instanceof Error ? e.message : 'مشكلة في الحفظ') }
    setBusyId(null)
  }

  async function uploadBrochure(p: Project, file: File) {
    setBusyId(p.id); setSavedId(null); setErr(null)
    try {
      const url = await upload(p, file, 'brochure')
      await patch(p, { brochure_url: url })
      update(p.id, { brochure_url: url })
      setSavedId(p.id)
    } catch (e) { setErr(e instanceof Error ? e.message : 'مشكلة في رفع البروشور') }
    setBusyId(null)
  }

  async function savePrice(p: Project, from: string, to: string) {
    setBusyId(p.id); setSavedId(null); setErr(null)
    try {
      const body = { price_from: from ? Number(from) : null, price_to: to ? Number(to) : null }
      await patch(p, body)
      update(p.id, body as Partial<Project>)
      setSavedId(p.id)
    } catch (e) { setErr(e instanceof Error ? e.message : 'مشكلة في الحفظ') }
    setBusyId(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-6 h-6 animate-spin text-[#059669]" />
      </div>
    )
  }

  const done = projects.filter((p) => p.cover_url && p.price_from).length

  return (
    <div className="min-h-screen bg-[#FAFAF7] py-8 px-4" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-[#1A2E26] mb-1">مشاريعي على مضمونة 🏗️</h1>
          <p className="text-sm text-gray-500">
            {phone} · {projects.length} مشروع ·{' '}
            <span className="text-[#059669] font-bold">{done} مكتمل</span>
          </p>
        </div>

        {err && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-2xl p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-red-700">{err}</p>
          </div>
        )}

        {projects.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 mb-1">مفيش مشاريع مربوطة بالرقم ده لسه.</p>
            <p className="text-sm text-gray-400">
              ابعت مشروعك للمارد على واتساب 01002229982 وهيتضاف هنا فوراً.
            </p>
          </div>
        )}

        <div className="space-y-5">
          {projects.map((p) => {
            const busy = busyId === p.id
            const photos = p.media || []
            return (
              <div key={p.id} className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                {/* ── الغلاف ── */}
                <div className="relative h-48 sm:h-56">
                  {p.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.cover_url} alt={p.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#34D399] to-[#2FA084] flex items-center justify-center">
                      <Building2 className="w-10 h-10 text-white/70" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute bottom-3 right-4 left-4 flex items-end justify-between gap-3">
                    <div>
                      <h3 className="text-white font-black text-lg drop-shadow">{p.title}</h3>
                      {p.area_label && <p className="text-white/85 text-xs">{p.area_label}</p>}
                    </div>
                    {savedId === p.id && (
                      <span className="bg-white/95 text-[#059669] text-[11px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" /> اتحفظ
                      </span>
                    )}
                  </div>
                  <label className="absolute top-3 left-3 bg-black/55 hover:bg-black/75 text-white text-[11px] font-bold px-3 py-1.5 rounded-full cursor-pointer flex items-center gap-1.5">
                    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
                    {p.cover_url ? 'غيّر الغلاف' : 'ارفع غلاف'}
                    <input type="file" accept="image/*" className="hidden" disabled={busy}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCover(p, f) }} />
                  </label>
                </div>

                <div className="p-5 space-y-4">
                  {/* تنبيهات النقص */}
                  <div className="flex flex-wrap gap-2">
                    {!p.cover_url && <Warn>⚠️ مفيش صورة غلاف</Warn>}
                    {photos.length === 0 && <Warn>📸 مفيش معرض صور</Warn>}
                    {p.price_from == null && <Warn>💰 مفيش سعر</Warn>}
                    {!p.video_url && <Warn>🎬 مفيش فيديو</Warn>}
                  </div>

                  {/* ── 🖼️ معرض الصور ── */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-[#1A2E26] flex items-center gap-1.5">
                        <Images className="w-4 h-4 text-[#059669]" /> معرض الصور
                        <span className="text-gray-400 font-normal">({photos.length})</span>
                      </span>
                      <label className="text-[11px] font-bold text-[#059669] cursor-pointer hover:underline flex items-center gap-1">
                        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImagePlus className="w-3 h-3" />}
                        ضيف صور
                        <input type="file" accept="image/*" multiple className="hidden" disabled={busy}
                          onChange={(e) => { const f = e.target.files; if (f?.length) addPhotos(p, f) }} />
                      </label>
                    </div>
                    {photos.length > 0 ? (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {photos.map((src) => (
                          <div key={src} className="relative shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt="" className="w-24 h-20 object-cover rounded-xl border border-gray-100" />
                            <button onClick={() => removePhoto(p, src)} disabled={busy}
                              className="absolute top-1 left-1 w-5 h-5 bg-black/60 hover:bg-red-600 rounded-full flex items-center justify-center">
                              <X className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <label className="block border-2 border-dashed border-gray-200 rounded-2xl py-5 text-center cursor-pointer hover:border-[#2FA084] hover:bg-[#2FA084]/5">
                        <ImagePlus className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                        <span className="text-xs font-bold text-gray-500">دوس واختار صور المشروع (تقدر تختار أكتر من واحدة)</span>
                        <input type="file" accept="image/*" multiple className="hidden" disabled={busy}
                          onChange={(e) => { const f = e.target.files; if (f?.length) addPhotos(p, f) }} />
                      </label>
                    )}
                  </div>

                  {/* ── 🎬 فيديو + 📄 بروشور ── */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <VideoBox p={p} busy={busy} onFile={uploadVideo} onLink={setVideoLink} />
                    <div>
                      <span className="text-xs font-black text-[#1A2E26] flex items-center gap-1.5 mb-2">
                        <FileText className="w-4 h-4 text-[#059669]" /> البروشور
                      </span>
                      {p.brochure_url ? (
                        <a href={p.brochure_url} target="_blank" rel="noopener"
                          className="flex items-center gap-2 bg-[#FAFAF7] border border-gray-100 rounded-xl px-3 py-2.5 text-xs font-bold text-[#059669] hover:bg-[#2FA084]/10">
                          <FileText className="w-4 h-4" /> مرفوع — افتحه
                        </a>
                      ) : (
                        <label className="flex items-center justify-center gap-1.5 border-2 border-dashed border-gray-200 rounded-xl py-2.5 cursor-pointer hover:border-[#2FA084] hover:bg-[#2FA084]/5">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="text-xs font-bold text-gray-500">ارفع PDF</span>
                          <input type="file" accept="application/pdf" className="hidden" disabled={busy}
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadBrochure(p, f) }} />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* ── 💰 السعر ── */}
                  <PriceEditor p={p} busy={busy} onSave={savePrice} />

                  {/* ── 🗂️ الوحدات + الحجز 48 ساعة (16 Jul 2026) ── */}
                  <UnitsManager
                    projectId={p.id}
                    token={token}
                    bookingEnabled={!!p.booking_enabled}
                    bookingFee={p.booking_fee}
                    bookingFeeNote={p.booking_fee_note}
                    onToggleBooking={async (enabled, feeVal, noteVal) => {
                      await patch(p, { booking_enabled: enabled, booking_fee: feeVal, booking_fee_note: noteVal })
                      update(p.id, { booking_enabled: enabled, booking_fee: feeVal, booking_fee_note: noteVal })
                    }}
                  />

                  <a href="/real-estate/market" target="_blank" rel="noopener"
                    className="inline-flex items-center gap-1 text-xs text-[#059669] font-bold hover:underline">
                    شوفه في البورصة <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1">
      {children}
    </span>
  )
}

/** 🎬 فيديو: رفع ملف أو لصق لينك يوتيوب */
function VideoBox({
  p, busy, onFile, onLink,
}: {
  p: Project
  busy: boolean
  onFile: (p: Project, f: File) => void
  onLink: (p: Project, l: string) => void
}) {
  const [link, setLink] = useState('')
  return (
    <div>
      <span className="text-xs font-black text-[#1A2E26] flex items-center gap-1.5 mb-2">
        <Video className="w-4 h-4 text-[#059669]" /> الفيديو
      </span>
      {p.video_url ? (
        <div className="flex items-center gap-2">
          <a href={p.video_url} target="_blank" rel="noopener"
            className="flex-1 flex items-center gap-2 bg-[#FAFAF7] border border-gray-100 rounded-xl px-3 py-2.5 text-xs font-bold text-[#059669] hover:bg-[#2FA084]/10">
            <Video className="w-4 h-4" /> مرفوع — شوفه
          </a>
          <button onClick={() => onLink(p, '')} disabled={busy}
            className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-red-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          <label className="flex items-center justify-center gap-1.5 border-2 border-dashed border-gray-200 rounded-xl py-2.5 cursor-pointer hover:border-[#2FA084] hover:bg-[#2FA084]/5">
            {busy ? <Loader2 className="w-4 h-4 animate-spin text-[#059669]" /> : <Video className="w-4 h-4 text-gray-400" />}
            <span className="text-xs font-bold text-gray-500">ارفع فيديو</span>
            <input type="file" accept="video/*" className="hidden" disabled={busy}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(p, f) }} />
          </label>
          <div className="flex gap-1.5">
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="أو الصق لينك يوتيوب"
              className="flex-1 px-2.5 py-2 text-xs border border-gray-200 rounded-xl focus:border-[#2FA084] outline-none"
            />
            {link.trim() && (
              <button onClick={() => { onLink(p, link.trim()); setLink('') }} disabled={busy}
                className="px-3 py-2 text-xs font-bold rounded-xl bg-[#34D399] text-[#04352A] hover:bg-[#185849] disabled:opacity-50">
                احفظ
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function PriceEditor({
  p, busy, onSave,
}: {
  p: Project
  busy: boolean
  onSave: (p: Project, from: string, to: string) => void
}) {
  const [from, setFrom] = useState(p.price_from?.toString() || '')
  const [to, setTo] = useState(p.price_to?.toString() || '')
  const changed = from !== (p.price_from?.toString() || '') || to !== (p.price_to?.toString() || '')

  return (
    <div className="pt-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-black text-[#1A2E26]">💰 السعر:</span>
        <input
          value={from}
          onChange={(e) => setFrom(e.target.value.replace(/\D/g, ''))}
          placeholder="من"
          inputMode="numeric"
          className="w-28 px-2.5 py-1.5 text-sm border border-gray-200 rounded-xl focus:border-[#2FA084] outline-none"
        />
        <span className="text-gray-400 text-xs">—</span>
        <input
          value={to}
          onChange={(e) => setTo(e.target.value.replace(/\D/g, ''))}
          placeholder="لحد"
          inputMode="numeric"
          className="w-28 px-2.5 py-1.5 text-sm border border-gray-200 rounded-xl focus:border-[#2FA084] outline-none"
        />
        <span className="text-xs text-gray-400">جنيه</span>
        {changed && (
          <button onClick={() => onSave(p, from, to)} disabled={busy}
            className="px-3.5 py-1.5 text-xs font-black rounded-xl bg-[#34D399] text-[#04352A] hover:bg-[#185849] disabled:opacity-50">
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
