'use client'
// 📧 (١٣/٩/٢٠٢٦) صندوق الاشتراك في نشرة «قصة حقيقية من عالم البيزنس» — محمد: «عايزك تسوق بالإيميل برضو».
// قصة واحدة كل أسبوع بالإيميل + الدرس لصاحب البيزنس. بيكتب في email_marketing_contacts عبر /api/email/subscribe.
import { useState } from 'react'

export default function NewsletterBox({ source = 'newsletter', compact = false }: { source?: string; compact?: boolean }) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (state === 'busy') return
    setState('busy')
    try {
      const r = await fetch('/api/email/subscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, source }) })
      const j = await r.json().catch(() => ({}))
      setState(j?.ok ? 'done' : 'error')
    } catch { setState('error') }
  }
  if (state === 'done') return <div className="rounded-2xl bg-[#34D399]/15 border border-[#34D399]/40 p-4 text-sm font-bold text-[#04352A]">تمام ✓ أول قصة هتوصلك بكرة — ولو ماعجبتكش، لينك الإلغاء في آخر كل رسالة.</div>
  return (
    <form onSubmit={submit} className={`rounded-2xl border border-[#E8E4D8] bg-white ${compact ? 'p-4' : 'p-5'}`} dir="rtl">
      <p className="font-black text-[#1A2E26]">📚 قصة حقيقية من عالم البيزنس — كل يوم في إيميلك</p>
      <p className="text-xs text-gray-600 mt-1">بلوك باستر · كوداك · نوكيا · ليجو · طلعت حرب… قصة ودرس واحد لبيزنسك. من غير إعلانات، وتقدر تلغي بضغطة.</p>
      <div className="mt-3 flex gap-2">
        <input type="email" required inputMode="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="إيميلك" className="flex-1 min-w-0 rounded-xl border border-gray-200 px-3 py-2.5 text-[16px]" dir="ltr" />
        <button disabled={state === 'busy'} className="rounded-xl bg-[#04352A] text-white font-black px-4 py-2.5 text-sm disabled:opacity-50">{state === 'busy' ? '…' : 'اشترك'}</button>
      </div>
      {state === 'error' && <p className="text-xs text-red-600 mt-2">الإيميل مش مظبوط — جرّب تاني.</p>}
    </form>
  )
}
