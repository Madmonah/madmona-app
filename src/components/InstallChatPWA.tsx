'use client';

import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/**
 * زرار تنصيب PWA لشات مضمون.
 * - أندرويد/كروم ديسكتوب: يستخدم beforeinstallprompt event
 * - iOS Safari: يعرض تعليمات "إضافة إلى الشاشة الرئيسية"
 * - يتخفى نهائي فقط لو الشات متنصّب (display-mode: standalone)
 * - × يقفل للجلسة الحالية فقط — يرجع يظهر تاني على أي زيارة جديدة
 * - Scope اللينك = /chat (من public/chat-manifest.webmanifest)
 */
export default function InstallChatPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    const ua = window.navigator.userAgent.toLowerCase();
    const iOS = /iphone|ipad|ipod/.test(ua) && !/crios|fxios|edgios/.test(ua);
    setIsIOS(iOS);

    if (iOS) {
      const t = setTimeout(() => setVisible(true), 3000);
      return () => clearTimeout(t);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const installedHandler = () => {
      setVisible(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const dismissForNow = () => {
    setVisible(false);
    setShowIOSHelp(false);
  };

  const install = async () => {
    if (isIOS) {
      setShowIOSHelp(true);
      return;
    }
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setVisible(false);
    } catch {}
    setDeferredPrompt(null);
  };

  if (!visible) return null;

  return (
    <>
      <div
        dir="rtl"
        role="dialog"
        aria-label="ثبّت شات مضمون"
        style={{
          position: 'fixed',
          bottom: 16,
          left: 16,
          right: 16,
          maxWidth: 420,
          margin: '0 auto',
          background: '#075E54',
          color: '#fff',
          borderRadius: 16,
          padding: '12px 16px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
          zIndex: 9999,
          fontFamily: 'Cairo, sans-serif',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <img
          src="/marid-icon-192.png"
          alt=""
          aria-hidden="true"
          style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>
            ثبّت شات مضمون
          </div>
          <div style={{ fontSize: 12, opacity: 0.9, lineHeight: 1.4 }}>
            افتحه من الشاشة الرئيسية زي أي تطبيق
          </div>
        </div>
        <button
          onClick={install}
          style={{
            background: '#fff',
            color: '#075E54',
            border: 'none',
            padding: '8px 14px',
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: 'inherit',
            flexShrink: 0,
          }}
        >
          ثبّت
        </button>
        <button
          onClick={dismissForNow}
          aria-label="اقفل مؤقتًا"
          title="هيرجع يظهر تاني لحد ما تثبّت التطبيق"
          style={{
            background: 'transparent',
            color: '#fff',
            border: 'none',
            fontSize: 22,
            cursor: 'pointer',
            padding: 4,
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>

      {showIOSHelp && (
        <div
          onClick={dismissForNow}
          dir="rtl"
          role="dialog"
          aria-label="تعليمات التنصيب على iOS"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: 16,
            fontFamily: 'Cairo, sans-serif',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              color: '#111',
              borderRadius: 16,
              padding: 20,
              maxWidth: 420,
              width: '100%',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
              ثبّت شات مضمون على الآيفون
            </div>
            <ol
              style={{
                fontSize: 14,
                lineHeight: 1.9,
                paddingInlineStart: 20,
                margin: 0,
              }}
            >
              <li>افتح الصفحة في متصفح Safari</li>
              <li>دوس على زرار المشاركة في الأسفل ⬆️</li>
              <li>اختار «إضافة إلى الشاشة الرئيسية»</li>
              <li>دوس «إضافة»</li>
            </ol>
            <button
              onClick={dismissForNow}
              style={{
                marginTop: 16,
                background: '#075E54',
                color: '#fff',
                border: 'none',
                padding: '12px 20px',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: 'inherit',
                width: '100%',
              }}
            >
              تمام
            </button>
          </div>
        </div>
      )}
    </>
  );
}
