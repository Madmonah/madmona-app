import { redirect } from 'next/navigation'

// ── تحويلة: /team → /chat/team (٣٠ يوليو ٢٠٢٦) ─────────────────
// الصفحة اتنقلت جوّه سكوب الـPWA بتاع شات مضمونة ("/chat") عشان اللينكات
// تفتح التطبيق المثبّت مش المتصفح. التحويلة دي بتخلي أي لينك قديم،
// بوكمارك، أو اختصار على شاشة حد لسه شغال.
export default function TeamRedirect() {
  redirect('/chat/team')
}
