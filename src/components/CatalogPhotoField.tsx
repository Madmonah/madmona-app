'use client'
// 📷 حقل صورة الصنف (منتج/خدمة/خامة) — ضغط في المتصفح + رفع عبر /api/catalog/photo (بالبابين)
import { useRef, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { compressImage } from '@/lib/image-compress'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { safeStorage } from '@/lib/safe-storage'

export default function CatalogPhotoField({ supplierId, value, onChange, label = 'الصورة' }: { supplierId: string; value: string | null | undefined; onChange: (url: string) => void; label?: string }) {
  const ref = useRef<HTMLInputElement | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    setBusy(true); setErr(null)
    try {
      const img = await compressImage(f, { maxSide: 1280, quality: 0.78 })
      let bearer = ''
      try { const { data: { session } } = await supabaseBrowser.auth.getSession(); bearer = session?.access_token || '' } catch { /* */ }
      const token = safeStorage.get('madmona_token') || ''
      const r = await fetch('/api/catalog/photo', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
        body: JSON.stringify({ supplierId, token, dataBase64: img.dataBase64, mimetype: img.mimetype }),
      })
      const j = await r.json().catch(() => null)
      if (!r.ok || !j?.ok || !j.url) { setErr(j?.error || 'الصورة ماترفعتش'); return }
      onChange(j.url)
    } catch { setErr('الصورة ماترفعتش — جرّب تاني') } finally { setBusy(false) }
  }
  return (
    <div>
      <label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">{label}</label>
      <div className="flex items-center gap-3">
        <div className="w-20 h-20 rounded-xl bg-[#FAFAF7] border border-gray-200 overflow-hidden grid place-items-center">
          {value ? <img src={value} alt="" className="w-full h-full object-cover" /> : <Camera className="w-6 h-6 text-gray-300" />}
        </div>
        <div className="flex-1">
          <input ref={ref} type="file" accept="image/*" className="hidden" onChange={onFile} />
          <button type="button" onClick={() => ref.current?.click()} disabled={busy} className="px-3 py-2 rounded-xl border border-[#059669]/30 text-[#059669] text-[12px] font-black flex items-center gap-1.5 disabled:opacity-50">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />} {value ? 'غيّر الصورة' : 'ارفع صورة'}
          </button>
          <p className="text-[10px] text-[#6B7280] mt-1">بتتضغط لوحدها · بتظهر في السوق لو الصنف «في السوق»</p>
          {err && <p className="text-[11px] text-red-600 mt-1">{err}</p>}
        </div>
      </div>
    </div>
  )
}
