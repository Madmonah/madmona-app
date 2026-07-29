'use client'

// ── الأصدقاء — شرط الصداقة: رقم كل طرف متسجّل عند التاني ────────────────
// الطلب: تختار صاحبك من جهات اتصالك (إثبات إنك حافظ رقمه) → friend_request
// القبول: الطرف التاني لازم يختار رقمك من جهات اتصاله والسيرفر يطابقه → friend_accept

import { useEffect, useState, useCallback } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'

type FriendRow = { friend_id: string; friend_name: string; friend_phone: string; status: string; direction: string; request_id: string }
type Picked = { phone: string; name?: string }

function contactsSupported(): boolean {
  return typeof navigator !== 'undefined' && 'contacts' in navigator && typeof window !== 'undefined' && 'ContactsManager' in window
}
async function pickPhone(promptMsg: string): Promise<Picked | null> {
  if (contactsSupported()) {
    try {
      const cm = (navigator as unknown as { contacts: { select: (p: string[], o: { multiple: boolean }) => Promise<Array<{ tel?: string[]; name?: string[] }>> } }).contacts
      const sel = await cm.select(['tel', 'name'], { multiple: false })
      if (!sel?.length) return null
      const tel = (sel[0].tel || []).find(Boolean) || ''
      if (!tel) { alert('الكونتاكت ده مالوش رقم 📵'); return null }
      return { phone: tel, name: (sel[0].name || []).find(Boolean) || '' }
    } catch { /* fallback يدوي */ }
  }
  const raw = prompt(promptMsg)?.trim()
  return raw ? { phone: raw } : null
}

