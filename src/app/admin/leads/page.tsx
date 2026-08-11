'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { Lock, Phone, Calendar, MessageSquare, MapPin, RefreshCw, LogOut } from 'lucide-react'

interface Lead {
  id: string
  customer_name: string
  customer_phone: string
  space_slug: string
  pricing_label: string | null
  preferred_date: string | null
  notes: string | null
  status: string
  source: string | null
  created_at: string
  updated_at: string
}

const SPACE_NAMES: Record<string, string> = {
  'indoor-coworking': 'المساحة الداخلية',
  'outdoor-garden': 'الجاردن',
  'private-office': 'الأوفيس الخاص',
  'meeting-room': 'غرفة الاجتماعات',
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: 'جديد', color: 'bg-blue-100 text-blue-800' },
  contacted: { label: 'تم التواصل', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'مؤكد', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'ملغي', color: 'bg-gray-100 text-gray-600' },
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('ar-EG', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function AdminLeadsPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Auto-restore password from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('madmona_admin_pw')
    if (stored) {
      setPassword(stored)
      tryFetch(stored, true)
    }
  }, [])

  const tryFetch = async (pw: string, silent = false) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/leads', {
        headers: { 'X-Admin-Password': pw },
      })
      if (res.status === 401) {
        if (!silent) setAuthError('كلمة السر غلط')
        sessionStorage.removeItem('madmona_admin_pw')
        setAuthed(false)
        return
      }
      if (!res.ok) {
        setError('حصل خطأ في جلب البيانات')
        return
      }
      const data = await res.json()
      setLeads(data.leads || [])
      setAuthed(true)
      sessionStorage.setItem('madmona_admin_pw', pw)
    } catch {
      setError('مشكلة في الاتصال')
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
    setLeads([])
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/admin/leads', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password,
        },
        body: JSON.stringify({ id, status }),
      })
      if (res.ok) {
        // Optimistically update locally
        setLeads((prev) =>
          prev.map((l) => (l.id === id ? { ...l, status } : l))
        )
      }
    } catch {
      // Silent — refresh will re-sync
    }
  }

  // ============ Login Screen ============
  if (!authed) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          <div className="flex items-center justify-center w-12 h-12 bg-[#2B4521]/10 rounded-full mb-4 mx-auto">
            <Lock className="w-5 h-5 text-[#2B4521]" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 text-center mb-1">لوحة الإدارة</h1>
          <p className="text-sm text-gray-500 text-center mb-6">إدخال كلمة السر للوصول</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="كلمة السر"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2B4521]/30 focus:border-[#2B4521] transition-colors text-right"
              autoFocus
            />
            {authError && <p className="text-sm text-red-600 text-center">{authError}</p>}
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-[#2B4521] text-white py-3 rounded-xl font-semibold hover:bg-[#2B4521]/90 disabled:opacity-50 transition-colors"
            >
              {loading ? 'جاري التحقق...' : 'دخول'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ============ Leads Dashboard ============
  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">طلبات الحجز</h1>
            <p className="text-xs text-gray-500">{leads.length} طلب</p>
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
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
            {error}
          </div>
        )}

        {leads.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">لا توجد طلبات حجز بعد</p>
          </div>
        )}

        <div className="space-y-3">
          {leads.map((lead) => {
            const statusInfo = STATUS_LABELS[lead.status] || STATUS_LABELS.new
            const spaceName = SPACE_NAMES[lead.space_slug] || lead.space_slug
            const phoneClean = lead.customer_phone.replace(/\D/g, '')
            const whatsappUrl = `https://wa.me/${phoneClean}`
            const telUrl = `tel:${lead.customer_phone}`

            return (
              <div
                key={lead.id}
                className="bg-white rounded-xl border border-gray-100 p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{lead.customer_name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{formatDate(lead.created_at)}</p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}
                  >
                    {statusInfo.label}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-3">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span dir="ltr">{lead.customer_phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span>{spaceName}</span>
                    {lead.pricing_label && (
                      <span className="text-xs text-[#2FA084]">· {lead.pricing_label}</span>
                    )}
                  </div>
                  {lead.preferred_date && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span>{lead.preferred_date}</span>
                    </div>
                  )}
                </div>

                {lead.notes && (
                  <div className="flex items-start gap-2 text-sm text-gray-600 mb-3 bg-gray-50 rounded-lg p-3">
                    <MessageSquare className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{lead.notes}</p>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-[#25D366]/10 text-[#1a8a45] rounded-lg text-xs font-medium hover:bg-[#25D366]/20 transition-colors"
                  >
                    واتساب
                  </a>
                  <a
                    href={telUrl}
                    className="px-3 py-1.5 bg-[#2B4521]/10 text-[#2B4521] rounded-lg text-xs font-medium hover:bg-[#2B4521]/20 transition-colors"
                  >
                    اتصال
                  </a>
                  <div className="flex-1" />
                  {lead.status !== 'contacted' && (
                    <button
                      onClick={() => updateStatus(lead.id, 'contacted')}
                      className="px-3 py-1.5 bg-yellow-50 text-yellow-800 rounded-lg text-xs font-medium hover:bg-yellow-100 transition-colors"
                    >
                      تم التواصل
                    </button>
                  )}
                  {lead.status !== 'confirmed' && (
                    <button
                      onClick={() => updateStatus(lead.id, 'confirmed')}
                      className="px-3 py-1.5 bg-green-50 text-green-800 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors"
                    >
                      مؤكد
                    </button>
                  )}
                  {lead.status !== 'cancelled' && (
                    <button
                      onClick={() => updateStatus(lead.id, 'cancelled')}
                      className="px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-100 transition-colors"
                    >
                      إلغاء
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
