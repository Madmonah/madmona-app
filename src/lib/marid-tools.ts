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
      'لو ناقص السعر أو التصنيف اسأله الأول. بعد ما تحفظ، المسودة بتروح للمراجعة ' +
      'وبيوصله لينك يكمّل بيه.',
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
    .limit(3)

  const others = (convs ?? []).filter(
    (c: { message_count: number }) => (c.message_count ?? 0) > 2
  )
  if (!others.length) return null

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

  // مُعرّف مخفي؟ ندوّر بالاسم على تاريخه
  if (looksLikeLidLocal(a.phone)) {
    const hist = await findHistoryByName(a.name)
    if (hist) return { known: true, عن_طريق: 'الاسم', ...hist }
    return {
      known: false,
      note: 'مُعرّف مخفي ومفيش تاريخ بنفس الاسم — عامله كجديد',
    }
  }

  if (!variants.length) return { known: false }

  const { data: profile } = await db
    .from('profiles')
    .select('id, full_name, role, created_at')
    .in('phone', variants)
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
    .select('id, business_name, kyc_status, listings_count, bookings_count, rating, has_erp_crm, account_type')
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

  const { data: profile } = await db.from('profiles').select('id').in('phone', variants).maybeSingle()

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
}): Promise<ToolResult> {
  if (!a.title?.trim()) return { ok: false, error: 'الاسم مطلوب' }

  const { data, error } = await db
    .from('instant_listing_drafts')
    .insert({
      contact_phone: a.phone,
      contact_name: a.name ?? null,
      title: a.title.slice(0, 120),
      description: a.description?.slice(0, 1500) ?? null,
      category_slug: a.category_slug ?? null,
      price_egp: typeof a.price_egp === 'number' ? a.price_egp : null,
      period: a.period ?? null,
      source_text: 'المارد — واتساب',
      status: 'pending',
    })
    .select('id')
    .maybeSingle()

  if (error) return { ok: false, error: 'مش قادر أحفظ المسودة', detail: error.message }

  return {
    ok: true,
    draft_id: data?.id,
    قول_للعميل:
      'اتسجّل! المسودة راحت للمراجعة وهنبعتلك لينك تكمّل بيه بياناتك وصورك. ' +
      `ولو عايز تكمّل بنفسك دلوقتي: ${MADMONA_LINKS.اضافة_اعلان}`,
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

// ── الموزّع ──────────────────────────────────────────────────────────────
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
      default:
        return { error: `أداة مش معروفة: ${name}` }
    }
  } catch (err) {
    return { error: 'الأداة وقعت', detail: err instanceof Error ? err.message : 'unknown' }
  }
}
