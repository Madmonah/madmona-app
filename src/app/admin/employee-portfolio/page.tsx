'use client'
// ============================================================================
// 👤 /admin/employee-portfolio — مين ضاف إيه
//
// (٢٨ أغسطس ٢٠٢٦) محمد: «محتاج أعرف مين في موظفين مضمونة ضاف الإعلان
//   أو المورد أو ضاف البيزنس، مع صلاحية إن كل موظف ضاف حاجة يكون
//   مسئول عنها ويكون ظاهر ليه الموردين بتوعه أو المنتجات اللي هو
//   ضافها أو حتى العميل لو اتعمل ليه أكونت عن طريق لينك الموظف».
// ============================================================================
import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { Loader2, Users, Store, LayoutGrid, UserPlus, Wallet, Copy, Check } from 'lucide-react'

type Row = {
  employee_id: string
  full_name: string | null
  businesses_added: number
  listings_added: number
  listings_live: number
  customers_referred: number
  orders_sold: number
  commission_earned: number
  commission_pending: number
}

export default function EmployeePortfolio() {
  const [rows, setRows] = useState<Row[]>([])
  const [codes, setCodes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      const db = supabaseBrowser as unknown as {
        from: (t: string) => { select: (c: string) => { order: (c: string, o?: unknown) => Promise<{ data: unknown }> } }
      }
      const [{ data: p }, { data: e }] = await Promise.all([
        db.from('v_employee_portfolio').select('*').order('listings_added', { ascending: false }),
        db.from('business_employees').select('id, referral_code').order('id'),
      ])
      setRows((p as Row[]) || [])
      const map: Record<string, string> = {}
      for (const x of ((e as { id: string; referral_code: string | null }[]) || [])) {
        if (x.referral_code) map[x.id] = x.referral_code
      }
      setCodes(map)
      setLoading(false)
    })()
  }, [])

  function copyRef(id: string) {
    const code = codes[id]
    if (!code) return
    navigator.clipboard?.writeText(`${window.location.origin}/r/${code}`)
    setCopied(id); setTimeout(() => setCopied(null), 1800)
  }

  if (loading) return <div className="py-24 text-center"><Loader2 className="w-7 h-7 animate-spin mx-auto text-gray-400" /></div>

  const active = rows.filter((r) => r.businesses_added + r.listings_added + r.customers_referred + r.orders_sold > 0)

  return (
    <div className="max-w-5xl mx-auto p-4" dir="rtl">
      <h1 className="text-lg font-black text-gray-900 flex items-center gap-2 mb-1">
        <Users className="w-5 h-5 text-[#059669]" /> محفظة كل موظف
      </h1>
      <p className="text-[11.5px] text-gray-500 mb-4 leading-relaxed">
        كل موظف والشغل اللي هو مسؤول عنه — البيزنس اللي ضافه · إعلاناته · عملاؤه · عمولاته.
        <br />
        🔗 <b>لينك الإحالة</b>: أي عميل يسجّل منه بيتحسب للموظف.
      </p>

      {active.length === 0 ? (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
          <p className="text-xs font-black text-amber-900 mb-1">مفيش شغل مسند لحد لسه</p>
          <p className="text-[11px] text-amber-900 leading-relaxed">
            الإعلانات القديمة (٥٧٢) اتعملت قبل ما نضيف الإسناد، ومفيش أثر لمين ضافها —
            فسبناها بدون إسناد بدل ما نخمّن ونبوّظ العمولات.
            <b> أي شغل جديد بيتسجّل باسم صاحبه تلقائيًا.</b>
          </p>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white mt-3">
        <table className="w-full text-xs">
          <thead className="bg-[#F5F4F0] text-gray-600">
            <tr>
              <Th>الموظف</Th><Th>بيزنس</Th><Th>إعلانات</Th><Th>منها منشور</Th>
              <Th>عملاء</Th><Th>مبيعات</Th><Th>عمولة</Th><Th>لينك</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.employee_id} className="border-t border-gray-100">
                <td className="px-2.5 py-2.5 font-bold text-gray-900">{r.full_name || '—'}</td>
                <td className="px-2.5 py-2.5 tabular">{r.businesses_added}</td>
                <td className="px-2.5 py-2.5 tabular">{r.listings_added}</td>
                <td className="px-2.5 py-2.5 tabular text-[#059669] font-bold">{r.listings_live}</td>
                <td className="px-2.5 py-2.5 tabular">{r.customers_referred}</td>
                <td className="px-2.5 py-2.5 tabular">{r.orders_sold}</td>
                <td className="px-2.5 py-2.5 tabular">
                  <span className="font-bold text-[#059669]">{Number(r.commission_earned || 0).toLocaleString('ar-EG')}</span>
                  {Number(r.commission_pending) > 0 && (
                    <span className="text-gray-400 text-[10.5px]"> +{Number(r.commission_pending).toLocaleString('ar-EG')} معلّق</span>
                  )}
                </td>
                <td className="px-2.5 py-2.5">
                  {codes[r.employee_id] ? (
                    <button onClick={() => copyRef(r.employee_id)}
                      className="text-[11px] font-bold text-[#059669] flex items-center gap-1">
                      {copied === r.employee_id ? <><Check className="w-3 h-3" /> اتنسخ</> : <><Copy className="w-3 h-3" /> نسخ</>}
                    </button>
                  ) : <span className="text-gray-300">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
        <S icon={Store} label="بيزنس مسند" v={rows.reduce((a, r) => a + r.businesses_added, 0)} />
        <S icon={LayoutGrid} label="إعلانات مسندة" v={rows.reduce((a, r) => a + r.listings_added, 0)} />
        <S icon={UserPlus} label="عملاء بالإحالة" v={rows.reduce((a, r) => a + r.customers_referred, 0)} />
        <S icon={Wallet} label="عمولات مستحقة" v={rows.reduce((a, r) => a + Number(r.commission_earned || 0), 0)} money />
      </div>
    </div>
  )
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-2.5 py-2 text-right font-bold whitespace-nowrap">{children}</th>
}
function S({ icon: Icon, label, v, money }: { icon: typeof Users; label: string; v: number; money?: boolean }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-[11px] text-gray-500 font-bold">{label}</span>
      </div>
      <p className="font-black tabular text-gray-900">
        {Number(v).toLocaleString('ar-EG')}{money ? <span className="text-[11px] text-gray-400"> ج.م</span> : null}
      </p>
    </div>
  )
}
