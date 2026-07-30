'use client'

// ── أصحابي ─────────────────────────────────────────────────────
// الصداقة بتتكوّن أوتوماتيك بس لما الطرفين يضيفوا رقم بعض في «دفتر مضمونة».
// مفيش طلب ومفيش قبول — الشيت ده للعرض والفتح والشيل فقط.
// (نظام request/accept القديم اتشال 30 يوليو 2026 والجدول كان فاضي — قرار محمد.)

import { useEffect, useState, useCallback } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'

type FriendRow = { friend_id: string; friend_name: string; friend_phone: string; status: string }

export default function FriendsSheet({ onOpenDM, onClose, onOpenBook }: {
  onOpenDM: (phone: string) => void
  onClose: () => void
  onOpenBook?: () => void
}) {
  const [rows, setRows] = useState<FriendRow[]>([])
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabaseBrowser.rpc('friends_list')
    setRows(((data as unknown as FriendRow[]) || []).filter((r) => r.status === 'accepted'))
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function remove(r: FriendRow) {
    if (!confirm(`تشيل ${r.friend_name} من أصحابك؟`)) return
    const { error } = await supabaseBrowser.rpc('friend_remove', { _friend: r.friend_id })
    if (error) { setNote('مقدرتش أشيله'); setTimeout(() => setNote(''), 2800); return }
    load()
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20,35,30,.55)', zIndex: 65, display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} dir="rtl" style={{ background: '#fff', width: '100%', maxHeight: '78vh', overflowY: 'auto', borderRadius: '18px 18px 0 0', padding: 16, fontFamily: "'Cairo', system-ui, sans-serif" }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          <div style={{ fontWeight: 900, fontSize: 16, color: '#14231E', flex: 1 }}>🤝 أصحابي {rows.length ? `(${rows.length})` : ''}</div>
          {onOpenBook && (
            <button onClick={() => { onClose(); onOpenBook() }} style={{ background: 'linear-gradient(118deg,#1F6F5F,#2d7a52)', color: '#fff', border: 'none', borderRadius: 999, padding: '7px 14px', fontWeight: 800, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}>📕 دفتري</button>
          )}
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#8A9690' }}>✕</button>
        </div>
        <div style={{ fontSize: 11.5, color: '#8A9690', fontWeight: 600, marginBottom: 12, lineHeight: 1.65 }}>
          الصداقة بتتكوّن لوحدها لما الطرفين يضيفوا رقم بعض في الدفتر — مفيش طلبات ومفيش قبول.
        </div>

        {note && <div style={{ background: '#F1EEE6', borderRadius: 10, padding: '9px 12px', fontSize: 13, fontWeight: 700, color: '#14231E', marginBottom: 10 }}>{note}</div>}
        {loading && <div style={{ textAlign: 'center', color: '#8A9690', padding: 20, fontWeight: 700 }}>لحظة…</div>}

        {!loading && rows.length === 0 && (
          <div style={{ textAlign: 'center', color: '#8A9690', padding: '22px 10px', fontWeight: 600, fontSize: 13, lineHeight: 1.75 }}>
            لسه مفيش أصحاب.<br />افتح 📕 دفترك وضيف أرقام اللي تعرفهم — وأول ما حد فيهم يضيف رقمك تبقوا أصحاب أوتوماتيك.
          </div>
        )}

        {rows.map((r) => (
          <div key={r.friend_id} style={row}>
            <div style={ava}>{(r.friend_name || '؟').trim()[0]}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, color: '#14231E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.friend_name}</div>
              <div style={{ fontSize: 11, color: '#8A9690', direction: 'ltr', textAlign: 'right' }}>{r.friend_phone}</div>
            </div>
            <button onClick={() => onOpenDM(r.friend_phone)} style={{ ...pill, background: '#1F6F5F', color: '#fff' }}>💬 كلّمه</button>
            <button onClick={() => remove(r)} style={{ ...pill, background: '#F1EEE6', color: '#5A6660' }}>شيل</button>
          </div>
        ))}
      </div>
    </div>
  )
}

const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 2px', borderBottom: '1px solid #F4F1E8' }
const ava: React.CSSProperties = { width: 40, height: 40, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%,#2FA084,#1F6F5F)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 16, fontWeight: 800, flexShrink: 0 }
const pill: React.CSSProperties = { border: 'none', borderRadius: 999, padding: '6px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }
