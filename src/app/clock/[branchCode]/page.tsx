'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  LogIn, LogOut, Loader2, Check, X, MapPin,
  Delete, AlertCircle, Navigation, ShieldCheck,
} from 'lucide-react'

/* ============================================================
   /clock/[branchCode] — Employee attendance with GPS geofence
   
   Anti-fraud: scan QR + must be physically at branch (GPS check)
   ============================================================ */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Branch = {
  branch_id: string
  branch_name: string
  branch_code: string
  supplier_id: string
  business_name: string
}

type GeoState =
  | { status: 'idle' }
  | { status: 'requesting' }
  | { status: 'denied'; message: string }
  | { status: 'unavailable'; message: string }
  | { status: 'ready'; lat: number; lng: number; accuracy: number }

type Result = {
  ok: boolean
  action?: 'clock_in' | 'clock_out'
  employee?: { full_name: string; role_ar: string; avatar_initial: string }
  branch?: { name: string; business_name: string }
  timestamp?: string
  hours_worked?: number | null
  distance_m?: number
  error?: string
  reason_code?: string
  clocked_in_at?: string
  clocked_out_at?: string
  max_radius_m?: number
}

export default function ClockPage({
  params,
}: {
  params: { branchCode: string }
}) {
  const { branchCode } = params
  const [branch, setBranch] = useState<Branch | null>(null)
  const [loading, setLoading] = useState(true)
  const [geo, setGeo] = useState<GeoState>({ status: 'idle' })
  const [pin, setPin] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // Load branch info
  useEffect(() => {
    async function load() {
      // @ts-expect-error
      const { data } = await supabase.rpc('public_get_branch_by_code', {
        p_branch_code: branchCode,
      })
      const r = data as { ok: boolean; branch?: Branch }
      if (r?.ok && r.branch) setBranch(r.branch)
      setLoading(false)
    }
    load()
  }, [branchCode])

  // Request GPS on load
  function requestGps() {
    if (!('geolocation' in navigator)) {
      setGeo({ status: 'unavailable', message: 'الجهاز ده ما يدعمش الـ GPS' })
      return
    }
    setGeo({ status: 'requesting' })
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({
          status: 'ready',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        })
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeo({ status: 'denied', message: 'لازم تسمح بالموقع — الـ system بـ يتأكد إنك في الفرع' })
        } else {
          setGeo({ status: 'unavailable', message: 'مفيش signal GPS · جرّب خروج وارجع' })
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  // Auto-request on mount
  useEffect(() => {
    if (branch && geo.status === 'idle') requestGps()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch])

  function addDigit(d: string) { if (pin.length < 4) setPin(pin + d) }
  function removeDigit() { setPin(pin.slice(0, -1)) }

  async function submit() {
    if (pin.length < 4 || geo.status !== 'ready') return
    setSubmitting(true)
    // @ts-expect-error
    const { data } = await supabase.rpc('employee_clock_via_qr', {
      p_branch_code: branchCode,
      p_phone_or_pin: pin,
      p_lat: geo.lat,
      p_lng: geo.lng,
      p_accuracy_m: geo.accuracy,
    })
    setResult(data as Result)
    setSubmitting(false)
    setPin('')
  }

  function reset() {
    setResult(null)
    setPin('')
    // Re-request GPS for the next person
    requestGps()
  }

  useEffect(() => {
    if (result?.ok) {
      const id = setTimeout(reset, 6000)
      return () => clearTimeout(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1F6F5F] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-10 h-10 text-white animate-spin" />
      </div>
    )
  }

  if (!branch) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl p-8 text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h1 className="text-xl font-black text-[#1A2E26] mb-2">فرع غير موجود</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1F6F5F] flex flex-col" dir="rtl">
      {/* Top: branch + live clock */}
      <header className="text-white px-4 py-6 text-center">
        <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/70 mb-1">
          MADMONA · ATTENDANCE
        </p>
        <h1 className="text-xl font-black tracking-tight mb-1">{branch.business_name}</h1>
        <p className="text-xs text-white/80">{branch.branch_name}</p>
        <div className="mt-4">
          <p className="text-4xl font-black font-mono tabular-nums">
            {now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <p className="text-xs text-white/70 mt-1">
            {now.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 bg-[#FAFAF7] rounded-t-[2rem] mt-2 px-4 py-6 flex flex-col">
        {result ? (
          <ResultView result={result} onReset={reset} />
        ) : geo.status === 'denied' || geo.status === 'unavailable' ? (
          <GpsBlockedView message={geo.message} onRetry={requestGps} />
        ) : geo.status === 'requesting' || geo.status === 'idle' ? (
          <GpsRequestingView />
        ) : (
          <PinEntryView
            pin={pin} addDigit={addDigit} removeDigit={removeDigit}
            onSubmit={submit} submitting={submitting}
            accuracy={geo.accuracy}
          />
        )}
      </main>
    </div>
  )
}

/* ============================================================
   VIEWS
   ============================================================ */

function GpsRequestingView() {
  return (
    <div className="max-w-sm mx-auto w-full text-center py-12">
      <div className="inline-grid place-items-center w-16 h-16 rounded-2xl bg-[#1F6F5F]/10 text-[#1F6F5F] mb-4">
        <Navigation className="w-8 h-8 animate-pulse" />
      </div>
      <h2 className="text-lg font-black text-[#1A2E26] mb-1">جاري التحقق من الموقع...</h2>
      <p className="text-sm text-[#6B7280]">السماح للموقع ضروري عشان نتأكد إنك في الفرع</p>
    </div>
  )
}

function GpsBlockedView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="max-w-sm mx-auto w-full">
      <div className="bg-white rounded-3xl p-6 text-center mb-4">
        <div className="inline-grid place-items-center w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 mb-3">
          <MapPin className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-black text-[#1A2E26] mb-2">محتاج الموقع</h2>
        <p className="text-sm text-[#6B7280] mb-5 leading-relaxed">{message}</p>
        <div className="bg-[#FAFAF7] rounded-xl p-3 text-right text-xs text-[#6B7280] space-y-1">
          <p>📱 <span className="text-[#1A2E26] font-bold">Safari:</span> Settings → Safari → Location → Allow</p>
          <p>📱 <span className="text-[#1A2E26] font-bold">Chrome:</span> 🔒 (في الـ URL) → Location → Allow</p>
        </div>
      </div>
      <button onClick={onRetry} className="w-full bg-[#1F6F5F] text-white rounded-xl py-3.5 font-black flex items-center justify-center gap-2">
        <Navigation className="w-4 h-4" />
        جرّب تاني
      </button>
    </div>
  )
}

function PinEntryView({
  pin, addDigit, removeDigit, onSubmit, submitting, accuracy,
}: {
  pin: string
  addDigit: (d: string) => void
  removeDigit: () => void
  onSubmit: () => void
  submitting: boolean
  accuracy: number
}) {
  return (
    <div className="max-w-sm mx-auto w-full flex-1 flex flex-col">
      {/* GPS confirmed badge */}
      <div className="flex items-center justify-center gap-2 mb-5">
        <div className="inline-flex items-center gap-1.5 bg-[#1F6F5F]/10 text-[#1F6F5F] rounded-full px-3 py-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="text-[11px] font-bold">موقعك مؤكد · دقة ±{Math.round(accuracy)}م</span>
        </div>
      </div>

      <div className="text-center mb-6">
        <h2 className="text-xl font-black text-[#1A2E26] mb-1">دخّل الـ PIN</h2>
        <p className="text-xs text-[#6B7280]">٤ أرقام مخصصة ليك</p>
      </div>

      {/* PIN dots */}
      <div className="flex items-center justify-center gap-3 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center text-2xl font-black transition-all ${
              pin[i] ? 'border-[#1F6F5F] bg-[#1F6F5F]/5 text-[#1A2E26]' : 'border-gray-200 bg-white text-gray-300'
            }`}
          >
            {pin[i] ? '•' : ''}
          </div>
        ))}
      </div>

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto mb-4">
        {['1','2','3','4','5','6','7','8','9'].map((d) => (
          <NumpadKey key={d} onClick={() => addDigit(d)}>{d}</NumpadKey>
        ))}
        <NumpadKey onClick={removeDigit}><Delete className="w-5 h-5" /></NumpadKey>
        <NumpadKey onClick={() => addDigit('0')}>0</NumpadKey>
        <NumpadKey onClick={onSubmit} disabled={pin.length < 4 || submitting} accent>
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
        </NumpadKey>
      </div>

      <p className="text-[11px] text-center text-[#6B7280] mt-4">
        ⓘ اول مرة = حضور · ثاني مرة = انصراف
      </p>
    </div>
  )
}

function NumpadKey({ children, onClick, disabled, accent }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`h-16 rounded-2xl text-2xl font-black transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none ${
        accent ? 'bg-[#1F6F5F] text-white hover:shadow-lg' : 'bg-white text-[#1A2E26] hover:bg-[#FAFAF7] border border-gray-100'
      }`}
    >{children}</button>
  )
}

function ResultView({ result, onReset }: { result: Result; onReset: () => void }) {
  // Out of range
  if (!result.ok && result.reason_code === 'out_of_range') {
    return (
      <div className="max-w-sm mx-auto w-full">
        <div className="bg-white rounded-3xl p-6 text-center mb-4 border-2 border-red-200">
          <div className="inline-grid place-items-center w-16 h-16 rounded-2xl bg-red-50 text-red-600 mb-3">
            <MapPin className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-[#1A2E26] mb-2">إنت بعيد عن الفرع</h2>
          <p className="text-sm text-[#6B7280] mb-3 leading-relaxed">{result.error}</p>
          <div className="bg-[#FAFAF7] rounded-xl p-3 inline-block">
            <p className="text-3xl font-black font-mono text-red-600">{result.distance_m}م</p>
            <p className="text-[10px] text-[#6B7280] mt-1">الحد الأقصى ±{result.max_radius_m}م</p>
          </div>
          <p className="text-[11px] text-[#6B7280] mt-4">
            ⓘ لازم تكون في الفرع نفسه عشان تسجل حضور
          </p>
        </div>
        <button onClick={onReset} className="w-full bg-[#1F6F5F] text-white rounded-xl py-3 font-bold">
          حاول تاني
        </button>
      </div>
    )
  }

  // Already done
  if (!result.ok && result.reason_code === 'already_done' && result.employee) {
    return (
      <div className="max-w-sm mx-auto w-full">
        <div className="bg-white rounded-3xl p-6 text-center mb-4">
          <div className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 mb-3">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-black text-[#1A2E26] mb-1">اهلاً {result.employee.full_name} 👋</h2>
          <p className="text-sm text-[#6B7280] mb-4">{result.error}</p>
          <div className="bg-[#FAFAF7] rounded-xl p-3 text-right text-xs space-y-1">
            <p><span className="text-[#6B7280]">دخل: </span><span className="font-mono font-bold text-[#1A2E26]">{new Date(result.clocked_in_at!).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span></p>
            {result.clocked_out_at && <p><span className="text-[#6B7280]">خرج: </span><span className="font-mono font-bold text-[#1A2E26]">{new Date(result.clocked_out_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span></p>}
          </div>
        </div>
        <button onClick={onReset} className="w-full bg-[#1F6F5F] text-white rounded-xl py-3 font-bold">تمام</button>
      </div>
    )
  }

  // Generic error
  if (!result.ok) {
    return (
      <div className="max-w-sm mx-auto w-full">
        <div className="bg-white rounded-3xl p-6 text-center mb-4">
          <div className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-red-50 text-red-600 mb-3">
            <X className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-black text-[#1A2E26] mb-1">في مشكلة</h2>
          <p className="text-sm text-[#6B7280]">{result.error}</p>
        </div>
        <button onClick={onReset} className="w-full bg-[#1F6F5F] text-white rounded-xl py-3 font-bold">حاول تاني</button>
      </div>
    )
  }

  // Success
  const isClockIn = result.action === 'clock_in'
  const time = new Date(result.timestamp!).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="max-w-sm mx-auto w-full">
      <div className="bg-white rounded-3xl p-6 text-center mb-4">
        <div className={`inline-grid place-items-center w-20 h-20 rounded-2xl mb-4 ${
          isClockIn ? 'bg-[#1F6F5F]/10 text-[#1F6F5F]' : 'bg-amber-50 text-amber-600'
        }`}>
          {isClockIn ? <LogIn className="w-10 h-10" /> : <LogOut className="w-10 h-10" />}
        </div>
        
        <p className="text-xs font-bold tracking-wider uppercase text-[#6B7280] mb-1">
          {isClockIn ? '✓ تم تسجيل الحضور' : '✓ تم تسجيل الانصراف'}
        </p>
        <h2 className="text-2xl font-black text-[#1A2E26] mb-1">
          اهلاً {result.employee?.full_name} 👋
        </h2>
        <p className="text-sm text-[#6B7280] mb-4">{result.employee?.role_ar}</p>
        
        <div className="bg-[#FAFAF7] rounded-xl py-3 px-4">
          <p className="text-3xl font-black font-mono text-[#1F6F5F]">{time}</p>
          {result.hours_worked && (
            <p className="text-xs text-[#6B7280] mt-1">
              عملت {result.hours_worked} ساعة اليوم 💪
            </p>
          )}
          {result.distance_m !== null && result.distance_m !== undefined && (
            <p className="text-[10px] text-[#6B7280] mt-1">
              <ShieldCheck className="w-3 h-3 inline" /> داخل الفرع ({result.distance_m}م)
            </p>
          )}
        </div>
      </div>
      
      <button onClick={onReset} className="w-full bg-white text-[#1A2E26] rounded-xl py-3 font-bold border border-gray-100">
        إغلاق (٦ ثواني)
      </button>
    </div>
  )
}
