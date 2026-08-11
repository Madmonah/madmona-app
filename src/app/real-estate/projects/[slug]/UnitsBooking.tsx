'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  Grid3X3, Loader2, Lock, CheckCircle2, Clock, MessageCircle, BedDouble, Ruler,
} from 'lucide-react'

// =====================================================================
// 🗂️ حجز الوحدات من الماستر بلان — 48 ساعة عبر مضمونة (16 Jul 2026)
// المطوّر بيحدّث الوحدات المتاحة من داشبورده، والعميل بيحجز الوحدة
// هنا لمدة 48 ساعة لحد ما يتم التعاقد. الحجز محتاج دخول — والدخول
// بقى ثانية واحدة بالواتساب، فمفيش أوردرات بتضيع تاني.
// =====================================================================

type Unit = {
  id: string
  unit_code: string
  unit_type: string | null
  area_m2: number | null
  floor_label: string | null
  bedrooms: number | null
  price: number | null
  status: 'available' | 'held' | 'contracted' | 'sold' | 'hidden'
  held_until: string | null
  master_plan_ref: string | null
}

const WA = 'https://wa.me/201002229982'

function money(v: number): string {
  if (v >= 1_000_000) { const m = v / 1_000_000; return `${m % 1 === 0 ? m : m.toFixed(2)} مليون` }
  return v.toLocaleString('ar-EG')
}

/** محجوزة بس مهلتها خلصت = متاحة فعلياً */
function effectiveStatus(u: Unit): Unit['status'] {
  if (u.status === 'held' && u.held_until && new Date(u.held_until) < new Date()) return 'available'
  return u.status
}

