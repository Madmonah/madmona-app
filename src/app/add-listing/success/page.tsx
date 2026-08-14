'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ListingSuccessPage() {
  return (
    <Suspense fallback={
      <div dir="rtl" lang="ar" className="min-h-screen bg-[#34D399] text-[#FAF7F0] flex items-center justify-center">
        جاري التحميل...
      </div>
    }>
      <ListingSuccessPageInner />
    </Suspense>
  );
}

function ListingSuccessPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');
  const [draft, setDraft] = useState<any>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/listing-drafts?token=${token}`)
      .then((r) => r.json())
      .then((j) => setDraft(j.draft));
  }, [token]);

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-[#34D399] text-[#FAF7F0] flex items-center justify-center px-5">
      <div className="max-w-lg w-full text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold mb-2">تم استلام المنتج!</h1>
        <p className="text-[#FAF7F0]/70 mb-6">
          {draft?.title ? <>"{draft.title}"</> : 'إعلانك'} وصلنا — فريقنا هيراجعه ويتواصل معاك خلال ساعات قليلة على الواتس اب.
        </p>

        <div className="bg-[#FAF7F0]/5 border border-[#FAF7F0]/10 rounded-2xl p-5 mb-6 text-right">
          <div className="text-sm font-semibold mb-3 text-[#2FA084]">الخطوة الجاية: أنشئ حسابك (دقيقة واحدة)</div>
          <ul className="text-sm space-y-2 text-[#FAF7F0]/80">
            <li>✅ تتحكم في إعلانك (تعدل، توقف، تنشر)</li>
            <li>✅ تستقبل طلبات الإيجار</li>
            <li>✅ تتابع مستحقاتك</li>
            <li>✅ تضيف منتجات تانية</li>
          </ul>
        </div>

        <div className="grid gap-3">
          <a
            href={`/add-listing?another=${token}`}
            className="block py-4 rounded-xl bg-[#FAF7F0] text-[#059669] font-black text-center border-2 border-[#2FA084]"
          >
            ➕ ضيف صنف تاني — بياناتك محفوظة
          </a>
          <a
            href={`/signup?token=${token}&phone=${encodeURIComponent(draft?.contact_phone || '')}`}
            className="block py-4 rounded-xl bg-[#2FA084] text-[#059669] font-bold text-center"
          >
            أنشئ حسابي دلوقتي →
          </a>
          <a href="/" className="text-sm text-[#FAF7F0]/60 hover:text-[#FAF7F0]">
            دلوقتي مش، هرجع بعدين
          </a>
        </div>

        <p className="mt-4 text-xs text-[#FAF7F0]/60 leading-relaxed">
          📊 عندك أصناف كتير (١٠+)؟ بعد ما تنشئ حسابك هتلاقي
          «استيراد بالجملة (Excel)» في لوحتك — بترفع لحد ٢٠٠ إعلان بشيت واحد.
        </p>

        <div className="mt-8 text-xs text-[#FAF7F0]/40">
          محتاج مساعدة؟ كلمنا على الواتس اب: <a href="https://wa.me/201002229982" className="text-[#2FA084]">01002229982</a>
        </div>
      </div>
    </div>
  );
}