export default function FriendsSheet({ onOpenDM, onClose }: { onOpenDM: (phone: string) => void; onClose: () => void }) {
  const [rows, setRows] = useState<FriendRow[]>([])
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabaseBrowser.rpc('friends_list')
    setRows((data as FriendRow[]) || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  function toast(t: string) { setNote(t); setTimeout(() => setNote(''), 3500) }

  async function addFriend() {
    const p = await pickPhone('رقم موبايل صاحبك (لازم يكون حافظك ومسجّل على مضمونة):')
    if (!p) return
    const { data, error } = await supabaseBrowser.rpc('friend_request', { _phone: p.phone })
    const d = data as { ok?: boolean; status?: string; error?: string } | null
    if (error || !d?.ok) {
      if (d?.error === 'self') toast('ده رقمك انت 🙂')
      else if (d?.error === 'no_account') toast(`${p.name || 'الشخص ده'} لسه مش على مضمونة`)
      else toast('مقدرتش أبعت الطلب')
      return
    }
    toast(d.status === 'accepted' ? '🎉 بقيتوا أصحاب!' : '✅ اتبعت طلب الصداقة')
    load()
  }

  // القبول: لازم يختار رقم الطالب من جهات اتصاله — السيرفر يتأكد إنه نفس الرقم
  async function accept(r: FriendRow) {
    const p = await pickPhone(`علشان تقبل، اختار رقم «${r.friend_name}» من جهات اتصالك (لازم تكون حافظه):`)
    if (!p) return
    const { data, error } = await supabaseBrowser.rpc('friend_accept', { _request: r.request_id, _phone: p.phone })
    const d = data as { ok?: boolean; error?: string } | null
    if (error || !d?.ok) {
      toast(d?.error === 'phone_mismatch' ? '❌ الرقم اللي اخترته مش رقمه — لازم تكون حافظ رقمه بالظبط' : 'مقدرتش أقبل الطلب')
      return
    }
    toast(`🎉 بقيت صاحب ${r.friend_name}`)
    load()
  }

  async function decline(r: FriendRow) {
    await supabaseBrowser.rpc('friend_decline', { _request: r.request_id })
    load()
  }
  async function remove(r: FriendRow) {
    if (!confirm(`تشيل ${r.friend_name} من أصحابك؟`)) return
    await supabaseBrowser.rpc('friend_remove', { _friend: r.friend_id })
    load()
  }

  const friends = rows.filter((r) => r.status === 'accepted')
  const incoming = rows.filter((r) => r.status === 'pending' && r.direction === 'in')
  const outgoing = rows.filter((r) => r.status === 'pending' && r.direction === 'out')

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 65, display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} dir="rtl" style={{ background: '#fff', width: '100%', maxHeight: '78vh', overflowY: 'auto', borderRadius: '18px 18px 0 0', padding: 16, fontFamily: "'Cairo', system-ui, sans-serif" }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ fontWeight: 900, fontSize: 16, color: '#14231E', flex: 1 }}>🤝 أصحابي {friends.length ? `(${friends.length})` : ''}</div>
          <button onClick={addFriend} style={{ background: 'linear-gradient(135deg,#1F6F5F,#2FA084)', color: '#fff', border: 'none', borderRadius: 999, padding: '7px 14px', fontWeight: 800, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}>➕ Invite صاحب</button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>✕</button>
        </div>
        <div style={{ fontSize: 11.5, color: '#8A9690', fontWeight: 600, marginBottom: 12, lineHeight: 1.6 }}>
          شرط الصداقة: رقم كل واحد فيكم يكون متسجّل عند التاني — بنتأكد من ده بجهات الاتصال.
        </div>
        {note && <div style={{ background: '#F1EEE6', borderRadius: 10, padding: '9px 12px', fontSize: 13, fontWeight: 700, color: '#14231E', marginBottom: 10 }}>{note}</div>}
        {loading && <div style={{ textAlign: 'center', color: '#888', padding: 20 }}>لحظة…</div>}

        {!loading && incoming.length > 0 && (
          <>
            <div style={secHdr}>📥 طلبات جايالك ({incoming.length})</div>
            {incoming.map((r) => (
              <div key={r.request_id} style={row}>
                <div style={ava}>{(r.friend_name || '؟').trim()[0]}</div>
                <div style={{ flex: 1, minWidth: 0, fontWeight: 800, color: '#14231E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.friend_name}</div>
                <button onClick={() => accept(r)} style={{ ...pill, background: '#2FA084', color: '#fff' }}>اقبل</button>
                <button onClick={() => decline(r)} style={{ ...pill, background: '#fdecea', color: '#c0392b' }}>ارفض</button>
              </div>
            ))}
          </>
        )}

        {!loading && (
          <>
            <div style={secHdr}>🤝 أصحابك</div>
            {friends.length === 0 && <div style={{ color: '#8A9690', fontSize: 13, fontWeight: 600, padding: '4px 2px 10px' }}>لسه مفيش أصحاب — اكبس «Invite صاحب» فوق 👆</div>}
            {friends.map((r) => (
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
          </>
        )}

        {!loading && outgoing.length > 0 && (
          <>
            <div style={secHdr}>📤 طلبات باعتها ({outgoing.length})</div>
            {outgoing.map((r) => (
              <div key={r.request_id} style={row}>
                <div style={ava}>{(r.friend_name || '؟').trim()[0]}</div>
                <div style={{ flex: 1, fontWeight: 700, color: '#5A6660', fontSize: 13 }}>{r.friend_name} — مستني يقبل</div>
                <button onClick={() => decline(r)} style={{ ...pill, background: '#F1EEE6', color: '#5A6660' }}>إلغاء</button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

const secHdr: React.CSSProperties = { fontSize: 11.5, fontWeight: 900, color: '#1F6F5F', margin: '10px 0 6px' }
const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 2px', borderBottom: '1px solid #F4F1E8' }
const ava: React.CSSProperties = { width: 40, height: 40, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%,#2FA084,#1F6F5F)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 16, fontWeight: 800, flexShrink: 0 }
const pill: React.CSSProperties = { border: 'none', borderRadius: 999, padding: '6px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }
