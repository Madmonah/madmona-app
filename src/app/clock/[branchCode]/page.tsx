'use client'

/* Employee attendance via QR — /clock/[branchCode].
   Staff scan the branch QR, enter their PIN (or phone), and the page
   captures GPS and calls employee_clock_via_qr which geofences the
   branch (anti-fraud) and toggles clock-in / clock-out. */

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  Loader2, Delete, LogIn, LogOut, MapPin, AlertCircle, CheckCircle2, Clock,
} from 'lucide-react'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(SUPABASE_URL, ANON)

export default function ClockPage({ params }: { params: { branchCode: string } }) {
  const { branchCode } = params
  const [branch, setBranch] = useState<any>(null)
  const [logo, setLogo] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'locating' | 'sending'>('idle')
  const [err, setErr] = useState<any>(null)
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    (async () => {
      // @ts-expect-error rpc typing
      const { data: bi } = await supabase.rpc('public_get_branch_info', { p_branch_code: branchCode })
      setBranch(bi?.branch || null)
      if (bi?.branch?.supplier_id) {
        // @ts-expect-error rpc typing
        const { data: br } = await supabase.rpc('public_get_supplier_branding', { p_supplier_id: bi.branch.supplier_id })
        if (br?.logo_url) setLogo(br.logo_url)
      }
      setLoading(false)
    })()
  }, [branchCode])

  function press(d: string) { if (pin.length < 11) setPin(pin + d); setErr(null) }
  function back() { setPin(pin.slice(0, -1)); setErr(null) }

  function getPos(): Promise<{ lat: number; lng: number; acc: number } | null> {
    return new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null)
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 9000, maximumAge: 0 },
      )
    })
  }

  async function submit() {
    if (pin.length < 3 || busy) return
    setBusy(true); setErr(null); setPhase('locating')
    const pos = await getPos()
    setPhase('sending')
    // @ts-expect-error rpc typing
    const { data } = await supabase.rpc('employee_clock_via_qr', {
      p_branch_code: branchCode,
      p_phone_or_pin: pin,
      p_lat: pos?.lat ?? null,
      p_lng: pos?.lng ?? null,
      p_accuracy_m: pos?.acc ?? null,
    })
    setBusy(false); setPhase('idle')
    if (data?.ok) {
      setResult(data); setPin('')
      setTimeout(() => setResult(null), 7000)
    } else {
      setErr(data || { error: 'حصل خطأ، حاول تاني' }); setPin('')
    }
  }

  if (loading) return <div className="min-h-screen bg-[#1F6F5F] flex items-center justify-center"><Loader2 className="w-9 h-9 text-white animate-spin" /></div>

  if (!branch) return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-3xl p-8 text-center max-w-sm shadow-sm">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h1 className="text-xl font-black text-[#1A2E26]">الفرع مش موجود</h1>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#FAFAF7] flex flex-col" dir="rtl">
      {/* header */}
      <header className="bg-[#1F6F5F] text-white">
        <div className="max-w-sm mx-auto px-5 pt-7 pb-8 text-center">
          <p className="text-[10px] font-bold tracking-[0.4em] uppercase text-white/55 mb-2">MADMONA · حضور الموظفين</p>
          {logo
            ? <div className="mx-auto mb-2 rounded-2xl overflow-hidden ring-1 ring-white/20 bg-[#14110f]" style={{ width: 'min(60%, 200px)' }}><img src={logo} alt="" className="w-full block" /></div>
            : <h1 className="text-xl font-black">{branch.name}</h1>}
          <p className="text-[13px] text-white/85 font-bold">{branch.name}</p>
        </div>
      </header>

      <main className="flex-1 max-w-sm mx-auto w-full px-5 -mt-4 pb-8">
        {result ? (
          <ResultCard result={result} onDone={() => setResult(null)} />
        ) : (
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-[0_10px_40px_-12px_rgba(31,111,95,0.25)]">
            <p className="text-center text-sm font-bold text-[#1A2E26] mb-1">سجّل دخولك أو خروجك</p>
            <p className="text-center text-[12px] text-[#6B7280] mb-4">اكتب كود الـ PIN بتاعك أو رقم موبايلك</p>

            {/* PIN display */}
            <div className="flex items-center justify-center gap-2 h-14 mb-2" dir="ltr">
              {pin.length === 0
                ? <span className="text-[#6B7280] text-sm">— — — —</span>
                : pin.split('').map((_, i) => <span key={i} className="w-3.5 h-3.5 rounded-full bg-[#1F6F5F]" />)}
            </div>

            {err && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-red-700 leading-relaxed">{err.error || 'حصل خطأ'}</p>
              </div>
            )}

            {/* keypad */}
            <div className="grid grid-cols-3 gap-2.5">
              {['1','2','3','4','5','6','7','8','9'].map(d => (
                <button key={d} onClick={() => press(d)} disabled={busy}
                  className="h-14 rounded-2xl bg-[#FAFAF7] text-2xl font-black text-[#1A2E26] active:bg-[#1F6F5F]/10 active:scale-95 transition-all disabled:opacity-50">{d}</button>
              ))}
              <button onClick={back} disabled={busy} className="h-14 rounded-2xl bg-[#FAFAF7] grid place-items-center text-[#6B7280] active:scale-95 transition-all disabled:opacity-50"><Delete className="w-6 h-6" /></button>
              <button onClick={() => press('0')} disabled={busy} className="h-14 rounded-2xl bg-[#FAFAF7] text-2xl font-black text-[#1A2E26] active:bg-[#1F6F5F]/10 active:scale-95 transition-all disabled:opacity-50">0</button>
              <button onClick={submit} disabled={busy || pin.length < 3}
                className="h-14 rounded-2xl bg-[#1F6F5F] text-white grid place-items-center active:scale-95 transition-all disabled:opacity-40 shadow-lg shadow-[#1F6F5F]/25">
                {busy ? <Loader2 className="w-6 h-6 animate-spin" /> : <LogIn className="w-6 h-6" />}
              </button>
            </div>

            <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-[#6B7280]">
              <MapPin className="w-3.5 h-3.5 text-[#1F6F5F]" />
              {phase === 'locating' ? 'بنتأكد إنك في الفرع...' : phase === 'sending' ? 'جاري التسجيل...' : 'بنتحقق من موقعك وقت التسجيل'}
            </div>
          </div>
        )}

        <p className="text-center text-[11px] text-[#6B7280] mt-5">madmonacairo.com · نظام حضور مضمونة</p>
      </main>
    </div>
  )
}

