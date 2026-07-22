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
  image_urls: string[] | null
}

function slugify(name: string): string {
  const base = name
    .replace(/[^ء-يa-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 50)
  return `${base || 'listing'}-${Math.random().toString(36).slice(2, 7)}`
}

async function ensureProfile(supa: ReturnType<typeof sb>, rawPhone: string) {
  const normalized = normalizePhone(rawPhone)
  if (!normalized) return null
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

export async function GET() {
  const supa = sb()
  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const { data: drafts } = await supa
    .from('instant_listing_drafts')
    .select('id, contact_phone, contact_name, title, description, category_slug, price_egp, period, image_urls')
    .eq('status', 'new')
    .lt('created_at', cutoff)
    .order('created_at')
    .limit(40)

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
          await supa.from('instant_listing_drafts').update({ status: 'needs_review' } as never).eq('id', d.id)
          continue
        }
        const slug = slugify(d.title)
        const { data: nl, error: le } = await supa.from('listings').insert({
          title: d.title.slice(0, 150), slug, status: 'draft', category_id: cat.id,
          supplier_id: supplierId, contact_phone: phone, phone_verified_at: new Date().toISOString(),
          description: d.description || d.title, country: 'EG', is_directory: false,
          price_egp: d.price_egp, price_on_request: d.price_egp == null,
        } as never).select('id, slug').single()
        if (le || !nl) { results.push({ phone, draft: d.id, error: 'listing: ' + le?.message }); continue }
        await supa.from('listing_photos').insert((d.image_urls || []).slice(0, 8).map((u, ix) => ({
          listing_id: nl.id, url: u, display_order: ix + 1, is_primary: ix === 0,
        })) as never)
        await supa.from('listings').update({ status: 'published', published_at: new Date().toISOString() } as never).eq('id', nl.id)
        await supa.from('instant_listing_drafts').update({ status: 'published', published_listing_id: nl.id } as never).eq('id', d.id)
        links.push(`${SITE}/marketplace/${nl.slug}`)
      }

      if (links.length) {
        await waNotify(supa, phone,
          `مبروك! 🎉 ${links.length > 1 ? 'إعلاناتك نزلت' : 'إعلانك نزل'} رسمي على مضمونة ✅\n\n` +
          links.slice(0, 3).map(l => `🔗 ${l}`).join('\n') +
          `\n\nأي حد يقدر يطلب منك أونلاين من دلوقتي والفلوس مضمونة لحد الاستلام. الطلبات بتوصلك على لوحة تحكمك:\n${SITE}/supplier/dashboard\n\nولو عايز تعدّل أي سعر أو صنف قولّي وأنا أظبطه 🧞\n*معاملاتك مضمونة* ✅`)
      }
      results.push({ phone, published: links.length, menu_items: food.length })
    } catch (e) {
      results.push({ phone, error: String((e as Error).message).slice(0, 120) })
    }
  }

  return NextResponse.json({ groups: results.length, results })
}
