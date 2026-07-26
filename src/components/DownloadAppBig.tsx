'use client'

/**
 * DownloadAppBig — Big single "Download App" CTA (6 Jun 2026)
 *
 * يستبدل الـ dual CTAs المكررة (أجر مننا + إضافة منتج) بزر واحد ضخم
 * لتحميل التطبيق. يدعم:
 *   - Android Chrome/Edge → native install prompt
 *   - iOS Safari → instructions modal
 *   - Desktop → "افتح على موبايلك" modal مع QR code
 *   - لو متثبت بالفعل → success state
 */

import { useState, useEffect } from 'react'
import { Download, Smartphone, X, CheckCircle2, ArrowLeft } from 'lucide-react'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const HOME_URL = 'https://madmonacairo.com'
const QR_API = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(HOME_URL)}&color=1F6F5F&bgcolor=FAFAF7&qzone=1`

export default function DownloadAppBig() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [showModal, setShowModal] = useState<'ios' | 'android' | 'desktop' | null>(null)

  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase()
    const ios = /iphone|ipad|ipod/.test(ua) && !/crios|fxios|edgios/.test(ua)
    setIsIOS(ios)
    const android = /android/.test(ua)
    setIsAndroid(android)

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error - safari only
      window.navigator.standalone === true
    setIsStandalone(standalone)

    // الحدث بيطير مرة واحدة وممكن يسبق تسجيل الـlistener — بنلتقطه على window
    // من ملف مبكّر (ServiceWorkerRegister) في متغير عام، ونقراه هنا لو موجود.
    // @ts-expect-error - global stash set by early capture
    if (window.__mdmInstallEvent) {
      // @ts-expect-error
      setInstallEvent(window.__mdmInstallEvent as InstallPromptEvent)
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as InstallPromptEvent)
      // @ts-expect-error - keep a copy for late-mounting components
      window.__mdmInstallEvent = e
    }
    window.addEventListener('beforeinstallprompt', handler)

    const installedHandler = () => {
      setInstallEvent(null)
      // @ts-expect-error
      window.__mdmInstallEvent = null
      setIsStandalone(true)
    }
    window.addEventListener('appinstalled', installedHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  const handleClick = async () => {
    if (installEvent) {
      try {
        await installEvent.prompt()
        const result = await installEvent.userChoice
        if (result.outcome === 'accepted') {
          setInstallEvent(null)
          // @ts-expect-error
          window.__mdmInstallEvent = null
        }
      } catch (err) {
        console.error('Install prompt error:', err)
        // لو الـprompt فشل لأي سبب على أندرويد → تعليمات يدوية (مش QR)
        if (isAndroid) setShowModal('android')
      }
    } else if (isIOS) {
      setShowModal('ios')
    } else if (isAndroid) {
      // أندرويد من غير prompt جاهز (اتفتح متأخر أو متثبت بالفعل) →
      // تعليمات تثبيت يدوية من قائمة كروم، مش QR (إحنا على الموبايل أصلاً).
      setShowModal('android')
    } else {
      setShowModal('desktop')
    }
  }

  // ============ Already installed state ============
  if (isStandalone) {
    return (
      <div className="da-installed">
        <CheckCircle2 className="da-installed-icon" />
        <div>
          <div className="da-installed-title">التطبيق متثبت — استمتع!</div>
          <div className="da-installed-sub">Madmona installed · enjoy faster browsing</div>
        </div>
        <style jsx>{INSTALLED_CSS}</style>
      </div>
    )
  }

  // ============ Big CTA button ============
  return (
    <>
      <button onClick={handleClick} className="da-big">
        {/* Floating decoration emojis */}
        <span className="da-floaty da-floaty-1" aria-hidden>📱</span>
        <span className="da-floaty da-floaty-2" aria-hidden>⚡</span>
        <span className="da-floaty da-floaty-3" aria-hidden>✨</span>
        <span className="da-floaty da-floaty-4" aria-hidden>🔔</span>

        <div className="da-left">
          <div className="da-icon-wrap">
            <Smartphone className="da-icon" />
            <span className="da-icon-pulse" aria-hidden />
          </div>
        </div>

        <div className="da-mid">
          <div className="da-kicker">
            <span className="da-kicker-dot" /> DOWNLOAD · مجاناً
          </div>
          <div className="da-title">حمّل تطبيق مضمونة</div>
          <div className="da-sub">
            احجز أسرع · إشعارات فورية · يشتغل أوفلاين
          </div>
          <div className="da-meta">
            <span className="da-tag">Android</span>
            <span className="da-tag-sep">·</span>
            <span className="da-tag">iOS</span>
            <span className="da-tag-sep">·</span>
            <span className="da-tag">Desktop</span>
          </div>
        </div>

        <div className="da-right">
          <span className="da-cta">
            <Download className="da-cta-icon" />
            <span>حمّل</span>
            <ArrowLeft className="da-cta-arrow" />
          </span>
        </div>
      </button>

      {/* Android: manual install instructions (when prompt not available) */}
      {showModal === 'android' && (
        <Modal onClose={() => setShowModal(null)} title="تثبيت على أندرويد">
          <div className="da-ios-steps">
            <Step n="١" text="اضغط زرار القائمة ⋮ فوق يمين كروم" />
            <Step n="٢" text="اختر 'تثبيت التطبيق' أو 'إضافة إلى الشاشة الرئيسية'" />
            <Step n="٣" text="اضغط 'تثبيت' — خلصت!" />
          </div>
          <p className="da-ios-note">
            لو مش لاقي 'تثبيت التطبيق'، يبقى التطبيق متثبّت عندك بالفعل — دوّر على أيقونة مضمونة في الشاشة الرئيسية.
          </p>
        </Modal>
      )}

      {/* iOS Install Instructions Modal */}
      {showModal === 'ios' && (
        <Modal onClose={() => setShowModal(null)} title="تثبيت على iPhone">
          <div className="da-ios-steps">
            <Step n="١" text="اضغط زرار المشاركة ⬆︎ في الأسفل" />
            <Step n="٢" text="اختر 'إضافة إلى الشاشة الرئيسية'" />
            <Step n="٣" text="اضغط 'إضافة' — خلصت!" />
          </div>
          <p className="da-ios-note">
            هتلاقي أيقونة مضمونة على الـ home screen — افتحها كأنها تطبيق عادي
          </p>
        </Modal>
      )}

      {/* Desktop: QR Code Modal */}
      {showModal === 'desktop' && (
        <Modal onClose={() => setShowModal(null)} title="افتح على موبايلك">
          <p className="da-desktop-intro">
            اسكان الـ QR ده بكاميرا الموبايل — هيفتح مضمونة جاهز للتثبيت:
          </p>
          <div className="da-qr">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={QR_API} alt="QR Code" width={240} height={240} />
          </div>
          <p className="da-desktop-link">
            أو افتح <code>madmonacairo.com</code> من موبايلك مباشرة
          </p>
        </Modal>
      )}

      <style jsx>{BIG_CSS}</style>
    </>
  )
}

// ============ Sub-components ============

function Step({ n, text }: { n: string; text: string }) {
  return (
    <div className="da-step">
      <span className="da-step-n">{n}</span>
      <span>{text}</span>
      <style jsx>{`
        .da-step{display:flex;align-items:center;gap:12px;padding:14px;background:#FAFAF7;border-radius:14px;font-size:14px;font-weight:600;color:#0A0A0A}
        .da-step-n{width:28px;height:28px;border-radius:50%;background:#1F6F5F;color:#fff;display:grid;place-items:center;font-weight:800;flex:none;font-size:13px}
      `}</style>
    </div>
  )
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="da-modal-overlay" onClick={onClose}>
      <div className="da-modal" onClick={(e) => e.stopPropagation()}>
        <div className="da-modal-head">
          <div className="da-modal-title">{title}</div>
          <button onClick={onClose} className="da-modal-close" aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>
        <div className="da-modal-body">{children}</div>
      </div>
      <style jsx>{`
        .da-modal-overlay{position:fixed;inset:0;background:rgba(10,10,10,.55);backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;animation:daFade .2s ease}
        @keyframes daFade{from{opacity:0}to{opacity:1}}
        .da-modal{background:#fff;border-radius:24px;max-width:400px;width:100%;overflow:hidden;animation:daRise .3s cubic-bezier(.2,.7,.2,1)}
        @keyframes daRise{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        .da-modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid #F3F1EA}
        .da-modal-title{font-weight:800;font-size:17px;color:#0A0A0A}
        .da-modal-close{width:34px;height:34px;border-radius:50%;background:#FAFAF7;border:none;cursor:pointer;display:grid;place-items:center;color:#7C8A84;transition:.2s}
        .da-modal-close:hover{background:#0A0A0A;color:#fff}
        .da-modal-body{padding:20px}
        .da-qr{display:flex;justify-content:center;padding:16px 0}
        .da-qr img{border-radius:16px;border:1px solid #E5DFD3}
        .da-desktop-intro{font-size:14px;color:#7C8A84;margin:0 0 12px;text-align:center;line-height:1.6}
        .da-desktop-link{font-size:12px;color:#7C8A84;margin:12px 0 0;text-align:center}
        .da-desktop-link code{background:#FAFAF7;padding:2px 8px;border-radius:6px;font-family:monospace;color:#1F6F5F;font-weight:700}
        .da-ios-steps{display:flex;flex-direction:column;gap:10px}
        .da-ios-note{font-size:12.5px;color:#7C8A84;margin:14px 0 0;text-align:center;line-height:1.6}
      `}</style>
    </div>
  )
}

// ============ Styles ============

const BIG_CSS = `
.da-big{
  position:relative; width:100%; cursor:pointer;
  display:grid; grid-template-columns:auto 1fr auto; gap:18px; align-items:center;
  padding:22px 26px;
  background:linear-gradient(118deg, #1F6F5F 0%, #2a7a52 50%, #2FA084 100%);
  border:none; border-radius:24px; color:#fff;
  text-align:right; overflow:hidden;
  box-shadow:0 10px 30px -8px rgba(31,111,95,.45), 0 1px 0 rgba(255,255,255,.10) inset;
  transition:transform .25s cubic-bezier(.2,.7,.2,1), box-shadow .25s;
}
.da-big::before{
  content:""; position:absolute; inset:0; pointer-events:none;
  background:
    radial-gradient(circle at 90% 20%, rgba(212,160,23,.25) 0, transparent 40%),
    radial-gradient(circle at 10% 80%, rgba(111,207,151,.20) 0, transparent 45%);
}
.da-big:hover{transform:translateY(-3px);box-shadow:0 22px 50px -10px rgba(31,111,95,.55), 0 1px 0 rgba(255,255,255,.15) inset}
.da-big:active{transform:translateY(-1px)}

/* Floating decoration emojis */
.da-floaty{position:absolute;font-size:22px;opacity:.20;pointer-events:none;animation:daFloat 11s ease-in-out infinite;filter:saturate(.7)}
.da-floaty-1{top:14%;left:42%;animation-delay:0s}
.da-floaty-2{top:60%;left:48%;animation-delay:2.5s;font-size:18px}
.da-floaty-3{top:30%;left:34%;animation-delay:5s;font-size:16px}
.da-floaty-4{top:70%;left:38%;animation-delay:3.5s;font-size:20px}
@keyframes daFloat{
  0%,100%{transform:translateY(0) rotate(0)}
  50%{transform:translateY(-8px) rotate(5deg)}
}

/* Left: phone icon */
.da-left{position:relative;z-index:2;flex:none}
.da-icon-wrap{position:relative;width:64px;height:64px;border-radius:18px;background:rgba(255,255,255,.18);backdrop-filter:blur(8px);display:grid;place-items:center;border:1px solid rgba(255,255,255,.25)}
.da-icon{width:30px;height:30px;color:#fff;stroke-width:2}
.da-icon-pulse{position:absolute;inset:-4px;border-radius:22px;border:2px solid rgba(255,255,255,.5);animation:daPulse 4s ease-out infinite}
@keyframes daPulse{0%{opacity:1;transform:scale(.95)}100%{opacity:0;transform:scale(1.15)}}

/* Middle: text */
.da-mid{position:relative;z-index:2;flex:1;min-width:0}
.da-kicker{font-size:10.5px;font-weight:700;letter-spacing:.18em;color:rgba(255,255,255,.85);text-transform:uppercase;display:inline-flex;align-items:center;gap:6px;margin-bottom:4px}
.da-kicker-dot{width:5px;height:5px;border-radius:50%;background:#FAD56B;box-shadow:0 0 8px #FAD56B;animation:daKickPulse 4s ease-in-out infinite}
@keyframes daKickPulse{0%,100%{opacity:.8}50%{opacity:1}}
.da-title{font-size:clamp(20px, 3.2vw, 26px);font-weight:900;color:#fff;letter-spacing:-.5px;line-height:1.15;margin-bottom:4px}
.da-sub{font-size:13px;color:rgba(255,255,255,.88);line-height:1.5;font-weight:500;margin-bottom:8px}
.da-meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.da-tag{font-size:10.5px;font-weight:700;color:#fff;background:rgba(255,255,255,.18);padding:2px 8px;border-radius:999px;letter-spacing:.02em}
.da-tag-sep{color:rgba(255,255,255,.5);font-weight:300}

/* Right: CTA button */
.da-right{position:relative;z-index:2;flex:none}
.da-cta{display:inline-flex;align-items:center;gap:8px;padding:14px 22px;background:#FAFAF7;color:#1F6F5F;border-radius:999px;font-size:15px;font-weight:900;letter-spacing:-.01em;box-shadow:0 6px 18px rgba(0,0,0,.18);transition:.25s}
.da-big:hover .da-cta{background:#FAD56B;color:#0A0A0A;transform:translateX(-3px)}
.da-cta-icon{width:18px;height:18px;flex:none}
.da-cta-arrow{width:16px;height:16px;flex:none;transition:.25s}
.da-big:hover .da-cta-arrow{transform:translateX(-3px)}

/* Mobile: stack */
@media(max-width:680px){
  .da-big{grid-template-columns:auto 1fr;gap:14px;padding:20px}
  .da-right{grid-column:1/-1;display:flex;justify-content:stretch}
  .da-cta{width:100%;justify-content:center;padding:14px;font-size:15px}
  .da-floaty-1,.da-floaty-3{display:none}
  .da-title{font-size:20px}
  .da-sub{font-size:12.5px}
}
@media(prefers-reduced-motion:reduce){
  .da-floaty,.da-icon-pulse,.da-kicker-dot{animation:none}
}
`

const INSTALLED_CSS = `
.da-installed{
  display:flex;align-items:center;gap:14px;
  padding:16px 20px;
  background:#E7F1ED;border:1px solid rgba(31,111,95,.20);
  border-radius:20px;
}
.da-installed-icon{width:28px;height:28px;color:#1F6F5F;flex:none}
.da-installed-title{font-size:14.5px;font-weight:800;color:#0A0A0A;line-height:1.2}
.da-installed-sub{font-size:11.5px;color:#7C8A84;margin-top:2px;letter-spacing:.02em}
`
