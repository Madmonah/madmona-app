// src/app/system/page.tsx
// ============================================================================
// 🧭 /system — «سيستم مضمونة بيعمل إيه لبيزنسك؟» (٧ سبتمبر ٢٠٢٦)
//    محمد: «محتاج حاجة اسبيشيال وشرح واضح للـB2B» + «عايز أعرف الناس نظام الـERP
//    والـCRM يقدر يعمل إيه ويفيدهم إزاي».
//    كل سطر هنا = شاشة موجودة فعلًا في لوحة الإدارة (src/lib/erpModules.ts).
//    ⛔ مفيش رقم عمولة · مفيش سعر قديم · «١٠٠٠ ج بدل كتير» لبرنامج الإدارة بس ·
//       العرض على السوق مجاني والسعر اللي بيطلبه هو اللي بياخده (قاعدة ٤/٩).
//    صفحة ثابتة — صفر API. الـCTA بيودّي على /pro (الحجز) و/title (الجذب).
// ============================================================================
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'سيستم مضمونة بيعمل إيه لبيزنسك؟',
  description: 'حسابات · عملاء · موظفين وحضور ومرتبات · بوت واتساب · صفحة لبيزنسك — كله في مكان واحد ومن موبايلك. برنامج الإدارة بـ١٠٠٠ ج بدل كتير لعدد محدود.',
}

// 🧩 ٥ محاور — كل بند = موديول حقيقي في erpModules
const PILLARS: { emoji: string; name: string; tagline: string; you: string; items: string[] }[] = [
  {
    emoji: '📒', name: 'الحسابات والفلوس', tagline: 'كل جنيه داخل وخارج بيتسجّل',
    you: 'بتعرف آخر اليوم كسبت ولا خسرت — من غير دفتر ولا إكسيل.',
    items: ['الحسابات والقيود', 'المصاريف', 'جرد الكاش', 'المخزون', 'الموردين وطلبات الشراء', 'VAT Report وتصدير التقارير'],
  },
  {
    emoji: '📇', name: 'العملاء (CRM)', tagline: 'كل عميل ليه صفحة',
    you: 'مين اتصل، طلب إيه، ورجع إمتى — والسيستم بيقولك مين غاب عنك عشان تلحقه.',
    items: ['متابعة العملاء والليدات', 'سجل العملاء', 'عملاء في خطر', 'العروض'],
  },
  {
    emoji: '🕘', name: 'الموظفين والحضور والمرتبات (HR)', tagline: 'الشغل بالساعات مش بالمواعيد',
    you: 'الموظف بيبصم من موبايله، التاسكات بتتولد له لوحدها، وإنت شايف مين حاضر وعمل إيه — والمرتب بيتحسب من الحضور الفعلي.',
    items: ['الفريق والصلاحيات', 'الحضور وأجهزة البصم', 'جدول التاسكات اليومي', 'المونيتور', 'المرتبات', 'العهدة وطلبات الموظفين'],
  },
  {
    emoji: '🤖', name: 'بوت الواتساب', tagline: 'بيرد بدالك على رقمك إنت',
    you: 'العميل يسأل «عندكم إيه؟ بكام؟» — البوت يرد من منيوك أو كتالوجك بأسعارك، ولو جاد يسجّله ليد ويبعتلك إشعار.',
    items: ['ربط بمسح QR من اللوحة', 'رد من الكتالوج بعملتك', 'تسجيل الليد في العملاء', 'إشعار فوري لصاحب البيزنس'],
  },
  {
    emoji: '🌐', name: 'صفحتك على النت', tagline: 'لينك واحد لبيزنسك',
    you: 'المنيو أو الخدمات بالأسعار، الفروع، الحجز أو الأوردر — تبعته لعملائك أو تحطه في البايو.',
    items: ['صفحة كلاود لبيزنسك', 'الظهور في سوق مضمونة', 'الحجوزات والأوردرات بتوصلك في اللوحة'],
  },
]

// 🏪 اللي بيتغيّر حسب نشاطك — من erpModules (v: restaurant · beauty_salon · polyclinic …)
const BY_TYPE: { type: string; gets: string }[] = [
  { type: 'مطعم / كافيه', gets: 'المنيو بالأسعار والمقاسات · الأوردرات · طلبات التسعير · الفروع' },
  { type: 'عيادة / مجمع عيادات', gets: 'المواعيد · قائمة الانتظار · مواعيد العمل · ملفات المرضى' },
  { type: 'صالون / سبا / جيم', gets: 'إدارة الحجوزات · قائمة الخدمات والأسعار · مواعيد العمل · ربط الخدمة بالمنتج' },
  { type: 'معرض عربيات', gets: 'المعرض · الكتالوج · الورشة · التوكيلات · الاستيراد · الحجوزات' },
  { type: 'شركة عقارية / مطوّر', gets: 'الوحدات · المشاريع · التحصيل · ربحية المشاريع · الجدول الزمني' },
  { type: 'مقاولات وتشطيبات', gets: 'المشاريع · المستخلصات · جدول الكميات · أوامر التغيير · خطابات الضمان · مقاولي الباطن · المعدات' },
  { type: 'مصنع / مورد', gets: 'الكتالوج · طلبات التسعير · المخزون · الموردين وطلبات الشراء' },
  { type: 'خدمات منزلية / محترفين', gets: 'الحجوزات · قائمة الخدمات · مواعيد العمل · سجل العملاء' },
]

