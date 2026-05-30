'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// =====================================================================
// DailyMessageCard
//
// A retention card displayed on the home page (typically above the
// marketplace browse area). Fetches the day's message via /api/daily-messages
// and renders a big tappable card with title, body, optional image, and
// CTA button.
//
// Behavior:
//   - On mount: fetch + auto-record 'view' interaction (for logged-in users)
//   - Dismiss (×): hides the card + posts 'dismiss' interaction
//   - CTA click: posts 'cta_click' interaction + navigates
//   - Hidden if no message available or already dismissed in this session
// =====================================================================

type DailyMessage = {
  id: string;
  title: string;
  body: string;
  category: string;
  image_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  deal_code: string | null;
  already_viewed: boolean;
};

const categoryStyles: Record<string, { bg: string; border: string; emoji: string }> = {
  greeting:     { bg: 'bg-[#FAFAF7]', border: 'border-[#1F6F5F]/30', emoji: '👋' },
  announcement: { bg: 'bg-amber-50',  border: 'border-amber-300',    emoji: '📢' },
  tip:          { bg: 'bg-emerald-50', border: 'border-emerald-300', emoji: '💡' },
  deal:         { bg: 'bg-rose-50',    border: 'border-rose-300',    emoji: '🎁' },
  motivation:   { bg: 'bg-sky-50',     border: 'border-sky-300',     emoji: '⭐' },
};

export default function DailyMessageCard() {
  const [message, setMessage] = useState<DailyMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/daily-messages')
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        if (data.success && data.message) {
          setMessage(data.message);
          // Auto-record view (fire-and-forget; ignored for anonymous users)
          fetch('/api/daily-messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message_id: data.message.id, action: 'view' }),
          }).catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  function handleDismiss() {
    if (!message) return;
    setDismissed(true);
    fetch('/api/daily-messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_id: message.id, action: 'dismiss' }),
    }).catch(() => {});
  }

  function handleCtaClick() {
    if (!message) return;
    fetch('/api/daily-messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_id: message.id, action: 'cta_click' }),
    }).catch(() => {});
  }

  // Phase Z (May 18 2026): share via Web Share API + WhatsApp fallback.
  async function handleShare() {
    if (!message) return;
    const shareText = `${message.title}\n\n${message.body}\n\n— مضمونة (madmonacairo.com)`;
    const shareUrl = 'https://madmonacairo.com';
    // Try Web Share API first (mobile-friendly, opens native share sheet)
    if (typeof navigator !== 'undefined' && (navigator as Navigator & { share?: (data: ShareData) => Promise<void> }).share) {
      try {
        await (navigator as Navigator & { share: (data: ShareData) => Promise<void> }).share({
          title: message.title,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled — fall through silently
        return;
      }
    }
    // Fallback: open WhatsApp web/app with pre-filled message
    const wa = `https://wa.me/?text=${encodeURIComponent(shareText + '\n' + shareUrl)}`;
    window.open(wa, '_blank', 'noopener');
  }

  if (loading) {
    // Show a skeleton to avoid layout shift
    return (
      <div className="my-4 h-28 rounded-2xl bg-gray-100 animate-pulse" />
    );
  }

  if (!message || dismissed) return null;

  const style = categoryStyles[message.category] || categoryStyles.tip;

  return (
    <div
      className={`my-4 relative rounded-2xl ${style.bg} ${style.border} border-2 p-5 transition-all hover:shadow-md`}
    >
      {/* Dismiss button (×) — bigger + more visible (Mohamed request, May 30 2026) */}
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-3 left-3 w-10 h-10 rounded-full bg-white/90 hover:bg-white active:scale-95 text-gray-700 hover:text-gray-900 flex items-center justify-center text-2xl font-bold leading-none transition-all shadow-sm z-10"
        aria-label="إخفاء"
      >
        ×
      </button>

      {/* Body */}
      <div className="flex items-start gap-3 pe-12">
        {message.image_url ? (
          <img
            src={message.image_url}
            alt=""
            className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-white/60 flex items-center justify-center text-3xl flex-shrink-0">
            {style.emoji}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base text-gray-900 mb-1">{message.title}</h3>
          <p className="text-sm text-gray-700 leading-relaxed">{message.body}</p>

          {/* Deal code (revealed inline) */}
          {message.deal_code && (
            <div className="mt-3 inline-flex items-center gap-2 bg-white border border-dashed border-rose-400 px-3 py-1.5 rounded-lg">
              <span className="text-xs text-gray-500">كود الخصم:</span>
              <span className="font-mono font-bold text-rose-600 text-sm tracking-wide">
                {message.deal_code}
              </span>
            </div>
          )}

          {/* CTA button */}
          {message.cta_label && message.cta_url && (
            <Link
              href={message.cta_url}
              onClick={handleCtaClick}
              className="inline-block mt-3 px-4 py-2 rounded-xl bg-[#1F6F5F] text-white font-semibold text-sm hover:bg-[#1F6F5F]/90 transition-colors"
            >
              {message.cta_label} ←
            </Link>
          )}

          {/* Phase Z (May 18 2026): share button — always shown */}
          <button
            type="button"
            onClick={handleShare}
            className={`inline-flex items-center gap-1.5 ${message.cta_label && message.cta_url ? 'ms-2 mt-3' : 'mt-3'} px-3 py-2 rounded-xl bg-white border border-[#1F6F5F]/30 text-[#1F6F5F] font-semibold text-xs hover:bg-[#1F6F5F]/5 transition-colors`}
            title="شارك على واتساب أو غيره"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
            شارك
          </button>
        </div>
      </div>
    </div>
  );
}
