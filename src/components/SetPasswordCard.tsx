'use client'
// 🔑 (١٤/٩/٢٠٢٦) محمد: «تسجيل دخول الاكونت بتاع ستارت بيزنس مش شغال — عايزينه بإيميل وباسورد أو برقم تليفون وباسورد».
// الحسابات اللي اتعملت قبل النهارده من /start (واتساب/جوجل) ماعندهاش باسورد أصلًا. الكارت ده بيخلّي صاحب الحساب يحدّد
// باسورد بنفسه (Supabase Auth — مفيش تخزين عندنا) وبعدها يدخل من /login بالرقم أو الإيميل + الباسورد.
// بيظهر بس لما فيه جلسة Supabase حقيقية (ensureSupabaseSession بترقّي التوكن).
import { useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'

export default function SetPasswordCard({ hasSession }: { hasSession: boolean }) {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState('')
  if (!hasSession) return null
  async function save() {
    if (state === 'busy') return
    if (pw.length < 6 || !/\d/.test(pw) || !/[a-zA-Z؀-ۿ]/.test(pw)) { setState('error'); setMsg('الباسورد ٦ على الأقل وفيه حروف وأرقام'); return }
    if (pw !== pw2) { setState('error'); setMsg('الباسوردين مش زي بعض'); return }
    setState('busy'); setMsg('')
    const { error } = await supabaseBrowser.auth.updateUser({ password: pw })
    // 🔑 (١٥/٩/٢٠٢٦) Supabase بيرفض الباسوردات المعروفة («known to be weak») — الرسالة بالعربي بدل الإنجليزي
    if (error) { setState('error'); setMsg(/weak|easy to guess|pwned|leaked/i.test(error.message || '') ? 'الباسورد ده معروف وسهل التخمين — اختار باسورد تاني (٨ حروف وأرقام مش متوقعة)' : (error.message || 'ماتحفظش — جرّب تاني')); return }
    setState('done'); setPw(''); setPw2('')
  }
  return (
    <div className="rounded-2xl bg-white border border-[#E8E4D8] p-4" dir="rtl">
      <p className="font-black text-[#1A2E26] text-sm">🔑 باسورد للدخول بالرقم أو الإيميل</p>
      <p className="text-xs text-gray-500 mt-1">حدّد باسورد مرة واحدة، وبعدها ادخل من صفحة الدخول برقم الواتساب أو الإيميل + الباسورد من غير كود.</p>
      {state === 'done' ? (
        <p className="mt-3 text-sm font-bold text-[#04352A]">تمام ✓ الباسورد اتحفظ — تقدر تدخل بيه من صفحة الدخول.</p>
      ) : (
        <div className="mt-3 space-y-2">
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="باسورد جديد" autoComplete="new-password" dir="ltr" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[16px]" />
          <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="تأكيد الباسورد" autoComplete="new-password" dir="ltr" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[16px]" />
          {state === 'error' && <p className="text-xs text-red-600">{msg}</p>}
          <button onClick={save} disabled={state === 'busy'} className="w-full rounded-xl bg-[#04352A] text-white font-black py-2.5 text-sm disabled:opacity-50">{state === 'busy' ? '…' : 'احفظ الباسورد'}</button>
        </div>
      )}
    </div>
  )
}
