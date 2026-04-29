'use client'

import { useEffect, useState, type FormEvent, use } from 'react'
import Link from 'next/link'
import { Lock, ArrowRight, Edit, Loader2 } from 'lucide-react'
import UnitForm, { type UnitFormData } from '@/components/UnitForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function AdminUnitEditPage({ params }: PageProps) {
  const { id } = use(params)
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<UnitFormData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('madmona_admin_pw')
    if (stored) {
      verifyAndLoad(stored)
    }
  }, [])

  const verifyAndLoad = async (pw: string) => {
    setVerifying(true)
    setLoading(true)
    try {
      // Verify password by fetching the unit
      const res = await fetch(`/api/admin/units/${id}`, {
        headers: { 'X-Admin-Password': pw },
      })
      if (res.status === 401) {
        sessionStorage.removeItem('madmona_admin_pw')
        setAuthed(false)
        return
      }
      if (!res.ok) {
        setLoadError('فشل تحميل الوحدة')
        return
      }
      const json = await res.json()
      const u = json.unit
      // Hydrate form data — convert numeric fields back to strings for input compatibility
      setData({
        id: u.id,
        supplier_id: u.supplier_id,
        category_slug: u.category_slug,
        name_ar: u.name_ar || '',
        description_ar: u.description_ar || '',
        photo_urls: u.photo_urls || [],
        capacity: u.capacity || 1,
        price_hourly: u.price_hourly != null ? String(u.price_hourly) : '',
        price_daily: u.price_daily != null ? String(u.price_daily) : '',
        price_package_10: u.price_package_10 != null ? String(u.price_package_10) : '',
        price_monthly: u.price_monthly != null ? String(u.price_monthly) : '',
        operating_start_hour: u.operating_start_hour ?? 9,
        operating_end_hour: u.operating_end_hour ?? 23,
      })
      sessionStorage.setItem('madmona_admin_pw', pw)
      setPassword(pw)
      setAuthed(true)
    } catch (err) {
      setLoadError((err as Error).message)
    } finally {
      setVerifying(false)
      setLoading(false)
    }
  }

  const handleLogin = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setAuthError('')
    verifyAndLoad(password)
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          <div className="flex items-center justify-center w-12 h-12 bg-[#1F5F3F]/10 rounded-full mb-4 mx-auto">
            <Lock className="w-5 h-5 text-[#1F5F3F]" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 text-center mb-1">تعديل وحدة</h1>
          <form onSubmit={handleLogin} className="space-y-4 mt-6">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="كلمة السر"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30 focus:border-[#1F5F3F] text-right"
              autoFocus
            />
            {authError && <p className="text-sm text-red-600 text-center">{authError}</p>}
            <button
              type="submit"
              disabled={verifying || !password}
              className="w-full bg-[#1F5F3F] text-white py-3 rounded-xl font-semibold hover:bg-[#1F5F3F]/90 disabled:opacity-50"
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
            <Edit className="w-5 h-5 text-[#1F5F3F]" />
            <h1 className="text-lg font-bold text-gray-900">
              {data?.name_ar || 'تعديل الوحدة'}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {loading || !data ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-[#1F5F3F] animate-spin" />
          </div>
        ) : loadError ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 text-center">
            {loadError}
          </div>
        ) : (
          <UnitForm mode="edit" password={password} initialData={data} />
        )}
      </main>
    </div>
  )
}
