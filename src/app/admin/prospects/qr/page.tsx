'use client'
// ============================================================================
// 📱 /admin/prospects/qr — أكواد QR لعارضي المعرض
//
// (٢٨ أغسطس ٢٠٢٦) محمد: «أنا عايز الناس تعمل اسكان لكيو آر كود».
//
// العارض يمسح الكود من التابلت أو من ورقة مطبوعة، فيفتح صفحة نظامه
// الجاهز باسم شركته — من غير ما يكتب لينك ولا يستنى.
//
// 🖨️ الصفحة مظبوطة للطباعة: ٦ أكواد في الصفحة، كل واحد باسم الشركة
//    ورقم الاستاند — تقصّهم وتحطهم على الاستاندات أو تديهم باليد.
// ============================================================================
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import QRCode from 'qrcode'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { Loader2, ArrowRight, Printer, Search, QrCode } from 'lucide-react'

type Row = {
  id: string
  business_name: string
  booth_number: string | null
  claim_token: string
  priority_tier: number | null
  i18n: { ar?: { name?: string } } | null
  brand: { logo?: string } | null
}

export default function ProspectQRPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [codes, setCodes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [tier, setTier] = useState<'top' | 'all'>('top')

  const load = useCallback(async () => {
    const { data } = await (supabaseBrowser as unknown as {
      from: (t: string) => { select: (c: string) => { order: (c: string) => { order: (c: string) => Promise<{ data: unknown }> } } }
    }).from('prospect_businesses')
      .select('id, business_name, booth_number, claim_token, priority_tier, i18n, brand')
      .order('priority_tier').order('booth_number')
    setRows((data as Row[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // 🖼️ توليد الأكواد — مرة واحدة لكل شركة
  useEffect(() => {
    if (!rows.length) return
    let alive = true
    ;(async () => {
      const out: Record<string, string> = {}
      for (const r of rows) {
        if (codes[r.id]) continue
        try {
          out[r.id] = await QRCode.toDataURL(
            `${window.location.origin}/b/${r.claim_token}`,
            { width: 320, margin: 1, color: { dark: '#04352A', light: '#FFFFFF' } },
          )
        } catch { /* واحد فشل مايوقفش الباقي */ }
      }
      if (alive && Object.keys(out).length) setCodes((c) => ({ ...c, ...out }))
    })()
    return () => { alive = false }
  }, [rows])   // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="py-24 text-center"><Loader2 className="w-7 h-7 animate-spin mx-auto text-gray-400" /></div>

  const shown = rows
    .filter((r) => tier === 'all' || (r.priority_tier ?? 3) <= 2)
    .filter((r) => !q.trim() || r.business_name.includes(q.trim())
      || (r.booth_number || '').toUpperCase().includes(q.trim().toUpperCase()))

  return (
    <div className="max-w-5xl mx-auto p-4" dir="rtl">
      <div className="print:hidden">
        <Link href="/admin/prospects" className="text-[11px] text-gray-500 font-bold flex items-center gap-1 mb-1">
          <ArrowRight className="w-3 h-3" /> تجهيز المعارض
        </Link>
        <div className="flex items-center justify-between gap-2 mb-2">
          <h1 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <QrCode className="w-5 h-5 text-[#059669]" /> أكواد المعرض
          </h1>
          <button onClick={() => window.print()}
            className="px-3 py-2 rounded-xl bg-[#34D399] text-[#04352A] text-sm font-black flex items-center gap-1.5">
            <Printer className="w-4 h-4" /> اطبع
          </button>
        </div>
        <p className="text-[11.5px] text-gray-500 mb-3 leading-relaxed">
          العارض يمسح الكود فيلاقي <b>نظام إدارة باسم شركته</b> جاهز — من غير ما يكتب لينك.
          <br />
          اعرضه من التابلت، أو اطبع الصفحة وقصّ الأكواد.
        </p>

        <div className="flex gap-1.5 mb-3">
          {([['top', '🎯 الأولوية'], ['all', 'الكل']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTier(k)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                tier === k ? 'bg-[#04352A] text-white' : 'bg-[#F1EEE6] text-gray-600'}`}>
              {l}
            </button>
          ))}
        </div>

        <div className="relative mb-4">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="دوّر بالاسم أو رقم الاستاند"
            className="w-full border border-gray-200 rounded-xl pr-9 pl-3 py-2.5 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 print:grid-cols-2 print:gap-4">
        {shown.map((r) => (
          <div key={r.id}
            className="rounded-2xl border border-gray-200 bg-white p-3 text-center break-inside-avoid print:border-gray-400">
            {codes[r.id] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={codes[r.id]} alt="" className="w-full max-w-[170px] mx-auto" />
            ) : (
              <div className="h-[170px] flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
              </div>
            )}
            <p className="text-[11.5px] font-black text-gray-900 mt-2 leading-tight">
              {r.i18n?.ar?.name || r.business_name}
            </p>
            {r.booth_number && (
              <p className="text-[10.5px] font-bold text-[#059669] mt-0.5">استاند {r.booth_number}</p>
            )}
            <p className="text-[9px] text-gray-400 mt-1">امسح لتشوف نظامك على مضمونة</p>
          </div>
        ))}
      </div>

      {shown.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center print:hidden">
          <p className="text-sm font-bold text-gray-600">مفيش نتايج</p>
        </div>
      )}
    </div>
  )
}
