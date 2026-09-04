'use client'
// ✋ (٤ سبتمبر ٢٠٢٦) رسايل المعرض — إرسال يدوي من موبايل محمد.
//    محمد: «مش عارف بيبعت إيه ولا مين… حط في تاب شغلي على الواتساب وأنا هبعته».
//    الإرسال الآلي من 337 فصل الرقم مرتين. هنا كل عارض بزرار واتساب
//    بيفتح المحادثة والنص جاهز — هو بيضغط «إرسال» بنفسه من التطبيق،
//    وبعدين يعلّم «اتبعتت». الحالة بتتحفظ في whatsapp_campaign_messages.
import { useCallback, useEffect, useState } from 'react'
import { MessageCircle, Check, RotateCcw, ExternalLink } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'

interface Row {
  id: string; name: string; phone: string; booth: string | null; text: string
  delivered: boolean; manual_sent_at: string | null; has_page: boolean; store: string | null
}

export default function ExpoManualSend() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data } = await (supabaseBrowser.rpc as unknown as (
      fn: string, args: Record<string, unknown>,
    ) => Promise<{ data: Row[] | null }>)('expo_manual_messages', {})
    setRows(data || [])
  }, [])
  useEffect(() => { load() }, [load])

  const mark = async (id: string, undo: boolean) => {
    setBusy(id)
    try {
      await (supabaseBrowser.rpc as unknown as (
        fn: string, args: Record<string, unknown>,
      ) => Promise<unknown>)('expo_manual_mark_sent', { p_id: id, p_undo: undo })
      await load()
    } finally { setBusy(null) }
  }

  if (!rows || rows.length === 0) return null
  const pending = rows.filter((r) => !r.delivered && !r.manual_sent_at)
  const done = rows.length - pending.length

  return (
    <div className="mt-3">
      <p className="text-[11.5px] text-[#6B7280] mb-2">
        <b className="text-[#1A2E26]">{pending.length}</b> لسه · {done} اتبعتت أو وصلت ·
        اضغط «واتساب» تفتح المحادثة بالنص جاهز، ابعت من التطبيق، وبعدين علّم «اتبعتت».
      </p>
      <div className="space-y-2">
        {rows.map((r) => {
          const sent = r.delivered || !!r.manual_sent_at
          const wa = `https://wa.me/${r.phone.replace(/\D/g, '')}?text=${encodeURIComponent(r.text)}`
          return (
            <div key={r.id} className={`rounded-2xl border p-3 ${sent ? 'bg-[#F0FBF5] border-[#BEE9D2]' : 'bg-white border-gray-100'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-black text-[13px] text-[#1A2E26] truncate">{r.name}</p>
                  <p className="text-[11px] text-[#6B7280]">
                    {r.booth ? `استاند ${r.booth} · ` : ''}<span dir="ltr">0{r.phone.replace(/^2/, '').replace(/^0/, '')}</span>
                    {r.has_page && r.store && <> · <a href={`/s/${r.store}`} className="text-[#059669] font-bold">صفحته جاهزة</a></>}
                  </p>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap ${
                  r.delivered ? 'bg-emerald-100 text-emerald-800' : r.manual_sent_at ? 'bg-[#DDF3E8] text-[#0F5132]' : 'bg-amber-50 text-amber-800'
                }`}>{r.delivered ? 'وصلت' : r.manual_sent_at ? 'اتبعتت' : 'لسه'}</span>
              </div>

              <div className="flex gap-2 mt-2.5">
                <a href={wa} target="_blank" rel="noopener"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#25D366] text-white py-2.5 rounded-xl text-[12.5px] font-black no-underline">
                  <MessageCircle className="w-4 h-4" /> واتساب
                </a>
                {!r.delivered && (
                  <button onClick={() => mark(r.id, !!r.manual_sent_at)} disabled={busy === r.id}
                    className={`inline-flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl text-[12px] font-black disabled:opacity-50 ${
                      r.manual_sent_at ? 'bg-gray-100 text-gray-600' : 'bg-[#1A2E26] text-white'}`}>
                    {r.manual_sent_at ? <><RotateCcw className="w-3.5 h-3.5" /> رجّع</> : <><Check className="w-3.5 h-3.5" /> اتبعتت</>}
                  </button>
                )}
                <button onClick={() => setOpen(open === r.id ? null : r.id)}
                  className="px-3 py-2.5 rounded-xl text-[12px] font-bold bg-gray-50 text-gray-600">
                  {open === r.id ? 'اقفل' : 'النص'}
                </button>
              </div>
              {open === r.id && (
                <pre className="mt-2 whitespace-pre-wrap text-[11.5px] leading-relaxed text-[#1A2E26] bg-gray-50 rounded-xl p-3 font-[inherit]">{r.text}</pre>
              )}
            </div>
          )
        })}
      </div>
      <p className="text-[10.5px] text-[#6B7280] mt-2 flex items-center gap-1">
        <ExternalLink className="w-3 h-3" /> الرسايل نفسها اللي كانت في الطابور — بأسماء واستاندات كل شركة.
      </p>
    </div>
  )
}
