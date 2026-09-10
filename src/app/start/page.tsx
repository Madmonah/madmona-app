'use client'
// ============================================================================
// 🔗 /start — صاحب البيزنس يعمل حسابه وشركته بنفسه (١٠ سبتمبر ٢٠٢٦)
//
// محمد نصًا: «عايز التاب ده (/admin/business-partners/new) الناس تدخل تعمل منه حساب جديد على مضمونة
// ويتعمل منه حساب البيزنس الجديد بنفس تفاصيله» + «اقفل عدد الموظفين على ١ موظف غير صاحب البيزنس».
//
// نفس حقول فورم الأدمن (اسم · نشاط · مسؤول · رقم · إيميل · مدينة · حي · عنوان) من غير أي حقل عمولة/عقد،
// وبعد الفورم: توثيق الرقم بالواتساب (كود MAD… يبعته على 1551 — الحساب بيتعمل لوحده) أو دخول جوجل.
// الإنشاء على السيرفر: /api/start/create-business → self_create_business (service_role) → «كمّل شركتك».
// اللي عنده حساب بالفعل: بيتخطى التوثيق. اللي عنده شركة بالفعل: بيتحوّل عليها.
// ============================================================================
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, Loader2, MessageCircle, CheckCircle2, ChevronLeft } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { ensureSupabaseSession } from '@/lib/session-upgrade'
import { safeStorage } from '@/lib/safe-storage'
import { syncModuleSession } from '@/lib/madmonaSession'
import { GoogleSignInButton } from '@/components/GoogleSignInButton'

