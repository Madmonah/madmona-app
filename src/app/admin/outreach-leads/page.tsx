// app/admin/outreach-leads/page.tsx
// =====================================================================
// Madmona Admin — Outreach Leads Funnel
// Unified table view of all leads we're reaching out to.
// Shows: who's interested, who's not, who's spam, who replied, who registered.
// =====================================================================

'use client';

import { useEffect, useState, useMemo } from 'react';

type Lead = {
  phone: string;
  name: string | null;
  expected_type: 'business' | 'individual' | null;
  sources: string | null;
  origin: string | null;
  category: string | null;
  area: string | null;
  created_at: string | null;
  last_contacted: string | null;
  contact_count: number | null;
  conversation_id: string | null;
  first_intent: string | null;
  outbound_count: number | null;
  inbound_count: number | null;
  conv_message_count: number | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  last_message_at: string | null;
  conv_status: string | null;
  conv_contact_type: string | null;
  supplier_id: string | null;
  supplier_business_name: string | null;
  supplier_registered_at: string | null;
  supplier_has_erp_crm: boolean | null;
  supplier_commission_rate: number | null;
  funnel_stage: string;
  priority_score: number;
};

type Summary = {
  funnel_stage: string;
  count: number;
  business_count: number;
  individual_count: number;
};

const STAGE_COLORS: Record<string, string> = {
  '🎯 سجل وأصبح supplier': 'bg-green-100 text-green-800 border-green-300',
  '✅ مهتم': 'bg-emerald-50 text-emerald-700 border-emerald-300',
  '💬 رد': 'bg-blue-50 text-blue-700 border-blue-300',
  '💬 رد بدون تصنيف': 'bg-blue-50 text-blue-700 border-blue-200',
  '⏳ اتبعت ومستني': 'bg-yellow-50 text-yellow-800 border-yellow-300',
  '📤 اتبعت من زمان (>٣ أيام)': 'bg-gray-50 text-gray-600 border-gray-300',
  '📭 لسه ما اتبعتش': 'bg-purple-50 text-purple-700 border-purple-300',
  '❌ مش مهتم': 'bg-orange-50 text-orange-700 border-orange-300',
  '🚫 spam/مرفوض': 'bg-red-50 text-red-700 border-red-300',
};

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'دلوقتي';
  if (diffMin < 60) return `${diffMin} دقيقة`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs} ساعة`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 30) return `${diffDays} يوم`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths} شهر`;
}

