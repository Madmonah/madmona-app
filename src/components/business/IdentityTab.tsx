'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  Loader2, Check, X, Plus, Upload, ImageOff, Palette, ExternalLink, AlertCircle,
} from 'lucide-react'

/* ============================================================================
   IdentityTab — هوية البيزنس، من الشاشة مش من الداتابيز
   ============================================================================
   🎯 (٢١ أغسطس ٢٠٢٦) محمد: «خليني أقدر أعدّل الكلام ده ديناميك، ومن هنا
      ورايح اللي تقدر تخليه ديناميك خليه ديناميك».

   «الكلام ده» = اللوجو والغلاف والوصف ومعرض الصور والألوان — دي كلها كنت
   بعدّلها بالإيد في SQL لكل بيزنس. دلوقتي بقت شاشة.

   ⚠️ الحفظ بيعدّي على `business_identity_save` مش على `supabase.from(...)`:
      البوليسي الوحيدة للـauthenticated على جدول `suppliers` هي
      `suppliers_admin_only` — يعني **صاحب البيزنس نفسه ماكانش يقدر يحفظ**،
      والحفظ كان بيعدّي في صمت من غير ما يتغيّر صف. الدالة SECURITY DEFINER
      وبتسمح لأدمن المنصة وموظفين مضمونة وصاحب البيزنس.

   🖼️ «صور بيزنسك» = صور إعلاناته نفسها. أغلب اللوجوهات والأغلفة موجودة
      أصلًا جوّه صور المنتجات، فبدل ما يرفع تاني بيختار بدوسة.
   ============================================================================ */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

type GalleryItem = { url: string; caption: string }
type Identity = {
  ok: boolean; error?: string
  business_name: string; slug: string | null; place: string | null
  logo_url: string | null; cover_url: string | null; description_ar: string | null
  gallery: GalleryItem[]; theme: Record<string, string> | null
  generated_logo: string; own_photos: string[]
}

const SWATCHES = [
  { c: '#059669', n: 'أخضر مضمونة' },
  { c: '#0E6BA8', n: 'أزرق بحري' },
  { c: '#B4503C', n: 'طوبي' },
  { c: '#7C3AED', n: 'بنفسجي' },
  { c: '#D4A017', n: 'ذهبي' },
  { c: '#0F766E', n: 'بترولي' },
  { c: '#B91C1C', n: 'أحمر' },
  { c: '#1F2937', n: 'رمادي غامق' },
]

const INPUT = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#059669]'

