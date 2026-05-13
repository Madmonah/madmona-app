'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import Link from 'next/link'
import {
  Loader2, Lock, Sparkles, Wand2, Copy, Check, ChevronDown, ChevronUp,
  Film, Music2, Camera, Hash, MessageSquare, Eye, Archive, RefreshCw,
  Clapperboard, Mic, ArrowRight,
} from 'lucide-react'

// ============================================================================
// /admin/content-studio
//
// AI-powered content generator for Madmona's social channels:
//   - Reels (Instagram, ~30s)
//   - TikTok (~25s)
//   - Instagram posts (static)
//   - Stories (~10s)
//   - Threads (X / Threads)
//   - Carousels (Instagram, 3-10 slides)
//
// Flow:
//   1. Admin fills a small form (format, topic, duration, intent, tone, audience)
//   2. Calls content-script-generator edge function
//   3. AI returns hook + script + visual directions + caption + hashtags + thumbnail
//   4. Result saved to content_drafts table, status=generated
//   5. Admin reviews, approves, or archives
//
// Brand: deep green + gold accents · ultra-minimal · luxury boutique
// ============================================================================

interface Draft {
  id: string
  format: 'reel' | 'tiktok' | 'instagram_post' | 'story' | 'thread' | 'carousel'
  topic: string
  duration_seconds: number | null
  target_audience: string | null
  intent: string | null
  status: 'generated' | 'approved' | 'in_production' | 'published' | 'archived' | 'rejected'
  hook: string | null
  script: string | null
  visual_directions: Array<{ timing: string; action: string; text_overlay?: string }> | null
  caption: string | null
  hashtags: string[] | null
  cta: string | null
  thumbnail_text: string | null
  music_suggestion: string | null
  ai_reasoning: string | null
  created_at: string
  updated_at: string
}

type Stage = 'loading' | 'unauthenticated' | 'ready'

const FORMAT_LABELS: Record<string, { ar: string; emoji: string; defaultDuration: number }> = {
  reel: { ar: 'ريل Instagram', emoji: '🎬', defaultDuration: 30 },
  tiktok: { ar: 'TikTok', emoji: '🎵', defaultDuration: 25 },
  instagram_post: { ar: 'بوست Instagram', emoji: '📷', defaultDuration: 0 },
  story: { ar: 'ستوري', emoji: '⚡', defaultDuration: 10 },
  thread: { ar: 'Threads / X', emoji: '🧵', defaultDuration: 0 },
  carousel: { ar: 'كاروسيل', emoji: '🎠', defaultDuration: 0 },
}

const STATUS_STYLES: Record<string, string> = {
  generated: 'bg-blue-100 text-blue-800 border-blue-300',
  approved: 'bg-green-100 text-green-800 border-green-300',
  in_production: 'bg-purple-100 text-purple-800 border-purple-300',
  published: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  archived: 'bg-gray-100 text-gray-600 border-gray-300',
  rejected: 'bg-red-50 text-red-600 border-red-200',
}

const STATUS_LABELS: Record<string, string> = {
  generated: 'مسودة',
  approved: 'موافَق',
  in_production: 'تحت التصوير',
  published: 'منشور',
  archived: 'مؤرشف',
  rejected: 'مرفوض',
}

