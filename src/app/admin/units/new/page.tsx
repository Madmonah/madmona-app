'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { Lock, ArrowRight, Plus } from 'lucide-react'
import UnitForm from '@/components/UnitForm'

export default function AdminUnitNewPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('madmona_admin_pw')
    if (stored) {
      verifyPassword(stored)
    }
  }, [])

  const verifyPassword = async (pw: string) => {
    setVerifying(true)
    try {
      const res = await fetch('/api/admin/meta', {
        headers: { 'X-Admin-Password': pw },
      })
      if (res.status === 401) {
        sessionStorage.removeItem('madmona_admin_pw')
        setAuthed(false)
        return
      }
      sessionStorage.setItem('madmona_admin_pw', pw)
      setPassword(pw)
      setAuthed(true)
    } finally {
      setVerifying(false)
    }
  }

  const handleLogin = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setAuthError('')
    verifyPassword(password).then(() => {
      // If still not authed after verify, show error
      if (!authed && !verifying) setAuthError('كلمة السر غلط')
    })
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          <div className="flex items-center justify-center w-12 h-12 bg-[#1F6F5F]/10 rounded-full mb-4 mx-auto">
            <Lock className="w-5 h-5 text-[#1F6F5F]" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 text-center mb-1">إضافة وحدة جديدة</h1>
          <form onSubmit={handleLogin} className="space-y-4 mt-6">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="كلمة السر"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F6F5F]/30 focus:border-[#1F6F5F] text-right"
              autoFocus
            />
            {authError && <p className="text-sm text-red-600 text-center">{authError}</p>}
            <button
              type="submit"
              disabled={verifying || !password}
              className="w-full bg-[#1F6F5F] text-white py-3 rounded-xl font-semibold hover:bg-[#1F6F5F]/90 disabled:opacity-50"
            >
              {verifying ? 'جاري التحقق...' : 'دخول'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/admin/units" className="p-1 hover:bg-gray-50 rounded-full">
            <ArrowRight className="w-4 h-4 text-gray-600" />
          </Link>
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#1F6F5F]" />
            <h1 className="text-lg font-bold text-gray-900">إضافة وحدة جديدة</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <UnitForm mode="new" password={password} />
      </main>
    </div>
  )
}
