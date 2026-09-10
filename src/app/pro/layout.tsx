// 🔎 (١٠/٩/٢٠٢٦) /pro كانت client component من غير أي metadata — يعني جوجل بيشوفها من غير عنوان ولا وصف.
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'برنامج إدارة البيزنس بـ١٠٠٠ ج بدل كتير — حسابات · CRM · موظفين · بوت واتساب | مضمونة',
  description: 'بيزنسك كله على سيستم واحد من موبايلك: الحسابات والمصاريف، متابعة العملاء، الموظفين والحضور والمرتبات، المنتجات والمخزون، بوت واتساب بيرد لوحده، وصفحتك وحجوزاتك. ١٠٠٠ ج بدل كتير لعدد محدود من الحسابات.',
  alternates: { canonical: 'https://www.madmonacairo.com/pro' },
  openGraph: { title: 'برنامج إدارة البيزنس بـ١٠٠٠ ج بدل كتير | مضمونة', description: 'حسابات · CRM · موظفين وحضور · مخزون · بوت واتساب · صفحتك — من موبايلك.', url: 'https://www.madmonacairo.com/pro', siteName: 'مضمونة', locale: 'ar_EG', type: 'website' },
}

export default function ProLayout({ children }: { children: React.ReactNode }) { return children }
