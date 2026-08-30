'use client'
// ============================================================================
// 📞 /admin/voice — معمل المكالمات الصوتية
//
// (٢٨ أغسطس ٢٠٢٦) محمد: «متنساش موضوع التليفون اللي خلص النهاردة».
//
// اللي اتحقق النهاردة: مكالمة حقيقية → شبكة المحمول → تليفون →
// بلوتوث → لينكس → أستريسك يرد بصوت محمد → المتصل سمعه.
// مُثبت بمكالمتين وسجل اختيارات فعلي.
//
// ⚠️ الشاشة دي **عرض وتوثيق** — التحكم الفعلي في الماكينة نفسها،
//    لأن الأستريسك شغّال على لاب مضمونة مش على السيرفر.
// ============================================================================
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Phone, Loader2, RefreshCw, AlertTriangle, CheckCircle2, Power, RotateCcw, Square } from 'lucide-react'
// 📞 (٣٠ أغسطس ٢٠٢٦) محمد: «تفعيل التليفون madmona-voice عايزين له مكان في
// الأدمن بانل». التحكم بيمشي عبر voice_commands/voice_status في الداتابيز —
// عميل على لاب مضمونة (MadmonaVoiceAgent، كل دقيقة) بينفذ ويرفع الحالة.
import { adminRpc } from '@/lib/adminRpc'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

type Lead = { id: string; phone: string | null; source: string | null; topic: string | null; created_at: string }

type VoiceStatus = {
  vm_state: string | null; bt_connected: boolean | null
  asterisk_connected: boolean | null; asterisk_state: string | null
  agent_seen_at: string | null; agent_alive: boolean
  last_command: { command: string; status: string; result: string | null; created_at: string } | null
}

