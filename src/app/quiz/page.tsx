'use client'
// ============================================================================
// 🧩 /quiz — «إنت صاحب بيزنس نوعه إيه؟» (١٥ سبتمبر ٢٠٢٦)
//
// محمد نصًا: «الأرقام وحشة جدًا — حاول تشوف حاجة إضافية للجرو والانتشار، وياريت حاجة تفيرال أو أسئلة أو حاجة تلم كومنتس».
// الفكرة: اختبار شخصية سريع (٦ أسئلة) → نتيجة من ٤ أنواع بتتشارك على واتساب/فيسبوك بلينك فيه النتيجة (?r=) →
// اللي بيفتح اللينك بيشوف نتيجة صاحبه + «اعرف نوعك إنت» = حلقة انتشار. البوستات بتقول «اكتب نوعك في كومنت».
// مفيش أرقام ولا نسب مخترعة — النتيجة وصف سلوك بس. الـCTA لـ/start (قاعدة ١٤/٩: مفيش ماركتبليس).
// القياس: quiz_start · quiz_complete (metadata.type) · quiz_share (metadata.channel) · quiz_cta.
// ============================================================================
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { trackEvent } from '@/components/AnalyticsTracker'

type T = 'brain' | 'firefighter' | 'hustler' | 'organizer'

const TYPES: Record<T, { name: string; emoji: string; line: string; body: string; fix: string }> = {
  brain: {
    name: 'الشايل كل حاجة في دماغه', emoji: '🧠',
    line: 'البيزنس ماشي… طول ما إنت موجود.',
    body: 'إنت عارف كل رقم وكل زبون وكل مصروف — بس كله في دماغك. أول ما تغيب يوم، الشغل بيستناك.',
    fix: 'اكتب اللي في دماغك في مكان واحد: العملاء، المصاريف، والمهام — عشان الشغل يمشي حتى لو إنت مش موجود.',
  },
  firefighter: {
    name: 'المطافي', emoji: '🧯',
    line: 'كل يوم فيه مشكلة… وإنت اللي بتطفيها.',
    body: 'يومك بيعدّي في حل مشاكل: موظف غاب، زبون زعلان، بضاعة خلصت. شاطر جدًا في الطوارئ — بس مفيش وقت تكبّر.',
    fix: 'المشكلة اللي بتتكرر محتاجة نظام مش مجهود: حضور بيتسجّل لوحده، مخزون بينبّهك، ومهام واضحة لكل واحد.',
  },
  hustler: {
    name: 'المغامر', emoji: '🚀',
    line: 'بتفتح أبواب أسرع ما بتقفل حسابات.',
    body: 'عندك أفكار وبتتحرك بسرعة وبتجيب زباين — بس مش متأكد إيه اللي بيكسب بجد وإيه اللي بياكل الفلوس.',
    fix: 'قبل الخطوة الجاية اعرف مكسبك الحقيقي: كل بيعة وكل مصروف في مكانه، وتشوف أنهي منتج أو فرع بيكسب.',
  },
  organizer: {
    name: 'المنظّم', emoji: '📋',
    line: 'عندك سيستم… حتى لو على ورق.',
    body: 'إنت عامل جداول ودفاتر وبتتابع — ودي نقطة قوة كبيرة. بس الورق والشيتات بياخدوا وقتك وبيتلخبطوا لما الشغل يكبر.',
    fix: 'انقل نظامك لمكان واحد على الموبايل يحسب لوحده، وخلّي وقتك للقرارات مش للتقفيل.',
  },
}

