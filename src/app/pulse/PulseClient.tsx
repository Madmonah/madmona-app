'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

// =====================================================================
// PULSE CLIENT (May 16 2026)
// One screen, four mechanics:
//   1. Streak badge       (top, sticky-feeling)
//   2. Daily Drop hero    (with countdown to midnight)
//   3. Live activity      (auto-scrolling ticker)
//   4. Personalized picks (3 cards) — falls back to trending
// =====================================================================

interface StreakState {
  current_streak: number;
  longest_streak: number;
  total_visits: number;
  last_visit_date: string;
  rewards_claimed?: string[];
}

interface DailyDrop {
  id: string;
  hero_title_ar: string;
  hero_subtitle_ar: string | null;
  discount_label_ar: string | null;
  cta_label_ar: string;
  cta_url: string;
  hero_image_url: string | null;
  badge_color: string | null;
  views_count: number;
  sponsorship_type?: 'supplier_promo' | 'sponsored_ad' | 'madmona_curated';
  payer_brand_name?: string | null;
}

interface ActivityEvent {
  id: string;
  event_type: string;
  display_message_ar: string;
  emoji: string;
  city: string | null;
  created_at: string;
}

interface Pick {
  listing_id: string;
  reason_ar: string | null;
  rank: number;
  title: string;
  slug: string;
  city: string | null;
  photo_url: string | null;
}

interface PulseFeed {
  streak: StreakState | null;
  drop: DailyDrop | null;
  activity: ActivityEvent[];
  picks: Pick[];
}

// Milestone metadata used by the streak badge + reward modal
const MILESTONES = [
  { day: 3,   label: '٣ أيام',  emoji: '🌱', reward_ar: 'خصم ٥٪ على أول حجز' },
  { day: 7,   label: 'أسبوع',  emoji: '🔥', reward_ar: 'خصم ١٠٪ + بادج نار' },
  { day: 14,  label: 'أسبوعين',emoji: '⚡', reward_ar: 'خصم ١٥٪ + ميزة "ميمبر نشيط"' },
  { day: 30,  label: 'شهر',    emoji: '👑', reward_ar: 'باكدج ميمبر مميز + خصومات حصرية' },
  { day: 60,  label: 'شهرين',  emoji: '💎', reward_ar: 'وصول لعروض VIP قبل الجميع' },
  { day: 100, label: '١٠٠ يوم',emoji: '🏆', reward_ar: 'كاش باك ١٠٠ ج.م + درجة Diamond' },
  { day: 365, label: 'سنة',    emoji: '🌟', reward_ar: 'الأسطورة — عضوية مدى الحياة' },
];

function nextMilestone(streak: number): { day: number; label: string; emoji: string; reward_ar: string } | null {
  return MILESTONES.find(m => m.day > streak) || null;
}

