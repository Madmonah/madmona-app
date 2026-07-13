'use client'

// 🔴 RpcErrorToast — شبكة أمان: أي RPC تفشل، التنبيه ده بيظهر
// =====================================================================
// قبل كده لو حفظ فشل، الشاشة مكانتش بتقول حاجة — الفورم يقفل وكأنه نجح.
// دلوقتي أي فشل بيتسجّل في الكونسول وبيطلّع الشريط الأحمر ده.
//
// مبيغيّرش منطق أي صفحة — مجرد إنه بيسمع الحدث اللي rpcSafe بيبعته.
// =====================================================================
import { useEffect, useState } from 'react'
import { RPC_ERROR_EVENT } from '@/lib/rpc'

type Err = { fn: string; message: string; id: number }

export default function RpcErrorToast() {
  const [errs, setErrs] = useState<Err[]>([])

  useEffect(() => {
    let n = 0
    function onErr(e: Event) {
      const d = (e as CustomEvent).detail as { fn: string; message: string }
      const id = ++n
      setErrs((prev) => [...prev.slice(-2), { ...d, id }])
      setTimeout(() => setErrs((prev) => prev.filter((x) => x.id !== id)), 7000)
    }
    window.addEventListener(RPC_ERROR_EVENT, onErr)
    return () => window.removeEventListener(RPC_ERROR_EVENT, onErr)
  }, [])

  if (errs.length === 0) return null

  return (
    <div
      dir="rtl"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 w-[min(92vw,26rem)]"
    >
      {errs.map((e) => (
        <div
          key={e.id}
          className="bg-red-600 text-white rounded-2xl shadow-xl px-4 py-3"
          role="alert"
        >
          <p className="text-sm font-black mb-0.5">الحفظ فشل — البيانات مااتسجلتش</p>
          <p className="text-xs opacity-90 leading-relaxed">{e.message}</p>
          <p className="text-[10px] opacity-60 mt-1 font-mono" dir="ltr">{e.fn}</p>
        </div>
      ))}
    </div>
  )
}
