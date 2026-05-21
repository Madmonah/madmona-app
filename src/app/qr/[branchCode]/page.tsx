'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import QRCode from 'qrcode'
import { Loader2, Printer, AlertCircle } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const SITE = 'https://www.madmonacairo.com'

export default function BranchQR({ params }: { params: { branchCode: string } }) {
  const { branchCode } = params
  const [branch, setBranch] = useState<any>(null)
  const [qr, setQr] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const url = `${SITE}/v/${branchCode}`

  useEffect(() => {
    (async () => {
      // @ts-expect-error rpc typing
      const { data } = await supabase.rpc('public_get_branch_by_code', { p_branch_code: branchCode })
      if (data?.ok && data.branch) setBranch(data.branch)
      try {
        const png = await QRCode.toDataURL(url, { width: 900, margin: 1, color: { dark: '#1A2E26', light: '#FFFFFF' }, errorCorrectionLevel: 'M' })
        setQr(png)
      } catch { /* ignore */ }
      setLoading(false)
    })()
  }, [branchCode, url])

  if (loading) return <div className="min-h-screen bg-[#1F6F5F] flex items-center justify-center"><Loader2 className="w-9 h-9 text-white animate-spin" /></div>

  if (!branch) return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-3xl p-8 text-center max-w-sm">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h1 className="text-xl font-black text-[#1A2E26]">الفرع مش موجود</h1>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#6B7280]/15 flex flex-col items-center justify-center p-5 print:p-0 print:bg-white" dir="rtl">
      <style>{`@media print { .no-print { display:none !important } @page { margin: 12mm } }`}</style>

      {/* Printable card */}
      <div className="card bg-[#1F6F5F] rounded-[2rem] p-8 w-full max-w-sm text-center text-white shadow-xl print:shadow-none">
        <p className="text-[11px] font-bold tracking-[0.4em] uppercase text-white/60 mb-1">MADMONA</p>
        <p className="text-sm text-white/85">{branch.business_name}</p>
        <h1 className="text-2xl font-black mt-0.5 mb-1">{branch.branch_name}</h1>
        <p className="text-[13px] text-white/80 mb-5">امسحي الكود وابدئي 👇</p>

        <div className="bg-white rounded-2xl p-4 mx-auto w-fit">
          {qr ? <img src={qr} alt="QR" className="w-56 h-56" /> : <div className="w-56 h-56 grid place-items-center"><Loader2 className="w-8 h-8 text-[#1F6F5F] animate-spin" /></div>}
        </div>

        <div className="mt-5 space-y-1.5 text-[13px] text-white/90">
          <p>📅 احجزي موعد · 🎁 بقشيش · ⭐ تقييم · 🛍️ منتجات</p>
        </div>

        <div className="mt-5 pt-4 border-t border-white/15">
          <p className="font-black text-base">اللي بتأجره مضمون</p>
          <p className="text-[12px] text-white/70 mt-0.5" dir="ltr">madmonacairo.com</p>
        </div>
      </div>

      <p className="no-print text-[12px] text-[#1A2E26] mt-4 font-mono" dir="ltr">{url}</p>
      <button onClick={() => window.print()}
        className="no-print mt-3 px-6 py-3 rounded-xl bg-[#1F6F5F] text-white font-black text-sm flex items-center gap-2">
        <Printer className="w-4 h-4" /> اطبعي الكود
      </button>
    </div>
  )
}
