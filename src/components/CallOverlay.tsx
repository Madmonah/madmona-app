'use client'

// ── مكالمات شات مضمونة (صوت/فيديو) — WebRTC mesh بإشارات Supabase Realtime ──
// بتشتغل ١:١ في الخاص وجروب صغير (لغاية ~٦). STUN جوجل المجاني.
// البروتوكول على قناة call:{roomId}: hello → offer → answer → ice → bye

import { useEffect, useRef, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { playRing } from '@/lib/ringtone'

type Props = { roomId: string; uid: string; myName: string; video: boolean; onClose: () => void }
type PeerInfo = { pc: RTCPeerConnection; name: string; stream: MediaStream | null; video: boolean }

// STUN بس — بيستخدم لو Cloudflare TURN مش متظبط. TURN بيتجاب من /api/turn وقت التشغيل.
const DEFAULT_ICE: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
]

export default function CallOverlay({ roomId, uid, myName, video, onClose }: Props) {
  const [peers, setPeers] = useState<Record<string, PeerInfo>>({})
  const [muted, setMuted] = useState(false)
  const [camOff, setCamOff] = useState(false)
  const [status, setStatus] = useState('بننده…')
  const [secs, setSecs] = useState(0)
  const localRef = useRef<MediaStream | null>(null)
  const localVidRef = useRef<HTMLVideoElement>(null)
  const chanRef = useRef<ReturnType<typeof supabaseBrowser.channel> | null>(null)
  const peersRef = useRef<Record<string, PeerInfo>>({})
  const iceRef = useRef<RTCIceServer[]>(DEFAULT_ICE)
  const ringRef = useRef<{ stop: () => void } | null>(null)

  // ringback: بيرنّ لحد ما أول طرف يتصل فعلاً، وبيقف لوحده
  useEffect(() => {
    const anyConnected = Object.values(peers).some((p) => p.stream)
    if (anyConnected) { ringRef.current?.stop(); ringRef.current = null; return }
    if (!ringRef.current) ringRef.current = playRing('ringback')
    // مهلة أمان: لو محدش رد خلال 45 ثانية نوقف الرنة
    const t = setTimeout(() => { ringRef.current?.stop(); ringRef.current = null }, 45000)
    return () => clearTimeout(t)
  }, [peers])

  useEffect(() => () => { ringRef.current?.stop(); ringRef.current = null }, [])

  useEffect(() => {
    let alive = true
    const timer = setInterval(() => setSecs((s) => s + 1), 1000)

    function syncPeers() { setPeers({ ...peersRef.current }) }

    function newPC(other: string, name: string, theirVideo: boolean): RTCPeerConnection {
      const pc = new RTCPeerConnection({ iceServers: iceRef.current })
      localRef.current?.getTracks().forEach((t) => pc.addTrack(t, localRef.current!))
      pc.ontrack = (ev) => {
        const p = peersRef.current[other]
        if (p) { p.stream = ev.streams[0] || new MediaStream([ev.track]); syncPeers() }
      }
      pc.onicecandidate = (ev) => {
        if (ev.candidate) chanRef.current?.send({ type: 'broadcast', event: 'ice', payload: { from: uid, to: other, candidate: ev.candidate } })
      }
      pc.onconnectionstatechange = () => {
        if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) dropPeer(other)
        else if (pc.connectionState === 'connected') setStatus('')
      }
      peersRef.current[other] = { pc, name, stream: null, video: theirVideo }
      syncPeers()
      return pc
    }

    function dropPeer(other: string) {
      const p = peersRef.current[other]
      if (p) { try { p.pc.close() } catch {} ; delete peersRef.current[other]; syncPeers() }
    }

    ;(async () => {
      try {
        localRef.current = await navigator.mediaDevices.getUserMedia({ audio: true, video })
      } catch { alert('مش قادر أوصل للمايك/الكاميرا — اسمح للمتصفح'); onClose(); return }
      if (!alive) { localRef.current.getTracks().forEach((t) => t.stop()); return }
      if (localVidRef.current) localVidRef.current.srcObject = localRef.current

      // TURN من Cloudflare — لازم قبل أول RTCPeerConnection، وإلا المكالمة تفشل على بيانات الموبايل (CGNAT)
      try {
        const r = await fetch('/api/turn', { cache: 'no-store' })
        const j = (await r.json()) as { iceServers?: RTCIceServer[] }
        if (Array.isArray(j?.iceServers) && j.iceServers.length) iceRef.current = j.iceServers
      } catch { /* نكمّل بـ STUN */ }
      if (!alive) { localRef.current.getTracks().forEach((t) => t.stop()); return }

      const ch = supabaseBrowser.channel(`call:${roomId}`, { config: { broadcast: { self: false } } })
      chanRef.current = ch
      ch.on('broadcast', { event: 'hello' }, async ({ payload }) => {
        const { from, name, video: v } = payload as { from: string; name: string; video: boolean }
        if (from === uid || peersRef.current[from]) return
        const pc = newPC(from, name, v)
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        ch.send({ type: 'broadcast', event: 'offer', payload: { from: uid, to: from, sdp: offer, name: myName, video } })
      })
      ch.on('broadcast', { event: 'offer' }, async ({ payload }) => {
        const { from, to, sdp, name, video: v } = payload as { from: string; to: string; sdp: RTCSessionDescriptionInit; name: string; video: boolean }
        if (to !== uid) return
        const pc = peersRef.current[from]?.pc || newPC(from, name, v)
        await pc.setRemoteDescription(sdp)
        const ans = await pc.createAnswer()
        await pc.setLocalDescription(ans)
        ch.send({ type: 'broadcast', event: 'answer', payload: { from: uid, to: from, sdp: ans } })
      })
      ch.on('broadcast', { event: 'answer' }, async ({ payload }) => {
        const { from, to, sdp } = payload as { from: string; to: string; sdp: RTCSessionDescriptionInit }
        if (to !== uid) return
        try { await peersRef.current[from]?.pc.setRemoteDescription(sdp) } catch {}
      })
      ch.on('broadcast', { event: 'ice' }, async ({ payload }) => {
        const { from, to, candidate } = payload as { from: string; to: string; candidate: RTCIceCandidateInit }
        if (to !== uid) return
        try { await peersRef.current[from]?.pc.addIceCandidate(candidate) } catch {}
      })
      ch.on('broadcast', { event: 'bye' }, ({ payload }) => dropPeer((payload as { from: string }).from))
      ch.subscribe((st) => {
        if (st === 'SUBSCRIBED') ch.send({ type: 'broadcast', event: 'hello', payload: { from: uid, name: myName, video } })
      })
    })()

    return () => {
      alive = false
      clearInterval(timer)
      try { chanRef.current?.send({ type: 'broadcast', event: 'bye', payload: { from: uid } }) } catch {}
      Object.values(peersRef.current).forEach((p) => { try { p.pc.close() } catch {} })
      peersRef.current = {}
      localRef.current?.getTracks().forEach((t) => t.stop())
      if (chanRef.current) supabaseBrowser.removeChannel(chanRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggleMute() {
    const on = !muted
    localRef.current?.getAudioTracks().forEach((t) => (t.enabled = !on))
    setMuted(on)
  }
  function toggleCam() {
    const off = !camOff
    localRef.current?.getVideoTracks().forEach((t) => (t.enabled = !off))
    setCamOff(off)
  }

  const list = Object.entries(peers)
  const mmss = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`
  const anyVideo = video || list.some(([, p]) => p.video)

  return (
    <div dir="rtl" style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'linear-gradient(160deg,#14231E,#2B4521)', color: '#fff', display: 'flex', flexDirection: 'column', fontFamily: "var(--font-cairo), system-ui, sans-serif" }}>
      <div style={{ padding: '16px 18px', textAlign: 'center' }}>
        <div style={{ fontWeight: 900, fontSize: 17 }}>{anyVideo ? '🎥 مكالمة فيديو' : '📞 مكالمة صوتية'}</div>
        <div style={{ fontSize: 12.5, color: '#8FE3C8', fontWeight: 700, marginTop: 2 }}>
          {list.length ? `${list.length + 1} في المكالمة · ${mmss}` : (status || mmss)}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'grid', gap: 10, gridTemplateColumns: list.length > 1 ? '1fr 1fr' : '1fr', alignContent: list.length ? 'stretch' : 'center' }}>
        {list.length === 0 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 96, height: 96, margin: '0 auto 12px', borderRadius: '50%', background: 'rgba(255,255,255,.12)', display: 'grid', placeItems: 'center', fontSize: 40 }}>{anyVideo ? '🎥' : '📞'}</div>
            <div style={{ fontWeight: 800, opacity: .85 }}>مستنيين حد ينضم…</div>
          </div>
        )}
        {list.map(([id, p]) => (
          <div key={id} style={{ position: 'relative', background: 'rgba(0,0,0,.3)', borderRadius: 16, overflow: 'hidden', minHeight: 140, display: 'grid', placeItems: 'center' }}>
            {p.stream && p.video ? (
              <video autoPlay playsInline ref={(el) => { if (el && el.srcObject !== p.stream) el.srcObject = p.stream }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <>
                {p.stream && <audio autoPlay ref={(el) => { if (el && el.srcObject !== p.stream) el.srcObject = p.stream }} />}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 62, height: 62, margin: '0 auto 6px', borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%,#2FA084,#2B4521)', display: 'grid', placeItems: 'center', fontSize: 24, fontWeight: 900 }}>{(p.name || '؟').trim()[0]}</div>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>{p.name}</div>
                </div>
              </>
            )}
            <div style={{ position: 'absolute', bottom: 6, insetInlineStart: 8, fontSize: 11, fontWeight: 800, background: 'rgba(0,0,0,.45)', borderRadius: 999, padding: '2px 9px' }}>{p.name}</div>
          </div>
        ))}
      </div>

      {video && (
        <video ref={localVidRef} autoPlay muted playsInline style={{ position: 'absolute', bottom: 110, insetInlineEnd: 14, width: 96, height: 128, objectFit: 'cover', borderRadius: 14, border: '2px solid rgba(255,255,255,.4)', background: '#000', display: camOff ? 'none' : 'block' }} />
      )}

      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, padding: '18px 0 30px' }}>
        <button onClick={toggleMute} style={{ ...cbtn, background: muted ? '#E26D5C' : 'rgba(255,255,255,.14)' }}>{muted ? '🔇' : '🎙️'}</button>
        {video && <button onClick={toggleCam} style={{ ...cbtn, background: camOff ? '#E26D5C' : 'rgba(255,255,255,.14)' }}>{camOff ? '🚫' : '📷'}</button>}
        <button onClick={onClose} style={{ ...cbtn, background: '#E26D5C', width: 64, height: 64, fontSize: 26 }}>📵</button>
      </div>
    </div>
  )
}

const cbtn: React.CSSProperties = { width: 54, height: 54, borderRadius: '50%', border: 'none', color: '#fff', fontSize: 21, cursor: 'pointer', display: 'grid', placeItems: 'center' }
