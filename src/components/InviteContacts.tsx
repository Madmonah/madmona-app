'use client'

// ── ادعُ أصحابك على مضمونة ───────────────────────────────────────────────
// بيفتح جهات اتصال الموبايل (Web Contacts Picker API — كروم أندرويد) وبيجهّز
// دعوة واتساب لكل رقم. مهم: الدعوة بتخرج من واتساب المستخدم نفسه (wa.me)،
// مش من رقم المارد — عشان مانزوّدش إشارات سبام على الرقم (الرقم متحفّظ أصلًا).
// للأجهزة اللي مابتدعمش الـPicker (ديسكتوب/آيفون): بنستخدم مشاركة النظام أو النسخ.

import { useState } from 'react'

const INVITE_LINK = 'https://www.madmonacairo.com'
const INVITE_TEXT =
  'تعالَ على مضمونة 🧞 — معاملاتك مضمونة: تأجير · بيع · خدمات · مطاعم · بيوتي. سجّل من هنا:'

type Picked = { name: string; tel: string }

// تطبيع الرقم المصري لصيغة واتساب الدولية (من غير +)
function waNumber(raw: string): string | null {
  let n = (raw || '').replace(/[^\d]/g, '')
  if (!n) return null
  if (n.startsWith('00')) n = n.slice(2) // 00 بادئة دولية
  if (n.startsWith('0')) n = '20' + n.slice(1) // 01xxxxxxxxx → 201xxxxxxxxx
  else if (n.length === 10 && n.startsWith('1')) n = '20' + n // 1xxxxxxxxx → 201xxxxxxxxx
  return n.length >= 10 ? n : null // أقصر من كده مش رقم صالح
}

function waHref(tel?: string): string {
  const text = encodeURIComponent(`${INVITE_TEXT} ${INVITE_LINK}`)
  const n = tel ? waNumber(tel) : null
  return n ? `https://wa.me/${n}?text=${text}` : `https://wa.me/?text=${text}`
}

export default function InviteContacts() {
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<Picked[]>([])
  const [note, setNote] = useState('')

  const supportsContacts =
    typeof navigator !== 'undefined' &&
    'contacts' in navigator &&
    // @ts-expect-error — Contacts Picker API لسه مش في تعريفات TS القياسية
    typeof navigator.contacts?.select === 'function'
  const supportsShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  async function pickContacts() {
    setNote('')
    try {
      // @ts-expect-error — Contacts Picker API خارج تعريفات TS
      const results = await navigator.contacts.select(['name', 'tel'], { multiple: true })
      const list: Picked[] = []
      for (const c of results || []) {
        const tel = Array.isArray(c.tel) ? c.tel[0] : c.tel
        const nm = Array.isArray(c.name) ? c.name[0] : c.name
        if (tel) list.push({ name: (nm || 'صاحبك').toString().trim() || 'صاحبك', tel: String(tel) })
      }
      if (!list.length) {
        setNote('مااخترتش أي رقم.')
        return
      }
      setPicked(list)
    } catch {
      // المستخدم رفض أو المتصفح مادعمش — نوجّهه للمشاركة
      setNote('مقدرناش نفتح جهات الاتصال. جرّب «شارك الدعوة» تحت 👇')
    }
  }

  async function shareInvite() {
    setNote('')
    const full = `${INVITE_TEXT} ${INVITE_LINK}`
    try {
      if (supportsShare) {
        await navigator.share({ title: 'مضمونة', text: INVITE_TEXT, url: INVITE_LINK })
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(full)
        setNote('اتنسخت الدعوة ✅ — الصقها لأي حد على واتساب.')
      } else {
        setNote('انسخ الرابط: ' + INVITE_LINK)
      }
    } catch {
      /* المستخدم قفل المشاركة — عادي */
    }
  }

  function reset() {
    setOpen(false)
    setPicked([])
    setNote('')
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="ادعُ أصحابك على مضمونة"
        title="ادعُ أصحابك"
        style={{
          background: 'rgba(255,255,255,.15)', color: '#fff', border: 'none',
          borderRadius: 20, padding: '5px 12px', fontSize: 14, fontWeight: 700,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
        }}
      >
        <span style={{ fontSize: 16 }}>👥</span> ادعُ
      </button>

      {open && (
        <div
          onClick={reset}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 60,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
            style={{
              background: '#fff', width: '100%', maxWidth: 480, borderRadius: '18px 18px 0 0',
              padding: '18px 18px 26px', maxHeight: '80vh', overflowY: 'auto',
              fontFamily: 'system-ui, sans-serif', boxShadow: '0 -6px 24px rgba(0,0,0,.18)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 22 }}>🧞</span>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#075E54', flex: 1 }}>ادعُ أصحابك على مضمونة</div>
              <button onClick={reset} aria-label="اقفل" style={{ background: 'none', border: 'none', fontSize: 22, color: '#999', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ fontSize: 13, color: '#667', marginBottom: 16, lineHeight: 1.6 }}>
              اختار من جهات اتصالك، والدعوة هتتبعت من واتسابك إنت — بضغطة واحدة لكل حد.
            </div>

            {supportsContacts ? (
              <button
                onClick={pickContacts}
                style={{
                  width: '100%', background: '#075E54', color: '#fff', border: 'none',
                  borderRadius: 12, padding: '13px', fontSize: 15, fontWeight: 800, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                📇 افتح جهات الاتصال
              </button>
            ) : (
              <div style={{ background: '#fff7e6', border: '1px solid #ffe1a8', borderRadius: 12, padding: '11px 13px', fontSize: 12.5, color: '#92400e', lineHeight: 1.6 }}>
                فتح جهات الاتصال بيشتغل على موبايل أندرويد (كروم). من الديسكتوب أو الآيفون، استخدم «شارك الدعوة» تحت.
              </div>
            )}

            <button
              onClick={shareInvite}
              style={{
                width: '100%', marginTop: 10, background: '#25D366', color: '#053b32', border: 'none',
                borderRadius: 12, padding: '13px', fontSize: 15, fontWeight: 800, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              🔗 شارك الدعوة
            </button>

            {note && (
              <div style={{ marginTop: 12, fontSize: 13, color: '#334', background: '#f3f6f5', borderRadius: 10, padding: '10px 12px' }}>{note}</div>
            )}

            {picked.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#075E54', marginBottom: 8 }}>
                  {picked.length} جهة اتصال — اكبس «ادعُ» جنب كل حد
                </div>
                {picked.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 4px', borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#e7f4f0', color: '#075E54', display: 'grid', placeItems: 'center', fontSize: 16, fontWeight: 800, flexShrink: 0 }}>
                      {p.name.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: '#111', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: '#8a8a8a', direction: 'ltr', textAlign: 'right' }}>{p.tel}</div>
                    </div>
                    <a
                      href={waHref(p.tel)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ background: '#25D366', color: '#fff', textDecoration: 'none', borderRadius: 18, padding: '7px 15px', fontSize: 13, fontWeight: 800, flexShrink: 0 }}
                    >
                      ادعُ
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
