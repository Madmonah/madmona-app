'use client'

// ============================================================================
// /account/devices — الأجهزة المتصلة (8 Aug 2026)
//
// Account Center: shows every device/session logged into this account
// (rpc my_sessions) and lets the user remotely sign any of them out
// (rpc revoke_session). The current device is marked and can't revoke itself.
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import toast, { Toaster } from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { ar } from 'date-fns/locale'
import {
  ArrowRight, Loader2, Smartphone, Monitor, Laptop, Globe,
  ShieldCheck, LogOut, RefreshCw, AlertCircle,
} from 'lucide-react'

type SessionRow = {
  session_id: string
  created_at: string
  last_active: string
  user_agent: string | null
  ip: string | null
  is_current: boolean
}

function describeDevice(ua: string | null): { name: string; Icon: typeof Smartphone } {
  const s = (ua || '').toLowerCase()
  if (!s) return { name: 'جهاز غير معروف', Icon: Globe }
  const browser =
    s.includes('edg') ? 'Edge' :
    s.includes('opr') || s.includes('opera') ? 'Opera' :
    s.includes('samsungbrowser') ? 'Samsung Internet' :
    s.includes('chrome') && !s.includes('chromium') ? 'Chrome' :
    s.includes('safari') && !s.includes('chrome') ? 'Safari' :
    s.includes('firefox') ? 'Firefox' : 'متصفح'
  if (s.includes('iphone')) return { name: `iPhone · ${browser}`, Icon: Smartphone }
  if (s.includes('ipad')) return { name: `iPad · ${browser}`, Icon: Smartphone }
  if (s.includes('android')) return { name: `Android · ${browser}`, Icon: Smartphone }
  if (s.includes('windows')) return { name: `Windows · ${browser}`, Icon: Monitor }
  if (s.includes('mac os') || s.includes('macintosh')) return { name: `Mac · ${browser}`, Icon: Laptop }
  if (s.includes('linux')) return { name: `Linux · ${browser}`, Icon: Monitor }
  return { name: browser, Icon: Globe }
}

function timeAgo(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ar })
  } catch {
    return ''
  }
}

export default function DevicesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [revoking, setRevoking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const { data: authData } = await supabaseBrowser.auth.getSession()
      if (!authData.session) {
        router.replace('/auth/login?redirect=/account/devices')
        return
      }
      const { data, error: rpcErr } = await supabaseBrowser.rpc('my_sessions')
      if (rpcErr) throw rpcErr
      const rows = (Array.isArray(data) ? data : []) as SessionRow[]
      setSessions(rows)
    } catch (e) {
      console.error('[devices] load failed:', e)
      setError('مقدرناش نجيب قايمة الأجهزة — جرّب تاني.')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    load()
  }, [load])

  const revoke = async (id: string) => {
    setRevoking(id)
    try {
      const { error: rpcErr } = await supabaseBrowser.rpc('revoke_session', {
        p_session_id: id,
      })
      if (rpcErr) throw rpcErr
      toast.success('الجهاز اتقفل — هيطلع من الحساب خلال دقيقة على الأكثر')
      setSessions((prev) => prev.filter((s) => s.session_id !== id))
    } catch (e) {
      console.error('[devices] revoke failed:', e)
      toast.error('معرفناش نقفل الجهاز — جرّب تاني.')
    } finally {
      setRevoking(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <Toaster position="top-center" />

      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/account"
            className="w-9 h-9 bg-[#FAFAF7] hover:bg-gray-100 rounded-full flex items-center justify-center transition-colors"
          >
            <ArrowRight className="w-4 h-4 text-gray-700" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-black text-gray-900">الأجهزة المتصلة</h1>
            <p className="text-[11px] text-gray-500">كل جهاز مسجّل دخول بحسابك دلوقتي</p>
          </div>
          <button
            onClick={() => { setLoading(true); load() }}
            className="w-9 h-9 bg-[#FAFAF7] hover:bg-gray-100 rounded-full flex items-center justify-center transition-colors"
            aria-label="تحديث"
          >
            <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-[#FA8125] animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-white rounded-3xl shadow-soft p-6 text-center">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => { setLoading(true); load() }}
              className="bg-[#FA8125] text-white px-6 py-2.5 rounded-2xl text-sm font-bold"
            >
              جرّب تاني
            </button>
          </div>
        ) : (
          <div className="space-y-3 animate-slide-up">
            <div className="flex items-center gap-2 px-1 mb-1">
              <ShieldCheck className="w-4 h-4 text-[#FA8125]" />
              <p className="text-xs text-gray-500">
                شايف جهاز مش بتاعك؟ اقفله فورًا وغيّر كلمة السر من{' '}
                <Link href="/auth/forgot-password" className="text-[#FA8125] font-bold hover:underline">
                  هنا
                </Link>
              </p>
            </div>

            {sessions.map((s) => {
              const { name, Icon } = describeDevice(s.user_agent)
              return (
                <div
                  key={s.session_id}
                  className={`bg-white rounded-3xl shadow-soft p-5 flex items-center gap-4 ${
                    s.is_current ? 'ring-2 ring-[#FA8125]/20' : ''
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                      s.is_current ? 'bg-[#FA8125]/10 text-[#FA8125]' : 'bg-gray-50 text-gray-500'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-gray-900 truncate">{name}</p>
                      {s.is_current && (
                        <span className="text-[10px] font-black text-[#FA8125] bg-[#FA8125]/10 px-2 py-0.5 rounded-full">
                          الجهاز ده
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      آخر نشاط {timeAgo(s.last_active)}
                      {s.ip ? <span dir="ltr"> · {s.ip}</span> : null}
                    </p>
                  </div>

                  {!s.is_current && (
                    <button
                      onClick={() => revoke(s.session_id)}
                      disabled={revoking === s.session_id}
                      className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-3.5 py-2 rounded-xl transition-colors disabled:opacity-50 flex-shrink-0"
                    >
                      {revoking === s.session_id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <LogOut className="w-3.5 h-3.5" />
                      )}
                      اقفل
                    </button>
                  )}
                </div>
              )
            })}

            {sessions.length === 0 && (
              <div className="bg-white rounded-3xl shadow-soft p-8 text-center text-sm text-gray-500">
                مفيش جلسات ظاهرة دلوقتي.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