export default function SystemPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-[#FAFAF7] text-[#0A0A0A]">
      <div className="mx-auto max-w-2xl px-5 py-10">

        <p className="text-xs font-bold tracking-widest text-[#1F6F5F]">لأصحاب البيزنس</p>
        <h1 className="mt-2 text-4xl font-black leading-tight tracking-tight">
          سيستم مضمونة بيعمل إيه <span className="text-[#1F6F5F]">لبيزنسك؟</span>
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-[#5B6360]">
          لو بتتابع الفلوس والعملاء والموظفين على ورق أو واتساب أو إكسيل — ده بديلهم كلهم.
          حسابات، وعملاء، وموظفين، وبوت واتساب بيرد بدالك، وصفحة لبيزنسك. في مكان واحد، ومن موبايلك.
        </p>

        {/* الفرق بين المنصة والسيستم — الرسالتين ما يتخلطوش (قاعدة ٦/٩) */}
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#DFE3E0] bg-white p-5">
            <p className="text-xs font-bold tracking-widest text-[#7C8481]">١ — العرض على سوق مضمونة</p>
            <p className="mt-1 text-xl font-black">مجاني</p>
            <p className="mt-1 text-sm leading-relaxed text-[#5B6360]">
              إعلانك ومنيوك وحجوزاتك على السوق. السعر اللي بتطلبه هو اللي بتاخده — ومضمونة في النص بتضمن الصفقة للطرفين.
            </p>
          </div>
          <div className="rounded-2xl border-2 border-[#1F6F5F] bg-white p-5">
            <p className="text-xs font-bold tracking-widest text-[#1F6F5F]">٢ — برنامج الإدارة (ERP + CRM)</p>
            <p className="mt-1 text-xl font-black">١٠٠٠ ج <span className="text-base font-extrabold text-[#1F6F5F]">بدل كتير</span></p>
            <p className="mt-1 text-sm leading-relaxed text-[#5B6360]">
              اللوحة الكاملة اللي تحت دي. لعدد محدود من الحسابات.
            </p>
          </div>
        </div>

        {/* ٥ محاور */}
        <h2 className="mt-12 text-2xl font-black">بيعمل إيه — بالظبط</h2>
        <div className="mt-4 space-y-4">
          {PILLARS.map((p) => (
            <section key={p.name} className="rounded-2xl border border-[#DFE3E0] bg-white p-5">
              <div className="flex items-start gap-3">
                <span className="text-3xl leading-none">{p.emoji}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-black">{p.name}</h3>
                  <p className="text-sm font-bold text-[#1F6F5F]">{p.tagline}</p>
                </div>
              </div>
              <p className="mt-3 leading-relaxed text-[#0A0A0A]">
                <span className="font-black">بيفيدك إزاي:</span> {p.you}
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {p.items.map((it) => (
                  <li key={it} className="rounded-full bg-[#FAFAF7] px-3 py-1 text-[13px] font-bold text-[#0A0A0A]">
                    ✓ {it}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {/* حسب النشاط */}
        <h2 className="mt-12 text-2xl font-black">والسيستم بيتشكّل على نشاطك</h2>
        <p className="mt-2 text-[#5B6360]">نفس اللوحة، بس الشاشات اللي بتظهرلك بتختلف حسب شغلك:</p>
        <div className="mt-4 overflow-hidden rounded-2xl border border-[#DFE3E0] bg-white">
          {BY_TYPE.map((r, i) => (
            <div key={r.type} className={`grid grid-cols-[minmax(110px,1fr)_2fr] gap-3 px-4 py-3 text-sm ${i ? 'border-t border-[#EEF0EE]' : ''}`}>
              <span className="font-black">{r.type}</span>
              <span className="leading-relaxed text-[#5B6360]">{r.gets}</span>
            </div>
          ))}
        </div>

        {/* ٣ خطوات */}
        <h2 className="mt-12 text-2xl font-black">تبدأ إزاي؟ ٣ خطوات</h2>
        <ol className="mt-4 space-y-3">
          {[
            ['سجّل بيزنسك', 'من الموبايل، وتوثيق الرقم بالواتساب — من غير باسورد.'],
            ['كمّل شركتك', 'السيستم بيمشي معاك خطوة خطوة: الفرع بعنوانه ومواعيده ← الموظفين ← المنيو أو الكتالوج ← بوت الواتساب.'],
            ['اربط واتسابك', 'مسح QR واحد — ومن ساعتها البوت بيرد على عملائك من كتالوجك ويسجّل الليدات.'],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-4 rounded-2xl border border-[#DFE3E0] bg-white p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#1F6F5F] text-lg font-black text-[#FAFAF7]">{i + 1}</span>
              <div><p className="font-black">{t}</p><p className="text-sm leading-relaxed text-[#5B6360]">{d}</p></div>
            </li>
          ))}
        </ol>

        {/* CTA */}
        <section className="mt-12 rounded-2xl bg-[#1F6F5F] px-6 py-8 text-center">
          <p className="text-2xl font-black leading-snug text-[#FAFAF7]">برنامج الإدارة كامل بـ١٠٠٠ ج — بدل كتير.</p>
          <p className="mt-2 text-[#CFEBDD]">لعدد محدود من الحسابات. سيب رقمك وإحنا نكلّمك ونفعّلك — من غير دفع دلوقتي.</p>
          <Link href="/pro" className="mt-5 inline-block rounded-2xl bg-[#FAFAF7] px-8 py-4 text-lg font-extrabold text-[#0C2B22]">
            احجز حسابك ←
          </Link>
          <p className="mt-4 text-sm text-[#CFEBDD]">
            مش عارف تايتلك إيه؟ <Link href="/title" className="font-extrabold text-[#FAFAF7] underline">ارفع صورة من شغلك ونقولك</Link>
          </p>
        </section>

        <p className="mt-6 text-center text-xs leading-relaxed text-[#7C8481]">
          كل بند فوق شاشة موجودة فعلًا في لوحة الإدارة — مفيش وعود بحاجة لسه ماتعملتش.
        </p>
      </div>
    </main>
  )
}
