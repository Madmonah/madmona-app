'use client'

// src/components/projects/MediaUploader.tsx
// حقل رفع واحد (صورة / PDF / فيديو) — بيضغط في المتصفح وبيرفع مباشرة لـStorage.
import { useRef, useState } from 'react'
import { Upload, CheckCircle2, X, Loader2 } from 'lucide-react'
import { prepareAndUpload, type Kind } from '@/lib/mediaCompress'
import { ACCEPTED_MIME } from '@/lib/projects'

export default function MediaUploader({
  kind,
  label,
  hint,
  slug,
  value,
  onChange,
}: {
  kind: Kind
  label: string
  hint?: string
  slug: string
  value: string | null
  onChange: (url: string | null) => void
}) {
  const [busy, setBusy] = useState(false)
  const [pct, setPct] = useState(0)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function pick(file: File) {
    setErr('')
    setBusy(true)
    setPct(0)
    try {
      const res = await prepareAndUpload(file, kind, slug, (p, m) => {
        setPct(p)
        setMsg(m)
      })
      onChange(res.url)
      setMsg(`تم ✅ (${(res.size / (1024 * 1024)).toFixed(1)} ميجا)`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'فشل الرفع')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border border-gray-200 rounded-xl p-3 bg-white">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-sm font-semibold text-gray-800">{label}</span>
        {value && !busy && (
          <button
            type="button"
            onClick={() => { onChange(null); setMsg(''); setPct(0) }}
            className="text-xs text-red-600 inline-flex items-center gap-1 hover:underline"
          >
            <X className="w-3 h-3" /> شيله
          </button>
        )}
      </div>
      {hint && <p className="text-[11px] text-gray-500 mb-2">{hint}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_MIME[kind].join(',')}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void pick(f)
          e.target.value = ''
        }}
      />

      {value ? (
        <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <a href={value} target="_blank" rel="noopener" className="truncate hover:underline">
            {msg || 'اترفع'}
          </a>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-gray-300 text-sm text-gray-600 hover:border-[#2FA084] hover:text-[#2FA084] disabled:opacity-60 transition-colors"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {busy ? msg || 'شغّال…' : 'اختار ملف'}
        </button>
      )}

      {busy && (
        <div className="mt-2 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#2FA084] transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {err && <p className="text-xs text-red-600 mt-2 leading-relaxed">{err}</p>}
    </div>
  )
}
