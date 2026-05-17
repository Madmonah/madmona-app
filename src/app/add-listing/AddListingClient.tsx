'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// ============================================================================
// Madmona "Add Listing First" — public, no-auth multi-step form
// Brand: deep green (#1F6F5F), gold (#2FA084), ivory (#FAF7F0)
//
// FIX (May 13 2026): Consolidated 2 racing useEffects into 1, removed the
// step-rollback bug that was bouncing users back to step 1 after their
// first POST, and tightened the merge logic so DB hydration never clobbers
// user typing. See system_runbook entry: add_listing_wizard_data_loss.
// ============================================================================

type Step = 1 | 2 | 3 | 4 | 5;

// Phase E (May 18 2026): wizard metadata for DB-driven placeholders & pricing.
// These fields come from categories.title_placeholder etc. When null/undefined
// the wizard falls back to hardcoded defaults — zero-regression guarantee.
type WizardMeta = {
  title_placeholder?: string | null;
  description_placeholder?: string | null;
  district_placeholder?: string | null;
  allowed_pricing_periods?: string[] | null;
  default_pricing_period?: string | null;
  pricing_unit_label?: string | null;
};

type SubCategory = {
  slug: string;
  name_ar: string;
  emoji: string;
} & WizardMeta;

export type MainCategory = {
  slug: string;
  name_ar: string;
  emoji: string;
  track?: 'rentals' | 'services' | 'hybrid' | null;
  subs: SubCategory[];
} & WizardMeta;

// Resolve effective wizard metadata for a category slug, with fallback chain:
//   sub-level value → main-level value → null (caller uses hardcoded default)
function getCategoryWizardMeta(
  categorySlug: string | undefined | null,
  categories: MainCategory[],
): WizardMeta {
  if (!categorySlug) return {};
  // Try sub first (more specific)
  for (const main of categories) {
    const sub = main.subs.find((s) => s.slug === categorySlug);
    if (sub) {
      return {
        title_placeholder: sub.title_placeholder ?? main.title_placeholder ?? null,
        description_placeholder: sub.description_placeholder ?? main.description_placeholder ?? null,
        district_placeholder: sub.district_placeholder ?? main.district_placeholder ?? null,
        allowed_pricing_periods: sub.allowed_pricing_periods ?? main.allowed_pricing_periods ?? null,
        default_pricing_period: sub.default_pricing_period ?? main.default_pricing_period ?? null,
        pricing_unit_label: sub.pricing_unit_label ?? main.pricing_unit_label ?? null,
      };
    }
  }
  // Fallback to main-level if user selected a main directly
  const main = categories.find((m) => m.slug === categorySlug);
  if (main) {
    return {
      title_placeholder: main.title_placeholder ?? null,
      description_placeholder: main.description_placeholder ?? null,
      district_placeholder: main.district_placeholder ?? null,
      allowed_pricing_periods: main.allowed_pricing_periods ?? null,
      default_pricing_period: main.default_pricing_period ?? null,
      pricing_unit_label: main.pricing_unit_label ?? null,
    };
  }
  return {};
}

// ============================================================================
// BEAUTY TYPES + HELPERS (May 14 2026)
// Beauty categories use a different pricing model (per service / per session /
// per package) and offer suggested add-ons defined per sub-category in the DB
// attribute_schema. The wizard's StepPricing reads these and renders a
// beauty-specific UI when the selected category is beauty or a beauty sub.
// ============================================================================
export type AddonSuggestion = {
  slug: string;
  name_ar: string;
  emoji?: string;
  default_price_egp: number;
};

export type Addon = {
  slug: string;
  name_ar: string;
  emoji?: string;
  price_egp: number;
};

export type BeautyPriceUnit = 'per_service' | 'per_session' | 'per_package';

export type BeautySchema = {
  price_unit: BeautyPriceUnit;
  suggested_addons: AddonSuggestion[];
};

const BEAUTY_SUB_SLUGS = new Set([
  'bridal-beauty', 'makeup-artists', 'hair-stylists', 'nail-care',
  'skincare-facial', 'brows-lashes', 'hair-removal', 'massage-spa',
]);

