'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Share = {
  id: string
  group_name: string
  group_url: string | null
  shared_at: string
  notes: string | null
}

type Post = {
  id: string
  category: string
  title: string
  body: string
  cta: string
  hashtags: string[]
  external_url: string | null
  published_at: string | null
  shares: Share[]
}

// FB group search queries per category (Egyptian rental market)
const SEARCH_QUERIES: Record<string, string[]> = {
  vehicles: ['ايجار سيارات مصر', 'سيارات للايجار القاهرة', 'تأجير سيارات'],
  properties: ['شقق للايجار القاهرة', 'عقارات للايجار مصر', 'ايجار شقق مفروشة'],
  tourism: ['شاليهات للايجار', 'شاليهات الساحل الشمالي', 'شاليهات راس سدر'],
  workspaces: ['كوورك سبيس مصر', 'مكاتب للايجار القاهرة', 'قاعات اجتماعات للايجار'],
  marine: ['يخوت ولانشات مصر', 'لنشات للايجار', 'رحلات بحرية الغردقة'],
  equipment: ['معدات للايجار مصر', 'تأجير معدات بناء', 'ايجار اوناش ورافعات'],
  media: ['تصوير فوتوغرافي مصر', 'كاميرات للايجار', 'معدات تصوير للايجار'],
  weddings: ['تجهيزات افراح', 'كاترينج مصر', 'تنظيم حفلات القاهرة'],
  recreation: ['تخييم مصر', 'معدات تخييم للايجار', 'دراجات للايجار'],
  professionals: ['فري لانسرز مصر', 'مصورين القاهرة', 'فنيين مصر'],
}

const CATEGORY_LABELS: Record<string, string> = {
  vehicles: 'سيارات', properties: 'عقارات', tourism: 'سياحة',
  workspaces: 'مساحات عمل', marine: 'بحري', equipment: 'معدات',
  media: 'تصوير', weddings: 'أفراح', recreation: 'ترفيه',
  professionals: 'مهنيين',
}

function buildFullText(post: Post): string {
  return [
    post.title,
    '',
    post.body,
    '',
    post.cta,
    '',
    post.hashtags.join(' '),
  ].join('\n')
}

