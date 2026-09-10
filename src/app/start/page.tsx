// 🔗 (١٠/٩/٢٠٢٦) محمد: «عايز أبعت اللينك ده لشركة وتضيف هي نفسها» — اللينك القصير اللي يتبعت لصاحب البيزنس:
//    madmonacairo.com/start → صفحة التسجيل الذاتي (/supplier/register): يدخل بجوجل أو الواتساب ويكتب اسم شركته
//    ويتحوّل على ويزارد «كمّل شركتك». (لوحة /admin/business-partners/new للأدمن بس — ولو فتحها زائر بيتحوّل هنا.)
import { redirect } from 'next/navigation'
export const dynamic = 'force-dynamic'
export default function StartPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(searchParams || {})) if (typeof v === 'string' && k.startsWith('utm_')) q.set(k, v)
  redirect('/supplier/register' + (q.toString() ? `?${q}` : ''))
}