const INDUSTRIES = [
  { value: 'clinic', label: 'عيادة / مركز طبي' },
  { value: 'restaurant', label: 'مطعم / كافيه' },
  { value: 'beauty_salon', label: 'صالون تجميل / بيوتي' },
  { value: 'spa', label: 'سبا' },
  { value: 'gym', label: 'جيم' },
  { value: 'retail_shop', label: 'محل / متجر' },
  { value: 'vehicle_agency', label: 'معرض سيارات' },
  { value: 'contracting', label: 'مقاولات' },
  { value: 'other', label: 'نشاط تاني' },
]
const CITIES = ['القاهرة', 'الجيزة', 'الإسكندرية', 'الساحل الشمالي', 'الغردقة', 'شرم الشيخ', 'مدينة تانية']
const DRAFT_KEY = 'madmona_start_draft'
const WA_KEY = 'madmona_start_wa'   // الكود المعلّق — لو الصفحة اتعملت reload وسط التوثيق نكمّل الـpoll
const INP = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-[#059669]/30'

type Form = { business_name: string; industry: string; contact_name: string; contact_phone: string; contact_email: string; city: string; district: string; address: string }
type Stage = 'loading' | 'form' | 'verify' | 'creating' | 'done'

export default function StartPage() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>('loading')
  const [hasSession, setHasSession] = useState(false)
  const [form, setForm] = useState<Form>({ business_name: '', industry: 'clinic', contact_name: '', contact_phone: '', contact_email: '', city: 'القاهرة', district: '', address: '' })
  const [err, setErr] = useState<string | null>(null)
  const [wa, setWa] = useState<{ code: string; number: string; url: string } | null>(null)
  const [supplierId, setSupplierId] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const creatingRef = useRef(false)

  const utm = useMemo(() => {
    if (typeof window === 'undefined') return ''
    const q = new URLSearchParams(window.location.search)
    const o = new URLSearchParams()
    q.forEach((v, k) => { if (k.startsWith('utm_')) o.set(k, v) })
    return o.toString()
  }, [])

  // ── إنشاء الشركة (بعد ما الهوية تبقى موجودة) ──
  async function createBusiness(f: Form, accessToken?: string | null) {
    if (creatingRef.current) return
    creatingRef.current = true
    setStage('creating'); setErr(null)
    try {
      let bearer = accessToken || null
      if (!bearer) { const s = await ensureSupabaseSession(); bearer = s?.access_token || null }
      const token = safeStorage.get('madmona_token')
      const payload = {
        business_name: f.business_name.trim(), industry: f.industry, contact_name: f.contact_name.trim() || null,
        contact_phone: f.contact_phone.trim() || null, contact_email: f.contact_email.trim() || null,
        city: f.city, district: f.district.trim() || null, address: f.address.trim() || null,
        branches: [{ name: f.business_name.trim(), code: 'MAIN', address: f.address.trim() || null, district: f.district.trim() || null, phone: f.contact_phone.trim() || null, manager_name: f.contact_name.trim() || null }],
      }
      const r = await fetch('/api/start/create-business', {
        method: 'POST', headers: { 'content-type': 'application/json', ...(bearer ? { authorization: `Bearer ${bearer}` } : {}) },
        body: JSON.stringify({ payload, token }),
      }).then((x) => x.json()).catch(() => ({ ok: false, error: 'الشبكة' }))
      if (!r.ok) { setErr(r.error || 'ماتعملش — جرّب تاني'); setStage('form'); creatingRef.current = false; return }
      safeStorage.remove(DRAFT_KEY); safeStorage.remove(WA_KEY)
      setSupplierId(r.supplier_id); setStage('done')
      setTimeout(() => router.replace(`/admin/business-finance/${r.supplier_id}/setup?welcome=1`), 1800)
    } catch (e) {
      setErr((e as Error).message || 'حصل خطأ'); setStage('form'); creatingRef.current = false
    }
  }

  // ── على الفتح: جلسة موجودة؟ درافت متحفوظ (رجوع من جوجل)؟ ──
  useEffect(() => {
    (async () => {
      const s = await ensureSupabaseSession()
      setHasSession(!!s?.user)
      let draft: Form | null = null
      try { const raw = safeStorage.get(DRAFT_KEY); if (raw) draft = JSON.parse(raw) } catch { /* لا درافت */ }
      if (draft) setForm(draft)
      const resume = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('resume') === '1'
      // جلسة + درافت = كمّل الإنشاء لوحدك (رجوع من جوجل، أو الصفحة اتعملت reload بعد التوثيق —
      // self_create_business idempotent: لو الشركة اتعملت خلاص بيرجّعها بدل ما يكرّر)
      if (s?.user && draft && (resume || draft.business_name.trim().length >= 2)) { void createBusiness(draft, s.access_token); return }
      // كود واتساب معلّق (الصفحة اتعملت reload وسط التوثيق) → نرجع لشاشة الكود ونكمّل الـpoll
      try {
        const rawWa = safeStorage.get(WA_KEY)
        const pend = rawWa ? JSON.parse(rawWa) as { code: string; number: string; url: string; at: number } : null
        if (pend?.code && draft && Date.now() - (pend.at || 0) < 14 * 60 * 1000) { setWa(pend); setStage('verify'); startPolling(pend.code, draft); return }
        if (pend) safeStorage.remove(WA_KEY)
      } catch { /* لا كود معلّق */ }
      setStage('form')
    })()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const valid = form.business_name.trim().length >= 2 && form.contact_phone.replace(/\D/g, '').length >= 10

  // ── الخطوة ٢: توثيق الواتساب (زي /login بالظبط) ──
  async function startWhatsApp() {
    setErr(null)
    safeStorage.set(DRAFT_KEY, JSON.stringify(form))
    const r = await fetch('/api/auth/wa', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'start', phone: form.contact_phone }) })
      .then((x) => x.json()).catch(() => null)
    if (!r?.code) { setErr('مقدرناش نبدأ التوثيق — جرّب تاني'); return }
    const pending = { code: r.code, number: r.wa_number, url: r.wa_url, at: Date.now() }
    safeStorage.set(WA_KEY, JSON.stringify(pending))
    setWa(pending)
    setStage('verify')
    startPolling(pending.code, form)
  }

  function startPolling(code: string, f: Form) {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      const st = await fetch(`/api/auth/wa?code=${encodeURIComponent(code)}`).then((x) => x.json()).catch(() => null)
      if (st?.expired) { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } safeStorage.remove(WA_KEY); setErr('الكود انتهى — اضغط تاني'); setStage('form'); return }
      if (!st?.verified) return
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
      const fin = await fetch('/api/auth/wa', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'finish', code, full_name: f.contact_name.trim() || undefined }) })
        .then((x) => x.json()).catch(() => null)
      if (!fin?.token_hash) { setErr('التوثيق ماكملش — جرّب تاني'); safeStorage.remove(WA_KEY); setStage('form'); return }
      safeStorage.remove(WA_KEY)
      if (fin.madmona_token) safeStorage.set('madmona_token', fin.madmona_token)
      let access: string | null = null
      try {
        const { data } = await supabaseBrowser.auth.verifyOtp({ type: 'email', token_hash: fin.token_hash })
        access = data?.session?.access_token || null
        void syncModuleSession()
      } catch { /* هنكمّل بالتوكن */ }
      void createBusiness({ ...f, contact_phone: fin.phone || f.contact_phone }, access)
    }, 2500)
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) { setErr('اكتب اسم الشركة ورقم الواتساب'); return }
    if (hasSession) { void createBusiness(form); return }
    void startWhatsApp()
  }

  const googleNext = `/start?resume=1${utm ? '&' + utm : ''}`

  return (
    <main dir="rtl" className="min-h-screen bg-[#FAFAF7] text-[#1A2E26]">
      <div className="bg-[#04352A] text-white">
        <div className="mx-auto max-w-xl px-5 pt-6 pb-10">
          <Link href="/pro" className="inline-flex items-center gap-1 text-white/70 text-xs mb-5 no-underline"><ChevronLeft className="w-3.5 h-3.5" /> برنامج الإدارة</Link>
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl bg-[#34D399] text-[#04352A] grid place-items-center"><Building2 className="w-5 h-5" /></span>
            <div>
              <h1 className="text-2xl font-black leading-tight">ضيف شركتك على مضمونة</h1>
              <p className="text-white/75 text-sm">دقيقتين — وحسابك وحساب شركتك يتعملوا مع بعض</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-5 -mt-5 pb-16">
        {stage === 'loading' && <div className="rounded-3xl bg-white border border-gray-100 p-8 grid place-items-center"><Loader2 className="w-6 h-6 text-gray-400 animate-spin" /></div>}

        {stage === 'form' && (
          <form onSubmit={onSubmit} className="rounded-3xl bg-white border border-gray-100 shadow-sm p-5 space-y-3">
            <p className="text-xs text-gray-500">بيانات الشركة — نفس اللي هتظهر في لوحتك وصفحتك. الحساب بيفتح لصاحب البيزنس + موظف واحد.</p>
            <label className="block"><span className="text-xs font-bold text-gray-600">اسم الشركة *</span>
              <input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} className={INP} placeholder="مثلًا: عيادة د. أحمد — مصر الجديدة" required maxLength={200} /></label>
            <label className="block"><span className="text-xs font-bold text-gray-600">النشاط *</span>
              <select value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} className={INP}>{INDUSTRIES.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}</select></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="text-xs font-bold text-gray-600">اسم المسؤول</span>
                <input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} className={INP} placeholder="اسمك" /></label>
              <label className="block"><span className="text-xs font-bold text-gray-600">رقم الواتساب *</span>
                <input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} className={INP} dir="ltr" inputMode="tel" placeholder="01xxxxxxxxx" required /></label>
            </div>
            <label className="block"><span className="text-xs font-bold text-gray-600">الإيميل (اختياري)</span>
              <input value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} className={INP} dir="ltr" inputMode="email" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="text-xs font-bold text-gray-600">المدينة</span>
                <select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={INP}>{CITIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
              <label className="block"><span className="text-xs font-bold text-gray-600">الحي</span>
                <input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} className={INP} placeholder="مصر الجديدة" /></label>
            </div>
            <label className="block"><span className="text-xs font-bold text-gray-600">العنوان (اختياري)</span>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={INP} placeholder="الشارع · رقم العمارة" /></label>
            {err && <p className="text-xs text-red-600">{err}</p>}
            <button type="submit" disabled={!valid} className="w-full py-4 rounded-2xl bg-[#04352A] text-white font-black text-base disabled:opacity-50 flex items-center justify-center gap-2">
              {hasSession ? 'أنشئ شركتي' : <><MessageCircle className="w-4 h-4" /> وثّق رقمي بالواتساب وأنشئ شركتي</>}
            </button>
            {!hasSession && (
              <div className="pt-1">
                <p className="text-center text-[11px] text-gray-400 mb-2">أو</p>
                <div onClick={() => safeStorage.set(DRAFT_KEY, JSON.stringify(form))}>
                  <GoogleSignInButton redirectTo={googleNext} label="كمّل بحساب جوجل" />
                </div>
              </div>
            )}
            <p className="text-[11px] text-gray-400 text-center">من غير باسورد ومن غير دفع دلوقتي. عندك حساب؟ <Link href={`/login?next=${encodeURIComponent('/start')}`} className="text-[#059669] font-bold">ادخل</Link></p>
          </form>
        )}

        {stage === 'verify' && wa && (
          <div className="rounded-3xl bg-white border border-gray-100 shadow-sm p-5 text-center space-y-3">
            <p className="font-black text-lg">خطوة أخيرة: ابعت الكود ده على واتساب</p>
            <p className="text-sm text-gray-500">افتح واتساب وابعت الكود لرقم مضمونة — هنعرفك من رقمك ونكمّل لوحدنا.</p>
            <div className="rounded-2xl bg-[#FAFAF7] border border-dashed border-[#34D399] py-4 text-3xl font-black tracking-widest" dir="ltr">{wa.code}</div>
            <a href={wa.url} target="_blank" rel="noopener noreferrer" className="block w-full py-4 rounded-2xl bg-[#25D366] text-white font-black no-underline flex items-center justify-center gap-2"><MessageCircle className="w-5 h-5" /> افتح واتساب وابعت الكود</a>
            <p className="text-xs text-gray-400 flex items-center justify-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> مستنيين رسالتك… الصفحة هتكمّل لوحدها</p>
            <button onClick={() => { if (pollRef.current) clearInterval(pollRef.current); safeStorage.remove(WA_KEY); setStage('form') }} className="text-xs text-gray-500 underline">ارجع للبيانات</button>
          </div>
        )}

        {stage === 'creating' && (
          <div className="rounded-3xl bg-white border border-gray-100 shadow-sm p-8 text-center"><Loader2 className="w-7 h-7 text-[#059669] animate-spin mx-auto mb-3" /><p className="font-black">بنجهّز شركتك…</p></div>
        )}

        {stage === 'done' && (
          <div className="rounded-3xl bg-white border-2 border-[#04352A] shadow-sm p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-[#059669] mx-auto mb-2" />
            <p className="font-black text-lg">اتعملت ✓</p>
            <p className="text-sm text-gray-500 mt-1">هنودّيك على «كمّل شركتك» — الفرع والموظف والمنتجات خطوة خطوة.</p>
            {supplierId && <Link href={`/admin/business-finance/${supplierId}/setup?welcome=1`} className="inline-block mt-4 bg-[#04352A] text-white font-black rounded-2xl px-6 py-3 no-underline">افتح لوحتي ←</Link>}
          </div>
        )}
      </div>
    </main>
  )
}
