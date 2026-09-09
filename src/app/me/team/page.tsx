'use client'
// =====================================================================
// /me/team → حضور الفريق في اللوحة الكاملة — تحويل بس (٩/٩/٢٠٢٦ — آخر الليل)
// شاشة موظف واحدة («شغلي») ولوحة واحدة للإدارة. الكود القديم في LegacyMeTeam.tsx.
// =====================================================================
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { safeStorage } from '@/lib/safe-storage'

export default function MeTeamRedirect() {
  const router = useRouter()
  useEffect(() => {
    (async () => {
      let dest = '/account/work'
      try {
        const tok = safeStorage.get('madmona_token')
        const { data } = await (supabaseBrowser.rpc as unknown as (
          f: string, a: Record<string, unknown>,
        ) => Promise<{ data: { is_staff?: boolean; staff_can_manage?: boolean; platform_supplier_id?: string | null } | null }>)('workspace_menu_context', { p_token: tok || null })
        if (data?.is_staff && data.staff_can_manage && data.platform_supplier_id) dest = `/admin/business-finance/${data.platform_supplier_id}/attendance`
      } catch { /* الافتراضي شغلي */ }
      router.replace(dest)
    })()
  }, [router])
  return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#059669] animate-spin" /></div>
}
