// src/lib/marid-tools.ts
//
// 🧰 أدوات المارد — إزاي المارد بيعرف بيانات مضمونة الحقيقية.
//
// ليه أدوات مش برومبت:
//   عندنا ٣٤٤ إعلان و٤٠٧ تصنيف و١٤٧ مورد. لو حشيناهم في البرومبت:
//   (١) مش هيدخلوا  (٢) الأسعار بتتغيّر فيقعد يقول معلومة قديمة بثقة.
//   بالأدوات بيسأل لما يحتاج، فالمعلومة دايمًا من الداتابيز مباشرة.
//
// ⚠️ قاعدة أمنية: كل أداة بترجّع الأعمدة الآمنة بس.
//   ممنوع نهائيًا: national_id, kyc_documents, password_hash,
//   payout_details, customer_national_id, guest_national_id.
//   لو ضفت أداة جديدة، اسأل «أنهي أعمدة؟» قبل ما تعمل select('*').

import { supabaseUntyped as db } from './supabase'
import { getDisabledMaridTools, blockedToolResult } from './marid-tool-settings'

const SITE = 'https://www.madmonacairo.com'

// ── روابط ثابتة يعرفها المارد ────────────────────────────────────────────
export const MADMONA_LINKS = {
  تصفح_السوق: `${SITE}/browse`,
  تسجيل_عميل_جديد: `${SITE}/auth/signup`,
  دخول_عميل: `${SITE}/auth/login`,
  حسابي: `${SITE}/account`,
  حجوزاتي: `${SITE}/account/bookings`,
  طلباتي: `${SITE}/account/orders`,
  محفظتي: `${SITE}/account/wallet`,
  تسجيل_مورد_جديد: `${SITE}/supplier/register`,
  دخول_مورد: `${SITE}/supplier/login`,
  لوحة_المورد: `${SITE}/supplier/dashboard`,
  اضافة_اعلان: `${SITE}/add-listing`,
  اعلانات_المورد: `${SITE}/supplier/marketplace`,
  حجوزات_المورد: `${SITE}/supplier/bookings`,
  طلبات_المورد: `${SITE}/supplier/marketplace/orders`,
  فريق_المورد: `${SITE}/supplier/team`,
  محاسبة_المورد: `${SITE}/supplier/erp/accounting`,
  بورصة_مضمونة_العقارية: `${SITE}/real-estate/market`,
  الخدمات: `${SITE}/marketplace`,
  عن_مضمونة: `${SITE}/about`,
} as const

// ── مساعد: كل الصيغ الممكنة لرقم واحد ────────────────────────────────────
// الأرقام متخزّنة بصيغ مختلفة (+201..., 201..., 01...) حسب مصدر التسجيل.
function looksLikeLidLocal(raw: string): boolean {
  const d = (raw || '').replace(/\D/g, '')
  return d.length >= 14
}

function phoneVariants(raw: string): string[] {
  const d = (raw || '').replace(/\D/g, '')
  if (!d) return []
  const local = d.startsWith('20') ? '0' + d.slice(2) : d.startsWith('0') ? d : '0' + d
  const intl = d.startsWith('20') ? d : '20' + local.slice(1)
  return Array.from(new Set([raw, d, intl, `+${intl}`, local]))
}

// ═════════════════════════════════════════════════════════════════════════
// تعريفات الأدوات (اللي Claude بيشوفها)
// ═════════════════════════════════════════════════════════════════════════

