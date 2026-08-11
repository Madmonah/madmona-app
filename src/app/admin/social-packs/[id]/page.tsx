// app/admin/social-packs/[id]/page.tsx
// Madmona Admin — Social Pack Detail
// Shows everything generated for one listing + per-group copy-paste UI with tracking.

'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'

type Scene = { shot: string; voiceover: string; duration: number }

type Pack = {
  id: string
  status: string
  created_at: string
  completed_at: string | null
  error_message: string | null
  reel_script: {
    hook: string
    scenes: Scene[]
    cta: string
    music_hint: string
    total_duration_seconds: number
  } | null
  post_copies: { family: string; youth: string; urgent: string } | null
  hashtags: string[] | null
  design_brief: string | null
  square_canva_url: string | null
  story_canva_url: string | null
  carousel_canva_url: string | null
  listing: {
    id: string
    title: string
    slug: string | null
    description: string | null
    city: string | null
    district: string | null
    category: { name_ar: string; slug: string } | null
    photos: { url: string; is_primary: boolean }[]
    pricing: { price: number; period_type: string; currency: string }[]
  } | null
}

type GroupPost = {
  id: string
  post_text: string
  status: 'queued' | 'copied' | 'posted' | 'skipped' | 'rejected'
  copied_at: string | null
  posted_at: string | null
  posted_by: string | null
  external_post_url: string | null
  notes: string | null
  group: {
    id: string
    group_name: string
    group_url: string
    members_count: number | null
    platform: string
    posting_rules: string | null
  }
}

