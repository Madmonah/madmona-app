import { redirect } from 'next/navigation'

// ── تحويلة: /i/<token> → /chat/i/<token> (٣٠ يوليو ٢٠٢٦) ────────
// لينكات الدعوة اتنقلت جوّه سكوب شات مضمونة ("/chat") عشان تفتح التطبيق
// المثبّت بدل ما ترمي الناس على الموقع العام.
// ⚠️ الملف ده لازم يفضل موجود للأبد — فيه لينكات دعوة اتبعتت بالفعل
// بالصيغة القديمة، ولو اتشال هتبوظ عند الناس اللي معاهم.
export default function LegacyInviteRedirect({
  params,
}: {
  params: { token: string }
}) {
  redirect(`/chat/i/${params.token}`)
}
