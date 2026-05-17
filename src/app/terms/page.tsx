import Link from 'next/link'
import { Metadata } from 'next'
import { ArrowRight, ScrollText, MessageCircle } from 'lucide-react'
import TopNav from '@/components/TopNav'

export const metadata: Metadata = {
  title: 'الشروط والأحكام | مضمونة',
  description: 'الشروط والأحكام لاستخدام منصة Madmona Marketplace.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen gradient-mesh text-right" dir="rtl">
      <TopNav />

      <main className="max-w-3xl mx-auto px-4 pb-16 pt-8">
        <div className="mb-8 animate-slide-up">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-[#1F6F5F] font-bold hover:gap-2 transition-all no-underline mb-4"
          >
            <ArrowRight className="w-4 h-4" />
            الرئيسية
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-[#2FA084]/10 flex items-center justify-center">
              <ScrollText className="w-6 h-6 text-[#2FA084]" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#2FA084] uppercase tracking-widest">شروط الاستخدام</p>
              <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight">الشروط والأحكام</h1>
            </div>
          </div>
          <p className="text-sm text-gray-500">آخر تحديث: مايو ٢٠٢٦</p>
        </div>

        <article className="bg-white rounded-3xl shadow-card p-7 md:p-10 space-y-7 animate-slide-up delay-100">
          <Section title="مقدمة">
            <p>
              مرحباً بيك في مضمونة (Madmona). باستخدامك الموقع أو التطبيق (madmonacairo.com)، أنت بتوافق على الشروط والأحكام الموضحة هنا. لو مش موافق على أي بند، يرجى عدم استخدام المنصة.
            </p>
          </Section>

          <Section title="١. تعريف الخدمة">
            <p>
              منصة مضمونة بتوفّر خدمتين:
            </p>
            <ul>
              <li><strong>مضمونة Spaces:</strong> حجز مساحات العمل المملوكة لمضمونة في مصر الجديدة</li>
              <li><strong>Madmona Marketplace:</strong> سوق رقمي يربط العملاء بموردين معتمدين لحجز عقارات، مركبات، معدات، ومساحات تنظيم فعاليات</li>
            </ul>
          </Section>

          <Section title="٢. التسجيل والحساب">
            <ul>
              <li>لازم يكون عمرك ١٨ سنة فأكثر للتسجيل</li>
              <li>المعلومات اللي بتقدمها لازم تكون صحيحة وحديثة</li>
              <li>إنت مسؤول عن حماية كلمة السر وعدم مشاركتها مع حد</li>
              <li>إنت مسؤول عن أي نشاط يحصل من حسابك</li>
              <li>منصة مضمونة تحتفظ بحق إيقاف أو حذف أي حساب يخالف الشروط</li>
            </ul>
          </Section>

          <Section title="٣. حجوزات العملاء">
            <ul>
              <li>الأسعار المعروضة هي الأسعار النهائية اللي يدفعها العميل (مفيش رسوم خفية)</li>
              <li>تأكيد الحجز يتم بعد موافقة المورد عبر الواتساب</li>
              <li>الحجز ملزم للطرفين بمجرد التأكيد</li>
              <li>الإلغاء مسموح حسب سياسة كل listing (موضحة على صفحة الـlisting)</li>
              <li>الدفع يتم كاش أو InstaPay مباشرة للمورد عند الوصول</li>
            </ul>
          </Section>

          <Section title="٤. الموردين والـlistings">
            <ul>
              <li>أي شخص أو شركة يقدر يتقدم ليبقى مورد، شرط الموافقة من إدارة المنصة</li>
              <li>المورد مسؤول عن دقة المعلومات والصور المعروضة</li>
              <li>المورد ملتزم بتقديم الخدمة كما هي موصوفة في الـlisting</li>
              <li>المورد ملتزم بالرد على العملاء خلال وقت معقول (٢٤ ساعة كحد أقصى)</li>
              <li>منصة مضمونة بتاخد عمولة شفافة من كل حجز (موضحة في عقد التسجيل)</li>
              <li>مضمونة تحتفظ بحق إخفاء أو إزالة أي listing يخالف الشروط أو يتلقى شكاوى متكررة</li>
            </ul>
          </Section>

          <Section title="٥. المحتوى المحظور">
            <p>ممنوع نشر أو مشاركة أي محتوى:</p>
            <ul>
              <li>مخالف للقوانين المصرية</li>
              <li>عنصري أو يحرّض على الكراهية</li>
              <li>إباحي أو مسيء</li>
              <li>مضلّل أو يحتوي على معلومات كاذبة</li>
              <li>ينتهك حقوق الملكية الفكرية</li>
              <li>يحتوي على روابط ضارة أو فيروسات</li>
            </ul>
          </Section>

          <Section title="٦. التقييمات والمراجعات">
            <ul>
              <li>التقييمات لازم تكون صادقة ومبنية على تجربة فعلية</li>
              <li>ممنوع التقييمات الوهمية أو المدفوعة</li>
              <li>المورد له الحق في الرد على التقييمات بشكل مهني</li>
              <li>منصة مضمونة تحتفظ بحق إزالة التقييمات المخالفة</li>
            </ul>
          </Section>

          <Section title="٧. حدود المسؤولية">
            <ul>
              <li>منصة مضمونة وسيط بين العملاء والموردين، ومش مسؤولة عن جودة الخدمة المقدمة من المورد</li>
              <li>مضمونة بتراجع مستندات الموردين قبل الموافقة، لكن مش بتضمن نتائج كل خدمة</li>
              <li>أي نزاع بين العميل والمورد يحاول يتحل ودياً، ومضمونة بتساعد في التوسط</li>
              <li>مضمونة مش مسؤولة عن أي خسائر غير مباشرة</li>
            </ul>
          </Section>

          <Section title="٨. الملكية الفكرية">
            <p>
              كل المحتوى على المنصة (الشعارات، التصميم، الكود، المقالات) ملك لمضمونة. ممنوع نسخه أو استخدامه بدون إذن مسبق.
            </p>
          </Section>

          <Section title="٩. تعديل الشروط">
            <p>
              مضمونة تحتفظ بحق تعديل الشروط في أي وقت. التعديلات الجوهرية هنخبرك بيها على الموقع وعلى الواتساب. الاستمرار في استخدام المنصة بعد التعديل يعتبر موافقة على الشروط الجديدة.
            </p>
          </Section>

          <Section title="١٠. القانون الحاكم">
            <p>
              هذه الشروط محكومة بالقانون المصري. أي نزاع يتم حلّه أمام محاكم القاهرة المختصة.
            </p>
          </Section>

          <Section title="١١. تواصل معنا">
            <p>
              لأي استفسار عن الشروط:
            </p>
          </Section>

          <a
            href="https://wa.me/201002229982"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-gradient-to-l from-[#25D366]/10 to-transparent rounded-2xl border border-[#25D366]/20 hover:shadow-soft hover:-translate-y-0.5 transition-all no-underline"
          >
            <div className="w-10 h-10 rounded-xl bg-[#25D366] flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">تواصل واتساب</p>
              <p className="text-xs text-gray-500" dir="ltr">+20 100 222 9982 · 24/7</p>
            </div>
          </a>
        </article>

        <p className="text-center text-xs text-gray-500 mt-8">
          © 2026 Madmona. جميع الحقوق محفوظة.
        </p>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg md:text-xl font-black text-gray-900 mb-3">{title}</h2>
      <div className="text-sm md:text-base text-gray-700 leading-relaxed space-y-2 [&_ul]:list-disc [&_ul]:pr-5 [&_ul]:space-y-1.5 [&_strong]:text-gray-900 [&_strong]:font-bold">
        {children}
      </div>
    </section>
  )
}
