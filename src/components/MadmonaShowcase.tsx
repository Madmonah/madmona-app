'use client';

/**
 * مضمونة — قسم الواجهة المتحرك (Hero + ماركيه المجالات + عدّادات)
 * CSS بس — مفيش أي مكتبة. RTL + ألوان البراند. صور البراند اللايف من Storage.
 */

import { useEffect, useRef } from 'react';

const IMG = 'https://mjhflxpxunwycbiquoig.supabase.co/storage/v1/object/public/ads/categories';

const GROUPS = [
  { slug: 'properties', name: 'عقارات', emoji: '🏠' },
  { slug: 'vehicles', name: 'مركبات', emoji: '🚗' },
  { slug: 'services', name: 'خدمات', emoji: '🛠️' },
  { slug: 'equipment', name: 'معدات', emoji: '🎬' },
  { slug: 'events', name: 'فعاليات ومناسبات', emoji: '💒' },
  { slug: 'tourism', name: 'سياحة وتجارب', emoji: '🏖️' },
  { slug: 'food', name: 'مطاعم ومأكولات', emoji: '🍽️' },
  { slug: 'shop', name: 'منتجات للبيع', emoji: '🛍️' },
];

export default function MadmonaShowcase() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('mdm-in');
            if (e.target.classList.contains('mdm-stat')) {
              const el = e.target as HTMLElement;
              const to = Number(el.dataset.to || '0');
              const suffix = el.dataset.suffix || '';
              const numEl = el.querySelector('.mdm-stat-num') as HTMLElement;
              const dur = 1400; const start = performance.now();
              const tick = (now: number) => {
                const p = Math.min(1, (now - start) / dur);
                const eased = 1 - Math.pow(1 - p, 3);
                if (numEl) numEl.textContent = Math.round(to * eased).toString() + suffix;
                if (p < 1) requestAnimationFrame(tick);
              };
              requestAnimationFrame(tick);
            }
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.25 }
    );
    root.querySelectorAll('.mdm-reveal, .mdm-stat').forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);

  const track = [...GROUPS, ...GROUPS];

  return (
    <div className="mdm-showcase" ref={rootRef} dir="rtl">
      <style>{CSS}</style>

      <section className="mdm-hero">
        <span className="mdm-blob mdm-blob1" />
        <span className="mdm-blob mdm-blob2" />
        <div className="mdm-hero-in">
          <div className="mdm-logo mdm-reveal">
            <span className="mdm-dot" />
            <span className="mdm-wm">مضمونة</span>
          </div>
          <h1 className="mdm-h1 mdm-reveal">معاملاتك مضمونة</h1>
          <p className="mdm-sub mdm-reveal">
            أكبر سوق مضمون في مصر — إيجار، بيع وشرا، خدمات، ومطاعم. بحماية كاملة، ودفع مستحقات سريع، ودعم على مدار الساعة.
          </p>
          <div className="mdm-cta mdm-reveal">
            <a className="mdm-btn mdm-btn-gold" href="/add-listing">ضيف الليستنج</a>
            <a className="mdm-btn mdm-btn-ghost" href="/marketplace">اتصفّح المجالات</a>
          </div>
          <div className="mdm-stats">
            <div className="mdm-stat" data-to="100" data-suffix="٪">
              <div className="mdm-stat-num">0</div><div className="mdm-stat-label">حماية كاملة</div>
            </div>
            <div className="mdm-stat" data-to="24" data-suffix="/7">
              <div className="mdm-stat-num">0</div><div className="mdm-stat-label">دعم مستمر</div>
            </div>
            <div className="mdm-stat" data-to="8" data-suffix="">
              <div className="mdm-stat-num">0</div><div className="mdm-stat-label">مجالات مضمونة</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mdm-cats mdm-reveal">
        <h2 className="mdm-h2">اتصفّح كل المجالات</h2>
        <div className="mdm-marquee">
          <div className="mdm-track">
            {track.map((g, i) => (
              <a className="mdm-tile" key={`${g.slug}-${i}`} href="/marketplace">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${IMG}/${g.slug}-v1.jpg`} alt={g.name} loading="lazy" />
                <span className="mdm-tile-shade" />
                <span className="mdm-tile-emoji">{g.emoji}</span>
                <span className="mdm-tile-name">{g.name}</span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

const CSS = `
.mdm-showcase{--cream:#FAFAF7;--green:#1F6F5F;--green2:#2FA084;--green3:#6FCF97;--ink:#0A0A0A;--gold:#d4a017;font-family:'Cairo','Inter',sans-serif;background:var(--cream);color:var(--ink);overflow:hidden}
.mdm-showcase *{box-sizing:border-box}
.mdm-reveal{opacity:0;transform:translateY(28px);transition:opacity .7s ease,transform .7s cubic-bezier(.2,.7,.2,1)}
.mdm-reveal.mdm-in{opacity:1;transform:none}
.mdm-hero{position:relative;padding:84px 20px 72px;text-align:center;background:linear-gradient(135deg,#143A33 0%,var(--green) 55%,var(--green2) 100%);overflow:hidden}
.mdm-hero-in{position:relative;z-index:2;max-width:920px;margin:0 auto}
.mdm-blob{position:absolute;border-radius:50%;filter:blur(90px);z-index:1}
.mdm-blob1{width:520px;height:520px;background:var(--green3);opacity:.40;top:-160px;inset-inline-end:-120px;animation:mdmFloat 9s ease-in-out infinite}
.mdm-blob2{width:440px;height:440px;background:var(--gold);opacity:.22;bottom:-180px;inset-inline-start:-120px;animation:mdmFloat 11s ease-in-out infinite reverse}
@keyframes mdmFloat{0%,100%{transform:translate(0,0)}50%{transform:translate(20px,28px)}}
.mdm-logo{display:inline-flex;align-items:center;gap:12px;margin-bottom:18px}
.mdm-dot{width:18px;height:18px;border-radius:50%;background:linear-gradient(120deg,var(--gold),var(--green2),var(--green));box-shadow:0 0 0 7px rgba(255,255,255,.10)}
.mdm-wm{font-weight:900;font-size:38px;color:#fff;line-height:1}
.mdm-h1{font-weight:900;font-size:clamp(40px,7vw,76px);color:#fff;margin:6px 0 14px;line-height:1.05;letter-spacing:-1px}
.mdm-sub{font-size:clamp(16px,2.4vw,21px);color:#eafdf6;opacity:.92;max-width:680px;margin:0 auto 28px;line-height:1.7}
.mdm-cta{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.mdm-btn{padding:15px 34px;border-radius:999px;font-weight:800;font-size:17px;text-decoration:none;display:inline-block;transition:transform .2s ease,box-shadow .2s ease}
.mdm-btn-gold{color:#fff;background:linear-gradient(120deg,var(--gold),var(--green2),var(--green));box-shadow:0 12px 34px rgba(212,160,23,.35)}
.mdm-btn-gold:hover{transform:translateY(-3px);box-shadow:0 18px 44px rgba(212,160,23,.45)}
.mdm-btn-ghost{color:#fff;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.30)}
.mdm-btn-ghost:hover{transform:translateY(-3px);background:rgba(255,255,255,.20)}
.mdm-stats{display:flex;gap:18px;justify-content:center;flex-wrap:wrap;margin-top:46px}
.mdm-stat{opacity:0;transform:translateY(24px) scale(.96);transition:all .6s cubic-bezier(.2,.7,.2,1);min-width:150px;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.18);border-radius:20px;padding:22px 26px}
.mdm-stat.mdm-in{opacity:1;transform:none}
.mdm-stat-num{font-weight:900;font-size:46px;color:#fff;line-height:1}
.mdm-stat-label{font-size:15px;color:#dff7ee;margin-top:6px}
.mdm-cats{padding:64px 0 72px}
.mdm-h2{text-align:center;font-weight:900;font-size:clamp(26px,4vw,40px);color:var(--green);margin:0 0 36px}
.mdm-marquee{position:relative;width:100%;overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
.mdm-track{display:flex;gap:20px;width:max-content;padding:8px 20px;animation:mdmMarquee 46s linear infinite}
.mdm-marquee:hover .mdm-track{animation-play-state:paused}
@keyframes mdmMarquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.mdm-tile{position:relative;flex:0 0 auto;width:260px;height:330px;border-radius:24px;overflow:hidden;text-decoration:none;box-shadow:0 14px 40px rgba(20,58,51,.12);transition:transform .3s ease,box-shadow .3s ease;display:block}
.mdm-tile:hover{transform:translateY(-8px) scale(1.02);box-shadow:0 26px 60px rgba(20,58,51,.22)}
.mdm-tile img{width:100%;height:100%;object-fit:cover;display:block}
.mdm-tile-shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(20,58,51,.05) 30%,rgba(20,58,51,.78) 100%)}
.mdm-tile-emoji{position:absolute;top:18px;inset-inline-end:18px;font-size:34px;filter:drop-shadow(0 4px 10px rgba(0,0,0,.35))}
.mdm-tile-name{position:absolute;bottom:20px;inset-inline-start:0;inset-inline-end:0;text-align:center;color:#fff;font-weight:800;font-size:24px;text-shadow:0 2px 12px rgba(0,0,0,.5)}
@media (prefers-reduced-motion: reduce){.mdm-track{animation:none}.mdm-blob{animation:none}.mdm-reveal{opacity:1;transform:none}.mdm-stat{opacity:1;transform:none}}
`;
