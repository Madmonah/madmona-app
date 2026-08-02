'use client'

// ============================================================================
// NewGroupSheet — إنشاء جروب من أصحابك
//
// القاعدة (قرار محمد): المستخدم العادي بيعمل جروب من **أصحابه بس**، والأعضاء
// لازم يكونوا أصدقاء **لبعض** كمان. الجروب اللي فيه ناس متعرفش بعض =
// فريق مضمونة بس — عشان مضمونة تفضل في نص التواصل.
//
// ⚠️ القاعدة متطبّقة في الداتابيز (`chat_create_group`) مش هنا. الواجهة
//    بتعرض أصحابك بس عشان التجربة تبقى مريحة، لكن حتى لو حد اتحايل على
//    الواجهة، الداتابيز هي اللي بترفض.
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'

type Friend = { friend_id: string; friend_name: string; friend_phone: string; friend_avatar: string | null }

export default function NewGroupSheet({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (roomId: string) => void
}) {
  const [friends, setFriends] = useState<Friend[]>([])
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabaseBrowser.rpc('friends_list')
    setFriends((data as unknown as Friend[]) || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  function toggle(id: string) {
    setPicked((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  async function create() {
    setErr('')
    if (name.trim().length < 2) { setErr('اكتب اسم للجروب'); return }
    if (picked.size === 0) { setErr('اختار حد واحد على الأقل'); return }
    setBusy(true)
    try {
      const { data, error } = await supabaseBrowser.rpc('chat_create_group', {
        _name: name.trim(),
        _members: Array.from(picked),
      })
      if (error) {
        // رسالة الداتابيز نفسها مفهومة للمستخدم — بنعرضها زي ما هي
        setErr(error.message?.replace(/^.*?:\s*/, '') || 'مقدرناش نعمل الجروب')
        return
      }
      onCreated(data as unknown as string)
    } catch {
      setErr('حصلت مشكلة — جرّب تاني')
    } finally { setBusy(false) }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20,35,30,.55)', zIndex: 66, display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} dir="rtl" style={{ background: '#fff', width: '100%', maxHeight: '84vh', display: 'flex', flexDirection: 'column', borderRadius: '18px 18px 0 0', padding: 16, fontFamily: 'var(--font-cairo), system-ui, sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ fontWeight: 900, fontSize: 16, color: '#14231E', flex: 1 }}>👥 جروب جديد</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#8A9690' }}>✕</button>
        </div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="اسم الجروب"
          style={{ width: '100%', padding: '11px 13px', borderRadius: 12, border: '1px solid #EAE5D9', background: '#FAFAF7', fontSize: 15, fontWeight: 700, fontFamily: 'inherit', marginBottom: 10, outline: 'none' }}
        />

        <div style={{ fontSize: 11.5, color: '#8A9690', fontWeight: 600, marginBottom: 10, lineHeight: 1.65 }}>
          تقدر تلمّ أصحابك اللي يعرفوا بعض. لو عايز جروب فيه ناس متعرفش بعض (استفسارات مثلاً) — كلّم فريق مضمونة.
        </div>

        {err && <div style={{ background: '#FCEEEE', color: '#B4423A', borderRadius: 10, padding: '9px 12px', fontSize: 12.5, fontWeight: 700, marginBottom: 10, lineHeight: 1.6 }}>{err}</div>}

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 80 }}>
          {loading && <div style={{ textAlign: 'center', color: '#8A9690', padding: 20, fontWeight: 700 }}>لحظة…</div>}

          {!loading && friends.length === 0 && (
            <div style={{ textAlign: 'center', color: '#8A9690', padding: '22px 10px', fontWeight: 600, fontSize: 13, lineHeight: 1.75 }}>
              لسه مفيش أصحاب.<br />افتح 📕 دفترك وضيف أرقام اللي تعرفهم الأول.
            </div>
          )}

          {friends.map((f) => {
            const on = picked.has(f.friend_id)
            return (
              <button key={f.friend_id} onClick={() => toggle(f.friend_id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 4px', width: '100%', background: on ? '#F0F7F4' : 'none', border: 'none', borderBottom: '1px solid #F4F1E8', cursor: 'pointer', fontFamily: 'inherit', borderRadius: 8 }}>
                <span style={{ width: 22, height: 22, borderRadius: 6, border: on ? 'none' : '2px solid #D9D3C4', background: on ? '#1F6F5F' : 'transparent', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 900, flexShrink: 0 }}>
                  {on ? '✓' : ''}
                </span>
                {f.friend_avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.friend_avatar} alt={f.friend_name} loading="lazy" decoding="async"
                       style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%,#2FA084,#1F6F5F)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 15, fontWeight: 800, flexShrink: 0 }}>
                    {(f.friend_name || '؟').trim()[0]}
                  </span>
                )}
                <span style={{ flex: 1, minWidth: 0, textAlign: 'start' }}>
                  <span style={{ display: 'block', fontWeight: 800, color: '#14231E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.friend_name}</span>
                </span>
              </button>
            )
          })}
        </div>

        <button onClick={create} disabled={busy || picked.size === 0 || name.trim().length < 2}
          style={{ marginTop: 12, width: '100%', background: '#1F6F5F', color: '#fff', border: 'none', borderRadius: 14, padding: '13px', fontWeight: 900, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', opacity: (busy || picked.size === 0 || name.trim().length < 2) ? .5 : 1 }}>
          {busy ? 'بنعمله…' : `اعمل الجروب${picked.size ? ` (${picked.size})` : ''}`}
        </button>
      </div>
    </div>
  )
}
