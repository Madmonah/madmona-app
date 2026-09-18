'use client'
// ============================================================================
// 🍽️ تعديل أقسام المنيو — صورة وإيموچي وترتيب (١٨ سبتمبر ٢٠٢٦)
//
// محمد نصًا: «أنا بتكلم على التمبلت، لكن الصور والإيموجي عايزنهم دينامك أو
// قابلين للتعديل». القالب (RestaurantCloud) زي ما هو لكل المطاعم — اللي بقى
// قابل للتعديل هو محتوى كارت القسم: الصورة والأيقونة والترتيب.
//
// الأولوية في العرض: صورة القسم ← صورة أول صنف ← الإيموچي المختار ← تخمين من
// الاسم (الخريطة في RestaurantCloud = fallback أخير مش مصدر).
//
// الأقسام نفسها مش بتتعمل هنا — بتتولد من `restaurant_menu_items.category`،
// والشاشة دي بتزوّدها صورة/أيقونة بس. ⚠️ الكتابة عبر business_menu_category_save
// (بالبابين: جلسة Supabase أو توكن الواتساب) — مفيش insert مباشر.
// ============================================================================
import { useCallback, useEffect, useState } from 'react'
import { Loader2, Check, Image as ImageIcon, Upload } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { withToken } from '@/lib/rpc'

type Cat = { name: string; items: number; emoji: string | null; photo_url: string | null; display_order: number }

// اقتراحات سريعة — اللي بيغطي أغلب أقسام المطاعم عندنا
const PICKS = ['🍽️', '🥗', '🍲', '🫒', '🍖', '🥩', '🍗', '🍕', '🍔', '🥪', '🧆', '🥙', '🍳', '🥚',
  '🍚', '🍝', '🥘', '🫓', '🥞', '🍰', '🍫', '🥖', '☕', '🍵', '🥤', '🍊', '🍓', '🍹', '🥛', '🧋',
  '🍧', '🍨', '⚡', '🦐', '🍱', '🎉', '🍛', '🍟', '🧒']

export default function MenuCategoriesEditor({ listingId }: { listingId: string }) {
  const [cats, setCats] = useState<Cat[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setErr(null)
    const { data, error } = await withToken(supabaseBrowser).rpc('business_menu_categories', { p_listing: listingId })
    if (error) { setErr(error.message); setLoading(false); return }
    const r = data as { ok?: boolean; error?: string; categories?: Cat[] } | null
    if (!r?.ok) { setErr(r?.error || 'مقدرناش نجيب الأقسام'); setLoading(false); return }
    setCats(r.categories || [])
    setLoading(false)
  }, [listingId])

  useEffect(() => { void load() }, [load])

  async function save(c: Cat, patch: Partial<Cat>) {
    const next = { ...c, ...patch }
    setCats((prev) => prev.map((x) => (x.name === c.name ? next : x)))
    setSaving(c.name); setErr(null)
    const { data, error } = await withToken(supabaseBrowser).rpc('business_menu_category_save', {
      p_listing: listingId, p_name: c.name,
      p_emoji: next.emoji || null, p_photo_url: next.photo_url || null,
      p_display_order: next.display_order ?? 0,
    })
    setSaving(null)
    const r = data as { ok?: boolean; error?: string } | null
    if (error || !r?.ok) { setErr(error?.message || r?.error || 'ماتحفظش'); return }
    setSaved(c.name); setTimeout(() => setSaved((s) => (s === c.name ? null : s)), 1600)
  }

  async function upload(c: Cat, file: File) {
    if (file.size > 3 * 1024 * 1024) { setErr('الصورة لازم تكون أقل من ٣ ميجا'); return }
    setSaving(c.name); setErr(null)
    try {
      const fd = new FormData(); fd.append('file', file)
      const { data: s } = await supabaseBrowser.auth.getSession()
      const res = await fetch('/api/catalog/photo', {
        method: 'POST', body: fd,
        headers: s?.session?.access_token ? { authorization: `Bearer ${s.session.access_token}` } : undefined,
      }).then((x) => x.json()).catch(() => null)
      if (!res?.url) { setSaving(null); setErr(res?.error || 'الرفع ماتمش — جرّب تاني'); return }
      await save(c, { photo_url: res.url })
    } catch { setSaving(null); setErr('الرفع ماتمش') }
  }

  if (loading) return <div className="py-8 text-center text-gray-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
  if (!cats.length) return <p className="text-sm text-gray-500 py-4">مفيش أقسام لسه — الأقسام بتتولد من خانة «القسم» في الأصناف.</p>

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        كل قسم بيظهر ككارت في المنيو. حط صورة أو اختار أيقونة — لو سيبتهم فاضيين هنستخدم
        صورة أول صنف في القسم، وإلا أيقونة مناسبة لاسمه.
      </p>
      {err && <p className="text-xs text-red-600">{err}</p>}
      {cats.map((c) => (
        <div key={c.name} className="rounded-2xl border border-gray-200 bg-white p-3">
          <div className="flex items-center gap-3">
            {/* معاينة الكارت زي ما العميل هيشوفه */}
            <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 grid place-items-center text-3xl"
              style={c.photo_url ? { backgroundImage: `url(${c.photo_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : { background: 'linear-gradient(135deg,#DCE9E1,#F4EFE8)' }}>
              {!c.photo_url && (c.emoji || '🍽️')}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-black text-[15px] truncate">{c.name}</p>
              <p className="text-[11px] text-gray-400">{c.items} صنف</p>
            </div>
            <div className="shrink-0 w-6 text-center">
              {saving === c.name ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                : saved === c.name ? <Check className="w-4 h-4 text-[#059669]" /> : null}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {PICKS.map((e) => (
              <button key={e} type="button" onClick={() => void save(c, { emoji: e })}
                className={`text-xl leading-none rounded-lg px-1.5 py-1 border ${c.emoji === e ? 'border-[#059669] bg-[#E6F4EE]' : 'border-transparent hover:bg-gray-50'}`}
                title={e}>{e}</button>
            ))}
            {c.emoji && (
              <button type="button" onClick={() => void save(c, { emoji: null })}
                className="text-[11px] text-gray-500 underline px-2">شيل الأيقونة</button>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <label className="inline-flex items-center gap-1.5 text-xs font-bold text-[#04352A] bg-[#F3F4F6] rounded-xl px-3 py-2 cursor-pointer">
              <Upload className="w-3.5 h-3.5" /> ارفع صورة للقسم
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(c, f); e.target.value = '' }} />
            </label>
            {c.photo_url && (
              <button type="button" onClick={() => void save(c, { photo_url: null })}
                className="text-[11px] text-gray-500 underline">شيل الصورة</button>
            )}
            <label className="inline-flex items-center gap-1.5 text-[11px] text-gray-500 ms-auto">
              الترتيب
              <input type="number" value={c.display_order} min={0}
                onChange={(e) => setCats((p) => p.map((x) => (x.name === c.name ? { ...x, display_order: Number(e.target.value) } : x)))}
                onBlur={() => void save(c, {})}
                className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-center text-[13px]" />
            </label>
          </div>
        </div>
      ))}
      <p className="text-[11px] text-gray-400 flex items-center gap-1">
        <ImageIcon className="w-3 h-3" /> الصورة بتظهر في كارت القسم — أحسن مقاس عرضي (٤:٣ تقريبًا).
      </p>
    </div>
  )
}
