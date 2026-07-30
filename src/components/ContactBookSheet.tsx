'use client'

// ── دفتر مضمونة ────────────────────────────────────────────────
// الصداقة بتتكوّن أوتوماتيك بس لما الطرفين يكونوا ضايفين رقم بعض.
// إضافة من طرف واحد = مستنية، ومفيش إشعار للطرف التاني ومفيش صداقة.
// الويب مش بيقدر يقرا دفتر التليفون لوحده — Chrome أندرويد بيفتح منتقي
// جهات اتصال (بإذن المستخدم)، وiOS Safari مفيهوش، فالإضافة اليدوي هي الأساس.

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'

type Row = { id: string; phone_e164: string; display_name: string | null; source: string }
type Status = 'friend' | 'waiting' | 'not_on_madmona'

function pickerSupported(): boolean {
  return typeof navigator !== 'undefined' && 'contacts' in navigator
    && typeof window !== 'undefined' && 'ContactsManager' in window
}

export default function ContactBookSheet({ onClose, onOpenDM }: { onClose: () => void; onOpenDM?: (phone: string) => void }) {
  const [rows, setRows] = useState<Row[]>([])
  const [statuses, setStatuses] = useState<Record<string, Status>>({})
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const vcfRef = useRef<HTMLInputElement>(null)

  function toast(t: string) { setNote(t); setTimeout(() => setNote(''), 3200) }

  const load = useCallback(async () => {
    setLoading(true)
    // RPC واحد بيرجع الدفتر + الحالة، وبيوحّد صيغة الرقم على الطرفين
    // (profiles.phone فيه +20 و20 و01 ونصوص تالفة — المقارنة المباشرة كانت بتفشل)
    const { data, error } = await supabaseBrowser.rpc('chat_contacts_with_status')
    if (error) { setLoading(false); setNote('مقدرتش أحمّل الدفتر'); setTimeout(() => setNote(''), 3200); return }
    const list = (data as (Row & { status: Status })[]) || []
    setRows(list)
    const st: Record<string, Status> = {}
    for (const r of list) st[r.id] = r.status
    setStatuses(st)
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
      setBusy(true); setNote('بستورد…')
      const items = sel.flatMap((c) => {
        const nm = (c.name || []).find(Boolean)
        return (c.tel || []).filter(Boolean).map((tel) => ({ phone: tel, name: nm }))
      })
      const { data, error } = await supabaseBrowser.rpc('chat_contacts_bulk_add', { p_items: items })
      setBusy(false)
      if (error) { setNote(error.message || 'الاستيراد فشل'); setTimeout(() => setNote(''), 4000); return }
      const r = data as { added: number; duplicates: number; invalid: number; new_friends: number }
      const bits = [`✅ اتضاف ${r.added}`]
      if (r.duplicates) bits.push(`موجود قبل ${r.duplicates}`)
      if (r.invalid) bits.push(`غير صالح ${r.invalid}`)
      if (r.new_friends) bits.push(`🤝 أصحاب جداد ${r.new_friends}`)
      setNote(bits.join(' · ')); setTimeout(() => setNote(''), 8000)
      load()
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
      const { data, error } = await supabaseBrowser.rpc('chat_contacts_bulk_add', { p_items: items })
      setBusy(false)
      if (error) { setNote(error.message || 'الاستيراد فشل'); setTimeout(() => setNote(''), 4000); return }
      const r = data as { added: number; duplicates: number; invalid: number; new_friends: number }
      const bits = [`✅ اتضاف ${r.added}`]
      if (r.duplicates) bits.push(`موجود قبل ${r.duplicates}`)
      if (r.invalid) bits.push(`غير صالح ${r.invalid}`)
      if (r.new_friends) bits.push(`🤝 أصحاب جداد ${r.new_friends}`)
      setNote(bits.join(' · '))
      setTimeout(() => setNote(''), 8000)
      load()
    } catch {
      setBusy(false); setNote('مقدرتش أقرا الملف'); setTimeout(() => setNote(''), 3500)
    }
  }

  async function removeOne(r: Row) {
    if (!confirm(`تشيل ${r.display_name || r.phone_e164} من دفترك؟`)) return
    await supabaseBrowser.from('chat_contacts').delete().eq('id', r.id)
    load()
  }

  const badge: Record<Status, { t: string; bg: string; c: string }> = {
    friend: { t: '🤝 صاحب', bg: '#E4F3EC', c: '#1F6F5F' },
    waiting: { t: '⏳ مستني يضيفك', bg: '#FDF3DA', c: '#8a6d1a' },
    not_on_madmona: { t: 'مش على مضمونة', bg: '#F1EEE6', c: '#8A9690' },
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20,35,30,.55)', zIndex: 98, display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} dir="rtl" style={{ background: '#fff', width: '100%', maxHeight: '85vh', overflowY: 'auto', borderRadius: '18px 18px 0 0', padding: 16, fontFamily: "'Cairo', system-ui, sans-serif" }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          <div style={{ fontWeight: 900, fontSize: 16, color: '#14231E', flex: 1 }}>📕 دفتر مضمونة {rows.length ? `(${rows.length})` : ''}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#8A9690' }}>✕</button>
        </div>
        <div style={{ fontSize: 11.5, color: '#8A9690', fontWeight: 600, marginBottom: 13, lineHeight: 1.65 }}>
          الصداقة بتتكوّن أوتوماتيك لما الطرفين يكونوا ضايفين رقم بعض — مفيش زرار قبول، ومحدش بيعرف إنك ضايفه لحد ما يضيفك.
        </div>

        {note && <div style={{ background: '#F1EEE6', borderRadius: 10, padding: '9px 12px', fontSize: 13, fontWeight: 700, color: '#14231E', marginBottom: 10 }}>{note}</div>}

        <div style={{ display: 'flex', gap: 6, marginBottom: 7 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم (اختياري)"
            style={{ flex: 1, minWidth: 0, background: '#F1EEE6', border: 'none', borderRadius: 12, padding: '10px 13px', fontSize: 13.5, fontWeight: 600, color: '#14231E', outline: 'none', fontFamily: 'inherit' }} />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addManual()} placeholder="01xxxxxxxxx" inputMode="tel"
            style={{ flex: 1, minWidth: 0, background: '#F1EEE6', border: 'none', borderRadius: 12, padding: '10px 13px', fontSize: 13.5, fontWeight: 600, color: '#14231E', outline: 'none', fontFamily: 'inherit', direction: 'ltr' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 9 }}>
          <button onClick={addManual} disabled={busy || !phone.trim()} style={{ flex: 1, background: 'linear-gradient(118deg,#1F6F5F,#2d7a52)', color: '#fff', border: 'none', borderRadius: 999, padding: '10px 0', fontSize: 13.5, fontWeight: 900, cursor: 'pointer', opacity: busy || !phone.trim() ? 0.55 : 1, fontFamily: 'inherit' }}>➕ ضيف للدفتر</button>
          <button onClick={importFromPhone} disabled={busy} style={{ background: '#F1EEE6', color: '#1F6F5F', border: 'none', borderRadius: 999, padding: '10px 15px', fontSize: 13, fontWeight: 800, cursor: 'pointer', opacity: busy ? 0.55 : 1, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>📲 من تليفوني</button>
        </div>
        <input ref={vcfRef} type="file" accept=".vcf,text/vcard,text/x-vcard" style={{ display: 'none' }} onChange={onVcfFile} />
        <button onClick={() => vcfRef.current?.click()} disabled={busy}
          style={{ display: 'block', width: '100%', background: '#fff', border: '1.5px dashed #2FA084', color: '#1F6F5F', borderRadius: 12, padding: '11px 0', fontSize: 13, fontWeight: 800, cursor: 'pointer', opacity: busy ? 0.55 : 1, fontFamily: 'inherit', marginBottom: 8 }}>
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
              <span style={{ width: 38, height: 38, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%,#2FA084,#1F6F5F)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 15, fontWeight: 800, flexShrink: 0 }}>
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
              <button onClick={() => removeOne(r)} title="شيل من الدفتر" style={{ background: 'none', border: 'none', fontSize: 15, cursor: 'pointer', color: '#E26D5C', padding: 0 }}>🗑️</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
