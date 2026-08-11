'use client'

// ── دفتر مضمونة ────────────────────────────────────────────────
// الصداقة بتتكوّن أوتوماتيك بس لما الطرفين يكونوا ضايفين رقم بعض.
// إضافة من طرف واحد = مستنية، ومفيش إشعار للطرف التاني ومفيش صداقة.
// الويب مش بيقدر يقرا دفتر التليفون لوحده — Chrome أندرويد بيفتح منتقي
// جهات اتصال (بإذن المستخدم)، وiOS Safari مفيهوش، فالإضافة اليدوي هي الأساس.

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'

type Row = { id: string; phone_e164: string; display_name: string | null; source: string }
// 'blocked' اتضافت ٢ أغسطس ٢٠٢٦ — `chat_contacts_with_status()` بقت ترجّعها،
// ومن غيرها الشارة كانت هتطلع undefined. و`other_id` بييجي معاها عشان الـunblock.
type Status = 'friend' | 'waiting' | 'not_on_madmona' | 'blocked'
type PickItem = { phone: string; name?: string }

function pickerSupported(): boolean {
  return typeof navigator !== 'undefined' && 'contacts' in navigator
    && typeof window !== 'undefined' && 'ContactsManager' in window
}

export default function ContactBookSheet({ onClose, onOpenDM }: { onClose: () => void; onOpenDM?: (phone: string) => void }) {
  const [rows, setRows] = useState<Row[]>([])
  const [statuses, setStatuses] = useState<Record<string, Status>>({})
  const [otherIds, setOtherIds] = useState<Record<string, string | null>>({})
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const vcfRef = useRef<HTMLInputElement>(null)

  // (30 Jul 2026 - محمد: «الإضافة تبقى جماعية بتشيك مارك»)
  // اللي بيتسحب من التليفون مابقاش بيتضاف على طول - بيتعرض في شاشة
  // مراجعة بتشيك مارك، والمستخدم بيشيل اللي مش عايزه وبعدين يأكّد دفعة واحدة.
  const [picked, setPicked] = useState<PickItem[]>([])
  const [checked, setChecked] = useState<Record<number, boolean>>({})
  const [q, setQ] = useState('')

  function toast(t: string) { setNote(t); setTimeout(() => setNote(''), 3200) }

  const load = useCallback(async () => {
    setLoading(true)
    // RPC واحد بيرجع الدفتر + الحالة، وبيوحّد صيغة الرقم على الطرفين
    // (profiles.phone فيه +20 و20 و01 ونصوص تالفة — المقارنة المباشرة كانت بتفشل)
    const { data, error } = await supabaseBrowser.rpc('chat_contacts_with_status')
    if (error) { setLoading(false); setNote('مقدرتش أحمّل الدفتر'); setTimeout(() => setNote(''), 3200); return }
    const list = (data as (Row & { status: Status; other_id: string | null })[]) || []
    setRows(list)
    const st: Record<string, Status> = {}
    const ids: Record<string, string | null> = {}
    for (const r of list) { st[r.id] = r.status; ids[r.id] = r.other_id }
    setStatuses(st)
    setOtherIds(ids)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function addOne(p: string, n?: string) {
    const { error } = await supabaseBrowser.from('chat_contacts')
      .insert({ phone_e164: p, display_name: n || null, source: 'manual' } as never)
    if (error) {
      if (/duplicate|unique/i.test(error.message)) return 'dup'
      if (/رقمك/.test(error.message)) return 'self'
      if (/غير صالح/.test(error.message)) return 'bad'
      return 'err'
    }
    return 'ok'
  }

  async function addManual() {
    if (!phone.trim()) return
    setBusy(true)
    const res = await addOne(phone.trim(), name.trim() || undefined)
    setBusy(false)
    if (res === 'ok') { setPhone(''); setName(''); toast('✅ اتضاف للدفتر'); load() }
    else if (res === 'dup') toast('الرقم ده موجود في دفترك')
    else if (res === 'self') toast('ده رقمك انت 🙂')
    else if (res === 'bad') toast('الرقم مش صحيح')
    else toast('مقدرتش أضيفه')
  }

  async function importFromPhone() {
    if (!pickerSupported()) {
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      setNote(ios
        ? 'iPhone مبيسمحش للمتصفح يقرا جهات الاتصال — ضيف الرقم بإيدك من فوق 👆'
        : 'الجهاز ده مبيدعمش فتح جهات الاتصال (بيشتغل على Chrome أندرويد بس) — ضيف الرقم بإيدك 👆')
      setTimeout(() => setNote(''), 6000)
      return
    }
    try {
      const cm = (navigator as unknown as { contacts: { select: (p: string[], o: { multiple: boolean }) => Promise<Array<{ tel?: string[]; name?: string[] }>> } }).contacts
      const sel = await cm.select(['tel', 'name'], { multiple: true })
      if (!sel?.length) return
      const items = sel.flatMap((c) => {
        const nm = (c.name || []).find(Boolean)
        return (c.tel || []).filter(Boolean).map((tel) => ({ phone: tel, name: nm }))
      })
      stage(items)
    } catch { setBusy(false); setNote('اتلغى فتح جهات الاتصال'); setTimeout(() => setNote(''), 2500) }
  }

  // ── قراءة ملف vCard (.vcf) ──────────────────────────────────
  // iPhone: جهات الاتصال ← شارك جهة اتصال / أو تصدير الكل من iCloud
  // أندرويد: جهات الاتصال ← إعدادات ← تصدير إلى ملف .vcf
  // الشكل: كل جهة بين BEGIN:VCARD و END:VCARD، الاسم FN والأرقام TEL
  function parseVCard(text: string): { phone: string; name?: string }[] {
    const out: { phone: string; name?: string }[] = []
    // unfold: السطور الملتفّة في vCard بتبدأ بمسافة أو tab
    const unfolded = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '')
    const cards = unfolded.split(/BEGIN:VCARD/i).slice(1)
    for (const card of cards) {
      let name: string | undefined
      const fn = /^FN(?:;[^:\n]*)?:(.+)$/im.exec(card)
      if (fn) name = fn[1].trim()
      if (!name) {
        const n = /^N(?:;[^:\n]*)?:(.+)$/im.exec(card)
        if (n) name = n[1].split(';').filter(Boolean).reverse().join(' ').trim()
      }
      const telRe = /^TEL(?:;[^:\n]*)?:(.+)$/gim
      let m: RegExpExecArray | null
      while ((m = telRe.exec(card)) !== null) {
        const raw = m[1].trim()
        if (raw) out.push({ phone: raw, name })
      }
    }
    return out
  }

  async function onVcfFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true); setNote('بقرا الملف…')
    try {
      const text = await file.text()
      const items = parseVCard(text)
      if (items.length === 0) {
        setBusy(false); setNote('الملف مفيهوش أرقام — اتأكد إنه ملف .vcf صحيح')
        setTimeout(() => setNote(''), 5000); return
      }
      setBusy(false)
      stage(items)
    } catch {
      setBusy(false); setNote('مقدرتش أقرا الملف'); setTimeout(() => setNote(''), 3500)
    }
  }

  // ── مرحلة المراجعة ─────────────────────────────────────────
  // بنشيل التكرار جوّه نفس الدفعة (نفس الرقم بصيغ مختلفة بيتكرر كتير في
  // دفاتر التليفون) وبنبدأ بالكل متعلّم علامة - المستخدم بيشيل مش بيختار.
  function stage(items: PickItem[]) {
    const seen = new Set<string>()
    const uniq: PickItem[] = []
    for (const it of items) {
      const key = (it.phone || '').replace(/\D/g, '').slice(-10)
      if (!key || seen.has(key)) continue
      seen.add(key)
      uniq.push(it)
    }
    if (uniq.length === 0) { toast('مفيش أرقام صالحة'); return }
    const all: Record<number, boolean> = {}
    uniq.forEach((_, i) => { all[i] = true })
    setPicked(uniq); setChecked(all); setQ(''); setNote('')
  }

  async function confirmPicked() {
    const items = picked.filter((_, i) => checked[i])
    if (items.length === 0) { toast('مختارتش حد'); return }
    setBusy(true); setNote('بضيف…')
    const { data, error } = await supabaseBrowser.rpc('chat_contacts_bulk_add', { p_items: items })
    setBusy(false)
    if (error) { setNote(error.message || 'الإضافة فشلت'); setTimeout(() => setNote(''), 4000); return }
    const r = data as { added: number; duplicates: number; invalid: number; new_friends: number }
    const bits = [`✅ اتضاف ${r.added}`]
    if (r.duplicates) bits.push(`موجود قبل ${r.duplicates}`)
    if (r.invalid) bits.push(`غير صالح ${r.invalid}`)
    if (r.new_friends) bits.push(`🤝 أصحاب جداد ${r.new_friends}`)
    setPicked([]); setChecked({}); setQ('')
    setNote(bits.join(' · ')); setTimeout(() => setNote(''), 9000)
    load()
  }

  // ── رابط الدعوة: أبعته لصاحبك، يفتحه، تبقوا أصحاب فوراً ──
  // بديل الكونتكتس: بيشتغل على كل جهاز وبصفر أذونات، والنية صريحة من الطرفين.
  async function inviteFriend() {
    setBusy(true)
    const { data, error } = await supabaseBrowser.rpc('chat_invite_link')
    setBusy(false)
    if (error || !data) { setNote('مقدرتش أجيب رابط الدعوة'); setTimeout(() => setNote(''), 3000); return }
    const url = `${window.location.origin}/chat/i/${data as string}`
    const msg = `تعالى كلّمني على مضمونة 🧞\nافتح اللينك ده وهنبقى أصحاب على طول:\n${url}`
    // Web Share يفتح شيت المشاركة الأصلي (واتساب وغيره) — وإلا نفتح واتساب مباشرة
    try {
      if (navigator.share) {
        await navigator.share({ text: msg })
        return
      }
    } catch { return /* المستخدم لغى */ }
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  async function removeOne(r: Row) {
    if (!confirm(`تشيل ${r.display_name || r.phone_e164} من دفترك؟`)) return
    await supabaseBrowser.from('chat_contacts').delete().eq('id', r.id)
    load()
  }

  const badge: Record<Status, { t: string; bg: string; c: string }> = {
    friend: { t: '🤝 صاحب', bg: '#E4F3EC', c: '#2B4521' },
    waiting: { t: '⏳ مستني يضيفك', bg: '#FDF3DA', c: '#8a6d1a' },
    not_on_madmona: { t: 'مش على مضمونة', bg: '#F1EEE6', c: '#8A9690' },
    blocked: { t: '🚫 متعمله بلوك', bg: '#FCEEEE', c: '#B4423A' },
  }

  // ↩️ فك البلوك — من غير الزرار ده اللي بيعمل بلوك مش هيقدر يرجع فيه أبدًا
  async function unblock(otherId: string) {
    const { error } = await supabaseBrowser.rpc('chat_unblock', { _other: otherId })
    if (error) { setNote('مقدرتش أفك البلوك'); setTimeout(() => setNote(''), 2800); return }
    setNote('اتفك البلوك'); setTimeout(() => setNote(''), 2800)
    load()
  }

  // ── شاشة المراجعة بالتشيك مارك ──────────────────────────────
  const qq = q.trim()
  const qd = qq.replace(/\D/g, '')
  const view = picked.map((p, i) => ({ p, i })).filter(({ p }) => {
    if (!qq) return true
    if ((p.name || '').toLowerCase().includes(qq.toLowerCase())) return true
    return qd.length > 0 && p.phone.replace(/\D/g, '').includes(qd)
  })
  const nSel = picked.reduce((a, _, i) => a + (checked[i] ? 1 : 0), 0)
  const pill = { background: '#F1EEE6', color: '#2B4521', border: 'none', borderRadius: 999, padding: '6px 12px', fontSize: 11.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' } as const

  if (picked.length > 0) {
    return (
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20,35,30,.55)', zIndex: 98, display: 'flex', alignItems: 'flex-end' }}>
        <div onClick={(e) => e.stopPropagation()} dir="rtl" style={{ background: '#fff', width: '100%', height: '88vh', display: 'flex', flexDirection: 'column', borderRadius: '18px 18px 0 0', fontFamily: 'var(--font-cairo), system-ui, sans-serif' }}>

          <div style={{ padding: '14px 16px 11px', borderBottom: '1px solid #F1EEE6' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
              <div style={{ fontWeight: 900, fontSize: 15.5, color: '#14231E', flex: 1 }}>اختار مين تضيفه</div>
              <button onClick={() => { setPicked([]); setChecked({}); setQ('') }} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#8A9690' }}>✕</button>
            </div>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="دوّر بالاسم أو الرقم…"
              style={{ width: '100%', background: '#F1EEE6', border: 'none', borderRadius: 12, padding: '10px 13px', fontSize: 13, fontWeight: 600, color: '#14231E', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 9 }}>
              <button onClick={() => { const a: Record<number, boolean> = {}; picked.forEach((_, i) => { a[i] = true }); setChecked(a) }} style={pill}>اختار الكل</button>
              <button onClick={() => setChecked({})} style={pill}>ألغي الكل</button>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 12.5, fontWeight: 900, color: '#2B4521' }}>{nSel} / {picked.length}</span>
            </div>
          </div>

          {note && <div style={{ background: '#F1EEE6', margin: '10px 16px 0', borderRadius: 10, padding: '9px 12px', fontSize: 13, fontWeight: 700, color: '#14231E' }}>{note}</div>}

          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px' }}>
            {view.length === 0 && <div style={{ textAlign: 'center', color: '#8A9690', padding: 26, fontWeight: 700, fontSize: 13 }}>مفيش نتايج</div>}
            {view.map(({ p, i }) => (
              <div key={i} onClick={() => setChecked((cc) => ({ ...cc, [i]: !cc[i] }))}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 2px', borderBottom: '1px solid #F1EEE6', cursor: 'pointer' }}>
                <span style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, display: 'grid', placeItems: 'center', background: checked[i] ? 'linear-gradient(118deg,#2B4521,#5A6E3A)' : '#fff', border: checked[i] ? 'none' : '1.5px solid #D4D9D6', color: '#fff', fontSize: 13, fontWeight: 900 }}>{checked[i] ? '✓' : ''}</span>
                <span style={{ width: 34, height: 34, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%,#2FA084,#2B4521)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>{(p.name || '').trim()[0] || '؟'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: '#14231E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name || 'بدون اسم'}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#8A9690', direction: 'ltr', textAlign: 'right' }}>{p.phone}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: '11px 16px 16px', borderTop: '1px solid #F1EEE6' }}>
            <button onClick={confirmPicked} disabled={busy || nSel === 0}
              style={{ width: '100%', background: 'linear-gradient(118deg,#2B4521,#5A6E3A)', color: '#fff', border: 'none', borderRadius: 999, padding: '13px 0', fontSize: 14.5, fontWeight: 900, cursor: 'pointer', opacity: busy || nSel === 0 ? 0.5 : 1, fontFamily: 'inherit' }}>
              ➕ ضيف المختارين ({nSel})
            </button>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#8A9690', textAlign: 'center', marginTop: 8, lineHeight: 1.65 }}>
              بعد الإضافة ابعتلهم لينك الدعوة — اللي يدوس عليه تبقوا أصحاب والمحادثة تفتح لوحدها.
            </div>
          </div>

        </div>
      </div>
    )
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20,35,30,.55)', zIndex: 98, display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} dir="rtl" style={{ background: '#fff', width: '100%', maxHeight: '85vh', overflowY: 'auto', borderRadius: '18px 18px 0 0', padding: 16, fontFamily: "'Cairo', system-ui, sans-serif" }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          <div style={{ fontWeight: 900, fontSize: 16, color: '#14231E', flex: 1 }}>📕 دفتر مضمونة {rows.length ? `(${rows.length})` : ''}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#8A9690' }}>✕</button>
        </div>
        <div style={{ fontSize: 11.5, color: '#8A9690', fontWeight: 600, marginBottom: 13, lineHeight: 1.65 }}>
          أسهل طريقة: ابعت لينك لصاحبك. أو ضيف رقمه في دفترك، ولما هو كمان يضيف رقمك تبقوا أصحاب أوتوماتيك.
        </div>

        {note && <div style={{ background: '#F1EEE6', borderRadius: 10, padding: '9px 12px', fontSize: 13, fontWeight: 700, color: '#14231E', marginBottom: 10 }}>{note}</div>}

        {/* الطريق الأساسي: رابط الدعوة — بصفر أذونات وعلى كل جهاز */}
        <button onClick={inviteFriend} disabled={busy}
          style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', background: 'linear-gradient(118deg,#2B4521,#5A6E3A)', color: '#fff', border: 'none', borderRadius: 16, padding: '14px 16px', cursor: 'pointer', opacity: busy ? 0.6 : 1, fontFamily: 'inherit', textAlign: 'start', marginBottom: 8, boxShadow: '0 6px 18px -8px rgba(43, 69, 33,.5)' }}>
          <span style={{ fontSize: 24, flexShrink: 0 }}>🔗</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 14.5, fontWeight: 900 }}>ادعُ صاحبك بلينك</span>
            <span style={{ display: 'block', fontSize: 11, fontWeight: 600, opacity: 0.85, marginTop: 1 }}>ابعتهوله بأي طريقة — يفتحه وتبقوا أصحاب فوراً</span>
          </span>
        </button>

        <details style={{ marginBottom: 14 }}>
          <summary style={{ fontSize: 12, fontWeight: 800, color: '#2FA084', cursor: 'pointer', padding: '3px 0' }}>أو ضيف أرقام بنفسك</summary>
          <div style={{ paddingTop: 10 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 7 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم (اختياري)"
            style={{ flex: 1, minWidth: 0, background: '#F1EEE6', border: 'none', borderRadius: 12, padding: '10px 13px', fontSize: 13.5, fontWeight: 600, color: '#14231E', outline: 'none', fontFamily: 'inherit' }} />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addManual()} placeholder="01xxxxxxxxx" inputMode="tel"
            style={{ flex: 1, minWidth: 0, background: '#F1EEE6', border: 'none', borderRadius: 12, padding: '10px 13px', fontSize: 13.5, fontWeight: 600, color: '#14231E', outline: 'none', fontFamily: 'inherit', direction: 'ltr' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 9 }}>
          <button onClick={addManual} disabled={busy || !phone.trim()} style={{ flex: 1, background: 'linear-gradient(118deg,#2B4521,#5A6E3A)', color: '#fff', border: 'none', borderRadius: 999, padding: '10px 0', fontSize: 13.5, fontWeight: 900, cursor: 'pointer', opacity: busy || !phone.trim() ? 0.55 : 1, fontFamily: 'inherit' }}>➕ ضيف للدفتر</button>
          <button onClick={importFromPhone} disabled={busy} style={{ background: '#F1EEE6', color: '#2B4521', border: 'none', borderRadius: 999, padding: '10px 15px', fontSize: 13, fontWeight: 800, cursor: 'pointer', opacity: busy ? 0.55 : 1, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>📲 من تليفوني</button>
        </div>
        <input ref={vcfRef} type="file" accept=".vcf,text/vcard,text/x-vcard" style={{ display: 'none' }} onChange={onVcfFile} />
        <button onClick={() => vcfRef.current?.click()} disabled={busy}
          style={{ display: 'block', width: '100%', background: '#fff', border: '1.5px dashed #2FA084', color: '#2B4521', borderRadius: 12, padding: '11px 0', fontSize: 13, fontWeight: 800, cursor: 'pointer', opacity: busy ? 0.55 : 1, fontFamily: 'inherit', marginBottom: 8 }}>
          📂 استورد ملف جهات اتصال (.vcf)
        </button>
        <details style={{ marginBottom: 15 }}>
          <summary style={{ fontSize: 11.5, fontWeight: 800, color: '#2FA084', cursor: 'pointer' }}>إزاي أطلّع الملف من تليفوني؟</summary>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: '#5A6660', lineHeight: 1.8, paddingTop: 7 }}>
            <b>أندرويد:</b> جهات الاتصال ← ⋮ ← إعدادات ← تصدير ← اختار «إلى ملف .vcf»<br />
            <b>iPhone:</b> جهات الاتصال ← اختار الكل ← شارك ← احفظ في الملفات<br />
            أو من <b>iCloud.com</b> ← Contacts ← ⚙️ ← Export vCard
          </div>
        </details>
          </div>
        </details>

        {loading && <div style={{ textAlign: 'center', color: '#8A9690', padding: 20, fontWeight: 700 }}>لحظة…</div>}
        {!loading && rows.length === 0 && (
          <div style={{ textAlign: 'center', color: '#8A9690', padding: '24px 10px', fontWeight: 600, fontSize: 13, lineHeight: 1.7 }}>
            دفترك فاضي.<br />ضيف رقم صاحبك، ولما هو كمان يضيف رقمك تبقوا أصحاب أوتوماتيك.
          </div>
        )}
        {rows.map((r) => {
          const s = statuses[r.id] || 'not_on_madmona'
          const b = badge[s]
          return (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 2px', borderBottom: '1px solid #F1EEE6' }}>
              <span style={{ width: 38, height: 38, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%,#2FA084,#2B4521)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 15, fontWeight: 800, flexShrink: 0 }}>
                {(r.display_name || '؟').trim()[0]}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: '#14231E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.display_name || 'بدون اسم'}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#8A9690', direction: 'ltr', textAlign: 'right' }}>{r.phone_e164}</div>
              </div>
              <span style={{ background: b.bg, color: b.c, borderRadius: 999, padding: '4px 9px', fontSize: 10.5, fontWeight: 800, whiteSpace: 'nowrap' }}>{b.t}</span>
              {s === 'friend' && onOpenDM && (
                <button onClick={() => { onClose(); onOpenDM(r.phone_e164) }} title="افتح محادثة" style={{ background: 'none', border: 'none', fontSize: 17, cursor: 'pointer', padding: 0 }}>💬</button>
              )}
              {s === 'blocked' && otherIds[r.id] && (
                <button onClick={() => unblock(otherIds[r.id]!)} title="فك البلوك"
                  style={{ background: '#F1EEE6', color: '#5A6660', border: 'none', borderRadius: 999, padding: '5px 10px', fontSize: 11, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                  فك البلوك
                </button>
              )}
              <button onClick={() => removeOne(r)} title="شيل من الدفتر" style={{ background: 'none', border: 'none', fontSize: 15, cursor: 'pointer', color: '#E26D5C', padding: 0 }}>🗑️</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