function ResultCard({ result, onDone }: any) {
  const isIn = result.action === 'clock_in'
  const t = result.timestamp ? new Date(result.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''
  const emp = result.employee || {}
  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-7 text-center shadow-[0_10px_40px_-12px_rgba(31,111,95,0.25)]">
      <div className={`w-20 h-20 rounded-2xl grid place-items-center mx-auto mb-4 ${isIn ? 'bg-[#1F6F5F]' : 'bg-[#1A2E26]'} text-white`}>
        {isIn ? <LogIn className="w-10 h-10" /> : <LogOut className="w-10 h-10" />}
      </div>
      <p className="text-[13px] font-bold text-[#1F6F5F] mb-1">{isIn ? 'تم تسجيل الحضور ✅' : 'تم تسجيل الانصراف 👋'}</p>
      <h2 className="text-2xl font-black text-[#1A2E26]">{emp.full_name || ''}</h2>
      {emp.role_ar && <p className="text-[12px] text-[#6B7280] mt-0.5">{emp.role_ar}</p>}

      <div className="mt-5 bg-[#FAFAF7] rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-[#6B7280] flex items-center gap-1.5"><Clock className="w-4 h-4" /> {isIn ? 'وقت الدخول' : 'وقت الخروج'}</span>
          <span className="font-mono font-black text-[#1A2E26]" dir="ltr">{t}</span>
        </div>
        {!isIn && result.hours_worked != null && (
          <div className="flex items-center justify-between border-t border-gray-200 pt-2">
            <span className="text-[12px] text-[#6B7280]">ساعات الشغل النهارده</span>
            <span className="font-mono font-black text-[#1F6F5F]" dir="ltr">{result.hours_worked} س</span>
          </div>
        )}
        {result.distance_m != null && (
          <div className="flex items-center justify-between border-t border-gray-200 pt-2">
            <span className="text-[12px] text-[#6B7280] flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-[#1F6F5F]" /> الموقع متأكد</span>
            <span className="font-mono text-[12px] text-[#6B7280]" dir="ltr">{result.distance_m} م</span>
          </div>
        )}
      </div>

      <button onClick={onDone} className="w-full mt-5 py-3.5 rounded-2xl bg-[#1F6F5F] text-white font-black text-sm shadow-lg shadow-[#1F6F5F]/20">تمام</button>
    </div>
  )
}
