'use client';

/**
 * مضمونة — VK-style Hero (v4 — 6 Jun 2026)
 *
 * مرجع Mohamed: vk.com — أيقونات كتيرة متحركة في الخلفية
 * + 4 chips كبيرة بألوان لكل مجال
 * الـ chip بيفتح الماركت مفلتر بالمجال (browse) + زرار "ضيف" جواه يروح /add-listing
 *
 * المجالات الـ 4 (المناسبات اتحطت جوه الإيجار):
 *  - بيع · إيجار · خدمات · مطاعم
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

type Stats = {
  listings: number;
  categories: number;
  suppliers: number;
  cities: number;
};

const DEFAULT_STATS: Stats = { listings: 0, categories: 0, suppliers: 0, cities: 0 };

// 4 المجالات الكبيرة المتحركة (الترتيب: بيع · إيجار · خدمات · مطاعم — المناسبات جوه الإيجار)
const VK_CATEGORIES = [
  { emoji: '🛍️', name: 'بيع', sub: 'عقارات · عربيات · منتجات', accent: '#3D7BB6', bg: '#D9E7F4', track: 'products' },
  { emoji: '🏠', name: 'إيجار', sub: 'عقارات · عربيات · مناسبات · معدات', accent: '#1F6F5F', bg: '#E7F1ED', track: 'rentals' },
  { emoji: '🛠️', name: 'خدمات', sub: 'صيانة · جمال · استشارات', accent: '#D4A017', bg: '#FAEFD1', track: 'services' },
  { emoji: '🍽️', name: 'مطاعم', sub: 'دلفري · سفرة · حلويات', accent: '#E26D5C', bg: '#FAE1CB', track: 'restaurants' },
];

// أيقونات خلفية متحركة (VK-style decorations) — بالسرعة الهادئة
const BG_EMOJIS = [
  { e: '🏠', t: '8%', l: '4%', s: 32, d: '0s', dur: '10s' },
  { e: '🚗', t: '14%', r: '6%', s: 36, d: '1.5s', dur: '11s' },
  { e: '🛠️', t: '32%', l: '2%', s: 28, d: '3s', dur: '9s' },
  { e: '🍽️', t: '48%', r: '3%', s: 34, d: '0.8s', dur: '11s' },
  { e: '💍', t: '60%', l: '6%', s: 30, d: '2.5s', dur: '12s' },
  { e: '✨', t: '12%', r: '18%', s: 24, d: '4.5s', dur: '8s' },
  { e: '🎨', t: '72%', r: '10%', s: 28, d: '1.2s', dur: '10s' },
  { e: '⚡', t: '42%', r: '22%', s: 26, d: '3.8s', dur: '9s' },
  { e: '💎', t: '22%', l: '20%', s: 24, d: '1.8s', dur: '11s' },
  { e: '🎯', t: '64%', l: '16%', s: 26, d: '0.5s', dur: '9s' },
  { e: '🛍️', t: '80%', l: '32%', s: 28, d: '2.8s', dur: '10s' },
  { e: '📱', t: '6%', l: '38%', s: 24, d: '3.5s', dur: '9s' },
  { e: '🎬', t: '52%', l: '36%', s: 26, d: '5.5s', dur: '12s' },
  { e: '🏖️', t: '88%', r: '24%', s: 30, d: '1s', dur: '11s' },
  { e: '🎉', t: '24%', l: '50%', s: 26, d: '6s', dur: '9s' },
  { e: '🚀', t: '76%', l: '4%', s: 28, d: '4.2s', dur: '11s' },
];

// Arabic-Indic numerals
function toArabic(n: number): string {
  return n.toString().replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);
}

function useCountUp(target: number, duration = 1400) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const p = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            setValue(Math.round(target * eased));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          io.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [target, duration]);

  return { value, ref };
}

function StatPill({ href, num, label }: { href: string; num: number; label: string }) {
  const { value, ref } = useCountUp(num);
  return (
    <Link href={href} className="mdm-stat-pill" prefetch={false}>
      <span ref={ref} className="mdm-stat-pill-num">{toArabic(value)}</span>
      <span className="mdm-stat-pill-cap">{label}</span>
    </Link>
  );
}

export default function MadmonaShowcase({ stats = DEFAULT_STATS }: { stats?: Stats }) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('mdm-in');
          io.unobserve(e.target);
        }
      }),
      { threshold: 0.15 }
    );
    root.querySelectorAll('.mdm-reveal').forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);

  return (
    <div className="mdm-showcase" ref={rootRef} dir="rtl">
      <style>{CSS}</style>

      {/* ============ HERO ============ */}
      <section className="mdm-hero">
        {/* أيقونات خلفية متحركة (VK-style stickers) */}
        <div className="mdm-bg-emojis" aria-hidden>
          {BG_EMOJIS.map((e, i) => (
            <span
              key={i}
              className="mdm-bg-emoji"
              style={{
                top: e.t,
                left: e.l,
                right: e.r,
                fontSize: `${e.s}px`,
                animationDelay: e.d,
                animationDuration: e.dur,
              }}
            >
              {e.e}
            </span>
          ))}
        </div>

        <div className="mdm-paper-grain" aria-hidden />

        <div className="mdm-hero-in">
          {/* Kicker */}
          <Link href="/about" className="mdm-kicker mdm-reveal" prefetch={false}>
            <span className="mdm-kicker-dot" />
            <span>EST. ٢٠٢٦ · القاهرة</span>
            <span className="mdm-kicker-dot" />
          </Link>

          {/* Headline */}
          <Link href="/add-listing" className="mdm-h1-link mdm-reveal" prefetch={false}>
            <h1 className="mdm-h1">
              <span className="mdm-h1-line">معاملاتك</span>
              <span className="mdm-h1-em">مضمونة.</span>
            </h1>
          </Link>

          {/* Sublabel */}
          <p className="mdm-sub mdm-reveal">
            احنا عندنا — اختار مجالك وضيف ليستنجك دلوقتي:
          </p>

          {/* ============ تبويب البحث (Search) ============ */}
          <form
            className="mdm-search mdm-reveal"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              const term = q.trim();
              router.push(term ? `/marketplace?q=${encodeURIComponent(term)}` : '/marketplace');
            }}
          >
            <span className="mdm-search-ico" aria-hidden>🔍</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="دوّر على أي حاجة… شقة · عربية · خدمة · مطعم"
              className="mdm-search-input"
              aria-label="بحث في مضمونة"
            />
            <button type="submit" className="mdm-search-btn">
              بحث
              <ArrowLeft size={14} />
            </button>
          </form>

          {/* ============ 5 BIG VK-STYLE CATEGORY CHIPS ============ */}
          <div className="mdm-vk-grid mdm-reveal">
            {VK_CATEGORIES.map((c, i) => (
              <Link
                key={c.name}
                href={`/marketplace?track=${c.track}`}
                prefetch={false}
                className="mdm-vk-chip"
                style={
                  {
                    '--accent': c.accent,
                    '--bg': c.bg,
                    '--delay': `${i * 0.25}s`,
                  } as React.CSSProperties
                }
              >
                <span className="mdm-vk-emoji">{c.emoji}</span>
                <div className="mdm-vk-name">{c.name}</div>
                <div className="mdm-vk-sub">{c.sub}</div>
                <span
                  role="button"
                  tabIndex={0}
                  className="mdm-vk-add"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    router.push('/add-listing');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      router.push('/add-listing');
                    }
                  }}
                >
                  <span>ضيف</span>
                  <ArrowLeft size={12} />
                </span>
              </Link>
            ))}
          </div>

          {/* Stats inline at bottom — clickable مع counters */}
          <div className="mdm-stats-row mdm-reveal">
            <StatPill href="/add-listing" num={stats.listings} label="ليستنج" />
            <StatPill href="/add-listing" num={stats.categories} label="مجال" />
            <StatPill href="/add-listing" num={stats.suppliers} label="مورد" />
            <StatPill href="/add-listing" num={stats.cities} label="مدينة" />
          </div>

          {/* Primary CTAs */}
          <div className="mdm-hero-actions mdm-reveal">
            <Link href="/add-listing" className="mdm-pill mdm-pill-primary" prefetch={false}>
              ضيف ليستنجك مجاناً
              <ArrowLeft size={14} />
            </Link>
            <Link href="/marketplace" className="mdm-pill mdm-pill-ghost" prefetch={false}>
              اتصفّح السوق
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

