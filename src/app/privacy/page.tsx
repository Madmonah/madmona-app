import Link from 'next/link'
import { Metadata } from 'next'
import { ArrowRight, ShieldCheck, Mail, MessageCircle } from 'lucide-react'
import TopNav from '@/components/TopNav'

export const metadata: Metadata = {
  title: 'سياسة الخصوصية | مضمونة',
  description: 'سياسة الخصوصية لمنصة Madmona Marketplace — كيف نتعامل مع بياناتك الشخصية.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen gradient-mesh text-right" dir="rtl">
      <TopNav />

      <main className="max-w-3xl mx-auto px-4 pb-16 pt-8">
        <div className="mb-8 animate-slide-up">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-[#1F5F3F] font-bold hover:gap-2 transition-all no-underline mb-4"
          >
            <ArrowRight className="w-4 h-4" />
            الرئيسية
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-[#1F5F3F]/10 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-[#1F5F3F]" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#B8860B] uppercase tracking-widest">حماية بياناتك</p>
              <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight">سياسة الخصوصية</h1>
            </div>
          </div>
          <p className="text-sm text-gray-500">آخر تحديث: مايو ٢٠٢٦</p>
        </div>

        <article className="bg-white rounded-3xl shadow-card p-7 md:p-10 space-y-7 animate-slide-up delay-100">
          <Section title="مقدمة">
            <p>
              مضمونة (Madmona) ملتزمة بحماية خصوصيتك. هذه السياسة تشرح كيف نجمع، نستخدم، نخزن، ونحمي بياناتك الشخصية لما تستخدم موقعنا أو تطبيقنا (madmonacairo.com).
            </p>
          </Section>

          <Section title="١. البيانات اللي بنجمعها">
            <ul>
              <li><strong>بيانات الحساب:</strong> الاسم، رقم التليفون، كلمة السر (مشفّرة)</li>
              <li><strong>بيانات الحجز:</strong> تفاصيل الحجوزات، الأسعار، تواريخ الإقامة</li>
              <li><strong>بيانات تقنية:</strong> عنوان IP، نوع الجهاز، المتصفح، الموقع التقريبي</li>
              <li><strong>بيانات اختيارية:</strong> صور، تقييمات، تعليقات (إذا اخترت إضافتها)</li>
              <li><strong>بيانات الموردين:</strong> اسم النشاط، السجل التجاري، الرقم الضريبي، صور المستندات (للموردين فقط)</li>
            </ul>
          </Section>

          <Section title="٢. كيف بنستخدم بياناتك">
            <ul>
              <li>تنفيذ الحجوزات والربط بين العملاء والموردين</li>
              <li>التواصل معك بخصوص الحجوزات أو التحديثات المهمة</li>
              <li>تحسين تجربة الموقع والتطبيق</li>
              <li>الالتزام بالقوانين المصرية المعمول بها</li>
              <li>حماية المنصة من الاحتيال أو الاستخدام السيء</li>
            </ul>
          </Section>

          <Section title="٣. مشاركة البيانات مع آخرين">
            <p>
              مش بنبيع بياناتك أبداً. لكن في حالات محددة بنشاركها:
            </p>
            <ul>
              <li><strong>مع الموردين:</strong> اسمك ورقم تليفونك للتواصل بخصوص حجزك فقط</li>
              <li><strong>مع مزودي الخدمة:</strong> Supabase (قاعدة البيانات)، Vercel (الاستضافة)، Cloudflare (الأمان) — كلهم ملتزمين بمعايير حماية صارمة</li>
              <li><strong>للسلطات القانونية:</strong> فقط لما يكون مطلوب قانونياً</li>
            </ul>
          </Section>

          <Section title="٤. الـCookies والتتبع">
            <p>
              بنستخدم cookies أساسية لتشغيل الموقع (زي حفظ تسجيل الدخول). مش بنستخدم cookies إعلانية تتبعك على مواقع تانية.
            </p>
          </Section>

          <Section title="٥. أمان البيانات">
            <ul>
              <li>كل البيانات الحساسة مشفّرة (HTTPS + كلمات سر مشفّرة بـbcrypt)</li>
              <li>بنستخدم Row Level Security في قاعدة البيانات (RLS)</li>
              <li>الوصول للبيانات محدود للموظفين المخوّلين فقط</li>
              <li>بنراقب النظام باستمرار لأي محاولات اختراق</li>
            </ul>
          </Section>

          <Section title="٦. حقوقك">
            <p>عندك الحق في:</p>
            <ul>
              <li>الوصول لبياناتك الشخصية المخزنة عندنا</li>
              <li>تعديل أي بيانات غير صحيحة</li>
              <li>طلب حذف حسابك وكل بياناتك (Right to be forgotten)</li>
              <li>سحب موافقتك في أي وقت</li>
              <li>الحصول على نسخة من بياناتك</li>
            </ul>
            <p>
              للممارسة أي من هذه الحقوق، تواصل معانا على واتساب أو من خلال الرابط في آخر الصفحة.
            </p>
          </Section>

          <Section title="٧. القاصرين">
            <p>
              منصة مضمونة مش موجهة للأطفال تحت ١٨ سنة. لو اكتشفنا إن قاصر سجّل بياناته، هنحذفها فوراً.
            </p>
          </Section>

          <Section title="٨. تغييرات على السياسة">
            <p>
              ممكن نحدّث السياسة من وقت للتاني. أي تغييرات جوهرية هنخبرك بيها على الموقع وعلى الواتساب لو مسجّل.
            </p>
          </Section>

          <Section title="٩. تواصل معنا">
            <p>
              لأي استفسار عن الخصوصية، تواصل معانا:
            </p>
          </Section>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
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
                <p className="text-sm font-bold text-gray-900">واتساب</p>
                <p className="text-xs text-gray-500" dir="ltr">+20 100 222 9982</p>
              </div>
            </a>
            <a
              href="mailto:privacy@madmonacairo.com"
              className="flex items-center gap-3 p-4 bg-gradient-to-l from-[#1F5F3F]/10 to-transparent rounded-2xl border border-[#1F5F3F]/20 hover:shadow-soft hover:-translate-y-0.5 transition-all no-underline"
            >
              <div className="w-10 h-10 rounded-xl bg-[#1F5F3F] flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">إيميل</p>
                <p className="text-xs text-gray-500" dir="ltr">privacy@madmonacairo.com</p>
              </div>
            </a>
          </div>
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
