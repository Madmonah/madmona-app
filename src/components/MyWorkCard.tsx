'use client'
// ============================================================================
// 📋 MyWorkCard — شغلي أنا (الإعلانات والبيزنس اللي الموظف ضافهم)
//
// (٢٨ أغسطس ٢٠٢٦) محمد: «هل موجودة في تاب شغلي؟»
//
// 🔍 كانت **مش موجودة**. تاب «شغلي» فيه قسم «الإعلانات» بس هو روابط
//    لكل إعلانات المنصة — مش شغل الموظف نفسه، ومفتوح لموظفي مضمونة بس.
//
// ✅ ده بيعرض **اللي هو ضافه بنفسه** — أساس المسؤولية والعمولة.
//    بيقرا من v_my_work اللي بيفلتر بـmy_employee_id() في الداتابيز،
//    فكل موظف بيشوف شغله هو بس.
// ============================================================================
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { Loader2, LayoutGrid, Store, ChevronLeft } from 'lucide-react'

type Row = {
  // 🔗 (٢٨/٨) الرابط الصح بيستخدم slug مش id
  slug?: string | null
  kind: 'listing' | 'business'
  id: string
  name: string | null
  status: string | null
  business: string | null
  created_at: string
}

const STATUS: Record<string, { label: string; cls: string }> = {
  published: { label: 'منشور', cls: 'bg-[#34D399]/15 text-[#059669]' },
  draft:     { label: 'مسودة', cls: 'bg-gray-100 text-gray-600' },
  paused:    { label: 'موقوف', cls: 'bg-amber-50 text-amber-700' },
  rejected:  { label: 'مرفوض', cls: 'bg-red-50 text-red-600' },
  approved:  { label: 'مفعّل', cls: 'bg-[#34D399]/15 text-[#059669]' },
  pending:   { label: 'مستني', cls: 'bg-amber-50 text-amber-700' },
}

export default function MyWorkCard() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { data } = await (supabaseBrowser as unknown as {
          from: (t: string) => { select: (c: string) => { order: (c: string, o?: unknown) => Promise<{ data: unknown }> } }
        }).from('v_my_work').select('*').order('created_at', { ascending: false })
        if (alive) setRows((data as Row[]) || [])
      } catch { /* مش موظف — الكارت بيخفي نفسه */ }
      if (alive) setLoading(false)
    })()
    return () => { alive = false }
  }, [])

  // 🙈 مش موظف أو مالوش شغل مسند — مايظهرش الكارت أصلاً
  if (loading || rows.length === 0) return null

  const listings = rows.filter((r) => r.kind === 'listing')
  const businesses = rows.filter((r) => r.kind === 'business')

  return (
    <div className="px-5 py-4 border-b border-gray-100" dir="rtl">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
          <LayoutGrid className="w-3.5 h-3.5" /> شغلي أنا
        </p>
        <span className="text-[10.5px] font-bold text-[#059669]">
          {listings.length} إعلان · {businesses.length} بيزنس
        </span>
      </div>
      <p className="text-[11px] text-gray-500 mb-2.5 leading-relaxed">
        اللي ضفته بنفسك — وإنت مسؤول عنه.
      </p>

      <div className="space-y-1.5">
        {rows.slice(0, 8).map((r) => {
          const st = STATUS[r.status || ''] || { label: r.status || '—', cls: 'bg-gray-100 text-gray-600' }
          const Icon = r.kind === 'listing' ? LayoutGrid : Store
          return (
            <Link key={r.kind + r.id}
              href={r.kind === 'listing' ? `/marketplace/${r.slug || r.id}` : '/supplier/erp'}
              className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white p-2.5 active:bg-gray-50">
              <Icon className="w-4 h-4 text-gray-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-gray-900 truncate">{r.name || '—'}</p>
                {r.kind === 'listing' && r.business && (
                  <p className="text-[10.5px] text-gray-500 truncate">{r.business}</p>
                )}
              </div>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${st.cls}`}>
                {st.label}
              </span>
              <ChevronLeft className="w-3.5 h-3.5 text-gray-300 shrink-0" />
            </Link>
          )
        })}
      </div>

      {rows.length > 8 && (
        <p className="text-[11px] text-gray-400 text-center mt-2">
          وفيه {rows.length - 8} كمان
        </p>
      )}
    </div>
  )
}
