import { redirect } from 'next/navigation'

// ── تحويلة: /team → /chat/team مع الحفاظ على الـquery (31 يوليو 2026) ──
// النسخة الأولى كانت redirect('/chat/team') على طول — وكانت بتضيّع
// ?room= و ?new= فأي محادثة فردية بتتفتح من /chat كانت بتوديك على
// شاشة الجروبات بدل المحادثة نفسها.
//
// ⚠️ الملف ده لازم يفضل موجود: فيه إشعارات اتبعتت بالفعل فيها لينكات
// /team?room=<id> (شوف api/listings/inquiry) ومحدش يقدر يعدّلها.
export default function TeamRedirect({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(searchParams || {})) {
    if (typeof v === 'string') qs.set(k, v)
    else if (Array.isArray(v) && typeof v[0] === 'string') qs.set(k, v[0])
  }
  const s = qs.toString()
  redirect(s ? `/chat/team?${s}` : '/chat/team')
}
