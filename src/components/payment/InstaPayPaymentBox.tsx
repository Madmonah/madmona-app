'use client';

import { useEffect, useState } from 'react';

// =====================================================================
// InstaPayPaymentBox — bank-transfer payment instructions
//
// HISTORY:
//   v1 (May 18 2026 morning): InstaPay-branded, expected a Collect Money
//     link generated from Mohamed's InstaPay app.
//   v2 (May 18 2026 evening, this file): pivoted to BANK TRANSFER mode
//     because Mohamed's corporate Banque Misr account can't generate
//     InstaPay app links. Now:
//       - title = "ادفع بالتحويل البنكي"
//       - shows bank_name + holder + account + (optional) IPA/IBAN
//       - the "افتح InstaPay" CTA only renders if a link IS set (kept
//         for forward-compat in case Mohamed gets a personal InstaPay
//         later)
//       - copy emphasises that customer can transfer from ANY app
//         (their bank, their InstaPay, ATM) by sending to the displayed
//         account number
//
// File name kept (InstaPayPaymentBox.tsx) to avoid an import-update
// cascade. Component-level renaming via the alias re-export at the
// bottom keeps both names available.
// =====================================================================

type PaymentConfig = {
  enabled: boolean;
  account_number: string;
  holder_name: string;
  bank_name: string;
  ipa: string;
  payment_link: string;
  qr_image_url: string;
  iban: string;
  swift: string;
};

export default function InstaPayPaymentBox({
  amount,
  reference,
}: {
  amount?: number;
  reference?: string;
}) {
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/payment/instapay')
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        if (data.success) setConfig(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  async function copyToClipboard(text: string, field: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Older browsers: silently skip; user can long-press to copy manually
    }
  }

  if (loading) {
    return (
      <div className="my-6 h-40 rounded-2xl bg-gray-100 animate-pulse" />
    );
  }

  if (!config || !config.enabled) return null;

  const hasNothing = !config.account_number && !config.ipa && !config.payment_link;
  if (hasNothing) return null;

  return (
    <div className="my-6 rounded-2xl bg-white border-2 border-[#1F6F5F]/20 p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-[#1F6F5F]/10 flex items-center justify-center text-2xl">
          🏦
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-base text-gray-900">ادفع بالتحويل البنكي</h3>
          <p className="text-xs text-gray-500">
            حوّل من تطبيق بنكك أو InstaPay على الحساب اللي تحت
          </p>
        </div>
      </div>

      {/* Amount badge (if provided) */}
      {amount !== undefined && amount > 0 && (
        <div className="mb-4 p-4 rounded-xl bg-gradient-to-l from-[#1F6F5F]/8 to-[#1F6F5F]/4 border border-[#1F6F5F]/20">
          <div className="text-xs text-gray-600 mb-1">المبلغ المطلوب</div>
          <div className="text-2xl font-bold text-[#1F6F5F]">
            {amount.toLocaleString('ar-EG')} <span className="text-base">ج.م</span>
          </div>
          {reference && (
            <div className="mt-2 text-xs text-gray-500">
              رقم مرجعي:{' '}
              <span className="font-mono font-bold text-gray-700">{reference}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(reference, 'reference')}
                className="ms-2 text-[#1F6F5F] hover:underline"
              >
                {copiedField === 'reference' ? '✓ اتنسخ' : 'انسخ'}
              </button>
              <span className="block text-[10px] text-gray-400 mt-0.5">
                اكتبه في "ملاحظات/تفاصيل" التحويل عشان نلاقي حجزك بسرعة
              </span>
            </div>
          )}
        </div>
      )}

      {/* Optional CTA: open InstaPay link (only if Mohamed has saved a payment_link) */}
      {config.payment_link && (
        <a
          href={config.payment_link}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center py-3.5 rounded-xl bg-[#1F6F5F] text-white font-bold text-base hover:bg-[#1F6F5F]/90 transition-colors mb-3"
        >
          افتح تطبيق InstaPay وادفع فوراً ←
        </a>
      )}

      {/* Bank transfer details */}
      <div className="space-y-3">
        {config.bank_name && (
          <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-gray-500 mb-0.5">البنك</div>
              <div className="text-sm font-semibold text-gray-900 truncate">{config.bank_name}</div>
            </div>
          </div>
        )}

        {config.holder_name && (
          <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-gray-500 mb-0.5">اسم المستفيد</div>
              <div className="text-sm font-semibold text-gray-900 truncate">{config.holder_name}</div>
            </div>
          </div>
        )}

        {config.account_number && (
          <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-gray-500 mb-0.5">رقم الحساب</div>
              <div className="text-sm font-mono font-bold text-gray-900 tracking-wide">
                {config.account_number}
              </div>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(config.account_number, 'account')}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-white border border-[#1F6F5F]/30 text-xs font-bold text-[#1F6F5F] hover:bg-[#1F6F5F]/5"
            >
              {copiedField === 'account' ? '✓ اتنسخ' : 'انسخ'}
            </button>
          </div>
        )}

        {config.ipa && (
          <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-gray-500 mb-0.5">الـ IPA (لو حابب أسهل من رقم الحساب)</div>
              <div className="text-sm font-mono font-bold text-gray-900 truncate">{config.ipa}</div>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(config.ipa, 'ipa')}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-white border border-[#1F6F5F]/30 text-xs font-bold text-[#1F6F5F] hover:bg-[#1F6F5F]/5"
            >
              {copiedField === 'ipa' ? '✓ اتنسخ' : 'انسخ'}
            </button>
          </div>
        )}

        {config.iban && (
          <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-gray-500 mb-0.5">IBAN (للتحويل الدولي)</div>
              <div className="text-xs font-mono font-bold text-gray-900 break-all">{config.iban}</div>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(config.iban, 'iban')}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-white border border-[#1F6F5F]/30 text-xs font-bold text-[#1F6F5F] hover:bg-[#1F6F5F]/5"
            >
              {copiedField === 'iban' ? '✓ اتنسخ' : 'انسخ'}
            </button>
          </div>
        )}

        {config.qr_image_url && (
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-center">
            <div className="text-[11px] text-gray-500 mb-2">أو امسح الـ QR من تطبيق InstaPay</div>
            <img
              src={config.qr_image_url}
              alt="QR للدفع"
              className="w-40 h-40 mx-auto rounded-lg"
            />
          </div>
        )}
      </div>

      {/* How-to + confirmation footnote */}
      <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-500 leading-relaxed space-y-1.5">
        <div>
          💡 <span className="font-semibold text-gray-700">طرق التحويل:</span>{' '}
          من تطبيق بنكك، أو InstaPay، أو ATM، أو فيزا تحويل — كله بيشتغل مع نفس رقم الحساب.
        </div>
        <div>
          📱 بعد التحويل، ابعتلنا screenshot على{' '}
          <a
            href="https://wa.me/201002229982"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#25D366] font-bold"
          >
            واتساب
          </a>{' '}
          نأكدلك الحجز فوراً.
        </div>
      </div>
    </div>
  );
}
