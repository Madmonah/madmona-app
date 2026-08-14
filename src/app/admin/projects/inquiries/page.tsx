// src/app/admin/projects/inquiries/page.tsx
// =====================================================================
// 📩 كل استفسار عن مشروع — مين، أنهي مشروع، إمتى، ورد عليه ولا لأ.
// مصدرين: (1) ضغطة «اسأل عن المشروع ده» على الكارت في البورصة
//          (2) رسالة واتساب فيها كود المشروع → تريجر match_project_inquiry
// =====================================================================
import Link from 'next/link'
import { sbProjects as supabaseAdmin } from '@/lib/supabaseProjects'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Inquiry = {
  id: string
  project_title: string | null
  developer: string | null
  source: string
  contact_phone: string | null
  message: string | null
  status: string
  conversation_id: string | null
  created_at: string
}

function fmt(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ar-EG', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    })
  } catch { return '' }
}

const SOURCE_LABEL: Record<string, string> = {
  bourse_card: 'ضغط على الكارت',
  whatsapp_code: 'رسالة واتساب',
}

export default async function InquiriesPage() {
  const { data } = await supabaseAdmin
    .from('project_inquiries')
    .select('id, project_title, developer, source, contact_phone, message, status, conversation_id, created_at')
    .order('created_at', { ascending: false })
    .limit(300)

  const rows = (data ?? []) as Inquiry[]

  // أنهي مشروع بيجيب استفسارات أكتر
  const byProject = new Map<string, number>()
  for (const r of rows) {
    const k = r.project_title || '—'
    byProject.set(k, (byProject.get(k) || 0) + 1)
  }
  const top = Array.from(byProject.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6)

  return (
    <div dir="rtl" className="min-h-screen bg-[#FAFAF7] p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#059669]">📩 استفسارات المشاريع</h1>
            <p className="text-xs text-gray-500 mt-1">{rows.length} استفسار</p>
          </div>
          <Link
            href="/admin/projects"
            className="px-4 py-2 rounded-full border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-[#059669]/40"
          >
            ← المشاريع
          </Link>
        </header>

        {top.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
            <h2 className="font-bold text-gray-900 text-sm mb-3">🔥 أكتر المشاريع طلباً</h2>
            <div className="flex flex-wrap gap-2">
              {top.map(([title, count]) => (
                <span
                  key={title}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#34D399]/8 text-[#059669] text-xs font-semibold"
                >
                  {title}
                  <span className="bg-[#34D399] text-[#04352A] rounded-full px-1.5 text-[10px]">{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-500 text-sm">
            لسه مفيش استفسارات — أول ما حد يدوس «اسأل عن المشروع ده» في البورصة هيظهر هنا.
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-bold text-gray-900 text-sm">{r.project_title || '—'}</span>
                  {r.developer && <span className="text-xs text-gray-500">· {r.developer}</span>}
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold">
                    {SOURCE_LABEL[r.source] || r.source}
                  </span>
                  {r.conversation_id && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-semibold">
                      ✅ اتربط بالمحادثة
                    </span>
                  )}
                  <span className="text-[11px] text-gray-400 mr-auto">{fmt(r.created_at)}</span>
                </div>

                {r.contact_phone && (
                  <a
                    href={`https://wa.me/${r.contact_phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener"
                    className="text-xs text-[#059669] font-semibold hover:underline"
                    dir="ltr"
                  >
                    {r.contact_phone}
                  </a>
                )}

                {r.message && (
                  <p className="text-xs text-gray-600 mt-1.5 leading-relaxed line-clamp-2">{r.message}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