export const MARID_TOOLS = [
  {
    name: 'search_catalog',
    description:
      'ابحث في إعلانات مضمونة الحقيقية. استخدمها كل مرة العميل يسأل عن حاجة معينة ' +
      '(شاليه، عربية، كوافير، مطعم، معدات...). بترجّع إعلانات فعلية بأسعار ولينكات. ' +
      'ممنوع تخترع إعلانات أو أسعار — لو مالقتش حاجة قول كده بصراحة.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'اللي العميل بيدوّر عليه بكلماته' },
        city: { type: 'string', description: 'المدينة أو المنطقة لو ذكرها' },
        category_slug: { type: 'string', description: 'slug التصنيف لو عارفه' },
      },
      required: ['query'],
    },
  },
  {
    name: 'list_categories',
    description:
      'اعرف إيه التصنيفات والخدمات اللي مضمونة شغالة فيها. استخدمها لما العميل يسأل ' +
      '«عندكم إيه؟» أو «بتشتغلوا في إيه؟» أو لما تحتاج تعرف التصنيف الصح لإعلان جديد.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'كلمة للتصفية — سيبها فاضية عشان تجيب الأشهر' },
      },
      required: [],
    },
  },
  {
    name: 'who_is_this',
    description:
      'اعرف الرقم اللي بيكلّمك ده مين: مورد مسجّل؟ عميل عنده حساب؟ ولا جديد خالص؟ ' +
      'استخدمها في أول رسالة عشان تعرف تبعت اللينك الصح وتكلّمه بالشكل المناسب.',
    input_schema: {
      type: 'object' as const,
      properties: {
        phone: { type: 'string', description: 'رقم المتكلّم' },
        name: { type: 'string', description: 'الاسم المعروض — مهم جدًا لو الرقم مُعرّف مخفي' },
      },
      required: ['phone'],
    },
  },
  {
    name: 'get_my_orders',
    description:
      'هات حجوزات وطلبات العميل بالرقم. استخدمها لما يسأل «فين حجزي؟» أو «طلبي وصل فين؟». ' +
      'بترجّع الحالة والتاريخ والمبلغ بس — مفيش بيانات دفع ولا أرقام قومية.',
    input_schema: {
      type: 'object' as const,
      properties: {
        phone: { type: 'string', description: 'رقم العميل' },
      },
      required: ['phone'],
    },
  },
  {
    name: 'create_listing_draft',
    description:
      'سجّل إعلان جديد لحد عايز يضيف منتج أو خدمة على مضمونة. ' +
      'استخدمها بس لما يبقى معاك على الأقل: اسم الحاجة + وصف مختصر. ' +
      'لو العميل بعت صورة، مرّر رابطها في image_urls (استخدم الرابط المحفوظ اللي في سياق الرسالة) — ' +
      'وقتها الإعلان بينزل على مضمونة أوتوماتيك خلال دقايق. ' +
      'لو مفيش صورة، سجّل الإعلان واطلب منه صورة فورًا — الماركتبليس بيرفض إعلان من غير صورة. ' +
      'لو ناقص السعر أو التصنيف اسأله.\n\n' +
      '⚠️ لو العميل مطعم وبعتلك المنيو كامل (أصناف بأسعارها): سجّل الإعلان هنا بوصف عام ومختصر ' +
      'بس (اسم المطعم + عنوانه + نوع الأكل)، وماتحطش الأصناف والأسعار في الوصف — نادي أداة ' +
      'add_menu_items بعد كده وحط كل صنف بسعره فيها. الوصف مكانه مش مكان المنيو.',
    input_schema: {
      type: 'object' as const,
      properties: {
        phone: { type: 'string', description: 'رقم صاحب الإعلان' },
        name: { type: 'string', description: 'اسمه لو قاله' },
        title: { type: 'string', description: 'اسم المنتج أو الخدمة' },
        description: { type: 'string', description: 'وصف مختصر' },
        category_slug: { type: 'string', description: 'التصنيف من list_categories' },
        price_egp: {
          type: 'number',
          description:
            'السعر اللي المورد **هياخده في إيده** بالجنيه — الصافي، مش سعر العرض. '+
            'النظام بيزوّد نصيب مضمونة فوقه لوحده. '+
            '⛔ ماتسألش عن «السعر النهائي» ولا تذكر عمولة — اسأل: «هتاخد كام في إيدك؟»',
        },
        period: { type: 'string', description: 'اليوم/الشهر/الساعة/القطعة' },
        is_furnished: {
          type: 'boolean',
          description:
            'إلزامي لو التصنيف عقار للإيجار (category_slug يبدأ بـ properties- مش sale-properties-): ' +
            'true = مفروش، false = بدون فرش. اسأل العميل صراحة الشقة مفروشة ولا فاضية لو مش واضح من كلامه. ' +
            'من غير القيمة دي الإعلان بيظهر في القسمين مع بعض وده بيلخبط الدور.',
        },
        image_urls: {
          type: 'array',
          items: { type: 'string' },
          description: 'روابط صور المنتج/الخدمة اللي العميل بعتها (الرابط المحفوظ في سياق الرسالة)',
        },
      },
      required: ['phone', 'title'],
    },
  },
  {
    name: 'add_menu_items',
    description:
      'ضيف أصناف منيو مطعم بأسعارها — استخدمها **بدل** ما تحط الأصناف والأسعار في وصف ' +
      'create_listing_draft. لازم يكون عندك listing_id للمطعم الأول (نادي create_listing_draft ' +
      'الأول لو الإعلان لسه مش موجود، وارجع بعدين نادي الأداة دي بالـ id اللي رجعلك).\n' +
      '⚠️ كل صنف لازم يكون معاه سعر رقم واضح (مش «حسب الحجم» أو مجال) — لو الصنف بيتقسّم ' +
      'أحجام بأسعار مختلفة، سجّله بأقل سعر واذكر باقي الأحجام في description_ar بتاعه.',
    input_schema: {
      type: 'object' as const,
      properties: {
        listing_id: { type: 'string', description: 'معرّف إعلان المطعم (من create_listing_draft)' },
        items: {
          type: 'array',
          description: 'قائمة الأصناف',
          items: {
            type: 'object',
            properties: {
              name_ar: { type: 'string', description: 'اسم الصنف' },
              price: { type: 'number', description: 'السعر بالجنيه' },
              category: { type: 'string', description: 'قسم المنيو زي "ساندوتشات" أو "مشروبات" لو مذكور' },
              description_ar: { type: 'string', description: 'تفاصيل إضافية عن الصنف لو موجودة' },
            },
            required: ['name_ar', 'price'],
          },
        },
      },
      required: ['listing_id', 'items'],
    },
  },
  {
    name: 'create_supplier_group',
    description:
      'اعمل جروب متابعة لمورد جديد (المورد + فريق مضمونة). ' +
      'استخدمها بعد ما مورد جديد يسجّل إعلانه أو يتأكد إنه عايز يشتغل معانا.\n' +
      'أول رسالة في الجروب بتشرح إحنا مين وليه ضفناه — ده إجباري، ' +
      'الإضافة من غير شرح بتتقري كسبام.',
    input_schema: {
      type: 'object' as const,
      properties: {
        supplier_phone: { type: 'string', description: 'رقم المورد' },
        supplier_name: { type: 'string', description: 'اسم المورد أو نشاطه' },
        supplier_id: { type: 'string', description: 'معرّفه لو مسجّل' },
        listing_title: { type: 'string', description: 'اسم إعلانه لو موجود' },
      },
      required: ['supplier_phone', 'supplier_name'],
    },
  },
  {
    name: 'forward_to_supplier',
    description:
      'حوّل طلب عميل لجروب المورد المسؤول. استخدمها لما العميل يسأل عن إعلان ' +
      'معيّن وتحتاج رد من المورد نفسه (توفّر، ميعاد، تفاصيل مش عندك).\n' +
      '⚠️ ماتنقلش رقم العميل — مضمونة هي الوسيط.',
    input_schema: {
      type: 'object' as const,
      properties: {
        supplier_id: { type: 'string', description: 'معرّف المورد' },
        customer_request: { type: 'string', description: 'الطلب بصياغة واضحة' },
        customer_name: { type: 'string', description: 'اسم العميل لو معروف' },
      },
      required: ['supplier_id', 'customer_request'],
    },
  },
  {
    name: 'read_link',
    description:
      '⚠️ افتح لينك واقرا اللي فيه. **استخدمها فورًا** لما حد يبعت لينك — ' +
      'منيو (yallamenu · linktr.ee · me-qr) أو PDF أو صفحة مشروع.\n\n' +
      'من غيرها إنت **مش شايف** اللينك أصلاً. حصل يوم ٢٠ يوليو إن مطعم ' +
      'بعت لينك منيوه والمارد قاله «هسجّل الأصناف دلوقتي» وهو مش قادر ' +
      'يفتحه — فالمطعم استنى ومحصلش حاجة.\n\n' +
      'بعد ما تقراه: سجّل الأصناف بـ create_listing_draft صنف صنف.',
    input_schema: {
      type: 'object' as const,
      properties: {
        url: { type: 'string', description: 'اللينك كامل' },
      },
      required: ['url'],
    },
  },
  {
    name: 'search_projects',
    description:
      'ابحث في مشاريع بورصة مضمونة العقارية (١١٤ مشروع من مطوّرين). ' +
      'استخدمها عشان:\n' +
      '• تقارن مشروع بمشاريع تانية في نفس المنطقة أو نفس نطاق السعر\n' +
      '• تعرف مطوّر معيّن عنده كام مشروع عندنا\n' +
      '• تدّي العميل أو المطوّر سياق السوق\n\n' +
      'المقارنة لازم تكون من هنا — ممنوع تقارن بمشروع من ذاكرتك.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'اسم المشروع أو كلمة بحث' },
        area: { type: 'string', description: 'المنطقة — العاصمة الإدارية، الشيخ زايد...' },
        developer: { type: 'string', description: 'اسم المطوّر' },
        property_type: {
          type: 'string',
          enum: ['residential', 'commercial', 'administrative', 'medical'],
        },
        max_price: { type: 'number', description: 'أقصى سعر بالجنيه' },
      },
      required: [],
    },
  },
  {
    name: 'get_referral_code',
    description:
      'هات كود الإحالة بتاع العميل («شير واكسب» / «كودي» / «عايز أرشّح صحابي»). ' +
      'بيرجّع الكود ولينك جاهز يبعته لصحابه.',
    input_schema: {
      type: 'object' as const,
      properties: {
        phone: { type: 'string', description: 'رقم العميل' },
        name: { type: 'string', description: 'اسمه لو معروف' },
      },
      required: ['phone'],
    },
  },
  {
    name: 'record_job_application',
    description:
      'سجّل حد بيدوّر على شغل معانا. استخدمها لما حد يقول عايز أشتغل عندكم ' +
      'أو يسأل عن وظايف أو يبعت سيرة ذاتية.',
    input_schema: {
      type: 'object' as const,
      properties: {
        phone: { type: 'string' },
        full_name: { type: 'string' },
        position: { type: 'string', description: 'الوظيفة اللي عايزها' },
        message: { type: 'string', description: 'اللي قاله عن نفسه' },
        cv_url: { type: 'string', description: 'رابط السيرة الذاتية لو بعتها' },
      },
      required: ['phone'],
    },
  },
  {
    name: 'manage_order',
    description:
      'إدارة أوردر مطعم أو منتج. المورد بيرد على إشعار الأوردر، أو العميل بيلغي.\n\n' +
      'الإجراءات:\n' +
      '• check   — يشوف تفاصيل الأوردر وحالته\n' +
      '• accept  — المورد قبل الأوردر\n' +
      '• reject  — المورد رفض (لازم سبب)\n' +
      '• cancel  — العميل بيلغي (لازم سبب)\n\n' +
      '⛔ ضوابط لازم تلتزم بيها:\n' +
      '• قبول أو رفض الأوردر **للمورد صاحبه بس** — الأداة بتتأكد\n' +
      '• الإلغاء **لصاحب الأوردر بس**\n' +
      '• ماتأكّدش على حاجة قبل ما الأداة ترجّع ok\n' +
      '• ماتغيّرش أسعار — ده بيتعمل من لوحة المورد',
    input_schema: {
      type: 'object' as const,
      properties: {
        action: { type: 'string', enum: ['check', 'accept', 'reject', 'cancel'] },
        reference_code: { type: 'string', description: 'كود الأوردر زي MDX-1234' },
        actor_phone: { type: 'string', description: 'رقم اللي بيطلب الإجراء' },
        reason: { type: 'string', description: 'السبب — إجباري في الرفض والإلغاء' },
      },
      required: ['action', 'reference_code', 'actor_phone'],
    },
  },
  {
    name: 'manage_meeting',
    description:
      'حجز أو إلغاء أو الاستعلام عن ميعاد زيارة/مقابلة.\n' +
      '⛔ ممنوع تقول ميعاد من دماغك — أي كلام عن مواعيد لازم يعدّي من الأداة دي.',
    input_schema: {
      type: 'object' as const,
      properties: {
        action: { type: 'string', enum: ['book', 'cancel', 'check'], description: 'المطلوب' },
        phone: { type: 'string', description: 'رقم العميل' },
        at: { type: 'string', description: 'الميعاد ISO (للحجز بس) — مثال 2026-07-22T14:00:00+03:00' },
        kind: { type: 'string', description: 'visit أو call' },
        name: { type: 'string', description: 'اسمه' },
        location: { type: 'string', description: 'المكان لو محدد' },
        notes: { type: 'string', description: 'ملاحظات' },
      },
      required: ['action', 'phone'],
    },
  },
  {
    name: 'record_unmet_demand',
    description:
      'سجّل طلب عميل مش موجود عندنا في الكتالوج. استخدمها **كل مرة** ' +
      'search_catalog مايرجّعش حاجة مناسبة — عشان نعرف ندوّر للعميل ونرجعله، ' +
      'ومحمد يعرف إيه الناقص في السوق.',
    input_schema: {
      type: 'object' as const,
      properties: {
        phone: { type: 'string', description: 'رقم العميل' },
        name: { type: 'string', description: 'اسمه لو معروف' },
        requested_item: { type: 'string', description: 'اللي طلبه بالظبط' },
        category_guess: { type: 'string', description: 'التصنيف المتوقع' },
        city: { type: 'string', description: 'المنطقة لو ذكرها' },
        budget: { type: 'string', description: 'الميزانية لو ذكرها' },
      },
      required: ['phone', 'requested_item'],
    },
  },
  {
    name: 'create_project',
    description:
      'سجّل عقار في بورصة مضمونة العقارية — سواء مشروع مطوّر (كمبوند، مول، تاور) ' +
      'أو وحدة ريسيل من فرد (شقة/فيلا/شاليه للبيع). حدّد segment حسب الحالة:\n' +
      '  • developer = مشروع مطوّر (الافتراضي لو ماتحددش)\n' +
      '  • resale = وحدة ريسيل بيع من شخص (مش مطوّر)\n\n' +
      '📸 لو الريسيل بيع (أو أي عقار) معاه صور أو فيديو: مرّرهم في image_urls/video_url. ' +
      'لو معاه بيانات واضحة (مساحة وسعر ومنطقة) وصور، سجّله على طول — ماتستنيش لحد يطلب منك ذلك.\n' +
      '⛔ لو العرض ريسيل من فرد ومعاه صور/فيديو: نادي الأداة دي بـ segment="resale" **وكمان** نادي ' +
      'create_listing_draft بنفس الصور عشان يظهر في الماركتبليس كمان البورصة — الاتنين مش بديل بعض.\n\n' +
      '⛔ ممنوع تستخدمها لو:\n' +
      '• الاسم مش واضح — مشروع/وحدة من غير اسم مالوش لازمة\n' +
      '• الرسالة مكتوب فيها SOLDOUT أو «تم البيع» أو «خلصت» على المشروع/الوحدة دي\n' +
      '• السعر مش مذكور صراحة — ماتخمّنش، سيبه فاضي\n\n' +
      'الأداة بتتأكد بنفسها إن المشروع/الوحدة مش موجود قبل ما تحفظ. ' +
      '⚠️ لو رقم المرسل مسجّل عندنا كمورد بنشاط واضح مش عقاري (زي معرض سيارات)، الأداة بترفض ' +
      'وتقولك تستخدم create_listing_draft بدالها. لو الرقم مش موثّق كنشاط عقاري عندنا، بيتسجّل ' +
      'كمراجعة (مش بيظهر في البورصة فورًا) لحد ما فريق مضمونة يراجعه.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'اسم المشروع أو وصف قصير للوحدة زي ما هو مكتوب بالظبط' },
        segment: {
          type: 'string',
          enum: ['developer', 'resale'],
          description: 'developer = مشروع مطوّر (الافتراضي). resale = وحدة ريسيل بيع من فرد',
        },
        developer: { type: 'string', description: 'المطوّر — بس لو مذكور صراحة (مش مطلوب في resale)' },
        area_label: { type: 'string', description: 'المنطقة بالعربي' },
        property_type: {
          type: 'string',
          enum: ['residential', 'commercial', 'administrative', 'medical'],
          description: 'نوع المشروع/الوحدة',
        },
        unit_label: { type: 'string', description: 'وصف الوحدات والمساحات زي ما مذكور' },
        price_from: { type: 'number', description: 'أقل سعر مذكور بالجنيه' },
        note: { type: 'string', description: 'سطر أو اتنين يلخّصوا العرض' },
        image_urls: {
          type: 'array',
          items: { type: 'string' },
          description: 'روابط صور الوحدة/المشروع اللي العميل بعتها (الرابط المحفوظ في سياق الرسالة)',
        },
        video_url: { type: 'string', description: 'رابط فيديو لو العميل بعت واحد' },
        sender_phone: { type: 'string', description: 'رقم اللي بعت المشروع/الوحدة' },
      },
      required: ['title', 'sender_phone'],
    },
  },
  {
    name: 'create_task',
    description:
      'سجّل مهمة/تاسك في نظام الشغل — لما حد يطلب تذكير، متابعة، أو تكليف بعمل. ' +
      'أمثلة: «افتكرني أكلم فلان بكرة»، «اعمل مهمة راجع أوردر كذا»، «كلّف أحمد يجهّز التقرير». ' +
      'لو المكلّف موظف مسجّل، المهمة بتنزل في مهامه اليومية (النوع: من الشات) — وممكن بتاريخ مستقبلي. غير كده بتتسجّل في لوحة المهام العامة.\n' +
      '⚠️ لو المتكلّم موظف/صاحب بيزنس B2B (شايف بلوك «🏢» في المتكلّم)، لازم تبعت الـsupplier_id بتاعه — ' +
      'عشان المكلّف يترضبط داخل نفس البيزنس بس، مش أي حد بنفس الاسم في بيزنس تاني.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'عنوان المهمة باختصار وبوضوح' },
        detail: { type: 'string', description: 'تفاصيل إضافية لو موجودة' },
        assignee_name: { type: 'string', description: 'اسم الشخص المكلّف لو اتحدد' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'الأولوية (افتراضي medium)' },
        task_date: { type: 'string', description: 'تاريخ المهمة YYYY-MM-DD لو اتحدد يوم («بكرة»، «الخميس») — احسبه من تاريخ النهارده. سيبه فاضي لو النهارده' },
        due_time: { type: 'string', description: 'وقت المهمة HH:MM بنظام ٢٤ ساعة لو اتحدد («الساعة ٦ مساءً» = 18:00)' },
        supplier_id: { type: 'string', description: 'معرّف بيزنس الـB2B لو المتكلّم موظف/صاحب بيزنس — يقصر البحث عن المكلّف على نفس البيزنس بس' },
      },
      required: ['title'],
    },
  },
  {
    name: 'list_tasks',
    description:
      'اعرض المهام المفتوحة (اللي لسه مش خالصة) من نظام الشغل. ' +
      'استخدمها لما حد يسأل «إيه المهام؟» أو «فيه إيه عليّا؟». تقدر تفلتر باسم المكلّف.',
    input_schema: {
      type: 'object' as const,
      properties: {
        assignee_name: { type: 'string', description: 'اسم المكلّف لو عايز تفلتر بيه' },
        include_done: { type: 'boolean', description: 'يشمل المهام الخالصة كمان؟ (افتراضي لأ)' },
      },
      required: [],
    },
  },
  {
    name: 'complete_task',
    description:
      'علّم مهمة إنها خلصت. استخدمها لما حد يقول «خلّصت مهمة كذا» أو «اقفل مهمة أبيكس». ' +
      'بتدوّر على المهمة بجزء من عنوانها وتقفلها.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'جزء من عنوان المهمة اللي خلصت' },
      },
      required: ['query'],
    },
  },
  {
    name: 'business_snapshot',
    description:
      'لخّصلي حالة الشغل بسرعة (Catch Me Up).\n' +
      '• من غير supplier_id: حالة شغل مضمونة الداخلي (المهام المفتوحة والمحادثات المستنية رد).\n' +
      '• مع supplier_id: حالة بيزنس B2B معيّن (فريقه، فروعه، مهامه المفتوحة) — استخدمها ' +
      'لما موظف/صاحب بيزنس B2B (شايف بلوك «🏢 موظف/صاحب بيزنس» فوق في المتكلّم) يسأل ' +
      '«إيه الوضع؟» أو «فريقي عامل إيه» أو «مهامنا فين» — مرّر الـsupplier_id من البلوك ده.',
    input_schema: {
      type: 'object' as const,
      properties: {
        supplier_id: {
          type: 'string',
          description: 'معرّف بيزنس الـB2B (من بلوك «🏢 موظف/صاحب بيزنس» في المتكلّم) — سيبه فاضي لحالة مضمونة الداخلي',
        },
      },
      required: [],
    },
  },
  {
    name: 'recent_orders',
    description:
      'اعرض آخر الأوردرات/الحجوزات على مضمونة — لمتابعة المبيعات. ' +
      'استخدمها لما حد يسأل «إيه آخر الأوردرات؟» أو «فيه مبيعات النهاردة؟».',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'recent_demand',
    description:
      'اعرض آخر الطلبات اللي العملاء دوّروا عليها (فرص وطلب مش متغطّى). ' +
      'استخدمها لما حد يسأل «الناس بتدوّر على إيه؟» أو «الطلبات الناقصة».',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_financial_prices',
    description:
      'هات أسعار الذهب والعملات اللحظية (نفس اللي ظاهر فوق في الموقع). ' +
      'استخدمها كل ما حد يسأل عن سعر الذهب (عيار 24/21/18)، أو سعر الدولار ' +
      'أو اليورو أو الاسترليني أو الريال مقابل الجنيه. الأسعار بتتحدّث لحظيًا. ' +
      'ماتخترعش سعر من دماغك أبدًا — استخدم الأداة دي.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_property_prices',
    description:
      'هات أسعار العقارات من بورصة عقارات مضمونة (مشاريع المطورين + الريسيل + الإيجارات). ' +
      'استخدمها كل ما حد يسأل عن سعر عقار أو شقة أو فيلا أو محل في منطقة معينة، ' +
      'زي «بكام المتر في العاصمة الإدارية؟» أو «فيه إيه في الساحل؟» أو «عايز أعرف أسعار التجمع». ' +
      'ممكن تبعت اسم المنطقة (زي «الساحل الشمالي» أو «التجمع») عشان يفلتر، أو سيبها فاضية عشان يجيب عيّنة. ' +
      'ماتخترعش سعر عقار من دماغك — الأداة دي بترجّع الأسعار الحقيقية المسجّلة في البورصة.',
    input_schema: {
      type: 'object' as const,
      properties: {
        area: { type: 'string', description: 'اسم المنطقة للتصفية — سيبها فاضية للعيّنة العامة' },
        segment: { type: 'string', description: 'نوع العرض: developer (مطورين) أو resale (ريسيل) أو rent (إيجار) — اختياري' },
      },
      required: [],
    },
  },
] as const