function isBeautyCategory(slug?: string | null): boolean {
  return !!slug && (slug === 'beauty' || BEAUTY_SUB_SLUGS.has(slug));
}

// MAIN_CATEGORIES removed (May 17 2026): all categories are now loaded
// from the DB via getDBExtraCategories in page.tsx. The wizard is fully
// DB-driven. Cross-listing (a sub appearing under multiple mains) is
// handled via the categories.also_show_in column.
// See system_runbook: categories_db_driven_consolidation_may17.

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
  attributes?: Record<string, unknown> & { addons?: Addon[] };
}

// Treat "(جاري التحرير)" as no real title so it doesn't show up in form fields
const PLACEHOLDER_TITLE = '(جاري التحرير)';

export default function AddListingClient({
  dbExtraCategories = [],
  beautySchemas = {},
}: {
  dbExtraCategories?: MainCategory[];
  beautySchemas?: Record<string, BeautySchema>;
} = {}) {
  return (
    <Suspense fallback={null}>
      <AddListingPageInner
        dbExtraCategories={dbExtraCategories}
        beautySchemas={beautySchemas}
      />
    </Suspense>
  );
}

function AddListingPageInner({
  dbExtraCategories,
  beautySchemas,
}: {
  dbExtraCategories: MainCategory[];
  beautySchemas: Record<string, BeautySchema>;
}) {
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
        // CRITICAL FIX (May 13 2026): rewind logic now applies to step 5 too.
        // Old chain used `else if` so step 5 returning without data fell through.
        if (typeof d.current_step === 'number' && d.current_step >= 1 && d.current_step <= 5) {
          let resumeStep = d.current_step as Step;
          // Cascade rewind — each check independent so step 5 with no title still goes back to step 2.
          if (resumeStep >= 4 && (!d.price || d.price <= 0)) resumeStep = 3;
          if (resumeStep >= 3 && (!d.title || d.title === PLACEHOLDER_TITLE || !d.city)) resumeStep = 2;
          if (resumeStep >= 2 && !d.category_slug) resumeStep = 1;
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
    <div dir="rtl" lang="ar" className="min-h-screen bg-[#FAFAF7] text-[#1A2E26]">
      {/* Header */}
      <header className="px-5 pt-6 pb-4 border-b border-[#E5E5E0]">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold tracking-tight">مضمونة</div>
            <span className="text-xs text-[#1F6F5F] uppercase tracking-widest">MADMONA</span>
          </div>
          <a href="/" className="text-xs text-gray-600 hover:text-[#1A2E26]">
            ← الرئيسية
          </a>
        </div>
        <h1 className="text-xl font-semibold mt-5 max-w-2xl mx-auto">
          أَجِّر معانا — أضف ليستنجك في 60 ثانية
        </h1>
        <p className="text-sm text-gray-600 mt-1 max-w-2xl mx-auto">
          خطوة واحدة من 5 — مش لازم تعمل حساب دلوقتي
        </p>

        {/* Progress bar */}
        <div className="mt-4 max-w-2xl mx-auto">
          <div className="h-1 bg-[#F5F4F0] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1F6F5F] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-2 text-center">
            خطوة {step} من 5
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="px-5 py-8 max-w-2xl mx-auto">
        {errors.form && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm">
            {errors.form}
          </div>
        )}

        {step === 1 && (
          <StepCategory
            value={draft.category_slug}
            categories={dbExtraCategories}
            onSelect={async (slug) => {
              // CRITICAL FIX (May 13 2026): only advance if persist actually succeeded.
              const t = await persist({ category_slug: slug });
              if (t) next();
            }}
          />
        )}

        {step === 2 && (
          <StepBasics
            draft={draft}
            errors={errors}
            categories={dbExtraCategories}
            onSubmit={async (patch) => {
              const ok = validateBasics(patch, setErrors);
              if (!ok) return;
              // CRITICAL FIX (May 13 2026): only advance if persist actually succeeded.
              // Old code: await persist; next(); — caused silent data loss when API failed.
              const t = await persist(patch);
              if (t) next();
            }}
            onBack={back}
            onChangeCategory={() => setStep(1)}
            saving={saving}
          />
        )}

        {step === 3 && (
          <StepPricing
            draft={draft}
            errors={errors}
            categories={dbExtraCategories}
            beautySchemas={beautySchemas}
            onSubmit={async (patch) => {
              if (!patch.price || patch.price <= 0) {
                setErrors({ price: 'حط سعر صحيح من فضلك' });
                return;
              }
              // CRITICAL FIX (May 13 2026): only advance if persist actually succeeded.
              const t = await persist(patch);
              if (t) next();
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
              // CRITICAL FIX (May 13 2026): only advance if persist actually succeeded.
              const t = await persist({ photos });
              if (t) next();
            }}
            onUpload={async (photos) => {
              // AUTO-SAVE (May 13 2026 fix for photo data-loss):
              // محمد طاهر complaint: "رفعت الصور مرات كتير، فيه مشكلة عندكم"
              // Root cause: local component state held the uploaded photos
              // but draft.photos in DB stayed empty until user clicked Continue.
              // If they closed the page or refreshed first, photos were lost.
              // Now every successful upload persists immediately — no
              // Continue click needed for the photos to survive.
              await persist({ photos });
            }}
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
      <footer className="px-5 pb-8 mt-4 max-w-2xl mx-auto text-center text-xs text-gray-500">
        🛡 حماية كاملة • 💰 دفع سريع • 📞 دعم 24/7 • عمولة 10% (5% للشركات)
      </footer>
    </div>
  );
}

// =================================================
// STEP 1 — CATEGORY (with track tabs for hierarchy)
// May 17 2026: Added track tabs (الكل/إيجار/خدمات/هايبرد) above the mains
// grid so 27 categories don't overwhelm the user. Same DB, cleaner UX.
// =================================================
type TrackTab = 'all' | 'rentals' | 'services' | 'hybrid';

const TRACK_LABELS: Record<TrackTab, string> = {
  all: 'الكل',
  rentals: 'إيجار',
  services: 'خدمات',
  hybrid: 'هايبرد',
};

const TRACK_EMOJI: Record<TrackTab, string> = {
  all: '✨',
  rentals: '🏠',
  services: '🛠️',
  hybrid: '💒',
};

function StepCategory({
  value,
  onSelect,
  categories,
}: {
  value?: string;
  onSelect: (slug: string) => void;
  categories: MainCategory[];
}) {
  const startingMainSlug = useMemo(() => {
    if (!value) return null;
    const asMain = categories.find((m) => m.slug === value);
    if (asMain) return asMain.slug;
    const asSub = categories.find((m) => m.subs.some((s) => s.slug === value));
    return asSub?.slug ?? null;
  }, [value, categories]);

  const [selectedMain, setSelectedMain] = useState<string | null>(startingMainSlug);
  const [activeTrack, setActiveTrack] = useState<TrackTab>('all');
  const main = categories.find((m) => m.slug === selectedMain);

  // Filter mains by selected track tab
  const visibleMains = useMemo(() => {
    if (activeTrack === 'all') return categories;
    return categories.filter((c) => c.track === activeTrack);
  }, [activeTrack, categories]);

  if (!main) {
    return (
      <section>
        <h2 className="text-lg font-semibold mb-1">إيه اللي عايز تأجره؟</h2>
        <p className="text-sm text-gray-500 mb-5">اختار التصنيف الرئيسي</p>

        {/* Track tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-5 px-5">
          {(['all', 'rentals', 'services', 'hybrid'] as TrackTab[]).map((t) => {
            const count = t === 'all'
              ? categories.length
              : categories.filter((c) => c.track === t).length;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setActiveTrack(t)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                  activeTrack === t
                    ? 'bg-[#1F6F5F] border-[#1F6F5F] text-white'
                    : 'bg-white border-[#E5E5E0] text-gray-700 hover:bg-[#F5F4F0]'
                }`}
              >
                <span>{TRACK_EMOJI[t]}</span>
                <span>{TRACK_LABELS[t]}</span>
                <span className={`text-[10px] ${activeTrack === t ? 'opacity-80' : 'text-gray-400'}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        {visibleMains.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-500">
            مفيش تصنيفات في التبويب ده دلوقتي
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {visibleMains.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => setSelectedMain(c.slug)}
                className="p-5 rounded-2xl border text-right transition-all bg-white border-[#E5E5E0] hover:bg-[#F5F4F0] hover:border-emerald-300"
              >
                <div className="text-3xl mb-2">{c.emoji}</div>
                <div className="font-semibold">{c.name_ar}</div>
                <div className="text-[10px] text-gray-500 mt-1">{c.subs.length} نوع</div>
              </button>
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <section>
      <button
        type="button"
        onClick={() => setSelectedMain(null)}
        className="mb-3 inline-flex items-center gap-1 text-sm text-gray-600 hover:text-[#1F6F5F] transition-colors"
      >
        ← رجوع للتصنيفات الرئيسية
      </button>
      <h2 className="text-lg font-semibold mb-1">
        <span className="text-2xl me-2">{main.emoji}</span>
        {main.name_ar}
      </h2>
      <p className="text-sm text-gray-500 mb-6">اختار النوع الأقرب لما عندك</p>
      <div className="grid grid-cols-2 gap-3">
        {main.subs.map((s) => {
          const appearsUnderMains = categories
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
                  ? 'bg-[#1F6F5F] border-[#1F6F5F] text-white'
                  : 'bg-white border-[#E5E5E0] hover:bg-[#F5F4F0] hover:border-emerald-300'
              }`}
            >
              <div className="text-3xl mb-2">{s.emoji}</div>
              <div className="font-semibold text-sm">{s.name_ar}</div>
              {isCrossListed && (
                <div className="mt-1.5 text-[10px] text-[#1F6F5F] font-bold leading-tight">
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
// CATEGORY CHIP — shows selected category at top of step 2-5
// with a "تغيير الفئة" button to return to step 1.
// Added May 16 2026 (Mohamed: "اخترت شاليه وحبيت اغير لشقة مفيش زرار يرجعني").
// =================================================
function CategoryChip({
  slug,
  categories,
  onChange,
}: {
  slug?: string | null;
  categories: MainCategory[];
  onChange: () => void;
}) {
  if (!slug) return null;
  // Try to match as a main category first
  const main = categories.find((m) => m.slug === slug);
  // Otherwise search subs
  let display: { emoji: string; name: string } | null = null;
  if (main) {
    display = { emoji: main.emoji, name: main.name_ar };
  } else {
    for (const m of categories) {
      const s = m.subs.find((x) => x.slug === slug);
      if (s) {
        display = { emoji: s.emoji, name: `${m.name_ar} · ${s.name_ar}` };
        break;
      }
    }
  }
  if (!display) return null;
  return (
    <div className="mb-5 flex items-center justify-between rounded-xl bg-[#F5F4F0] border border-[#E5E5E0] px-4 py-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-lg leading-none">{display.emoji}</span>
        <span className="font-medium">{display.name}</span>
      </div>
      <button
        type="button"
        onClick={onChange}
        className="text-xs text-[#1F6F5F] hover:text-[#1F6F5F]/80 font-medium whitespace-nowrap"
      >
        تغيير الفئة ←
      </button>
    </div>
  );
}

// =================================================
// STEP 2 — BASIC DETAILS
// =================================================
function StepBasics({
  draft,
  errors,
  categories,
  onSubmit,
  onBack,
  onChangeCategory,
  saving,
}: {
  draft: DraftPayload;
  errors: Record<string, string>;
  categories: MainCategory[];
  onSubmit: (patch: Partial<DraftPayload>) => void | Promise<void>;
  onBack: () => void;
  onChangeCategory: () => void;
  saving: boolean;
}) {
  // Strip the placeholder so users don't see it pre-filled
  const initialTitle = draft.title && draft.title !== PLACEHOLDER_TITLE ? draft.title : '';
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(draft.description || '');
  const [city, setCity] = useState(draft.city || '');
  const [district, setDistrict] = useState(draft.district || '');

  // Phase E (May 18 2026): use category-specific placeholders from DB.
  // Fallback to original hardcoded values when meta is null (e.g. new categories
  // not yet filled, or DB read failure).
  const meta = getCategoryWizardMeta(draft.category_slug, categories);
  const titlePh = meta.title_placeholder || 'مثلاً: شاليه في مراسي بحر مباشر، 4 غرف';
  const descPh = meta.description_placeholder || 'إيه اللي بيميز اللي عندك؟ (المسبح، الإطلالة، الموقع...)';
  const districtPh = meta.district_placeholder || 'مثلاً: مراسي، التجمع الخامس، الزمالك...';

  return (
    <section>
      <h2 className="text-lg font-semibold mb-1">معلومات أساسية</h2>
      <p className="text-sm text-gray-500 mb-6">وصف قصير، مكان، وفينك</p>

      <CategoryChip slug={draft.category_slug} categories={categories} onChange={onChangeCategory} />

      <Field label="عنوان الإعلان" error={errors.title} required>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={titlePh}
          className={inputCls}
        />
      </Field>

      <Field label="وصف مختصر" error={errors.description}>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder={descPh}
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
          placeholder={districtPh}
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
  categories,
  onSubmit,
  onBack,
  saving,
  beautySchemas,
}: {
  draft: DraftPayload;
  errors: Record<string, string>;
  categories: MainCategory[];
  onSubmit: (patch: Partial<DraftPayload>) => void | Promise<void>;
  onBack: () => void;
  saving: boolean;
  beautySchemas: Record<string, BeautySchema>;
}) {
  const isBeauty = isBeautyCategory(draft.category_slug);
  const schema = isBeauty && draft.category_slug ? beautySchemas[draft.category_slug] : undefined;
  const suggestedAddons = schema?.suggested_addons || [];

  // Phase E (May 18 2026): expanded period labels — added per_event, per_visit
  // to match the new DB-driven allowed_pricing_periods values.
  const periodLabel: Record<string, string> = {
    hourly: 'ساعة', daily: 'يوم', weekly: 'أسبوع', monthly: 'شهر',
    per_service: 'الخدمة', per_session: 'الجلسة', per_package: 'الباكدج',
    per_event: 'الحدث', per_visit: 'الزيارة',
  };

  // Phase E: read category-specific pricing periods from DB. Beauty keeps its
  // existing per_service/session/package flow (already DB-driven via beauty
  // schemas). For everything else, use the category's allowed_pricing_periods
  // if set; otherwise fall back to the original hardcoded daily/weekly etc.
  const meta = getCategoryWizardMeta(draft.category_slug, categories);

  const periodOptions: string[] = isBeauty
    ? ['per_service', 'per_session', 'per_package']
    : (meta.allowed_pricing_periods && meta.allowed_pricing_periods.length > 0
        ? meta.allowed_pricing_periods
        : ['hourly', 'daily', 'weekly', 'monthly']);

  const defaultPeriod = isBeauty
    ? (schema?.price_unit || 'per_service')
    : (meta.default_pricing_period || 'daily');
  const [period, setPeriod] = useState<string>(() => {
    if (draft.price_period && periodOptions.includes(draft.price_period)) {
      return draft.price_period;
    }
    return defaultPeriod;
  });
  const [price, setPrice] = useState<number | ''>(draft.price ?? '');

  // ─── Add-ons state ────────────────────────────────────────────────
  // Supplier picks which suggested add-ons they offer + can override prices.
  // Final selection is saved to draft.attributes.addons.
  const initialEnabled = useMemo(() => {
    const existing = draft.attributes?.addons || [];
    return new Set<string>(existing.map((a) => a.slug));
  }, [draft.attributes]);

  const initialPrices = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of suggestedAddons) map[s.slug] = s.default_price_egp;
    const existing = draft.attributes?.addons || [];
    for (const a of existing) map[a.slug] = a.price_egp;
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.attributes, suggestedAddons.length]);

  const [enabledAddons, setEnabledAddons] = useState<Set<string>>(initialEnabled);
  const [addonPrices, setAddonPrices] = useState<Record<string, number>>(initialPrices);

  function toggleAddon(slug: string) {
    setEnabledAddons((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function setAddonPrice(slug: string, p: number) {
    setAddonPrices((prev) => ({ ...prev, [slug]: p }));
  }

  function buildAddonsPatch(): Addon[] {
    return suggestedAddons
      .filter((s) => enabledAddons.has(s.slug))
      .map((s) => ({
        slug: s.slug,
        name_ar: s.name_ar,
        emoji: s.emoji,
        price_egp: addonPrices[s.slug] ?? s.default_price_egp,
      }));
  }

  function handleNext() {
    const patch: Partial<DraftPayload> = {
      price: Number(price),
      price_period: period,
    };
    if (isBeauty) {
      patch.attributes = {
        ...(draft.attributes || {}),
        addons: buildAddonsPatch(),
      };
    }
    onSubmit(patch);
  }

  return (
    <section>
      <h2 className="text-lg font-semibold mb-1">
        {isBeauty ? 'سعر الخدمة' : 'السعر'}
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        {isBeauty ? 'بكام بتقدم الخدمة الأساسية؟' : 'حضرتك بتأجره بكام؟'}
      </p>

      <Field label={isBeauty ? 'نوع السعر' : 'مدة الإيجار'} required>
        <div className={`grid gap-2 ${isBeauty ? 'grid-cols-3' : 'grid-cols-4'}`}>
          {periodOptions.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`py-3 rounded-xl border text-sm transition-all ${
                period === p
                  ? 'bg-[#1F6F5F] border-[#1F6F5F] text-white font-semibold'
                  : 'bg-white border-[#E5E5E0]'
              }`}
            >
              {periodLabel[p]}
            </button>
          ))}
        </div>
      </Field>

      <Field
        label={
          meta.pricing_unit_label
            ? meta.pricing_unit_label
            : (isBeauty
                ? `سعر ${periodLabel[period] || period} بالجنيه`
                : `السعر بالجنيه لكل ${periodLabel[period] || period}`)
        }
        error={errors.price}
        required
      >
        <div className="relative">
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="مثلاً: 1500"
            className={inputCls + ' pl-16'}
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
            ج.م
          </span>
        </div>
      </Field>

      {/* Phase E (May 18 2026): weekly projection for daily rentals (existing UX) */}
      {!isBeauty && price !== '' && period === 'daily' && Number(price) > 0 && (
        <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm">
          💰 لو حد أجره أسبوع كامل = <strong>{Number(price) * 7} جنيه</strong>
          <br />
          • نصيب حضرتك (فرد، 10% عمولة): <strong>{Math.round(Number(price) * 7 * 0.9)} جنيه</strong>
          <br />
          • نصيب حضرتك (شركة، 5% عمولة): <strong>{Math.round(Number(price) * 7 * 0.95)} جنيه</strong>
        </div>
      )}

      {/* Phase E: per-unit commission preview — shown for beauty AND for any
          non-daily non-beauty period (lawyers per_session, photographers
          per_event, etc). Previously only beauty had this preview. */}
      {price !== '' && Number(price) > 0 && (isBeauty || period !== 'daily') && (
        <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm">
          💰 من كل {periodLabel[period] || period}:
          <br />
          • نصيب حضرتك (فرد، 10% عمولة): <strong>{Math.round(Number(price) * 0.9)} جنيه</strong>
          <br />
          • نصيب حضرتك (شركة، 5% عمولة): <strong>{Math.round(Number(price) * 0.95)} جنيه</strong>
        </div>
      )}

      {/* Beauty: add-ons section */}
      {isBeauty && suggestedAddons.length > 0 && (
        <div className="mt-8 pt-6 border-t border-[#E5E5E0]">
          <h3 className="text-base font-semibold mb-1">✨ خدمات إضافية اختيارية</h3>
          <p className="text-xs text-gray-500 mb-4">
            العميل يقدر يضيفها لحجزه. شيّك على اللي بتقدمه وعدّل السعر لو حابب.
          </p>
          <div className="grid grid-cols-1 gap-2">
            {suggestedAddons.map((addon) => {
              const isEnabled = enabledAddons.has(addon.slug);
              return (
                <div
                  key={addon.slug}
                  className={`p-3 rounded-xl border transition-all ${
                    isEnabled
                      ? 'bg-emerald-50 border-emerald-300'
                      : 'bg-white border-[#E5E5E0]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleAddon(addon.slug)}
                      className={`w-6 h-6 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                        isEnabled
                          ? 'bg-[#1F6F5F] border-[#1F6F5F]'
                          : 'bg-transparent border-[#E5E5E0]'
                      }`}
                      aria-pressed={isEnabled}
                      aria-label={`${isEnabled ? 'الغاء' : 'اختيار'} ${addon.name_ar}`}
                    >
                      {isEnabled && <span className="text-white text-xs font-bold">✓</span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleAddon(addon.slug)}
                      className="flex-1 flex items-center gap-2 text-right"
                    >
                      {addon.emoji && <span className="text-lg flex-shrink-0">{addon.emoji}</span>}
                      <span className="text-sm font-medium">{addon.name_ar}</span>
                    </button>
                    <div className="relative flex-shrink-0">
                      <input
                        type="number"
                        value={addonPrices[addon.slug] ?? addon.default_price_egp}
                        onChange={(e) => setAddonPrice(addon.slug, Number(e.target.value) || 0)}
                        disabled={!isEnabled}
                        className={`w-24 p-2 rounded-lg text-sm text-left pl-9 ${
                          isEnabled
                            ? 'bg-[#F5F4F0] border border-[#E5E5E0] text-[#1A2E26]'
                            : 'bg-white border border-transparent opacity-50 text-gray-500'
                        } focus:outline-none focus:border-[#1F6F5F]`}
                      />
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 pointer-events-none">
                        ج.م
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-xs text-gray-500 text-center">
            {enabledAddons.size === 0
              ? 'لسة معديتش أي خدمة إضافية'
              : `${enabledAddons.size} ${enabledAddons.size === 1 ? 'خدمة إضافية' : 'خدمات إضافية'} مختارة`}
          </div>
        </div>
      )}

      <Nav onBack={onBack} onNext={handleNext} saving={saving} />
    </section>
  );
}

// =================================================
// STEP 4 — PHOTOS
// May 13 2026 fix: photos are now REQUIRED (was skippable).
// Rationale: 14 of 14 claimed drafts had 0 photos → all stuck in
// pending_review, never visible publicly. Forcing ≥1 photo at the
// wizard means every published listing has at least a hero image,
// which dramatically improves marketplace appeal and conversion.
// =================================================
function StepPhotos({
  draft, token, onSubmit, onUpload, onBack, saving,
}: {
  draft: DraftPayload;
  token: string | null;
  onSubmit: (photos: { url: string }[]) => void | Promise<void>;
  onUpload?: (photos: { url: string }[]) => void | Promise<void>;
  onBack: () => void;
  saving: boolean;
}) {
  const [photos, setPhotos] = useState<{ url: string; caption?: string }[]>(draft.photos || []);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSaving, setAutoSaving] = useState(false);

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
      const newPhotos = [...photos, ...uploaded];
      setPhotos(newPhotos);
      // AUTO-SAVE: persist to DB immediately so photos survive even if user
      // closes/refreshes the page before clicking Continue.
      if (onUpload && uploaded.length > 0) {
        setAutoSaving(true);
        try { await onUpload(newPhotos); }
        catch (e) { console.warn('autosave failed (photo still in storage):', e); }
        finally { setAutoSaving(false); }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'الصور مرفعتش، حاول تاني';
      setError(msg);
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto(idx: number) {
    const next = photos.filter((_, i) => i !== idx);
    setPhotos(next);
    // AUTO-SAVE removals too, same reasoning as upload.
    if (onUpload) {
      setAutoSaving(true);
      try { await onUpload(next); }
      catch (e) { console.warn('autosave (remove) failed:', e); }
      finally { setAutoSaving(false); }
    }
  }

  return (
    <section>
      <h2 className="text-lg font-semibold mb-1">الصور</h2>
      <p className="text-sm text-gray-500 mb-6">
        ارفع صورة واحدة على الأقل عشان نقدر ننشر إعلانك فوراً. الإعلانات بصور بتاخد حجوزات أسرع بـ 7 مرات.
      </p>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {photos.map((p, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
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
        <div className="border-2 border-dashed border-[#D1D5DB] rounded-2xl p-8 text-center cursor-pointer hover:border-[#1F6F5F] transition-colors">
          <div className="text-3xl mb-2">📸</div>
          <div className="font-semibold">{uploading ? 'جاري الرفع...' : 'اضغط هنا لإضافة صور'}</div>
          <div className="text-xs text-gray-500 mt-1">JPG/PNG، حتى 8 صور</div>
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

      {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
      {autoSaving && (
        <div className="mt-2 text-xs text-gray-500">
          ⏳ جاري حفظ الصور…
        </div>
      )}
      {!autoSaving && !error && photos.length > 0 && (
        <div className="mt-2 text-xs text-emerald-700">
          ✓ {photos.length} {photos.length === 1 ? 'صورة محفوظة' : 'صور محفوظة'}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mt-6">
        <button type="button" onClick={onBack} className={btnSecondary}>← رجوع</button>
        <button
          type="button"
          onClick={() => onSubmit(photos)}
          disabled={saving || uploading || photos.length === 0}
          className={btnPrimary}
          title={photos.length === 0 ? 'ارفع صورة واحدة على الأقل' : undefined}
        >
          {saving ? '...' : photos.length === 0 ? '📸 ارفع صورة الأول' : 'كمل →'}
        </button>
      </div>
      {photos.length === 0 && (
        <p className="text-xs text-gray-500 mt-3 text-center">
          💡 صورة واحدة كافية عشان تبدأ — تقدر تضيف باقي الصور من حسابك بعدين.
        </p>
      )}
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
      <p className="text-sm text-gray-500 mb-6">
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
                ? 'bg-[#1F6F5F] border-[#1F6F5F] text-white'
                : 'bg-white border-[#E5E5E0]'
            }`}
          >
            <div className="font-semibold">فرد</div>
            <div className={`text-xs mt-1 ${accountType === 'individual' ? 'text-white/70' : 'text-gray-500'}`}>عمولة 10%</div>
          </button>
          <button
            type="button"
            onClick={() => setAccountType('business')}
            className={`p-4 rounded-xl border text-right transition-all ${
              accountType === 'business'
                ? 'bg-[#1F6F5F] border-[#1F6F5F] text-white'
                : 'bg-white border-[#E5E5E0]'
            }`}
          >
            <div className="font-semibold">شركة</div>
            <div className={`text-xs mt-1 ${accountType === 'business' ? 'text-white/70' : 'text-gray-500'}`}>عمولة 5%</div>
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

      <div className="mt-6 p-4 rounded-xl bg-white border border-[#E5E5E0] text-xs text-gray-600">
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
  'w-full p-3 rounded-xl bg-white border border-[#E5E5E0] text-[#1A2E26] placeholder:text-gray-400 focus:outline-none focus:border-[#1F6F5F]';

const btnPrimary =
  'py-3 px-4 rounded-xl bg-[#1F6F5F] text-white font-semibold hover:bg-[#1F6F5F]/90 disabled:opacity-50 transition-all';

const btnSecondary =
  'py-3 px-4 rounded-xl bg-white border border-[#E5E5E0] hover:bg-[#F5F4F0] transition-all';

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
        {required && <span className="text-[#1F6F5F] mr-1">*</span>}
      </label>
      {children}
      {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
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
