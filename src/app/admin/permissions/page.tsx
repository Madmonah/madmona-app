'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
// 🔐 كل الـRPCs هنا محميّة بصلاحية أدمن — لازم تعدّي من بوابة الأدمن على السيرفر
import { adminRpc } from '@/lib/adminRpc'
import {
  Loader2, Lock, AlertCircle, ArrowRight, ShieldCheck, Search,
  Plus, X, Building2, Crown, Users, ChevronLeft,
} from 'lucide-react'

/* ============================================================================
   /admin/permissions — **دليل** الصلاحيات (مش صفحة تعديل)
   ============================================================================
   🎯 (٢٠ أغسطس ٢٠٢٦) محمد:
      «خلي ربط صلاحيات مضمونة في مضمونة الشركة»
      «صلاحيات موظفين الـB2B أو أي بيزنس B2B يكون داخل تاب الـB2B — كل بيزنس
       سواء معرض أو شركة عقارات أو شركة، كله يتضاف في الـB2B وكل موظف
       بصلاحياته»
      «في مكانين للحسابات الـB2B … محتاج أوحّدهم»

   اللي كان بيحصل قبل كده:
     الصفحة دي كانت **شاشة واحدة فيها كل شركات المنصة مع بعض**، والفصل بين
     مضمونة وعملاء B2B مبني على ID متحطوط في الكود (`MADMONA_ID`). فكانت:
       • صلاحيات مضمونة بعيدة عن لوحة إدارة مضمونة
       • صلاحيات كل عميل بعيدة عن لوحة العميل نفسه
       • والفصل يتكسر أول ما الـID يتغيّر (وده حصل فعلًا)

   اللي بقى دلوقتي:
     التعديل الفعلي بقى جوّه لوحة كل بيزنس:
       /admin/business-finance/<id>/permissions
     والصفحة دي بقت **دليل** بيوصّلك للمكان الصح — والفصل بين الشركة الأم
     وعملاء الـB2B جاي من `suppliers.is_platform_owner` (داتا) مش من الكود.

   الكتالوج (قائمة الصلاحيات نفسها) عام للمنصة كلها، فزراره فضل هنا.
   ============================================================================ */

type Stage = 'loading' | 'unauthenticated' | 'forbidden' | 'ready'
type Catalog = { key: string; label_ar: string; label_en: string | null }
type Supplier = {
  supplier_id: string
  business_name: string
  is_platform_owner: boolean
  employee_seats: number
  industry: string | null
  has_erp_crm: boolean
  employee_count: number
}
type Overview = { catalog: Catalog[]; suppliers: Supplier[] }

