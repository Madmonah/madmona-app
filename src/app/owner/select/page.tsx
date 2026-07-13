'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Loader2, Building2, ChevronLeft, LogOut } from 'lucide-react'
// 🔴 rpcSafe: نفس السلوك، بس الخطأ مبيعدّيش في صمت (13 Jul 2026)
import { rpcSafe } from '@/lib/rpc'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function OwnerSelectPage() {
  const router = useRouter()
  const [access, setAccess] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const token = localStorage.getItem('madmona_owner_token')
      if (!token) { router.push('/owner/login'); return }
      // @ts-expect-error
      const { data } = await supabase.rpc('owner_resolve_by_token', { p_token: token })
      const acc = data?.access || []
      if (acc.length === 0) { router.push('/owner/login'); return }
      if (acc.length === 1) { router.push(`/owner/${acc[0].supplier_id}`); return }
      setAccess(acc)
      setLoading(false)
    })()
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [])

  async function logout() {
    const token = localStorage.getItem('madmona_owner_token')
    if (token) {
      await rpcSafe(supabase, 'owner_logout', { p_token: token })
      localStorage.removeItem('madmona_owner_token')
    }
    router.push('/owner/login')
  }

  if (loading) return <div className="min-h-screen bg-[#1F6F5F] flex items-center justify-center"><Loader2 className="w-8 h-8 text-white animate-spin" /></div>

  const ROLE_LABELS: Record<string, string> = { owner: 'المالك', manager: 'مدير', accountant: 'محاسب', viewer: 'مشاهدة' }

  return (
    <div className="min-h-screen bg-[#1F6F5F] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-white">اختار الشركة</h1>
          <p className="text-sm text-white/80 mt-1">عندك صلاحية على أكثر من شركة</p>
        </div>
        <div className="space-y-2">
          {access.map((a: any) => (
            <button
              key={a.supplier_id}
              onClick={() => router.push(`/owner/${a.supplier_id}`)}
              className="w-full bg-white rounded-2xl p-4 flex items-center gap-3 hover:shadow-xl transition-shadow text-right"
            >
              <div className="w-11 h-11 rounded-xl bg-[#1F6F5F]/10 text-[#1F6F5F] grid place-items-center"><Building2 className="w-5 h-5" /></div>
              <div className="flex-1">
                <p className="text-sm font-black text-[#1A2E26]">{a.business_name}</p>
                <p className="text-[10px] text-[#6B7280]">{ROLE_LABELS[a.role] || a.role}</p>
              </div>
              <ChevronLeft className="w-4 h-4 text-[#6B7280]" />
            </button>
          ))}
        </div>
        <button onClick={logout} className="w-full mt-4 py-2.5 rounded-xl bg-white/10 text-white text-sm font-bold flex items-center justify-center gap-2">
          <LogOut className="w-4 h-4" /> تسجيل خروج
        </button>
      </div>
    </div>
  )
}
