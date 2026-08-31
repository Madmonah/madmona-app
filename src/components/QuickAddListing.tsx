'use client'
// ============================================================================
// ⚡ QuickAddListing — ويزارد واحد لإضافة إعلان
//
// (٢٨ أغسطس ٢٠٢٦) محمد: «أنا عايز الإضافة خطوة واحدة، **ويزارد واحد**
//   بدل ويزارد ٥ خطوات — ده اللي أنا عايزه».
//
// 🎯 الفرق عن اللي عملته قبل كده: مش وصف حر بس — **كل الحقول ظاهرة
//    مع بعض في شاشة واحدة**: التصنيف · العنوان · السعر · المنطقة ·
//    الوصف · الصور. المورد يشوف كل المطلوب قدامه من أول لحظة
//    ويملاه بأي ترتيب، وينشر.
//
// 💡 والوصف بيتفهم تلقائيًا: لو كتب «شقة ١٦٠م في مدينة نصر بـ٣.٥
//    مليون» في خانة الوصف، السعر والمنطقة والتصنيف بيتملّوا لوحدهم —
//    فهو مش مضطر يملا كل حاجة بإيده.
// ============================================================================
import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { Camera, Loader2, Check, X, ArrowLeft, Sparkles, MapPin, Wallet, Tag } from 'lucide-react'

type Cat = { id: string; slug: string; name_ar: string; track: string }
type Parsed = {
  kind?: string; track?: string; price?: number
  area?: string; size_m2?: number; purpose?: string
}