export default function PermissionsDirectoryPage() {
  const [stage, setStage] = useState<Stage>('loading')
  const [ov, setOv] = useState<Overview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 2500) }

  async function load() {
    try {
      const data = await adminRpc<Overview>('get_employee_permissions_overview')
      setOv(data)
      setStage('ready')
    } catch (e) {
      const m = (e instanceof Error ? e.message : '').toLowerCase()
      if (m.includes('بوابة الأدمن') || m.includes('forbidden')) { setStage('forbidden'); return }
      setError(e instanceof Error ? e.message : 'فشل التحميل'); setStage('ready')
    }
  }

  useEffect(() => { load() }, [])

  const q = search.trim().toLowerCase()
  const all = useMemo(() => {
    const list = ov?.suppliers ?? []
    if (!q) return list
    return list.filter(s => (s.business_name || '').toLowerCase().includes(q))
  }, [ov, q])

  // 👑 الفصل من الداتا (`is_platform_owner`) — مش من ID متحطوط في الكود
  const owners = all.filter(s => s.is_platform_owner)
  const clients = all.filter(s => !s.is_platform_owner)

  if (stage === 'loading') return <Center><Loader2 className="w-8 h-8 text-[#059669] animate-spin" /></Center>
  if (stage === 'unauthenticated') return (
    <Center>
      <div className="bg-white rounded-3xl p-8 text-center max-w-sm shadow-sm">
        <Lock className="w-8 h-8 text-[#059669] mx-auto mb-3" />
        <h1 className="text-lg font-black text-[#1A2E26] mb-3">سجّل دخول الأول</h1>
        <Link href="/auth/login?redirect=/admin/permissions" className="block bg-[#34D399] text-[#04352A] py-3 rounded-xl font-bold">تسجيل دخول</Link>
      </div>
    </Center>
  )
  if (stage === 'forbidden') return (
    <Center>
      <div className="bg-white rounded-3xl p-8 text-center max-w-sm shadow-sm">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <h1 className="text-lg font-black text-[#1A2E26]">للأدمن بس</h1>
      </div>
    </Center>
  )
  if (error || !ov) return (
    <Center>
      <div className="bg-white rounded-3xl p-8 text-center max-w-sm shadow-sm">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
        <p className="text-sm text-[#6B7280] mb-4">{error || 'مفيش بيانات'}</p>
        <button onClick={load} className="bg-[#34D399] text-[#04352A] px-5 py-2.5 rounded-xl font-bold">حاول تاني</button>
      </div>
    </Center>
  )

  return (
    <div className="min-h-screen text-[#1A2E26]" dir="rtl" style={{ background: 'radial-gradient(1100px 560px at 88% -8%, rgba(47,160,132,0.10), transparent 60%), radial-gradient(900px 480px at -5% 4%, rgba(250, 129, 37,0.09), transparent 55%), radial-gradient(800px 500px at 50% 118%, rgba(212,160,23,0.06), transparent 60%), #FAFAF7' }}>
      <header className="sticky top-0 z-30 border-b border-[#059669]/10 bg-white/70 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/admin/dashboard" className="w-9 h-9 bg-[#FAFAF7] hover:bg-gray-100 rounded-xl flex items-center justify-center"><ArrowRight className="w-4 h-4 text-[#6B7280]" /></Link>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4A017] via-[#2FA084] to-[#34D399] flex items-center justify-center text-white shadow"><ShieldCheck className="w-5 h-5" /></div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black tracking-[0.3em] uppercase bg-gradient-to-r from-[#D4A017] to-[#34D399] bg-clip-text text-transparent">PERMISSIONS</p>
            <h1 className="text-base md:text-lg font-black leading-none">صلاحيات الموظفين</h1>
          </div>
          <button onClick={() => setAddOpen(true)} className="flex items-center gap-1.5 bg-[#34D399] text-[#04352A] text-xs font-bold px-3 py-2 rounded-xl hover:bg-[#185547]"><Plus className="w-4 h-4" /> صلاحية جديدة</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-5 space-y-6 pb-24">
        <div className="bg-white/70 border border-[#059669]/15 rounded-2xl px-4 py-3 text-[11px] text-[#4B5563] leading-relaxed">
          صلاحيات كل بيزنس بقت <b>جوّه لوحته هو</b> — اختار البيزنس من هنا وهيوديك على
          تاب «الصلاحيات» بتاعه. الصفحة دي بقت دليل بس، عشان مايبقاش في مكانين لنفس البيزنس.
        </div>

        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="دوّر باسم البيزنس…"
            className="w-full bg-white border border-black/5 rounded-2xl pr-10 pl-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#059669]/30" />
        </div>

        {/* ===== الشركة الأم ===== */}
        <section>
          <SectionHead icon={<Crown className="w-4 h-4" />} title="مضمونة · الشركة الأم" note="الشركة اللي بتملك المنصة وبتديرها — صلاحياتها على مستوى المنصة كلها" />
          {owners.length ? (
            <div className="space-y-2">
              {owners.map(s => <BizRow key={s.supplier_id} s={s} owner />)}
            </div>
          ) : <Empty text="مفيش شركة متعلّمة كـ«الشركة الأم»" />}
        </section>

        {/* ===== بيزنس B2B ===== */}
        <section>
          <SectionHead
            icon={<Building2 className="w-4 h-4" />}
            title={`بيزنس B2B · ${clients.length}`}
            note="أي بيزنس على المنصة — معرض، شركة عقارات، مطعم، مورد فرد — كل واحد بموظفينه وصلاحياته لوحده"
          />
          {clients.length ? (
            <div className="space-y-2">
              {clients.map(s => <BizRow key={s.supplier_id} s={s} />)}
            </div>
          ) : <Empty text={q ? 'مفيش نتيجة للبحث' : 'مفيش بيزنس'} />}
        </section>
      </main>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-[#1A2E26] text-white text-sm font-bold px-5 py-3 rounded-2xl shadow-lg">{toast}</div>
      )}

      {addOpen && (
        <AddPermModal
          onClose={() => setAddOpen(false)}
          onDone={async () => { setAddOpen(false); await load(); flash('اتضافت الصلاحية') }}
          onError={() => flash('فشل الإضافة')} />
      )}
    </div>
  )
}

/* ============================================================ */

