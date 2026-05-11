'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

// ============================================================================
// Madmona "Add Listing First" — public, no-auth multi-step form
// Brand: deep green (#1F5F3F), gold (#B8860B), ivory (#FAF7F0)
// ============================================================================

type Step = 1 | 2 | 3 | 4 | 5;

type Category = {
  slug: string;
  name_ar: string;
  emoji: string;
};

const CATEGORIES: Category[] = [
  { slug: 'apartments', name_ar: 'شقة',          emoji: '🏠' },
  { slug: 'chalets',    name_ar: 'شاليه',        emoji: '🏖' },
  { slug: 'villas',     name_ar: 'فيلا',         emoji: '🏡' },
  { slug: 'cars',       name_ar: 'عربية',        emoji: '🚗' },
  { slug: 'cameras',    name_ar: 'كاميرا/معدات', emoji: '📷' },
  { slug: 'workspace',  name_ar: 'مساحة عمل',    emoji: '🏢' },
  { slug: 'equipment',  name_ar: 'معدات/أدوات',  emoji: '🛠' },
  { slug: 'other',      name_ar: 'حاجة تانية',   emoji: '✨' },
];

const CITIES = [
  'القاهرة', 'الجيزة', 'الإسكندرية', 'الساحل الشمالي',
  'العين السخنة', 'رأس الحكمة', 'الغردقة', 'شرم الشيخ',
  'مرسى علم', 'دهب', 'الأقصر', 'أسوان',
  'المنصورة', 'طنطا', 'بورسعيد', 'الإسماعيلية', 'السويس',
  'دمياط', 'الزقازيق', 'الفيوم', 'بني سويف', 'المنيا', 'أسيوط',
  'سوهاج', 'قنا', 'العاشر من رمضان', 'مدينة 6 أكتوبر',
];