// ═════════════════════════════════════════════════════════════════════════
// التنفيذ
// ═════════════════════════════════════════════════════════════════════════

type ToolResult = Record<string, unknown>

async function searchCatalog(a: { query: string; city?: string; category_slug?: string }): Promise<ToolResult> {
  const { data, error } = await db.rpc('search_listings_catalog', {
    p_query: a.query,
    p_category_slug: a.category_slug ?? null,
    p_city: a.city ?? null,
    p_limit: 5,
  })
  if (error) return { error: 'البحث فشل', detail: error.message }

  const rows = (data ?? []) as Array<Record<string, unknown>>
  if (!rows.length) {
    return {
      found: 0,
      note: 'مفيش نتايج. قول للعميل بصراحة إن ده مش متاح دلوقتي وممكن تاخد طلبه ونرجعله.',
    }
  }
  return {
    found: rows.length,
    listings: rows.map((r) => ({
      title: r.title,
      category: r.category,
      city: r.city ?? r.matched_location ?? null,
      price: r.price ?? null,
      currency: r.currency ?? 'EGP',
      period: r.period ?? null,
      url: r.url,
    })),
  }
}

async function listCategories(a: { query?: string }): Promise<ToolResult> {
  let q = db
    .from('categories')
    .select('name_ar, slug, group_name_ar')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .limit(a.query ? 15 : 30)

  if (a.query?.trim()) q = q.ilike('name_ar', `%${a.query.trim()}%`)

  const { data, error } = await q
  if (error) return { error: 'مش قادر أجيب التصنيفات' }
  return { categories: data ?? [] }
}

/**
 * تاريخ المتكلّم — حتى لو وصل بمُعرّف مخفي.
 *
 * المشكلة اللي بيحلّها (٢٠ يوليو):
 *   عبده بيبعت مخططات وحدات من ١٥ يوليو والمارد بيرد رد ممتاز.
 *   النهارده وصل بمُعرّف مخفي `275935005778128` باسم «Abdo Taha»
 *   → اتعملت محادثة جديدة فاضية → المارد عامله كأنه غريب وسأله
 *   أسئلة بديهية عن حاجة هو شارحها من أسبوع.
 *
 * مافيش طريقة نحوّل المُعرّف المخفي لرقم (Baileys 6.7.9).
 * بس الاسم المعروض بيفضل هو هو — فبنستخدمه كجسر.
 */
async function findHistoryByName(name?: string | null): Promise<ToolResult | null> {
  if (!name || name.trim().length < 3) return null

  const { data: convs } = await db
    .from('whatsapp_conversations')
    .select('id, contact_phone, contact_name, message_count, first_intent, last_message_at')
    .ilike('contact_name', name.trim())
    .order('message_count', { ascending: false })
    .limit(10)

  const others = (convs ?? []).filter(
    (c: { message_count: number }) => (c.message_count ?? 0) > 2
  )
  if (!others.length) return null

  // 🔒 خصوصية: الاسم مش مُعرّف فريد. لو فيه أكتر من رقم مختلف بنفس الاسم،
  //    مش قادرين نأكّد مين فيهم الشخص ده — فمانكشفش رقم ولا رسايل حد تاني،
  //    ونتعامل معاه كجديد (المارد هيسأله يأكّد نفسه بشكل طبيعي). الربط بالاسم
  //    بيتعمل بس لما يبقى فيه شخص واحد بالاسم ده (زي حالة عبده الأصلية).
  const distinctPhones = new Set(
    (others as Array<{ contact_phone?: string }>).map((c) =>
      (c.contact_phone || '').replace(/\D/g, ''),
    ),
  )
  distinctPhones.delete('')
  if (distinctPhones.size > 1) return null

  const main = others[0]

  const { data: msgs } = await db
    .from('whatsapp_messages')
    .select('direction, body, created_at')
    .eq('conversation_id', main.id)
    .order('created_at', { ascending: false })
    .limit(8)

  return {
    محادثة_سابقة_بنفس_الاسم: true,
    الرقم_القديم: main.contact_phone,
    عدد_الرسايل: main.message_count,
    اخر_تواصل: String(main.last_message_at ?? '').slice(0, 10),
    اهتمامه: main.first_intent ?? null,
    آخر_ما_دار: (msgs ?? []).reverse().map((m: { direction: string; body: string }) => ({
      من: m.direction === 'inbound' ? 'هو' : 'إحنا',
      نص: (m.body || '').slice(0, 180),
    })),
    ملحوظة:
      'ده على الأرجح نفس الشخص وصل بمُعرّف مخفي. اقرا التاريخ ده كويس ' +
      'وكمّل من حيث انتهيتوا — ماتعاملهوش كأنه أول مرة.',
  }
}

