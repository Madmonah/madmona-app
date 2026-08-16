'use client'

// src/app/admin/commissions/page.tsx
// ============================================================================
// 💰 شاشة العمولات.
//
// (١٦ أغسطس ٢٠٢٦ — محمد: «كل قسم ليه العمولة بتاعته»)
// ============================================================================

import { useState, useEffect, type FormEvent } from 'react'
import { Lock, Percent } from 'lucide-react'
import CommissionsCard from '@/components/admin/CommissionsCard'
import { safePw } from '@/lib/adminPw'

export default function AdminCommissionsPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')

  async function tryAuth(pw: string, silent = false) {
    setChecking(true)
    if (!silent) setError('')
    try {
      const res = await fetch('/api/admin/commissions', {
        headers: { 'X-Admin-Password': safePw(pw) }, cache: 'no-store',
      })
      if (res.ok) {
        setAuthed(true)
        if (pw) sessionStorage.setItem('madmona_admin_pw', pw)
      } else if (!silent) {
        setError('كلمة السر غلط')
      }
    } catch (e) {
      if (!silent) setError((e as Error).message)
    } finally { setChecking(false) }
  }

  // نفس سلوك باقي شاشات الأدمن: بنجرّب الكوكي الأول، وصندوق الباسورد
  // مايظهرش غير لو ده فشل فعلًا.
  useEffect(() => {
    const stored = sessionStorage.getItem('madmona_admin_pw') || ''
    if (stored) setPassword(stored)
    void tryAuth(stored, true)
  }, [])

  const onLogin = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); void tryAuth(password) }

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          <div className="flex items-center justify-center w-12 h-12 bg-[#34D399]/10 rounded-full mb-4 mx-auto">
            <Lock className="w-5 h-5 text-[#059669]" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 text-center mb-1">عمولة كل قسم</h1>
          <p className="text-sm text-gray-500 text-center mb-6">اكتب كلمة سر الأدمن</p>
          <form onSubmit={onLogin} className="space-y-4">
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="كلمة السر" autoFocus
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#059669]"
            />
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            <button type="submit" disabled={checking || !password}
              className="w-full py-3 rounded-xl bg-[#059669] text-white text-sm font-bold disabled:opacity-50">
              {checking ? 'بيحمّل…' : 'دخول'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] p-4 md:p-6" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center gap-2 mb-5">
          <Percent className="w-5 h-5 text-[#059669]" />
          <h1 className="text-xl font-black text-gray-900">عمولة كل قسم</h1>
        </header>
        <CommissionsCard password={password} />
      </div>
    </div>
  )
}
