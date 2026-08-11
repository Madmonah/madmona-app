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
            ضيف مشروعك في <span className="text-[#2B4521]">بورصة مضمونة</span>
          </h1>
          <p className="text-sm text-gray-600 max-w-xl mx-auto leading-relaxed">
            ببلاش تماماً. املأ البيانات وارفع البروشور والفيديو — والمشروع هيظهر قدام آلاف
            الباحثين عن عقار يومياً. <strong>أي منطقة في مصر</strong>، مش لازم تكون منطقة معروفة عندنا.
          </p>
        </header>

        {/* اللي هتاخده — واضح قبل ما يبدأ يملا */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {[
            { t: '🗺️ أي منطقة في مصر', d: 'مستقبل سيتي، العبور، السخنة، هليوبوليس، رأس الحكمة — مش لازم تكون منطقة معروفة عندنا. اكتبها وهتظهر.' },
            { t: '📄 بروشور وفيديو', d: 'ارفع البروشور PDF وفيديو المشروع. بنضغطهم أوتوماتيك عشان صفحتك تفتح بسرعة على الموبايل.' },
            { t: '🧞 المارد بيرد بدالك', d: 'أي حد يسأل عن مشروعك، المارد بيعرف هو أنهي مشروع بالظبط ويرد عليه ٢٤/٧ ويوصّلهولك.' },
          ].map((c) => (
            <div key={c.t} className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="font-bold text-gray-900 text-sm mb-1">{c.t}</p>
              <p className="text-xs text-gray-600 leading-relaxed">{c.d}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-6 mb-6">
          <ProjectForm mode="public" />
        </div>

        <div className="bg-[#2B4521]/5 border border-[#2B4521]/15 rounded-2xl p-5 text-center">
          <p className="text-sm text-gray-700 leading-relaxed">
            🧞 <strong>المارد</strong> — مساعد مضمونة الذكي — بيرد على كل استفسار عن مشروعك ٢٤/٧
            ويوصّلك بالعملاء الجادين.
            <br />
            كلّمه على واتساب{' '}
            <a
              href="https://wa.me/201002229982"
              target="_blank"
              rel="noopener"
              className="text-[#2B4521] font-bold hover:underline"
            >
              01002229982
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}
