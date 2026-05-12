// app/admin/refresh-fb-token/page.tsx
// One-input page: paste fresh Facebook user token, system saves it and fires all 24 queued posts.

'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function RefreshFBTokenPage() {
  const [token, setToken] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; data: Record<string, unknown> } | null>(null)

  const submit = async () => {
    if (!token || token.length < 50) {
      alert('التوكن قصير جداً — الصق التوكن كامل من Graph API Explorer')
      return
    }
    setSubmitting(true)
    setResult(null)
    try {
      const r = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/set-fb-token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_token: token.trim() }),
        }
      )
      const data = await r.json()
      setResult({ ok: r.ok, data })
      if (r.ok) setToken('')
    } catch (err) {
      setResult({ ok: false, data: { error: err instanceof Error ? err.message : 'unknown' } })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <Link href="/admin/social-packs" className="text-xs text-gray-500 hover:text-gray-700 no-underline">
          ← Social Packs
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2 mb-2">تجديد Facebook Token</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-800 font-bold mb-1">⚠️ التوكن انتهى صلاحيته يوم 10 مايو</p>
          <p className="text-red-700 text-sm">
            عشان كده مفيش بوستات بتنشر على فيسبوك أو إنستجرام. عندي 24 إعلان حقيقي
            جاهزين، بس Meta بترفض النشر بتوكن منتهي. لازم تجدده يدوي.
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
          <h2 className="font-bold text-gray-900 mb-3">خطوات التجديد (دقيقتين):</h2>
          <ol className="space-y-3 text-sm text-gray-700">
            <li className="flex gap-2">
              <span className="font-bold text-[#1F5F3F]">1.</span>
              <span>
                اضغط على{' '}
                <a
                  href="https://developers.facebook.com/tools/explorer/"
                  target="_blank"
                  className="text-[#1F5F3F] underline font-bold"
                >
                  Graph API Explorer ↗
                </a>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#1F5F3F]">2.</span>
              <span>
                اختار التطبيق من <code className="bg-gray-100 px-1.5 py-0.5 rounded">Meta App</code>{' '}
                — أي تطبيق فيه إدارة لصفحة مضمونة
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#1F5F3F]">3.</span>
              <span>
                في <code className="bg-gray-100 px-1.5 py-0.5 rounded">User or Page</code>: اختار{' '}
                <strong>User Token</strong>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#1F5F3F]">4.</span>
              <span>
                في <code className="bg-gray-100 px-1.5 py-0.5 rounded">Permissions</code>: أضف{' '}
                <code className="bg-amber-50 px-1.5 py-0.5 rounded text-amber-800">pages_show_list</code>{' '}
                <code className="bg-amber-50 px-1.5 py-0.5 rounded text-amber-800">pages_manage_posts</code>{' '}
                <code className="bg-amber-50 px-1.5 py-0.5 rounded text-amber-800">pages_read_engagement</code>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#1F5F3F]">5.</span>
              <span>
                اضغط <strong>Generate Access Token</strong> → وافق في النافذة → انسخ التوكن
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#1F5F3F]">6.</span>
              <span>
                الصق التوكن تحت دلوقتي واضغط <strong>جدّد وانشر</strong> — كل الـ 24 إعلان هينشروا فوراً
              </span>
            </li>
          </ol>
        </div>

        {/* Token input */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <label className="text-sm font-bold text-gray-900 block mb-2">
            الصق User Access Token هنا:
          </label>
          <textarea
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="EAAVMOYuX1lYBR... (يبدأ بـ EAA)"
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
            dir="ltr"
          />
          <button
            onClick={submit}
            disabled={submitting || token.length < 50}
            className="mt-3 bg-[#1F5F3F] text-white px-6 py-3 rounded-xl font-bold shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {submitting ? '...بيتم التحقق والنشر' : 'جدّد وانشر الـ 24 إعلان'}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div className={`mt-6 rounded-xl p-5 ${result.ok ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <p className={`font-bold mb-2 ${result.ok ? 'text-green-800' : 'text-red-800'}`}>
              {result.ok ? '✓ اتجدد التوكن والنشر بدأ' : '✗ في مشكلة'}
            </p>
            <pre className={`text-xs overflow-x-auto p-3 rounded ${result.ok ? 'bg-green-100/50 text-green-900' : 'bg-red-100/50 text-red-900'}`} dir="ltr">
              {JSON.stringify(result.data, null, 2)}
            </pre>
            {result.ok && (
              <Link
                href="/admin/social-packs"
                className="mt-3 inline-block text-sm text-[#1F5F3F] underline font-bold"
              >
                شوف الإعلانات بتنشر دلوقتي ↗
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
