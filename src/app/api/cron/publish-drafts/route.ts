// =====================================================================
// ⚙️ نشر درافتات المارد أوتوماتيك (17 Jul 2026)
// السبب: أسماك الصياد بعت منيوه والمارد جهّز 9 درافتات في
// instant_listing_drafts — وقعدوا status='new' من غير ما ينزلوا.
// «مش عايز الغلطات دي تتكرر تاني مع أي حد» — محمد.
//
// كل 10 دقايق: أي درافت status='new' عدّى عليه 10 دقايق (عشان المارد
// يكون خلّص كل أصناف المورد) وفيه صورة + عنوان →
//   1) يضمن profile بالرقم (نفس مسار /api/auth/wa)
//   2) يضمن marketplace_supplier + owner في business_employees
//   3) أكل (food-*) → مطعم واحد منشور + restaurant_menu_items
//      غير كده → إعلان منشور لكل درافت
//   4) يعلّم الدرافتات published ويبعت واتساب للمورد باللينك
// =====================================================================

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { normalizePhone, phoneToEmail } from '@/lib/auth-helpers'
import { sendText, upsertConversation } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const SITE = 'https://madmonacairo.com'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

type Draft = {
  id: string
  contact_phone: string
  contact_name: string | null
  title: string
  description: string | null
  category_slug: string | null
  price_egp: number | null
  period: string | null
  is_furnished: boolean | null
  image_urls: string[] | null
  status: string
}

