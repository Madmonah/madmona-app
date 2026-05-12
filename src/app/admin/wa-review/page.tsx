// app/admin/wa-review/page.tsx
// =====================================================================
// Madmona Admin — WhatsApp Reply Review
// Shows pending_review drafts. Lets you Approve & Send, Edit & Send, or Skip.
// =====================================================================

'use client';

import { useEffect, useState } from 'react';

type Draft = {
  draft_id: string;
  draft_body: string;
  drafted_at: string;
  drafted_by: string;
  metadata: Record<string, any>;
  conversation: {
    id: string;
    phone: string;
    name: string | null;
    type: string | null;
    intent: string | null;
    category: string | null;
    ad_headline: string | null;
    last_inbound_at: string | null;
  };
  last_inbound_text: string | null;
  history: Array<{ direction: string; body: string; ai_generated: boolean; created_at: string }>;
};

export default function WaReviewPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [totalPending, setTotalPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/wa-review', { cache: 'no-store' });
      const d = await r.json();
      setDrafts(d.drafts || []);
      setTotalPending(d.total_pending || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, []);

  const flash = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const approveAndSend = async (d: Draft) => {
    if (busy[d.draft_id]) return;
    setBusy(b => ({ ...b, [d.draft_id]: true }));
    try {
      const edited = editing[d.draft_id];
      const payload: any = { draft_id: d.draft_id };
      if (edited !== undefined && edited !== d.draft_body) {
        payload.edited_body = edited;
      }
      const r = await fetch('/api/admin/wa-review/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await r.json();
      if (result.ok) {
        flash(`✓ اتبعت لـ ${d.conversation.name || d.conversation.phone}`, true);
        await refresh();
      } else {
        flash(`✗ خطأ: ${result.error || 'unknown'}`, false);
      }
    } catch (err: any) {
      flash(`✗ ${err?.message || 'unknown'}`, false);
    } finally {
      setBusy(b => ({ ...b, [d.draft_id]: false }));
    }
  };

  const skipDraft = async (d: Draft) => {
    if (busy[d.draft_id]) return;
    if (!confirm('متأكد عايز تتجاهل الدرافت ده؟')) return;
    setBusy(b => ({ ...b, [d.draft_id]: true }));
    try {
      const r = await fetch('/api/admin/wa-review/skip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_id: d.draft_id, reason: 'admin_skipped_in_ui' }),
      });
      const result = await r.json();
      if (result.ok) {
        flash('تم التجاهل', true);
        await refresh();
      } else {
        flash(`✗ ${result.error}`, false);
      }
    } catch (err: any) {
      flash(`✗ ${err?.message || 'unknown'}`, false);
    } finally {
      setBusy(b => ({ ...b, [d.draft_id]: false }));
    }
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('ar-EG', {
        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
      });
    } catch { return iso; }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-zinc-950 text-zinc-100 px-4 sm:px-6 py-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-lg ${
          toast.ok ? 'bg-emerald-600' : 'bg-red-600'
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-emerald-400">
              مراجعة ردود الواتس اب
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              ردود AI لـ supplier leads بتقعد هنا قبل ما تتبعت — راجعهم وابعتهم أو عدّلهم.
            </p>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-bold disabled:opacity-50"
          >
            {loading ? '⟳' : '↻'} تحديث
          </button>
        </div>

        {/* Stats */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-5">
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-black text-amber-400">{totalPending}</span>
            <span className="text-zinc-300">درافت في انتظار المراجعة</span>
          </div>
        </div>

        {/* Drafts */}
        {loading && drafts.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">جاري التحميل...</div>
        ) : drafts.length === 0 ? (
          <div className="text-center py-12 bg-zinc-900/50 rounded-xl border border-zinc-800">
            <div className="text-5xl mb-3">✓</div>
            <p className="text-zinc-400">مفيش درافت في الانتظار حاليًا.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {drafts.map(d => {
              const editedBody = editing[d.draft_id] ?? d.draft_body;
              const isEdited = editedBody !== d.draft_body;
              const isBusy = busy[d.draft_id];
              return (
                <div key={d.draft_id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                  {/* Contact header */}
                  <div className="bg-zinc-800/60 px-4 py-3 border-b border-zinc-800">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <span className="font-black text-emerald-300">
                        {d.conversation.name || '—'}
                      </span>
                      <span className="text-zinc-400 text-sm font-mono ltr" style={{ direction: 'ltr' }}>
                        {d.conversation.phone}
                      </span>
                      {d.conversation.category && (
                        <span className="text-xs bg-emerald-900/40 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded">
                          {d.conversation.category}
                        </span>
                      )}
                      {d.conversation.ad_headline && (
                        <span className="text-xs bg-amber-900/40 text-amber-300 border border-amber-800 px-2 py-0.5 rounded">
                          من إعلان: {d.conversation.ad_headline}
                        </span>
                      )}
                      <span className="text-xs text-zinc-500 ms-auto">
                        {formatTime(d.drafted_at)} · {d.drafted_by}
                      </span>
                    </div>
                  </div>

                  {/* Inbound */}
                  {d.last_inbound_text && (
                    <div className="px-4 py-3 border-b border-zinc-800">
                      <div className="text-xs text-zinc-500 mb-1">آخر رسالة من العميل:</div>
                      <div className="text-sm text-zinc-200 bg-zinc-800/40 rounded-md p-2.5 whitespace-pre-wrap">
                        {d.last_inbound_text}
                      </div>
                    </div>
                  )}

                  {/* History (collapsible) */}
                  {d.history.length > 0 && (
                    <details className="px-4 py-2 border-b border-zinc-800">
                      <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-300">
                        تاريخ آخر {d.history.length} رسائل
                      </summary>
                      <div className="mt-2 space-y-1.5">
                        {d.history.map((h, i) => (
                          <div key={i} className={`text-xs p-2 rounded ${
                            h.direction === 'inbound' ? 'bg-blue-950/40 border border-blue-900/40' :
                            'bg-zinc-800/40 border border-zinc-700/40'
                          }`}>
                            <span className="text-zinc-500 me-2">
                              {h.direction === 'inbound' ? '👤' : (h.ai_generated ? '🤖' : '✍️')} {formatTime(h.created_at)}
                            </span>
                            <span className="text-zinc-300 whitespace-pre-wrap">
                              {h.body.length > 200 ? h.body.slice(0, 200) + '…' : h.body}
                            </span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {/* Draft body (editable) */}
                  <div className="px-4 py-3 border-b border-zinc-800">
                    <div className="text-xs text-zinc-500 mb-1.5">
                      الرد المقترح {isEdited && <span className="text-amber-400 font-bold">(معدّل)</span>}:
                    </div>
                    <textarea
                      value={editedBody}
                      onChange={(e) => setEditing(s => ({ ...s, [d.draft_id]: e.target.value }))}
                      className="w-full min-h-[140px] bg-zinc-950 border border-zinc-700 rounded-md p-3 text-sm text-zinc-100 font-mono focus:outline-none focus:border-emerald-600 whitespace-pre-wrap"
                      style={{ direction: 'rtl' }}
                    />
                    <div className="text-xs text-zinc-500 mt-1.5">
                      {editedBody.length} حرف
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-4 py-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => approveAndSend(d)}
                      disabled={isBusy}
                      className="flex-1 min-w-[120px] px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm"
                    >
                      {isBusy ? '⟳ جاري...' : (isEdited ? '✓ ابعت بالتعديل' : '✓ ابعت زي ما هو')}
                    </button>
                    {isEdited && (
                      <button
                        onClick={() => setEditing(s => { const c = {...s}; delete c[d.draft_id]; return c; })}
                        disabled={isBusy}
                        className="px-3 py-2.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-sm"
                      >
                        تراجع
                      </button>
                    )}
                    <button
                      onClick={() => skipDraft(d)}
                      disabled={isBusy}
                      className="px-3 py-2.5 rounded-lg bg-red-900/60 hover:bg-red-900 border border-red-800/60 text-red-200 text-sm disabled:opacity-50"
                    >
                      تجاهل
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