export default function UnitsBooking({
  projectId, projectTitle, projectCode, bookingFee, bookingFeeNote,
}: {
  projectId: string
  projectTitle: string
  projectCode: string
  bookingFee: number | null
  bookingFeeNote: string | null
}) {
  const [units, setUnits] = useState<Unit[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [done, setDone] = useState<Unit | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        // @ts-expect-error table not in generated types yet
        const { data } = await supabaseBrowser
          .from('project_units')
          .select('id, unit_code, unit_type, area_m2, floor_label, bedrooms, price, status, held_until, master_plan_ref')
          .eq('project_id', projectId)
          .neq('status', 'hidden')
          .order('unit_code')
        setUnits((data as Unit[]) || [])
      } catch { setUnits([]) }
    })()
  }, [projectId])

  async function hold(u: Unit) {
    setErr(''); setBusy(u.id)
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) {
        // مش مسجل → صفحة الدخول (واتساب في ثانية) ويرجع هنا
        window.location.href = `/auth/login?redirect=${encodeURIComponent(window.location.pathname + '#units')}`
        return
      }
      // @ts-expect-error rpc typing
      const { data, error } = await supabaseBrowser.rpc('hold_unit_48h', {
        p_unit_id: u.id,
        p_phone: session.user.user_metadata?.phone || session.user.email || '',
        p_name: session.user.user_metadata?.full_name || null,
      })
      if (error || !data?.success) {
        setErr(data?.error === 'not_available' ? 'الوحدة دي اتحجزت لسه — جرب وحدة تانية' : 'حصلت مشكلة، جرب تاني')
        setBusy(null)
        return
      }
      setDone({ ...u, status: 'held', held_until: data.held_until })
      setUnits((prev) => prev?.map((x) => x.id === u.id
        ? { ...x, status: 'held' as const, held_until: data.held_until }
        : x) || null)
    } catch {
      setErr('حصلت مشكلة، جرب تاني')
    }
    setBusy(null)
  }

  if (!units || units.length === 0) return null

  const available = units.filter((u) => effectiveStatus(u) === 'available').length

  return (
    <section id="units" className="mt-6 scroll-mt-24">
      <div className="flex items-center justify-between mb-2">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#2FA084]">
          <Grid3X3 className="w-4 h-4" /> وحدات المشروع — احجز من الماستر بلان
        </p>
        <span className="text-[11px] font-bold text-[#FA8125] bg-[#FA8125]/8 px-2 py-0.5 rounded-full">
          {available} متاحة
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {units.map((u, i) => {
          const st = effectiveStatus(u)
          const specs = [
            u.unit_type,
            u.area_m2 ? `${u.area_m2}م²` : null,
            u.bedrooms ? `${u.bedrooms} غرف` : null,
            u.floor_label,
          ].filter(Boolean).join(' · ')
          return (
            <div key={u.id} className={`flex items-center justify-between gap-3 px-4 py-3.5 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
              <div className="min-w-0">
                <p className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                  <span className="font-mono text-[#FA8125]">{u.unit_code}</span>
                  {u.master_plan_ref && <span className="text-[10px] text-gray-400 font-normal">({u.master_plan_ref})</span>}
                </p>
                {specs && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <Ruler className="w-3 h-3" /> {specs}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {u.price != null && (
                  <p className="text-[#FA8125] font-bold text-sm whitespace-nowrap">{money(u.price)} ج</p>
                )}
                {st === 'available' && (
                  <button
                    onClick={() => hold(u)}
                    disabled={busy === u.id}
                    className="flex items-center gap-1.5 bg-[#FA8125] text-white text-xs font-bold px-3.5 py-2 rounded-full hover:bg-[#175a4d] transition-colors disabled:opacity-60"
                  >
                    {busy === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
                    احجزها ٤٨ ساعة
                  </button>
                )}
                {st === 'held' && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-full">
                    <Lock className="w-3 h-3" /> محجوزة مؤقتاً
                  </span>
                )}
                {(st === 'contracted' || st === 'sold') && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-gray-400 bg-gray-50 px-2.5 py-1.5 rounded-full">
                    <BedDouble className="w-3 h-3" /> {st === 'sold' ? 'مباعة' : 'متعاقد عليها'}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-2 text-[11px] text-gray-400 leading-relaxed">
        ⏱️ الحجز بيثبّت الوحدة ليك <b>٤٨ ساعة</b> لحد ما يتم التعاقد مع المطوّر عبر مضمونة.
        {bookingFee ? <> رسوم الحجز: <b>{money(bookingFee)} ج</b>{bookingFeeNote ? ` (${bookingFeeNote})` : ''} — بتتأكد مع الفريق.</> : ' فريق مضمونة بيتواصل معاك فوراً لإتمام الخطوات.'}
      </p>

      {err && <p className="mt-2 text-xs font-bold text-red-600">{err}</p>}

      {/* ✅ نجاح الحجز */}
      {done && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setDone(null)}>
          <div className="bg-white rounded-3xl p-7 max-w-sm w-full text-center" onClick={(e) => e.stopPropagation()}>
            <CheckCircle2 className="w-12 h-12 text-[#2FA084] mx-auto mb-3" />
            <p className="font-black text-gray-900 text-lg mb-1">اتحجزت ليك ٤٨ ساعة 🎉</p>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              وحدة <b className="font-mono">{done.unit_code}</b> في {projectTitle} محجوزة باسمك لحد{' '}
              <b>{done.held_until ? new Date(done.held_until).toLocaleString('ar-EG', { weekday: 'long', hour: 'numeric', minute: '2-digit' }) : '٤٨ ساعة'}</b>.
              كلّم المارد دلوقتي نكمّل التعاقد.
            </p>
            <a
              href={`${WA}?text=${encodeURIComponent(`حجزت وحدة ${done.unit_code} في ${projectTitle} (${projectCode}) — عايز أكمل التعاقد`)}`}
              target="_blank" rel="noopener"
              className="flex items-center justify-center gap-2 w-full bg-[#FA8125] text-white font-bold py-3.5 rounded-2xl"
            >
              <MessageCircle className="w-4 h-4" /> كمّل التعاقد مع المارد
            </a>
          </div>
        </div>
      )}
    </section>
  )
}
