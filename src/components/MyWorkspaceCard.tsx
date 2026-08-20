'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Loader2, ShieldCheck, Building2, Crown, ChevronLeft, Check, Minus, Inbox,
} from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'

/* ============================================================================
   MyWorkspaceCard — «شغلي وصلاحياتي» في شاشة حسابي
   ============================================================================
   🎯 (٢٠ أغسطس ٢٠٢٦) محمد:
      «عايز أي حساب سواء في مضمونة أو بره مضمونة بصلاحيته يكون مربوط
       بالأبليكيشن من شاشة حسابي»
      «عايز الأدمن بانيل لأي بيزنس أو موظف — سواء B2B أو في مضمونة — يفتح
       صلاحياته وطلباته من حسابي»

   المشكلة اللي بيحلها:
     الموظف كان بيسجّل دخول ويلاقي «حسابي» فاضية — مكتوب عنده «عميل» ومفيش
     أي أثر لإنه موظف في شركة ولا لصلاحياته ولا لطلباته. الشغل كله كان
     موجود بس مالوش باب من هنا.

   بيقرا من `get_my_workspace()` — نداء واحد بيرجّع كل بيزنس ليك علاقة بيه
   (مالك أو موظف) بصلاحياتك فيه بالظبط.
   ============================================================================ */

type Perm = { key: string; label_ar: string; on: boolean }
type Membership = {
  supplier_id: string
  business_name: string
  logo_url: string | null
  industry: string | null
  is_platform_owner: boolean
  has_erp_crm: boolean
  relation: 'owner' | 'employee'
  employee_id: string | null
  role_ar: string | null
  status: string | null
  permissions: Perm[]
  pending_requests: number
}
type Workspace = { is_platform_admin: boolean; memberships: Membership[] }

export default function MyWorkspaceCard() {
  const [loading, setLoading] = useState(true)
  const [ws, setWs] = useState<Workspace | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await (supabaseBrowser.rpc as unknown as (
          fn: string,
        ) => Promise<{ data: Workspace | null }>)('get_my_workspace')
        if (!cancelled) setWs(data)
      } catch (e) {
        console.error('[workspace] get_my_workspace failed:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-3xl shadow-soft p-6 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-[#059669]" />
      </div>
    )
  }

  const list = ws?.memberships ?? []
  if (list.length === 0) return null

  return (
    <div className="bg-white rounded-3xl shadow-soft overflow-hidden">
      <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-2">
        <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" />
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
          شغلي وصلاحياتي
        </p>
      </div>

      {list.map((m, i) => {
        const open = openId === m.supplier_id
        const onCount = m.permissions.filter(p => p.on).length
        return (
          <div key={m.supplier_id} className={i > 0 ? 'border-t border-gray-100' : ''}>
            <button
              type="button"
              onClick={() => setOpenId(open ? null : m.supplier_id)}
              className="w-full px-6 py-4 flex items-center gap-3 hover:bg-[#FAFAF7] transition-colors text-right"
            >
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                m.is_platform_owner
                  ? 'bg-gradient-to-br from-[#D4A017] via-[#2FA084] to-[#34D399] text-white'
                  : 'bg-[#34D399]/10 text-[#059669]'
              }`}>
                {m.is_platform_owner ? <Crown className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-gray-900 truncate">{m.business_name}</p>
                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                    {m.relation === 'owner' ? 'صاحب البيزنس' : (m.role_ar || 'موظف')}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {m.relation === 'owner'
                      ? 'كل الصلاحيات'
                      : `${onCount} من ${m.permissions.length} صلاحية`}
                  </span>
                  {m.pending_requests > 0 && (
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">
                      {m.pending_requests} طلب معلّق
                    </span>
                  )}
                </div>
              </div>
              <ChevronLeft className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? '-rotate-90' : ''}`} />
            </button>

            {open && (
              <div className="px-6 pb-4 -mt-1">
                {/* الصلاحيات بالظبط زي ما هي متحدّدة */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {m.permissions.map(p => (
                    <span
                      key={p.key}
                      className={`text-[11px] font-bold px-2.5 py-1.5 rounded-full border flex items-center gap-1 ${
                        p.on
                          ? 'bg-[#34D399]/10 text-[#059669] border-[#059669]/25'
                          : 'bg-gray-50 text-gray-400 border-gray-200 line-through'
                      }`}
                    >
                      {p.on ? <Check className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                      {p.label_ar}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={`/admin/business-finance/${m.supplier_id}`}
                    className="inline-flex items-center justify-center gap-1.5 bg-[#34D399] text-[#04352A] text-xs font-bold px-3 py-2.5 rounded-xl no-underline hover:bg-[#34D399]/90"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    لوحة الإدارة
                  </Link>
                  <Link
                    href={`/admin/business-finance/${m.supplier_id}/requests`}
                    className="inline-flex items-center justify-center gap-1.5 bg-[#FAFAF7] border border-gray-200 text-gray-700 text-xs font-bold px-3 py-2.5 rounded-xl no-underline hover:bg-white"
                  >
                    <Inbox className="w-3.5 h-3.5" />
                    الطلبات
                  </Link>
                </div>

                {m.relation === 'employee' && (
                  <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
                    الصلاحيات دي بيحدّدها صاحب البيزنس من تاب «الصلاحيات» جوّه لوحة الإدارة.
                  </p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
