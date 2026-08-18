import { waPhone } from '@/lib/waPhone'
// app/admin/listing-drafts/page.tsx
// =====================================================================
// Madmona Admin — Listing Drafts Dashboard
// Shows incoming listing drafts in real-time. Lets admin review and
// manually claim/reject. Auto-refreshes every 30 seconds.
// =====================================================================

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Draft = {
  id: string;
  claim_token: string;
  title: string;
  description: string | null;
  category_slug: string | null;
  city: string | null;
  district: string | null;
  price: number | null;
  price_period: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  account_type: 'individual' | 'business';
  business_name: string | null;
  photos: { url: string }[];
  status: 'draft' | 'submitted' | 'claimed' | 'rejected' | 'expired';
  current_step: number;
  source: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  claimed_at: string | null;
  created_at: string;
  updated_at: string;
};

type Funnel = {
  day: string;
  started: number;
  submitted: number;
  claimed: number;
  expired: number;
  conversion_pct: number | null;
};

const STATUS_COLORS: Record<string, string> = {
  draft:     'bg-gray-500/20 text-gray-300 border-gray-500/30',
  submitted: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  claimed:   'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  rejected:  'bg-red-500/20 text-red-300 border-red-500/30',
  expired:   'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

const STATUS_LABEL: Record<string, string> = {
  draft:     'مسودة (لسه بيملا)',
  submitted: 'اتسلمت ⏳',
  claimed:   'تم إنشاء الحساب ✅',
  rejected:  'مرفوض',
  expired:   'منتهي',
};

export default function ListingDraftsAdminPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [funnel, setFunnel] = useState<Funnel[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  async function load() {
    try {
      const res = await fetch(`/api/admin/listing-drafts?status=${filter}`, {
        cache: 'no-store',
      });
      const json = await res.json();
      if (json.drafts) setDrafts(json.drafts);
      if (json.funnel) setFunnel(json.funnel);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filter]);

  useEffect(() => {
    if (!autoRefresh) return;
    const i = setInterval(load, 30000);
    return () => clearInterval(i);
  }, [autoRefresh, filter]);

  const counts = {
    all: drafts.length,
    submitted: drafts.filter((d) => d.status === 'submitted').length,
    claimed: drafts.filter((d) => d.status === 'claimed').length,
    draft: drafts.filter((d) => d.status === 'draft').length,
  };

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-[#34D399] text-[#FAF7F0]">
      <header className="border-b border-[#FAF7F0]/10 px-5 py-4 sticky top-0 bg-[#34D399]/95 backdrop-blur z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold">لوحة الـ Drafts</h1>
            <p className="text-xs text-[#FAF7F0]/60">إعلانات قيد المراجعة — تنشر بعد ما العميل يعمل حسابه</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="accent-[#2FA084]"
              />
              تحديث تلقائي كل 30 ثانية
            </label>
            <button
              onClick={load}
              className="px-3 py-1.5 rounded-lg bg-[#2FA084] text-[#059669] text-xs font-semibold hover:bg-[#2FA084]/90"
            >
              {loading ? '...' : 'تحديث الآن'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-6">
        {/* Funnel summary (today only) */}
        {funnel[0] && (
          <section className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="بدأوا اليوم" value={funnel[0].started} />
            <Stat label="سلموا اليوم" value={funnel[0].submitted} color="text-amber-300" />
            <Stat label="عملوا حساب" value={funnel[0].claimed} color="text-emerald-300" />
            <Stat
              label="نسبة التحويل"
              value={funnel[0].conversion_pct !== null ? `${funnel[0].conversion_pct}%` : '-'}
              color="text-[#2FA084]"
            />
          </section>
        )}

        {/* Filter tabs */}
        <nav className="flex gap-2 mb-5 overflow-x-auto">
          {[
            { key: 'all',       label: 'الكل',       count: counts.all },
            { key: 'submitted', label: 'محتاجة مراجعة', count: counts.submitted },
            { key: 'claimed',   label: 'مكتملة',     count: counts.claimed },
            { key: 'draft',     label: 'لسه شغالين عليها', count: counts.draft },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-all ${
                filter === t.key
                  ? 'bg-[#2FA084] text-[#059669] font-semibold'
                  : 'bg-[#FAF7F0]/5 border border-[#FAF7F0]/10 hover:bg-[#FAF7F0]/10'
              }`}
            >
              {t.label}
              <span className="mr-2 opacity-70">({t.count})</span>
            </button>
          ))}
        </nav>

        {/* Drafts list */}
        {loading && drafts.length === 0 ? (
          <div className="text-center py-12 text-[#FAF7F0]/50">جاري التحميل...</div>
        ) : drafts.length === 0 ? (
          <div className="text-center py-20 text-[#FAF7F0]/50">
            <div className="text-5xl mb-3">📭</div>
            <p>مفيش drafts في الفلتر دا</p>
          </div>
        ) : (
          <div className="space-y-3">
            {drafts.map((d) => (
              <DraftCard key={d.id} draft={d} onUpdate={load} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div className="bg-[#FAF7F0]/5 border border-[#FAF7F0]/10 rounded-2xl p-4">
      <div className={`text-2xl font-bold ${color || ''}`}>{value}</div>
      <div className="text-xs text-[#FAF7F0]/60 mt-1">{label}</div>
    </div>
  );
}

function DraftCard({ draft, onUpdate }: { draft: Draft; onUpdate: () => void }) {
  const [busy, setBusy] = useState(false);

  async function sendWhatsApp() {
    setBusy(true);
    try {
      await fetch('/api/admin/listing-drafts/nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: draft.id }),
      });
      alert('اتبعت رسالة نقاش على الواتس اب');
      onUpdate();
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    if (!confirm('متأكد إنك عايز ترفض الإعلان دا؟')) return;
    setBusy(true);
    try {
      await fetch('/api/admin/listing-drafts/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: draft.id }),
      });
      onUpdate();
    } finally {
      setBusy(false);
    }
  }

  const time = new Date(draft.created_at).toLocaleString('ar-EG', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  return (
    <article className="bg-[#FAF7F0]/5 border border-[#FAF7F0]/10 rounded-2xl p-5 hover:border-[#2FA084]/40 transition-colors">
      <header className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base mb-1">{draft.title || '(بدون عنوان)'}</h3>
          <div className="text-xs text-[#FAF7F0]/60 flex items-center gap-2 flex-wrap">
            <span>📍 {draft.city || '-'}</span>
            {draft.district && <span>· {draft.district}</span>}
            <span>· 🏷 {draft.category_slug || '-'}</span>
            <span>· ⏰ {time}</span>
          </div>
        </div>
        <span
          className={`px-2.5 py-1 rounded-lg text-xs font-medium border whitespace-nowrap ${
            STATUS_COLORS[draft.status] || ''
          }`}
        >
          {STATUS_LABEL[draft.status] || draft.status}
        </span>
      </header>

      {draft.description && (
        <p className="text-sm text-[#FAF7F0]/80 mb-3 line-clamp-2">{draft.description}</p>
      )}

      {draft.photos && draft.photos.length > 0 && (
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          {draft.photos.slice(0, 5).map((p, i) => (
            <img
              key={i}
              src={p.url}
              alt=""
              className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
            />
          ))}
          {draft.photos.length > 5 && (
            <div className="w-20 h-20 rounded-lg bg-black/30 flex items-center justify-center text-xs flex-shrink-0">
              +{draft.photos.length - 5}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
        <Field label="السعر">
          {draft.price ? `${draft.price} ج.م / ${draft.price_period === 'daily' ? 'يوم' : draft.price_period === 'monthly' ? 'شهر' : draft.price_period === 'weekly' ? 'أسبوع' : 'ساعة'}` : '-'}
        </Field>
        <Field label="الاسم">{draft.contact_name || '-'}</Field>
        <Field label="الموبايل">
          {draft.contact_phone ? (
            <a href={`https://wa.me/${waPhone(draft.contact_phone)}`} target="_blank" className="text-[#2FA084] hover:underline" dir="ltr">
              {draft.contact_phone}
            </a>
          ) : (
            <span className="text-[#FAF7F0]/40">—</span>
          )}
        </Field>
        <Field label="النوع">
          {draft.account_type === 'business' ? `شركة (${draft.business_name || '-'})` : 'فرد'}
        </Field>
      </div>

      <footer className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-xs text-[#FAF7F0]/40">
          {draft.utm_source && <span>المصدر: {draft.utm_source}</span>}
          {draft.utm_campaign && <span> · حملة: {draft.utm_campaign}</span>}
        </div>
        {draft.status === 'submitted' && (
          <div className="flex gap-2">
            <button
              onClick={sendWhatsApp}
              disabled={busy}
              className="px-3 py-1.5 rounded-lg bg-[#2FA084] text-[#059669] text-xs font-semibold hover:bg-[#2FA084]/90 disabled:opacity-50"
            >
              تذكير على الواتس اب
            </button>
            <button
              onClick={reject}
              disabled={busy}
              className="px-3 py-1.5 rounded-lg bg-red-600/20 text-red-300 border border-red-600/40 text-xs hover:bg-red-600/30 disabled:opacity-50"
            >
              رفض
            </button>
          </div>
        )}
      </footer>
    </article>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-[#FAF7F0]/50 mb-0.5">{label}</div>
      <div className="font-medium">{children}</div>
    </div>
  );
}
