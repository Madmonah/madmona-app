'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import QRCode from 'qrcode'
import {
  ChevronLeft, Printer, Loader2, Building2, Users, ShoppingBag, Clock,
} from 'lucide-react'

/* ============================================================
   /admin/business-finance/[supplierId]/qr-posters
   
   Printable QR posters for each branch:
   - Customer QR → /at/[code]
   - Employee clock QR → /clock/[code]
   - Employee PIN cheat-sheet (for the back wall)
   ============================================================ */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Branch = {
  id: string
  name: string
  code: string | null
  district: string | null
}

type EmployeePin = {
  employee_id: string
  full_name: string
  role_ar: string
  pin_code: string
  branch_name: string | null
  branch_code: string | null
}

export default function QRPostersPage({
  params,
}: {
  params: { supplierId: string }
}) {
  const { supplierId } = params
  const [supplierName, setSupplierName] = useState('')
  const [branches, setBranches] = useState<Branch[]>([])
  const [pins, setPins] = useState<EmployeePin[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: sup } = await supabase.from('suppliers')
        .select('business_name').eq('id', supplierId).single()
      setSupplierName((sup as any)?.business_name || '')

      const { data: br } = await supabase.from('supplier_branches')
        .select('id, name, code, district')
        .eq('supplier_id', supplierId).eq('status', 'active').order('code')
      setBranches((br || []) as Branch[])

      const { data: pinData } = await supabase.rpc('admin_get_employee_pins', {
        p_supplier_id: supplierId,
      })
      setPins((pinData || []) as EmployeePin[])

      setLoading(false)
    }
    load()
  }, [supplierId])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-8 h-8 text-[#FA8125] animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      {/* Header (hidden when printing) */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10 print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link
            href={`/admin/business-finance/${supplierId}`}
            className="text-xs font-bold text-[#6B7280] hover:text-[#FA8125] flex items-center gap-1 mb-2 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            رجوع للـ finance
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#FA8125] mb-1">
                QR POSTERS · PRINTABLE
              </p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26] tracking-tight">
                ملصقات QR — {supplierName}
              </h1>
              <p className="text-sm text-[#6B7280] mt-1">
                {branches.length} فرع · اطبع وعلق في كل فرع
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="px-5 py-2.5 rounded-xl bg-[#FA8125] text-white text-sm font-bold flex items-center gap-2 hover:shadow-md transition-shadow"
            >
              <Printer className="w-4 h-4" />
              طباعة
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-8 print:p-0 print:max-w-full">
        {/* Hint card (hidden when printing) */}
        <section className="bg-white rounded-2xl border border-gray-100 p-5 print:hidden">
          <h2 className="text-sm font-bold text-[#1A2E26] mb-3">💡 طريقة الاستخدام</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#6B7280]">
            <div className="flex items-start gap-3">
              <ShoppingBag className="w-4 h-4 text-[#FA8125] mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-[#1A2E26] mb-1">QR العملاء</p>
                <p>علقه عند الاستقبال. العميل بـ يـ scan ويختار الخدمات.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-[#FA8125] mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-[#1A2E26] mb-1">QR الموظفين</p>
                <p>علقه عند مدخل الموظفين. كل موظف بـ يدخل PIN بتاعه.</p>
              </div>
            </div>
          </div>
        </section>

        {/* One poster per branch */}
        {branches.map((b) => (
          <BranchPoster
            key={b.id}
            branch={b}
            supplierName={supplierName}
            pins={pins.filter((p) => p.branch_code === b.code || (b.code === 'HQ' && !p.branch_code))}
          />
        ))}
      </main>

      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body { background: white; }
          .branch-poster { page-break-after: always; }
          .branch-poster:last-child { page-break-after: auto; }
        }
      `}</style>
    </div>
  )
}

function BranchPoster({
  branch, supplierName, pins,
}: {
  branch: Branch
  supplierName: string
  pins: EmployeePin[]
}) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://madmonacairo.com'
  const customerUrl = `${baseUrl}/at/${branch.code}`
  const clockUrl = `${baseUrl}/clock/${branch.code}`

  return (
    <div className="branch-poster bg-white rounded-3xl border border-gray-100 overflow-hidden print:rounded-none print:border-none">
      {/* Branch header */}
      <div className="bg-[#FA8125] text-white p-6 print:p-8 text-center">
        <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/70 mb-1">
          MADMONA · {branch.code}
        </p>
        <h2 className="text-2xl md:text-3xl font-black tracking-tight">{supplierName}</h2>
        <p className="text-sm text-white/80 mt-1">
          {branch.name}{branch.district ? ` · ${branch.district}` : ''}
        </p>
      </div>

      {/* Two QR codes side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-4 p-6 print:p-8">
        <QRCard
          title="للعملاء — اختار الخدمات"
          subtitle="Scan + اختار خدمتك"
          icon={<ShoppingBag className="w-6 h-6" />}
          url={customerUrl}
          accent
        />
        <QRCard
          title="للموظفين — حضور وانصراف"
          subtitle="Scan + اكتب PIN بتاعك"
          icon={<Clock className="w-6 h-6" />}
          url={clockUrl}
        />
      </div>

      {/* Employee PINs cheat sheet */}
      {pins.length > 0 && (
        <div className="px-6 pb-6 print:px-8 print:pb-8">
          <div className="bg-[#FAFAF7] rounded-2xl p-4 print:bg-gray-50">
            <h3 className="text-xs font-bold tracking-wider uppercase text-[#6B7280] mb-3">
              🔑 الـ PINs (سري — للموظفين بس)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {pins.map((p) => (
                <div key={p.employee_id} className="bg-white rounded-lg p-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#1A2E26] truncate">{p.full_name}</p>
                    <p className="text-[10px] text-[#6B7280] truncate">{p.role_ar}</p>
                  </div>
                  <span className="text-base font-mono font-black text-[#FA8125] tracking-wider flex-shrink-0">
                    {p.pin_code}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="bg-[#FAFAF7] text-center py-3 text-[10px] text-[#6B7280] border-t border-gray-100 print:bg-gray-50">
        مدعوم بواسطة Madmona · madmonacairo.com
      </div>
    </div>
  )
}

function QRCard({
  title, subtitle, icon, url, accent,
}: {
  title: string
  subtitle: string
  icon: React.ReactNode
  url: string
  accent?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 240,
        margin: 1,
        color: { dark: '#1A2E26', light: '#FFFFFF' },
        errorCorrectionLevel: 'H',
      })
    }
  }, [url])

  return (
    <div className={`rounded-2xl border p-5 text-center ${
      accent ? 'border-[#FA8125] bg-[#FA8125]/5' : 'border-gray-200 bg-white'
    }`}>
      <div className={`inline-grid place-items-center w-12 h-12 rounded-xl mb-3 ${
        accent ? 'bg-[#FA8125] text-white' : 'bg-[#FAFAF7] text-[#FA8125]'
      }`}>
        {icon}
      </div>
      <h3 className="text-base font-black text-[#1A2E26] mb-1">{title}</h3>
      <p className="text-xs text-[#6B7280] mb-4">{subtitle}</p>
      <div className="inline-block bg-white p-3 rounded-2xl">
        <canvas ref={canvasRef} />
      </div>
      <p className="text-[10px] font-mono text-[#6B7280] mt-3 break-all" dir="ltr">{url}</p>
    </div>
  )
}
