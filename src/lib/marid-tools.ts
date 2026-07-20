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

async function whoIsThis(a: { phone: string }): Promise<ToolResult> {
  const variants = phoneVariants(a.phone)
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
      default:
        return { error: `أداة مش معروفة: ${name}` }
    }
  } catch (err) {
    return { error: 'الأداة وقعت', detail: err instanceof Error ? err.message : 'unknown' }
  }
}