export default function OutreachLeadsPage() {
  const [summary, setSummary] = useState<Summary[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [expandedPhone, setExpandedPhone] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<Record<string, boolean>>({});

  const refresh = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (stageFilter) params.set('stage', stageFilter);
      if (typeFilter) params.set('type', typeFilter);
      if (search) params.set('q', search);
      const r = await fetch(`/api/admin/outreach-leads?${params}`, { cache: 'no-store' });
      const d = await r.json();
      setSummary(d.summary || []);
      setLeads(d.leads || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [stageFilter, typeFilter]);

  const totalLeads = useMemo(() => summary.reduce((s, x) => s + x.count, 0), [summary]);
  const totalBusinesses = useMemo(() => summary.reduce((s, x) => s + x.business_count, 0), [summary]);
  const totalIndividuals = useMemo(() => summary.reduce((s, x) => s + x.individual_count, 0), [summary]);

  const handleAction = async (phone: string, action: string) => {
    if (actionBusy[phone]) return;
    setActionBusy(b => ({ ...b, [phone]: true }));
    try {
      await fetch('/api/admin/outreach-leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, action }),
      });
      refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setActionBusy(b => ({ ...b, [phone]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7] p-4 md:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#0A0A0A]" style={{ fontFamily: 'Cairo, sans-serif' }}>
            📊 تحليل الـ Leads — Outreach Funnel
          </h1>
          <p className="text-gray-600 mt-1">كل الناس اللي بنكلمهم في مكان واحد</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="text-3xl font-bold text-[#059669]">{totalLeads}</div>
            <div className="text-sm text-gray-600 mt-1">إجمالي</div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="text-3xl font-bold text-[#2FA084]">{totalBusinesses}</div>
            <div className="text-sm text-gray-600 mt-1">شركات</div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="text-3xl font-bold text-[#d4a017]">{totalIndividuals}</div>
            <div className="text-sm text-gray-600 mt-1">أفراد</div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="text-3xl font-bold text-green-600">
              {summary.find(s => s.funnel_stage.includes('سجل'))?.count || 0}
            </div>
            <div className="text-sm text-gray-600 mt-1">سجلوا (Conversions)</div>
          </div>
        </div>

        {/* Funnel breakdown */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
          <h2 className="font-bold mb-3 text-[#0A0A0A]">الـ Funnel</h2>
          <div className="space-y-2">
            {summary.map(s => {
              const pct = totalLeads > 0 ? (s.count / totalLeads) * 100 : 0;
              const active = stageFilter === s.funnel_stage;
              return (
                <button
                  key={s.funnel_stage}
                  onClick={() => setStageFilter(active ? '' : s.funnel_stage)}
                  className={`w-full text-right flex items-center gap-3 p-2 rounded-lg transition ${
                    active ? 'bg-emerald-50 ring-2 ring-emerald-300' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className={`px-3 py-1 rounded-full text-sm border ${STAGE_COLORS[s.funnel_stage] || 'bg-gray-50 text-gray-700 border-gray-300'} min-w-[180px]`}>
                    {s.funnel_stage}
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 relative overflow-hidden">
                    <div
                      className="absolute right-0 top-0 h-full bg-gradient-to-l from-[#2FA084] to-[#34D399]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-sm font-mono w-20 text-left">
                    <span className="font-bold">{s.count}</span>
                    <span className="text-gray-400 text-xs"> ({pct.toFixed(0)}%)</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4 flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="بحث بالاسم أو رقم الموبايل..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && refresh()}
            className="flex-1 min-w-[200px] px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg"
          >
            <option value="">كل الأنواع</option>
            <option value="business">شركات</option>
            <option value="individual">أفراد</option>
          </select>
          {stageFilter && (
            <button
              onClick={() => setStageFilter('')}
              className="px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm"
            >
              مسح فلتر: {stageFilter}
            </button>
          )}
          <button
            onClick={refresh}
            className="px-4 py-2 bg-[#34D399] text-[#04352A] rounded-lg hover:bg-[#34D399]"
          >
            تحديث
          </button>
        </div>

        {/* Leads table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">جاري التحميل...</div>
          ) : leads.length === 0 ? (
            <div className="p-8 text-center text-gray-500">مفيش leads بالفلاتر دي</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-3 text-right font-semibold text-gray-700">الاسم</th>
                    <th className="px-3 py-3 text-right font-semibold text-gray-700">موبايل</th>
                    <th className="px-3 py-3 text-right font-semibold text-gray-700">نوع</th>
                    <th className="px-3 py-3 text-right font-semibold text-gray-700">مصدر</th>
                    <th className="px-3 py-3 text-right font-semibold text-gray-700">المرحلة</th>
                    <th className="px-3 py-3 text-right font-semibold text-gray-700">آخر تواصل</th>
                    <th className="px-3 py-3 text-right font-semibold text-gray-700">رسائل</th>
                    <th className="px-3 py-3 text-right font-semibold text-gray-700">تصنيف AI</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map(lead => (
                    <tr
                      key={lead.phone}
                      className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                        expandedPhone === lead.phone ? 'bg-emerald-50' : ''
                      }`}
                      onClick={() => setExpandedPhone(expandedPhone === lead.phone ? null : lead.phone)}
                    >
                      <td className="px-3 py-3 font-medium">{lead.name || '—'}</td>
                      <td className="px-3 py-3 font-mono text-xs" dir="ltr">{lead.phone}</td>
                      <td className="px-3 py-3">
                        {lead.expected_type === 'business' ? '🏢 شركة' : '👤 فرد'}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600">
                        {lead.origin || lead.sources?.split(',')[0] || '—'}
                        {lead.category && <div className="text-gray-400">{lead.category}</div>}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs border ${STAGE_COLORS[lead.funnel_stage] || 'bg-gray-50'}`}>
                          {lead.funnel_stage}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600">
                        {timeAgo(lead.last_message_at || lead.last_outbound_at || lead.last_contacted)}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        <div className="flex gap-2">
                          {lead.outbound_count ? <span className="text-blue-600">📤{lead.outbound_count}</span> : null}
                          {lead.inbound_count ? <span className="text-green-600">📥{lead.inbound_count}</span> : null}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {lead.first_intent ? (
                          <span className="text-gray-700 font-medium">{lead.first_intent}</span>
                        ) : (
                          <span className="text-gray-400 italic">الـ AI بيحلل...</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-4 text-xs text-gray-500 text-center">
          عرض {leads.length} lead • أعلى priority الأول • التصنيف تلقائي عبر AI على كل رد جديد
        </div>
      </div>
    </div>
  );
}
