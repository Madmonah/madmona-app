'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import {
  Lock,
  RefreshCw,
  LogOut,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  Building,
  Percent,
  ArrowRight,
  AlertCircle,
} from 'lucide-react'

interface Supplier {
  id: string
  business_name: string
  contact_name: string
  contact_phone: string
  contact_email: string
  logo_url: string | null
  address: string | null
  city: string | null
  district: string | null
  description_ar: string | null
  commission_rate: number | string
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
  rejection_reason: string | null
  approved_at: string | null
  created_at: string
}

const STATUS_LABELS: Record<Supplier['status'], { label: string; color: string }> = {
  pending: { label: 'في انتظار المراجعة', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'موافق عليه', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'مرفوض', color: 'bg-red-100 text-red-800' },
  suspended: { label: 'موقوف', color: 'bg-gray-100 text-gray-700' },
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

export default function AdminSuppliersPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
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
      const res = await fetch('/api/admin/suppliers', {
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
      setSuppliers(data.suppliers || [])
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
    setSuppliers([])
  }

  const updateSupplier = async (
    id: string,
    update: { status: Supplier['status']; rejection_reason?: string }
  ) => {
    setActioning(id)
    try {
      const res = await fetch('/api/admin/suppliers', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password,
        },
        body: JSON.stringify({ id, ...update }),
      })
      if (res.ok) {
        setSuppliers((prev) =>
          prev.map((s) =>
            s.id === id
              ? {
                  ...s,
                  ...update,
                  approved_at: update.status === 'approved' ? new Date().toISOString() : s.approved_at,
                }
              : s
          )
        )
      }
    } finally {
      setActioning(null)
    }
  }

  const handleApprove = (id: string) => {
    if (!confirm('تأكيد الموافقة على المورد؟ هيقدر يضيف وحدات ويستقبل حجوزات.')) return
    updateSupplier(id, { status: 'approved' })
  }

  const handleReject = (id: string) => {
    const reason = prompt('سبب الرفض (اختياري):')
    if (reason === null) return // Cancel
    updateSupplier(id, { status: 'rejected', rejection_reason: reason || undefined })
  }

  const handleSuspend = (id: string) => {
    if (!confirm('إيقاف المورد؟ هتختفي وحداته من الموقع لحد ما ترجعه.')) return
    updateSupplier(id, { status: 'suspended' })
  }

  const filtered = filter === 'all' ? suppliers : suppliers.filter((s) => s.status === filter)

  // ============ Login Screen ============
  if (!authed) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          <div className="flex items-center justify-center w-12 h-12 bg-[#1F5F3F]/10 rounded-full mb-4 mx-auto">
            <Lock className="w-5 h-5 text-[#1F5F3F]" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 text-center mb-1">إدارة الموردين</h1>
          <p className="text-sm text-gray-500 text-center mb-6">إدخال كلمة السر للوصول</p>

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

  const pendingCount = suppliers.filter((s) => s.status === 'pending').length

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="p-1 hover:bg-gray-50 rounded-full">
              <ArrowRight className="w-4 h-4 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">الموردين</h1>
              <p className="text-xs text-gray-500 mt-0.5">{suppliers.length} مورد</p>
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

        {/* Filter chips */}
        <div className="max-w-4xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => {
            const labels = { all: 'الكل', pending: 'في انتظار', approved: 'موافق عليه', rejected: 'مرفوض' }
            const counts = {
              all: suppliers.length,
              pending: suppliers.filter((s) => s.status === 'pending').length,
              approved: suppliers.filter((s) => s.status === 'approved').length,
              rejected: suppliers.filter((s) => s.status === 'rejected').length,
            }
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filter === f
                    ? 'bg-[#1F5F3F] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {labels[f]} ({counts[f]})
              </button>
            )
          })}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {pendingCount > 0 && filter === 'all' && (
          <div className="mb-4 flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-900">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              لديك {pendingCount} طلب{pendingCount > 1 ? 'ات' : ''} في انتظار المراجعة
            </span>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">لا توجد بيانات</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((s) => {
              const statusInfo = STATUS_LABELS[s.status]
              const phoneClean = s.contact_phone.replace(/\D/g, '')
              return (
                <div key={s.id} className="bg-white rounded-xl border border-gray-100 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-1">{s.business_name}</h3>
                      <p className="text-xs text-gray-500">{s.contact_name}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-3">
                    <a
                      href={`https://wa.me/${phoneClean}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-gray-700 hover:text-[#1F5F3F]"
                    >
                      <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span dir="ltr">{s.contact_phone}</span>
                    </a>
                    <a
                      href={`mailto:${s.contact_email}`}
                      className="flex items-center gap-2 text-gray-700 hover:text-[#1F5F3F]"
                    >
                      <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{s.contact_email}</span>
                    </a>
                    {s.district && (
                      <div className="flex items-center gap-2 text-gray-700">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span>{s.district}{s.city ? `, ${s.city}` : ''}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-700">
                      <Percent className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span>عمولة {Number(s.commission_rate)}%</span>
                    </div>
                  </div>

                  {s.address && (
                    <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2 mb-3">
                      {s.address}
                    </p>
                  )}

                  {s.description_ar && (
                    <p className="text-sm text-gray-700 mb-3">{s.description_ar}</p>
                  )}

                  {s.rejection_reason && s.status === 'rejected' && (
                    <div className="text-xs text-red-700 bg-red-50 rounded-lg p-2 mb-3">
                      <strong>سبب الرفض:</strong> {s.rejection_reason}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      تسجل: {formatDate(s.created_at)}
                    </span>

                    <div className="flex gap-2">
                      {s.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(s.id)}
                            disabled={actioning === s.id}
                            className="px-3 py-1.5 bg-green-50 text-green-800 rounded-lg text-xs font-medium hover:bg-green-100 disabled:opacity-50 flex items-center gap-1"
                          >
                            <CheckCircle className="w-3 h-3" />
                            موافقة
                          </button>
                          <button
                            onClick={() => handleReject(s.id)}
                            disabled={actioning === s.id}
                            className="px-3 py-1.5 bg-red-50 text-red-800 rounded-lg text-xs font-medium hover:bg-red-100 disabled:opacity-50 flex items-center gap-1"
                          >
                            <XCircle className="w-3 h-3" />
                            رفض
                          </button>
                        </>
                      )}
                      {s.status === 'approved' && (
                        <>
                          <Link
                            href={`/admin/units?supplier=${s.id}`}
                            className="px-3 py-1.5 bg-[#1F5F3F]/10 text-[#1F5F3F] rounded-lg text-xs font-medium hover:bg-[#1F5F3F]/20 flex items-center gap-1"
                          >
                            <Building className="w-3 h-3" />
                            وحداته
                          </Link>
                          <button
                            onClick={() => handleSuspend(s.id)}
                            disabled={actioning === s.id}
                            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 disabled:opacity-50"
                          >
                            إيقاف
                          </button>
                        </>
                      )}
                      {(s.status === 'rejected' || s.status === 'suspended') && (
                        <button
                          onClick={() => handleApprove(s.id)}
                          disabled={actioning === s.id}
                          className="px-3 py-1.5 bg-green-50 text-green-800 rounded-lg text-xs font-medium hover:bg-green-100 disabled:opacity-50"
                        >
                          إعادة تفعيل
                        </button>
                      )}
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