export default function PulseClient() {
  const router = useRouter();
  const [feed, setFeed] = useState<PulseFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [showRewardModal, setShowRewardModal] = useState<string | null>(null);
  const visitRecordedRef = useRef(false);

  // ── DATA FETCH + STREAK RECORD ──
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      const userId = session?.user?.id ?? null;
      setAuthUserId(userId);

      // Record visit (signed-in users only) — fires before fetching so the
      // returned feed includes the just-updated streak.
      if (userId && !visitRecordedRef.current) {
        visitRecordedRef.current = true;
        try {
          const { data: visitResult } = await supabaseBrowser.rpc('record_user_visit', { p_user_id: userId });
          if (visitResult?.new_reward) {
            // Schedule modal to appear after page paints
            setTimeout(() => setShowRewardModal(visitResult.new_reward), 800);
          }
        } catch (e) { /* non-fatal */ }
      }

      // @ts-expect-error rpc type
      const { data } = await supabaseBrowser.rpc('get_pulse_feed', { p_user_id: userId });
      setFeed(data as PulseFeed);
      setLoading(false);
    })();
  }, []);

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-[#FAFAF7] text-[#1A2E26]">
      <PulseHeader streak={feed?.streak ?? null} />

      <main className="px-5 py-6 max-w-3xl mx-auto space-y-6 pb-24">
        {/* 0. World Cup 2026 live scores banner */}
        <Link
          href="/world-cup"
          className="flex items-center gap-3 bg-gradient-to-l from-[#FA8125] to-[#2FA084] text-white rounded-2xl px-4 py-3.5 shadow-card hover:shadow-luxe hover:-translate-y-0.5 transition-all"
        >
          <span className="text-2xl">⚽</span>
          <span className="flex-1">
            <span className="block text-sm font-black">نتايج كأس العالم 2026 لايف</span>
            <span className="block text-[11px] font-bold text-white/80 mt-0.5">ماتشات النهارده + النتايج لحظة بلحظة 🔴</span>
          </span>
          <span className="bg-white/15 text-[10px] font-black px-2.5 py-1 rounded-full animate-pulse">LIVE</span>
        </Link>

        {/* 1. Daily Drop — primary FOMO mechanic */}
        {loading ? <SkeletonCard h="h-64" /> : (
          feed?.drop ? <DailyDropHero drop={feed.drop} /> : <NoDropToday />
        )}

        {/* 2. Streak progress block */}
        {!loading && feed?.streak && (
          <StreakProgress streak={feed.streak} />
        )}
        {!loading && !feed?.streak && authUserId === null && (
          <StreakInviteSignIn />
        )}

        {/* 3. Live activity ticker */}
        {loading ? <SkeletonCard h="h-48" /> : (
          <LiveActivitySection events={feed?.activity ?? []} />
        )}

        {/* 4. Personalized picks (or trending fallback) */}
        {loading ? <SkeletonCard h="h-72" /> : (
          <DailyPicks picks={feed?.picks ?? []} isSignedIn={!!authUserId} />
        )}
      </main>

      {/* Reward modal */}
      {showRewardModal && (
        <RewardUnlockedModal
          rewardKey={showRewardModal}
          onClose={() => setShowRewardModal(null)}
        />
      )}
    </div>
  );
}

// =====================================================================
// HEADER (with streak chip)
// =====================================================================
function PulseHeader({ streak }: { streak: StreakState | null }) {
  return (
    <header className="px-5 pt-6 pb-4 border-b border-[#E5E5E0] bg-white/80 backdrop-blur-sm sticky top-0 z-20">
      <div className="flex items-center justify-between max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold tracking-tight">مضمونة</div>
          <span className="text-[10px] font-bold text-[#FA8125] bg-[#FA8125]/8 px-2 py-0.5 rounded-full uppercase tracking-widest">
            PULSE
          </span>
        </div>

        {streak && streak.current_streak > 0 ? (
          <div className="flex items-center gap-1.5 bg-gradient-to-l from-orange-400 to-amber-500 text-white px-3 py-1.5 rounded-full shadow-sm">
            <span className="text-lg leading-none">🔥</span>
            <span className="font-black text-sm leading-none">{streak.current_streak}</span>
            <span className="text-[10px] leading-none opacity-80">يوم</span>
          </div>
        ) : (
          <Link href="/" className="text-xs text-[#6B7280] hover:text-[#1A2E26]">← الرئيسية</Link>
        )}
      </div>
      <p className="text-xs text-[#9CA3AF] max-w-3xl mx-auto mt-2">
        صفقة اليوم • نشاط السوق لحظة بلحظة • اختيارات ليك مخصوصة
      </p>
    </header>
  );
}