function PostCard({ post, onShareAdded }: { post: Post; onShareAdded: () => void }) {
  const [copied, setCopied] = useState(false)
  const [showAddGroup, setShowAddGroup] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupUrl, setGroupUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const fullText = buildFullText(post)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback: select the textarea
      const ta = document.getElementById(`text-${post.id}`) as HTMLTextAreaElement | null
      if (ta) {
        ta.select()
        document.execCommand('copy')
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      }
    }
  }

  const handleAddGroup = async () => {
    if (!groupName.trim()) return
    setSaving(true)
    try {
      const r = await fetch(`/api/admin/supplier-posts/${post.id}/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_name: groupName, group_url: groupUrl }),
      })
      if (r.ok) {
        setGroupName('')
        setGroupUrl('')
        setShowAddGroup(false)
        onShareAdded()
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteShare = async (share_id: string) => {
    await fetch(`/api/admin/supplier-posts/${post.id}/shares?share_id=${share_id}`, {
      method: 'DELETE',
    })
    onShareAdded()
  }

  const queries = SEARCH_QUERIES[post.category] ?? []

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-[#FAF7F0]/50">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-0.5">
            {CATEGORY_LABELS[post.category] ?? post.category}
          </div>
          <h3 className="text-base font-bold text-[#2B4521]">{post.title}</h3>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] bg-[#2B4521]/10 text-[#2B4521] px-2.5 py-1 rounded-full font-bold">
            {post.shares.length} جروب
          </span>
          {post.external_url && (
            <a
              href={post.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-gray-500 hover:text-[#2B4521] underline"
            >
              البوست الأصلي ↗
            </a>
          )}
        </div>
      </div>

      <div className="p-5 space-y-3">
        <textarea
          id={`text-${post.id}`}
          readOnly
          value={fullText}
          dir="rtl"
          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono leading-relaxed text-gray-800 resize-none"
          rows={10}
        />

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCopy}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all ${
              copied
                ? 'bg-green-600 text-white'
                : 'bg-[#2B4521] text-white hover:shadow-md'
            }`}
          >
            {copied ? '✓ تم النسخ' : '📋 نسخ كامل'}
          </button>

          {queries.map((q, i) => (
            <a
              key={i}
              href={`https://www.facebook.com/search/groups/?q=${encodeURIComponent(q)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2.5 rounded-xl text-xs bg-white border-2 border-gray-200 hover:border-[#2B4521] hover:text-[#2B4521] text-gray-700 transition-all"
            >
              🔍 {q}
            </a>
          ))}
        </div>
      </div>

      {/* Group share tracker */}
      <div className="px-5 pb-5">
        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-gray-700">الجروبات اللي نشرت فيها:</h4>
            <button
              onClick={() => setShowAddGroup((v) => !v)}
              className="text-xs text-[#2B4521] font-bold hover:underline"
            >
              {showAddGroup ? '× إلغاء' : '+ ضيف جروب'}
            </button>
          </div>

          {showAddGroup && (
            <div className="mb-3 p-3 bg-gray-50 rounded-xl space-y-2">
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="اسم الجروب (مثال: شقق للايجار القاهرة)"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                dir="rtl"
              />
              <input
                value={groupUrl}
                onChange={(e) => setGroupUrl(e.target.value)}
                placeholder="رابط الجروب (اختياري)"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg font-mono"
                dir="ltr"
              />
              <button
                onClick={handleAddGroup}
                disabled={saving || !groupName.trim()}
                className="w-full px-3 py-2 bg-[#2B4521] text-white text-sm font-bold rounded-lg disabled:opacity-50"
              >
                {saving ? '...حفظ' : 'سجّل النشر في الجروب ده'}
              </button>
            </div>
          )}

          {post.shares.length === 0 && !showAddGroup && (
            <p className="text-xs text-gray-400 italic">
              مفيش جروبات لسه. اضغط &quot;ضيف جروب&quot; بعد ما تنشر في جروب
            </p>
          )}

          {post.shares.length > 0 && (
            <div className="space-y-2">
              {post.shares.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between bg-green-50 border border-green-100 rounded-lg px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-800 truncate">
                      {s.group_url ? (
                        <a
                          href={s.group_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#2B4521] hover:underline"
                        >
                          {s.group_name} ↗
                        </a>
                      ) : (
                        s.group_name
                      )}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {new Date(s.shared_at).toLocaleString('ar-EG', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteShare(s.id)}
                    className="text-gray-400 hover:text-red-500 text-xs px-2"
                    title="حذف"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SupplierPostsPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const r = await fetch('/api/admin/supplier-posts', { cache: 'no-store' })
      const data = await r.json()
      setPosts(data.posts ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const totalShares = posts.reduce((sum, p) => sum + p.shares.length, 0)

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/admin/social-packs"
          className="text-xs text-gray-500 hover:text-gray-700 no-underline"
        >
          ← Social Packs
        </Link>

        <div className="mt-2 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            انشر للموردين على الجروبات
          </h1>
          <p className="text-sm text-gray-600">
            10 بوستات جاهزة لاستهداف الموردين. لكل واحد: نسخ بنقرة + بحث عن جروبات مناسبة + تتبع اللي نشرت فيه.
          </p>
        </div>

        {/* Quick stats */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
            <div className="text-2xl font-bold text-[#2B4521]">{posts.length}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">بوست</div>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
            <div className="text-2xl font-bold text-[#2FA084]">{totalShares}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">نشر</div>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
            <div className="text-2xl font-bold text-gray-700">
              {posts.filter((p) => p.shares.length > 0).length}/{posts.length}
            </div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">نشطة</div>
          </div>
        </div>

        {/* How-to */}
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6 text-sm text-gray-800">
          <p className="font-bold mb-2">📌 طريقة العمل (لكل بوست):</p>
          <ol className="space-y-1 list-decimal pr-5 text-gray-700">
            <li>اضغط <strong>&quot;نسخ كامل&quot;</strong> — هينسخ النص كله مع الرابط والهاشتاجات</li>
            <li>اضغط على أي زرار <strong>&quot;🔍&quot;</strong> — هيفتح بحث فيسبوك عن الجروبات</li>
            <li>افتح جروب مناسب → الصق → انشر</li>
            <li>ارجع هنا، اضغط <strong>&quot;+ ضيف جروب&quot;</strong> وسجّل اسمه</li>
          </ol>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">...جاري التحميل</div>
        ) : (
          <div className="space-y-4">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} onShareAdded={load} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
