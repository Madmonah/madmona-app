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
  الخدمات: `${SITE}/services`,
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
      'لو ناقص السعر أو التصنيف اسأله.',
    input_schema: {
      type: 'object' as const,
      properties: {
        phone: { type: 'string', description: 'رقم صاحب الإعلان' },
        name: { type: 'string', description: 'اسمه لو قاله' },
        title: { type: 'string', description: 'اسم المنتج أو الخدمة' },
        description: { type: 'string', description: 'وصف مختصر' },
        category_slug: { type: 'string', description: 'التصنيف من list_categories' },
        price_egp: { type: 'number', description: 'السعر بالجنيه' },
        period: { type: 'string', description: 'اليوم/الشهر/الساعة/القطعة' },
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
      'سجّل مشروع عقاري جديد بعت به مطوّر أو سمسار (كمبوند، مول، تاور، برج إداري). ' +
      'ده غير create_listing_draft — ده للمشاريع الكبيرة اللي بتتعرض في بورصة مضمونة العقارية، ' +
      'مش وحدة فرد بيأجّرها.\n\n' +
      '⛔ ممنوع تستخدمها لو:\n' +
      '• الاسم مش واضح — مشروع من غير اسم مالوش لازمة\n' +
      '• الرسالة مكتوب فيها SOLDOUT أو «تم البيع» أو «خلصت» على المشروع ده\n' +
      '• السعر أو المطوّر مش مذكور صراحة — ماتخمّنش، سيبه فاضي\n\n' +
      'الأداة بتتأكد بنفسها إن المشروع مش موجود قبل ما تحفظ.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'اسم المشروع زي ما هو مكتوب بالظبط' },
        developer: { type: 'string', description: 'المطوّر — بس لو مذكور صراحة' },
        area_label: { type: 'string', description: 'المنطقة بالعربي' },
        property_type: {
          type: 'string',
          enum: ['residential', 'commercial', 'administrative', 'medical'],
          description: 'نوع المشروع',
        },
        unit_label: { type: 'string', description: 'وصف الوحدات والمساحات زي ما مذكور' },
        price_from: { type: 'number', description: 'أقل سعر مذكور بالجنيه' },
        note: { type: 'string', description: 'سطر أو اتنين يلخّصوا العرض' },
        sender_phone: { type: 'string', description: 'رقم اللي بعت المشروع' },
      },
      required: ['title', 'sender_phone'],
    },
  },
  {
    name: 'create_task',
    description:
      'سجّل مهمة/تاسك في نظام الشغل — لما حد يطلب تذكير، متابعة، أو تكليف بعمل. ' +
      'أمثلة: «افتكرني أكلم فلان بكرة»، «اعمل مهمة راجع أوردر كذا»، «كلّف أحمد يجهّز التقرير». ' +
      'المهمة بتتسجّل في نظام المهام وتقدر تتسند لموظف بالاسم.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'عنوان المهمة باختصار وبوضوح' },
        detail: { type: 'string', description: 'تفاصيل إضافية لو موجودة' },
        assignee_name: { type: 'string', description: 'اسم الشخص المكلّف لو اتحدد' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'الأولوية (افتراضي medium)' },
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
      'لخّصلي حالة الشغل بسرعة (Catch Me Up) — عدد المهام المفتوحة وأهمها، والمحادثات اللي مستنية رد. ' +
      'استخدمها لما حد يقول «إيه الوضع؟» أو «لخّصلي الشغل» أو «فيه إيه جديد».',
    input_schema: {
      type: 'object' as const,
      properties: {},
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

async function createListingDraft(a: {
  phone: string
  name?: string
  title: string
  description?: string
  category_slug?: string
  price_egp?: number
  period?: string
  image_urls?: string[]
}): Promise<ToolResult> {
  if (!a.title?.trim()) return { ok: false, error: 'الاسم مطلوب' }

  // ⚠️ المارد بيخترع تصنيفات مش موجودة بدل ما ينادي list_categories.
  //    يوم ٢٠ يوليو حط category_slug='restaurants' وهو مش في الجدول،
  //    فالمسودة وقفت عند «no category» ومحدش عرف.
  //    بنتحقق فعليًا بدل ما نستنى إنه يفتكر.
  let slug = a.category_slug?.trim() || null
  if (slug) {
    const { data: cat } = await db.from('categories').select('slug').eq('slug', slug).maybeSingle()
    if (!cat) {
      // نجرّب أقرب تصنيف بنفس البادئة (food- · properties- …)
      const prefix = slug.split('-')[0]
      const { data: near } = await db
        .from('categories')
        .select('slug')
        .ilike('slug', `${prefix}%`)
        .limit(1)
        .maybeSingle()
      slug = (near as { slug?: string } | null)?.slug ?? null
    }
  }

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
  developer?: string
  area_label?: string
  property_type?: string
  unit_label?: string
  price_from?: number
  note?: string
  sender_phone: string
}): Promise<ToolResult> {
  const title = (a.title || '').trim()
  if (title.length < 3) return { ok: false, error: 'اسم المشروع مش واضح — ماتسجّلش' }

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
      segment: 'developer',
      property_type: a.property_type ?? null,
      unit_label: a.unit_label ?? null,
      price_from: typeof a.price_from === 'number' ? a.price_from : null,
      price_unit: 'egp_total',
      note: a.note ?? null,
      // بنحفظ رقم اللي بعت عشان نرجعله ونعرف مصدر المشروع.
      // ⚠️ العمود ده ممنوع على الزوار (migrations/20260720_hide_supplier_phones.sql)
      // — أرقام الموردين ماتظهرش على الماركتبليس ولا البورصة أبدًا.
      source_lead_phone: a.sender_phone,
      source_name: 'المارد — واتساب',
      // منشور على طول: محمد وافق يوم ٢٠ يوليو بعد ما اتفقنا على الضوابط.
      // الضوابط فوق هي اللي بتحمي — مش مرحلة مراجعة يدوية.
      status: 'published',
      is_active: true,
    })
    .select('id, slug')
    .maybeSingle()

  if (error) return { ok: false, error: 'مش قادر أسجّل المشروع', detail: error.message }

  return {
    ok: true,
    project_id: data?.id,
    url: `${SITE}/real-estate/projects/${data?.slug}`,
    ...(similar.length ? { مشاريع_شبهه_موجودة: similar } : {}),
    قول_للعميل: `اتسجّل ونُشر في بورصة مضمونة العقارية ✅\n${SITE}/real-estate/projects/${data?.slug}`,
    ملحوظة_داخلية: 'الماركتبليس محتاج صورة واحدة على الأقل — لو العميل بعت صور، قوله يبعتها عشان نعرضه هناك كمان',
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
    const res = await fetch(`${url.replace(/\/$/, '')}/group-create`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-madmona-secret': secret },
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
    return { ok: false, error: e instanceof Error ? e.message : 'فشل إنشاء الجروب' }
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

  const url = process.env.WA_SERVICE_URL
  const secret = process.env.WA_SERVICE_SECRET

  // ⚠️ ماننقلش رقم العميل للمورد. مضمونة هي الوسيط —
  // ده اللي بيحمي الطرفين وبيحافظ على دور المنصة.
  const text =
    `🔔 *طلب جديد من مضمونة*\n\n` +
    `${a.customer_request}\n\n` +
    (a.customer_name ? `العميل: ${a.customer_name}\n` : '') +
    `\nردّوا هنا وأنا هوصّل الرد للعميل.`

  try {
    const res = await fetch(`${url!.replace(/\/$/, '')}/send`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-madmona-secret': secret! },
      body: JSON.stringify({ jid: group.group_jid, text }),
    })
    const data = await res.json().catch(() => ({}))
    return data?.ok
      ? { ok: true, sent_to: group.subject, قول_للعميل: 'بعتّ طلبك للمورد وهرجعلك برده 👌' }
      : { ok: false, error: data?.error }
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
      قول_للعميل: `اتحجز ✅ ${when.toLocaleString('ar-EG', { dateStyle: 'full', timeStyle: 'short' })}`,
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
  const url = process.env.WA_SERVICE_URL
  const secret = process.env.WA_SERVICE_SECRET
  const owner = process.env.OWNER_PHONE || '201002229982'
  if (!url || !secret) return

  fetch(`${url.replace(/\/$/, '')}/send`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-madmona-secret': secret },
    body: JSON.stringify({ to: owner, text }),
  }).catch(() => {})
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
async function readLink(a: { url?: string }): Promise<ToolResult> {
  const url = (a.url || '').trim()
  if (!/^https:\/\//i.test(url)) {
    return { ok: false, error: 'اللينك لازم يبدأ بـ https' }
  }

  // ⛔ ممنوع الشبكة الداخلية — لينك من عميل ماينفعش يوصل لخدماتنا
  if (/localhost|127\.0\.0\.1|169\.254\.|10\.|192\.168\.|\.internal/i.test(url)) {
    return { ok: false, error: 'لينك غير مسموح' }
  }

  try {
    const res = await fetch(url, {
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; MadmonaBot/1.0)' },
      signal: AbortSignal.timeout(15_000),
    })
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

async function createTask(a: { title: string; detail?: string; assignee_name?: string; priority?: string }): Promise<ToolResult> {
  const title = (a.title || '').trim()
  if (!title) return { ok: false, error: 'عنوان المهمة مطلوب' }
  const priority = ['low', 'medium', 'high'].includes(a.priority || '') ? a.priority : 'medium'
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
  // إشعار للمكلّف لو اتحدد وله حساب على مضمونة (best-effort — مايوقفش الرد)
  if (a.assignee_name?.trim()) {
    try {
      const { data: prof } = await db
        .from('profiles')
        .select('id')
        .ilike('full_name', a.assignee_name.trim())
        .limit(1)
        .maybeSingle()
      const pid = (prof as { id?: string } | null)?.id
      if (pid) {
        await db.from('notification_queue').insert({
          recipient_id: pid,
          type: 'task_assigned',
          title: '📋 مهمة جديدة ليك',
          body: title.slice(0, 90),
          url: '/chat/tasks',
          data: { icon: '/marid-icon-192.png' },
        } as never)
      }
    } catch { /* best-effort */ }
  }
  return {
    ok: true,
    task_id: (data as { id: string }).id,
    message: `اتسجّلت المهمة: «${title}»${a.assignee_name ? ` — مكلّف بيها: ${a.assignee_name}` : ''}`,
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
  if (!task) return { ok: false, error: `مالقيتش مهمة مفتوحة فيها «${query}»` }
  const now = new Date().toISOString()
  const { error } = await db
    .from('flow_tasks')
    .update({ status: 'done', completed_at: now, updated_at: now } as never)
    .eq('id', task.id)
  if (error) return { ok: false, error: 'مقدرش أقفل المهمة', detail: error.message }
  return { ok: true, message: `تمام، اتقفلت المهمة: «${task.title}» ✅` }
}

async function businessSnapshot(): Promise<ToolResult> {
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

export async function runMaridTool(name: string, input: Record<string, unknown>): Promise<ToolResult> {
  try {
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
        return await businessSnapshot()
      case 'recent_orders':
        return await recentOrders()
      case 'recent_demand':
        return await recentDemand()
      default:
        return { error: `أداة مش معروفة: ${name}` }
    }
  } catch (err) {
    return { error: 'الأداة وقعت', detail: err instanceof Error ? err.message : 'unknown' }
  }
}
