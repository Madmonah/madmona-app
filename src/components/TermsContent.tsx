'use client'

import Link from 'next/link'
import { ArrowRight, ScrollText, MessageCircle } from 'lucide-react'
import TopNav from '@/components/TopNav'
import { useT } from '@/lib/i18n/LanguageProvider'

export default function TermsContent() {
  const { lang, dir } = useT()
  const en = lang === 'en'

  return (
    <div className="min-h-screen gradient-mesh" dir={dir}>
      <TopNav />

      <main className="max-w-3xl mx-auto px-4 pb-16 pt-8">
        <div className="mb-8 animate-slide-up">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-[#1F6F5F] font-bold hover:gap-2 transition-all no-underline mb-4"
          >
            <ArrowRight className="w-4 h-4 ltr:rotate-180" />
            {en ? 'Home' : 'الرئيسية'}
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-[#2FA084]/10 flex items-center justify-center">
              <ScrollText className="w-6 h-6 text-[#2FA084]" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#2FA084] uppercase tracking-widest">
                {en ? 'Terms of use' : 'شروط الاستخدام'}
              </p>
              <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight">
                {en ? 'Terms & Conditions' : 'الشروط والأحكام'}
              </h1>
            </div>
          </div>
          <p className="text-sm text-gray-500">{en ? 'Last updated: May 2026' : 'آخر تحديث: مايو ٢٠٢٦'}</p>
        </div>

        <article className="bg-white rounded-3xl shadow-card p-7 md:p-10 space-y-7 animate-slide-up delay-100">
          {en ? (
            <>
              <Section title="Introduction">
                <p>
                  Welcome to Madmona. By using the website or app (madmonacairo.com), you agree to the terms and conditions set out here. If you do not agree with any clause, please do not use the platform.
                </p>
              </Section>

              <Section title="1. Definition of the service">
                <p>
                  Madmona is a guaranteed digital marketplace that connects customers with verified suppliers across Egypt. The platform covers rentals (properties, vehicles, equipment, halls, workspaces), buying and selling, services (beauty, professional, event organization), restaurants and cafes, and more — all with full protection on every transaction, fast payouts to suppliers, and 24/7 support.
                </p>
              </Section>

              <Section title="2. Registration and account">
                <ul>
                  <li>You must be 18 or older to register</li>
                  <li>The information you provide must be accurate and up to date</li>
                  <li>You are responsible for protecting your password and not sharing it with anyone</li>
                  <li>You are responsible for any activity that happens from your account</li>
                  <li>Madmona reserves the right to suspend or delete any account that violates the terms</li>
                </ul>
              </Section>

              <Section title="3. Customer bookings">
                <ul>
                  <li>The prices shown are the final prices the customer pays (no hidden fees)</li>
                  <li>A booking is confirmed after the supplier approves it via WhatsApp</li>
                  <li>The booking is binding on both parties once confirmed</li>
                  <li>Cancellation is allowed according to each product&apos;s policy (shown on the product page)</li>
                  <li>Payment is made by cash or InstaPay directly to the supplier on arrival</li>
                </ul>
              </Section>

              <Section title="4. Suppliers and products">
                <ul>
                  <li>Any individual or company can apply to become a supplier, subject to approval by the platform&apos;s management</li>
                  <li>The supplier is responsible for the accuracy of the information and photos shown</li>
                  <li>The supplier commits to providing the service as described in the product page</li>
                  <li>The supplier commits to responding to customers within a reasonable time (24 hours maximum)</li>
                  <li>Madmona takes a transparent commission on every booking (stated in the registration agreement)</li>
                  <li>Madmona reserves the right to hide or remove any product that violates the terms or receives repeated complaints</li>
                </ul>
              </Section>

              <Section title="5. Prohibited content">
                <p>It is forbidden to post or share any content that is:</p>
                <ul>
                  <li>Against Egyptian law</li>
                  <li>Racist or incites hatred</li>
                  <li>Pornographic or offensive</li>
                  <li>Misleading or contains false information</li>
                  <li>Infringing on intellectual property rights</li>
                  <li>Containing harmful links or viruses</li>
                </ul>
              </Section>

              <Section title="6. Reviews and ratings">
                <ul>
                  <li>Reviews must be honest and based on a real experience</li>
                  <li>Fake or paid reviews are forbidden</li>
                  <li>The supplier has the right to respond to reviews professionally</li>
                  <li>Madmona reserves the right to remove reviews that violate the terms</li>
                </ul>
              </Section>

              <Section title="7. Limits of liability">
                <ul>
                  <li>Madmona is an intermediary between customers and suppliers, and is not responsible for the quality of the service provided by the supplier</li>
                  <li>Madmona reviews suppliers&apos; documents before approval, but does not guarantee the outcome of every service</li>
                  <li>Any dispute between a customer and a supplier should be resolved amicably, and Madmona helps mediate</li>
                  <li>Madmona is not responsible for any indirect losses</li>
                </ul>
              </Section>

              <Section title="8. Intellectual property">
                <p>
                  All content on the platform (logos, design, code, articles) belongs to Madmona. Copying or using it without prior permission is forbidden.
                </p>
              </Section>

              <Section title="9. Changes to the terms">
                <p>
                  Madmona reserves the right to amend the terms at any time. We will notify you of material changes on the website and via WhatsApp. Continuing to use the platform after the change is considered acceptance of the new terms.
                </p>
              </Section>

              <Section title="10. Governing law">
                <p>
                  These terms are governed by Egyptian law. Any dispute is resolved before the competent courts of Cairo.
                </p>
              </Section>

              <Section title="11. Contact us">
                <p>For any question about the terms:</p>
              </Section>
            </>
          ) : (
            <>
              <Section title="مقدمة">
                <p>
                  مرحباً بيك في مضمونة (Madmona). باستخدامك الموقع أو التطبيق (madmonacairo.com)، أنت بتوافق على الشروط والأحكام الموضحة هنا. لو مش موافق على أي بند، يرجى عدم استخدام المنصة.
                </p>
              </Section>

              <Section title="١. تعريف الخدمة">
                <p>
                  مضمونة هي سوق رقمي مضمون بيربط العملاء بموردين معتمدين في مصر. المنصة بتغطي إيجار (عقارات، مركبات، معدات، قاعات، مساحات شغل)، بيع وشراء، خدمات (بيوتي، مهنية، تنظيم فعاليات)، مطاعم وكافيهات وأكتر — كله بحماية كاملة على كل صفقة، دفع مستحقات سريع للموردين، ودعم على مدار الساعة.
                </p>
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
                  <li>الإلغاء مسموح حسب سياسة كل منتج (موضحة على صفحة المنتج)</li>
                  <li>الدفع يتم كاش أو InstaPay مباشرة للمورد عند الوصول</li>
                </ul>
              </Section>

              <Section title="٤. الموردين والمنتجات">
                <ul>
                  <li>أي شخص أو شركة يقدر يتقدم ليبقى مورد، شرط الموافقة من إدارة المنصة</li>
                  <li>المورد مسؤول عن دقة المعلومات والصور المعروضة</li>
                  <li>المورد ملتزم بتقديم الخدمة كما هي موصوفة في المنتج</li>
                  <li>المورد ملتزم بالرد على العملاء خلال وقت معقول (٢٤ ساعة كحد أقصى)</li>
                  <li>منصة مضمونة بتاخد عمولة شفافة من كل حجز (موضحة في عقد التسجيل)</li>
                  <li>مضمونة تحتفظ بحق إخفاء أو إزالة أي منتج يخالف الشروط أو يتلقى شكاوى متكررة</li>
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

              <Section title="٨ مكرر. برنامج «سوّق واكسب» (الإحالات ورصيد المحفظة)">
                <ul>
                  <li>عن كل حساب جديد ينضم لمضمونة عن طريق كود الإحالة الخاص بك، تحصل على <strong>300 جنيهًا رصيدًا ترويجيًا</strong> في محفظتك.</li>
                  <li><strong>شرط استحقاق المكافأة:</strong> قيام الحساب الجديد بمشاركة (Share) صفحة مضمونة الرسمية على فيسبوك، وإرسال إثبات المشاركة (لقطة شاشة) إلى المارد على واتساب <span dir="ltr">01002229982</span>. تتم المراجعة خلال 48 ساعة.</li>
                  <li>الرصيد الترويجي يُستخدم <strong>كخصم على الطلبات داخل مضمونة فقط</strong>، وبحد أقصى <strong>قيمة عمولة مضمونة في الطلب الواحد</strong> — ولا يُستبدل نقدًا ولا يُحوَّل خارج المنصة ولا يُسترد.</li>
                  <li>الحد الأقصى 20 إحالة مُكافأة شهريًا لكل حساب. الحسابات الوهمية أو المكررة أو أي استخدام مخالف يؤدي لإلغاء الرصيد والاستبعاد من البرنامج.</li>
                  <li>يحق لمضمونة تعديل قيمة المكافأة أو شروط البرنامج أو إيقافه كليًا في أي وقت، مع سريان التعديل من تاريخ نشره.</li>
                </ul>
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
            </>
          )}

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
              <p className="text-sm font-bold text-gray-900">{en ? 'Contact on WhatsApp' : 'تواصل واتساب'}</p>
              <p className="text-xs text-gray-500" dir="ltr">+20 100 222 9982 · 24/7</p>
            </div>
          </a>
        </article>

        <p className="text-center text-xs text-gray-500 mt-8">
          {en ? '© 2026 Madmona. All rights reserved.' : '© 2026 Madmona. جميع الحقوق محفوظة.'}
        </p>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg md:text-xl font-black text-gray-900 mb-3">{title}</h2>
      <div className="text-sm md:text-base text-gray-700 leading-relaxed space-y-2 [&_ul]:list-disc [&_ul]:ps-5 [&_ul]:space-y-1.5 [&_strong]:text-gray-900 [&_strong]:font-bold">
        {children}
      </div>
    </section>
  )
}