const CSS = `
.mdm-showcase{
  --cream:#FAFAF7; --paper:#F3F1EA; --ink:#0A0A0A; --green:#1F6F5F; --green2:#2FA084;
  --muted:#7C8A84; --gold:#D4A017; --border:#E5DFD3;
  font-family:'Cairo','Inter',system-ui,sans-serif;
  background:var(--cream); color:var(--ink); overflow:hidden;
}
.mdm-showcase *{box-sizing:border-box}
.mdm-showcase a{text-decoration:none;color:inherit}

.mdm-reveal{opacity:1;transform:translateY(14px);transition:transform .7s cubic-bezier(.2,.7,.2,1)}
.mdm-reveal.mdm-in{transform:none}

/* ============ HERO ============ */
.mdm-hero{
  position:relative; background:var(--cream);
  padding:56px 24px 72px; text-align:center;
  overflow:hidden; min-height:680px;
}
.mdm-paper-grain{
  position:absolute; inset:0; pointer-events:none; opacity:.25; mix-blend-mode:multiply;
  background:
    radial-gradient(circle at 18% 28%, rgba(212,160,23,.06) 0, transparent 38%),
    radial-gradient(circle at 82% 12%, rgba(31,111,95,.06) 0, transparent 42%),
    radial-gradient(circle at 50% 95%, rgba(31,111,95,.04) 0, transparent 50%);
}

/* === أيقونات خلفية متحركة (VK stickers) === */
.mdm-bg-emojis{position:absolute;inset:0;pointer-events:none;z-index:1}
.mdm-bg-emoji{
  position:absolute;
  opacity:.16;
  animation-name:mdmBgFloat;
  animation-iteration-count:infinite;
  animation-timing-function:ease-in-out;
  filter:saturate(.85);
  user-select:none;
  will-change:transform;
}
@keyframes mdmBgFloat{
  0%,100%{transform:translateY(0) translateX(0) rotate(0)}
  25%{transform:translateY(-10px) translateX(4px) rotate(5deg)}
  50%{transform:translateY(-2px) translateX(-6px) rotate(-3deg)}
  75%{transform:translateY(8px) translateX(2px) rotate(2deg)}
}

.mdm-hero-in{position:relative;z-index:2;max-width:960px;margin:0 auto}

/* Kicker */
.mdm-kicker{display:inline-flex;align-items:center;gap:10px;font-size:10.5px;font-weight:700;letter-spacing:.32em;color:var(--muted);text-transform:uppercase;margin-bottom:22px;padding:6px 12px;border-radius:999px;background:rgba(255,255,255,.7);backdrop-filter:blur(8px);transition:.2s}
.mdm-kicker:hover{background:#fff;color:var(--ink);box-shadow:0 4px 12px rgba(20,40,34,.08)}
.mdm-kicker-dot{width:5px;height:5px;border-radius:50%;background:var(--gold);transition:.3s;animation:mdmPulse 4.2s ease-in-out infinite}
@keyframes mdmPulse{0%,100%{box-shadow:0 0 0 0 rgba(212,160,23,.5)}50%{box-shadow:0 0 0 6px rgba(212,160,23,0)}}

/* Headline */
.mdm-h1-link{display:block}
.mdm-h1{margin:0 0 16px;line-height:.95;letter-spacing:-2px;font-weight:300;color:var(--ink);transition:.3s}
.mdm-h1-link:hover .mdm-h1{transform:translateY(-2px)}
.mdm-h1-line{display:block;font-size:clamp(38px,7vw,72px);font-weight:300;letter-spacing:-2px}
.mdm-h1-em{
  display:block;font-size:clamp(46px,9vw,96px);font-weight:900;font-style:italic;
  background:linear-gradient(118deg,#1F6F5F 0%, #2FA084 50%, #D4A017 100%);
  -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;
  margin-top:-6px;background-size:200% auto;animation:mdmShimmer 6s ease-in-out infinite alternate;
}
@keyframes mdmShimmer{from{background-position:0% center}to{background-position:100% center}}

.mdm-sub{font-size:clamp(15px,2vw,18px);color:var(--muted);max-width:540px;margin:0 auto 36px;line-height:1.65;font-weight:600}

/* ============ SEARCH BAR (تبويب البحث) ============ */
.mdm-search{
  display:flex; align-items:center; gap:8px;
  max-width:600px; margin:-8px auto 32px;
  background:#fff; border:2px solid var(--border);
  border-radius:999px; padding:6px 6px 6px 18px;
  box-shadow:0 4px 16px rgba(20,40,34,.06);
  transition:border-color .25s, box-shadow .25s;
}
.mdm-search:focus-within{border-color:var(--green); box-shadow:0 8px 24px rgba(31,111,95,.14)}
.mdm-search-ico{font-size:18px; line-height:1; opacity:.7; flex-shrink:0}
.mdm-search-input{
  flex:1; border:none; outline:none; background:transparent;
  font-family:inherit; font-size:15px; font-weight:600; color:var(--ink);
  padding:8px 0; min-width:0; text-align:right;
}
.mdm-search-input::placeholder{color:var(--muted); font-weight:500}
.mdm-search-btn{
  display:inline-flex; align-items:center; gap:6px; flex-shrink:0;
  padding:10px 20px; border:none; border-radius:999px; cursor:pointer;
  font-family:inherit; font-size:14px; font-weight:800; color:#fff;
  background:linear-gradient(118deg,#1F6F5F 0%, #2FA084 55%, #D4A017 100%);
  box-shadow:0 4px 12px rgba(31,111,95,.28); transition:.25s;
}
.mdm-search-btn:hover{transform:translateY(-2px); box-shadow:0 8px 20px rgba(31,111,95,.36)}
@media(max-width:560px){
  .mdm-search{padding:5px 5px 5px 14px; margin:-4px auto 26px}
  .mdm-search-btn{padding:9px 14px; font-size:13px}
  .mdm-search-input{font-size:14px}
}

/* ============ 5 BIG VK CHIPS ============ */
.mdm-vk-grid{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:16px;
  max-width:760px;
  margin:0 auto 36px;
}
@media(max-width:760px){.mdm-vk-grid{grid-template-columns:repeat(2,1fr);gap:12px}}

.mdm-vk-chip{
  position:relative;
  background:#fff;
  border:2px solid transparent;
  border-radius:24px;
  padding:24px 12px 20px;
  text-align:center;
  cursor:pointer;
  transition:transform .35s cubic-bezier(.2,.7,.6,1.4), box-shadow .35s, border-color .25s, background .25s;
  box-shadow:0 4px 16px rgba(20,40,34,.06);
  overflow:hidden;
  animation:mdmChipBob 7s ease-in-out infinite;
  animation-delay:var(--delay,0s);
  will-change:transform;
}
@keyframes mdmChipBob{
  0%,100%{transform:translateY(0)}
  50%{transform:translateY(-6px)}
}
.mdm-vk-chip::before{
  content:""; position:absolute; inset:0; z-index:0;
  background:linear-gradient(180deg, var(--bg, transparent) 0%, transparent 60%);
  opacity:.55; transition:opacity .3s;
}
.mdm-vk-chip:hover{
  transform:translateY(-10px) scale(1.04);
  border-color:var(--accent);
  box-shadow:0 18px 40px -8px var(--accent);
  animation-play-state:paused;
}
.mdm-vk-chip:hover::before{opacity:1}

.mdm-vk-emoji{
  display:block; position:relative; z-index:1;
  font-size:clamp(40px, 6vw, 56px); line-height:1;
  margin-bottom:8px;
  animation:mdmEmojiWobble 5.5s ease-in-out infinite;
  animation-delay:var(--delay,0s);
  filter:drop-shadow(0 4px 8px rgba(0,0,0,.10));
  transition:transform .3s;
}
@keyframes mdmEmojiWobble{
  0%,100%{transform:rotate(-2deg) scale(1)}
  50%{transform:rotate(2deg) scale(1.04)}
}
.mdm-vk-chip:hover .mdm-vk-emoji{transform:rotate(0) scale(1.18)}

.mdm-vk-name{
  position:relative; z-index:1;
  font-size:clamp(16px, 2.2vw, 22px);
  font-weight:900;
  color:var(--ink);
  letter-spacing:-.5px;
  line-height:1.1;
  margin-bottom:4px;
}
.mdm-vk-sub{
  position:relative; z-index:1;
  font-size:11px;
  font-weight:600;
  color:var(--muted);
  letter-spacing:-.01em;
  line-height:1.35;
  margin-bottom:12px;
}
.mdm-vk-add{
  position:relative; z-index:1;
  display:inline-flex; align-items:center; gap:4px;
  font-size:11px; font-weight:800;
  padding:5px 10px; border-radius:999px;
  background:var(--accent); color:#fff;
  letter-spacing:.05em;
  opacity:.85;
  transition:.2s;
}
.mdm-vk-chip:hover .mdm-vk-add{
  opacity:1; transform:scale(1.05);
  box-shadow:0 4px 12px rgba(0,0,0,.15);
}

/* === Stats row === */
.mdm-stats-row{
  display:flex; align-items:center; justify-content:center;
  gap:8px; flex-wrap:wrap; margin-bottom:28px;
}
.mdm-stat-pill{
  display:inline-flex; align-items:center; gap:8px;
  padding:10px 18px; border-radius:999px;
  background:rgba(255,255,255,.85); backdrop-filter:blur(8px);
  border:1px solid var(--border);
  transition:.25s; cursor:pointer;
}
.mdm-stat-pill:hover{
  background:#fff; transform:translateY(-3px);
  border-color:var(--green); box-shadow:0 8px 20px rgba(31,111,95,.15);
}
.mdm-stat-pill-num{font-size:18px;font-weight:800;color:var(--ink);font-variant-numeric:tabular-nums;line-height:1}
.mdm-stat-pill-cap{font-size:11px;font-weight:700;color:var(--muted);letter-spacing:.05em}
.mdm-stat-pill:hover .mdm-stat-pill-num{color:var(--green)}

/* === CTA Pills === */
.mdm-hero-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.mdm-pill{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;border-radius:999px;font-size:14.5px;font-weight:800;letter-spacing:-.01em;transition:.25s;cursor:pointer;border:1.5px solid transparent}
.mdm-pill-primary{
  background:linear-gradient(118deg, #1F6F5F 0%, #2FA084 55%, #D4A017 100%);
  color:#fff;
  box-shadow:0 6px 18px rgba(31,111,95,.32);
  position:relative;
  overflow:hidden;
}
.mdm-pill-primary::before{
  content:""; position:absolute; inset:0;
  background:linear-gradient(118deg, #D4A017 0%, #2FA084 50%, #1F6F5F 100%);
  opacity:0; transition:opacity .35s;
}
.mdm-pill-primary > *{position:relative; z-index:1}
.mdm-pill-primary:hover{transform:translateY(-3px);box-shadow:0 16px 36px rgba(31,111,95,.42)}
.mdm-pill-primary:hover::before{opacity:1}
.mdm-pill-ghost{background:transparent;color:var(--ink);border-color:var(--ink)}
.mdm-pill-ghost:hover{background:var(--ink);color:var(--cream);transform:translateY(-3px)}

/* Cut continuous decorative animations on mobile (INP + battery win) */
@media (max-width:760px){
  .mdm-bg-emoji{animation:none}
  .mdm-vk-chip{animation:none}
  .mdm-vk-emoji{animation:none}
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce){
  .mdm-reveal{opacity:1;transform:none}
  .mdm-bg-emoji,.mdm-vk-chip,.mdm-vk-emoji,.mdm-h1-em,.mdm-kicker-dot{animation:none}
}
`;