const QS: { q: string; a: { t: string; v: T }[] }[] = [
  { q: 'لو غبت عن شغلك أسبوع… إيه اللي هيحصل؟', a: [
    { t: 'مفيش حاجة هتمشي — كله بيرجعلي', v: 'brain' },
    { t: 'هيحصل مشاكل وأرجع أحلها', v: 'firefighter' },
    { t: 'مش هقدر أغيب أصلًا، عندي حاجات بفتحها', v: 'hustler' },
    { t: 'هيمشي — كل حاجة مكتوبة', v: 'organizer' },
  ] },
  { q: 'تعرف مصاريف الشهر اللي فات بالجنيه؟', a: [
    { t: 'تقريبًا… في دماغي', v: 'brain' },
    { t: 'مش فاكر، كان شهر مليان مشاكل', v: 'firefighter' },
    { t: 'مش مهم، المهم الزباين بتزيد', v: 'hustler' },
    { t: 'أيوة، عندي دفتر أو شيت', v: 'organizer' },
  ] },
  { q: 'زبون قديم رجع يسأل على طلبه من شهرين…', a: [
    { t: 'أفتكره وأرد عليه من الذاكرة', v: 'brain' },
    { t: 'أدوّر في الواتساب وأكلّم الموظف', v: 'firefighter' },
    { t: 'مش فاكر، بس هعرضله حاجة جديدة', v: 'hustler' },
    { t: 'أفتح ملفه وألاقي كل حاجة', v: 'organizer' },
  ] },
  { q: 'موظف قال «أنا حضرت بدري النهارده»…', a: [
    { t: 'أنا عارف مين بييجي إمتى', v: 'brain' },
    { t: 'دي خناقة كل أسبوع', v: 'firefighter' },
    { t: 'مش فاضي أتابع الحضور', v: 'hustler' },
    { t: 'أبص في كشف الحضور', v: 'organizer' },
  ] },
  { q: 'أكتر حاجة بتاخد وقتك في اليوم؟', a: [
    { t: 'إن كل الناس بتسألني أنا', v: 'brain' },
    { t: 'مشاكل طارئة مالهاش آخر', v: 'firefighter' },
    { t: 'مقابلات وصفقات وأفكار جديدة', v: 'hustler' },
    { t: 'تقفيل الحسابات والجداول', v: 'organizer' },
  ] },
  { q: 'لو هتفتح فرع تاني بكرة…', a: [
    { t: 'مين هيديره غيري؟', v: 'brain' },
    { t: 'الفرع الأول لسه مخلّصش مشاكله', v: 'firefighter' },
    { t: 'يلا بينا، هنتصرف', v: 'hustler' },
    { t: 'هنسخ نفس النظام', v: 'organizer' },
  ] },
]

const BASE = 'https://www.madmonacairo.com'