export default function QuickAddListing() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  // 📝 الحقول — كلها في شاشة واحدة
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [price, setPrice] = useState('')
  const [area, setArea] = useState('')
  const [catSlug, setCatSlug] = useState('')
  const [files, setFiles] = useState<File[]>([])

  const [cats, setCats] = useState<Cat[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState<{ id: string; title: string } | null>(null)
  const [hint, setHint] = useState('')

  const db = supabaseBrowser as unknown as {
    from: (t: string) => { select: (c: string) => { eq: (a: string, b: unknown) => { order: (c: string) => Promise<{ data: unknown }> } } }
    rpc: (f: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
  }

  // 🗂️ التصنيفات
  useEffect(() => {
    (async () => {
      try {
        const { data } = await db.from('categories')
          .select('id, slug, name_ar, track').eq('is_active', true).order('name_ar')
        setCats(((data as Cat[]) || []).filter((c) => c.name_ar))
      } catch { /* نكمّل من غيرها */ }
    })()
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  // 💡 الفهم التلقائي — المورد يكتب وإحنا نملا الباقي
  const autofill = useCallback(async (text: string) => {
    if (text.trim().length < 12) return
    try {
      const { data } = await db.rpc('marid_parse_anything', { p_text: text })
      const p = data as Parsed
      if (!p) return
      const filled: string[] = []
      if (p.price && !price) { setPrice(String(p.price)); filled.push('السعر') }
      if (p.area && !area) { setArea(p.area); filled.push('المنطقة') }
      if (p.kind && !catSlug) {
        const want = p.kind === 'property' ? 'شقة' : p.kind === 'vehicle' ? 'سيارة'
          : p.kind === 'restaurant' ? 'مطاعم' : p.kind === 'service' ? 'خدم' : null
        if (want) {
          const c = cats.find((x) => x.name_ar.includes(want) && x.track === p.track)
            || cats.find((x) => x.name_ar.includes(want))
          if (c) { setCatSlug(c.slug); filled.push('التصنيف') }
        }
      }
      if (filled.length) setHint(`ملّينا ${filled.join(' و')} من كلامك — عدّلهم لو مش مظبوطين 👌`)
    } catch { /* الفهم تحسين مش شرط */ }
  }, [cats, price, area, catSlug])   // eslint-disable-line react-hooks/exhaustive-deps

  async function submit() {
    if (title.trim().length < 5) { setErr('اكتب اسم الحاجة اللي بتعرضها'); return }
    setErr(''); setBusy(true)
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      const phone = session?.user?.phone || session?.user?.user_metadata?.phone
      if (!phone) { setErr('محتاجين رقمك — سجّل دخول الأول'); setBusy(false); return }

      // 🧠 نبعت كل حاجة كنص واحد — نفس محرك المارد
      const full = [
        title.trim(),
        desc.trim(),
        price ? `السعر ${price} جنيه` : '',
        area ? `في ${area}` : '',
      ].filter(Boolean).join(' · ')

      const { data, error } = await db.rpc('marid_add_anything_oneshot', {
        p_phone: phone, p_text: full, p_owner_name: null,
      })
      if (error) { setErr(error.message); setBusy(false); return }

      const r = data as { ok: boolean; listing_id?: string; title?: string; needs_signup?: boolean; message?: string }
      if (!r?.ok) {
        setErr(r?.message || 'مقدرناش نسجّل الإعلان')
        setBusy(false); return
      }

      // 🏷️ التصنيف اللي اختاره يغلب اللي فهمناه
      if (catSlug && r.listing_id) {
        const c = cats.find((x) => x.slug === catSlug)
        if (c) {
          await (supabaseBrowser as unknown as {
            from: (t: string) => { update: (v: unknown) => { eq: (a: string, b: unknown) => Promise<unknown> } }
          }).from('listings').update({ category_id: c.id }).eq('id', r.listing_id)
        }
      }

      // 📸 الصور
      if (r.listing_id && files.length > 0) {
        for (const f of files.slice(0, 12)) {
          const path = `${r.listing_id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
          const { error: upErr } = await supabaseBrowser.storage
            .from('listing-photos').upload(path, f)
          if (upErr) continue
          const { data: pub } = supabaseBrowser.storage.from('listing-photos').getPublicUrl(path)
          await (supabaseBrowser as unknown as {
            from: (t: string) => { insert: (v: unknown) => Promise<unknown> }
          }).from('listing_photos').insert({
            listing_id: r.listing_id, url: pub.publicUrl, is_primary: files.indexOf(f) === 0,
          })
        }
      }

      setDone({ id: r.listing_id || '', title: r.title || title })
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'حصل خطأ')
    }
    setBusy(false)
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-[#34D399] bg-[#34D399]/8 p-6 text-center" dir="rtl">
        <div className="w-12 h-12 rounded-full bg-[#34D399] flex items-center justify-center mx-auto mb-3">
          <Check className="w-6 h-6 text-[#04352A]" strokeWidth={3} />
        </div>
        <p className="font-black text-gray-900 mb-1">اتنشر ✅</p>
        <p className="text-sm text-gray-700 mb-4">{done.title}</p>
        <div className="flex gap-2">
          <button onClick={() => {
            setDone(null); setTitle(''); setDesc(''); setPrice(''); setArea('')
            setCatSlug(''); setFiles([]); setHint('')
          }} className="flex-1 py-2.5 rounded-xl bg-[#F1EEE6] text-sm font-bold">
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

  return (
    <div dir="rtl" className="space-y-3">
      {/* 🏷️ الاسم */}
      <div>
        <label className="block text-[11.5px] font-bold text-gray-700 mb-1">
          إيه اللي بتعرضه؟ <span className="text-red-500">*</span>
        </label>
        <input
          value={title} onChange={(e) => setTitle(e.target.value)}
          onBlur={() => autofill(`${title} ${desc}`)}
          className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm"
          placeholder="شقة ١٦٠م بكمبوند وصال · عربية النترا ٢٠٢٠ · خدمة تصوير أفراح"
        />
      </div>

      {/* 💰 السعر + 📍 المنطقة */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[11.5px] font-bold text-gray-700 mb-1 flex items-center gap-1">
            <Wallet className="w-3.5 h-3.5 text-gray-400" /> السعر
          </label>
          <input
            value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ''))}
            inputMode="numeric"
            className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm tabular"
            placeholder="3500000"
          />
        </div>
        <div>
          <label className="block text-[11.5px] font-bold text-gray-700 mb-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-gray-400" /> المنطقة
          </label>
          <input
            value={area} onChange={(e) => setArea(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm"
            placeholder="مدينة نصر"
          />
        </div>
      </div>

      {/* 🗂️ التصنيف */}
      <div>
        <label className="block text-[11.5px] font-bold text-gray-700 mb-1 flex items-center gap-1">
          <Tag className="w-3.5 h-3.5 text-gray-400" /> التصنيف
        </label>
        <select
          value={catSlug} onChange={(e) => setCatSlug(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm bg-white"
        >
          <option value="">اختار (أو سيبه وإحنا نحدده)</option>
          {cats.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name_ar}</option>
          ))}
        </select>
      </div>

      {/* ✍️ التفاصيل */}
      <div>
        <label className="block text-[11.5px] font-bold text-gray-700 mb-1">التفاصيل</label>
        <textarea
          value={desc} onChange={(e) => setDesc(e.target.value)}
          onBlur={() => autofill(`${title} ${desc}`)}
          rows={4}
          className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm leading-relaxed"
          placeholder="المساحة · الدور · التشطيب · نظام السداد (مقدم ١٠٪ · تقسيط ٨ سنين) · أي حاجة تانية"
        />
      </div>

      {hint && (
        <p className="text-[11px] text-[#059669] font-bold flex items-start gap-1">
          <Sparkles className="w-3.5 h-3.5 mt-px shrink-0" /> {hint}
        </p>
      )}

      {/* 📸 الصور */}
      <input ref={fileRef} type="file" accept="image/*" multiple hidden
        onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 12))} />
      <button type="button" onClick={() => fileRef.current?.click()}
        className="w-full py-3 rounded-xl border border-dashed border-gray-300 flex items-center justify-center gap-2 text-sm font-bold text-gray-600">
        <Camera className="w-4 h-4" />
        {files.length > 0 ? `${files.length} صورة` : 'ضيف صور'}
      </button>
      {files.length > 0 && (
        <button type="button" onClick={() => setFiles([])}
          className="text-[11px] text-gray-500 flex items-center gap-1 mx-auto">
          <X className="w-3 h-3" /> امسح الصور
        </button>
      )}

      {err && <p className="text-[11.5px] text-red-600 font-bold">{err}</p>}

      <button onClick={submit} disabled={busy}
        className="w-full py-3.5 rounded-2xl bg-[#34D399] text-[#04352A] font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2">
        {busy ? (<><Loader2 className="w-4 h-4 animate-spin" /> بينشر…</>) : 'انشر الإعلان'}
      </button>
    </div>
  )
}
