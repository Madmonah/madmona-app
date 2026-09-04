'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Loader2, ShieldCheck, Building2, Crown, ChevronLeft, ClipboardList,
} from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { modulesForIndustry, canOpenModule } from '@/lib/erpModules'
import BusinessSetupSteps from '@/components/BusinessSetupSteps'

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

  const totalPending = list.reduce((a, m) => a + (m.pending_requests || 0), 0)

  return (
    <div className="bg-white rounded-3xl shadow-soft overflow-hidden">
      <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-2">
        <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" />
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
          شغلي وصلاحياتي
        </p>
      </div>

      {/* 🚪 (٢٠ أغسطس ٢٠٢٦) الباب الرئيسي — **ظاهر من غير ما تفتح أي حاجة**.
          محمد: «مش شايف التابات في حسابي». كان لازم تدوس على اسم الشركة
          الأول عشان الأكورديون يفتح وتبان أزرار «شغلي» و«لوحة الإدارة» —
          يعني تابين مدفونين ورا دوسة محدش يعرف إنها موجودة. دلوقتي «شغلي»
          صف كامل ثابت فوق، وتفاصيل كل شركة تحته لو حبيت تفتحها. */}
      <Link
        href="/account/work"
        className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 hover:bg-[#FAFAF7] transition-colors no-underline"
      >
        <div className="w-10 h-10 rounded-2xl bg-[#34D399]/12 text-[#059669] flex items-center justify-center flex-shrink-0">
          <ClipboardList className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-gray-900">شغلي أنا</p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            حضورك وانصرافك · طلباتك · مصاريفك
          </p>
        </div>
        {totalPending > 0 && (
          <span className="text-[10px] font-black px-2 py-1 rounded-full bg-amber-50 text-amber-700 flex-shrink-0">
            {totalPending} طلب
          </span>
        )}
        <ChevronLeft className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </Link>

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
                {/* 🎛️ (٢٠ أغسطس ٢٠٢٦) تابات الداشبورد على طول من حسابي.
                    محمد: «تاب مضمونة اللي فيها الصلاحيات جوّه تاب حسابي
                    عايزها تفتح الداشبورد بتاباتها بحيث تسهّل على الناس
                    إدارة البيزنس».

                    قبل كده الكارت كان بيعرض **قايمة صلاحيات** — معلومة
                    ساكنة الموظف مايعملش بيها حاجة — وزرار واحد على اللوحة
                    وبعدين يلف جوّاها يدوّر على التاب. دلوقتي التابات نفسها
                    هنا، وكل تاب بيتعرض بس لو صلاحيته مفتوحة (`canOpenModule`)
                    ومناسب لنشاط البيزنس (`modulesForIndustry`). */}
                {(() => {
                  const permMap: Record<string, boolean> = {}
                  m.permissions.forEach(p => { permMap[p.key] = p.on })
                  const full = m.relation === 'owner'
                  const tabs = modulesForIndustry(m.industry)
                    .filter(mod => mod.primary && canOpenModule(mod.href, full, permMap))
                    .slice(0, 8)
                  if (tabs.length === 0) return null
                  return (
                    <>
                    {/* 🏷️ (٢٠ أغسطس ٢٠٢٦) عنوان صريح إن دي اختصارات **جوّه**
                        لوحة الإدارة — مش مكان تاني. محمد سأل: «إيه الفرق بين
                        الداشبورد ولوحة الإدارة؟» ومكانش فيه فرق أصلًا، بس
                        الشكل كان بيوحي بكده. */}
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                      اختصارات لوحة الإدارة
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 mb-2">
                      {tabs.map(mod => (
                        <Link
                          key={mod.href}
                          href={`/admin/business-finance/${m.supplier_id}/${mod.href}`}
                          className="flex items-center gap-1.5 bg-[#FAFAF7] hover:bg-white border border-gray-200 hover:border-[#059669]/30 rounded-xl px-2.5 py-2 text-[11.5px] font-bold text-gray-700 no-underline transition-colors"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] flex-shrink-0" />
                          <span className="truncate">{mod.label}</span>
                        </Link>
                      ))}
                    </div>
                    </>
                  )
                })()}

                {/* 🧭 (٥/٩/٢٠٢٦) استكمال بناء الشركة — الخطوة الجاية للمالك */}
                {m.relation === 'owner' && <BusinessSetupSteps supplierId={m.supplier_id} compact />}
                <div className="grid grid-cols-2 gap-2">
                  {/* 🗂️ (٢٠ أغسطس ٢٠٢٦) «شغلي» — الحضور والطلبات والمصاريف
                      جوّه الأبليكيشن نفسه. محمد: «عايز تاب حسابي يعرض كل
                      حاجة ليها علاقة بالإداريات … عن طريق الأبليكيشن نفسه». */}
                  <Link
                    href="/account/work"
                    className="inline-flex items-center justify-center gap-1.5 bg-[#34D399] text-[#04352A] text-xs font-bold px-3 py-2.5 rounded-xl no-underline hover:bg-[#34D399]/90"
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    شغلي أنا
                  </Link>
                  <Link
                    href={`/admin/business-finance/${m.supplier_id}`}
                    className="inline-flex items-center justify-center gap-1.5 bg-[#FAFAF7] border border-gray-200 text-gray-700 text-xs font-bold px-3 py-2.5 rounded-xl no-underline hover:bg-white"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    لوحة الإدارة
                  </Link>
                </div>

                {/* 🧭 سطر واحد يفرّق بين الاتنين — دي كانت أكتر حاجة مربكة */}
                <p className="text-[10px] text-gray-400 mt-2 leading-relaxed text-center">
                  «شغلي أنا» = حضورك وطلباتك إنت · «لوحة الإدارة» = إدارة البيزنس كله
                </p>

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