function slugify(name: string): string {
  const base = name
    .replace(/[^ء-يa-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 50)
  return `${base || 'listing'}-${Math.random().toString(36).slice(2, 7)}`
}

// 31 Jul 2026: النظام بيقرأ السعر من pricing_rules مش من listings.price_egp — الأداة دي كانت
// بتحط السعر على العمود القديم بس ومابتسجلش في pricing_rules خالص، فكل إعلان بيطلع
// بلا سعر ظاهر (263+ إعلان اتأكد). نفس الشي: city مابيتحطش خالص.
const PERIOD_MAP: Record<string, string> = {
  'الساعة': 'hourly', 'ساعة': 'hourly', 'hourly': 'hourly',
  'اليوم': 'daily', 'يوم': 'daily', 'daily': 'daily',
  'الأسبوع': 'weekly', 'أسبوع': 'weekly', 'weekly': 'weekly',
  'الشهر': 'monthly', 'شهر': 'monthly', 'monthly': 'monthly',
  'القطعة': 'per_unit', 'قطعة': 'per_unit',
}
function mapPeriodType(period: string | null): string {
  if (!period) return 'per_unit'
  return PERIOD_MAP[period.trim()] || 'per_unit'
}

// 🐞 (١٦ أغسطس ٢٠٢٦ — محمد: «المارد مخرف مع شقة صواري — الشقة دي قريبة
//     من إسكندرية»)
//
//     القايمة كانت بتعرف كلمة «الإسكندرية» نفسها بس. البايع بعت «شقة
//     للإيجار في **صواري**» و«شقة للبيع **جناكليس**» — الاتنين إسكندرية،
//     ومحدش فيهم بيقول كلمة «إسكندرية». فالاتنين وقعوا على الافتراضي
//     وطلعوا **القاهرة**.
//
// ⚠️ الافتراضي `القاهرة` هو أخطر سطر في الملف: هو مابيرميش الإعلان،
//     هو بيحطّه في محافظة غلط **بثقة**. المشتري في إسكندرية مش هيلاقيه
//     أبدًا، والبايع بيشوف إعلانه في القاهرة ويفهم إننا مش فاهمين.
//     فبنوسّع القايمة بأسماء المناطق والكمبوندات اللي الناس بتكتبها
//     فعلاً، وبنسجّل لوجّ كل مرة نقع على الافتراضي عشان نعرف إيه اللي
//     ناقص القايمة بدل ما نكتشفه من شكوى.
const CITY_KEYWORDS: Array<[RegExp, string]> = [
  // الإسكندرية — أحياء وكمبوندات بيتكتبوا من غير اسم المحافظة
  [/الإسكندرية|إسكندرية|اسكندرية|صواري|صوارى|جناكليس|سموحة|سيدي جابر|سيدى جابر|ميامي|ميامى|سان ستيفانو|لوران|كفر عبده|العجمي|العجمى|أبو قير|ابو قير|المندرة|سيدي بشر|سيدى بشر|برج العرب|المعمورة|الشاطبي|الشاطبى|محرم بك|العصافرة|بولكلي|بولكلى|رشدي|رشدى|زيزينيا|جليم|كليوباترا|فلمنج|الإبراهيمية|الابراهيمية/, 'الإسكندرية'],
  [/الجيزة|الشيخ زايد|6 أكتوبر|٦ أكتوبر|أكتوبر|اكتوبر|الهرم|المهندسين|الدقي|الدقى|حدائق الأهرام|زايد/, 'الجيزة'],
  [/الساحل الشمالي|الساحل الشمالى|مرسى مطروح|مارينا|سيدي عبد الرحمن|سيدى عبد الرحمن|العلمين/, 'الساحل الشمالي'],
  [/الغردقة|البحر الأحمر|الجونة|سهل حشيش|مكادي/, 'الغردقة'],
  [/شرم الشيخ|دهب|نويبع|طابا/, 'شرم الشيخ'],
  [/العاصمة الإدارية|العاصمة الادارية/, 'العاصمة الإدارية'],
  [/السويس|الإسماعيلية|الاسماعيلية|بورسعيد|بورفؤاد/, 'القناة'],
  [/المنصورة|طنطا|الزقازيق|دمياط|كفر الشيخ|المحلة|بنها|دمنهور|شبين الكوم/, 'الدلتا'],
  [/أسيوط|اسيوط|المنيا|سوهاج|قنا|الأقصر|الاقصر|أسوان|اسوان|بني سويف|بنى سويف|الفيوم/, 'الصعيد'],
  // القاهرة الكبرى بالاسم الصريح — عشان اللي جاي من القاهرة فعلاً ماينفعش
  // يفضل معتمد على الافتراضي هو كمان
  [/القاهرة|التجمع|القاهرة الجديدة|مدينتي|مدينتى|الرحاب|مصر الجديدة|المعادي|المعادى|مدينة نصر|الشروق|العبور|حلوان|شبرا|الزمالك|وسط البلد|المقطم/, 'القاهرة'],
]

/** آخر مرة وقعنا على الافتراضي — بيتقري من اللوجّ عشان نوسّع القايمة. */
function guessCity(text: string | null, draftId?: string): string {
  const t = text || ''
  for (const [re, city] of CITY_KEYWORDS) if (re.test(t)) return city
  // ⛔ مش بنسكت. الافتراضي ده بيحط الإعلان في محافظة ممكن تكون غلط.
  console.warn(
    '[publish-drafts] مافيش مدينة في نص الإعلان — اتحط «القاهرة» افتراضيًا.',
    'draft=', draftId ?? '?',
    'نص=', t.slice(0, 160).replace(/\s+/g, ' '),
  )
  return 'القاهرة' // افتراضي أمن من الفراغ الكامل
}

async function ensureProfile(supa: ReturnType<typeof sb>, rawPhone: string) {
  const normalized = normalizePhone(rawPhone)
  if (!normalized) return null
  // ⚠️ (١٩ أغسطس ٢٠٢٦ — تصحيح) التعليق القديم هنا كان غلط وبيوصف
  // normalizePhone بتاعة @/lib/whatsapp (بترجّع "20"+عشر أرقام من غير +).
  // الاستيراد فوق ده من @/lib/auth-helpers، وده بيرجّع "+20"+عشر أرقام
  // (مع علامة +) — يعني slice(2) كان بيسيب "0"+الرقم المحلي وبعدين
  // بيضيف صفر تاني فوقه = رقم مبتدئ بصفرين ("001208181544" بدل
  // "01208181544"). ده كان بيكسر تسجيل الدخول لاحقًا بالواتساب لأي
  // مورد اتعمله حساب من هنا (publish-drafts) — رقمه المحفوظ في profiles
  // ماكانش بيتطابق مع رقمه الحقيقي وقت الدخول. اتلقطت من ١٧ حساب فعلي
  // متأثر (منهم مكتب ضاحي بـ٢٤ إعلان). slice(3) هو الصح لصيغة "+20...".
  const local = '0' + normalized.slice(3)
  const { data: existing } = await supa
    .from('profiles').select('id')
    .or(`phone.eq.${local},phone.eq.${normalized}`)
    .limit(1).maybeSingle()
  if (existing?.id) return { id: existing.id as string, local }

  const email = phoneToEmail(normalized)
  const { data: created, error } = await supa.auth.admin.createUser({
    email, email_confirm: true, user_metadata: { phone: local, via: 'auto-publish' },
  })
  let userId = created?.user?.id
  if (error && /already|exists/i.test(error.message)) {
    const { data: link } = await supa.auth.admin.generateLink({ type: 'magiclink', email })
    userId = link?.user?.id
  } else if (error) return null
  if (!userId) return null
  await supa.from('profiles').upsert({ id: userId, phone: local, role: 'customer' } as never, { onConflict: 'id' })
  return { id: userId, local }
}

// 🎯 بيمر من نقطة الإرسال الموحّدة — sendText بتسجّل الرسالة في
// whatsapp_messages لوحدها، فمفيش داعي للتسجيل اليدوي هنا.
// شوف: src/app/api/internal/wa-send/route.ts
async function waNotify(_supa: ReturnType<typeof sb>, phone: string, body: string) {
  try {
    const conversationId = await upsertConversation({ phone, agentName: 'auto-publish' })
    await sendText({
      to: phone,
      body,
      conversationId: conversationId ?? undefined,
      agentName: 'auto-publish',
    })
  } catch { /* best-effort */ }
}

export async function GET(req: Request) {
  // 🔒 (١٢ أغسطس ٢٠٢٦ — المراجعة الشاملة) كان الكرون الوحيد من غير أي
  // سر — أي حد يقدر يدقّه ويجبر نشر مسودات ويطلق موجة إشعارات واتساب
  // (نفس نمط حادثة rate-overlimit بتاعة ٢٠ يوليو). نفس بوابة باقي
  // الكرونات: Bearer CRON_SECRET (Vercel بيبعته تلقائيًا) أو
  // x-madmona-secret للتشغيل اليدوي.
  const _auth = req.headers.get('authorization')
  const _manual = req.headers.get('x-madmona-secret')
  const _okCron = !!process.env.CRON_SECRET && _auth === `Bearer ${process.env.CRON_SECRET}`
  const _okManual = !!process.env.WA_SERVICE_SECRET && _manual === process.env.WA_SERVICE_SECRET
  if (!_okCron && !_okManual) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const supa = sb()
  // ?silent=1 → ينشر من غير ما يبعت واتساب. بنستخدمه لباك-فيل العالقين مرة واحدة
  // من غير ما نبعت دفعة إشعارات تكسر الرقم (درس rate-overlimit — ٢٠ يوليو).
  const silent = new URL(req.url).searchParams.get('silent') === '1'
  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  // 🔁 (31 يوليو 2026 — محمد اشتكى: المارد بيوعد الناس بالإضافة وميضيفش):
  // 66 مسودة علقوا في 'needs_review' للأبد لأن الكرون قديمًا كان بيرفض يعيد
  // محاولتها خالص، رغم إن غالبية أسباب الرفض (تصنيف مش موجود وقتها) بقت
  // متاحة دلوقتي (تصنيفات بتتضاف باستمرار). فالعميل ياخد رسالة «تم التسجيل»
  // من المارد بس إعلانه فعليًا مايطلعش أبدًا. دلوقتي بنعيد محاولة needs_review
  // كل مرة — لو التصنيف اتلقى دلوقتي هينشر، ولو لسه مش موجود هيفضل needs_review
  // (no-op، مفيش ضرر من المحاولة).
  // نقبل 'new' و'pending' — أداة المارد اتغيّرت مرة لـ'pending' والكرون كان بيدوّر
  // على 'new' بس، فمسودات المارد علقت وماوصلتش الماركتبليس. قبول الاتنين بيمنع
  // تكرار الغلطة دي لو الحالة اتلخبطت تاني، وبيلقط أي عالقين قدام.
  const { data: drafts } = await supa
    .from('instant_listing_drafts')
    .select('id, contact_phone, contact_name, title, description, category_slug, price_egp, period, is_furnished, image_urls, status')
    .in('status', ['new', 'pending', 'needs_review'])
    .lt('created_at', cutoff)
    .order('created_at')
    // نافذة واسعة: المسودات بلا صورة بتفضل في نفس الحالة، فلو النافذة صغيرة ممكن
    // تملاها القديمة بلا صور وتحرم اللي معاها صور من النشر. ready بيفلتر بعد كده.
    .limit(150)

  const ready = (drafts as Draft[] | null || []).filter(d => d.title && (d.image_urls?.length || 0) > 0)
  if (!ready.length) return NextResponse.json({ published: 0 })

  const byPhone = new Map<string, Draft[]>()
  for (const d of ready) {
    if (!byPhone.has(d.contact_phone)) byPhone.set(d.contact_phone, [])
    byPhone.get(d.contact_phone)!.push(d)
  }

  const results: Record<string, unknown>[] = []

  for (const [phone, group] of Array.from(byPhone.entries())) {
    try {
      const prof = await ensureProfile(supa, phone)
      if (!prof) { results.push({ phone, error: 'no_profile' }); continue }

      const bizName = group[0].contact_name || `مورد ${prof.local}`

      // supplier: موجود ولا نعمله — idempotent.
      // FIX (22 يوليو 2026): كان select-then-insert بيقع بـduplicate key على
      // marketplace_suppliers_profile_id_key لما المورّد موجود بالفعل، والباتش
      // كله بيفشل (كل الدرافتات من نفس الرقم) فالكرون واقف من 18 يوليو. دلوقتي:
      // نستخدم .limit(1) array (مش maybeSingle اللي ممكن يرمي)، ولو الإنشاء فشل
      // نجيب الموجود بدل ما نطلّع الجروب كله error.
      let supplierId: string | null = null
      const { data: supRows } = await supa.from('marketplace_suppliers').select('id').eq('profile_id', prof.id).limit(1)
      if (supRows && supRows.length) supplierId = (supRows[0] as { id: string }).id
      else {
        // upsert بـonConflict=profile_id — الحل المضمون: لو المورّد موجود بالفعل
        // (والـselect فوق مالقاهوش بسبب لخبطة تطبيع الرقم) الـupsert بيعمل UPDATE
        // ويرجّع الـid بدل ما يقع duplicate key ويسدّ الطابور.
        const { data: up, error: se } = await supa.from('marketplace_suppliers').upsert({
          profile_id: prof.id, account_type: 'business', business_name: bizName,
          description: group[0].description, kyc_status: 'approved', kyc_reviewed_at: new Date().toISOString(), commission_rate: 10,
        } as never, { onConflict: 'profile_id' }).select('id').single()
        if (up) supplierId = (up as { id: string }).id
        else { results.push({ phone, error: 'supplier: ' + (se?.message || 'unknown') }); continue }
      }

      // owner في business_employees (لو مش موجود)
      const { data: be } = await supa.from('business_employees').select('id')
        .eq('supplier_id', supplierId).eq('auth_user_id', prof.id).limit(1).maybeSingle()
      if (!be?.id) {
        await supa.from('business_employees').insert({
          supplier_id: supplierId, auth_user_id: prof.id, full_name: bizName, phone: prof.local,
          role: 'owner', role_ar: 'مالك', status: 'active', employee_type: 'human',
        } as never)
      }

      // FIX (22 يوليو 2026): تفكيك المنيو — أصناف زي الحلويات كانت بتتصنّف
      // catering-desserts (مش food-) فتروح فرع other = كل صنف إعلان منفصل بـ0 منيو.
      // دلوقتي أي تصنيف أكل (food-/catering-/شواء/حلويات/طبخ) بيتعامل كصنف منيو.
      const isFoodish = (s: string) =>
        s.startsWith('food-') || s.startsWith('catering-') ||
        ['bbq-grill', 'daily-meals', 'pastry-cakes', 'cooking-classes'].includes(s)
      const food = group.filter(d => isFoodish(d.category_slug || ''))
      const other = group.filter(d => !isFoodish(d.category_slug || ''))
      const links: string[] = []

      // ---------- مطاعم/أكل: مطعم واحد + منيو ----------
      if (food.length) {
        let listingId: string | null = null
        let listingSlug: string | null = null
        // FIX (22 يوليو 2026): find-or-create صامد — بدل embedded filter + maybeSingle
        // (اللي كان بيفشل يلاقي إعلان المطعم الموجود فيعمل نسخ مكررة)، بنجيب إعلانات
        // المورّد المنشورة ونلاقي المطعم بالـtrack في JS.
        const { data: existRows } = await supa.from('listings')
          .select('id, slug, categories(slug, track)')
          .eq('supplier_id', supplierId).eq('status', 'published').eq('is_directory', false)
          .limit(20)
        const existRow = ((existRows || []) as Array<{ id: string; slug: string; categories?: { slug?: string; track?: string } | null }>)
          .find(r => r.categories?.track === 'restaurants' || (r.categories?.slug || '').startsWith('food-'))
        if (existRow?.id) { listingId = existRow.id; listingSlug = existRow.slug }
        else {
          // التصنيف الرئيسي لازم يكون مطعم (food-)، مش حلويات/كاترينج
          const catSlug = (food.find(d => (d.category_slug || '').startsWith('food-'))?.category_slug) || 'food-grill'
          let { data: cat } = await supa.from('categories').select('id').eq('slug', catSlug).maybeSingle()
          if (!cat?.id) ({ data: cat } = await supa.from('categories').select('id').eq('slug', 'food-grill').maybeSingle())
          const slug = slugify(bizName)
          const { data: nl, error: le } = await supa.from('listings').insert({
            title: bizName, slug, status: 'draft', category_id: cat?.id,
            supplier_id: supplierId, contact_phone: phone, phone_verified_at: new Date().toISOString(),
            description: food[0].description || `${bizName} — اطلب أونلاين ومعاملاتك مضمونة`, country: 'EG', is_directory: false,
          } as never).select('id, slug').single()
          if (le || !nl) { results.push({ phone, error: 'listing: ' + le?.message }); continue }
          listingId = nl.id; listingSlug = nl.slug
          const imgs = Array.from(new Set(food.flatMap(d => d.image_urls || []))).slice(0, 12)
          await supa.from('listing_photos').insert(imgs.map((u, ix) => ({
            listing_id: listingId, url: u, display_order: ix + 1, is_primary: ix === 0,
          })) as never)
          await supa.from('listings').update({ status: 'published', published_at: new Date().toISOString() } as never).eq('id', listingId)
        }
        // أصناف المنيو (من غير تكرار بالاسم)
        const { data: existingItems } = await supa.from('restaurant_menu_items').select('name_ar').eq('listing_id', listingId)
        const have = new Set((existingItems || []).map(m => m.name_ar))
        let order = have.size
        for (const d of food) {
          const name = d.title.replace(new RegExp(`^${bizName}\\s*[—-]\\s*`), '').slice(0, 120)
          if (have.has(name)) continue
          order += 1
          await supa.from('restaurant_menu_items').insert({
            listing_id: listingId, name_ar: name, description_ar: d.description,
            price: d.price_egp ?? 0, currency: 'EGP', photo_url: d.image_urls?.[0] ?? null,
            is_available: true, display_order: order,
          } as never)
        }
        await supa.from('instant_listing_drafts').update({ status: 'published', published_listing_id: listingId } as never)
          .in('id', food.map(d => d.id))
        links.push(`${SITE}/marketplace/${listingSlug}`)
      }

      // ---------- باقي الفئات: إعلان لكل درافت ----------
      const seenTitles = new Set<string>()
      // 🐛 (١٩ أغسطس ٢٠٢٦ — المراجعة الشاملة) لو كل درافتات الدفعة وقعت في
      // needs_review/duplicate، links.length يفضل صفر ومحدش بيبعت للعميل ولا
      // لمحمد أي حاجة — نفس نمط «السكوت التام» اللي اكتشفناه في محادثة
      // الواتساب النهاردة، بس هنا في المسار المجدول. needsReviewCount بيتبع
      // حالات "فئة مش معروفة" تحديدًا (اللي فعلاً محتاجة تدخّل بشري)، مش
      // duplicate (ده سكوت صح — الإعلان منشور بالفعل من قبل).
      let needsReviewCount = 0
      let firstTimeNeedsReview = false
      for (const d of other) {
        // 🛡️ (17 Jul 2026) منع التكرار: درافتات مكررة نشرت 17 إعلان مكرر (Techwood دواليب ×3!)
        // — جوه الدفعة نفسها + ضد إعلانات موجودة بنفس العنوان لنفس المورد.
        const titleKey = d.title.trim()
        if (seenTitles.has(titleKey)) {
          await supa.from('instant_listing_drafts').update({ status: 'duplicate' } as never).eq('id', d.id)
          continue
        }
        seenTitles.add(titleKey)
        const { data: dup } = await supa.from('listings').select('id, slug')
          .eq('supplier_id', supplierId).eq('title', titleKey.slice(0, 150))
          .in('status', ['published', 'draft', 'paused']).limit(1).maybeSingle()
        if (dup?.id) {
          await supa.from('instant_listing_drafts').update({ status: 'duplicate', published_listing_id: dup.id } as never).eq('id', d.id)
          continue
        }
        const { data: cat } = await supa.from('categories').select('id').eq('slug', d.category_slug || '').maybeSingle()
        if (!cat?.id) { // فئة مش معروفة → سيبه للفريق يراجعه
          needsReviewCount++
          await supa.from('instant_listing_drafts').update({ status: 'needs_review' } as never).eq('id', d.id)
          // تنبيه لمحمد مرة واحدة بس — أول لحظة يتحول فيها الدرافت لـneeds_review،
          // مش كل ١٠ دقايق. من غير كده الدرافت يفضل عالق للأبد وموحدش ياخد باله
          // غير لو صادف وشاف اللوجّ (زي حالة أحمد سامي بالظبط — الظهور بصمت).
          if (d.status !== 'needs_review') {
            firstTimeNeedsReview = true
            void supa.rpc('fire_admin_alert', {
              p_title: 'مسودة إعلان عالقة — فئة مش معروفة',
              p_body: `«${d.title}» من ${phone} — الفئة "${d.category_slug || '—'}" مش موجودة في categories. ` +
                `ضيفها أو غيّر تصنيف المارد عشان الإعلان ينشر.`,
              p_url: '/admin/marid-monitor',
              p_severity: 'warning',
              p_source: 'publish-drafts-cron',
            }).then(() => {}, () => {})
          }
          continue
        }
        const slug = slugify(d.title)
        const { data: nl, error: le } = await supa.from('listings').insert({
          title: d.title.slice(0, 150), slug, status: 'draft', category_id: cat.id,
          supplier_id: supplierId, contact_phone: phone, phone_verified_at: new Date().toISOString(),
          description: d.description || d.title, country: 'EG', is_directory: false,
          city: guessCity(`${d.title} ${d.description || ''}`, d.id),
          price_egp: d.price_egp, price_on_request: d.price_egp == null, is_furnished: d.is_furnished,
        } as never).select('id, slug').single()
        if (le || !nl) { results.push({ phone, draft: d.id, error: 'listing: ' + le?.message }); continue }
        await supa.from('listing_photos').insert((d.image_urls || []).slice(0, 8).map((u, ix) => ({
          listing_id: nl.id, url: u, display_order: ix + 1, is_primary: ix === 0,
        })) as never)
        // 💰 (١٦ أغسطس ٢٠٢٦ — محمد: «المورد يكتب السعر اللي هياخده في إيده
        //    وإحنا هنزود العمولة») السعر اللي جاي من المورد بقى **الصافي**،
        //    مش سعر العرض. الحسبة في `apply_net_pricing` في الداتابيز عشان
        //    تفضل في مكان واحد — نفس السبب اللي خلّانا نجمع العمولة نفسها
        //    في مكان واحد بعد ما كانت متكتوبة في ٣ أماكن مختلفين.
        if (d.price_egp != null) {
          const { error: priceErr } = await supa.rpc('apply_net_pricing', {
            p_listing_id: nl.id,
            p_net: d.price_egp,
            p_period: mapPeriodType(d.period),
          })
          // ⚠️ إعلان بلا سعر بيتنشر ومحدش بياخد باله — ٣٢١ إعلان منشور
          //    دلوقتي من غير سعر. فلو الحسبة وقعت، لازم يبان في اللوجّ.
          if (priceErr) console.error('[publish-drafts] فشل تسعير', nl.id, priceErr.message)
        }
        // 🐛 (١٠ أغسطس ٢٠٢٦ — محمد لاحظ إعلان قالله المارد "نزل رسمي" بس مش موجود):
        // ده الـupdate اللي فعليًا بينشر الإعلان (status: draft → published). كان بيتنفّذ
        // من غير ما حد يتحقق من نتيجته أو يفحص خطأه — لو فشل (RLS، قيد داتابيز، عطل شبكة
        // مؤقت)، الكود كان بيكمل عادي ويضيف اللينك لـlinks[] ويبعت «مبروك! نزل رسمي» للعميل
        // رغم إن الإعلان لسه status='draft' فعليًا وغير ظاهر على الموقع خالص. اتأكدت من
        // حالة حقيقية: مورد الحجر الديكور (201145720639) استلم رسالة «مبروك» بلينك ميت،
        // وإعلانه فضل draft. الحل: نتحقق من نجاح الـupdate فعليًا قبل ما نعتبره منشور —
        // لو فشل، نسيب الدرافت needs_review عشان الكرون يعيد المحاولة تاني بدل ما نكدب
        // على العميل.
        const { data: pubRow, error: pubErr } = await supa.from('listings')
          .update({ status: 'published', published_at: new Date().toISOString() } as never)
          .eq('id', nl.id)
          .select('id')
          .maybeSingle()
        if (pubErr || !pubRow) {
          needsReviewCount++
          await supa.from('instant_listing_drafts').update({ status: 'needs_review' } as never).eq('id', d.id)
          results.push({ phone, draft: d.id, error: 'publish_update_failed: ' + (pubErr?.message || 'no row updated') })
          if (d.status !== 'needs_review') {
            firstTimeNeedsReview = true
            void supa.rpc('fire_admin_alert', {
              p_title: 'فشل نشر إعلان (update وقع)',
              p_body: `«${d.title}» من ${phone} — الـupdate لـstatus=published فشل: ${pubErr?.message || 'no row updated'}`,
              p_url: '/admin/marid-monitor',
              p_severity: 'warning',
              p_source: 'publish-drafts-cron',
            }).then(() => {}, () => {})
          }
          continue
        }
        await supa.from('instant_listing_drafts').update({ status: 'published', published_listing_id: nl.id } as never).eq('id', d.id)
        links.push(`${SITE}/marketplace/${nl.slug}`)
      }

      if (links.length && !silent) {
        await waNotify(supa, phone,
          `مبروك! 🎉 ${links.length > 1 ? 'إعلاناتك نزلت' : 'إعلانك نزل'} رسمي على مضمونة ✅\n\n` +
          links.slice(0, 3).map(l => `🔗 ${l}`).join('\n') +
          `\n\nأي حد يقدر يطلب منك أونلاين من دلوقتي والفلوس مضمونة لحد الاستلام. الطلبات بتوصلك على لوحة تحكمك:\n${SITE}/supplier/dashboard\n\nولو عايز تعدّل أي سعر أو صنف قولّي وأنا أظبطه 🧞\n*معاملاتك مضمونة* ✅`)
      } else if (!links.length && firstTimeNeedsReview && !silent) {
        // 🐛 (١٩ أغسطس ٢٠٢٦) من غير الرسالة دي، عميل الدرافت بتاعه وقع في
        // needs_review بيفضل ساكت تمامًا — نفس نمط «مارد قال تسجّلت والعميل
        // اطمن» بس هنا من غير حتى وعد كاذب، مجرّد سكوت. رسالة صادقة مرة واحدة
        // بس (firstTimeNeedsReview) عشان ماتتكررش كل ١٠ دقايق لحد ما يتحل.
        await waNotify(supa, phone,
          `وصلني إعلانك وبنراجعه دلوقتي قبل ما ينزل رسمي — هيبان على مضمونة خلال شوية. لو استنيت وطال، قولّي 🙏`)
      }
      results.push({ phone, published: links.length, menu_items: food.length, needs_review: needsReviewCount })
    } catch (e) {
      results.push({ phone, error: String((e as Error).message).slice(0, 120) })
    }
  }

  return NextResponse.json({ groups: results.length, results })
}
