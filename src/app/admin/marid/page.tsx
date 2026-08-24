// app/admin/marid/page.tsx
// =====================================================================
// 🧞 غرفة تحكم المارد — إحصائيات، إشعارات (ليدز سخنة)، رفع ليدز Excel،
// تشغيل فوري وتقرير يومي. تحدث تلقائي كل 30 ثانية.
// =====================================================================

'use client'

import { useEffect, useRef, useState } from 'react'

type Notif = {
  id: string
  kind: string
  title: string
  body: string | null
  phone: string | null
  seen: boolean
  created_at: string
}

// 🔌 (٢٤ أغسطس ٢٠٢٦) مفاتيح أدوات المارد.
//    محمد: «المارد مش نافع إنه يضيف إعلانات ويستدعي أدوات — الإضافة تكون
//    عن طريق صاحب الإعلان». الأداة بتتقفل من هنا مش بحذفها من الكود،
//    فالرجوع = ضغطة زرار. شوف `src/lib/marid-tool-settings.ts`.
type MaridTool = {
  tool_name: string
  label_ar: string | null
  enabled: boolean
  note_ar: string | null
  blocked_7d: number
}

type Stats = {
  pool: Record<string, number>
  sectors: Record<string, number>
  sent_24h: number
  drafts_chased_total: number
  notifications: Notif[]
  templates: Record<string, { name: string; status: string }>
}

const SECTORS = [
  { value: 'restaurants', label: '🍔 مطاعم' },
  { value: 'furniture-home', label: '🛋️ أثاث منزلي' },
  { value: 'furniture-office', label: '🪑 أثاث مكتبي' },
  { value: 'general', label: '📦 موردين عام' },
]

const KIND_STYLE: Record<string, string> = {
  hot_lead: 'border-red-300 bg-red-50',
  daily_report: 'border-emerald-200 bg-emerald-50',
  send_failure: 'border-amber-300 bg-amber-50',
  draft_chase: 'border-sky-200 bg-sky-50',
  info: 'border-gray-200 bg-white',
}

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'الآن'
  if (mins < 60) return `من ${mins} د`
  const h = Math.round(mins / 60)
  if (h < 24) return `من ${h} س`
  return `من ${Math.round(h / 24)} يوم`
}