export default function QuizPage() {
  const [step, setStep] = useState(-1) // -1 = البداية
  const [answers, setAnswers] = useState<T[]>([])
  const [friend, setFriend] = useState<T | null>(null)

  useEffect(() => {
    try { const r = new URLSearchParams(window.location.search).get('r') as T | null; if (r && TYPES[r]) setFriend(r) } catch { /* */ }
  }, [])

  const result = useMemo<T | null>(() => {
    if (answers.length < QS.length) return null
    const c: Record<T, number> = { brain: 0, firefighter: 0, hustler: 0, organizer: 0 }
    answers.forEach((a) => { c[a]++ })
    // التعادل: الأولوية للنوع اللي بيحتاج نظام أكتر (أصدق مع أغلب أصحاب البيزنس الصغير)
    return (['brain', 'firefighter', 'hustler', 'organizer'] as T[]).reduce((best, k) => (c[k] > c[best] ? k : best), 'brain')
  }, [answers])

  function start() { setStep(0); setAnswers([]); trackEvent({ event_type: 'quiz_start', metadata: { from_friend: friend } }) }
  function pick(v: T) {
    const next = [...answers, v]
    setAnswers(next)
    if (next.length >= QS.length) {
      setStep(QS.length)
      const c: Record<T, number> = { brain: 0, firefighter: 0, hustler: 0, organizer: 0 }
      next.forEach((a) => { c[a]++ })
      const r = (['brain', 'firefighter', 'hustler', 'organizer'] as T[]).reduce((best, k) => (c[k] > c[best] ? k : best), 'brain')
      trackEvent({ event_type: 'quiz_complete', metadata: { type: r } })
    } else setStep(next.length)
  }

  const shareUrl = result ? `${BASE}/quiz?r=${result}&utm_source=quiz&utm_medium=share&utm_campaign=erp1000` : `${BASE}/quiz`
  const shareText = result ? `طلعت «${TYPES[result].name}» ${TYPES[result].emoji} — إنت نوعك إيه؟ اختبار دقيقة: ${shareUrl}` : ''

  return (
    <main dir="rtl" className="min-h-screen bg-[#FAFAF7] text-[#1A2E26]">
      <div className="bg-[#04352A] text-white">
        <div className="mx-auto max-w-xl px-5 pt-7 pb-12 text-center">
          <p className="text-[#34D399] text-xs font-bold mb-2">اختبار دقيقة واحدة</p>
          <h1 className="text-2xl font-black leading-tight">إنت صاحب بيزنس نوعه إيه؟</h1>
          <p className="text-white/75 text-sm mt-2">٦ أسئلة عن طريقة إدارتك لشغلك — وشارك نتيجتك</p>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-5 -mt-7 pb-16">
        {step === -1 && (
          <div className="rounded-3xl bg-white border border-gray-100 shadow-sm p-6 text-center space-y-4">
            {friend && (
              <div className="rounded-2xl bg-[#E6F4EE] px-4 py-3 text-sm">
                صاحبك طلع <b>«{TYPES[friend].name}» {TYPES[friend].emoji}</b> — تفتكر إنت نفس النوع؟
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 text-sm">
              {(Object.keys(TYPES) as T[]).map((k) => (
                <div key={k} className="rounded-2xl border border-gray-100 py-3"><div className="text-2xl">{TYPES[k].emoji}</div><div className="font-bold">{TYPES[k].name}</div></div>
              ))}
            </div>
            <button onClick={start} className="w-full py-4 rounded-2xl bg-[#04352A] text-white font-black text-base">ابدأ الاختبار</button>
            <p className="text-[11px] text-gray-400">من غير تسجيل ومن غير رقم.</p>
          </div>
        )}

        {step >= 0 && step < QS.length && (
          <div className="rounded-3xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>سؤال {step + 1} من {QS.length}</span>
              <span className="h-1.5 flex-1 mx-3 rounded-full bg-gray-100 overflow-hidden"><span className="block h-full bg-[#059669]" style={{ width: `${((step) / QS.length) * 100}%` }} /></span>
            </div>
            <h2 className="text-lg font-black leading-snug">{QS[step].q}</h2>
            <div className="space-y-2">
              {QS[step].a.map((o) => (
                <button key={o.t} onClick={() => pick(o.v)} className="w-full text-right rounded-2xl border border-gray-200 px-4 py-3.5 text-[15px] font-bold hover:border-[#059669] hover:bg-[#E6F4EE] active:scale-[.99]">{o.t}</button>
              ))}
            </div>
          </div>
        )}

        {result && step === QS.length && (
          <div className="space-y-3">
            <div className="rounded-3xl bg-white border-2 border-[#04352A] shadow-sm p-6 text-center space-y-3">
              <div className="text-5xl">{TYPES[result].emoji}</div>
              <p className="text-xs text-gray-500">نوعك:</p>
              <h2 className="text-2xl font-black">{TYPES[result].name}</h2>
              <p className="font-bold text-[#059669]">{TYPES[result].line}</p>
              <p className="text-sm text-gray-600 leading-relaxed">{TYPES[result].body}</p>
            </div>
            <div className="rounded-3xl bg-white border border-gray-100 shadow-sm p-5 space-y-3">
              <p className="text-sm font-black">شارك نتيجتك واعرف صحابك نوعهم إيه 👇</p>
              <div className="grid grid-cols-2 gap-2">
                <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer"
                  onClick={() => trackEvent({ event_type: 'quiz_share', metadata: { type: result, channel: 'whatsapp' } })}
                  className="py-3 rounded-2xl bg-[#25D366] text-white font-black text-center no-underline">واتساب</a>
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer"
                  onClick={() => trackEvent({ event_type: 'quiz_share', metadata: { type: result, channel: 'facebook' } })}
                  className="py-3 rounded-2xl bg-[#1877F2] text-white font-black text-center no-underline">فيسبوك</a>
              </div>
              <button onClick={async () => { try { await navigator.clipboard.writeText(shareText); trackEvent({ event_type: 'quiz_share', metadata: { type: result, channel: 'copy' } }) } catch { /* */ } }}
                className="w-full py-2.5 rounded-2xl border border-gray-200 text-sm font-bold">انسخ النتيجة</button>
            </div>
            <div className="rounded-3xl bg-[#04352A] text-white p-5 space-y-3">
              <p className="text-sm font-black">اللي يناسب «{TYPES[result].name}»:</p>
              <p className="text-sm text-white/85 leading-relaxed">{TYPES[result].fix}</p>
              <Link href={`/start?utm_source=quiz&utm_medium=result&utm_campaign=erp1000&utm_content=${result}`}
                onClick={() => trackEvent({ event_type: 'quiz_cta', metadata: { type: result } })}
                className="block w-full py-4 rounded-2xl bg-[#34D399] text-[#04352A] font-black text-center no-underline">افتح لوحة شغلك مجانًا</Link>
              <p className="text-[11px] text-white/60 text-center">مجاني لصاحب البيزنس + موظف</p>
            </div>
            <button onClick={start} className="w-full text-xs text-gray-500 underline">أعيد الاختبار</button>
          </div>
        )}
      </div>
    </main>
  )
}
