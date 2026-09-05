// ============================================================================
// 🏷️ /title — «إيه تايتلك على مضمونة؟»
//
// (٥/٩/٢٠٢٦) محمد: «عايز الناس ترفع الصورة واحنا نقوله شغله إيه ونشغّل
//    الموديل بتاعنا... وفي الآخر رسالة: أي شغل مش عيب — العيب إن مالكش شغل».
//
// الصفحة دي هي وجهة الحملة (الريلز بتقول «جرّب إنت» وبتوديه هنا).
// التحليل في /api/title-scan على جيميناي المجاني — صفر رصيد أنثروبيك.
//
// 💬 الرسالة الختامية جملة محمد نصًا — هي محور الصفحة مش زينة فيها.
// ============================================================================
'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'

type Result = {
  title: string
  job: string
  reason: string
  confident: boolean
  system: string[]
}

export default function TitlePage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)

  async function onPick(file: File) {
    setErr(null); setResult(null)

    const dataUrl: string = await new Promise((res, rej) => {
      const r = new FileReader()
      r.onload = () => res(String(r.result))
      r.onerror = () => rej(new Error('مش قادرين نقرا الصورة'))
      r.readAsDataURL(file)
    })
    setPreview(dataUrl)
    setBusy(true)

    try {
      const r = await fetch('/api/title-scan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ imageBase64: dataUrl, mimeType: file.type || 'image/jpeg' }),
      })
      const j = await r.json()
      if (!j.ok) throw new Error(j.error || 'مش قادرين نحلل الصورة')
      setResult(j as Result)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'حصل خطأ')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#FAFAF7] text-[#0A0A0A]">
      <div className="mx-auto max-w-lg px-5 py-10">

        <h1 className="text-4xl font-black leading-tight tracking-tight">
          إيه <span className="text-[#1F6F5F]">تايتلك</span> على مضمونة؟
        </h1>
        <p className="mt-3 text-[#5B6360] leading-relaxed">
          ارفع صورة من شغلك — المطبخ، الورشة، المحل، المعرض — وإحنا نقولك نوع
          البيزنس والتايتل والسيستم اللي هتشتغل بيه.
        </p>

        {/* الرفع */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f) }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="mt-7 w-full rounded-2xl bg-[#1F6F5F] px-6 py-5 text-lg font-extrabold
                     text-[#FAFAF7] shadow-lg transition active:scale-[.99]
                     disabled:opacity-60"
        >
          {busy ? 'بنحلّل الصورة…' : preview ? 'جرّب صورة تانية' : '📷 ارفع صورة من شغلك'}
        </button>

        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="الصورة اللي رفعتها"
            className="mt-6 w-full rounded-2xl border border-[#DFE3E0] object-cover"
            style={{ maxHeight: 340 }}
          />
        )}

        {err && (
          <p className="mt-5 rounded-xl border border-[#E3C6AA] bg-[#FBF0E8] px-4 py-3
                        text-[#8A4A22]">
            {err}
          </p>
        )}

        {/* النتيجة */}
        {result && (
          <section className="mt-7 rounded-2xl border border-[#DFE3E0] bg-white p-6 shadow-sm">
            <p className="text-xs font-bold tracking-widest text-[#7C8481]">المهنة</p>
            <p className="mt-1 text-4xl font-black">{result.job}</p>

            <p className="mt-5 text-xs font-bold tracking-widest text-[#7C8481]">النشاط على مضمونة</p>
            <p className="mt-1 text-4xl font-black text-[#1F6F5F]">{result.title}</p>
            {result.reason && (
              <p className="mt-1 text-sm leading-relaxed text-[#5B6360]">{result.reason}</p>
            )}

            <p className="mt-6 text-xs font-bold tracking-widest text-[#7C8481]">
              والسيستم اللي بتاخده
            </p>
            <ul className="mt-2 space-y-2">
              {result.system.map((s) => (
                <li key={s} className="flex items-center gap-3 rounded-xl bg-[#FAFAF7] px-4 py-3
                                       text-[15px] font-bold">
                  <span className="grid h-6 w-6 place-items-center rounded-full
                                   bg-[rgba(47,160,132,.14)] text-sm text-[#2FA084]">✓</span>
                  {s}
                </li>
              ))}
            </ul>

            <Link
              href="/add-listing"
              className="mt-6 block rounded-2xl bg-[#1F6F5F] px-6 py-4 text-center text-lg
                         font-extrabold text-[#FAFAF7]"
            >
              تعالى نحوّل شغلك أونلاين ←
            </Link>
          </section>
        )}

        {/* 💬 الرسالة — جملة محمد */}
        <section className="mt-12 rounded-2xl bg-[#1F6F5F] px-6 py-8 text-center">
          <p className="text-2xl font-black leading-snug text-[#FAFAF7]">
            أي شغل مش عيب.
          </p>
          <p className="mt-2 text-2xl font-black leading-snug text-[#6FCF97]">
            العيب إن مالكش شغل.
          </p>
        </section>

        <p className="mt-6 text-center text-xs leading-relaxed text-[#7C8481]">
          الصورة بتتحلّل وقت الرفع بس ومابتتخزنش عندنا.
        </p>
      </div>
    </main>
  )
}
