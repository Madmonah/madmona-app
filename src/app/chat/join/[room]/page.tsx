'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'

export default function JoinRoom() {
  const router = useRouter()
  const params = useParams()
  const [msg, setMsg] = useState('بنضيفك للمجموعة…')

  useEffect(() => {
    ;(async () => {
      const roomId = String((params as { room?: string }).room || '')
      if (!roomId) { setMsg('الدعوة مش صالحة.'); return }
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) {
        router.replace(`/auth/login?redirect=${encodeURIComponent('/chat/join/' + roomId)}`)
        return
      }
      try {
        const res = await fetch('/api/chat/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ roomId }),
        })
        const data = await res.json()
        if (data?.ok) { router.replace(`/chat/team?room=${roomId}`); return }
        setMsg(data?.error === 'room not found' ? 'الدعوة دي مش صالحة أو المجموعة اتشالت.' : 'حصلت مشكلة، جرّب تاني.')
      } catch {
        setMsg('مش قادر أضيفك دلوقتي — جرّب تاني.')
      }
    })()
  }, [params, router])

  return (
    <div dir="rtl" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'linear-gradient(160deg,#14231E,#1F6F5F)', color: '#fff', fontFamily: 'system-ui', textAlign: 'center', padding: 20 }}>
      <div>
        <div style={{ fontSize: 48, marginBottom: 10 }}>👥</div>
        <div style={{ fontSize: 16 }}>{msg}</div>
      </div>
    </div>
  )
}