interface DraftPayload {
  claim_token?: string;
  category_slug?: string;
  title?: string;
  description?: string;
  city?: string;
  district?: string;
  price?: number;
  price_period?: string;
  photos?: { url: string; caption?: string }[];
  contact_name?: string;
  contact_phone?: string;
  account_type?: 'individual' | 'business';
  business_name?: string;
  current_step?: number;
  status?: string;
  source?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

export default function AddListingClient() {
  return (
    <Suspense fallback={null}>
      <AddListingPageInner />
    </Suspense>
  );
}

function AddListingPageInner() {
  const router = useRouter();
  const params = useSearchParams();

  const [step, setStep] = useState<Step>(1);
  const [draft, setDraft] = useState<DraftPayload>({
    source: 'whatsapp_link',
  });
  const [token, setToken] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Read URL params (UTM, pre-fill phone from WhatsApp link)
  useEffect(() => {
    const phone = params.get('phone') || params.get('p');
    const utm_source = params.get('utm_source') || undefined;
    const utm_medium = params.get('utm_medium') || undefined;
    const utm_campaign = params.get('utm_campaign') || undefined;
    const cat = params.get('cat') || undefined;
    const existing = params.get('token');
    if (existing) setToken(existing);
    setDraft((d) => ({
      ...d,
      contact_phone: phone || d.contact_phone,
      category_slug: cat || d.category_slug,
      utm_source, utm_medium, utm_campaign,
    }));
  }, [params]);

  // Persist draft on every meaningful change
  async function persist(patch: Partial<DraftPayload>): Promise<string | null> {
    setSaving(true);
    try {
      const body = { ...draft, ...patch, current_step: step };
      const res = await fetch('/api/listing-drafts' + (token ? `?token=${token}` : ''), {
        method: token ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setErrors({ form: json.error || 'حصل خطأ، حاول تاني' });
        return null;
      }
      if (json.token && !token) setToken(json.token);
      setDraft({ ...body, claim_token: json.token || token || undefined });
      return json.token || token;
    } catch (e: any) {
      setErrors({ form: e.message || 'حصل خطأ، حاول تاني' });
      return null;
    } finally {
      setSaving(false);
    }
  }

  function next() {
    setErrors({});
    if (step < 5) setStep((s) => (s + 1) as Step);
  }
  function back() {
    setErrors({});
    if (step > 1) setStep((s) => (s - 1) as Step);
  }

  const progress = (step / 5) * 100;

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-[#1F5F3F] text-[#FAF7F0]">
      {/* Header */}
      <header className="px-5 pt-6 pb-4 border-b border-[#FAF7F0]/10">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold tracking-tight">مضمونة</div>
            <span className="text-xs text-[#B8860B] uppercase tracking-widest">MADMONA</span>
          </div>
          <a href="/" className="text-xs text-[#FAF7F0]/70 hover:text-[#FAF7F0]">
            ← الرئيسية
          </a>
        </div>
        <h1 className="text-xl font-semibold mt-5 max-w-2xl mx-auto">
          أَجِّر معانا — أضف ليستنجك في 60 ثانية
        </h1>
        <p className="text-sm text-[#FAF7F0]/70 mt-1 max-w-2xl mx-auto">
          خطوة واحدة من 5 — مش لازم تعمل حساب دلوقتي
        </p>

        {/* Progress bar */}
        <div className="mt-4 max-w-2xl mx-auto">
          <div className="h-1 bg-[#FAF7F0]/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#B8860B] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-[#FAF7F0]/60 mt-2 text-center">
            خطوة {step} من 5
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="px-5 py-8 max-w-2xl mx-auto">
        {errors.form && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-500/40 text-sm">
            {errors.form}
          </div>
        )}

        {step === 1 && (
          <StepCategory
            value={draft.category_slug}
            onSelect={async (slug) => {
              await persist({ category_slug: slug });
              next();
            }}
          />
        )}

        {step === 2 && (
          <StepBasics
            draft={draft}
            errors={errors}
            onSubmit={async (patch) => {
              const ok = validateBasics(patch, setErrors);
              if (!ok) return;
              await persist(patch);
              next();
            }}
            onBack={back}
            saving={saving}
          />
        )}

        {step === 3 && (
          <StepPricing
            draft={draft}
            errors={errors}
            onSubmit={async (patch) => {
              if (!patch.price || patch.price <= 0) {
                setErrors({ price: 'حط سعر صحيح من فضلك' });
                return;
              }
              await persist(patch);
              next();
            }}
            onBack={back}
            saving={saving}
          />
        )}

        {step === 4 && (
          <StepPhotos
            draft={draft}
            token={token}
            onSubmit={async (photos) => {
              await persist({ photos });
              next();
            }}
            onSkip={() => next()}
            onBack={back}
            saving={saving}
          />
        )}

        {step === 5 && (
          <StepContact
            draft={draft}
            errors={errors}
            onSubmit={async (patch) => {
              const ok = validateContact(patch, setErrors);
              if (!ok) return;
              const t = await persist({ ...patch, status: 'submitted' });
              if (t) {
                router.push(`/add-listing/success?token=${t}`);
              }
            }}
            onBack={back}
            saving={saving}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="px-5 pb-8 mt-4 max-w-2xl mx-auto text-center text-xs text-[#FAF7F0]/50">
        🛡 حماية كاملة • 💰 دفع سريع • 📞 دعم 24/7 • عمولة 10% (5% للشركات)
      </footer>
    </div>
  );
}

// =================================================
// STEP 1 — CATEGORY
// =================================================
function StepCategory({
  value,
  onSelect,
}: {
  value?: string;
  onSelect: (slug: string) => void;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold mb-1">إيه اللي عايز تأجره؟</h2>
      <p className="text-sm text-[#FAF7F0]/60 mb-6">اختار النوع الأقرب لما عندك</p>
      <div className="grid grid-cols-2 gap-3">
        {CATEGORIES.map((c) => (
          <button
            key={c.slug}
            type="button"
            onClick={() => onSelect(c.slug)}
            className={`p-5 rounded-2xl border text-right transition-all ${
              value === c.slug
                ? 'bg-[#B8860B] border-[#B8860B] text-[#1F5F3F]'
                : 'bg-[#FAF7F0]/5 border-[#FAF7F0]/15 hover:bg-[#FAF7F0]/10 hover:border-[#B8860B]/50'
            }`}
          >
            <div className="text-3xl mb-2">{c.emoji}</div>
            <div className="font-semibold">{c.name_ar}</div>
          </button>
        ))}
      </div>
    </section>
  );
}

// =================================================
// STEP 2 — BASIC DETAILS
// =================================================
function StepBasics({
  draft,
  errors,
  onSubmit,
  onBack,
  saving,
}: any) {
  const [title, setTitle] = useState(draft.title || '');
  const [description, setDescription] = useState(draft.description || '');
  const [city, setCity] = useState(draft.city || '');
  const [district, setDistrict] = useState(draft.district || '');

  return (
    <section>
      <h2 className="text-lg font-semibold mb-1">معلومات أساسية</h2>
      <p className="text-sm text-[#FAF7F0]/60 mb-6">وصف قصير، مكان، وفينك</p>

      <Field label="عنوان الإعلان" error={errors.title} required>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="مثلاً: شاليه في مراسي بحر مباشر، 4 غرف"
          className={inputCls}
        />
      </Field>

      <Field label="وصف مختصر" error={errors.description}>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="إيه اللي بيميز اللي عندك؟ (المسبح، الإطلالة، الموقع...)"
          className={inputCls}
        />
      </Field>

      <Field label="المحافظة/المنطقة" error={errors.city} required>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className={inputCls}
        >
          <option value="">اختار</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </Field>

      <Field label="الحي/المنطقة بالظبط" error={errors.district}>
        <input
          type="text"
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          placeholder="مثلاً: مراسي، التجمع الخامس، الزمالك..."
          className={inputCls}
        />
      </Field>

      <Nav onBack={onBack} onNext={() => onSubmit({ title, description, city, district })} saving={saving} />
    </section>
  );
}

function validateBasics(patch: any, setErrors: any) {
  const errs: any = {};
  if (!patch.title || patch.title.length < 5) errs.title = 'العنوان قصير، خليه على الأقل 5 حروف';
  if (!patch.city) errs.city = 'اختار المحافظة';
  setErrors(errs);
  return Object.keys(errs).length === 0;
}

// =================================================
// STEP 3 — PRICING
// =================================================
function StepPricing({ draft, errors, onSubmit, onBack, saving }: any) {
  const [period, setPeriod] = useState<string>(draft.price_period || 'daily');
  const [price, setPrice] = useState<number | ''>(draft.price || '');

  const periodLabel: Record<string, string> = {
    hourly: 'ساعة',
    daily: 'يوم',
    weekly: 'أسبوع',
    monthly: 'شهر',
  };

  return (
    <section>
      <h2 className="text-lg font-semibold mb-1">السعر</h2>
      <p className="text-sm text-[#FAF7F0]/60 mb-6">حضرتك بتأجره بكام؟</p>

      <Field label="مدة الإيجار" required>
        <div className="grid grid-cols-4 gap-2">
          {['hourly','daily','weekly','monthly'].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`py-3 rounded-xl border text-sm transition-all ${
                period === p
                  ? 'bg-[#B8860B] border-[#B8860B] text-[#1F5F3F] font-semibold'
                  : 'bg-[#FAF7F0]/5 border-[#FAF7F0]/15'
              }`}
            >
              {periodLabel[p]}
            </button>
          ))}
        </div>
      </Field>

      <Field label={`السعر بالجنيه لكل ${periodLabel[period]}`} error={errors.price} required>
        <div className="relative">
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="مثلاً: 1500"
            className={inputCls + ' pl-16'}
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#FAF7F0]/60 text-sm">
            ج.م
          </span>
        </div>
      </Field>

      {price && period === 'daily' && Number(price) > 0 && (
        <div className="mt-4 p-4 rounded-xl bg-[#B8860B]/10 border border-[#B8860B]/30 text-sm">
          💰 لو حد أجره أسبوع كامل = <strong>{Number(price) * 7} جنيه</strong>
          <br />
          • نصيب حضرتك (فرد، 10% عمولة): <strong>{Math.round(Number(price) * 7 * 0.9)} جنيه</strong>
          <br />
          • نصيب حضرتك (شركة، 5% عمولة): <strong>{Math.round(Number(price) * 7 * 0.95)} جنيه</strong>
        </div>
      )}

      <Nav onBack={onBack} onNext={() => onSubmit({ price: Number(price), price_period: period })} saving={saving} />
    </section>
  );
}

