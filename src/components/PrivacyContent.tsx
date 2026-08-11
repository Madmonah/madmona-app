'use client'

import Link from 'next/link'
import { ArrowRight, ShieldCheck, Mail, MessageCircle } from 'lucide-react'
import TopNav from '@/components/TopNav'
import { useT } from '@/lib/i18n/LanguageProvider'

export default function PrivacyContent() {
  const { lang, dir } = useT()
  const en = lang === 'en'

  return (
    <div className="min-h-screen gradient-mesh" dir={dir}>
      <TopNav />

      <main className="max-w-3xl mx-auto px-4 pb-16 pt-8">
        <div className="mb-8 animate-slide-up">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-[#FA8125] font-bold hover:gap-2 transition-all no-underline mb-4"
          >
            <ArrowRight className="w-4 h-4 ltr:rotate-180" />
            {en ? 'Home' : 'الرئيسية'}
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FA8125]/10 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-[#FA8125]" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#2FA084] uppercase tracking-widest">
                {en ? 'Protecting your data' : 'حماية بياناتك'}
              </p>
              <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight">
                {en ? 'Privacy Policy' : 'سياسة الخصوصية'}
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
                  Madmona is committed to protecting your privacy. This policy explains how we collect, use, store, and protect your personal data when you use our website or app (madmonacairo.com).
                </p>
              </Section>

              <Section title="1. Data we collect">
                <ul>
                  <li><strong>Account data:</strong> name, phone number, password (encrypted)</li>
                  <li><strong>Booking data:</strong> booking details, prices, stay dates</li>
                  <li><strong>Technical data:</strong> IP address, device type, browser, approximate location</li>
                  <li><strong>Optional data:</strong> photos, reviews, comments (if you choose to add them)</li>
                  <li><strong>Supplier data:</strong> business name, commercial registration, tax number, document images (suppliers only)</li>
                </ul>
              </Section>

              <Section title="2. How we use your data">
                <ul>
                  <li>Fulfilling bookings and connecting customers with suppliers</li>
                  <li>Communicating with you about bookings or important updates</li>
                  <li>Improving the website and app experience</li>
                  <li>Complying with applicable Egyptian laws</li>
                  <li>Protecting the platform from fraud or misuse</li>
                </ul>
              </Section>

              <Section title="3. Sharing data with others">
                <p>
                  We never sell your data. But in specific cases we share it:
                </p>
                <ul>
                  <li><strong>With suppliers:</strong> your name and phone number to communicate about your booking only</li>
                  <li><strong>With service providers:</strong> Supabase (database), Vercel (hosting), Cloudflare (security) — all committed to strict protection standards</li>
                  <li><strong>With legal authorities:</strong> only when legally required</li>
                </ul>
              </Section>

              <Section title="4. Cookies and tracking">
                <p>
                  We use essential cookies to run the site (such as keeping you logged in). We do not use advertising cookies that track you across other sites.
                </p>
              </Section>

              <Section title="5. Data security">
                <ul>
                  <li>All sensitive data is encrypted (HTTPS + passwords hashed with bcrypt)</li>
                  <li>We use Row Level Security (RLS) in the database</li>
                  <li>Data access is limited to authorized staff only</li>
                  <li>We continuously monitor the system for any intrusion attempts</li>
                </ul>
              </Section>

              <Section title="6. Your rights">
                <p>You have the right to:</p>
                <ul>
                  <li>Access your personal data stored with us</li>
                  <li>Correct any inaccurate data</li>
                  <li>Request deletion of your account and all your data (right to be forgotten)</li>
                  <li>Withdraw your consent at any time</li>
                  <li>Get a copy of your data</li>
                </ul>
                <p>
                  To exercise any of these rights, contact us on WhatsApp or through the link at the bottom of the page.
                </p>
              </Section>

              <Section title="7. Minors">
                <p>
                  The Madmona platform is not directed at children under 18. If we discover that a minor has registered their data, we will delete it immediately.
                </p>
              </Section>

              <Section title="8. Changes to the policy">
                <p>
                  We may update the policy from time to time. We will notify you of any material changes on the website and via WhatsApp if you are registered.
                </p>
              </Section>

              <Section title="9. Contact us">
                <p>
                  For any question about privacy, contact us:
                </p>
              </Section>
            </>
          ) : (
            <>
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
            </>
          )}

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
                <p className="text-sm font-bold text-gray-900">{en ? 'WhatsApp' : 'واتساب'}</p>
                <p className="text-xs text-gray-500" dir="ltr">+20 100 222 9982</p>
              </div>
            </a>
            <a
              href="mailto:privacy@madmonacairo.com"
              className="flex items-center gap-3 p-4 bg-gradient-to-l from-[#FA8125]/10 to-transparent rounded-2xl border border-[#FA8125]/20 hover:shadow-soft hover:-translate-y-0.5 transition-all no-underline"
            >
              <div className="w-10 h-10 rounded-xl bg-[#FA8125] flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{en ? 'Email' : 'إيميل'}</p>
                <p className="text-xs text-gray-500" dir="ltr">privacy@madmonacairo.com</p>
              </div>
            </a>
          </div>
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
