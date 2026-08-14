'use client'

// ============================================================================
// AvatarUpload — صورة البروفايل
//
// بتترفع على باكت `avatars` في مسار <profile_id>/… — الصلاحيات في Supabase
// بتمنع أي حد يلمس مسار حد تاني.
//
// ⚠️ الصورة بتتصغّر في المتصفح قبل الرفع (512px، jpeg) — عشان مانرفعش صور
//    10 ميجا من الموبايل ونستهلك تخزين وباندويدث على حاجة بتتعرض 40 بكسل.
//
// 🔒 الصورة بتظهر **للأصدقاء بس** — والداتابيز هي اللي بتقرر ده
//    (`chat_directory` / `friends_list`)، مش الواجهة.
// ============================================================================

import { useRef, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { Camera, Loader2, Trash2 } from 'lucide-react'

async function shrink(file: File, max = 512): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * scale)
  const h = Math.round(bmp.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h)
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('فشل التصغير'))), 'image/jpeg', 0.85)
  )
}

export default function AvatarUpload({
  currentUrl,
  name = '',
  onChange,
}: {
  currentUrl?: string | null
  name?: string
  onChange?: (url: string | null) => void
}) {
  const [url, setUrl] = useState<string | null>(currentUrl || null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function pick(file: File) {
    setErr(''); setBusy(true)
    try {
      const { data: s } = await supabaseBrowser.auth.getSession()
      const uid = s.session?.user?.id
      if (!uid) { setErr('لازم تكون داخل بحسابك'); return }

      const blob = await shrink(file)
      const path = `${uid}/avatar-${Date.now()}.jpg`

      const { error: upErr } = await supabaseBrowser.storage
        .from('avatars')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true })
      if (upErr) throw upErr

      const { data: pub } = supabaseBrowser.storage.from('avatars').getPublicUrl(path)
      const publicUrl = pub.publicUrl

      const { error: rpcErr } = await supabaseBrowser.rpc('set_my_avatar', { _url: publicUrl })
      if (rpcErr) throw rpcErr

      setUrl(publicUrl)
      onChange?.(publicUrl)
    } catch (e) {
      console.error('[avatar]', e)
      setErr('مقدرناش نرفع الصورة — جرّب صورة تانية')
    } finally {
      setBusy(false)
    }
  }

  async function clear() {
    if (!confirm('تشيل صورتك؟')) return
    setBusy(true)
    try {
      await supabaseBrowser.rpc('set_my_avatar', { _url: '' })
      setUrl(null)
      onChange?.(null)
    } catch { setErr('مقدرناش نشيلها') } finally { setBusy(false) }
  }

  const letter = (name || '؟').trim()[0] || '؟'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="صورتك" width={72} height={72} loading="lazy" decoding="async"
               style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid #fff', boxShadow: '0 2px 12px rgba(0,0,0,.12)' }} />
        ) : (
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%,#2FA084,#059669)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 28, fontWeight: 800 }}>
            {letter}
          </div>
        )}
        {busy && (
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,.45)', display: 'grid', placeItems: 'center' }}>
            <Loader2 className="w-5 h-5 animate-spin" color="#fff" />
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" disabled={busy} onClick={() => fileRef.current?.click()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#059669', color: '#fff', border: 'none', borderRadius: 999, padding: '8px 14px', fontWeight: 800, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Camera className="w-3.5 h-3.5" />
            {url ? 'غيّر الصورة' : 'ضيف صورة'}
          </button>
          {url && (
            <button type="button" disabled={busy} onClick={clear}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F1EEE6', color: '#5A6660', border: 'none', borderRadius: 999, padding: '8px 12px', fontWeight: 800, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Trash2 className="w-3.5 h-3.5" /> شيلها
            </button>
          )}
        </div>
        <p style={{ fontSize: 11, color: '#8A9690', fontWeight: 600, marginTop: 6, lineHeight: 1.6 }}>
          صورتك بتظهر لأصحابك بس — اللي مش صاحبك بيشوف أول حرف من اسمك.
        </p>
        {err && <p style={{ fontSize: 11.5, color: '#B4423A', fontWeight: 700, marginTop: 4 }}>{err}</p>}
      </div>

      <input ref={fileRef} type="file" accept="image/*" hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); e.target.value = '' }} />
    </div>
  )
}
