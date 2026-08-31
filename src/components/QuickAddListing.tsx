'use client'
// ============================================================================
// ⚡ QuickAddListing — إضافة إعلان في خطوة واحدة
//
// (٢٨ أغسطس ٢٠٢٦) محمد: «خليت الإضافة خطوة واحدة ولا لسه؟»
//
// 🔍 الإجابة كانت **نص الشغل**: المارد على واتساب بقى خطوة واحدة
//    (add_listing_oneshot)، بس **شاشة الموقع لسه ٥ خطوات**:
//    الطريقة → البيانات → السعر → الصور → التواصل.
//
// ⚡ ده المسار السريع: المورد بيكتب وصف حر + يرفع صور، والنظام
//    بيفهم النوع والتصنيف والمنطقة والسعر بنفس محرك المارد
//    (marid_add_anything_oneshot).
//
// 🛟 والويزارد الطويل **لسه موجود** لمن يحتاجه — ده مسار إضافي
//    مش بديل، عشان مانكسرش شغل شغّال.
// ============================================================================
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { Sparkles, Camera, Loader2, Check, X, ArrowLeft } from 'lucide-react'

type Result = {
  ok: boolean
  needs_signup?: boolean
  listing_id?: string
  title?: string
  kind?: string
  missing?: string[]
  message?: string
}

export default function QuickAddListing({ phone }: { phone?: string }) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [err, setErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const db = supabaseBrowser as unknown as {
    rpc: (f: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
  }

  async function submit() {
    if (text.trim().length < 12) {
      setErr('اكتب وصف الحاجة في سطر أو اتنين — النوع والمنطقة والسعر')
      return
    }
    setErr(''); setBusy(true)
    try {
      // 📞 الرقم: من الجلسة أو اللي اتمرّر
      let p = phone
      if (!p) {
        const { data: { session } } = await supabaseBrowser.auth.getSession()
        p = session?.user?.phone || session?.user?.user_metadata?.phone
      }
      if (!p) { setErr('محتاجين رقمك — سجّل دخول الأول'); setBusy(false); return }

      const { data, error } = await db.rpc('marid_add_anything_oneshot', {
        p_phone: p, p_text: text.trim(), p_owner_name: null,
      })
      if (error) { setErr(error.message); setBusy(false); return }

      const r = data as Result
      setResult(r)

      // 📸 الصور بعد ما الإعلان يتسجّل
      if (r.ok && r.listing_id && files.length > 0) {
        for (const f of files.slice(0, 12)) {
          const path = `${r.listing_id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
          const { error: upErr } = await supabaseBrowser.storage
            .from('listing-photos').upload(path, f, { upsert: false })
          if (upErr) continue
          const { data: pub } = supabaseBrowser.storage.from('listing-photos').getPublicUrl(path)
          await (supabaseBrowser as unknown as {
            from: (t: string) => { insert: (v: unknown) => Promise<unknown> }
          }).from('listing_photos').insert({
            listing_id: r.listing_id, url: pub.publicUrl, is_primary: files.indexOf(f) === 0,
          })
        }
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'حصل خطأ')
    }
    setBusy(false)
  }

  // ✅ اتسجّل
  if (result?.ok) {
    const missing = result.missing || []
    return (
      <div className="rounded-2xl border border-[#34D399] bg-[#34D399]/8 p-5 text-center" dir="rtl">
        <div className="w-12 h-12 rounded-full bg-[#34D399] flex items-center justify-center mx-auto mb-3">
          <Check className="w-6 h-6 text-[#04352A]" strokeWidth={3} />
        </div>
        <p className="font-black text-gray-900 mb-1">اتسجّل ✅</p>
        <p className="text-sm text-gray-700 mb-1">{result.title}</p>
        {files.length > 0 && (
          <p className="text-[11.5px] text-[#059669] font-bold mb-2">
            و{files.length} صورة اترفعت 📸
          </p>
        )}
        {missing.length > 0 && (
          <p className="text-[11.5px] text-amber-700 font-bold mb-3">
            ناقص بس {missing.join(' و')} — تقدر تكمّلهم من صفحة الإعلان.
          </p>
        )}
        <div className="flex gap-2 mt-3">
          <button onClick={() => { setResult(null); setText(''); setFiles([]) }}
            className="flex-1 py-2.5 rounded-xl bg-[#F1EEE6] text-sm font-bold">
            ضيف حاجة تانية
          </button>
          <button onClick={() => router.push('/account')}
            className="flex-1 py-2.5 rounded-xl bg-[#34D399] text-[#04352A] text-sm font-black flex items-center justify-center gap-1">
            إعلاناتي <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  // 👤 محتاج حساب
  if (result?.needs_signup) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-center" dir="rtl">
        <p className="font-black text-gray-900 mb-2">فهمت الإعلان 👌</p>
        <p className="text-sm text-gray-700 mb-3">{result.message}</p>
        <button onClick={() => router.push('/supplier/register')}
          className="w-full py-3 rounded-xl bg-[#34D399] text-[#04352A] font-black text-sm">
          جهّز حسابي
        </button>
      </div>
    )
  }

  return (
    <div dir="rtl">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-[#d4a017]" />
        <p className="text-sm font-black text-gray-900">اكتب وخلاص — إحنا نفهم الباقي</p>
      </div>
      <p className="text-[11.5px] text-gray-500 mb-3 leading-relaxed">
        مثال: «شقة ١٦٠م في مدينة نصر للبيع بـ٣.٥ مليون · مقدم ١٠٪ · تقسيط ٨ سنين»
        <br />
        أو «عربية النترا ٢٠٢٠ بـ٨٥٠ ألف» أو «بقدم خدمة تصوير أفراح بـ٥٠٠٠»
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm leading-relaxed"
        placeholder="اكتب اللي عايز تعرضه…"
      />

      {/* 📸 الصور */}
      <input ref={fileRef} type="file" accept="image/*" multiple hidden
        onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 12))} />

      <button type="button" onClick={() => fileRef.current?.click()}
        className="w-full mt-2 py-3 rounded-2xl border border-dashed border-gray-300 flex items-center justify-center gap-2 text-sm font-bold text-gray-600">
        <Camera className="w-4 h-4" />
        {files.length > 0 ? `${files.length} صورة اتاختارت` : 'ضيف صور (اختياري)'}
      </button>

      {files.length > 0 && (
        <button type="button" onClick={() => setFiles([])}
          className="mt-1.5 text-[11px] text-gray-500 flex items-center gap-1 mx-auto">
          <X className="w-3 h-3" /> امسح الصور
        </button>
      )}

      {err && (
        <p className="mt-2 text-[11.5px] text-red-600 font-bold">{err}</p>
      )}

      <button onClick={submit} disabled={busy}
        className="w-full mt-3 py-3.5 rounded-2xl bg-[#34D399] text-[#04352A] font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2">
        {busy ? (<><Loader2 className="w-4 h-4 animate-spin" /> بيتسجّل…</>) : 'انشر الإعلان'}
      </button>

      <p className="text-[10.5px] text-gray-400 text-center mt-2">
        هنجهّز الإعلان ونقولك لو ناقص حاجة — مش هنسألك أسئلة كتير.
      </p>
    </div>
  )
}