export default function MaridAdminPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [uploadMsg, setUploadMsg] = useState('')
  const [sector, setSector] = useState('restaurants')
  const [tools, setTools] = useState<MaridTool[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [draftNote, setDraftNote] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function loadTools() {
    try {
      const r = await fetch('/api/admin/marid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list_tools' }),
      })
      const d = await r.json()
      if (Array.isArray(d?.tools)) setTools(d.tools as MaridTool[])
    } catch { /* الكارت بيفضل بآخر نسخة */ }
  }

  async function setTool(tool: string, patch: { enabled?: boolean; note?: string }) {
    // تحديث متفائل عشان الزرار يحس فوري — وبنعيد التحميل بعدها من المصدر
    setTools(ts => ts.map(t => (t.tool_name === tool ? { ...t, ...patch, note_ar: patch.note ?? t.note_ar } as MaridTool : t)))
    try {
      const r = await fetch('/api/admin/marid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_tool', tool, ...patch }),
      })
      const d = await r.json()
      if (d?.error) alert(`❌ ${d.error}`)
    } catch { alert('حصلت مشكلة — جرب تاني') }
    await loadTools()
  }

  async function load() {
    try {
      const r = await fetch('/api/admin/marid', { cache: 'no-store' })
      const d = await r.json()
      if (!d.error) setStats(d)
    } catch { /* retry next tick */ }
    setLoading(false)
  }

  useEffect(() => {
    load()
    loadTools()
    const t = setInterval(load, 30_000)
    return () => clearInterval(t)
  }, [])

  async function act(action: string) {
    setBusy(action)
    try {
      const r = await fetch('/api/admin/marid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const d = await r.json()
      if (action === 'run_now') {
        const res = d?.result || {}
        alert(`🧞 المارد اشتغل:\nرسايل جديدة: ${res.fresh_sent ?? 0}\nمتابعات: ${res.followup_sent ?? 0}\nمطاردة مسودات: ${res.draft_chased ?? 0}`)
      }
      await load()
    } catch { alert('حصلت مشكلة — جرب تاني') }
    setBusy('')
  }

  async function onFile(f: File) {
    setUploadMsg('⏳ بقرا الشيت...')
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
      const norm = (s: string) => s.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/\s+/g, '').toLowerCase()
      const pick = (row: Record<string, unknown>, keys: string[]) => {
        for (const k of Object.keys(row)) {
          if (keys.includes(norm(k))) return String(row[k] ?? '').trim()
        }
        return ''
      }
      const leads = rows.map(r => ({
        name: pick(r, ['الاسم', 'اسم', 'name', 'الاسمالتجاري', 'اسمالمحل', 'اسمالمطعم']),
        phone: pick(r, ['التليفون', 'تليفون', 'رقم', 'الرقم', 'موبايل', 'واتساب', 'phone', 'mobile', 'whatsapp']),
        area: pick(r, ['المنطقه', 'منطقه', 'العنوان', 'area', 'district', 'city', 'المدينه']),
        sector: pick(r, ['القطاع', 'قطاع', 'sector', 'النوع']) || undefined,
      })).filter(l => l.phone)
      if (leads.length === 0) { setUploadMsg('❌ مفيش أرقام في الشيت — لازم عمود «التليفون»'); return }
      setUploadMsg(`⏳ برفع ${leads.length} ليد...`)
      const r = await fetch('/api/admin/marid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upload_leads', sector, leads }),
      })
      const d = await r.json()
      if (d.error) setUploadMsg(`❌ ${d.error}`)
      else setUploadMsg(`✅ اتضاف ${d.created} ليد جديد · مكرر: ${d.skipped_duplicate} · رقم غلط: ${d.skipped_invalid} — المارد هيبدأ يراسلهم في أقرب تشغيلة`)
      await load()
    } catch (e) {
      setUploadMsg('❌ معرفتش أقرا الملف — اتأكد إنه Excel (.xlsx)')
      console.error(e)
    }
  }

  function downloadTemplate() {
    const csv = '﻿الاسم,التليفون,المنطقة,القطاع\nمطعم النور,01012345678,مدينة نصر,restaurants\nمعرض الأثاث الحديث,01098765432,المهندسين,furniture-home\n'
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    a.download = 'marid-leads-template.csv'
    a.click()
  }

  const pool = stats?.pool || {}
  const hotNotifs = (stats?.notifications || []).filter(n => n.kind === 'hot_lead' && !n.seen)

  return (
    <div dir="rtl" className="min-h-screen bg-[#FAFAF7] p-4 md:p-8" style={{ fontFamily: 'Cairo, sans-serif' }}>
      <div className="max-w-5xl mx-auto space-y-6">

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#059669]">🧞 غرفة تحكم المارد</h1>
            <p className="text-sm text-gray-500">وكيل الاستقطاب — يجيب ليدز، يراسل، يتابع، ويطارد المسودات لوحده</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => act('run_now')} disabled={!!busy}
              className="px-4 py-2 rounded-xl bg-[#34D399] text-[#04352A] text-sm font-bold hover:bg-[#2FA084] disabled:opacity-50">
              {busy === 'run_now' ? '⏳ شغال...' : '▶️ شغّل المارد دلوقتي'}
            </button>
            <button onClick={() => act('send_report')} disabled={!!busy}
              className="px-4 py-2 rounded-xl border border-[#059669] text-[#059669] text-sm font-bold hover:bg-emerald-50 disabled:opacity-50">
              {busy === 'send_report' ? '⏳...' : '📊 ابعت التقرير'}
            </button>
          </div>
        </div>

        {hotNotifs.length > 0 && (
          <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-4">
            <div className="font-bold text-red-700 mb-2">🔥 ليدز سخنة مستنية رد ({hotNotifs.length})</div>
            {hotNotifs.slice(0, 5).map(n => (
              <div key={n.id} className="text-sm text-red-800 mb-1">• {n.title} — {n.body?.split('\n')[0]}</div>
            ))}
            <a href="/admin/wa-review" className="inline-block mt-2 text-sm font-bold text-red-700 underline">افتح المحادثات ←</a>
          </div>
        )}

        {/* stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: '📦 ليدز مستنية', value: pool['new'] ?? 0 },
            { label: '📤 اتراسلوا', value: pool['contacted'] ?? 0 },
            { label: '💬 ردوا', value: pool['replied'] ?? 0 },
            { label: '📨 رسايل آخر 24س', value: stats?.sent_24h ?? 0 },
          ].map(c => (
            <div key={c.label} className="rounded-2xl bg-white border border-gray-200 p-4 text-center">
              <div className="text-2xl font-black text-[#059669]">{loading ? '…' : c.value}</div>
              <div className="text-xs text-gray-500 mt-1">{c.label}</div>
            </div>
          ))}
        </div>

        {/* template gates */}
        <div className="rounded-2xl bg-white border border-gray-200 p-4">
          <div className="font-bold text-gray-800 mb-3">🚦 بوابات التمبلتات (ميتا)</div>
          <div className="grid md:grid-cols-3 gap-2 text-sm">
            {stats && Object.entries(stats.templates).map(([k, t]) => (
              <div key={k} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                <span className="text-gray-600">{k === 'restaurants' ? '🍔 دعوة المطاعم' : k === 'supplier' ? '📦 دعوة الموردين' : '🪄 تكملة التسجيل'}</span>
                <span className={`font-bold text-xs px-2 py-0.5 rounded-full ${t.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : t.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                  {t.status === 'APPROVED' ? 'معتمد ✓' : t.status === 'REJECTED' ? 'مرفوض' : 'قيد المراجعة'}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">المارد بيفحص الحالة أوتوماتيكياً كل تشغيلة — أول ما تمبلت يتعمد الإرسال بتاعه يبدأ لوحده.</p>
        </div>

        {/* 🔌 مفاتيح الأدوات */}
        <div className="rounded-2xl bg-white border border-gray-200 p-4">
          <div className="font-bold text-gray-800 mb-1">🔌 أدوات المارد — إيه اللي مسموح يعمله</div>
          <p className="text-xs text-gray-500 mb-3">
            الأداة المقفولة مابتوصلش للمارد أصلاً، وبنحقن مكانها التعليمة اللي تحتها.
            التغيير بيبان خلال دقيقة على الأكتر.
          </p>
          <div className="space-y-1.5">
            {tools.length === 0 && <p className="text-sm text-gray-400">…</p>}
            {tools.map(t => (
              <div key={t.tool_name} className={`rounded-xl border px-3 py-2 ${t.enabled ? 'border-gray-100 bg-gray-50' : 'border-amber-300 bg-amber-50'}`}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-gray-800">{t.label_ar || t.tool_name}</div>
                    <div className="text-[11px] text-gray-400 font-mono">{t.tool_name}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!t.enabled && t.blocked_7d > 0 && (
                      <span className="text-[11px] text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
                        حاول ينادّيها {t.blocked_7d} مرة آخر ٧ أيام
                      </span>
                    )}
                    {!t.enabled && (
                      <button
                        onClick={() => { setEditing(editing === t.tool_name ? null : t.tool_name); setDraftNote(t.note_ar || '') }}
                        className="text-xs text-[#059669] underline">
                        {editing === t.tool_name ? 'إخفاء' : 'التعليمة البديلة'}
                      </button>
                    )}
                    <button
                      onClick={() => setTool(t.tool_name, { enabled: !t.enabled })}
                      className={`px-3 py-1 rounded-full text-xs font-bold ${t.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {t.enabled ? 'شغّالة ✓' : 'مقفولة ⛔'}
                    </button>
                  </div>
                </div>
                {editing === t.tool_name && (
                  <div className="mt-2">
                    <textarea
                      value={draftNote}
                      onChange={e => setDraftNote(e.target.value)}
                      rows={7}
                      className="w-full rounded-xl border border-gray-300 p-2 text-xs font-mono leading-5"
                      placeholder="اكتب للمارد يعمل إيه بدل الأداة دي…" />
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={async () => { await setTool(t.tool_name, { note: draftNote }); setEditing(null) }}
                        className="px-3 py-1 rounded-xl bg-[#34D399] text-[#04352A] text-xs font-bold">
                        احفظ التعليمة
                      </button>
                      <span className="text-[11px] text-gray-400">دي بتتبعت للمارد في آخر البرومبت — فبتكسب على أي تعليمة قديمة.</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Excel upload */}
        <div className="rounded-2xl bg-white border-2 border-dashed border-[#2FA084] p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="font-bold text-gray-800">📥 إدي المارد شيت ليدز</div>
              <p className="text-sm text-gray-500 mt-1">أعمدة: الاسم · التليفون · المنطقة · القطاع (اختياري) — وهو يتولى الدعوة والمتابعة</p>
            </div>
            <div className="flex items-center gap-2">
              <select value={sector} onChange={e => setSector(e.target.value)}
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm bg-white">
                {SECTORS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <button onClick={() => fileRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-[#d4a017] text-white text-sm font-bold hover:opacity-90">
                📤 ارفع Excel
              </button>
              <button onClick={downloadTemplate} className="text-xs text-[#059669] underline">نموذج فاضي</button>
            </div>
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
          {uploadMsg && <div className="mt-3 text-sm font-medium text-gray-700">{uploadMsg}</div>}
        </div>

        {/* notifications feed */}
        <div className="rounded-2xl bg-white border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-bold text-gray-800">🔔 إشعارات المارد</div>
            <button onClick={() => act('mark_seen')} className="text-xs text-gray-500 underline">عَلّم الكل كمقروء</button>
          </div>
          {(stats?.notifications || []).length === 0 && (
            <p className="text-sm text-gray-400">لسه مفيش إشعارات — أول ما حد يرد هتلاقي التنبيه هنا وعلى واتسابك.</p>
          )}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {(stats?.notifications || []).map(n => (
              <div key={n.id} className={`rounded-xl border p-3 ${KIND_STYLE[n.kind] || KIND_STYLE.info} ${n.seen ? 'opacity-60' : ''}`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-gray-800">{n.title}</span>
                  <span className="text-xs text-gray-400">{timeAgo(n.created_at)}</span>
                </div>
                {n.body && <div className="text-xs text-gray-600 mt-1 whitespace-pre-line">{n.body.slice(0, 300)}</div>}
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400">
          المارد بيشتغل أوتوماتيكياً 9ص و5م (رسايل) و8م (تقرير) بتوقيت القاهرة · الردود بتتحول للأوتو-ريسبوندر وبوت التسجيل
        </p>
      </div>
    </div>
  )
}