async function whoIsThis(a: { phone: string; name?: string }): Promise<ToolResult> {
  const variants = phoneVariants(a.phone)

  // مُعرّف مخفي؟ نجيب رقمه الحقيقي
  if (looksLikeLidLocal(a.phone)) {
    const lid = (a.phone || '').replace(/\D/g, '')

    // ١) الربط الرسمي من واتساب نفسه — الأدق
    const { data: mapped } = await db
      .from('wa_lid_map')
      .select('phone')
      .eq('lid', lid)
      .maybeSingle()

    if (mapped?.phone) {
      // نكمّل بالرقم الحقيقي — التاريخ كله هيبان
      return { ...(await whoIsThis({ phone: mapped.phone })), عن_طريق: 'ربط واتساب الرسمي' }
    }

    // ٢) الاسم كخطة بديلة — أضعف، بس أحسن من لا شيء.
    //    ⚠️ ممكن يغلط لو حد غيّر اسمه أو اتنين بنفس الاسم.
    const hist = await findHistoryByName(a.name)
    if (hist) {
      return {
        known: true,
        عن_طريق: 'الاسم (ربط ظنّي)',
        تحذير: 'الربط ده بالاسم مش بالرقم — لو الكلام مش متطابق مع التاريخ، اتعامل معاه كجديد',
        ...hist,
      }
    }

    return { known: false, note: 'مُعرّف مخفي ومفيش ربط ولا تاريخ — عامله كجديد' }
  }

  if (!variants.length) return { known: false }

  const { data: profile } = await db
    .from('profiles')
    .select('id, full_name, role, created_at')
    .in('phone', variants)
    .limit(1)
    .maybeSingle()

  if (!profile) {
    // 🏢 (19 Aug 2026) قبل ما نقول "رقم جديد" — يمكن يكون موظف/صاحب بيزنس B2B
    // (ده مالوش profile/auth بالضرورة — business_employees.phone بيتخزّن مباشرة)
    const { data: emp } = await db
      .from('business_employees')
      .select('full_name, role, role_ar, status, supplier_id, suppliers(business_name, industry)')
      .in('phone', variants)
      .order('status', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (emp) {
      const e = emp as unknown as {
        full_name: string; role: string; role_ar: string | null; status: string
        supplier_id: string; suppliers: { business_name: string; industry: string | null } | null
      }
      return {
        known: true,
        is_b2b_employee: true,
        name: e.full_name,
        role: e.role_ar || e.role,
        business_name: e.suppliers?.business_name ?? null,
        supplier_id: e.supplier_id,
        note: 'ده موظف/صاحب بيزنس B2B — مش عميل عادي. لو سأل عن فريقه/مهامه استخدم business_snapshot بالـsupplier_id ده.',
      }
    }
    return {
      known: false,
      guidance:
        'ده رقم جديد. لو عايز يشتري أو يحجز → لينك تسجيل عميل. ' +
        'لو عايز يضيف منتج أو خدمة → لينك تسجيل مورد.',
    }
  }

  // مورد؟ (بنجيب الأعمدة الآمنة بس — مفيش national_id ولا kyc)
  const { data: supplier } = await db
    .from('marketplace_suppliers')
    .select(
      'id, business_name, kyc_status, listings_count, bookings_count, rating, has_erp_crm, account_type, is_partner',
    )
    .eq('profile_id', profile.id)
    .maybeSingle()

  return {
    known: true,
    name: profile.full_name ?? null,
    عميل_منذ: String(profile.created_at ?? '').slice(0, 10),
    is_supplier: !!supplier,
    supplier: supplier
      ? {
          business_name: supplier.business_name,
          حالة_التوثيق: supplier.kyc_status,
          عدد_الاعلانات: supplier.listings_count,
          عدد_الحجوزات: supplier.bookings_count,
          التقييم: supplier.rating,
          عنده_ERP: supplier.has_erp_crm,
          نوع_الحساب: supplier.account_type,
        }
      : null,
  }
}

async function getMyOrders(a: { phone: string }): Promise<ToolResult> {
  const variants = phoneVariants(a.phone)

  const { data: profile } = await db.from('profiles').select('id').in('phone', variants).limit(1).maybeSingle()

  // بنقبل الحجوزات المربوطة بالحساب أو المسجّلة كضيف بنفس الرقم
  let q = db
    .from('marketplace_bookings')
    .select('reference_code, status, start_at, end_at, total_amount, currency, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  q = profile?.id
    ? q.or(`customer_id.eq.${profile.id},guest_phone.in.(${variants.join(',')})`)
    : q.in('guest_phone', variants)

  const { data, error } = await q
  if (error) return { error: 'مش قادر أجيب الحجوزات' }

  const rows = (data ?? []) as Array<Record<string, unknown>>
  if (!rows.length) {
    return { found: 0, note: 'مفيش حجوزات على الرقم ده. ممكن يكون حجز برقم تاني.' }
  }
  return { found: rows.length, bookings: rows }
}

// ── تصنيف ذكي بالمعنى (٨ أغسطس ٢٠٢٦) ──────────────────────────────────────
// بديل الفولباك القديم اللي كان بيدوّر بأول مقطع من الـslug بس ("sale-x" غير
// موجود → "sale" → أول تصنيف بادئته "sale-" أيًا كان معناه). ده كان بيحط
// إعلانات عقارية في "أثاث منزلي" لمجرد إن الاتنين تصنيفهم بيبدأ بـ"sale-".
//
// المنطق دلوقتي: نجيب كل التصنيفات الفعّالة، نطابق كلمات العنوان/الوصف
// بكلمات اسم كل تصنيف (name_ar + slug مفكوك لكلمات)، ونختار الأعلى تطابقًا
// بشرط نقاط > 0. لو مفيش أي تطابق: نعمل تصنيف جديد بدل ما نسيب الإعلان
// في تصنيف عشوائي أو من غير تصنيف خالص — محمد قال صراحةً "لو مفيش كاتيجوري
// ساعتها يبقى يعمل واحد جديد".
const AR_STOPWORDS = new Set([
  'في', 'من', 'على', 'مع', 'عن', 'الى', 'إلى', 'او', 'أو', 'و', 'ب', 'ل', 'ال',
  'دي', 'ده', 'كام', 'جديد', 'جديدة', 'للبيع', 'للايجار', 'للإيجار', 'حصري',
])

function wordsOf(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !AR_STOPWORDS.has(w))
}

async function resolveCategorySlug(
  hintSlug: string | undefined | null,
  contextText: string,
): Promise<string> {
  const hint = hintSlug?.trim()

  const { data: all } = await db
    .from('categories')
    .select('slug, name_ar, group_name_ar')
    .eq('is_active', true)
    .limit(500)
  const categories = (all ?? []) as Array<{ slug: string; name_ar: string; group_name_ar: string | null }>

  // كلمات العنوان/الوصف الحقيقية بس (من غير كلمات الـhint) — أساس مطابقة
  // المحتوى الفعلي. أول 1-2 كلمة في العنوان بتتوزن أعلى لأن إعلاناتنا
  // بتبدأ بنوع النشاط تقريبًا دايمًا ("شقة للبيع..."، "فيلا في..."، "محل
  // تجاري...")، فمطابقة هناك أوثق بكتير من كلمة اتصادف موجودة وسط
  // العنوان (زي اسم مكان).
  const contentWords = wordsOf(contextText)
  const leadWords = new Set(contentWords.slice(0, 2))

  /* ⚖️ (٢٤ أغسطس ٢٦ — سؤال محمد الاختباري: «شقة في مدينتي للبيع تقع فين؟»)
     «شقة» موجودة مرتين في الشجرة: بيع (sale-properties-apartment) وإيجار
     (properties-apartment) — والاتنين بياخدوا نفس نقط المطابقة تقريبًا،
     فالحسم كان بيقع للصدفة. دلوقتي نيّة البيع/الإيجار من نص الإعلان نفسه
     بترجّح الفرع الصح: «للبيع/بيع/تمليك» ← sale-*، «للإيجار/إيجار» ← غيره. */
  const saleIntent = /(للبيع|لبيع|بيع|تمليك|resale)/i.test(contextText)
  const rentIntent = /(للإيجار|للايجار|إيجار|ايجار|أجر|rent)/i.test(contextText)

  function scoreAgainstContent(c: { name_ar: string; group_name_ar: string | null; slug: string }) {
    const catWords = new Set([
      ...wordsOf(c.name_ar),
      ...wordsOf(c.group_name_ar || ''),
      ...wordsOf(c.slug.replace(/-/g, ' ')),
    ])
    let score = 0
    for (const w of contentWords) if (catWords.has(w)) score += leadWords.has(w) ? 5 : 1
    if (score > 0) {
      const isSaleCat = c.slug.startsWith('sale-')
      if (saleIntent && !rentIntent && isSaleCat) score += 3
      if (rentIntent && !saleIntent && !isSaleCat) score += 3
    }
    return { score, size: catWords.size }
  }

  let bestContent: { slug: string; score: number; size: number } | null = null
  for (const c of categories) {
    const { score, size } = scoreAgainstContent(c)
    if (score <= 0) continue
    if (
      !bestContent ||
      score > bestContent.score ||
      (score === bestContent.score && size < bestContent.size) // عند التعادل، الاسم الأدق (أقل كلمات) أولى
    ) {
      bestContent = { slug: c.slug, score, size }
    }
  }

  // ١) لو المارد بعت slug فعلي وموجود بالجدول — نستخدمه، إلا لو فيه
  //    تصنيف تاني بيطابق محتوى العنوان/الوصف نفسه بقوة أوضح. ده بيحصل
  //    لما المارد يتلخبط باسم مكان فيه كلمة تشبه تصنيف (مثلاً "أرض
  //    الجولف" في مصر الجديدة اتفهمت "أرض زراعية" بدل "شقة" — ١٩ أغسطس
  //    ٢٠٢٦، محمد لاحظ إعلانات بتوصل بتصنيف غلط تمامًا رغم إن الـslug
  //    نفسه صحيح وموجود فعليًا بالجدول، فمكانش بيتصلّح قبل كده لأن أي
  //    slug حقيقي كان بيتصدّق على طول من غير ما نقارنه بمحتوى الإعلان).
  if (hint) {
    const exactCat = categories.find((c) => c.slug === hint)
    if (exactCat) {
      const { score: hintScore, size: hintSize } = scoreAgainstContent(exactCat)
      // عند تعادل النقاط، الأدق (أقل كلمات في اسم التصنيف) هو الأولى —
      // مش المارد افتراضيًا. من غيرها تعادل بسيط زي "شقة" (تصنيف اسمه
      // كلمة واحدة) مقابل "غرفة في شقة مشتركة" (تصنيف بعيد بس بيحتوي
      // نفس الكلمة) كان بيسيب المارد يكسب التعادل غلط.
      if (
        !bestContent ||
        bestContent.slug === hint ||
        bestContent.score < hintScore ||
        (bestContent.score === hintScore && hintSize <= bestContent.size)
      ) {
        return hint
      }
      return bestContent.slug
    }
  }

  // ٢) الـhint مش slug حقيقي (أو مفيش hint) — جرّب أفضل تطابق بالمحتوى +
  //    كلمات الـhint نفسه (غالبًا فيها كلمات مفيدة زي "properties" أو
  //    "furniture" حتى لو مش slug حقيقي حرفيًا).
  if (hint) {
    const target = new Set([...contentWords, ...wordsOf(hint.replace(/-/g, ' '))])
    let best: { slug: string; score: number } | null = null
    for (const c of categories) {
      const catWords = new Set([
        ...wordsOf(c.name_ar),
        ...wordsOf(c.group_name_ar || ''),
        ...wordsOf(c.slug.replace(/-/g, ' ')),
      ])
      let score = 0
      for (const w of target) if (catWords.has(w)) score += 1
      if (score > 0 && (!best || score > best.score)) best = { slug: c.slug, score }
    }
    if (best) return best.slug
  } else if (bestContent) {
    return bestContent.slug
  }

  // ٣) مفيش أي تطابق — بدل ما نسيب الإعلان بلا تصنيف أو نحطه في تصنيف
  //    عشوائي غلط: نعمل تصنيف جديد باسم مشتق من العنوان نفسه. بيتحط
  //    is_active=true عشان يظهر فورًا، وdisplay_order كبير عشان يفضل
  //    آخر القايمة لحد ما حد يراجعه ويرتبه صح.
  const label = (hint ? hint.replace(/-/g, ' ') : contextText).trim().slice(0, 40) || 'تصنيف جديد'
  const newSlug =
    'auto-' +
    (label.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-').slice(0, 40) || 'misc') +
    '-' + Math.random().toString(36).slice(2, 6)

  const { data: created, error: ce } = await db
    .from('categories')
    .insert({
      slug: newSlug,
      name_ar: label,
      is_active: true,
      display_order: 9999,
    } as never)
    .select('slug')
    .maybeSingle()

  // لو الإنشاء فشل لأي سبب (مثلًا تعارض نادر في الـslug) نرجّع null بدل
  // ما نوقف تسجيل الإعلان بالكامل — publish-drafts هيسيبه needs_review.
  return (created as { slug?: string } | null)?.slug ?? (ce ? '' : newSlug)
}

async function createListingDraft(a: {
  phone: string
  name?: string
  title: string
  description?: string
  category_slug?: string
  price_egp?: number
  period?: string
  is_furnished?: boolean
  image_urls?: string[]
}): Promise<ToolResult> {
  if (!a.title?.trim()) return { ok: false, error: 'الاسم مطلوب' }

  // ⚠️ المارد بيخترع تصنيفات مش موجودة بدل ما ينادي list_categories.
  //    يوم ٢٠ يوليو حط category_slug='restaurants' وهو مش في الجدول،
  //    فالمسودة وقفت عند «no category» ومحدش عرف.
  //    بنتحقق فعليًا بدل ما نستنى إنه يفتكر.
  //
  // ⚠️⚠️ (٨ أغسطس ٢٠٢٦) الفولباك القديم كان بيدوّر بالبادئة الأولى بس
  //    (slug.split('-')[0] + ilike prefix%) — ده كان بيوقع في تصنيف غلط
  //    تمامًا لو أول مقطع اتصادف موجود في تصنيف تاني خالص، بلا أي علاقة
  //    بالمعنى: "sale-real-estate" مش موجود → البادئة "sale" → أول تصنيف
  //    بادئته "sale-" (بترتيب display_order) طلع "sale-furniture-home"،
  //    فمشروع عقاري كامل (Dejoya) اتنشر كإعلان "أثاث منزلي". محمد لاحظها
  //    ووصفها: "مش فاهم ايه موضوع المنتجات الي بتضاف في اثاث منزلي دي".
  //
  //    الحل: مطابقة بالمعنى مش بالبادئة — نقارن كلمات العنوان/الوصف
  //    بأسماء وslugs كل التصنيفات الفعّالة ونختار الأعلى تطابقًا. لو
  //    مفيش تطابق معقول (نقاط = صفر) نعمل تصنيف جديد بدل ما نسيب
  //    الإعلان يقع في تصنيف عشوائي أو يفضل من غير تصنيف خالص.
  let slug = await resolveCategorySlug(a.category_slug, `${a.title} ${a.description || ''}`)

  // 📸 صور العميل — بتتخزّن في المسودة عشان الكرون يقدر ينشرها.
  //    من غير الصور المسودة بتفضل عالقة (الماركتبليس بيرفض إعلان بلا صورة).
  //    كانت الأداة مابتاخدش الصورة أصلًا، فكل مسودات المارد كانت بلا صور وعالقة.
  const images = Array.isArray(a.image_urls)
    ? a.image_urls.filter((u) => typeof u === 'string' && /^https?:\/\//.test(u)).slice(0, 8)
    : []

  const { data, error } = await db
    .from('instant_listing_drafts')
    .insert({
      contact_phone: a.phone,
      contact_name: a.name ?? null,
      title: a.title.slice(0, 120),
      description: a.description?.slice(0, 1500) ?? null,
      category_slug: slug,
      price_egp: typeof a.price_egp === 'number' ? a.price_egp : null,
      period: a.period ?? null,
      is_furnished: typeof a.is_furnished === 'boolean' ? a.is_furnished : null,
      image_urls: images,
      source_text: 'المارد — واتساب',
      // 'new' = الحالة اللي كرون publish-drafts بيلقطها وينشرها. كانت 'pending'
      // (مش بيلقطها) فالإعلانات كانت بتعلق وماتوصلش الماركتبليس أبدًا.
      status: 'new',
    })
    .select('id')
    .maybeSingle()

  if (error) return { ok: false, error: 'مش قادر أحفظ المسودة', detail: error.message }

  // 🔔 العميل لازم يعرف الناقص في نفس اللحظة عشان يكمّله — مش بعدين.
  const missing: string[] = []
  if (!images.length) missing.push('صورة واحدة على الأقل')
  if (typeof a.price_egp !== 'number') missing.push('السعر')
  if (!slug) missing.push('نوع النشاط/التصنيف')

  return {
    ok: true,
    draft_id: data?.id,
    has_image: images.length > 0,
    ...(missing.length ? { الناقص: missing } : {}),
    قول_للعميل: images.length
      ? 'تمام سجّلت إعلانك، وهينزل على مضمونة خلال دقايق ✅' +
        (missing.length ? ` — بس كمّلّي ${missing.join(' و')} عشان يظهر كامل.` : '')
      : `سجّلت إعلانك ✅ بس عشان ينزل على مضمونة محتاج ${missing.join(' و')}. ` +
        'ابعتلي صورة للمنتج/الخدمة وأنا أنشره على طول 📸',
  }
}

/**
 * إضافة أصناف منيو مطعم — restaurant_menu_items.
 *
 * ١٩ أغسطس ٢٠٢٦: محمد لاحظ إن مطاعم بعتت المنيو كامل بالواتساب، والمارد
 * كان بيسجّلها كنص خام جوه وصف الإعلان (description) بدل ما يفرّغها في
 * جدول المنيو الحقيقي — فالمنيو كان بيفضل فاضي على الموقع رغم إن العميل
 * بعت كل التفاصيل. السبب: مفيش أداة كانت أصلًا بتسمح للمارد يضيف أصناف
 * منيو — create_listing_draft بس بتاخد وصف عام، مش أصناف مُقسّمة بسعر.
 * الأداة دي بتقفل الفجوة: تاخد الأصناف (اسم + سعر + تصنيف) وتحفظهم في
 * الجدول الصح عشان يظهروا في صفحة المطعم كمنيو حقيقي قابل للطلب.
 */
async function addMenuItems(a: {
  listing_id: string
  items: Array<{ name_ar: string; price: number; category?: string; description_ar?: string }>
}): Promise<ToolResult> {
  const listingId = (a.listing_id || '').trim()
  if (!listingId) return { ok: false, error: 'محتاج listing_id بتاع المطعم' }
  const items = Array.isArray(a.items) ? a.items : []
  if (!items.length) return { ok: false, error: 'مفيش أصناف للإضافة' }

  const { data: listing } = await db
    .from('listings')
    .select('id, title')
    .eq('id', listingId)
    .maybeSingle()
  if (!listing) return { ok: false, error: 'مفيش إعلان بالـ id ده' }

  const { data: existing } = await db
    .from('restaurant_menu_items')
    .select('display_order')
    .eq('listing_id', listingId)
    .order('display_order', { ascending: false })
    .limit(1)
  let nextOrder = ((existing?.[0] as { display_order?: number } | undefined)?.display_order ?? 0) + 1

  const rows = items
    .filter((it) => it && typeof it.name_ar === 'string' && it.name_ar.trim() && typeof it.price === 'number')
    .map((it) => ({
      listing_id: listingId,
      name_ar: it.name_ar.trim().slice(0, 200),
      description_ar: it.description_ar?.trim().slice(0, 500) || null,
      price: it.price,
      currency: 'EGP',
      category: it.category?.trim().slice(0, 100) || null,
      is_available: true,
      display_order: nextOrder++,
    }))

  if (!rows.length) return { ok: false, error: 'كل الأصناف ناقصها اسم أو سعر صحيح' }

  const { data, error } = await db.from('restaurant_menu_items').insert(rows).select('id')
  if (error) return { ok: false, error: 'مش قادر أحفظ المنيو', detail: error.message }

  return {
    ok: true,
    added_count: data?.length ?? rows.length,
    قول_للعميل: `تمام، ضفت ${data?.length ?? rows.length} صنف على منيو "${listing.title}" ✅`,
  }
}

/**
 * تسجيل مشروع عقاري في بورصة مضمونة.
 *
 * الضوابط دي مش نظرية — كل واحد فيها من غلطة كانت هتحصل يوم ٢٠ يوليو
 * لما استخرجنا ٢٠ مشروع من رسايل الواتساب:
 *
 * ١) SOLDOUT — الرسالة الأصلية كان مكتوب فيها SOLDOUT جنب ٦ مشاريع.
 *    لو اتنشروا كان العملاء هيسألوا على وحدات مباعة. الضرر حقيقي.
 * ٢) التكرار — «Blitz» و«Blitz Mall» نفس المشروع. و«Ritz» طلع
 *    «RITZ New Zayed» الموجود أصلاً.
 * ٣) التشابه مش دليل — «Capital Square» و«Capital Prime» طلعوا ٧٢٪
 *    متشابهين وهما مشروعين مختلفين. المقارنة بتنبّه، مابتقررش.
 * ٤) الماركتبليس بيرفض إعلان من غير صورة — قانون سليم، فبنكتفي
 *    بالبورصة لحد ما تبقى معانا صور.
 */
async function createProject(a: {
  title: string
  segment?: string
  developer?: string
  area_label?: string
  property_type?: string
  unit_label?: string
  price_from?: number
  note?: string
  image_urls?: string[]
  video_url?: string
  sender_phone: string
}): Promise<ToolResult> {
  const title = (a.title || '').trim()
  if (title.length < 3) return { ok: false, error: 'اسم المشروع/الوحدة مش واضح — ماتسجّلش' }
  const segment = a.segment === 'resale' ? 'resale' : 'developer'
  const images = (a.image_urls || []).filter((u) => typeof u === 'string' && u.trim().length > 0)

  // ── فحص هوية المُرسل قبل النشر المباشر ──────────────────────────────
  // ١٩ أغسطس ٢٠٢٦: محمد لاحظ معرض عربيات ظاهر في قسم العقارات. السبب:
  // الأداة دي كانت بتنشر أي كلام يوصفه المارد إنه "عقار" فورًا (status:
  // 'published') من غير أي تحقق من هوية المرسل — حتى لو رقمه مسجل عندنا
  // كمورد في نشاط تاني خالص (زي معرض سيارات). أي واحد يبعت واتساب فيه
  // وصف شبه عقار كان بينشر على طول في بورصة عقارات مضمونة الحقيقية.
  //
  // الحل الجذري: لو رقم المرسل مسجّل عندنا كمورد بنشاط واضح مش عقاري
  // (زي معرض سيارات) نرفض تسجيله كعقار خالص ونوجّهه لأداة الإعلانات
  // العادية. غير كده (رقم مش مسجل / تاجر عقارات / رقم مسجل فعلاً كنشاط
  // عقاري) بيتسجل بس *مش منشور فورًا* — بيتحفظ status='draft' لحد ما
  // يراجعه حد من الأدمن، تمامًا زي فولباك /add-project لغير الموثقين.
  // الاستثناء الوحيد للنشر الفوري: رقم مسجل عندنا فعلاً كمورد نشاطه عقاري.
  const senderPhoneDigits = (a.sender_phone || '').replace(/\D/g, '').slice(-10)
  let publishImmediately = false
  if (senderPhoneDigits) {
    const { data: matchedSuppliers } = await db
      .from('suppliers')
      .select('business_name, industry, business_type, contact_phone')
      .not('contact_phone', 'is', null)

    const NON_REAL_ESTATE_INDUSTRIES = new Set([
      'car_showroom', 'car_dealer', 'vehicles', 'auto', 'restaurant', 'salon',
      'clinic', 'retail', 'ecommerce', 'services',
    ])
    const REAL_ESTATE_INDUSTRIES = new Set(['real_estate', 'real_estate_developer', 'real_estate_broker', 'property'])

    const match = (matchedSuppliers ?? []).find((s: { contact_phone?: string | null }) => {
      const digits = (s.contact_phone || '').replace(/\D/g, '').slice(-10)
      return digits && digits === senderPhoneDigits
    }) as { business_name?: string; industry?: string | null; business_type?: string | null } | undefined

    if (match) {
      const industry = (match.industry || '').toLowerCase()
      if (NON_REAL_ESTATE_INDUSTRIES.has(industry)) {
        return {
          ok: false,
          error: `الرقم ده مسجّل عندنا كمورد نشاطه "${match.industry}" (${match.business_name || ''}) — مش عقارات. ماينفعش يتسجّل في بورصة العقارات.`,
          قول_للعميل: 'العرض ده مش عقاري — لو عندك حاجة تانية غير عقار (سيارة/منتج/خدمة) استخدم إعلان عادي بدل بورصة العقارات.',
        }
      }
      if (REAL_ESTATE_INDUSTRIES.has(industry)) publishImmediately = true
    }
  }
  const status = publishImmediately ? 'published' : 'draft'

  // ── فحص التكرار ────────────────────────────────────────────────────
  const norm = (s: string) =>
    s.toLowerCase().replace(/\b(mall|tower|complex|center|centre|new|the)\b/g, '').replace(/[^a-z0-9؀-ۿ]/g, '')

  const { data: all } = await db.from('property_market_items').select('id, title')
  const target = norm(title)

  const exact = (all ?? []).find((r: { title: string }) => norm(r.title || '') === target)
  if (exact) {
    return { ok: false, duplicate: true, existing: exact.title, قول_للعميل: 'المشروع ده موجود عندنا بالفعل 👍' }
  }

  // متشابه بس مش مطابق — نسجّل ونشاور، مانرفضش
  const similar = (all ?? [])
    .map((r: { title: string }) => r.title)
    .filter((t: string) => {
      const n = norm(t || '')
      return n.length > 3 && (n.includes(target) || target.includes(n))
    })
    .slice(0, 3)

  const { data, error } = await db
    .from('property_market_items')
    .insert({
      title,
      slug: title.toLowerCase().replace(/[^\w؀-ۿ\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 50) +
        '-' + Math.random().toString(36).slice(2, 6),
      developer: a.developer ?? null,
      area: 'other',
      area_label: a.area_label ?? null,
      city: a.area_label ?? null,
      segment,
      property_type: a.property_type ?? null,
      unit_label: a.unit_label ?? null,
      price_from: typeof a.price_from === 'number' ? a.price_from : null,
      price_unit: 'egp_total',
      note: a.note ?? null,
      cover_url: images[0] ?? null,
      media: images.length ? images : null,
      video_url: a.video_url ?? null,
      // بنحفظ رقم اللي بعت عشان نرجعله ونعرف مصدر المشروع.
      // ⚠️ العمود ده ممنوع على الزوار (migrations/20260720_hide_supplier_phones.sql)
      // — أرقام الموردين ماتظهرش على الماركتبليس ولا البورصة أبدًا.
      source_lead_phone: a.sender_phone,
      source_name: 'المارد — واتساب',
      // منشور على طول بس لو الرقم موثّق فعلاً كنشاط عقاري (publishImmediately
      // فوق). غير كده بيتحفظ draft لحد ما يراجعه حد — ١٩ أغسطس ٢٠٢٦: ده
      // بعد ما مورد نشاطه مش عقاري ظهر في بورصة العقارات من غير أي تحقق.
      status,
      is_active: publishImmediately,
    })
    .select('id, slug')
    .maybeSingle()

  if (error) return { ok: false, error: 'مش قادر أسجّل المشروع/الوحدة', detail: error.message }

  return {
    ok: true,
    project_id: data?.id,
    url: `${SITE}/real-estate/projects/${data?.slug}`,
    ...(similar.length ? { مشاريع_شبهه_موجودة: similar } : {}),
    قول_للعميل: publishImmediately
      ? `اتسجّل ونُشر في بورصة مضمونة العقارية ✅\n${SITE}/real-estate/projects/${data?.slug}`
      : 'اتسجّل عندنا ✅ وهيظهر في بورصة مضمونة العقارية بعد ما فريقنا يراجعه بسرعة.',
    ملحوظة_داخلية: publishImmediately
      ? 'الماركتبليس محتاج صورة واحدة على الأقل — لو العميل بعت صور، قوله يبعتها عشان نعرضه هناك كمان'
      : 'محفوظ draft لحد المراجعة — رقم المرسل مش موثّق كنشاط عقاري عندنا، محتاج مراجعة يدوية قبل ما ينشر.',
  }
}

/**
 * إنشاء جروب متابعة لمورد.
 *
 * القاعدة الأهم هنا: **أول رسالة في الجروب بتشرح إحنا مين وليه ضفناه.**
 * إضافة رقم لجروب من غير سياق بتتقري كسبام، والناس بتبلّغ،
 * وواتساب بيوقف الرقم. الشرح مش تحسين شكلي — ده اللي بيفرّق
 * بين شراكة وإزعاج.
 */
async function createSupplierGroup(a: {
  supplier_phone: string
  supplier_name: string
  supplier_id?: string
  listing_title?: string
}): Promise<ToolResult> {
  // 🚚 (١٢ أغسطس ٢٠٢٦ — المراجعة الشاملة) إنشاء الجروبات كان بيروح
  // لـ/group-create على جسر Baileys القديم — جلساته كلها مقطوعة، يعني
  // الأداة كانت بتوعد وتفشل (أو تسجّل جروب مش موجود). خدمة OpenWA الحالية
  // مالهاش API لإنشاء جروبات، فبنرجّع رسالة صريحة بدل وعد كاذب —
  // لحد ما تتضاف إمكانية الجروبات في openwa server ونرجّع الأداة.
  return {
    ok: false,
    error:
      'إنشاء جروبات الواتساب متوقف مؤقتًا (الخدمة الحالية ماتدعمهوش). ' +
      'قول للمورد إن التواصل هيكمل في الشات المباشر، وقول لمحمد لو المورد محتاج جروب.',
  }

  /* eslint-disable no-unreachable */
  // ⬇️ الكود الأصلي محفوظ لحد ما الجروبات ترجع في OpenWA
  const url = process.env.WA_SERVICE_URL
  const secret = process.env.WA_SERVICE_SECRET
  if (!url || !secret) return { ok: false, error: 'خدمة الواتساب مش متظبطة' }

  // فريق مضمونة — بيتضافوا في كل جروب
  const TEAM = ['201004194133', '201104496225']

  const subject = `مضمونة × ${a.supplier_name}`.slice(0, 60)

  const intro =
    `أهلاً ${a.supplier_name} 👋\n\n` +
    `أنا *المارد* — مساعد مضمونة الذكي.\n\n` +
    `عملنا الجروب ده عشان متابعة شغلك معانا في مكان واحد:\n` +
    (a.listing_title ? `• إعلانك «${a.listing_title}» على مضمونة\n` : '') +
    `• أي طلب أو استفسار يجيلنا ويخصّك، هبعتهولك هنا على طول\n` +
    `• أي تحديث على أسعارك أو التوفّر، قوله هنا وهنظبطه\n\n` +
    `كده مفيش طلب هيضيع ومفيش حاجة هتتأخر عليك.\n\n` +
    `ولو عندكم أي بيانات أو مشاريع خاصة بيكم، ابعتوها هنا وإحنا هنضيفها فورًا. ` +
    `ولو محتاجين تسألوا عن أي مشروع أو عندكم أي طلب بشكل عام — أنا في الخدمة 🤝\n\n` +
    `إنت أدمن في الجروب، فتقدر تضيف أي حد من فريقك.\n\n` +
    `لو مش عايز الجروب ده، قولّي وهشيلك فورًا — مفيش مشكلة خالص.\n\n` +
    `${MADMONA_LINKS.لوحة_المورد}`

  try {
    // الكود ده تحت `return` مبكر (الجروبات متوقفة)، فتحليل التدفق في TS
    // مش بيوصل لحراسة `if (!url)` فوق ولا بيضيّق النوع — التأكيد هنا
    // بيوضّح النية من غير ما يغيّر أي سلوك وقت التشغيل.
    const res = await fetch(`${(url as string).replace(/\/$/, '')}/group-create`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-madmona-secret': secret as string },
      body: JSON.stringify({
        subject,
        participants: [a.supplier_phone, ...TEAM],
        intro,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!data?.ok) return { ok: false, error: data?.error || `HTTP ${res.status}` }

    // نسجّل الجروب — عشان نعرف نحوّل عليه بعدين
    if (a.supplier_id) {
      await db.from('supplier_wa_groups').insert({
        supplier_id: a.supplier_id,
        group_jid: data.group_jid,
        subject,
        purpose: 'followup',
        participants: [a.supplier_phone, ...TEAM],
        intro_message: intro,
        created_by: 'المارد',
      })
    }

    return {
      ok: true,
      group_jid: data.group_jid,
      subject,
      قول_للمورد: 'عملتلك جروب متابعة مع فريق مضمونة — هتلاقيه في الواتساب 👌',
    }
  } catch (e) {
    // الكتلة دي كلها بعد `return` مبكر (الجروبات متوقفة)، فتحليل التدفق
    // في TS متعطّل هنا ومش بيضيّق `e` عبر `instanceof`. التأكيد بيوضّح
    // النية من غير أي تغيير في السلوك.
    const err = e as Error
    return { ok: false, error: err?.message || 'فشل إنشاء الجروب' }
  }
}

/** تحويل طلب عميل لجروب المورد المسؤول */
async function forwardToSupplierGroup(a: {
  supplier_id: string
  customer_request: string
  customer_name?: string
}): Promise<ToolResult> {
  const { data: group } = await db
    .from('supplier_wa_groups')
    .select('group_jid, subject')
    .eq('supplier_id', a.supplier_id)
    .eq('is_active', true)
    .maybeSingle()

  if (!group?.group_jid) {
    return { ok: false, error: 'المورد ده مالوش جروب متابعة لسه' }
  }

  // ⚠️ ماننقلش رقم العميل للمورد. مضمونة هي الوسيط —
  // ده اللي بيحمي الطرفين وبيحافظ على دور المنصة.
  const text =
    `🔔 *طلب جديد من مضمونة*\n\n` +
    `${a.customer_request}\n\n` +
    (a.customer_name ? `العميل: ${a.customer_name}\n` : '') +
    `\nردّوا هنا وأنا هوصّل الرد للعميل.`

  try {
    // 🚚 (١٢ أغسطس ٢٠٢٦ — المراجعة الشاملة) كان بيبعت للجسر الميت
    // (WA_SERVICE_URL) وبياخد رد شكلي، فالمارد يقول للعميل «بعتّ طلبك
    // للمورد» ومفيش حاجة اتبعتت فعليًا. دلوقتي بيمر بـsendText → OpenWA
    // على jid الجروب نفسه، والنجاح بيتفحص بجد.
    const { sendText } = await import('./whatsapp')
    const session = process.env.OWNER_PHONE || '201002229982'
    // `to` مطلوب في SendTextParams، لكن جروبات الواتساب ملهاش رقم — الـJID
    // هو المُعرّف الوحيد. `sendText` بيقدّم `jid` على `to` أصلًا، فبنمرر
    // الـJID في الاتنين عشان النوع يبقى صح والسلوك ما يتغيّرش.
    const res = await sendText({ to: group.group_jid, jid: group.group_jid, session, body: text })
    return res.ok
      ? { ok: true, sent_to: group.subject, قول_للعميل: 'بعتّ طلبك للمورد وهرجعلك برده 👌' }
      : { ok: false, error: res.error || 'فشل الإرسال للجروب' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'فشل التحويل' }
  }
}

/**
 * بحث البورصة العقارية.
 *
 * ده اللي بيخلّي المارد يقارن بدل ما يستلم وخلاص:
 *   «Vici Mall بـ ٥ مليون. عندنا في نفس المنطقة Nabd بـ ٦.٧ وGlitz بـ ٣.١»
 *
 * ⚠️ ممنوع يقارن بمشروع مش راجع من هنا — ده اختراع.
 */
async function searchProjects(a: {
  query?: string
  area?: string
  developer?: string
  property_type?: string
  max_price?: number
}): Promise<ToolResult> {
  try {
    let q = db
      .from('property_market_items')
      .select('title, slug, developer, area_label, property_type, unit_label, price_from, note')
      .eq('status', 'published')
      .eq('is_active', true)
      .limit(8)

    if (a.query?.trim()) q = q.ilike('title', `%${a.query.trim()}%`)
    if (a.area?.trim()) q = q.ilike('area_label', `%${a.area.trim()}%`)
    if (a.developer?.trim()) q = q.ilike('developer', `%${a.developer.trim()}%`)
    if (a.property_type) q = q.eq('property_type', a.property_type)
    if (typeof a.max_price === 'number') q = q.lte('price_from', a.max_price)

    const { data, error } = await q.order('price_from', { ascending: true, nullsFirst: false })
    if (error) return { error: 'البحث فشل' }

    const rows = (data ?? []) as Array<Record<string, unknown>>
    if (!rows.length) return { found: 0, note: 'مفيش مشاريع مطابقة — ماتخترعش، قول كده' }

    return {
      found: rows.length,
      المشاريع: rows.map((r) => ({
        الاسم: r.title,
        المطور: r.developer ?? null,
        المنطقة: r.area_label ?? null,
        النوع: r.property_type ?? null,
        الوحدات: r.unit_label ?? null,
        من_سعر: r.price_from ?? null,
        اللينك: `${SITE}/real-estate/projects/${r.slug}`,
      })),
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'فشل' }
  }
}

/** كود الإحالة — «شير واكسب» */
async function getReferralCode(a: { phone: string; name?: string }): Promise<ToolResult> {
  const phone = (a.phone || '').replace(/\D/g, '')
  if (!phone) return { ok: false, error: 'الرقم مطلوب' }

  // «شير واكسب» مخفي عن العملاء حاليًا — البوابة الوحيدة referral_config.is_enabled.
  // لو رجع مفعّل تاني، الأداة تشتغل زي الأول من غير أي تغيير. لو الفحص فشل، نعتبره موقوف احتياطيًا.
  try {
    const { data: cfg } = await db
      .from('referral_config')
      .select('is_enabled')
      .eq('id', 'current')
      .maybeSingle()
    if (!cfg || cfg.is_enabled !== true) {
      return { ok: true, قول_للعميل: 'برنامج «شير واكسب» موقوف مؤقتًا دلوقتي. تابعنا وهنعلن أول ما يرجع 🙏' }
    }
  } catch {
    return { ok: true, قول_للعميل: 'برنامج «شير واكسب» موقوف مؤقتًا دلوقتي.' }
  }

  try {
    const { data, error } = await db.rpc('get_or_create_referral_code', { p_phone: phone })
    if (error || !data) return { ok: false, error: error?.message || 'مش قادر أجيب الكود' }

    const code = typeof data === 'string' ? data : (data as { code?: string })?.code
    if (!code) return { ok: false, error: 'مفيش كود' }

    return {
      ok: true,
      الكود: code,
      اللينك: `${SITE}/join/${code}`,
      قول_للعميل:
        `كودك: *${code}*\n\n` +
        `ابعت اللينك ده لصحابك:\n${SITE}/join/${code}\n\n` +
        `كل حد يسجّل ويشتري من اللينك ده، ليك رصيد عندنا 🤝`,
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'فشل' }
  }
}

/** طلبات التوظيف */
async function recordJobApplication(a: {
  phone: string
  full_name?: string
  position?: string
  message?: string
  cv_url?: string
}): Promise<ToolResult> {
  try {
    const { error } = await db.from('job_applications').insert({
      phone: a.phone,
      full_name: a.full_name ?? null,
      position: a.position ?? null,
      message: a.message?.slice(0, 1000) ?? null,
      cv_url: a.cv_url ?? null,
      source: 'المارد — واتساب',
      status: 'new',
    })
    if (error) return { ok: false, error: error.message }

    notifyOwner(
      `💼 *طلب توظيف*\n\n` +
        `${a.full_name || a.phone}\n` +
        (a.position ? `الوظيفة: ${a.position}\n` : '') +
        (a.cv_url ? `السيرة: ${a.cv_url}\n` : '')
    )

    return {
      ok: true,
      قول_للعميل: 'سجّلت طلبك ✅ فريق الموارد البشرية هيراجعه ويتواصل معاك لو فيه فرصة مناسبة.',
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'فشل' }
  }
}

/**
 * أوردرات المطاعم والمنتجات.
 *
 * ⚠️ ده فلو فلوس. الضوابط هنا مش تحسينات — لو اتكسرت، حد ممكن
 * يقبل أو يلغي أوردر مش بتاعه.
 *
 * القاعدة: **الأداة بتتحقق من الصلاحية بنفسها.** ماتعتمدش على
 * إن المارد يفتكر يسأل — الموديل ممكن يتلغبط، والداتابيز لأ.
 */
async function manageOrder(a: {
  action: 'check' | 'accept' | 'reject' | 'cancel'
  reference_code: string
  actor_phone: string
  reason?: string
}): Promise<ToolResult> {
  const ref = (a.reference_code || '').trim().toUpperCase()
  const actor = (a.actor_phone || '').replace(/\D/g, '')
  if (!ref || !actor) return { ok: false, error: 'كود الأوردر والرقم مطلوبين' }

  try {
    const { data: order } = await db
      .from('marketplace_orders')
      .select(
        'id, reference_code, status, supplier_id, guest_phone, guest_name, ' +
          'total_amount, currency, delivery_address, customer_notes, created_at'
      )
      .eq('reference_code', ref)
      .maybeSingle()

    if (!order) return { ok: false, error: `مالقتش أوردر بالكود ${ref}` }

    // ── مين ده؟ المورد ولا العميل؟ ────────────────────────────────────
    const variants = phoneVariants(actor)

    // بنجيب كل بروفايلات الرقم (ممكن يكون ليه أكتر من صف بصيغ مختلفة).
    // .maybeSingle() كان بيرمي خطأ لو رجّع أكتر من صف → صاحب الأوردر يتعامل
    // كأنه غريب ويتقفل قبول/رفض الأوردر (تدفّق فلوس). بنفحص كل بروفايلاته.
    const { data: profs } = await db.from('profiles').select('id').in('phone', variants).limit(10)
    const profIds = ((profs ?? []) as Array<{ id: string }>).map((p) => p.id)
    const { data: sups } = profIds.length
      ? await db
          .from('marketplace_suppliers')
          .select('id, business_name')
          .in('profile_id', profIds)
          .limit(10)
      : { data: null }
    const sup =
      ((sups ?? []) as Array<{ id: string; business_name?: string }>).find(
        (s) => s.id === order.supplier_id,
      ) ?? null

    const isSupplier = !!sup
    const isCustomer = variants.some((v) => (order.guest_phone || '').includes(v.replace(/\D/g, '')))

    if (!isSupplier && !isCustomer) {
      return {
        ok: false,
        error: 'الرقم ده مالوش علاقة بالأوردر ده',
        قول_للعميل: 'الأوردر ده مش مربوط بالرقم بتاعك — اتأكد من الكود.',
      }
    }

    // ⚠️ الأعمدة هنا name_snapshot و line_total — مش title و total_price.
    // قريتها من information_schema، مااتخمّنتش.
    const items = await db
      .from('marketplace_order_items')
      .select('name_snapshot, quantity, unit_price, line_total')
      .eq('order_id', order.id)

    const summary = {
      الكود: order.reference_code,
      الحالة: order.status,
      الاجمالي: `${order.total_amount} ${order.currency || 'EGP'}`,
      العنوان: order.delivery_address ?? null,
      ملاحظات: order.customer_notes ?? null,
      الاصناف: (items.data ?? []).map(
        (i: { name_snapshot: string; quantity: number; line_total: number }) =>
          `${i.name_snapshot} ×${i.quantity} = ${i.line_total}`
      ),
    }

    if (a.action === 'check') {
      return { ok: true, انت: isSupplier ? 'المورد' : 'العميل', الاوردر: summary }
    }

    // ── الحالات اللي مايصحّش نغيّرها ──────────────────────────────────
    // ⚠️ mp_order_status مافيهوش 'rejected' — قريت الـenum من الداتابيز.
    // الرفض بيتسجّل cancelled مع cancelled_by='supplier'.
    // لو كنت خمّنت، كل رفض كان هيرمي خطأ.
    const FINAL = ['cancelled', 'completed', 'delivered', 'refunded']
    if (FINAL.includes(order.status)) {
      return { ok: false, error: `الأوردر حالته ${order.status} — مايتغيّرش` }
    }

    if (a.action === 'accept') {
      if (!isSupplier) return { ok: false, error: 'القبول للمورد صاحب الأوردر بس' }
      await db
        .from('marketplace_orders')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', order.id)
      return {
        ok: true,
        قول_للمورد: `اتقبل ✅ أوردر ${ref} — ابدأ التحضير.`,
        بلّغ_العميل: `أوردرك ${ref} اتقبل من المطعم ✅ وهنبلّغك أول ما يبقى جاهز.`,
      }
    }

    if (a.action === 'reject' || a.action === 'cancel') {
      if (a.action === 'reject' && !isSupplier)
        return { ok: false, error: 'الرفض للمورد صاحب الأوردر بس' }
      if (a.action === 'cancel' && !isCustomer && !isSupplier)
        return { ok: false, error: 'الإلغاء لصاحب الأوردر بس' }

      const reason = (a.reason || '').trim()
      if (reason.length < 3) {
        return { ok: false, error: 'السبب مطلوب', قول_للعميل: 'ممكن تقولّي السبب؟' }
      }

      await db
        .from('marketplace_orders')
        .update({
          status: 'cancelled', // الـenum مافيهوش rejected — الفرق في cancelled_by
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason.slice(0, 300),
          cancelled_by: isSupplier ? 'supplier' : 'customer',
        })
        .eq('id', order.id)

      notifyOwner(
        `${a.action === 'reject' ? '❌ أوردر مرفوض' : '🚫 أوردر ملغي'}\n\n` +
          `${ref} · ${order.total_amount} ${order.currency || 'EGP'}\n` +
          `السبب: ${reason.slice(0, 150)}\n` +
          `من: ${isSupplier ? sup?.business_name || 'المورد' : order.guest_name || 'العميل'}`
      )

      return {
        ok: true,
        قول_للطرف: a.action === 'reject' ? `اتسجّل الرفض ✅` : `اتلغى الأوردر ✅`,
        بلّغ_الطرف_التاني:
          a.action === 'reject'
            ? `للأسف المطعم مقدرش ينفّذ أوردر ${ref}. السبب: ${reason.slice(0, 120)}`
            : `العميل لغى أوردر ${ref}. السبب: ${reason.slice(0, 120)}`,
      }
    }

    return { ok: false, error: 'إجراء مش معروف' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'فشل' }
  }
}

/**
 * المواعيد — القديم كان بيعملها والجديد ضاعت.
 * من غيرها المارد **بيخترع مواعيد** ويوعد الناس بحاجات مش مسجّلة.
 */
async function manageMeeting(a: {
  action: 'book' | 'cancel' | 'check'
  phone: string
  at?: string
  kind?: string
  name?: string
  location?: string
  notes?: string
}): Promise<ToolResult> {
  const phone = a.phone?.replace(/\D/g, '')
  if (!phone) return { ok: false, error: 'الرقم مطلوب' }

  try {
    if (a.action === 'check') {
      const { data } = await db.rpc('my_meeting', { p_phone: phone })
      return data
        ? { ok: true, الميعاد: data }
        : { ok: true, found: false, قول_للعميل: 'مالقتش ليك ميعاد محجوز — تحب نحجزلك؟' }
    }

    if (a.action === 'cancel') {
      await db.rpc('cancel_meeting', { p_phone: phone })
      return { ok: true, قول_للعميل: 'اتلغى الميعاد ✅ لو حبيت تحجز تاني قولّي.' }
    }

    // حجز
    if (!a.at) return { ok: false, error: 'الميعاد مطلوب — اسأل العميل عن اليوم والساعة' }

    const when = new Date(a.at)
    if (Number.isNaN(when.getTime())) return { ok: false, error: 'صيغة الميعاد غلط' }
    if (when.getTime() < Date.now()) return { ok: false, error: 'الميعاد في الماضي — اسأله عن ميعاد جاي' }

    const { data, error } = await db.rpc('book_meeting', {
      p_phone: phone,
      p_at: when.toISOString(),
      p_kind: a.kind || 'visit',
      p_name: a.name ?? null,
      p_location: a.location ?? null,
      p_notes: a.notes ?? null,
    })

    if (error) return { ok: false, error: error.message }
    return {
      ok: true,
      الميعاد: data,
      قول_للعميل: `اتحجز ✅ ${when.toLocaleString('ar-EG', { timeZone: 'Africa/Cairo', dateStyle: 'full', timeStyle: 'short' })}`,
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'فشل' }
  }
}

/**
 * الطلبات اللي مش عندنا.
 *
 * القديم كان بيسجّلها وينبّه محمد فورًا (whatsapp-webhook:1084-1105).
 * من غيرها بنقول للعميل «مش متاح» و**نفقد الطلب للأبد** — ومحمد
 * مايعرفش إيه الناقص في السوق.
 */
async function recordUnmetDemand(a: {
  phone: string
  name?: string
  requested_item: string
  category_guess?: string
  city?: string
  budget?: string
}): Promise<ToolResult> {
  try {
    const { error } = await db.from('customer_demand_requests').insert({
      contact_phone: a.phone,
      contact_name: a.name ?? null,
      requested_item: a.requested_item.slice(0, 500),
      category_guess: a.category_guess ?? null,
      // الجدول مافيهوش أعمدة للمنطقة والميزانية — بيتحطوا في notes
      notes: [a.city ? `المنطقة: ${a.city}` : '', a.budget ? `الميزانية: ${a.budget}` : '']
        .filter(Boolean)
        .join(' · ') || null,
      status: 'new',
      source: 'المارد — واتساب',
    })
    if (error) return { ok: false, error: error.message }

    // تنبيه محمد — الطلب ده فرصة، والسكوت عنه ضياع
    notifyOwner(
      `🎯 *طلب مش عندنا*\n\n` +
        `«${a.requested_item.slice(0, 120)}»\n` +
        (a.city ? `المنطقة: ${a.city}\n` : '') +
        (a.budget ? `الميزانية: ${a.budget}\n` : '') +
        `\nمن ${a.name || a.phone}`
    )

    return {
      ok: true,
      قول_للعميل:
        'اللي إنت طالبه مش متاح عندنا دلوقتي — بس سجّلته، ' +
        'وأول ما يتوفر هبعتلك على طول 👌',
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'فشل' }
  }
}

/**
 * تسجيل الليد + تقييمه.
 *
 * القديم كان بيعمل ده (whatsapp-webhook:1740-1751) وضاع في الترحيل.
 * من غيره مفيش أي تقييم للعملاء المحتملين — كلهم سواء.
 *
 * التقييم من النظام القديم: ٨٠ للمورد، ٥٠ للعميل.
 * ⚠️ بيتنادى مرة واحدة لكل رقم (الجدول فيه contact_phone).
 */
export async function recordLead(a: {
  phone: string
  name?: string | null
  isSupplier: boolean
  intent?: string | null
  category?: string | null
}): Promise<void> {
  try {
    const phone = (a.phone || '').replace(/\D/g, '')
    if (!phone) return

    const { data: existing } = await db
      .from('sales_leads')
      .select('id')
      .eq('contact_phone', phone)
      .limit(1)
      .maybeSingle()

    if (existing) {
      await db
        .from('sales_leads')
        .update({ last_action_at: new Date().toISOString() })
        .eq('id', existing.id)
      return
    }

    await db.from('sales_leads').insert({
      source: 'المارد — واتساب',
      contact_phone: phone,
      contact_name: a.name ?? null,
      intent: a.intent ?? null,
      interested_category: a.category ?? null,
      lead_score: a.isSupplier ? 80 : 50,
      last_action_at: new Date().toISOString(),
    })
  } catch {
    // التسجيل مايوقفش الرد أبدًا
  }
}

/** تنبيه لمحمد — مابيوقفش الرد أبدًا لو فشل */
function notifyOwner(text: string): void {
  // 🚚 (١٢ أغسطس ٢٠٢٦ — المراجعة الشاملة) كان بيبعت مباشرة لـWA_SERVICE_URL
  // (جسر Baileys القديم — جلساته كلها مقطوعة) فكل تنبيهات المالك من الأدوات
  // كانت بتضيع في صمت. دلوقتي بيمر بـsendText → OpenWA من الرقم الأساسي.
  // (import ديناميكي عشان نتفادى أي دورة استيراد مع whatsapp.ts)
  const owner = process.env.OWNER_PHONE || '201002229982'
  void import('./whatsapp')
    .then(({ sendText }) => sendText({ to: owner, session: owner, body: text }))
    .catch(() => {})
}

// ── الموزّع ──────────────────────────────────────────────────────────────
// 🔗 المارد يقرا اللينك بنفسه
//
// أغلب المطاعم بتبعت **لينك منيو** مش ملف — yallamenu · linktr.ee ·
// me-qr. وماكانش عندنا أداة تفتح لينك خالص، فالمارد كان بيوعد
// «هسجّل الأصناف من اللينك» وميحصلش حاجة.
//
// ⚠️ الضوابط:
//   • https بس — مفيش ملفات محلية ولا شبكة داخلية
//   • مهلة ١٥ث عشان ما نعلّقش الرد
//   • ٢٠٠ ألف حرف كحد أقصى (المنيوهات الكبيرة بتوصل ٥٠ألف)
//   • النتيجة نص خام — المارد هو اللي بيفهمه ويطلع منه الأصناف
// 🔒 (١٢ أغسطس ٢٠٢٦ — المراجعة الشاملة) فحص SSRF لكل قفزة:
// الفلتر القديم كان substring على اللينك الأول بس — والـfetch بيتبع
// redirects تلقائي، فلينك بريء ممكن يعمل 302 لعنوان داخلي (وكمان نطاق
// 172.16-31 ماكانش في القايمة أصلًا). دلوقتي: بنمنع أي IP حرفي خالص
// (مفيش سبب شرعي لمنيو على IP)، وأسماء داخلية، وبنتبع الـredirects
// يدوي (٣ كحد أقصى) مع فحص كل وجهة قبل ما نطلبها.
function linkBlocked(raw: string): string | null {
  let u: URL
  try { u = new URL(raw) } catch { return 'لينك مش مفهوم' }
  if (u.protocol !== 'https:') return 'اللينك لازم يبدأ بـ https'
  const h = u.hostname.toLowerCase()
  if (!h.includes('.')) return 'لينك غير مسموح'
  if (/^(localhost)$/.test(h) || h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.localhost')) return 'لينك غير مسموح'
  // أي IP حرفي (v4 أو v6) ممنوع — بيغطي 10.x و172.16-31 و192.168 و169.254 و127 وغيرهم
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return 'لينك غير مسموح'
  if (h.includes(':') || h.startsWith('[')) return 'لينك غير مسموح'
  return null
}

async function readLink(a: { url?: string }): Promise<ToolResult> {
  let url = (a.url || '').trim()
  {
    const blocked = linkBlocked(url)
    if (blocked) return { ok: false, error: blocked }
  }

  try {
    // نتبع الـredirects يدوي — كل وجهة بتتفحص قبل الطلب
    let res: Response | null = null
    for (let hop = 0; hop < 4; hop++) {
      res = await fetch(url, {
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; MadmonaBot/1.0)' },
        signal: AbortSignal.timeout(15_000),
        redirect: 'manual',
      })
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location')
        if (!loc) return { ok: false, error: `اللينك مش شغّال (${res.status})` }
        const nextUrl = new URL(loc, url).toString()
        const blocked = linkBlocked(nextUrl)
        if (blocked) return { ok: false, error: blocked }
        url = nextUrl
        continue
      }
      break
    }
    if (!res) return { ok: false, error: 'اللينك مش شغّال' }
    if (!res.ok) return { ok: false, error: `اللينك مش شغّال (${res.status})` }

    const type = res.headers.get('content-type') || ''
    if (/pdf/i.test(type)) {
      return {
        ok: false,
        error: 'ده ملف PDF — اطلب من صاحبه يبعته كملف على الواتساب مباشرة عشان أقدر أقراه',
      }
    }

    const html = (await res.text()).slice(0, 400_000)

    // نشيل السكريبت والستايل وبعدين الوسوم — الباقي هو المحتوى
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200_000)

    if (text.length < 40) {
      return { ok: false, error: 'الصفحة فاضية أو محتاجة جافاسكريبت — اطلب المنيو كصور' }
    }

    return { ok: true, data: { url, محتوى: text } }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'خطأ'
    return { ok: false, error: /timeout|abort/i.test(msg) ? 'اللينك أخد وقت طويل' : msg }
  }
}

async function createTask(a: { title: string; detail?: string; assignee_name?: string; priority?: string; task_date?: string; due_time?: string; supplier_id?: string }): Promise<ToolResult> {
  const title = (a.title || '').trim()
  if (!title) return { ok: false, error: 'عنوان المهمة مطلوب' }
  const priority = ['low', 'medium', 'high'].includes(a.priority || '') ? a.priority : 'medium'
  const assignee = a.assignee_name?.trim() || ''
  const supplierId = (a.supplier_id || '').trim()

  // (3 Aug 2026 — بأمر محمد) مهام الشات بتنزل في قايمة المهام اليومية نفسها (daily_tasks)
  // معلّمة task_kind='chat' عشان تتفرق عن المهام الثابتة المجدولة (fixed) — عبر RPC add_chat_task.
  // لو المكلّف مش موظف مسجّل → بتتسجّل في لوحة flow_tasks زي زمان (fallback).
  // 🏢 (19 Aug 2026) لو supplier_id متبعت (متكلّم موظف B2B)، البحث بيتقصر على نفس
  //    البيزنس بس — من غير كده اسم زي "محمد" ممكن يترضبط في بيزنس تاني تمامًا.
  if (assignee) {
    let empQuery = db
      .from('business_employees')
      .select('id, full_name')
      .eq('status', 'active')
      .ilike('full_name', `%${assignee}%`)
      .limit(1)
    if (supplierId) empQuery = empQuery.eq('supplier_id', supplierId)
    const { data: emp } = await empQuery.maybeSingle()
    const empRow = emp as { id: string; full_name: string } | null
    if (empRow) {
      const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(a.task_date || '')
      const { data: res, error: rpcErr } = await db.rpc('add_chat_task', {
        p_employee_id: empRow.id,
        p_title_ar: title,
        p_priority: priority,
        p_due_time: a.due_time || null,
        p_assigned_by: null,
        p_description: a.detail?.trim() || null,
        p_task_date: dateOk ? a.task_date : null,
      } as never)
      if (rpcErr) return { ok: false, error: 'مقدرش أسجّل المهمة', detail: rpcErr.message }
      const r = res as { ok?: boolean; error?: string; task_id?: string; task_date?: string } | null
      if (!r?.ok) return { ok: false, error: r?.error || 'مقدرش أسجّل المهمة' }
      // 🔔 (٢٦/٨) الإشعار بقى بيطلع من تريجر الداتابيز trg_notify_new_daily_task
      // — مصدر واحد لأي مسار إضافة، فشيلنا النسخة المكررة من هنا.
      return {
        ok: true,
        task_id: r.task_id,
        message: `اتسجّلت في المهام اليومية بتاعة ${empRow.full_name}${r.task_date ? ` — يوم ${r.task_date}` : ''} (النوع: من الشات)`,
      }
    }
  }

  const now = new Date().toISOString()
  const { data, error } = await db
    .from('flow_tasks')
    .insert({
      title,
      detail: a.detail?.trim() || null,
      assignee_name: a.assignee_name?.trim() || null,
      status: 'pending',
      priority,
      steps: [],
      source: 'chat',
      flow_name: 'شات المارد',
      created_at: now,
      updated_at: now,
    } as never)
    .select('id')
    .single()
  if (error) return { ok: false, error: 'مقدرش أسجّل المهمة', detail: error.message }
  // 🔔 (٢٦/٨) إشعار المكلّف بقى من تريجر الداتابيز trg_notify_new_flow_task
  // — بيغطي أي مسار بيضيف flow_task مش بس الشات، فشيلنا النسخة من هنا.
  return {
    ok: true,
    task_id: (data as { id: string }).id,
    message: `اتسجّلت المهمة: «${title}»${a.assignee_name ? ` — مكلّف بيها: ${a.assignee_name}` : ''} (في لوحة المهام العامة)`,
  }
}

async function listTasks(a: { assignee_name?: string; include_done?: boolean }): Promise<ToolResult> {
  let q = db
    .from('flow_tasks')
    .select('title, assignee_name, priority, status, created_at')
    .order('created_at', { ascending: false })
    .limit(20)
  if (!a.include_done) q = q.neq('status', 'done')
  if (a.assignee_name?.trim()) q = q.ilike('assignee_name', `%${a.assignee_name.trim()}%`)
  const { data, error } = await q
  if (error) return { ok: false, error: 'مقدرش أجيب المهام', detail: error.message }
  const rows = (data ?? []) as Array<{ title: string; assignee_name: string | null; priority: string; status: string }>
  if (!rows.length) return { ok: true, count: 0, message: 'مفيش مهام مفتوحة.' }
  return {
    ok: true,
    count: rows.length,
    tasks: rows.map((t) => ({ العنوان: t.title, المكلّف: t.assignee_name || '—', الأولوية: t.priority, الحالة: t.status })),
  }
}

async function completeTask(a: { query: string }): Promise<ToolResult> {
  const query = (a.query || '').trim()
  if (!query) return { ok: false, error: 'محتاج جزء من عنوان المهمة' }
  const { data: found } = await db
    .from('flow_tasks')
    .select('id, title')
    .neq('status', 'done')
    .ilike('title', `%${query}%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const task = found as { id: string; title: string } | null
  const now = new Date().toISOString()

  // 🐞 (٦ أغسطس ٢٠٢٦) مهام الشات بتتسجّل في `daily_tasks` (عبر add_chat_task)
  //    مش في `flow_tasks`، فالإقفال كان بيقول «مالقيتش مهمة» على مهمة
  //    اتعملت من الشات نفسه. دلوقتي بندوّر في الاتنين.
  if (!task) {
    const { data: dt } = await db
      .from('daily_tasks')
      .select('id, title_ar')
      .neq('status', 'done')
      .ilike('title_ar', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const daily = dt as { id: string; title_ar: string } | null
    if (!daily) return { ok: false, error: `مالقيتش مهمة مفتوحة فيها «${query}»` }
    const { error: dErr } = await db
      .from('daily_tasks')
      .update({ status: 'done', completed_at: now } as never)
      .eq('id', daily.id)
    if (dErr) return { ok: false, error: 'مقدرش أقفل المهمة', detail: dErr.message }
    // نقفل نسخة العرض في flow_tasks كمان لو موجودة (add_chat_task بتعمل الاتنين)
    await db
      .from('flow_tasks')
      .update({ status: 'done', completed_at: now, updated_at: now } as never)
      .eq('title', daily.title_ar)
      .neq('status', 'done')
    return { ok: true, message: `تمام، اتقفلت المهمة: «${daily.title_ar}» ✅` }
  }

  const { error } = await db
    .from('flow_tasks')
    .update({ status: 'done', completed_at: now, updated_at: now } as never)
    .eq('id', task.id)
  if (error) return { ok: false, error: 'مقدرش أقفل المهمة', detail: error.message }
  // ونفس المهمة في قايمة الموظف اليومية لو دي مهمة شات
  await db
    .from('daily_tasks')
    .update({ status: 'done', completed_at: now } as never)
    .eq('title_ar', task.title)
    .eq('task_kind', 'chat')
    .neq('status', 'done')
  return { ok: true, message: `تمام، اتقفلت المهمة: «${task.title}» ✅` }
}

async function businessSnapshot(a?: { supplier_id?: string }): Promise<ToolResult> {
  const supplierId = (a?.supplier_id || '').trim()

  // 🏢 (19 Aug 2026) بيزنس B2B معيّن — فريقه وفروعه ومهامه، مش شغل مضمونة الداخلي
  if (supplierId) {
    const { data: supplier, error: se } = await db
      .from('suppliers')
      .select('id, business_name, industry')
      .eq('id', supplierId)
      .maybeSingle()
    if (se || !supplier) return { ok: false, error: 'مالقيتش البيزنس ده' }
    const biz = supplier as { id: string; business_name: string; industry: string | null }

    const [teamRes, branchesRes, tasksRes] = await Promise.all([
      db
        .from('business_employees')
        .select('full_name, role_ar, role, status')
        .eq('supplier_id', supplierId)
        .eq('status', 'active')
        .limit(20),
      db.from('supplier_branches').select('name, status').eq('supplier_id', supplierId).limit(20),
      db
        .from('daily_tasks')
        .select('title_ar, priority, branch_id, supplier_branches!inner(supplier_id)')
        .eq('supplier_branches.supplier_id', supplierId)
        .neq('status', 'done')
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    const team = (teamRes.data ?? []) as Array<{ full_name: string; role_ar: string | null; role: string; status: string }>
    const branches = (branchesRes.data ?? []) as Array<{ name: string; status: string }>
    const tasks = (tasksRes.data ?? []) as Array<{ title_ar: string; priority: string }>

    return {
      ok: true,
      البيزنس: biz.business_name,
      النشاط: biz.industry || '—',
      عدد_الفريق_النشط: team.length,
      الفريق: team.map((t) => `${t.full_name} — ${t.role_ar || t.role}`),
      الفروع: branches.map((b) => `${b.name} (${b.status})`),
      مهام_مفتوحة: tasks.length,
      أهم_المهام: tasks.map((t) => `${t.title_ar} (${t.priority})`),
    }
  }

  const tasksRes = await db
    .from('flow_tasks')
    .select('title, priority', { count: 'exact' })
    .neq('status', 'done')
    .order('created_at', { ascending: false })
    .limit(5)
  const convsRes = await db
    .from('whatsapp_conversations')
    .select('id', { count: 'exact', head: true })
    .eq('last_message_direction', 'inbound')
  const openTasks = (tasksRes.data ?? []) as Array<{ title: string; priority: string }>
  return {
    ok: true,
    مهام_مفتوحة: tasksRes.count ?? openTasks.length,
    أهم_المهام: openTasks.map((t) => `${t.title} (${t.priority})`),
    محادثات_مستنية_رد: convsRes.count ?? 0,
  }
}

async function recentOrders(): Promise<ToolResult> {
  const { data, error } = await db
    .from('marketplace_orders')
    .select('reference_code, order_type, guest_name, total_amount, currency, status, delivery_city, created_at')
    .order('created_at', { ascending: false })
    .limit(10)
  if (error) return { ok: false, error: 'مقدرش أجيب الأوردرات', detail: error.message }
  const rows = (data ?? []) as Array<Record<string, unknown>>
  if (!rows.length) return { ok: true, count: 0, message: 'مفيش أوردرات لسه.' }
  return {
    ok: true,
    count: rows.length,
    orders: rows.map((o) => ({
      كود: o.reference_code,
      النوع: o.order_type,
      العميل: o.guest_name || '—',
      المبلغ: o.total_amount != null ? `${o.total_amount} ${o.currency || 'ج'}` : '—',
      الحالة: o.status,
      المدينة: o.delivery_city || '—',
    })),
  }
}

async function recentDemand(): Promise<ToolResult> {
  const { data, error } = await db
    .from('customer_demand_requests')
    .select('contact_name, contact_phone, requested_item, category_guess, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10)
  if (error) return { ok: false, error: 'مقدرش أجيب الطلبات', detail: error.message }
  const rows = (data ?? []) as Array<Record<string, unknown>>
  if (!rows.length) return { ok: true, count: 0, message: 'مفيش طلبات مسجّلة.' }
  return {
    ok: true,
    count: rows.length,
    requests: rows.map((r) => ({
      العميل: r.contact_name || r.contact_phone,
      المطلوب: r.requested_item,
      التصنيف: r.category_guess || '—',
      الحالة: r.status,
    })),
  }
}

// ── أسعار الذهب والعملات اللحظية (من /api/financial-data — نفس مصدر شريط الموقع) ──
async function getFinancialPrices(): Promise<ToolResult> {
  try {
    const res = await fetch(`${SITE}/api/financial-data`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      return { ok: false, message: 'مصدر الأسعار مش متاح دلوقتي' }
    }
    const data = await res.json()
    if (!data?.ok) {
      return { ok: false, message: 'مصدر الأسعار مش متاح دلوقتي' }
    }

    type Cur = { code: string; name_ar: string; rate: number }
    type Au = { karat: number; price_per_gram_egp: number }

    const gold = (data.gold as Au[]).map((g) => ({
      العيار: `عيار ${g.karat}`,
      السعر_للجرام: `${g.price_per_gram_egp.toLocaleString('ar-EG')} ج.م`,
    }))
    const currencies = (data.currencies as Cur[]).map((c) => ({
      العملة: c.name_ar,
      الكود: c.code,
      السعر_بالجنيه: c.rate.toFixed(2),
    }))

    return {
      ok: true,
      ذهب: gold,
      عملات: currencies,
      ملاحظة: 'الأسعار لحظية وبتتحدّث باستمرار. أسعار الذهب للبيع بالمصنعية بتختلف من محل للتاني.',
    }
  } catch {
    return { ok: false, message: 'مصدر الأسعار مش متاح دلوقتي — جرّب كمان شوية' }
  }
}
// ── أسعار العقارات من بورصة عقارات مضمونة (جدول property_market_items) ──
async function getPropertyPrices(a: { area?: string; segment?: string }): Promise<ToolResult> {
  try {
    const UNIT_LABEL: Record<string, string> = {
      egp_total: 'إجمالي',
      egp_per_m2: 'للمتر',
      egp_month: 'شهريًا',
      egp_night: 'لليلة',
    }
    const SEG_LABEL: Record<string, string> = {
      developer: 'مطوّر',
      resale: 'ريسيل',
      rent: 'إيجار',
    }

    let q = db
      .from('property_market_items')
      .select('title, developer, area_label, price_from, price_to, price_unit, segment, property_type')
      .eq('status', 'published')
      .order('area_label', { ascending: true })
      .limit(a.area?.trim() ? 25 : 12)

    if (a.area?.trim()) q = q.ilike('area_label', `%${a.area.trim()}%`)
    if (a.segment?.trim() && ['developer', 'resale', 'rent'].includes(a.segment.trim())) {
      q = q.eq('segment', a.segment.trim())
    }

    const { data, error } = await q
    if (error) return { ok: false, message: 'مش قادر أجيب أسعار العقارات دلوقتي' }
    if (!data || data.length === 0) {
      return { ok: false, message: a.area ? 'مفيش مشاريع مسجّلة في المنطقة دي' : 'مفيش مشاريع متاحة دلوقتي' }
    }

    type Row = {
      title: string
      developer: string | null
      area_label: string | null
      price_from: number | null
      price_to: number | null
      price_unit: string
      segment: string
    }

    const fmt = (n: number | null) => (n == null ? null : Number(n).toLocaleString('ar-EG'))

    const items = (data as Row[]).map((r) => {
      const unit = UNIT_LABEL[r.price_unit] || ''
      let priceStr: string
      if (r.price_from && r.price_to) priceStr = `من ${fmt(r.price_from)} لـ ${fmt(r.price_to)} ج.م ${unit}`
      else if (r.price_from) priceStr = `يبدأ من ${fmt(r.price_from)} ج.م ${unit}`
      else priceStr = 'السعر غير معلن — اسأل المطوّر'
      return {
        المشروع: r.title,
        المطوّر: r.developer || '—',
        المنطقة: r.area_label || '—',
        النوع: SEG_LABEL[r.segment] || r.segment,
        السعر: priceStr,
      }
    })

    return {
      ok: true,
      عدد_النتائج: items.length,
      عقارات: items,
      رابط_البورصة: `${SITE}/real-estate/market`,
      ملاحظة: 'الأسعار مسجّلة في بورصة مضمونة وبتتحدّث. للتفاصيل ابعت العميل على رابط البورصة.',
    }
  } catch {
    return { ok: false, message: 'مش قادر أجيب أسعار العقارات دلوقتي — جرّب كمان شوية' }
  }
}
export async function runMaridTool(name: string, input: Record<string, unknown>): Promise<ToolResult> {
  try {
    // 🔌 (٢٤ أغسطس ٢٠٢٦) الحارس التالت لمفاتيح الأدوات — شوف
    //    `marid-tool-settings.ts`. الأداة المطفية أصلًا مابتتبعتش لكلود،
    //    بس النموذج ساعات بيخترع نداء لأداة شافها في تعليمة قديمة في
    //    البرومبت. من غير الحارس ده كان هيرجعله «أداة مش معروفة» —
    //    رسالة بتخلّيه يحاول تاني بأسماء مختلفة بدل ما يعمل البديل.
    const off = await getDisabledMaridTools()
    const blocked = off.get(name)
    if (blocked) return await blockedToolResult(name, blocked, input)

    switch (name) {
      case 'search_catalog':
        return await searchCatalog(input as never)
      case 'list_categories':
        return await listCategories(input as never)
      case 'who_is_this':
        return await whoIsThis(input as never)
      case 'get_my_orders':
        return await getMyOrders(input as never)
      case 'create_listing_draft':
        return await createListingDraft(input as never)
      case 'add_menu_items':
        return await addMenuItems(input as never)
      case 'create_project':
        return await createProject(input as never)
      case 'forward_to_supplier':
        return await forwardToSupplierGroup(input as never)
      case 'create_supplier_group':
        return await createSupplierGroup(input as never)
      case 'manage_meeting':
        return await manageMeeting(input as never)
      case 'manage_order':
        return await manageOrder(input as never)
      case 'read_link':
        return await readLink(input as never)
      case 'search_projects':
        return await searchProjects(input as never)
      case 'get_referral_code':
        return await getReferralCode(input as never)
      case 'record_job_application':
        return await recordJobApplication(input as never)
      case 'record_unmet_demand':
        return await recordUnmetDemand(input as never)
      case 'create_task':
        return await createTask(input as never)
      case 'list_tasks':
        return await listTasks(input as never)
      case 'complete_task':
        return await completeTask(input as never)
      case 'business_snapshot':
        return await businessSnapshot(input as never)
      case 'recent_orders':
        return await recentOrders()
      case 'recent_demand':
        return await recentDemand()
      case 'get_financial_prices':
        return await getFinancialPrices()
      case 'get_property_prices':
        return await getPropertyPrices(input as never)
      default:
        return { error: `أداة مش معروفة: ${name}` }
    }
  } catch (err) {
    return { error: 'الأداة وقعت', detail: err instanceof Error ? err.message : 'unknown' }
  }
}
