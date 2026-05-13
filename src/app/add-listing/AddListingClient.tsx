'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// ============================================================================
// Madmona "Add Listing First" — public, no-auth multi-step form
// Brand: deep green (#1F5F3F), gold (#B8860B), ivory (#FAF7F0)
//
// FIX (May 13 2026): Consolidated 2 racing useEffects into 1, removed the
// step-rollback bug that was bouncing users back to step 1 after their
// first POST, and tightened the merge logic so DB hydration never clobbers
// user typing. See system_runbook entry: add_listing_wizard_data_loss.
// ============================================================================

type Step = 1 | 2 | 3 | 4 | 5;

type SubCategory = {
  slug: string;
  name_ar: string;
  emoji: string;
};

type MainCategory = {
  slug: string;
  name_ar: string;
  emoji: string;
  subs: SubCategory[];
};

const MAIN_CATEGORIES: MainCategory[] = [
  {
    slug: 'properties', name_ar: 'عقارات للإيجار', emoji: '🏠',
    subs: [
      { slug: 'properties-apartment', name_ar: 'شقة',           emoji: '🏢' },
      { slug: 'properties-villa',     name_ar: 'فيلا',          emoji: '🏡' },
      { slug: 'tourism-chalet',       name_ar: 'شاليه',         emoji: '🏖️' },
      { slug: 'properties-studio',    name_ar: 'استوديو',       emoji: '🛏️' },
      { slug: 'properties-penthouse', name_ar: 'روف',           emoji: '🌃' },
      { slug: 'properties-retail',    name_ar: 'محل تجاري',     emoji: '🏪' },
      { slug: 'properties-clinics',   name_ar: 'عيادات',        emoji: '🩺' },
      { slug: 'properties-storage',   name_ar: 'مساحة تخزين',   emoji: '📦' },
    ],
  },
  {
    slug: 'vehicles', name_ar: 'مركبات ونقل', emoji: '🚗',
    subs: [
      { slug: 'vehicles-car',        name_ar: 'سيارة',              emoji: '🚗' },
      { slug: 'vehicles-luxury',     name_ar: 'سيارة فاخرة',        emoji: '🏎️' },
      { slug: 'vehicles-4x4',        name_ar: 'سيارة دفع رباعي',    emoji: '🚙' },
      { slug: 'vehicles-microbus',   name_ar: 'ميكروباص',           emoji: '🚐' },
      { slug: 'vehicles-bus',        name_ar: 'أوتوبيس',            emoji: '🚌' },
      { slug: 'vehicles-motorcycle', name_ar: 'موتوسيكل',           emoji: '🏍️' },
      { slug: 'vehicles-tuktuk',     name_ar: 'تروسيكل',            emoji: '🛺' },
      { slug: 'vehicles-cargo',      name_ar: 'سيارات نقل بضائع',   emoji: '🚚' },
      { slug: 'vehicles-workforce',  name_ar: 'سيارات نقل عمالة',   emoji: '🚐' },
    ],
  },
  {
    slug: 'workspaces', name_ar: 'مساحات عمل', emoji: '🏢',
    subs: [
      { slug: 'workspaces-hot-desk', name_ar: 'مكتب مشترك',     emoji: '🪑' },
      { slug: 'workspaces-office',   name_ar: 'مكتب خاص',       emoji: '🚪' },
      { slug: 'workspaces-meeting',  name_ar: 'قاعة اجتماعات',  emoji: '👥' },
      { slug: 'workspaces-training', name_ar: 'قاعة تدريب',     emoji: '🎓' },
      { slug: 'workspaces-podcast',  name_ar: 'استوديو بودكاست', emoji: '🎙️' },
      { slug: 'workspaces-outdoor',  name_ar: 'مساحة خارجية',   emoji: '🌳' },
      { slug: 'makeup-artists',      name_ar: 'استوديو ميكب',   emoji: '💄' },
    ],
  },
  {
    slug: 'tourism', name_ar: 'السياحة', emoji: '🏝️',
    subs: [
      { slug: 'tourism-chalet',   name_ar: 'شاليه',                emoji: '🏖️' },
      { slug: 'tourism-packages', name_ar: 'باكدج سياحي',          emoji: '🎒' },
      { slug: 'tourism-day',      name_ar: 'رحلات يومية',          emoji: '🌅' },
      { slug: 'tourism-safari',   name_ar: 'رحلات سفاري',          emoji: '🐪' },
      { slug: 'tourism-diving',   name_ar: 'رحلات غطس وسنوركلينج', emoji: '🤿' },
      { slug: 'tourism-cruises',  name_ar: 'رحلات بحرية',          emoji: '🛥️' },
      { slug: 'tourism-city',     name_ar: 'سيتي تور',             emoji: '🚌' },
      { slug: 'tourism-camps',    name_ar: 'كامبات وجلامبينج',     emoji: '⛺' },
      { slug: 'tourism-bikes',    name_ar: 'تأجير دراجات وموتورات', emoji: '🛵' },
      { slug: 'tourism-boats',    name_ar: 'تأجير قوارب',          emoji: '⛵' },
      { slug: 'tourism-guides',   name_ar: 'مرشدين سياحيين',       emoji: '🗺️' },
    ],
  },
  {
    slug: 'weddings', name_ar: 'أعراس وتجهيزات', emoji: '💒',
    subs: [
      { slug: 'weddings-dress',       name_ar: 'فستان فرح',          emoji: '👰' },
      { slug: 'weddings-suit',        name_ar: 'بدلة عريس',          emoji: '🤵' },
      { slug: 'weddings-decor',       name_ar: 'كوشة وديكور',        emoji: '🎀' },
      { slug: 'weddings-av',          name_ar: 'معدات صوت وإضاءة',   emoji: '💡' },
      { slug: 'weddings-catering',    name_ar: 'تجهيزات ضيافة',      emoji: '🍽️' },
      { slug: 'weddings-furniture',   name_ar: 'أرابيسك ومفروشات',   emoji: '🪑' },
      { slug: 'weddings-accessories', name_ar: 'إكسسوارات',          emoji: '💎' },
    ],
  },
  {
    slug: 'media', name_ar: 'معدات ميديا', emoji: '📷',
    subs: [
      { slug: 'equipment-camera',       name_ar: 'كاميرات',         emoji: '📷' },
      { slug: 'media-lighting',         name_ar: 'إضاءة تصوير',     emoji: '💡' },
      { slug: 'media-projector',        name_ar: 'بروجيكتور وشاشة', emoji: '📽️' },
      { slug: 'media-drone',            name_ar: 'درون',            emoji: '📡' },
      { slug: 'media-equipment-audio',  name_ar: 'معدات صوت',       emoji: '🎤' },
    ],
  },
  {
    slug: 'recreation', name_ar: 'ترفيه ورياضة', emoji: '🎯',
    subs: [
      { slug: 'recreation-camping',   name_ar: 'معدات تخييم',      emoji: '⛺' },
      { slug: 'recreation-gym',       name_ar: 'أجهزة جيم منزلية', emoji: '💪' },
      { slug: 'recreation-bicycles',  name_ar: 'دراجات هوائية',    emoji: '🚲' },
      { slug: 'recreation-scooter',   name_ar: 'سكوتر كهربائي',    emoji: '🛴' },
      { slug: 'recreation-swim',      name_ar: 'معدات سباحة وغطس', emoji: '🤿' },
      { slug: 'recreation-kayak',     name_ar: 'كاياك وقوارب',     emoji: '🛶' },
      { slug: 'recreation-gaming',    name_ar: 'بلايستيشن وألعاب', emoji: '🎮' },
    ],
  },
  {
    slug: 'marine', name_ar: 'مركبات بحرية', emoji: '⛵',
    subs: [
      { slug: 'marine-yacht',     name_ar: 'يخت',               emoji: '🛥️' },
      { slug: 'marine-speedboat', name_ar: 'لانش',              emoji: '🚤' },
      { slug: 'marine-jetski',    name_ar: 'جت سكي',            emoji: '🌊' },
      { slug: 'marine-boat',      name_ar: 'قارب صغير',         emoji: '⛵' },
      { slug: 'marine-fishing',   name_ar: 'مركب صيد',          emoji: '🎣' },
      { slug: 'marine-kayak',     name_ar: 'كاياك وكانو',       emoji: '🛶' },
      { slug: 'marine-felucca',   name_ar: 'فيلوكا / مركب نيلي', emoji: '⛵' },
    ],
  },
  {
    slug: 'equipment', name_ar: 'معدات ثقيلة', emoji: '🚜',
    subs: [
      { slug: 'equipment-earthmoving',  name_ar: 'معدات تحريك التربة', emoji: '🚜' },
      { slug: 'equipment-cranes',       name_ar: 'أوناش ومعدات رفع',   emoji: '🏗️' },
      { slug: 'equipment-concrete',     name_ar: 'معدات خرسانة',        emoji: '🏭' },
      { slug: 'equipment-foundation',   name_ar: 'معدات أساسات',        emoji: '🛠️' },
      { slug: 'equipment-mixing-plants', name_ar: 'محطات خلط',          emoji: '🏭' },
      { slug: 'equipment-generators',   name_ar: 'مولدات كهرباء',       emoji: '⚡' },
      { slug: 'equipment-welding',      name_ar: 'معدات لحام',          emoji: '🔥' },
      { slug: 'equipment-compressors',  name_ar: 'كومبريسور',           emoji: '💨' },
    ],
  },
  {
    slug: 'professionals', name_ar: 'خدمات احترافية', emoji: '👨‍💼',
    subs: [
      { slug: 'photographers',  name_ar: 'مصورين فوتوغرافيين', emoji: '📸' },
      { slug: 'videographers',  name_ar: 'مصورين فيديو',       emoji: '🎬' },
      { slug: 'djs',            name_ar: 'DJs ومنسقين',         emoji: '🎵' },
      { slug: 'mcs',            name_ar: 'مذيعين و MCs',        emoji: '🎤' },
      { slug: 'audio-engineers', name_ar: 'مهندسي صوت',         emoji: '🎧' },
      { slug: 'designers',      name_ar: 'مصممين جرافيك',       emoji: '🎨' },
      { slug: 'makeup-artists', name_ar: 'ميك أب أرتست',        emoji: '💄' },
      { slug: 'event-planners', name_ar: 'منظمي فعاليات',       emoji: '🎉' },
      { slug: 'tutors',         name_ar: 'مدرسين خصوصي',        emoji: '📚' },
      { slug: 'translators',    name_ar: 'مترجمين',             emoji: '🌍' },
    ],
  },
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

// Treat "(جاري التحرير)" as no real title so it doesn't show up in form fields
const PLACEHOLDER_TITLE = '(جاري التحرير)';

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
  const [draft, setDraft] = useState<DraftPayload>({ source: 'whatsapp_link' });
  const [token, setToken] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Tracks whether we've already done the initial mount hydration.
  // Prevents the rehydrate-from-DB logic from running again later when
  // token state changes due to our own POST (which is what was causing
  // the step-rollback bug previously).
  const hydratedRef = useRef(false);

  // ──────────────────────────────────────────────────────────────────
  // INITIAL HYDRATION (runs ONCE on mount only)
  //
  // Reads URL params (UTM, phone hint, category hint, ?token=...) and
  // localStorage for a resume token. If a token is present, fetches the
  // draft from the API and pre-fills the wizard at the right step.
  //
  // After this, draft state is owned by the user's typing + our persist()
  // function. We never refetch from the DB and override local state.
  // ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    const phone = params.get('phone') || params.get('p') || undefined;
    const utm_source = params.get('utm_source') || undefined;
    const utm_medium = params.get('utm_medium') || undefined;
    const utm_campaign = params.get('utm_campaign') || undefined;
    const cat = params.get('cat') || undefined;
    const urlToken = params.get('token');

    // Token priority: URL > localStorage
    let activeToken: string | null = urlToken;
    if (!activeToken && typeof window !== 'undefined') {
      try { activeToken = window.localStorage.getItem('madmona_draft_token'); } catch {}
    }

    // Seed from URL/localStorage synchronously
    setDraft(prev => ({
      ...prev,
      contact_phone: phone || prev.contact_phone,
      category_slug: cat || prev.category_slug,
      utm_source: utm_source || prev.utm_source,
      utm_medium: utm_medium || prev.utm_medium,
      utm_campaign: utm_campaign || prev.utm_campaign,
    }));

    if (!activeToken) return;
    setToken(activeToken);

    // Hydrate from DB — this is the ONLY place we fetch and merge.
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/listing-drafts?token=${activeToken}`);
        const json = await res.json();
        if (cancelled) return;

        if (!res.ok || !json.success || !json.draft) {
          // Stale token (deleted/expired). Clear it.
          if (typeof window !== 'undefined') {
            try { window.localStorage.removeItem('madmona_draft_token'); } catch {}
          }
          setToken(null);
          return;
        }

        const d = json.draft;

        // Conservative merge: DB values fill in MISSING local fields only.
        // This protects against clobbering anything the user has already
        // typed (though on initial mount they haven't typed anything yet,
        // so practically this is equivalent to taking DB values).
        setDraft(prev => ({
          ...prev,
          claim_token: activeToken,
          category_slug:  prev.category_slug   ?? (d.category_slug || undefined),
          title:          prev.title           ?? (d.title && d.title !== PLACEHOLDER_TITLE ? d.title : undefined),
          description:    prev.description     ?? (d.description || undefined),
          city:           prev.city            ?? (d.city || undefined),
          district:       prev.district        ?? (d.district || undefined),
          price:          prev.price           ?? (d.price ?? undefined),
          price_period:   prev.price_period    ?? (d.price_period || undefined),
          photos:         prev.photos          ?? (d.photos || undefined),
          contact_name:   prev.contact_name    ?? (d.contact_name || undefined),
          contact_phone:  prev.contact_phone   ?? (d.contact_phone || undefined),
          account_type:   prev.account_type    ?? (d.account_type || undefined),
          business_name:  prev.business_name   ?? (d.business_name || undefined),
        }));

        // Resume at the right step — but only if the DB has enough data
        // for that step to make sense. We DO NOT rewind further than the
        // user's last completed step.
        if (typeof d.current_step === 'number' && d.current_step >= 1 && d.current_step <= 5) {
          let resumeStep = d.current_step as Step;
          // If a "later" step has no data behind it, bring them to the earliest
          // unfilled step so they don't re-submit blanks.
          if (resumeStep >= 2 && !d.category_slug) resumeStep = 1;
          else if (resumeStep >= 3 && (!d.title || d.title === PLACEHOLDER_TITLE || !d.city)) resumeStep = 2;
          else if (resumeStep >= 4 && (!d.price || d.price <= 0)) resumeStep = 3;
          setStep(resumeStep);
        }
      } catch (e) {
        // Network glitch — proceed with empty draft, persist() will reconnect
        console.warn('Failed to hydrate draft from DB:', e);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← intentionally empty: hydration is a one-time-on-mount concern.

  // ──────────────────────────────────────────────────────────────────
  // PERSIST: send the current draft state to the API.
  //
  // - First call (no token): POST → creates draft, returns token.
  // - Subsequent calls: PATCH → updates draft.
  //
  // We trust local state. The response token is stored, but we do NOT
  // re-fetch the draft body — that's what caused the data-loss race in
  // the previous version of this component.
  // ──────────────────────────────────────────────────────────────────
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
      const newToken: string | null = json.token || token || null;
      if (newToken && !token) {
        setToken(newToken);
        if (typeof window !== 'undefined') {
          try { window.localStorage.setItem('madmona_draft_token', newToken); } catch {}
        }
      }
      // Keep accumulating local state with whatever was just sent.
      setDraft({ ...body, claim_token: newToken || undefined });
      return newToken;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'حصل خطأ، حاول تاني';
      setErrors({ form: msg });
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
                // NOTE: we do NOT clear localStorage here. That used to cause
                // duplicate drafts on accidental return visits. The success
                // page now clears it after a short delay (or on signup).
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
  const startingMainSlug = useMemo(() => {
    if (!value) return null;
    const asMain = MAIN_CATEGORIES.find((m) => m.slug === value);
    if (asMain) return asMain.slug;
    const asSub = MAIN_CATEGORIES.find((m) => m.subs.some((s) => s.slug === value));
    return asSub?.slug ?? null;
  }, [value]);

  const [selectedMain, setSelectedMain] = useState<string | null>(startingMainSlug);
  const main = MAIN_CATEGORIES.find((m) => m.slug === selectedMain);

  if (!main) {
    return (
      <section>
        <h2 className="text-lg font-semibold mb-1">إيه اللي عايز تأجره؟</h2>
        <p className="text-sm text-[#FAF7F0]/60 mb-6">اختار التصنيف الرئيسي</p>
        <div className="grid grid-cols-2 gap-3">
          {MAIN_CATEGORIES.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => setSelectedMain(c.slug)}
              className="p-5 rounded-2xl border text-right transition-all bg-[#FAF7F0]/5 border-[#FAF7F0]/15 hover:bg-[#FAF7F0]/10 hover:border-[#B8860B]/50"
            >
              <div className="text-3xl mb-2">{c.emoji}</div>
              <div className="font-semibold">{c.name_ar}</div>
              <div className="text-[10px] text-[#FAF7F0]/50 mt-1">{c.subs.length} نوع</div>
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section>
      <button
        type="button"
        onClick={() => setSelectedMain(null)}
        className="mb-3 inline-flex items-center gap-1 text-sm text-[#FAF7F0]/70 hover:text-[#B8860B] transition-colors"
      >
        ← رجوع للتصنيفات الرئيسية
      </button>
      <h2 className="text-lg font-semibold mb-1">
        <span className="text-2xl me-2">{main.emoji}</span>
        {main.name_ar}
      </h2>
      <p className="text-sm text-[#FAF7F0]/60 mb-6">اختار النوع الأقرب لما عندك</p>
      <div className="grid grid-cols-2 gap-3">
        {main.subs.map((s) => {
          const appearsUnderMains = MAIN_CATEGORIES
            .filter((m) => m.subs.some((sub) => sub.slug === s.slug))
            .map((m) => m.name_ar);
          const isCrossListed = appearsUnderMains.length > 1;

          return (
            <button
              key={s.slug}
              type="button"
              onClick={() => onSelect(s.slug)}
              className={`p-5 rounded-2xl border text-right transition-all ${
                value === s.slug
                  ? 'bg-[#B8860B] border-[#B8860B] text-[#1F5F3F]'
                  : 'bg-[#FAF7F0]/5 border-[#FAF7F0]/15 hover:bg-[#FAF7F0]/10 hover:border-[#B8860B]/50'
              }`}
            >
              <div className="text-3xl mb-2">{s.emoji}</div>
              <div className="font-semibold text-sm">{s.name_ar}</div>
              {isCrossListed && (
                <div className="mt-1.5 text-[10px] text-[#B8860B] font-bold leading-tight">
                  هيظهر في: {appearsUnderMains.join(' + ')}
                </div>
              )}
            </button>
          );
        })}
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
}: {
  draft: DraftPayload;
  errors: Record<string, string>;
  onSubmit: (patch: Partial<DraftPayload>) => void | Promise<void>;
  onBack: () => void;
  saving: boolean;
}) {
  // Strip the placeholder so users don't see it pre-filled
  const initialTitle = draft.title && draft.title !== PLACEHOLDER_TITLE ? draft.title : '';
  const [title, setTitle] = useState(initialTitle);
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

function validateBasics(patch: Partial<DraftPayload>, setErrors: (e: Record<string, string>) => void): boolean {
  const errs: Record<string, string> = {};
  if (!patch.title || patch.title.length < 5 || patch.title === PLACEHOLDER_TITLE) {
    errs.title = 'العنوان قصير، خليه على الأقل 5 حروف';
  }
  if (!patch.city) errs.city = 'اختار المحافظة';
  setErrors(errs);
  return Object.keys(errs).length === 0;
}

// =================================================
// STEP 3 — PRICING
// =================================================
function StepPricing({
  draft,
  errors,
  onSubmit,
  onBack,
  saving,
}: {
  draft: DraftPayload;
  errors: Record<string, string>;
  onSubmit: (patch: Partial<DraftPayload>) => void | Promise<void>;
  onBack: () => void;
  saving: boolean;
}) {
  const [period, setPeriod] = useState<string>(draft.price_period || 'daily');
  const [price, setPrice] = useState<number | ''>(draft.price ?? '');

  const periodLabel: Record<string, string> = {
    hourly: 'ساعة', daily: 'يوم', weekly: 'أسبوع', monthly: 'شهر',
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

      {price !== '' && period === 'daily' && Number(price) > 0 && (
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
function StepPhotos({
  draft, token, onSubmit, onSkip, onBack, saving,
}: {
  draft: DraftPayload;
  token: string | null;
  onSubmit: (photos: { url: string }[]) => void | Promise<void>;
  onSkip: () => void;
  onBack: () => void;
  saving: boolean;
}) {
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
        const res = await fetch('/api/listing-drafts/upload', { method: 'POST', body: fd });
        const json = await res.json();
        if (json.url) uploaded.push({ url: json.url });
      }
      setPhotos([...photos, ...uploaded]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'الصور مرفعتش، حاول تاني';
      setError(msg);
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
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
        <button type="button" onClick={onBack} className={btnSecondary}>← رجوع</button>
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
          <button type="button" onClick={onSkip} className={btnPrimary}>
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
function StepContact({
  draft, errors, onSubmit, onBack, saving,
}: {
  draft: DraftPayload;
  errors: Record<string, string>;
  onSubmit: (patch: Partial<DraftPayload>) => void | Promise<void>;
  onBack: () => void;
  saving: boolean;
}) {
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
          business_name: accountType === 'business' ? businessName : undefined,
        })}
        saving={saving}
        nextLabel="ابعت الليستنج 🚀"
      />
    </section>
  );
}

function validateContact(patch: Partial<DraftPayload>, setErrors: (e: Record<string, string>) => void): boolean {
  const errs: Record<string, string> = {};
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

function Field({ label, error, required, children }: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
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

function Nav({ onBack, onNext, saving, nextLabel }: {
  onBack: () => void;
  onNext: () => void;
  saving: boolean;
  nextLabel?: string;
}) {
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