function BizRow({ s, owner }: { s: Supplier; owner?: boolean }) {
  const over = !owner && s.employee_count > s.employee_seats
  return (
    <Link
      href={`/admin/business-finance/${s.supplier_id}/permissions`}
      className={`flex items-center gap-3 bg-white rounded-2xl border px-4 py-3 shadow-sm hover:shadow-md transition-all no-underline text-inherit ${
        owner ? 'border-[#059669]/30' : 'border-black/5 hover:border-[#059669]/30'
      }`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[#04352A] flex-shrink-0 ${
        owner ? 'bg-gradient-to-br from-[#D4A017] via-[#2FA084] to-[#34D399]' : 'bg-[#34D399]/90'
      }`}>
        {owner ? <Crown className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black truncate">{s.business_name}</p>
        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
          <span className="text-[10px] text-[#6B7280]">{s.employee_count} موظف</span>
          {!owner && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
              over ? 'bg-amber-50 text-amber-700' : 'bg-[#FAFAF7] text-[#6B7280]'
            }`}>
              {s.employee_count}/{s.employee_seats} مقعد
            </span>
          )}
          {s.has_erp_crm && (
            <span className="text-[9px] font-bold bg-[#34D399]/10 text-[#059669] px-1.5 py-0.5 rounded">ERP</span>
          )}
        </div>
      </div>
      <ChevronLeft className="w-4 h-4 text-[#9CA3AF] flex-shrink-0" />
    </Link>
  )
}

function AddPermModal({ onClose, onDone, onError }: { onClose: () => void; onDone: () => void; onError: () => void }) {
  const [labelAr, setLabelAr] = useState('')
  const [key, setKey] = useState('')
  const [saving, setSaving] = useState(false)
  async function save() {
    if (!labelAr.trim()) return
    setSaving(true)
    try {
      await adminRpc('add_permission_to_catalog', {
        p_key: key.trim() || `perm_${Date.now()}`,
        p_label_ar: labelAr.trim(),
        p_label_en: null,
      })
      onDone()
    } catch { onError() } finally { setSaving(false) }
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" dir="rtl" onClick={onClose}>
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-black text-[#1A2E26]">صلاحية جديدة</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-[#FAFAF7] flex items-center justify-center"><X className="w-4 h-4 text-[#6B7280]" /></button>
        </div>
        <p className="text-[11px] text-[#6B7280] mb-3 leading-relaxed">
          الصلاحية دي بتتضاف للكتالوج العام — يعني هتظهر لكل البيزنس، وبعد كده
          بتفتحها لكل موظف من تاب الصلاحيات بتاع البيزنس بتاعه.
        </p>
        <label className="block text-xs font-bold text-[#6B7280] mb-1">الاسم بالعربي</label>
        <input value={labelAr} onChange={e => setLabelAr(e.target.value)} placeholder="مثلاً: يعدّل الأسعار"
          className="w-full bg-[#FAFAF7] border border-black/5 rounded-xl px-3 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[#059669]/30" />
        <label className="block text-xs font-bold text-[#6B7280] mb-1">المفتاح (اختياري · إنجليزي)</label>
        <input value={key} onChange={e => setKey(e.target.value)} placeholder="can_edit_pricing" dir="ltr"
          className="w-full bg-[#FAFAF7] border border-black/5 rounded-xl px-3 py-2.5 text-sm mb-4 font-mono focus:outline-none focus:ring-2 focus:ring-[#059669]/30" />
        <button onClick={save} disabled={saving || !labelAr.trim()}
          className="w-full bg-[#34D399] text-[#04352A] py-3 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} أضف
        </button>
      </div>
    </div>
  )
}

function Center({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">{children}</div>
}

function SectionHead({ icon, title, note }: { icon: ReactNode; title: string; note: string }) {
  return (
    <div className="mb-3 flex items-start gap-2.5">
      <span className="mt-0.5 w-8 h-8 rounded-xl bg-gradient-to-br from-[#D4A017] to-[#34D399] text-white flex items-center justify-center flex-shrink-0">{icon}</span>
      <div>
        <h2 className="text-base font-black text-[#1A2E26]">{title}</h2>
        <p className="text-[11px] text-[#6B7280] mt-0.5">{note}</p>
      </div>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-6 text-center">
      <Users className="w-8 h-8 text-[#6B7280] opacity-30 mx-auto mb-2" />
      <p className="text-sm text-[#6B7280]">{text}</p>
    </div>
  )
}
