// app/admin/careers/page.tsx
// Madmona Admin — Job Applications (Careers)

'use client';

import { useEffect, useState, useMemo } from 'react';

type Application = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  position: string | null;
  cv_url: string | null;
  message: string | null;
  education: string | null;
  expected_salary: string | null;
  source: string | null;
  status: string | null;
  created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-50 text-blue-700 border-blue-300',
  reviewing: 'bg-yellow-50 text-yellow-800 border-yellow-300',
  shortlisted: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  interviewed: 'bg-purple-50 text-purple-700 border-purple-300',
  hired: 'bg-green-100 text-green-800 border-green-300',
  rejected: 'bg-red-50 text-red-700 border-red-300',
};

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('ar-EG', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function CareersAdminPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/careers');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setApps(data.applications || []);
    } catch (e: any) {
      setError(e.message || 'فشل التحميل');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(id: string, status: string) {
    try {
      const res = await fetch('/api/admin/careers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error('Update failed');
      await load();
    } catch (e: any) {
      alert('فشل التحديث: ' + (e.message || 'unknown'));
    }
  }

  const filtered = useMemo(() => {
    let list = apps;
    if (filterStatus !== 'all') {
      list = list.filter((a) => (a.status || 'new') === filterStatus);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((a) =>
        (a.full_name || '').toLowerCase().includes(q) ||
        (a.phone || '').includes(q) ||
        (a.email || '').toLowerCase().includes(q) ||
        (a.position || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [apps, filterStatus, search]);

  const summary = useMemo(() => {
    const s: Record<string, number> = { all: apps.length };
    for (const a of apps) {
      const key = a.status || 'new';
      s[key] = (s[key] || 0) + 1;
    }
    return s;
  }, [apps]);

  return (
    <div className="min-h-screen bg-[#FAFAF7] p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-[#0A0A0A]">💼 طلبات التوظيف (Careers)</h1>
          <p className="text-sm text-gray-600 mt-1">
            كل الـ applications اللي وصلت من <a href="/careers" target="_blank" className="text-[#FA8125] underline">madmonacairo.com/careers</a>
          </p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          {[
            { key: 'all', label: 'الكل', color: 'bg-white' },
            { key: 'new', label: '🆕 جديد', color: 'bg-blue-50' },
            { key: 'reviewing', label: '👀 قيد المراجعة', color: 'bg-yellow-50' },
            { key: 'shortlisted', label: '⭐ shortlist', color: 'bg-emerald-50' },
            { key: 'interviewed', label: '🎤 interview', color: 'bg-purple-50' },
            { key: 'hired', label: '✅ اتعين', color: 'bg-green-100' },
            { key: 'rejected', label: '❌ مرفوض', color: 'bg-red-50' },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => setFilterStatus(s.key)}
              className={`${s.color} rounded-xl p-3 border-2 text-right hover:shadow-md transition ${
                filterStatus === s.key ? 'border-[#FA8125]' : 'border-transparent'
              }`}
            >
              <div className="text-xs text-gray-600">{s.label}</div>
              <div className="text-2xl font-bold text-[#0A0A0A] mt-1">{summary[s.key] || 0}</div>
            </button>
          ))}
        </div>

        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم، التليفون، الإيميل، الوظيفة…"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-[#FA8125]"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">⏳ بتحمل…</div>
          ) : error ? (
            <div className="p-12 text-center text-red-600">⚠️ {error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              {apps.length === 0
                ? '📭 لسه مفيش طلبات توظيف'
                : '🔍 مفيش طلبات بتطابق الفلتر'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-right">الاسم</th>
                    <th className="px-4 py-3 text-right">الوظيفة</th>
                    <th className="px-4 py-3 text-right">التليفون</th>
                    <th className="px-4 py-3 text-right">الإيميل</th>
                    <th className="px-4 py-3 text-right">المؤهل</th>
                    <th className="px-4 py-3 text-right">المرتب</th>
                    <th className="px-4 py-3 text-right">CV</th>
                    <th className="px-4 py-3 text-right">التاريخ</th>
                    <th className="px-4 py-3 text-right">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => {
                    const status = a.status || 'new';
                    const stColor = STATUS_COLORS[status] || 'bg-gray-50 text-gray-700 border-gray-300';
                    return (
                      <tr key={a.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{a.full_name}</td>
                        <td className="px-4 py-3">{a.position || '—'}</td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {a.phone ? (
                            <a href={`https://wa.me/${a.phone.replace(/\D/g, '')}`} target="_blank" className="text-[#FA8125] hover:underline">
                              {a.phone}
                            </a>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs">{a.email || '—'}</td>
                        <td className="px-4 py-3 text-xs">{a.education || '—'}</td>
                        <td className="px-4 py-3 text-xs">{a.expected_salary || '—'}</td>
                        <td className="px-4 py-3">
                          {a.cv_url ? (
                            <a href={a.cv_url} target="_blank" className="text-[#FA8125] underline text-xs">
                              📄 CV
                            </a>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">{fmtDate(a.created_at)}</td>
                        <td className="px-4 py-3">
                          <select
                            value={status}
                            onChange={(e) => updateStatus(a.id, e.target.value)}
                            className={`text-xs px-2 py-1 rounded border ${stColor} cursor-pointer`}
                          >
                            <option value="new">🆕 جديد</option>
                            <option value="reviewing">👀 مراجعة</option>
                            <option value="shortlisted">⭐ shortlist</option>
                            <option value="interviewed">🎤 interview</option>
                            <option value="hired">✅ اتعين</option>
                            <option value="rejected">❌ مرفوض</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-500 mt-4">
          عدد: {filtered.length} من إجمالي {apps.length}
        </p>
      </div>
    </div>
  );
}