// =====================================================================
// 1. DAILY DROP HERO — with countdown to midnight (FOMO engine)
// =====================================================================
function DailyDropHero({ drop }: { drop: DailyDrop }) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setTimeLeft(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const handleClick = async () => {
    // Fire-and-forget tracking
    try {
      // @ts-expect-error rpc type
      void supabaseBrowser.rpc('increment_deal_clicks', { deal_id: drop.id }).catch(() => {});
    } catch {}
    const isExternal = drop.cta_url.startsWith('http');
    if (isExternal) {
      window.open(drop.cta_url, '_blank', 'noopener,noreferrer');
    } else {
      router.push(drop.cta_url);
    }
  };

  const badgeColor = drop.badge_color || '#FA8125';

  return (
    <section
      className="relative overflow-hidden rounded-3xl shadow-luxe"
      style={{
        background: `linear-gradient(135deg, ${badgeColor} 0%, ${badgeColor}ee 50%, ${badgeColor}cc 100%)`,
      }}
    >
      {/* Decorative blurs */}
      <div className="absolute -top-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 p-6 md:p-8 text-white">
        <div className="flex items-center justify-between mb-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-[11px] font-bold uppercase tracking-widest">
            ⚡ DROP اليوم
          </span>
          {drop.discount_label_ar && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-white text-[12px] font-black rounded-full shadow-md"
              style={{ color: badgeColor }}>
              {drop.discount_label_ar}
            </span>
          )}
        </div>

        <h2 className="text-2xl md:text-3xl font-black mb-2 leading-tight">
          {drop.hero_title_ar}
        </h2>
        {drop.hero_subtitle_ar && (
          <p className="text-sm md:text-base text-white/85 mb-5">{drop.hero_subtitle_ar}</p>
        )}

        {/* Sponsorship attribution (May 16 2026) — transparency:
            Madmona never pays out of pocket. The label tells the user
            who's actually behind the offer. Required by Egypt advertising law
            for sponsored_ad entries, and builds trust on supplier_promo ones. */}
        {drop.sponsorship_type === 'sponsored_ad' && (
          <div className="mb-4 inline-flex items-center gap-1.5 text-[10px] text-white/70">
            <span className="px-1.5 py-0.5 bg-white/15 rounded text-[9px] font-bold uppercase tracking-widest">Ad</span>
            <span>إعلان مدفوع{drop.payer_brand_name ? ` من ${drop.payer_brand_name}` : ''}</span>
          </div>
        )}
        {drop.sponsorship_type === 'supplier_promo' && drop.payer_brand_name && (
          <div className="mb-4 text-[11px] text-white/75">
            ✨ خصم حصري مقدم من <span className="font-bold">{drop.payer_brand_name}</span> لأعضاء مضمونة
          </div>
        )}
        {drop.sponsorship_type === 'madmona_curated' && (
          <div className="mb-4 inline-flex items-center gap-1.5 text-[11px] text-white/75">
            <span>🌟</span>
            <span>اختيار مضمونة</span>
          </div>
        )}

        {/* Countdown */}
        <div className="mb-5 p-3 bg-black/20 backdrop-blur-sm rounded-2xl inline-flex items-center gap-3">
          <span className="text-xs text-white/70">ينتهي بعد</span>
          <span className="font-mono text-xl md:text-2xl font-black tabular-nums tracking-wider">
            {timeLeft || '24:00:00'}
          </span>
        </div>

        <button
          onClick={handleClick}
          className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-white text-[#1A2E26] hover:bg-[#FAFAF7] font-black px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 group"
        >
          {drop.cta_label_ar}
          <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span>
        </button>

        <p className="mt-4 text-[11px] text-white/60">
          {drop.views_count > 0 && (
            <span>👀 {drop.views_count} شاف العرض ده</span>
          )}
        </p>
      </div>
    </section>
  );
}

function NoDropToday() {
  return (
    <div className="p-6 rounded-3xl bg-white border border-[#E5E5E0] text-center">
      <div className="text-3xl mb-2">🌙</div>
      <p className="text-[#6B7280] text-sm">عرض النهارده مش جاهز بعد — تابعنا تاني خلال ساعات</p>
    </div>
  );
}