export default function SocialPackDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [pack, setPack] = useState<Pack | null>(null)
  const [groupPosts, setGroupPosts] = useState<GroupPost[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  const refresh = async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/admin/social-packs/${id}`, { cache: 'no-store' })
      const d = await r.json()
      setPack(d.pack)
      setGroupPosts(d.group_posts || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [id])

  const copyText = async (text: string, gid?: string) => {
    try {
      await navigator.clipboard.writeText(text)
      if (gid) {
        await fetch(`/api/admin/social-packs/${id}/groups/${gid}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'copied' }),
        })
        await refresh()
      }
      setToast('اتنسخ ✓')
      setTimeout(() => setToast(null), 2000)
    } catch (err) {
      setToast('فشل النسخ')
    }
  }

  const markPosted = async (gid: string) => {
    const url = prompt('رابط البوست (اختياري):')
    try {
      await fetch(`/api/admin/social-packs/${id}/groups/${gid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'posted', external_post_url: url || null }),
      })
      setToast('اتسجّل ✓')
      setTimeout(() => setToast(null), 2000)
      await refresh()
    } catch (err) {
      setToast('فشل')
    }
  }

  const skipGroup = async (gid: string) => {
    const notes = prompt('سبب التخطي:')
    try {
      await fetch(`/api/admin/social-packs/${id}/groups/${gid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'skipped', notes }),
      })
      await refresh()
    } catch (err) {
      setToast('فشل')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center" dir="rtl">
        <p className="text-gray-400">جاري التحميل...</p>
      </div>
    )
  }

  if (!pack) {
    return (
      <div className="min-h-screen bg-gray-50 p-8" dir="rtl">
        <p className="text-red-600">Pack مش موجود</p>
        <Link href="/admin/social-packs" className="text-[#FA8125] underline">رجوع</Link>
      </div>
    )
  }

  const price = pack.listing?.pricing?.[0]
  const photo = pack.listing?.photos?.find((p) => p.is_primary) || pack.listing?.photos?.[0]

  const groupsPosted = groupPosts.filter((g) => g.status === 'posted').length
  const groupsQueued = groupPosts.filter((g) => g.status === 'queued').length

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8" dir="rtl">
      <div className="max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <Link href="/admin/social-packs" className="text-sm text-gray-500 hover:text-gray-700 no-underline mb-4 inline-block">
          ← كل الـ packs
        </Link>

        {/* Toast */}
        {toast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-2.5 rounded-xl shadow-lg z-50 text-sm font-medium">
            {toast}
          </div>
        )}

        {/* Listing header */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 flex gap-4 items-start">
          {photo?.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.url} alt="" className="w-24 h-24 rounded-xl object-cover flex-shrink-0" />
          )}
          <div className="flex-1">
            <p className="text-xs text-[#2FA084] font-bold mb-1">{pack.listing?.category?.name_ar}</p>
            <h1 className="text-xl font-bold text-gray-900">{pack.listing?.title}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {pack.listing?.city} {pack.listing?.district && `· ${pack.listing.district}`}
              {price && ` · ${price.price} ${price.currency}/${price.period_type}`}
            </p>
            <div className="flex gap-2 mt-3">
              <Link
                href={`https://madmonacairo.com/listing/${pack.listing?.slug ?? pack.listing?.id}`}
                target="_blank"
                className="text-xs text-[#FA8125] hover:underline"
              >
                صفحة الـ listing ↗
              </Link>
            </div>
          </div>
        </div>

        {/* Reel Script */}
        {pack.reel_script && (
          <Section title="🎬 سكريبت الريلز" badge={`${pack.reel_script.total_duration_seconds}s`}>
            <div className="space-y-3">
              <div className="bg-amber-50 border-r-4 border-amber-400 p-3 rounded">
                <p className="text-xs text-amber-700 font-bold mb-1">Hook (أول ٢ ثانية)</p>
                <p className="text-gray-900 font-medium">{pack.reel_script.hook}</p>
              </div>
              <div className="space-y-2">
                {pack.reel_script.scenes?.map((s, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl p-3 text-sm">
                    <p className="text-xs text-gray-500 font-bold mb-1">مشهد {i + 1} · {s.duration}s</p>
                    <p className="text-gray-700 mb-1"><span className="font-bold">اللقطة:</span> {s.shot}</p>
                    <p className="text-gray-900"><span className="font-bold">الـ Voiceover:</span> {s.voiceover}</p>
                  </div>
                ))}
              </div>
              <div className="bg-green-50 border-r-4 border-green-400 p-3 rounded">
                <p className="text-xs text-green-700 font-bold mb-1">CTA</p>
                <p className="text-gray-900">{pack.reel_script.cta}</p>
              </div>
              <p className="text-xs text-gray-500">🎵 {pack.reel_script.music_hint}</p>
              <button
                onClick={() => copyText(JSON.stringify(pack.reel_script, null, 2))}
                className="text-xs text-[#FA8125] hover:underline"
              >
                نسخ السكريبت كامل (JSON)
              </button>
            </div>
          </Section>
        )}

        {/* Post Copies */}
        {pack.post_copies && (
          <Section title="✍️ نسخ البوست (٣ زوايا)">
            <div className="space-y-3">
              {(['family', 'youth', 'urgent'] as const).map((k) => {
                const labels = { family: 'للعائلات', youth: 'للشباب', urgent: 'إلحاح/عرض محدود' }
                return (
                  <div key={k} className="border border-gray-200 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-gray-500 font-bold">{labels[k]}</p>
                      <button
                        onClick={() => copyText(pack.post_copies![k])}
                        className="text-xs text-[#FA8125] hover:underline"
                      >
                        نسخ
                      </button>
                    </div>
                    <p className="text-gray-900 text-sm leading-relaxed">{pack.post_copies![k]}</p>
                  </div>
                )
              })}
            </div>
          </Section>
        )}

        {/* Hashtags */}
        {pack.hashtags && pack.hashtags.length > 0 && (
          <Section title="🏷 الـ Hashtags">
            <div className="flex items-center gap-2">
              <div className="flex flex-wrap gap-1.5 flex-1">
                {pack.hashtags.map((h, i) => (
                  <span key={i} className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                    {h}
                  </span>
                ))}
              </div>
              <button
                onClick={() => copyText(pack.hashtags!.join(' '))}
                className="text-xs text-[#FA8125] hover:underline whitespace-nowrap"
              >
                نسخ الكل
              </button>
            </div>
          </Section>
        )}

        {/* Design Brief */}
        {pack.design_brief && (
          <Section title="🎨 Design Brief (للـ ad-designer)">
            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{pack.design_brief}</p>
            {(pack.square_canva_url || pack.carousel_canva_url) && (
              <div className="flex gap-3 mt-3">
                {pack.square_canva_url && (
                  <a href={pack.square_canva_url} target="_blank" className="text-xs text-[#FA8125] hover:underline">
                    تصميم مربع ↗
                  </a>
                )}
                {pack.story_canva_url && (
                  <a href={pack.story_canva_url} target="_blank" className="text-xs text-[#FA8125] hover:underline">
                    ستوري ↗
                  </a>
                )}
                {pack.carousel_canva_url && (
                  <a href={pack.carousel_canva_url} target="_blank" className="text-xs text-[#FA8125] hover:underline">
                    كاروسيل ↗
                  </a>
                )}
              </div>
            )}
            {!pack.square_canva_url && !pack.carousel_canva_url && (
              <p className="text-xs text-amber-600 mt-2">
                ⏳ التصميمات لسة مش متولّدة — الـ ad-designer هيلتقطها من Canva
              </p>
            )}
          </Section>
        )}

        {/* Group Posts */}
        <Section
          title="📣 جروبات الفيسبوك للنشر"
          badge={`${groupsPosted}/${groupPosts.length} اتنشروا · ${groupsQueued} في الانتظار`}
        >
          {groupPosts.length === 0 ? (
            <p className="text-sm text-gray-500">
              مفيش جروبات متربوطة بالتصنيف ده. أضف من{' '}
              <Link href="/admin/social-groups" className="text-[#FA8125] underline">
                /admin/social-groups
              </Link>
            </p>
          ) : (
            <div className="space-y-3">
              {groupPosts.map((g) => (
                <div
                  key={g.id}
                  className={`border rounded-xl p-3 ${
                    g.status === 'posted'
                      ? 'border-green-200 bg-green-50/50'
                      : g.status === 'copied'
                      ? 'border-amber-200 bg-amber-50/30'
                      : g.status === 'skipped'
                      ? 'border-gray-200 bg-gray-50 opacity-60'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{g.group.group_name}</p>
                      <a
                        href={g.group.group_url}
                        target="_blank"
                        className="text-xs text-gray-500 hover:text-[#FA8125] no-underline"
                      >
                        {g.group.group_url} ↗
                      </a>
                      {g.group.posting_rules && (
                        <p className="text-xs text-amber-600 mt-1">⚠️ {g.group.posting_rules}</p>
                      )}
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        g.status === 'posted'
                          ? 'bg-green-100 text-green-700'
                          : g.status === 'copied'
                          ? 'bg-amber-100 text-amber-700'
                          : g.status === 'skipped'
                          ? 'bg-gray-200 text-gray-500'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {g.status === 'queued'
                        ? 'في الانتظار'
                        : g.status === 'copied'
                        ? 'اتنسخ'
                        : g.status === 'posted'
                        ? 'اتنشر ✓'
                        : g.status === 'skipped'
                        ? 'متخطي'
                        : g.status}
                    </span>
                  </div>
                  <div className="bg-white border border-gray-200 rounded p-2 mb-2">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{g.post_text}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => copyText(g.post_text, g.id)}
                      className="text-xs px-3 py-1.5 bg-[#FA8125] text-white rounded-lg font-bold hover:opacity-90"
                    >
                      نسخ النص
                    </button>
                    <a
                      href={g.group.group_url}
                      target="_blank"
                      className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg font-bold hover:opacity-90 no-underline"
                    >
                      افتح الجروب ↗
                    </a>
                    {g.status !== 'posted' && (
                      <button
                        onClick={() => markPosted(g.id)}
                        className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg font-bold hover:opacity-90"
                      >
                        ✓ اتنشر
                      </button>
                    )}
                    {g.status !== 'skipped' && (
                      <button
                        onClick={() => skipGroup(g.id)}
                        className="text-xs px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                      >
                        تخطي
                      </button>
                    )}
                    {g.external_post_url && (
                      <a
                        href={g.external_post_url}
                        target="_blank"
                        className="text-xs px-3 py-1.5 text-[#FA8125] underline"
                      >
                        البوست المنشور
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}

function Section({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        {badge && <span className="text-xs text-gray-500">{badge}</span>}
      </div>
      {children}
    </div>
  )
}
