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
import { trackEvent } from '@/components/AnalyticsTracker'
import { resolveLanding, LANDING_AUTO } from '@/lib/landing'

// 🧩 (١١/٩/٢٠٢٦) محمد: «ابني كل الموديلز اللي إحنا نقدر نديرها» — كل قيمة هنا مفتاح في
//    VERTICAL_ALIAS (src/lib/erpModules.ts) عشان اللوحة تفتح باسطمبة النشاط الصح من أول دخول.
const INDUSTRIES = [
  { value: 'clinic', label: 'عيادة / مركز طبي' },
  { value: 'restaurant', label: 'مطعم / كافيه' },
  { value: 'beauty_salon', label: 'صالون تجميل / بيوتي' },
  { value: 'spa', label: 'سبا' },
  { value: 'gym', label: 'جيم / فيتنس' },
  { value: 'retail_shop', label: 'محل / متجر' },
  { value: 'factory', label: 'مصنع / مورد' },
  { value: 'vehicle_agency', label: 'معرض سيارات' },
  { value: 'contracting', label: 'مقاولات / تشطيبات' },
  { value: 'real_estate', label: 'عقارات / تسويق عقاري / مطوّر' },
  { value: 'tourism', label: 'فندق / سياحة' },
  { value: 'marine', label: 'قوارب / يخوت' },
  { value: 'home_services', label: 'خدمات منزلية / صيانة' },
  { value: 'other', label: 'نشاط تاني' },
]
const CITIES = ['القاهرة', 'الجيزة', 'الإسكندرية', 'الساحل الشمالي', 'الغردقة', 'شرم الشيخ', 'مدينة تانية']
const DRAFT_KEY = 'madmona_start_draft'
const WA_KEY = 'madmona_start_wa'   // الكود المعلّق — لو الصفحة اتعملت reload وسط التوثيق نكمّل الـpoll
const INP = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-[#059669]/30'

type Form = { business_name: string; industry: string; contact_name: string; contact_phone: string; contact_email: string; password: string; city: string; district: string; address: string }
type Stage = 'loading' | 'form' | 'verify' | 'creating' | 'done'

export default function StartPage() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>('loading')
  // 🔑 (١٥/٩/٢٠٢٦) محمد: «عايز تاب لتسجيل الدخول في الشاشة دي» — صاحب البيزنس اللي عنده حساب كان بيدوّر على «دخول»
  //    تحت في سطر صغير ويروح /login (شاشة تانية بشكل تاني). دلوقتي تابين فوق: «حساب جديد» · «عندي حساب».
  //    الدخول نفسه = نفس /api/login (رقم أو إيميل + باسورد) + نفس خطوات الجلسة بتاعة /login — مفيش مسار دخول موازي.
  const [tab, setTab] = useState<'new' | 'login'>('new')
  const [lgId, setLgId] = useState('')
  const [lgPw, setLgPw] = useState('')
  const [lgErr, setLgErr] = useState<string | null>(null)
  const [lgBusy, setLgBusy] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [form, setForm] = useState<Form>({ business_name: '', industry: 'clinic', contact_name: '', contact_phone: '', contact_email: '', password: '', city: 'القاهرة', district: '', address: '' })
  const [err, setErr] = useState<string | null>(null)
  const [wa, setWa] = useState<{ code: string; number: string; url: string } | null>(null)
  const [supplierId, setSupplierId] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const creatingRef = useRef(false)
  const waCleanupRef = useRef<null | (() => void)>(null)
  // 📈 (١٥/٩/٢٠٢٦) قمع /start: أول كتابة في أي خانة = start_form_started (مرة واحدة في الجلسة)
  const startedRef = useRef(false)
  function touch(next: Form) { if (!startedRef.current) { startedRef.current = true; trackEvent({ event_type: 'start_form_started' }) } setForm(next) }

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
        // الفرع الرئيسي بيتعمل لوحده (تريجر التوفير) — وصاحب البيزنس بيكمّل عنوانه ومواعيده في «كمّل شركتك»
      }
      const r = await fetch('/api/start/create-business', {
        method: 'POST', headers: { 'content-type': 'application/json', ...(bearer ? { authorization: `Bearer ${bearer}` } : {}) },
        body: JSON.stringify({ payload, token, password: f.password }),
      }).then((x) => x.json()).catch(() => ({ ok: false, error: 'الشبكة' }))
      if (!r.ok) {
        trackEvent({ event_type: 'start_error', metadata: { step: 'create', error: String(r.error || '').slice(0, 120) } })
        const weak = /weak|easy to guess|pwned|leaked|Password/i.test(String(r.password_error || r.error || ''))
        setErr(weak ? 'الباسورد ده معروف وسهل التخمين — اختار باسورد تاني (٨ حروف وأرقام مش متوقعة) واضغط «أنشئ شركتي» — رقمك اتوثّق خلاص.' : (r.error || 'ماتعملش — جرّب تاني'))
        setStage('form'); creatingRef.current = false; return
      }
      trackEvent({ event_type: 'start_created', metadata: { existing: r.existing === true, industry: f.industry } })
      safeStorage.remove(DRAFT_KEY); safeStorage.remove(WA_KEY)
      setSupplierId(r.supplier_id); setStage('done')
      setTimeout(() => router.replace(`/admin/business-finance/${r.supplier_id}?welcome=1`), 1500)
    } catch (e) {
      setErr((e as Error).message || 'حصل خطأ'); setStage('form'); creatingRef.current = false
    }
  }

  // ── على الفتح: جلسة موجودة؟ درافت متحفوظ (رجوع من جوجل)؟ ──
  useEffect(() => {
    (async () => {
      const s = await ensureSupabaseSession()
      // 🔑 (١٨/٩/٢٠٢٦) محمد: «بعد ما بيتم تسجيل الدخول آخر خطوة بيقول وثّق رقمك» —
      //    الهوية عندنا بابين (قاعدة ٩/٩): جلسة Supabase **أو** توكن الواتساب.
      //    كنا بنفحص الجلسة بس، فاللي داخل بالتوكن كان بيتطلب منه توثيق تاني.
      setHasSession(!!s?.user || !!safeStorage.get('madmona_token'))
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
    return () => { if (pollRef.current) clearInterval(pollRef.current); waCleanupRef.current?.() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 🔑🔑 (١٥/٩/٢٠٢٦) محمد: «تاب ستارت وبرو لسه فيهم مشكلة في تسجيل الدخول — حل جذري ومجرّب». اللوب الحقيقي كشف إن Supabase
  //    بيرفض الباسوردات المعروفة/المسرّبة («Password is known to be weak») والرفض كان بيتبلع → الحساب يتعمل من غير باسورد
  //    والمستخدم يخرج ويرجع يلاقي «غلط». هنا: ٨ حروف على الأقل فيها حرف ورقم (بيقلّل الرفض)، والرفض لو حصل بيتقال بالعربي تحت.
  const pwOk = form.password.length >= 6 && /[a-zA-Z\u0600-\u06FF]/.test(form.password) && /\d/.test(form.password)
  useEffect(() => {
    try { if (new URLSearchParams(window.location.search).get('tab') === 'login') setTab('login') } catch { /* */ }
  }, [])

  async function doLogin(e?: React.FormEvent) {
    e?.preventDefault()
    if (lgBusy) return
    if (!lgId.trim() || !lgPw) { setLgErr('اكتب رقمك أو إيميلك والباسورد'); return }
    setLgErr(null); setLgBusy(true)
    try {
      const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: lgId.trim(), password: lgPw }) })
      const data = await r.json().catch(() => null)
      if (!r.ok || !data?.ok) {
        trackEvent({ event_type: 'start_error', metadata: { step: 'login', error: String(data?.error || r.status).slice(0, 120) } })
        setLgErr(data?.error || 'الرقم/الإيميل أو الباسورد غلط'); setLgBusy(false); return
      }
      if (data.token) safeStorage.set('madmona_token', data.token)
      if (data.access_token && data.refresh_token) {
        try { await supabaseBrowser.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token }) } catch { /* */ }
      }
      if (data.token_hash) {
        try { await supabaseBrowser.auth.verifyOtp({ type: 'email', token_hash: data.token_hash }) } catch { /* */ }
      }
      void syncModuleSession()
      router.replace(data.source === 'admin' ? '/admin/listings' : await resolveLanding(LANDING_AUTO, '/account'))
    } catch {
      setLgErr('مشكلة في الاتصال — جرّب تاني'); setLgBusy(false)
    }
  }

  const valid = form.business_name.trim().length >= 2 && form.contact_phone.replace(/\D/g, '').length >= 10 && pwOk

  // ── الخطوة ٢: توثيق الواتساب (زي /login بالظبط) ──
  async function startWhatsApp() {
    setErr(null)
    safeStorage.set(DRAFT_KEY, JSON.stringify(form))
    const r = await fetch('/api/auth/wa', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'start', phone: form.contact_phone }) })
      .then((x) => x.json()).catch(() => null)
    if (!r?.code) { trackEvent({ event_type: 'start_error', metadata: { step: 'wa_start' } }); setErr('مقدرناش نبدأ التوثيق — جرّب تاني'); return }
    trackEvent({ event_type: 'start_wa_requested', metadata: { wa_number: r.wa_number } })
    const pending = { code: r.code, number: r.wa_number, url: r.wa_url, at: Date.now() }
    safeStorage.set(WA_KEY, JSON.stringify(pending))
    setWa(pending)
    setStage('verify')
    startPolling(pending.code, form)
  }

  // 🐞 (١٨/٩/٢٠٢٦) «بيبعت الرسالة ومفيش توثيق والصفحة بتقف»: الباك-إند سليم (اتجرّب بمحاكاة
  //    الويبهوك — الكود رجع verified)، بس على الموبايل المستخدم بيسيب الصفحة ويروح واتساب،
  //    والمتصفح **بيجمّد الـsetInterval** في التاب المخفي — فبيرجع يلاقي الشاشة واقفة.
  //    العلاج: فحص فوري أول ما الصفحة ترجع ظاهرة، وزرار يدوي، ومهلة بتقول للمستخدم يعمل إيه.
  const checkingRef = useRef(false)
  async function checkOnce(code: string, f: Form): Promise<boolean> {
    if (checkingRef.current) return false
    checkingRef.current = true
    try {
      const st = await fetch(`/api/auth/wa?code=${encodeURIComponent(code)}`).then((x) => x.json()).catch(() => null)
      if (st?.expired) { stopPolling(); safeStorage.remove(WA_KEY); setErr('الكود انتهى — اضغط تاني'); setStage('form'); return false }
      if (!st?.verified) return false
      stopPolling()
      await finishVerified(code, f)
      return true
    } finally { checkingRef.current = false }
  }
  function stopPolling() { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }
  async function finishVerified(code: string, f: Form) {
    const fin = await fetch('/api/auth/wa', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'finish', code, full_name: f.contact_name.trim() || undefined }) })
      .then((x) => x.json()).catch(() => null)
    if (!fin?.token_hash) { setErr('التوثيق ماكملش — جرّب تاني'); safeStorage.remove(WA_KEY); setStage('form'); return }
    safeStorage.remove(WA_KEY)
    if (fin.madmona_token) safeStorage.set('madmona_token', fin.madmona_token)
    setHasSession(true)
    let access: string | null = null
    try {
      const { data } = await supabaseBrowser.auth.verifyOtp({ type: 'email', token_hash: fin.token_hash })
      access = data?.session?.access_token || null
      void syncModuleSession()
    } catch { /* هنكمّل بالتوكن */ }
    void createBusiness({ ...f, contact_phone: fin.phone || f.contact_phone }, access)
  }

  function startPolling(code: string, f: Form) {
    if (pollRef.current) clearInterval(pollRef.current)
    const onBack = () => { if (document.visibilityState === 'visible') void checkOnce(code, f) }
    document.addEventListener('visibilitychange', onBack)
    window.addEventListener('focus', onBack)
    waCleanupRef.current = () => { document.removeEventListener('visibilitychange', onBack); window.removeEventListener('focus', onBack) }
    pollRef.current = setInterval(async () => {
      await checkOnce(code, f)
    }, 2500)
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    // 🐞 (١٥/٩/٢٠٢٦ ١١:٤٠) محمد: «مش بيوثق الرقم بالواتساب» — القمع ورّى ٣ start_form_started من موبايله من غير start_wa_requested:
    //    الزرار كان disabled بصمت لأن الباسورد أقل من ٨ أو من غير حرف/رقم. الزرار بقى شغّال دايمًا وبيقول الناقص بالاسم.
    if (!valid) {
      const missing: string[] = []
      if (form.business_name.trim().length < 2) missing.push('اسم الشركة')
      if (form.contact_phone.replace(/\D/g, '').length < 10) missing.push('رقم الواتساب (١١ رقم)')
      if (!pwOk) missing.push(form.password.length < 6 ? 'الباسورد ٦ حروف على الأقل' : 'الباسورد لازم فيه حروف وأرقام مع بعض')
      trackEvent({ event_type: 'start_error', metadata: { step: 'validation', error: missing.join(' · ') } })
      setErr('ناقص: ' + missing.join(' · ')); return
    }
    if (hasSession) { void createBusiness(form); return }
    void startWhatsApp()
  }

  const googleNext = `/start?resume=1${utm ? '&' + utm : ''}`

  return (
    <main dir="rtl" className="min-h-screen bg-[#FAFAF7] text-[#1A2E26]">
      <div className="bg-[#04352A] text-white">
        <div className="mx-auto max-w-xl px-5 pt-6 pb-10">
          <Link href="/" className="inline-flex items-center gap-1 text-white/70 text-xs mb-5 no-underline"><ChevronLeft className="w-3.5 h-3.5" /> مضمونة</Link>
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl bg-[#34D399] text-[#04352A] grid place-items-center"><Building2 className="w-5 h-5" /></span>
            <div>
              <h1 className="text-2xl font-black leading-tight">{tab === 'login' ? 'ادخل على لوحة شركتك' : 'ضيف شركتك على مضمونة'}</h1>
              <p className="text-white/75 text-sm">{tab === 'login' ? 'برقمك أو إيميلك والباسورد — أو بجوجل' : '٤ خانات ودقيقة واحدة — حسابك ولوحة شركتك يتعملوا مع بعض'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-5 -mt-5 pb-16">
        {stage === 'loading' && <div className="rounded-3xl bg-white border border-gray-100 p-8 grid place-items-center"><Loader2 className="w-6 h-6 text-gray-400 animate-spin" /></div>}

        {stage === 'form' && (
          <>
          <div role="tablist" className="grid grid-cols-2 gap-1 rounded-2xl bg-white border border-gray-100 shadow-sm p-1 mb-3">
            <button type="button" role="tab" aria-selected={tab === 'new'} onClick={() => { setTab('new'); setLgErr(null) }}
              className={`py-3 rounded-xl text-sm font-black ${tab === 'new' ? 'bg-[#04352A] text-white' : 'text-gray-500'}`}>حساب جديد</button>
            <button type="button" role="tab" aria-selected={tab === 'login'} onClick={() => { setTab('login'); setErr(null) }}
              className={`py-3 rounded-xl text-sm font-black ${tab === 'login' ? 'bg-[#04352A] text-white' : 'text-gray-500'}`}>عندي حساب — دخول</button>
          </div>
          {tab === 'login' ? (
            <form onSubmit={doLogin} noValidate className="rounded-3xl bg-white border border-gray-100 shadow-sm p-5 space-y-3">
              {hasSession && (
                <button type="button" onClick={async () => router.replace(await resolveLanding(LANDING_AUTO, '/account'))}
                  className="w-full py-3 rounded-2xl bg-[#E6F4EE] text-[#04352A] font-black">إنت داخل بالفعل — افتح لوحتي ←</button>
              )}
              <label className="block"><span className="text-xs font-bold text-gray-600">رقم الواتساب أو الإيميل</span>
                <input value={lgId} onChange={(e) => setLgId(e.target.value)} className={INP} dir="ltr" autoComplete="username" placeholder="01xxxxxxxxx" /></label>
              <label className="block"><span className="text-xs font-bold text-gray-600">الباسورد</span>
                <input type="password" value={lgPw} onChange={(e) => setLgPw(e.target.value)} className={INP} dir="ltr" autoComplete="current-password" placeholder="••••••" /></label>
              {lgErr && <p className="text-xs text-red-600">{lgErr}</p>}
              <button type="submit" disabled={lgBusy} className="w-full py-4 rounded-2xl bg-[#04352A] text-white font-black text-base flex items-center justify-center gap-2">
                {lgBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : null} ادخل على لوحتي
              </button>
              <p className="text-center text-[11px] text-gray-400">أو</p>
              <GoogleSignInButton redirectTo={LANDING_AUTO} label="ادخل بحساب جوجل" />
              <p className="text-[11px] text-gray-400 text-center">مش فاكر الباسورد؟ <Link href="/login" className="text-[#059669] font-bold">ادخل بكود واتساب</Link> وبعدها غيّره من «حسابي».</p>
            </form>
          ) : (
          <form onSubmit={onSubmit} noValidate className="rounded-3xl bg-white border border-gray-100 shadow-sm p-5 space-y-3">
            <p className="text-xs text-gray-500">مجاني لصاحب البيزنس + موظف واحد. الباقي بتكمّله جوّه اللوحة خطوة خطوة.</p>
            {/* 📈 (١٥/٩/٢٠٢٦) محمد: «عايز growth» — الفورم كان ٩ خانات على شاشة موبايل لزائر جاي من شورت.
                المطلوب للإنشاء فعلًا: اسم الشركة · النشاط · رقم الواتساب · باسورد (قاعدة ١٤/٩). الباقي (المسؤول · الإيميل ·
                المدينة · الحي · العنوان) بيتكمّل في «كمّل شركتك» — هنا اختياري ومطوي. */}
            <label className="block"><span className="text-xs font-bold text-gray-600">اسم الشركة *</span>
              <input value={form.business_name} onChange={(e) => touch({ ...form, business_name: e.target.value })} className={INP} placeholder="مثلًا: عيادة د. أحمد — مصر الجديدة" required maxLength={200} /></label>
            <label className="block"><span className="text-xs font-bold text-gray-600">النشاط *</span>
              <select value={form.industry} onChange={(e) => touch({ ...form, industry: e.target.value })} className={INP}>{INDUSTRIES.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}</select></label>
            <label className="block"><span className="text-xs font-bold text-gray-600">رقم الواتساب *</span>
              <input value={form.contact_phone} onChange={(e) => touch({ ...form, contact_phone: e.target.value })} className={INP} dir="ltr" inputMode="tel" placeholder="01xxxxxxxxx" required /></label>
            {/* 🔑 (١٤/٩/٢٠٢٦) محمد: «تسجيل دخول الاكونت بتاع ستارت بيزنس مش شغال — عايزينه بإيميل وباسورد أو برقم تليفون وباسورد».
                الباسورد بيتحط على مستخدم Supabase في /api/start/create-business (service role) — وبعدها /login بيقبل الرقم أو الإيميل + الباسورد ده. */}
            <label className="block"><span className="text-xs font-bold text-gray-600">باسورد للدخول بعدين *</span>
              <input type="password" value={form.password} onChange={(e) => touch({ ...form, password: e.target.value })} className={INP} dir="ltr" autoComplete="new-password" placeholder="٦ حروف وأرقام على الأقل" minLength={6} />
              <span className={`text-[11px] ${form.password && !pwOk ? 'text-amber-600 font-bold' : 'text-gray-400'}`}>{form.password && !pwOk ? (form.password.length < 6 ? `لسه ${6 - form.password.length} حروف — ` : 'لازم حروف وأرقام مع بعض — ') : ''}٦ على الأقل، فيه حروف وأرقام، ومش معروف (مش ١٢٣٤٥٦٧٨ ولا رقم موبايلك). هتدخل بيه بعدين برقم الواتساب.</span></label>
            <details className="rounded-xl border border-dashed border-gray-200 px-3 py-2">
              <summary className="text-xs font-bold text-gray-500 cursor-pointer select-none">تفاصيل أكتر (اختياري) — اسمك · الإيميل · العنوان</summary>
              <div className="space-y-3 pt-3">
                <div className="grid grid-cols-2 gap-3">
                  <label className="block"><span className="text-xs font-bold text-gray-600">اسم المسؤول</span>
                    <input value={form.contact_name} onChange={(e) => touch({ ...form, contact_name: e.target.value })} className={INP} placeholder="اسمك" /></label>
                  <label className="block"><span className="text-xs font-bold text-gray-600">الإيميل</span>
                    <input value={form.contact_email} onChange={(e) => touch({ ...form, contact_email: e.target.value })} className={INP} dir="ltr" inputMode="email" /></label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block"><span className="text-xs font-bold text-gray-600">المدينة</span>
                    <select value={form.city} onChange={(e) => touch({ ...form, city: e.target.value })} className={INP}>{CITIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
                  <label className="block"><span className="text-xs font-bold text-gray-600">الحي</span>
                    <input value={form.district} onChange={(e) => touch({ ...form, district: e.target.value })} className={INP} placeholder="مصر الجديدة" /></label>
                </div>
                <label className="block"><span className="text-xs font-bold text-gray-600">العنوان</span>
                  <input value={form.address} onChange={(e) => touch({ ...form, address: e.target.value })} className={INP} placeholder="الشارع · رقم العمارة" /></label>
              </div>
            </details>
            {err && <p className="text-xs text-red-600">{err}</p>}
            <button type="submit" className="w-full py-4 rounded-2xl bg-[#04352A] text-white font-black text-base flex items-center justify-center gap-2">
              {hasSession ? 'أنشئ شركتي' : <><MessageCircle className="w-4 h-4" /> وثّق رقمي بالواتساب وأنشئ شركتي</>}
            </button>
            {!hasSession && (
              <div className="pt-1">
                <p className="text-center text-[11px] text-gray-400 mb-2">أو</p>
                <div onClick={() => { safeStorage.set(DRAFT_KEY, JSON.stringify(form)); trackEvent({ event_type: 'start_google_click' }) }}>
                  <GoogleSignInButton redirectTo={googleNext} label="كمّل بحساب جوجل" />
                </div>
              </div>
            )}
            <p className="text-[11px] text-gray-400 text-center">من غير دفع دلوقتي. <b>عندك حساب أو شركة بالفعل؟</b> <Link href="/login" className="text-[#059669] font-bold">سجّل دخولك من هنا</Link> بنفس الرقم أو الإيميل + الباسورد (أو جوجل/الواتساب) وهتلاقي لوحتك.</p>
          </form>
          )}
          </>
        )}

        {stage === 'verify' && wa && (
          <div className="rounded-3xl bg-white border border-gray-100 shadow-sm p-5 text-center space-y-3">
            <p className="font-black text-lg">خطوة أخيرة: ابعت الكود ده على واتساب</p>
            <p className="text-sm text-gray-500">افتح واتساب وابعت الكود لرقم مضمونة — هنعرفك من رقمك ونكمّل لوحدنا.</p>
            <div className="rounded-2xl bg-[#FAFAF7] border border-dashed border-[#34D399] py-4 text-3xl font-black tracking-widest" dir="ltr">{wa.code}</div>
            <a href={wa.url} target="_blank" rel="noopener noreferrer" className="block w-full py-4 rounded-2xl bg-[#25D366] text-white font-black no-underline flex items-center justify-center gap-2"><MessageCircle className="w-5 h-5" /> افتح واتساب وابعت الكود</a>
            <p className="text-xs text-gray-400 flex items-center justify-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> مستنيين رسالتك… الصفحة هتكمّل لوحدها أول ما ترجع</p>
            {/* 🐞 (١٨/٩/٢٠٢٦) على الموبايل التاب بيتجمّد وإنت في واتساب — الزرار ده بيفحص فورًا من غير انتظار */}
            <button type="button" onClick={() => { setErr(null); void checkOnce(wa.code, form) }} className="w-full py-3 rounded-2xl bg-[#04352A] text-white font-black">بعتّ الكود — كمّل</button>
            <button onClick={() => { stopPolling(); safeStorage.remove(WA_KEY); setStage('form') }} className="text-xs text-gray-500 underline">ارجع للبيانات</button>
          </div>
        )}

        {stage === 'creating' && (
          <div className="rounded-3xl bg-white border border-gray-100 shadow-sm p-8 text-center"><Loader2 className="w-7 h-7 text-[#059669] animate-spin mx-auto mb-3" /><p className="font-black">بنجهّز شركتك…</p></div>
        )}

        {stage === 'done' && (
          <div className="rounded-3xl bg-white border-2 border-[#04352A] shadow-sm p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-[#059669] mx-auto mb-2" />
            <p className="font-black text-lg">اتعملت ✓</p>
            <p className="text-sm text-gray-500 mt-1">هنودّيك على لوحة شركتك على طول — وتقدر تكمّل بياناتك من «كمّل شركتك» جوّه اللوحة.</p>
            {/* 🔑 (١٠/٩) محمد: «صاحب البيزنس لما بيخلص مش بيعرف يسجل دخول تاني» — نقوله المرة الجاية بيدخل منين */}
            <p className="text-xs text-[#04352A] bg-[#E6F4EE] rounded-xl px-3 py-2 mt-3 font-bold">المرة الجاية: افتح <span dir="ltr">madmonacairo.com/login</span> وادخل بنفس الرقم أو الإيميل + الباسورد اللي كتبته هنا (أو كود واتساب / حساب جوجل) — هتلاقي لوحتك على طول.</p>
            {supplierId && <Link href={`/admin/business-finance/${supplierId}?welcome=1`} className="inline-block mt-4 bg-[#04352A] text-white font-black rounded-2xl px-6 py-3 no-underline">افتح لوحتي ←</Link>}
          </div>
        )}
      </div>
    </main>
  )
}
