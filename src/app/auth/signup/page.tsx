// ============================================================================
// /auth/signup — تحويل لـ /login (١٨ سبتمبر ٢٠٢٦)
//
// محمد: «بيقول هنبعتلك OTP لما يجي يسجل حساب من الموبايل».
// الصفحة القديمة كانت بتنادي `phone-auth` عشان **تبعت** كود ٦ أرقام على واتساب —
// وده إرسال بارد (ممنوع من ٢٠ يوليو، والبريدج اللي كان بيبعته ميّت أصلًا) فالكود
// عمره ما كان بيوصل والمستخدم بيفضل مستني.
//
// المسار الصحيح الوحيد لإنشاء حساب: /login — جوجل، أو كود واتساب **وارد**
// (المستخدم هو اللي بيبعت الكود لـ1551). وصاحب البيزنس: /start.
// الكود القديم محفوظ جنبه في LegacySignup.tsx — مش مربوط بأي مسار.
// ============================================================================
import { redirect } from 'next/navigation'

export default async function SignupRedirect({ searchParams }: { searchParams: Promise<{ redirect?: string; next?: string }> }) {
  const sp = await searchParams
  const next = sp?.redirect || sp?.next
  redirect(next ? `/login?next=${encodeURIComponent(next)}` : '/login')
}