// =================================================
// STEP 4 — PHOTOS
// =================================================
function StepPhotos({ draft, token, onSubmit, onSkip, onBack, saving }: any) {
  const [photos, setPhotos] = useState<{ url: string; caption?: string }[]>(draft.photos || []);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (photos.length + files.length > 8) {
      setError('أقصى عدد 8 صور');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const uploaded: { url: string }[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        if (token) fd.append('token', token);
        const res = await fetch('/api/listing-drafts/upload', {
          method: 'POST',
          body: fd,
        });
        const json = await res.json();
        if (json.url) uploaded.push({ url: json.url });
      }
      setPhotos([...photos, ...uploaded]);
    } catch (e: any) {
      setError(e.message || 'الصور مرفعتش، حاول تاني');
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(idx: number) {
    setPhotos(photos.filter((_, i) => i !== idx));
  }

  return (
    <section>
      <h2 className="text-lg font-semibold mb-1">الصور (اختياري)</h2>
      <p className="text-sm text-[#FAF7F0]/60 mb-6">
        ليستنج فيه صور كويسة بيتأجر أسرع 3 مرات. تقدر تتخطى وتضيف الصور بعدين.
      </p>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {photos.map((p, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-black/20">
              <img src={p.url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute top-1 left-1 w-7 h-7 rounded-full bg-red-600 text-white text-sm font-bold"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <label className="block">
        <div className="border-2 border-dashed border-[#FAF7F0]/25 rounded-2xl p-8 text-center cursor-pointer hover:border-[#B8860B] transition-colors">
          <div className="text-3xl mb-2">📸</div>
          <div className="font-semibold">{uploading ? 'جاري الرفع...' : 'اضغط هنا لإضافة صور'}</div>
          <div className="text-xs text-[#FAF7F0]/60 mt-1">JPG/PNG، حتى 8 صور</div>
        </div>
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFiles}
          disabled={uploading}
        />
      </label>

      {error && <div className="mt-3 text-sm text-red-300">{error}</div>}

      <div className="grid grid-cols-2 gap-3 mt-6">
        <button
          type="button"
          onClick={onBack}
          className={btnSecondary}
        >
          ← رجوع
        </button>
        {photos.length > 0 ? (
          <button
            type="button"
            onClick={() => onSubmit(photos)}
            disabled={saving}
            className={btnPrimary}
          >
            {saving ? '...' : 'كمل →'}
          </button>
        ) : (
          <button
            type="button"
            onClick={onSkip}
            className={btnPrimary}
          >
            تخطى دلوقتي →
          </button>
        )}
      </div>
    </section>
  );
}

// =================================================
// STEP 5 — CONTACT (the soft signup)
// =================================================
function StepContact({ draft, errors, onSubmit, onBack, saving }: any) {
  const [name, setName] = useState(draft.contact_name || '');
  const [phone, setPhone] = useState(draft.contact_phone || '');
  const [accountType, setAccountType] = useState<'individual' | 'business'>(draft.account_type || 'individual');
  const [businessName, setBusinessName] = useState(draft.business_name || '');

  return (
    <section>
      <h2 className="text-lg font-semibold mb-1">بياناتك</h2>
      <p className="text-sm text-[#FAF7F0]/60 mb-6">
        آخر خطوة. هنبعتلك تأكيد على الواتس اب.
      </p>

      <Field label="اسمك" error={errors.contact_name} required>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="الاسم بالكامل"
          className={inputCls}
        />
      </Field>

      <Field label="رقم الواتس اب" error={errors.contact_phone} required>
        <input
          type="tel"
          dir="ltr"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="01XXXXXXXXX"
          className={inputCls + ' text-left'}
        />
      </Field>

      <Field label="إنت" required>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setAccountType('individual')}
            className={`p-4 rounded-xl border text-right transition-all ${
              accountType === 'individual'
                ? 'bg-[#B8860B] border-[#B8860B] text-[#1F5F3F]'
                : 'bg-[#FAF7F0]/5 border-[#FAF7F0]/15'
            }`}
          >
            <div className="font-semibold">فرد</div>
            <div className={`text-xs mt-1 ${accountType === 'individual' ? 'text-[#1F5F3F]/70' : 'text-[#FAF7F0]/60'}`}>عمولة 10%</div>
          </button>
          <button
            type="button"
            onClick={() => setAccountType('business')}
            className={`p-4 rounded-xl border text-right transition-all ${
              accountType === 'business'
                ? 'bg-[#B8860B] border-[#B8860B] text-[#1F5F3F]'
                : 'bg-[#FAF7F0]/5 border-[#FAF7F0]/15'
            }`}
          >
            <div className="font-semibold">شركة</div>
            <div className={`text-xs mt-1 ${accountType === 'business' ? 'text-[#1F5F3F]/70' : 'text-[#FAF7F0]/60'}`}>عمولة 5%</div>
          </button>
        </div>
      </Field>

      {accountType === 'business' && (
        <Field label="اسم الشركة" error={errors.business_name} required>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="الاسم التجاري"
            className={inputCls}
          />
        </Field>
      )}

      <div className="mt-6 p-4 rounded-xl bg-[#FAF7F0]/5 border border-[#FAF7F0]/10 text-xs text-[#FAF7F0]/70">
        ✅ بكدا حضرتك سجلت الليستنج — هنبعتلك تأكيد على الواتس اب وتقدر تكمل تسجيل حسابك (دقيقة واحدة).
      </div>

      <Nav
        onBack={onBack}
        onNext={() => onSubmit({
          contact_name: name,
          contact_phone: phone,
          account_type: accountType,
          business_name: accountType === 'business' ? businessName : null,
        })}
        saving={saving}
        nextLabel="ابعت الليستنج 🚀"
      />
    </section>
  );
}

function validateContact(patch: any, setErrors: any) {
  const errs: any = {};
  if (!patch.contact_name || patch.contact_name.length < 2) errs.contact_name = 'اكتب اسمك';
  if (!patch.contact_phone || !/^(\+?2)?01\d{9}$/.test(String(patch.contact_phone).replace(/\s/g, '')))
    errs.contact_phone = 'رقم تليفون مش صحيح (لازم 11 رقم)';
  if (patch.account_type === 'business' && !patch.business_name)
    errs.business_name = 'اكتب اسم الشركة';
  setErrors(errs);
  return Object.keys(errs).length === 0;
}

// =================================================
// SHARED UI
// =================================================
const inputCls =
  'w-full p-3 rounded-xl bg-[#FAF7F0]/5 border border-[#FAF7F0]/15 text-[#FAF7F0] placeholder:text-[#FAF7F0]/40 focus:outline-none focus:border-[#B8860B]';

const btnPrimary =
  'py-3 px-4 rounded-xl bg-[#B8860B] text-[#1F5F3F] font-semibold hover:bg-[#B8860B]/90 disabled:opacity-50 transition-all';

const btnSecondary =
  'py-3 px-4 rounded-xl bg-[#FAF7F0]/5 border border-[#FAF7F0]/15 hover:bg-[#FAF7F0]/10 transition-all';

function Field({ label, error, required, children }: any) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-2">
        {label}
        {required && <span className="text-[#B8860B] mr-1">*</span>}
      </label>
      {children}
      {error && <div className="text-xs text-red-300 mt-1">{error}</div>}
    </div>
  );
}

function Nav({ onBack, onNext, saving, nextLabel }: any) {
  return (
    <div className="grid grid-cols-2 gap-3 mt-6">
      <button type="button" onClick={onBack} className={btnSecondary}>
        ← رجوع
      </button>
      <button type="button" onClick={onNext} disabled={saving} className={btnPrimary}>
        {saving ? '...' : (nextLabel || 'كمل →')}
      </button>
    </div>
  );
}
