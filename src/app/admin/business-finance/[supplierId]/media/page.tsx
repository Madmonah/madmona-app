'use client'
// 🖼️ (٩/٩/٢٠٢٦) الصور — غلاف · معرض · صور الفروع · صور الفريق
//    كانت تاب «الصور» في الشاشة القديمة /supplier/dashboard بس. محمد:
//    «خلي كل حاجة تودّي على اللوحة الكاملة» — فالتاب بقى موديول هنا،
//    بنفس الكومبوننت (components/business/MediaTab) ونفس RPC
//    supplier_self_dashboard. اللوجو في «هوية البيزنس».
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Loader2 } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import MediaTab from '@/components/business/MediaTab'

type Data = {
  ok: boolean; error?: string
  supplier: { id: string; cover_url?: string | null; gallery?: unknown[] | null }
  branches: { id: string; name: string; image_url?: string | null }[]
  employees: { id: string; full_name: string; avatar_initial?: string | null; photo_url?: string | null; branch_name?: string | null }[]
}

export default function MediaPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [data, setData] = useState<Data | null>(null)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    const { data: res, error } = await (supabaseBrowser.rpc as unknown as (
      f: string, a: Record<string, unknown>,
    ) => Promise<{ data: Data | null; error: { message: string } | null }>)(
      'supplier_self_dashboard', { p_supplier_id: supplierId },
    )
    if (error || !res?.ok) { setErr(error?.message || res?.error || 'مقدرناش نحمّل الصور'); return }
    setData(res)
  }, [supplierId])

  useEffect(() => { void load() }, [load])

  return (
    <div dir="rtl" className="min-h-screen bg-[#FAFAF7]" style={{ fontFamily: 'Cairo, Inter, system-ui, sans-serif' }}>
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href={`/admin/business-finance/${supplierId}`}
            className="w-9 h-9 rounded-full bg-[#FAFAF7] border border-gray-100 grid place-items-center">
            <ArrowRight className="w-4 h-4 text-gray-500" />
          </Link>
          <div>
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#059669]">MEDIA</p>
            <h1 className="text-xl md:text-2xl font-black text-[#1A2E26]">الصور</h1>
            <p className="text-xs text-gray-500 mt-0.5">الغلاف والمعرض وصور الفروع والفريق — بتظهر على صفحتك فورًا.</p>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        {err && <p className="text-sm text-red-600">{err}</p>}
        {!data && !err && <div className="py-20 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>}
        {data && <MediaTab supplier={data.supplier} branches={data.branches || []} employees={data.employees || []} onSaved={() => { void load() }} />}
      </main>
    </div>
  )
}