export default function VoiceLabPage() {
  const [calls, setCalls] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  // 📞 حالة التليفون + أوامر التشغيل
  const [vs, setVs] = useState<VoiceStatus | null>(null)
  const [cmdBusy, setCmdBusy] = useState(false)
  const [cmdMsg, setCmdMsg] = useState<string | null>(null)

  const loadStatus = useCallback(async () => {
    try { setVs(await adminRpc<VoiceStatus>('voice_status_get')) } catch { /* اللوحة بس */ }
  }, [])
  useEffect(() => {
    loadStatus()
    const t = setInterval(loadStatus, 15000) // كل ١٥ ثانية — العميل بيحدث كل دقيقة
    return () => clearInterval(t)
  }, [loadStatus])

  const sendCmd = useCallback(async (cmd: 'start' | 'stop' | 'restart') => {
    if (cmd !== 'start' && !confirm(cmd === 'stop' ? 'هتقفل تليفون المكالمات؟' : 'هتعيد تشغيل تليفون المكالمات؟')) return
    setCmdBusy(true); setCmdMsg(null)
    try {
      const r = await adminRpc<{ ok: boolean; error?: string; note?: string }>('voice_command_request', { p_command: cmd })
      setCmdMsg(r.ok ? `✅ ${r.note || 'الأمر اتسجل'}` : `⚠️ ${r.error}`)
      await loadStatus()
    } catch (e) { setCmdMsg(`⚠️ ${e instanceof Error ? e.message : 'فشل'}`) }
    finally { setCmdBusy(false) }
  }, [loadStatus])

  async function load() {
    setLoading(true)
    // 📞 المكالمات بتتسجّل كـleads بمصدر voice-call / voice-campaign
    const { data } = await supabase
      .from('leads')
      .select('id, phone, source, topic, created_at')
      .in('source', ['voice-call', 'voice-campaign'])
      .order('created_at', { ascending: false })
      .limit(50)
    setCalls((data as unknown as Lead[]) || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const byTopic = calls.reduce<Record<string, number>>((a, c) => {
    const k = c.topic || 'غير محدد'; a[k] = (a[k] || 0) + 1; return a
  }, {})

  return (
    <div className="max-w-5xl mx-auto p-4" dir="rtl">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h1 className="text-lg font-black text-gray-900 flex items-center gap-2">
          <Phone className="w-5 h-5 text-[#059669]" /> معمل المكالمات
        </h1>
        <button onClick={load} className="px-3 py-2 rounded-xl bg-[#F1EEE6] text-sm font-bold flex items-center gap-1.5">
          <RefreshCw className="w-4 h-4" /> حدّث
        </button>
      </div>

      {/* 📞 (٣٠/٨) التحكم في التليفون — محمد: «تفعيل madmona-voice له مكان في اللوحة» */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h2 className="font-black text-sm text-gray-900 flex items-center gap-2">
            <Power className="w-4 h-4 text-[#059669]" /> تليفون المكالمات (madmona-voice)
          </h2>
          {vs && (
            <span className={`text-[11px] font-black px-2 py-1 rounded-full ${vs.agent_alive ? 'bg-[#34D399]/10 text-[#059669]' : 'bg-red-50 text-red-600'}`}>
              {vs.agent_alive ? '🟢 اللاب متوصل' : '🔴 اللاب مش بيرد — افتح لاب مضمونة'}
            </span>
          )}
        </div>

        {!vs ? <p className="text-xs text-gray-500">بيحمّل الحالة…</p> : (
          <>
            <div className="grid grid-cols-3 gap-2 mb-3 text-center">
              <div className={`rounded-xl px-2 py-2.5 ${vs.vm_state === 'running' ? 'bg-[#34D399]/10' : 'bg-red-50'}`}>
                <p className="text-[13px] font-black">{vs.vm_state === 'running' ? '🟢 شغالة' : `🔴 ${vs.vm_state || '؟'}`}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">الماكينة</p>
              </div>
              <div className={`rounded-xl px-2 py-2.5 ${vs.bt_connected ? 'bg-[#34D399]/10' : 'bg-red-50'}`}>
                <p className="text-[13px] font-black">{vs.bt_connected ? '🟢 متوصل' : '🔴 مفصول'}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">بلوتوث الأيتل</p>
              </div>
              <div className={`rounded-xl px-2 py-2.5 ${vs.asterisk_connected ? 'bg-[#34D399]/10' : 'bg-red-50'}`}>
                <p className="text-[13px] font-black">
                  {vs.asterisk_connected ? (vs.asterisk_state === 'Busy' ? '📞 في مكالمة' : '🟢 جاهز للمكالمات') : '🔴 مش شايف التليفون'}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">خط المكالمات</p>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button onClick={() => sendCmd('start')} disabled={cmdBusy || !vs.agent_alive}
                className="flex-1 min-w-[110px] px-3 py-2.5 rounded-xl bg-[#34D399] text-[#04352A] text-[13px] font-black disabled:opacity-40 flex items-center justify-center gap-1.5">
                <Power className="w-4 h-4" /> شغّل
              </button>
              <button onClick={() => sendCmd('restart')} disabled={cmdBusy || !vs.agent_alive}
                className="flex-1 min-w-[110px] px-3 py-2.5 rounded-xl bg-white border-2 border-[#34D399] text-[#04352A] text-[13px] font-black disabled:opacity-40 flex items-center justify-center gap-1.5">
                <RotateCcw className="w-4 h-4" /> أعد التشغيل
              </button>
              <button onClick={() => sendCmd('stop')} disabled={cmdBusy || !vs.agent_alive}
                className="flex-1 min-w-[110px] px-3 py-2.5 rounded-xl bg-white border border-gray-200 text-red-600 text-[13px] font-black disabled:opacity-40 flex items-center justify-center gap-1.5">
                <Square className="w-4 h-4" /> اقفل
              </button>
            </div>

            {cmdMsg && <p className="text-[11.5px] font-bold mt-2">{cmdMsg}</p>}
            {vs.last_command && (
              <p className="text-[10.5px] text-gray-500 mt-2">
                آخر أمر: {vs.last_command.command === 'start' ? 'تشغيل' : vs.last_command.command === 'stop' ? 'إيقاف' : 'إعادة تشغيل'}
                {' — '}{vs.last_command.status === 'done' ? 'اتنفذ ✓' : vs.last_command.status === 'failed' ? 'فشل ✗' : 'بيتنفذ…'}
              </p>
            )}
            <p className="text-[10px] text-gray-400 mt-1">
              الأمر بيتنفذ على لاب مضمونة خلال دقيقة، والحالة بتتحدث لوحدها. آخر نبضة: {vs.agent_seen_at ? new Date(vs.agent_seen_at).toLocaleTimeString('ar-EG') : '—'}
            </p>
          </>
        )}
      </div>

      {/* ✅ اللي اشتغل */}
      <div className="rounded-2xl border border-[#34D399]/40 bg-[#34D399]/5 p-4 mb-4">
        <h2 className="font-black text-sm text-[#04352A] flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-4 h-4 text-[#059669]" /> شغّال ومُثبت بمكالمات حقيقية
        </h2>
        <p className="text-xs text-gray-700 leading-relaxed">
          مكالمة تيجي على الخط ← أستريسك يرد بصوت محمد ← العميل يضغط رقم ←
          اختياره يتسجّل ويوصل للفريق. تكلفة القائمة الصوتية <b>صفر</b> والرد فوري.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-[11px]">
          {[['التعريف بمضمونة', '١'], ['استفسار', '٢'], ['مش مهتم (منع نهائي)', '٣']].map(([l, k]) => (
            <div key={k} className="rounded-xl bg-white border border-gray-200 px-2.5 py-2">
              <span className="font-black text-[#059669]">{k}</span> <span className="font-bold text-gray-700">{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ⚠️ القيود */}
      <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 mb-4">
        <h3 className="font-black text-xs text-amber-900 flex items-center gap-1.5 mb-1.5">
          <AlertTriangle className="w-3.5 h-3.5" /> قيود لازم تفضل في البال
        </h3>
        <ul className="text-[11.5px] text-amber-900 space-y-1 leading-relaxed list-disc pr-4">
          <li><b>مكالمة واحدة في اللحظة لكل شريحة</b> — ده قيد شبكة المحمول نفسها، مش النظام.</li>
          <li>كارت البلوتوث بياخد <b>تليفون واحد</b> للمكالمات — التاني محتاج دنجل.</li>
          <li>الأستريسك شغّال على <b>لاب مضمونة</b> — لو اتقفل، الخط يقف. للتشغيل الدائم محتاج جهاز مخصص أو GSM Gateway.</li>
          <li>المارد الصوتي في وضع <b>offline</b> (رد ثابت، صفر تكلفة). التشغيل الحي ≈ ١.١ ج/دقيقة ومحتاج موافقة.</li>
          <li className="text-red-700"><b>الحملات الخارجة بتحرق الخط</b> — زي اللي حصل في واتساب. اللي بيضغط ٣ بيتحط في قائمة منع دائمة.</li>
        </ul>
      </div>

      {/* المكالمات */}
      <h2 className="text-sm font-black text-gray-900 mb-2">المكالمات المسجّلة</h2>
      {Object.keys(byTopic).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {Object.entries(byTopic).map(([k, v]) => (
            <span key={k} className="text-[11px] font-bold bg-[#F1EEE6] rounded-full px-2.5 py-1">
              {k}: <b>{v}</b>
            </span>
          ))}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>
      ) : calls.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center">
          <p className="text-sm text-gray-500 font-bold">مفيش مكالمات مسجّلة لسه</p>
          <p className="text-[11px] text-gray-400 mt-1">
            المكالمات بتتسجّل تلقائيًا لما العميل يضغط رقم في القائمة الصوتية.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-xs">
            <thead className="bg-[#F5F4F0] text-gray-600">
              <tr>
                <th className="px-2.5 py-2 text-right font-bold">الرقم</th>
                <th className="px-2.5 py-2 text-right font-bold">الاختيار</th>
                <th className="px-2.5 py-2 text-right font-bold">المصدر</th>
                <th className="px-2.5 py-2 text-right font-bold">الوقت</th>
              </tr>
            </thead>
            <tbody>
              {calls.map((c) => (
                <tr key={c.id} className="border-t border-gray-100">
                  <td className="px-2.5 py-2.5 font-bold text-gray-900 tabular" dir="ltr">{c.phone || '—'}</td>
                  <td className="px-2.5 py-2.5">{c.topic || '—'}</td>
                  <td className="px-2.5 py-2.5 text-gray-500">
                    {c.source === 'voice-campaign' ? 'حملة خارجة' : 'مكالمة داخلة'}
                  </td>
                  <td className="px-2.5 py-2.5 text-gray-500 whitespace-nowrap">
                    {new Date(c.created_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
