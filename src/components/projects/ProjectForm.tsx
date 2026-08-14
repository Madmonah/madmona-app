'use client'

// src/components/projects/ProjectForm.tsx
// فورم إضافة/تعديل مشروع — بيتستخدم في /admin/projects و/add-project.
// المنطقة نص حر: أي منطقة في مصر تتكتب وتظهر في البورصة على طول.
import { useMemo, useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import MediaUploader from './MediaUploader'
import { slugify, PRICE_UNITS, type Project } from '@/lib/projects'

export type ProjectDraft = Partial<Project>

const UNIT_LABEL: Record<string, string> = {
  egp_total: 'سعر الوحدة بالجنيه',
  egp_per_m2: 'سعر المتر بالجنيه',
  egp_month: 'إيجار شهري',
  egp_night: 'إيجار بالليلة',
}

export default function ProjectForm({
  initial,
  mode,
  onSaved,
}: {
  initial?: ProjectDraft
  mode: 'admin' | 'public'
  onSaved?: (p: unknown) => void
}) {
  const [f, setF] = useState<ProjectDraft>({
    title: '',
    developer: '',
    area_label: '',
    city: '',
    unit_label: '',
    price_from: null,
    price_to: null,
    price_unit: 'egp_total',
    payment_plan: '',
    delivery_label: '',
    commission_pct: null,
    note: '',
    cover_url: null,
    brochure_url: null,
    video_url: null,
    ...initial,
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)

  const slug = useMemo(
    () => slugify(`${f.developer || ''}-${f.title || 'project'}`) || 'project',
    [f.developer, f.title],
  )

  function set<K extends keyof ProjectDraft>(k: K, v: ProjectDraft[K]) {
    setF((prev) => ({ ...prev, [k]: v }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')

    if (!f.title?.trim() || !f.area_label?.trim()) {
      setErr('اسم المشروع والمنطقة مطلوبين')
      return
    }

    setBusy(true)
    try {
      const isEdit = Boolean(initial?.id)
      const res = await fetch(isEdit ? `/api/projects/${initial!.id}` : '/api/projects', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(f),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'فشل الحفظ')
      setDone(true)
      onSaved?.(data.project)
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'فشل الحفظ')
    } finally {
      setBusy(false)
    }
  }

  if (done && mode === 'public') {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
        <p className="text-4xl mb-3">🎉</p>
        <h3 className="font-bold text-gray-900 text-lg mb-2">وصلنا مشروعك!</h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          فريق مضمونة هيراجعه وينشره في البورصة خلال ساعات.
          <br />
          لأي استفسار كلّم <strong>المارد 🧞</strong> — مساعد مضمونة الذكي — على واتساب{' '}
          <a href="https://wa.me/201002229982" className="text-[#059669] font-bold hover:underline">
            01002229982
          </a>
        </p>
      </div>
    )
  }

  const inputCls =
    'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]/25 focus:border-[#059669]'
  const labelCls = 'block text-xs font-semibold text-gray-700 mb-1'

  return (
    <form onSubmit={submit} dir="rtl" className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>اسم المشروع *</label>
          <input
            className={inputCls}
            value={f.title || ''}
            onChange={(e) => set('title', e.target.value)}
            placeholder="مثلاً: Grand Lane"
            required
          />
        </div>
        <div>
          <label className={labelCls}>المطور</label>
          <input
            className={inputCls}
            value={f.developer || ''}
            onChange={(e) => set('developer', e.target.value)}
            placeholder="مثلاً: HDP Development"
          />
        </div>
        <div>
          <label className={labelCls}>المنطقة * (أي منطقة في مصر)</label>
          <input
            className={inputCls}
            value={f.area_label || ''}
            onChange={(e) => set('area_label', e.target.value)}
            placeholder="مثلاً: مستقبل سيتي / العبور الجديدة / رأس الحكمة"
            required
          />
          <p className="text-[10px] text-gray-400 mt-1">
            اكتب أي منطقة — البورصة هتعرضها أوتوماتيك حتى لو جديدة علينا.
          </p>
        </div>
        <div>
          <label className={labelCls}>المدينة / المحافظة</label>
          <input
            className={inputCls}
            value={f.city || ''}
            onChange={(e) => set('city', e.target.value)}
            placeholder="مثلاً: القاهرة الجديدة"
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>الوحدات والمساحات</label>
        <input
          className={inputCls}
          value={f.unit_label || ''}
          onChange={(e) => set('unit_label', e.target.value)}
          placeholder="مثلاً: شقق ٨٧–١٦٣م · تاون ١٦٩م · ستاندالون ٢٣٥م"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>السعر من</label>
          <input
            type="number"
            className={inputCls}
            value={f.price_from ?? ''}
            onChange={(e) => set('price_from', e.target.value ? Number(e.target.value) : null)}
            placeholder="5000000"
          />
        </div>
        <div>
          <label className={labelCls}>السعر إلى</label>
          <input
            type="number"
            className={inputCls}
            value={f.price_to ?? ''}
            onChange={(e) => set('price_to', e.target.value ? Number(e.target.value) : null)}
            placeholder="28400000"
          />
        </div>
        <div>
          <label className={labelCls}>وحدة السعر</label>
          <select
            className={inputCls}
            value={f.price_unit || 'egp_total'}
            onChange={(e) => set('price_unit', e.target.value as Project['price_unit'])}
          >
            {PRICE_UNITS.map((u) => (
              <option key={u} value={u}>{UNIT_LABEL[u]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>نظام السداد</label>
          <textarea
            rows={2}
            className={inputCls}
            value={f.payment_plan || ''}
            onChange={(e) => set('payment_plan', e.target.value)}
            placeholder="مثلاً: ٥٪ مقدم + ٥٪ بعد ٣ شهور على ٨ سنين"
          />
        </div>
        <div>
          <label className={labelCls}>التسليم</label>
          <input
            className={inputCls}
            value={f.delivery_label || ''}
            onChange={(e) => set('delivery_label', e.target.value)}
            placeholder="مثلاً: تسليم ٤ سنين"
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>ملاحظات (تشطيب، مميزات، خدمات…)</label>
        <textarea
          rows={2}
          className={inputCls}
          value={f.note || ''}
          onChange={(e) => set('note', e.target.value)}
          placeholder="مثلاً: نص تشطيب · صيانة ٨٪ · فيو النهر الأخضر"
        />
      </div>

      {mode === 'admin' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>عمولة البروكر (٪)</label>
            <input
              type="number"
              step="0.5"
              className={inputCls}
              value={f.commission_pct ?? ''}
              onChange={(e) => set('commission_pct', e.target.value ? Number(e.target.value) : null)}
              placeholder="3"
            />
          </div>
          <div>
            <label className={labelCls}>الحالة</label>
            <select
              className={inputCls}
              value={f.status || 'published'}
              onChange={(e) => set('status', e.target.value as Project['status'])}
            >
              <option value="published">منشور</option>
              <option value="draft">مسودة</option>
              <option value="archived">مؤرشف</option>
            </select>
          </div>
        </div>
      )}

      {/* 📎 الميديا — بتتضغط في المتصفح قبل الرفع */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        <MediaUploader
          kind="image" label="صورة الغلاف" slug={slug}
          hint="بتتحول WebP وبتتصغّر لـ1600px تلقائياً"
          value={f.cover_url || null} onChange={(u) => set('cover_url', u)}
        />
        <MediaUploader
          kind="pdf" label="البروشور PDF" slug={slug}
          hint="ارفعه زي ما هو — لحد ٤٥ ميجا"
          value={f.brochure_url || null} onChange={(u) => set('brochure_url', u)}
        />
        <MediaUploader
          kind="video" label="فيديو المشروع" slug={slug}
          hint="بيتضغط 720p تلقائياً — بياخد وقت قد مدة الفيديو"
          value={f.video_url || null} onChange={(u) => set('video_url', u)}
        />
      </div>

      {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#34D399] text-[#04352A] font-bold text-sm disabled:opacity-60 hover:opacity-95 transition-opacity"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {busy ? 'بيحفظ…' : initial?.id ? 'احفظ التعديلات' : mode === 'public' ? 'ابعت المشروع' : 'ضيف المشروع'}
      </button>

      {mode === 'public' && (
        <p className="text-[11px] text-gray-500 text-center leading-relaxed">
          هنراجع المشروع وننشره في البورصة. لأي استفسار كلّم <strong>المارد 🧞</strong> — مساعد مضمونة
          الذكي — على واتساب <strong>01002229982</strong>.
        </p>
      )}
    </form>
  )
}
