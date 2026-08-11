'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Loader2, MapPin, Navigation, ChevronLeft, Building2 } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

type State =
  | { s: 'locating' }
  | { s: 'found'; code: string; name: string; business: string; dist: number }
  | { s: 'picker' }

export default function VisitRouter() {
  const router = useRouter()
  const [state, setState] = useState<State>({ s: 'locating' })
  const [branches, setBranches] = useState<any[]>([])

  async function loadBranches() {
    // @ts-expect-error rpc typing
    const { data } = await supabase.rpc('public_list_branches')
    setBranches(data || [])
  }

  function locate() {
    setState({ s: 'locating' })
    if (typeof navigator === 'undefined' || !navigator.geolocation) { loadBranches(); setState({ s: 'picker' }); return }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        // @ts-expect-error rpc typing
        const { data } = await supabase.rpc('public_nearest_branch', { p_lat: pos.coords.latitude, p_lng: pos.coords.longitude })
        if (data?.ok && data.branch) {
          setState({ s: 'found', code: data.branch.code, name: data.branch.name, business: data.branch.business_name, dist: data.branch.distance_m })
        } else { await loadBranches(); setState({ s: 'picker' }) }
      },
      async () => { await loadBranches(); setState({ s: 'picker' }) },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    )
  }

  useEffect(() => { locate() }, [])

  return (
    <div className="min-h-screen bg-[#FA8125] flex flex-col" dir="rtl">
      <header className="text-white px-5 pt-10 pb-6 text-center">
        <p className="text-[10px] font-bold tracking-[0.4em] uppercase text-white/55 mb-2">MADMONA</p>
        <h1 className="text-2xl font-black">أهلاً بيكي 👋</h1>
        <p className="text-sm text-white/80 mt-1">بنحدد فرعك من موقعك</p>
      </header>

      <main className="flex-1 bg-[#FAFAF7] rounded-t-[2rem] px-4 py-7">
        <div className="max-w-md mx-auto">
          {state.s === 'locating' && (
            <div className="text-center py-14">
              <div className="inline-grid place-items-center w-16 h-16 rounded-2xl bg-[#FA8125]/10 text-[#FA8125] mb-4"><Navigation className="w-8 h-8 animate-pulse" /></div>
              <p className="font-black text-[#1A2E26]">بنحدد مكانك...</p>
              <p className="text-sm text-[#6B7280] mt-1">اسمحي بالموقع عشان نوديكي لفرعك على طول</p>
            </div>
          )}

          {state.s === 'found' && (
            <div>
              <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center shadow-sm mb-3">
                <div className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-[#FA8125]/10 text-[#FA8125] mb-3"><MapPin className="w-7 h-7" /></div>
                <p className="text-[12px] text-[#6B7280] mb-1">أقرب فرع ليكي</p>
                <h2 className="text-xl font-black text-[#1A2E26]">{state.name}</h2>
                <p className="text-[12px] text-[#6B7280] mt-1">{state.business} · على بُعد {state.dist} متر تقريباً</p>
                <button onClick={() => router.push(`/v/${state.code}`)} className="w-full mt-5 py-3.5 rounded-xl bg-[#FA8125] text-white font-black text-sm">يلا ادخلي الفرع</button>
              </div>
              <button onClick={async () => { await loadBranches(); setState({ s: 'picker' }) }} className="w-full text-center text-[13px] font-bold text-[#6B7280] py-2">مش ده الفرع؟ اختاري بنفسك</button>
            </div>
          )}

          {state.s === 'picker' && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-[#FA8125]" />
                <p className="font-black text-[#1A2E26]">اختاري فرعك</p>
              </div>
              <div className="space-y-2">
                {branches.map((b: any) => (
                  <button key={b.code} onClick={() => router.push(`/v/${b.code}`)} className="w-full bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between text-right active:scale-[0.99] transition-transform hover:border-[#FA8125]/40">
                    <div>
                      <p className="font-black text-sm text-[#1A2E26]">{b.name}</p>
                      <p className="text-[11px] text-[#6B7280]">{b.business_name}</p>
                    </div>
                    <ChevronLeft className="w-5 h-5 text-[#6B7280]" />
                  </button>
                ))}
              </div>
              <button onClick={locate} className="w-full mt-4 py-3 rounded-xl bg-[#FA8125]/10 text-[#FA8125] font-black text-sm flex items-center justify-center gap-2"><Navigation className="w-4 h-4" /> جرّبي تحديد الموقع تاني</button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