export default function ContentStudioPage() {
  const [stage, setStage] = useState<Stage>('loading')
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [filter, setFilter] = useState<'all' | 'generated' | 'approved' | 'published'>('generated')
  const [refreshing, setRefreshing] = useState(false)

  // Form state
  const [format, setFormat] = useState<keyof typeof FORMAT_LABELS>('reel')
  const [topic, setTopic] = useState('')
  const [duration, setDuration] = useState(30)
  const [audience, setAudience] = useState('موردين مصريين عندهم عربيات/عقارات/معدات للإيجار')
  const [intent, setIntent] = useState<'awareness' | 'consideration' | 'conversion' | 'retention'>('awareness')
  const [tone, setTone] = useState<'casual' | 'professional' | 'urgent' | 'playful' | 'inspirational'>('casual')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  // Expanded drafts
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState<string | null>(null)

  const loadDrafts = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      let q = supabaseBrowser.from('content_drafts').select('*').order('created_at', { ascending: false }).limit(50)
      if (filter !== 'all') q = q.eq('status', filter)
      const { data } = await q
      setDrafts((data || []) as Draft[])
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) { setStage('unauthenticated'); return }
      const { data: profile } = await supabaseBrowser.from('profiles').select('role').eq('id', session.user.id).single()
      if (!['admin', 'super_admin'].includes(profile?.role as string)) {
        setStage('unauthenticated'); return
      }
      setStage('ready')
      await loadDrafts()
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (stage === 'ready') void loadDrafts()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  useEffect(() => {
    setDuration(FORMAT_LABELS[format].defaultDuration)
  }, [format])

  const handleGenerate = async () => {
    if (!topic.trim()) { setGenError('اكتب موضوع'); return }
    setGenerating(true); setGenError(null)
    try {
      const { data, error } = await supabaseBrowser.functions.invoke('content-script-generator', {
        body: {
          format,
          topic: topic.trim(),
          duration_seconds: duration,
          target_audience: audience,
          intent,
          tone,
        },
      })
      if (error) throw new Error(error.message)
      if (!(data as { ok?: boolean }).ok) throw new Error('AI returned no content')
      setTopic('')
      setFilter('generated')
      await loadDrafts()
      const newId = (data as { draft_id: string }).draft_id
      if (newId) setExpanded(new Set([newId]))
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'فشل التوليد')
    } finally {
      setGenerating(false)
    }
  }

  const updateStatus = async (id: string, status: Draft['status']) => {
    await supabaseBrowser.from('content_drafts').update({ status }).eq('id', id)
    setDrafts(d => d.map(x => x.id === id ? { ...x, status } : x))
  }

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    } catch { /* ignore */ }
  }

  const toggleExpand = (id: string) => {
    setExpanded(s => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  if (stage === 'loading') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#1F5F3F] animate-spin" />
      </div>
    )
  }

  if (stage === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl border p-8 text-center max-w-sm">
          <Lock className="w-8 h-8 text-[#1F5F3F] mx-auto mb-3" />
          <h1 className="font-bold mb-2">صفحة admin</h1>
          <p className="text-sm text-gray-600 mb-6">محتاج صلاحية admin للدخول.</p>
          <Link href="/auth/login?redirect=/admin/content-studio"
            className="block w-full bg-[#1F5F3F] text-white py-3 rounded-xl font-semibold">
            تسجيل دخول
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] py-8" dir="rtl">
      <main className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1F5F3F] flex items-center gap-2">
              <Wand2 className="w-6 h-6 text-[#B8860B]" />
              Content Studio
            </h1>
            <p className="text-sm text-gray-600 mt-1">AI بـ يصيغ Reels و TikTok و posts بصوت مضمونة</p>
          </div>
          <button onClick={() => loadDrafts(true)} disabled={refreshing}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-[#1F5F3F]">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>

        <section className="bg-white rounded-2xl border-2 border-[#1F5F3F]/10 p-5 mb-8 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-[#B8860B]" />
            <h2 className="font-bold text-[#1F5F3F]">اعمل content جديد</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">الفورمات</label>
              <div className="grid grid-cols-3 gap-1.5">
                {Object.entries(FORMAT_LABELS).map(([k, v]) => (
                  <button key={k} onClick={() => setFormat(k as keyof typeof FORMAT_LABELS)}
                    className={`px-2 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      format === k
                        ? 'bg-[#1F5F3F] text-white border-[#1F5F3F]'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-[#1F5F3F]/50'
                    }`}>
                    <span className="block">{v.emoji}</span>
                    <span className="block text-[10px] mt-0.5">{v.ar}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">الـ intent</label>
                <select value={intent} onChange={e => setIntent(e.target.value as typeof intent)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/20">
                  <option value="awareness">awareness · ناس تعرفنا</option>
                  <option value="consideration">consideration · ناس تفكر تجرّب</option>
                  <option value="conversion">conversion · موردين/عملاء يـ sign up</option>
                  <option value="retention">retention · موردين موجودين</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">النبرة</label>
                <select value={tone} onChange={e => setTone(e.target.value as typeof tone)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/20">
                  <option value="casual">casual · زي الكلام العادي</option>
                  <option value="professional">professional · رسمي</option>
                  <option value="urgent">urgent · فيه شوية اندفاع</option>
                  <option value="playful">playful · مرح</option>
                  <option value="inspirational">inspirational · ملهم</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">الموضوع</label>
            <textarea value={topic} onChange={e => setTopic(e.target.value)}
              placeholder="مثلاً: كيف AI مضمونة بـ يربط الموردين بالعملاء تلقائياً 24/7"
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/20" />
          </div>

          {['reel', 'tiktok', 'story'].includes(format) && (
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">مدة الفيديو (ثانية)</label>
              <input type="number" value={duration} onChange={e => setDuration(parseInt(e.target.value) || 0)}
                min={5} max={120}
                className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/20" />
            </div>
          )}

          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">الـ audience</label>
            <input type="text" value={audience} onChange={e => setAudience(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/20" />
          </div>

          {genError && <p className="text-sm text-red-700 mb-3">{genError}</p>}

          <button onClick={handleGenerate} disabled={generating || !topic.trim()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#1F5F3F] hover:bg-[#1F5F3F]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-xl transition-colors">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {generating ? 'AI بـ يفكر…' : 'صيغ الـ content'}
          </button>
        </section>

        <div className="flex items-center gap-2 mb-4 overflow-x-auto">
          {(['generated', 'approved', 'published', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                filter === f ? 'bg-[#1F5F3F] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-[#1F5F3F]/50'
              }`}>
              {f === 'all' ? 'الكل' : STATUS_LABELS[f]} · {drafts.filter(d => f === 'all' || d.status === f).length}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {drafts.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-sm text-gray-600">
              لسه مفيش content · ابدأ بصيغ ريل من فوق
            </div>
          )}

          {drafts.map(d => {
            const isExpanded = expanded.has(d.id)
            const formatInfo = FORMAT_LABELS[d.format] || { ar: d.format, emoji: '📄', defaultDuration: 0 }
            return (
              <div key={d.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="p-4 flex items-start gap-3">
                  <div className="text-2xl">{formatInfo.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-semibold text-[#1F5F3F]">{formatInfo.ar}</span>
                      {d.duration_seconds && <span className="text-xs text-gray-500">· {d.duration_seconds}s</span>}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_STYLES[d.status]}`}>
                        {STATUS_LABELS[d.status] || d.status}
                      </span>
                      <span className="text-[10px] text-gray-400 mr-auto">
                        {new Date(d.created_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 mb-1 line-clamp-2">{d.topic}</h3>
                    {d.hook && <p className="text-sm text-[#B8860B] italic line-clamp-1">"{d.hook}"</p>}
                  </div>
                  <button onClick={() => toggleExpand(d.id)} className="p-1 hover:bg-gray-100 rounded">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50/50">
                    {d.script && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <h4 className="text-xs font-bold text-gray-700 flex items-center gap-1">
                            <Mic className="w-3 h-3" />السكريبت
                          </h4>
                          <button onClick={() => copyText(`script-${d.id}`, d.script || '')}
                            className="text-xs text-[#1F5F3F] hover:underline flex items-center gap-1">
                            {copied === `script-${d.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            انسخ
                          </button>
                        </div>
                        <pre className="bg-white p-3 rounded-lg text-xs font-mono whitespace-pre-wrap leading-relaxed border border-gray-100">{d.script}</pre>
                      </div>
                    )}

                    {d.visual_directions && d.visual_directions.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-gray-700 flex items-center gap-1 mb-1.5">
                          <Camera className="w-3 h-3" />الـ shots
                        </h4>
                        <div className="space-y-1.5">
                          {d.visual_directions.map((shot, i) => (
                            <div key={i} className="bg-white p-2.5 rounded-lg border border-gray-100 text-xs">
                              <div className="flex items-start gap-2">
                                <span className="font-mono text-[10px] text-[#1F5F3F] bg-[#1F5F3F]/5 px-1.5 py-0.5 rounded whitespace-nowrap">{shot.timing}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-gray-800 leading-relaxed">{shot.action}</p>
                                  {shot.text_overlay && <p className="text-[#B8860B] mt-1 text-[10px]">📝 {shot.text_overlay}</p>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {d.caption && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <h4 className="text-xs font-bold text-gray-700 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />الـ caption
                          </h4>
                          <button onClick={() => copyText(`caption-${d.id}`, d.caption || '')}
                            className="text-xs text-[#1F5F3F] hover:underline flex items-center gap-1">
                            {copied === `caption-${d.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            انسخ
                          </button>
                        </div>
                        <p className="bg-white p-3 rounded-lg text-xs whitespace-pre-wrap leading-relaxed border border-gray-100">{d.caption}</p>
                      </div>
                    )}

                    {d.hashtags && d.hashtags.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <h4 className="text-xs font-bold text-gray-700 flex items-center gap-1">
                            <Hash className="w-3 h-3" />الـ hashtags
                          </h4>
                          <button onClick={() => copyText(`tags-${d.id}`, (d.hashtags || []).join(' '))}
                            className="text-xs text-[#1F5F3F] hover:underline flex items-center gap-1">
                            {copied === `tags-${d.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            انسخ كلهم
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {d.hashtags.map((h, i) => (
                            <span key={i} className="text-xs bg-white px-2 py-0.5 rounded-md border border-gray-100 text-[#1F5F3F]">{h}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {d.cta && (
                        <div className="bg-white p-3 rounded-lg border border-gray-100">
                          <div className="text-[10px] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                            <ArrowRight className="w-3 h-3" />CTA
                          </div>
                          <p className="text-xs text-gray-800 leading-relaxed">{d.cta}</p>
                        </div>
                      )}
                      {d.thumbnail_text && (
                        <div className="bg-white p-3 rounded-lg border border-gray-100">
                          <div className="text-[10px] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                            <Film className="w-3 h-3" />Thumbnail
                          </div>
                          <p className="text-xs text-gray-800 leading-relaxed">{d.thumbnail_text}</p>
                        </div>
                      )}
                      {d.music_suggestion && (
                        <div className="bg-white p-3 rounded-lg border border-gray-100">
                          <div className="text-[10px] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                            <Music2 className="w-3 h-3" />الموسيقى
                          </div>
                          <p className="text-xs text-gray-800 leading-relaxed">{d.music_suggestion}</p>
                        </div>
                      )}
                    </div>

                    {d.ai_reasoning && (
                      <div className="bg-[#1F5F3F]/5 p-3 rounded-lg border border-[#1F5F3F]/10">
                        <div className="text-[10px] font-bold text-[#1F5F3F] uppercase mb-1 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />منطق الـ AI
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed">{d.ai_reasoning}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                      {d.status === 'generated' && (
                        <>
                          <button onClick={() => updateStatus(d.id, 'approved')}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors">
                            <Check className="w-3 h-3" />موافق
                          </button>
                          <button onClick={() => updateStatus(d.id, 'rejected')}
                            className="flex items-center gap-1 px-3 py-1.5 bg-white text-red-600 border border-red-200 hover:bg-red-50 text-xs font-semibold rounded-lg transition-colors">
                            رفض
                          </button>
                        </>
                      )}
                      {d.status === 'approved' && (
                        <>
                          <button onClick={() => updateStatus(d.id, 'in_production')}
                            className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition-colors">
                            <Clapperboard className="w-3 h-3" />تحت التصوير
                          </button>
                          <button onClick={() => updateStatus(d.id, 'published')}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors">
                            <Eye className="w-3 h-3" />منشور
                          </button>
                        </>
                      )}
                      {d.status === 'in_production' && (
                        <button onClick={() => updateStatus(d.id, 'published')}
                          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors">
                          <Eye className="w-3 h-3" />تم النشر
                        </button>
                      )}
                      {d.status !== 'archived' && (
                        <button onClick={() => updateStatus(d.id, 'archived')}
                          className="flex items-center gap-1 px-3 py-1.5 bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 text-xs rounded-lg transition-colors">
                          <Archive className="w-3 h-3" />أرشيف
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
