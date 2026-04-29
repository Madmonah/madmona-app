'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import {
  Lock,
  RefreshCw,
  LogOut,
  ArrowRight,
  Building,
  Users,
  Coffee,
  Camera,
  Monitor,
  Power,
  PowerOff,
  Edit,
} from 'lucide-react'

// ============================================================
// Admin units list — every unit across every supplier.
// Lets the admin toggle is_active, see capacity/pricing at a glance.
// ============================================================

interface Unit {
  id: string
  supplier_id: string
  category_slug: string
  name_ar: string
  description_ar: string | null
  photo_urls: string[]
  capacity: number
  price_hourly: number | string | null
  price_daily: number | string | null
  price_package_10: number | string | null
  price_monthly: number | string | null
  is_active: boolean
  created_at: string
  // Optional joined fields from API
  supplier_name?: string
}

const CATEGORY_META: Record<string, { label: string; icon: typeof Building }> = {
  workstation: { label: 'مكاتب فردية', icon: Monitor },
  meeting_room: { label: 'غرف اجتماعات', icon: Users },
  office: { label: 'مكاتب خاصة', icon: Building },
  amenity: { label: 'وسائل راحة', icon: Coffee },
  equipment: { label: 'معدات', icon: Camera },
}

function formatPrice(p: number | string | null): string {
  if (p === null || p === undefined) return '—'
  const n = Number(p)
  if (n === 0) return '—'
  return n.toLocaleString('ar-EG') + ' ج'
}

export default function AdminUnitsPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [actioning, setActioning] = useState<string | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('madmona_admin_pw')
    if (stored) {
      setPassword(stored)
      tryFetch(stored, true)
    }
  }, [])

  const tryFetch = async (pw: string, silent = false) => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/units', {
        headers: { 'X-Admin-Password': pw },
      })
      if (res.status === 401) {
        if (!silent) setAuthError('كلمة السر غلط')
        sessionStorage.removeItem('madmona_admin_pw')
        setAuthed(false)
        return
      }
      if (!res.ok) return
      const data = await res.json()
      setUnits(data.units || [])
      setAuthed(true)
      sessionStorage.setItem('madmona_admin_pw', pw)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setAuthError('')
    tryFetch(password)
  }

  const handleLogout = () => {
    sessionStorage.removeItem('madmona_admin_pw')
    setAuthed(false)
    setPassword('')
    setUnits([])
  }

  const toggleActive = async (id: string, current: boolean) => {
    setActioning(id)
    try {
      const res = await fetch('/api/admin/units', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password,
        },
        body: JSON.stringify({ id, is_active: !current }),
      })
      if (res.ok) {
        setUnits((prev) =>
          prev.map((u) => (u.id === id ? { ...u, is_active: !current } : u))
        )
      }
    } finally {
      setActioning(null)
    }
  }

  const filtered = filter === 'all' ? units : units.filter((u) => u.category_slug === filter)
  const counts: Record<string, number> = { all: units.length }
  for (const u of units) {
    counts[u.category_slug] = (counts[u.category_slug] || 0) + 1
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          <div className="flex items-center justify-center w-12 h-12 bg-[#1F5F3F]/10 rounded-full mb-4 mx-auto">
            <Lock className="w-5 h-5 text-[#1F5F3F]" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 text-center mb-1">إدارة الوحدات</h1>
          <p className="text-sm text-gray-500 text-center mb-6">إدخال كلمة السر</p>
          <form onSubmit={handleLogin} className="space-y-4">
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
              disabled={loading || !password}
              className="w-full bg-[#1F5F3F] text-white py-3 rounded-xl font-semibold hover:bg-[#1F5F3F]/90 disabled:opacity-50"
            >
              {loading ? 'جاري التحقق...' : 'دخول'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="p-1 hover:bg-gray-50 rounded-full">
              <ArrowRight className="w-4 h-4 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">الوحدات</h1>
              <p className="text-xs text-gray-500 mt-0.5">{units.length} وحدة</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => tryFetch(password)}
              disabled={loading}
              className="p-2 hover:bg-gray-50 rounded-full transition-colors"
              aria-label="تحديث"
            >
              <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-gray-50 rounded-full transition-colors"
              aria-label="خروج"
            >
              <LogOut className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Category filter chips */}
        <div className="max-w-4xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setFilter('all')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${
              filter === 'all' ? 'bg-[#1F5F3F] text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            الكل ({counts.all || 0})
          </button>
          {Object.entries(CATEGORY_META).map(([slug, meta]) => (
            <button
              key={slug}
              onClick={() => setFilter(slug)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${
                filter === slug ? 'bg-[#1F5F3F] text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {meta.label} ({counts[slug] || 0})
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">لا توجد وحدات</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((u) => {
              const meta = CATEGORY_META[u.category_slug] || CATEGORY_META.workstation
              const Icon = meta.icon
              return (
                <div
                  key={u.id}
                  className={`bg-white rounded-xl border p-5 ${
                    u.is_active ? 'border-gray-100' : 'border-gray-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#1F5F3F]/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-[#1F5F3F]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">{u.name_ar}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{meta.label}</p>
                      {u.supplier_name && (
                        <p className="text-xs text-[#B8860B] mt-1">{u.supplier_name}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          u.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {u.is_active ? 'نشطة' : 'متوقفة'}
                      </span>
                    </div>
                  </div>

                  {u.description_ar && (
                    <p className="text-sm text-gray-600 mb-3">{u.description_ar}</p>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-xs">
                    <PriceCell label="ساعة" value={formatPrice(u.price_hourly)} />
                    <PriceCell label="يوم" value={formatPrice(u.price_daily)} />
                    <PriceCell label="باكدج ١٠" value={formatPrice(u.price_package_10)} />
                    <PriceCell label="شهر" value={formatPrice(u.price_monthly)} />
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-500">السعة: {u.capacity} {u.capacity > 1 ? 'أشخاص' : 'شخص'}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleActive(u.id, u.is_active)}
                        disabled={actioning === u.id}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 flex items-center gap-1 ${
                          u.is_active
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : 'bg-green-50 text-green-800 hover:bg-green-100'
                        }`}
                      >
                        {u.is_active ? (
                          <>
                            <PowerOff className="w-3 h-3" />
                            إيقاف
                          </>
                        ) : (
                          <>
                            <Power className="w-3 h-3" />
                            تفعيل
                          </>
                        )}
                      </button>
                      <Link
                        href={`/units/${u.id}`}
                        target="_blank"
                        className="px-3 py-1.5 bg-[#1F5F3F]/10 text-[#1F5F3F] rounded-lg text-xs font-medium hover:bg-[#1F5F3F]/20 flex items-center gap-1"
                      >
                        <Edit className="w-3 h-3" />
                        عرض
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

function PriceCell({ label, value }: { label: string; value: string }) {
  const isEmpty = value === '—'
  return (
    <div className="bg-[#FAFAF7] rounded-lg p-2 text-center">
      <p className="text-[10px] text-gray-500">{label}</p>
      <p className={`font-semibold mt-0.5 ${isEmpty ? 'text-gray-400' : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  )
}