export default function IdentityTab({ supplierId }: { supplierId: string }) {
  const [d, setD] = useState<Identity | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const [logo, setLogo] = useState('')
  const [cover, setCover] = useState('')
  const [descr, setDescr] = useState('')
  const [gallery, setGallery] = useState<GalleryItem[]>([])
  const [themeOn, setThemeOn] = useState(false)
  const [accent, setAccent] = useState('#059669')
  const [picker, setPicker] = useState<null | 'logo' | 'cover' | 'gallery'>(null)
  const [uploading, setUploading] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await (supabase.rpc as unknown as (
      f: string, a: Record<string, unknown>,
    ) => Promise<{ data: Identity | null }>)('business_identity_get', { p_supplier_id: supplierId })
    if (data?.ok) {
      setD(data)
      setLogo(data.logo_url || '')
      setCover(data.cover_url || '')
      setDescr(data.description_ar || '')
      setGallery(Array.isArray(data.gallery) ? data.gallery : [])
      setThemeOn(!!data.theme)
      setAccent(data.theme?.accent || '#059669')
    } else {
      setMsg({ ok: false, text: data?.error === 'forbidden' ? 'مالكش صلاحية تعدّل هوية البيزنس ده' : 'مقدرناش نحمّل' })
    }
    setLoading(false)
  }, [supplierId])

  useEffect(() => { load() }, [load])

  async function upload(file: File, target: 'logo' | 'cover' | 'gallery') {
    setUploading(target); setMsg(null)
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `identity/${supplierId}/${target}-${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('listing-photos')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (error) throw error
      const { data } = supabase.storage.from('listing-photos').getPublicUrl(path)
      if (target === 'logo') setLogo(data.publicUrl)
      else if (target === 'cover') setCover(data.publicUrl)
      else setGallery(g => [...g, { url: data.publicUrl, caption: '' }])
    } catch {
      setMsg({ ok: false, text: 'مقدرناش نرفع الصورة — جرّب تاني' })
    }
    setUploading(null)
  }

  async function save() {
    setSaving(true); setMsg(null)
    const { data } = await (supabase.rpc as unknown as (
      f: string, a: Record<string, unknown>,
    ) => Promise<{ data: { ok: boolean; error?: string } | null }>)('business_identity_save', {
      p_supplier_id: supplierId,
      p_logo_url: logo || null,
      p_cover_url: cover || null,
      p_description: descr || null,
      p_gallery: gallery,
      p_accent: accent,
      p_theme_on: themeOn,
    })
    setSaving(false)
    if (data?.ok) { setMsg({ ok: true, text: 'اتحفظ ✅' }); load() }
    else setMsg({ ok: false, text: data?.error || 'الحفظ فشل' })
  }

  function pick(url: string) {
    if (picker === 'logo') setLogo(url)
    else if (picker === 'cover') setCover(url)
    else if (picker === 'gallery') setGallery(g => [...g, { url, caption: '' }])
    setPicker(null)
  }

  if (loading) {
    return <div className="bg-white rounded-2xl border border-gray-100 p-10 flex justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-[#059669]" />
    </div>
  }
  if (!d) {
    return <div className="bg-white rounded-2xl border border-gray-100 p-6 text-sm text-red-700 flex items-center gap-2">
      <AlertCircle className="w-4 h-4" /> {msg?.text || 'مقدرناش نحمّل'}
    </div>
  }

  return (
    <div className="space-y-4">
      {/* 👁️ معاينة حيّة — نفس ترتيب صفحة العميل */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 pt-4 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs font-black text-gray-500 tracking-widest uppercase">معاينة</p>
          {d.slug && (
            <a href={`/s/${d.slug}`} target="_blank" rel="noreferrer"
              className="text-xs font-bold text-[#059669] inline-flex items-center gap-1 no-underline">
              افتح صفحتك <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
        <div className="relative h-40 mt-3" style={{
          backgroundImage: cover ? `url(${cover})`
            : `linear-gradient(135deg, ${accent}, ${accent}99)`,
          backgroundSize: 'cover', backgroundPosition: 'center',
        }}>
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(180deg,rgba(8,16,14,.2) 0%,rgba(8,16,14,.82) 100%)',
          }} />
          <div className="absolute inset-x-0 bottom-0 p-4 text-white">
            {logo
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={logo} alt="" className="w-14 h-14 rounded-2xl object-contain bg-white/15 ring-1 ring-white/25 mb-2" />
              : <div className="w-14 h-14 rounded-2xl bg-white/15 ring-1 ring-white/25 mb-2 grid place-items-center">
                  <ImageOff className="w-5 h-5 text-white/70" />
                </div>}
            <p className="font-black text-lg leading-tight">{d.business_name}</p>
            {d.place && <p className="text-[12px] text-white/80">{d.place}</p>}
            {descr && <p className="text-[12px] text-white/75 mt-1.5 leading-relaxed line-clamp-2">{descr}</p>}
          </div>
        </div>
        {gallery.length > 0 && (
          <div className="flex gap-2 overflow-x-auto p-4">
            {gallery.map((g, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={g.url} alt={g.caption}
                className="w-24 h-16 object-cover rounded-xl flex-shrink-0 ring-1 ring-black/5" />
            ))}
          </div>
        )}
      </div>

      {/* اللوجو والغلاف */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5">
        <ImageField
          label="اللوجو" hint="لوجو الشركة — مش صورة منتج."
          value={logo} onChange={setLogo}
          onPick={() => setPicker('logo')} onUpload={f => upload(f, 'logo')}
          uploading={uploading === 'logo'}
          extra={
            <button type="button" onClick={() => setLogo(d.generated_logo)}
              className="text-[11.5px] font-bold text-[#059669] hover:underline">
              استخدم لوجو مولّد بالاسم
            </button>
          }
        />
        <ImageField
          label="صورة الغلاف" hint="صورة واحدة واسعة للمكان أو أهم منتج."
          value={cover} onChange={setCover}
          onPick={() => setPicker('cover')} onUpload={f => upload(f, 'cover')}
          uploading={uploading === 'cover'}
        />
      </div>

      {/* الوصف */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <label className="block text-xs font-bold text-gray-500 mb-1.5">وصف النشاط</label>
        <p className="text-[11.5px] text-gray-400 mb-2 leading-relaxed">
          سطرين يقولوا إنت بتعمل إيه وفين. ده اللي بيخلّي الصفحة تبان «شركة» مش قايمة منتجات.
        </p>
        <textarea value={descr} onChange={e => setDescr(e.target.value)} rows={3}
          className={INPUT} placeholder="مثال: أثاث منزلي عصري — دواليب ودريسنج بأسعار المصنع، مصر الجديدة." />
        <p className="text-[11px] text-gray-400 mt-1">{descr.length} حرف</p>
      </div>

      {/* معرض الصور */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-bold text-gray-500">معرض الصور</p>
            <p className="text-[11.5px] text-gray-400">صور المكان نفسه — غير صور المنتجات.</p>
          </div>
          <button type="button" onClick={() => setPicker('gallery')}
            className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#059669]/10 text-[#059669] px-3 py-2 rounded-xl">
            <Plus className="w-3.5 h-3.5" /> ضيف صورة
          </button>
        </div>
        {gallery.length === 0 && <p className="text-[12px] text-gray-400 py-3">مفيش صور لسه.</p>}
        <div className="space-y-2">
          {gallery.map((g, i) => (
            <div key={i} className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.url} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0 ring-1 ring-black/5" />
              <input value={g.caption} placeholder="وصف الصورة (اختياري)"
                onChange={e => setGallery(gs => gs.map((x, j) => j === i ? { ...x, caption: e.target.value } : x))}
                className={INPUT} />
              <button type="button" onClick={() => setGallery(gs => gs.filter((_, j) => j !== i))}
                className="w-9 h-9 rounded-xl bg-red-50 text-red-600 grid place-items-center flex-shrink-0">
                <Trash />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* الألوان */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <label className="flex items-center gap-2.5 cursor-pointer mb-1">
          <input type="checkbox" checked={themeOn} onChange={e => setThemeOn(e.target.checked)} />
          <span className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
            <Palette className="w-4 h-4 text-[#059669]" /> هوية لونية خاصة بالبيزنس
          </span>
        </label>
        <p className="text-[11.5px] text-gray-400 mb-3 leading-relaxed">
          لو مقفولة، الصفحة بتستخدم هوية مضمونة الخضرا.
        </p>
        {themeOn && (
          <>
            <div className="flex gap-2 flex-wrap mb-3">
              {SWATCHES.map(s => (
                <button key={s.c} type="button" title={s.n} onClick={() => setAccent(s.c)}
                  className={`w-9 h-9 rounded-xl ring-2 transition-all ${accent.toLowerCase() === s.c.toLowerCase() ? 'ring-gray-800 scale-110' : 'ring-transparent'}`}
                  style={{ background: s.c }} />
              ))}
            </div>
            <div className="flex items-center gap-2.5">
              <input type="color" value={accent} onChange={e => setAccent(e.target.value)}
                className="w-11 h-11 rounded-xl border border-gray-200 cursor-pointer bg-white" />
              <input value={accent} onChange={e => setAccent(e.target.value)}
                className={INPUT} dir="ltr" placeholder="#059669" />
            </div>
          </>
        )}
      </div>

      {/* حفظ */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={save} disabled={saving}
          className="inline-flex items-center gap-2 bg-[#059669] text-white font-bold text-sm px-6 py-3 rounded-xl disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {saving ? 'بيحفظ…' : 'احفظ'}
        </button>
        {msg && (
          <span className={`text-sm font-bold ${msg.ok ? 'text-[#059669]' : 'text-red-700'}`}>{msg.text}</span>
        )}
      </div>

      {/* منتقي الصور */}
      {picker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/45" onClick={() => setPicker(null)} />
          <div dir="rtl" className="relative bg-white rounded-3xl p-5 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <p className="font-black text-gray-900">اختار من صور بيزنسك</p>
              <button onClick={() => setPicker(null)} className="w-8 h-8 rounded-lg bg-gray-100 grid place-items-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[12px] text-gray-500 mb-4">
              دي صور إعلاناتك اللي على المنصة — {d.own_photos.length} صورة.
            </p>
            {d.own_photos.length === 0 && (
              <p className="text-sm text-gray-400 py-6 text-center">مفيش صور على إعلاناتك لسه — ارفع صورة من فوق.</p>
            )}
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2.5">
              {d.own_photos.map(u => (
                <button key={u} type="button" onClick={() => pick(u)}
                  className="aspect-square rounded-xl overflow-hidden ring-1 ring-black/5 hover:ring-2 hover:ring-[#059669]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ImageField({ label, hint, value, onChange, onPick, onUpload, uploading, extra }: {
  label: string; hint: string; value: string; onChange: (v: string) => void
  onPick: () => void; onUpload: (f: File) => void; uploading: boolean; extra?: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 mb-1">{label}</label>
      <p className="text-[11.5px] text-gray-400 mb-2">{hint}</p>
      <div className="flex items-start gap-3">
        <div className="w-16 h-16 rounded-xl bg-gray-50 ring-1 ring-black/5 overflow-hidden flex-shrink-0 grid place-items-center">
          {value
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={value} alt="" className="w-full h-full object-contain" />
            : <ImageOff className="w-5 h-5 text-gray-300" />}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <input value={value} onChange={e => onChange(e.target.value)} dir="ltr"
            placeholder="https://…" className={INPUT} />
          <div className="flex items-center gap-3 flex-wrap">
            <button type="button" onClick={onPick} className="text-[11.5px] font-bold text-[#059669] hover:underline">
              اختار من صور بيزنسك
            </button>
            <label className="text-[11.5px] font-bold text-[#059669] hover:underline cursor-pointer inline-flex items-center gap-1">
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              {uploading ? 'بيرفع…' : 'ارفع صورة'}
              <input type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f) }} />
            </label>
            {value && (
              <button type="button" onClick={() => onChange('')} className="text-[11.5px] font-bold text-red-600 hover:underline">
                شيلها
              </button>
            )}
            {extra}
          </div>
        </div>
      </div>
    </div>
  )
}

function Trash() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}