// =====================================================================
// 2. STREAK PROGRESS — Duolingo-style progress to next milestone
// =====================================================================
function StreakProgress({ streak }: { streak: StreakState }) {
  const next = nextMilestone(streak.current_streak);
  const prev = MILESTONES.filter(m => m.day <= streak.current_streak).pop();
  const prevDay = prev?.day ?? 0;
  const nextDay = next?.day ?? streak.current_streak;
  const progress = next
    ? Math.min(100, ((streak.current_streak - prevDay) / (nextDay - prevDay)) * 100)
    : 100;
  const daysToGo = next ? next.day - streak.current_streak : 0;

  return (
    <section className="p-5 rounded-3xl bg-white border border-[#E5E5E0]">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🔥</span>
            <span className="text-xl font-black text-[#1A2E26]">
              {streak.current_streak} {streak.current_streak === 1 ? 'يوم' : 'أيام'} متتالية
            </span>
          </div>
          <p className="text-xs text-[#6B7280]">
            أطول streak ليك: <span className="font-bold text-[#FA8125]">{streak.longest_streak}</span> • إجمالي زياراتك: <span className="font-bold">{streak.total_visits}</span>
          </p>
        </div>
      </div>

      {next && (
        <>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-[#FA8125]">
              {daysToGo} {daysToGo === 1 ? 'يوم كمان' : 'أيام كمان'} لـ {next.emoji} {next.label}
            </span>
            <span className="text-[11px] text-[#9CA3AF]">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-[#F5F4F0] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-l from-orange-400 to-amber-500 rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[11px] text-[#6B7280] mt-2.5">
            مكافأتك القادمة: <span className="font-bold text-[#1A2E26]">{next.reward_ar}</span>
          </p>
        </>
      )}

      {!next && (
        <div className="p-3 rounded-xl bg-gradient-to-l from-amber-50 to-orange-50 border border-amber-200/50 text-center">
          <span className="text-2xl block mb-1">🏆</span>
          <p className="text-sm font-black text-[#1A2E26]">وصلت لأعلى مستوى!</p>
          <p className="text-xs text-[#6B7280] mt-1">انت في قمة المجتمع — استمر تتابعنا</p>
        </div>
      )}

      {/* Milestone trail (visual) */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#F5F4F0]">
        {MILESTONES.slice(0, 5).map(m => {
          const reached = streak.current_streak >= m.day;
          return (
            <div key={m.day} className="flex flex-col items-center gap-1 flex-1">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base transition-all ${
                reached
                  ? 'bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-md scale-100'
                  : 'bg-[#F5F4F0] text-[#9CA3AF] scale-90'
              }`}>
                {reached ? m.emoji : '•'}
              </div>
              <span className={`text-[9px] ${reached ? 'text-[#1A2E26] font-bold' : 'text-[#9CA3AF]'}`}>
                {m.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function StreakInviteSignIn() {
  return (
    <section className="p-5 rounded-3xl bg-gradient-to-br from-[#FA8125]/5 to-[#2FA084]/5 border border-[#FA8125]/20">
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">🔥</span>
        <div>
          <h3 className="text-sm font-black text-[#1A2E26] mb-1">ابدأ streak مكافآتك</h3>
          <p className="text-xs text-[#6B7280] mb-3 leading-relaxed">
            سجل دخول كل يوم وحافظ على streak — كل ٧ أيام = خصم جديد، ١٠٠ يوم = كاش باك ١٠٠ج.م
          </p>
          <Link href="/login?return=/pulse" className="inline-flex items-center gap-1.5 bg-[#FA8125] text-white text-xs font-black px-4 py-2 rounded-lg hover:bg-[#FA8125]/90 transition-colors">
            دخول / تسجيل
            <span>←</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

// =====================================================================
// 3. LIVE ACTIVITY — auto-scrolling ticker (social proof)
// =====================================================================
function LiveActivitySection({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) {
    return null;
  }

  return (
    <section className="rounded-3xl bg-white border border-[#E5E5E0] overflow-hidden">
      <header className="flex items-center justify-between px-5 py-3 border-b border-[#F5F4F0]">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <h3 className="text-sm font-black text-[#1A2E26]">حدث في آخر ٢٤ ساعة</h3>
        </div>
        <span className="text-[10px] text-[#9CA3AF]">{events.length} نشاط</span>
      </header>

      <div className="max-h-80 overflow-y-auto divide-y divide-[#F5F4F0]">
        {events.map((ev, i) => (
          <ActivityRow key={ev.id} event={ev} delay={i * 50} />
        ))}
      </div>
    </section>
  );
}

function ActivityRow({ event, delay }: { event: ActivityEvent; delay: number }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div className={`flex items-center gap-3 px-5 py-3 hover:bg-[#FAFAF7] transition-all duration-500 ${
      show ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'
    }`}>
      <span className="text-xl flex-shrink-0">{event.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#1A2E26] truncate">{event.display_message_ar}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {event.city && <span className="text-[10px] text-[#9CA3AF]">📍 {event.city}</span>}
          <span className="text-[10px] text-[#9CA3AF]">{formatTimeAgo(event.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'الآن';
  if (diff < 3600) return `${Math.floor(diff / 60)} د`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} س`;
  return `${Math.floor(diff / 86400)} ي`;
}

// =====================================================================
// 4. PERSONALIZED PICKS (or trending fallback)
// =====================================================================
function DailyPicks({ picks, isSignedIn }: { picks: Pick[]; isSignedIn: boolean }) {
  const [trending, setTrending] = useState<Pick[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(false);

  // Fall back to trending listings if user has no picks
  useEffect(() => {
    if (picks.length > 0) return;
    setLoadingTrending(true);
    (async () => {
      const { data } = await supabaseBrowser
        .from('listings')
        .select(`
          id, title, slug, city,
          photos:listing_photos(url, is_primary)
        `)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(3);

      const fallback: Pick[] = (data || []).map((l: { id: string; title: string; slug: string; city: string | null; photos: { url: string; is_primary: boolean }[] }, i: number) => ({
        listing_id: l.id,
        title: l.title,
        slug: l.slug,
        city: l.city,
        rank: i + 1,
        reason_ar: 'الأحدث على المنصة',
        photo_url: l.photos?.find((p) => p.is_primary)?.url || l.photos?.[0]?.url || null,
      }));
      setTrending(fallback);
      setLoadingTrending(false);
    })();
  }, [picks.length]);

  const displayed = picks.length > 0 ? picks : trending;

  if (loadingTrending) return <SkeletonCard h="h-72" />;
  if (displayed.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-black text-[#1A2E26]">
          {picks.length > 0 ? '✨ اختياراتك النهارده' : '🔥 الأحدث في السوق'}
        </h3>
        <Link href="/marketplace" className="text-xs text-[#FA8125] font-bold hover:underline">
          شوف الكل ←
        </Link>
      </div>

      {!isSignedIn && picks.length === 0 && (
        <p className="text-[11px] text-[#9CA3AF] -mt-1">سجل دخولك عشان نخصصلك اختيارات بناءً على اهتماماتك</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {displayed.map(p => (
          <PickCard key={p.listing_id} pick={p} />
        ))}
      </div>
    </section>
  );
}

function PickCard({ pick }: { pick: Pick }) {
  return (
    <Link
      href={`/marketplace/${pick.slug}`}
      className="block group bg-white rounded-2xl border border-[#E5E5E0] overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
    >
      <div className="aspect-[4/3] bg-[#F5F4F0] relative overflow-hidden">
        {pick.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={pick.photo_url} alt={pick.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">🏠</div>
        )}
        <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-full text-[10px] font-black text-[#FA8125]">
          #{pick.rank}
        </div>
      </div>
      <div className="p-3">
        <h4 className="text-sm font-bold text-[#1A2E26] line-clamp-2 mb-1">{pick.title}</h4>
        {pick.city && <p className="text-[11px] text-[#6B7280]">📍 {pick.city}</p>}
        {pick.reason_ar && (
          <p className="text-[10px] text-[#FA8125] mt-2 line-clamp-1">💡 {pick.reason_ar}</p>
        )}
      </div>
    </Link>
  );
}

// =====================================================================
// REWARD UNLOCK MODAL (fires when streak hits a milestone)
// =====================================================================
function RewardUnlockedModal({ rewardKey, onClose }: { rewardKey: string; onClose: () => void }) {
  const day = parseInt(rewardKey.replace('day_', ''));
  const milestone = MILESTONES.find(m => m.day === day);
  if (!milestone) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-2xl animate-in zoom-in-95 duration-500"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-6xl mb-4 animate-bounce">{milestone.emoji}</div>
        <h2 className="text-2xl font-black text-[#1A2E26] mb-2">مبروك! وصلت {milestone.label}</h2>
        <p className="text-sm text-[#6B7280] mb-6 leading-relaxed">
          داومت معانا {milestone.day} يوم متتاليين — ده شي عظيم!
        </p>
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/50 mb-6">
          <p className="text-[10px] text-amber-700 font-bold uppercase tracking-widest mb-1">مكافأتك</p>
          <p className="text-base font-black text-[#1A2E26]">{milestone.reward_ar}</p>
        </div>
        <button
          onClick={onClose}
          className="w-full bg-[#FA8125] text-white font-black py-3 rounded-xl hover:bg-[#FA8125]/90 transition-colors"
        >
          استلم وكمل 🎁
        </button>
      </div>
    </div>
  );
}

// =====================================================================
// SHARED
// =====================================================================
function SkeletonCard({ h }: { h: string }) {
  return <div className={`${h} rounded-3xl bg-white border border-[#E5E5E0] animate-pulse`} />;
}
