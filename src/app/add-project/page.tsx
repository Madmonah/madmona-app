// src/app/add-project/page.tsx
// =====================================================================
// 🏗️ فورم self-serve للمطورين والمسوّقين — يضيفوا مشروعهم بنفسهم
// بأي منطقة في مصر + بروشور PDF + فيديو (بيتضغطوا في المتصفح).
// بيتحفظ status='draft' → تراجعه من /admin/projects وتنشره.
// =====================================================================
import { Metadata } from 'next'
import TopNav from '@/components/TopNav'
import ProjectForm from '@/components/projects/ProjectForm'

export const metadata: Metadata = {
  title: 'ضيف مشروعك في بورصة عقارات مضمونة — مجاناً',
  description:
    'مطور أو مسوق عقاري؟ ضيف مشروعك في بورصة مضمونة ببلاش — بالأسعار ونظام السداد والبروشور والفيديو، قدام آلاف الباحثين يومياً. أي منطقة في مصر.',
  alternates: { canonical: 'https://madmonacairo.com/add-project' },
  openGraph: {
    title: 'ضيف مشروعك في بورصة عقارات مضمونة',
    description: 'أسعار + بروشور + فيديو — قدام آلاف الباحثين يومياً. أي منطقة في مصر.',
    url: 'https://madmonacairo.com/add-project',
    locale: 'ar_EG',
    type: 'website',
  },
}

export default function AddProjectPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <TopNav />
      <main className="max-w-3xl mx-auto px-4 py-8 pb-16">
        <header className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            ضيف مشروعك في <span className="text-[#1F6F5F]">بورصة مضمونة</span>
          </h1>
          <p className="text-sm text-gray-600 max-w-xl mx-auto leading-relaxed">
            ببلاش تماماً. املأ البيانات وارفع البروشور والفيديو — والمشروع هيظهر قدام آلاف
            الباحثين عن عقار يومياً. <strong>أي منطقة في مصر</strong>، مش لازم تكون منطقة معروفة عندنا.
          </p>
        </header>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-6 mb-6">
          <ProjectForm mode="public" />
        </div>

        <div className="bg-[#1F6F5F]/5 border border-[#1F6F5F]/15 rounded-2xl p-5 text-center">
          <p className="text-sm text-gray-700 leading-relaxed">
            🧞 <strong>المارد</strong> — مساعد مضمونة الذكي — بيرد على كل استفسار عن مشروعك ٢٤/٧
            ويوصّلك بالعملاء الجادين.
            <br />
            كلّمه على واتساب{' '}
            <a
              href="https://wa.me/201002229982"
              target="_blank"
              rel="noopener"
              className="text-[#1F6F5F] font-bold hover:underline"
            >
              01002229982
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}
