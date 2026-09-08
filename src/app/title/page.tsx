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
        // 🏷️ (٨/٩) عدّاد التجارب — بنبعت مصدر الزيارة (utm) والـreferrer مع الصورة، من غير ما الصورة تتخزن
        body: JSON.stringify({ imageBase64: dataUrl, mimeType: file.type || 'image/jpeg', utm: window.location.search, referer: document.referrer }),
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

            {/* 📤 تاب الشير — محمد (٧/٩/٢٠٢٦): «اعمل تاب لشير التايتل». كارت صورة بيتولّد
                على الجهاز (canvas — صفر API) + مشاركة بالـWeb Share (بالصورة لو المتصفح
                بيدعم) + واتساب + نسخ + تحميل. الرابط بيرجّع على /title بـUTM عشان الليد يتتبّع. */}
            <ShareTab job={result.job} title={result.title} />
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

// ============================================================================
// 📤 ShareTab — كارت «تايتلي على مضمونة» + أزرار المشاركة (٧/٩/٢٠٢٦)
//    الكارت بيترسم بـcanvas على جهاز المستخدم (١٠٨٠×١٣٥٠ — مقاس بوست/ستوري) ومافيش
//    أي نداء سيرفر. النص اللي بيتشير فيه الخطاف بتاع الحملة «من صورتك بقى؟ يلا بينا —
//    هنقولك تايتلك» + لينك /title بـutm_source=share عشان الزيارة تتحسب في الحملة.
// ============================================================================
const SHARE_URL = 'https://www.madmonacairo.com/title?utm_source=share&utm_medium=organic&utm_content=title'

function shareText(job: string, title: string) {
  return `تايتلي على مضمونة: ${job} · ${title} 😎\nمن صورتك بقى؟ يلا بينا — هنقولك تايتلك 👇\n${SHARE_URL}`
}

function drawCard(job: string, title: string): HTMLCanvasElement {
  const W = 1080, H = 1350
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!
  g.fillStyle = '#0C2B22'; g.fillRect(0, 0, W, H)
  g.fillStyle = '#1F6F5F'; g.beginPath(); g.arc(W - 120, 140, 260, 0, Math.PI * 2); g.fill()
  g.fillStyle = 'rgba(111,207,151,.18)'; g.beginPath(); g.arc(120, H - 160, 300, 0, Math.PI * 2); g.fill()
  g.direction = 'rtl'; g.textAlign = 'center'; g.textBaseline = 'middle'
  const font = (px: number, w = 900) => `${w} ${px}px "Cairo", "Tajawal", "Segoe UI", system-ui, sans-serif`
  g.fillStyle = '#6FCF97'; g.font = font(44, 800); g.fillText('تايتلي على مضمونة', W / 2, 300)
  g.fillStyle = '#FAFAF7'; g.font = font(120)
  fit(g, job, W - 160, 120, (f) => g.font = font(f)); g.fillText(job, W / 2, 470)
  g.fillStyle = '#6FCF97'; g.font = font(92)
  fit(g, title, W - 160, 92, (f) => g.font = font(f)); g.fillText(title, W / 2, 630)
  g.fillStyle = 'rgba(250,250,247,.85)'; g.font = font(48, 800)
  g.fillText('من صورتك بقى؟ يلا بينا —', W / 2, 860)
  g.fillText('هنقولك تايتلك 👇', W / 2, 930)
  g.fillStyle = '#FAFAF7'; g.font = font(52, 800); g.direction = 'ltr'
  g.fillText('madmonacairo.com/title', W / 2, 1140)
  g.fillStyle = '#6FCF97'; g.font = font(36, 700); g.direction = 'rtl'
  g.fillText('أي شغل مش عيب — العيب إن مالكش شغل', W / 2, 1230)
  return c
}

function fit(g: CanvasRenderingContext2D, text: string, maxW: number, start: number, setFont: (px: number) => void) {
  let px = start
  setFont(px)
  while (g.measureText(text).width > maxW && px > 36) { px -= 4; setFont(px) }
}

function ShareTab({ job, title }: { job: string; title: string }) {
  const [tab, setTab] = useState<'result' | 'share'>('result')
  const [img, setImg] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const text = shareText(job, title)

  function openShare() {
    setTab('share')
    if (!img) { try { setImg(drawCard(job, title).toDataURL('image/png')) } catch { /* الكارت اختياري */ } }
  }
  async function cardFile(): Promise<File | null> {
    try {
      const blob: Blob | null = await new Promise((res) => drawCard(job, title).toBlob(res, 'image/png'))
      return blob ? new File([blob], 'madmona-title.png', { type: 'image/png' }) : null
    } catch { return null }
  }
  async function nativeShare() {
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
    if (!nav.share) { await copy(); return }
    const f = await cardFile()
    const withFile: ShareData = f ? { files: [f], text } : { text }
    try {
      if (f && nav.canShare?.(withFile)) await nav.share(withFile)
      else await nav.share({ text, url: SHARE_URL })
    } catch { /* المستخدم قفل الشير */ }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(text); setMsg('اتنسخ — الصقه في أي مكان'); setTimeout(() => setMsg(null), 1800) } catch { setMsg('انسخ النص بإيدك من فوق') }
  }
  function download() {
    if (!img) return
    const a = document.createElement('a'); a.href = img; a.download = 'madmona-title.png'; a.click()
  }

  return (
    <div className="mt-6">
      <div className="flex rounded-xl bg-[#FAFAF7] p-1 text-sm font-extrabold">
        <button type="button" onClick={() => setTab('result')}
          className={`flex-1 rounded-lg px-3 py-2 ${tab === 'result' ? 'bg-white shadow text-[#0A0A0A]' : 'text-[#7C8481]'}`}>النتيجة</button>
        <button type="button" onClick={openShare}
          className={`flex-1 rounded-lg px-3 py-2 ${tab === 'share' ? 'bg-white shadow text-[#0A0A0A]' : 'text-[#7C8481]'}`}>📤 شير تايتلك</button>
      </div>

      {tab === 'share' && (
        <div className="mt-4">
          {img && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt="كارت تايتلك" className="w-full rounded-2xl border border-[#DFE3E0]" />
          )}
          <p className="mt-3 whitespace-pre-line rounded-xl bg-[#FAFAF7] px-4 py-3 text-sm leading-relaxed text-[#0A0A0A]">{text}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-extrabold">
            <button type="button" onClick={nativeShare}
              className="col-span-2 rounded-xl bg-[#1F6F5F] px-4 py-3 text-[#FAFAF7]">📲 شير (إنستجرام · تيك توك · ستوري…)</button>
            <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer"
              className="rounded-xl bg-[#25D366] px-4 py-3 text-center text-white">واتساب</a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SHARE_URL)}&quote=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer"
              className="rounded-xl bg-[#1877F2] px-4 py-3 text-center text-white">فيسبوك</a>
            <button type="button" onClick={copy} className="rounded-xl border border-[#DFE3E0] bg-white px-4 py-3">نسخ النص</button>
            <button type="button" onClick={download} disabled={!img} className="rounded-xl border border-[#DFE3E0] bg-white px-4 py-3 disabled:opacity-50">تحميل الكارت</button>
          </div>
          {msg && <p className="mt-2 text-center text-xs font-bold text-[#1F6F5F]">{msg}</p>}
        </div>
      )}
    </div>
  )
}
