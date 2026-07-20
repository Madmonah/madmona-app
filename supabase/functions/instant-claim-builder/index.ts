// instant-claim-builder v2 (13 Jun 2026)
// Drains instant_listing_drafts (where the WhatsApp webhook dumps inbound listings)
// into the REAL claim flow: builds a listing under the Madmona placeholder supplier
// + a listing_claims token, then WhatsApps the sender their /claim/<token> link.
// v2: LISTING_STATUS = 'published' — inbound listings go live in the marketplace
// automatically (no manual review step). Idempotent: a row is 'done' once its
// published_listing_id is set, so re-runs never duplicate/double-send.
//
// v3 (12 Jul 2026) — 🐛 BUGFIX: كان بيدمج أي draft بنفس الرقم + نفس الفئة خلال 18 ساعة
// في إعلان واحد. لما مطور بعت 5 مشاريع ورا بعض، الأجنت خلطهم: عنوان المشروع الأول +
// وصف المشروع الأخير + صور الكل → إعلانات العنوان فيها مش مطابق للمحتوى (شكوى HDP).
// الحل: (1) الدمج بقى مشروط بتشابه العنوان (>=60% كلمات مشتركة)، (2) الوصف مبيتستبدلش
// أبداً — بيتملى بس لو فاضي، (3) رسالة الـclaim بقت بتطلب من صاحب الإعلان يراجعه
// ويبلّغنا بأي غلط (محمد: "خليه ينشر ويكلم الناس ترجع عليه").
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { waSend } from '../_shared/wa-send.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SITE_URL = 'https://madmonacairo.com'
const MADMONA_SUPPLIER_ID = '7310f6ef-e474-4ef8-8b8a-388b5e1f5694'
const LISTING_STATUS = 'published' // inbound listings auto-published to the marketplace (no manual review)
const FALLBACK_SLUG = 'shop-misc'
const DEDUP_WINDOW_HOURS = 18
const BATCH = 30

const sb = () => createClient(SUPABASE_URL, SERVICE_KEY)

async function getMetaCreds(): Promise<{ phone_id: string; token: string }> {
  const { data } = await sb().from('whatsapp_config').select('key, value').in('key', ['phone_number_id', 'access_token'])
  const m = Object.fromEntries(((data || []) as Array<{ key: string; value: string }>).map(r => [r.key, r.value]))
  return { phone_id: m.phone_number_id, token: m.access_token }
}

async function sendWA(to: string, body: string): Promise<{ wa_id?: string; error?: string }> {
  // البوابة الموحّدة — مافيش نداء مباشر لـ Graph
  const r = await waSend({ to, text: body, agentName: 'المارد' })
  return r.ok ? { wa_id: r.wa_message_id ?? undefined } : { error: r.error }
}

async function resolveCategory(slug: string | null): Promise<string | null> {
  if (slug) {
    const { data } = await sb().from('categories').select('id').eq('slug', slug).limit(1).maybeSingle()
    if ((data as { id?: string } | null)?.id) return (data as { id: string }).id
  }
  const { data: fb } = await sb().from('categories').select('id').eq('slug', FALLBACK_SLUG).limit(1).maybeSingle()
  return (fb as { id?: string } | null)?.id || null
}

function genToken(): string { return crypto.randomUUID().replace(/-/g, '') }

// ⚠️ FIX (12 Jul 2026): الدمج القديم كان بيلمّ أي draft بنفس الرقم + نفس الفئة خلال 18 ساعة
// في إعلان واحد — فلما مطور يبعت مشروعين مختلفين ورا بعض كان بياخد عنوان الأول
// ووصف التاني وصور الاتنين → إعلان العنوان فيه مش مطابق للمحتوى (شكوى لويّ/HDP).
// دلوقتي بندمج بس لو العنوانين فعلاً بيوصفوا نفس الحاجة.
function normTitle(s: string): string {
  return s.toLowerCase()
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
    .replace(/[^a-z0-9؀-ۿ]+/g, ' ')
    .trim()
}

/** نسبة الكلمات المشتركة بين عنوانين (0..1) — بنتجاهل الأرقام والوحدات القصيرة */
function titleSimilarity(a: string, b: string): number {
  const toks = (s: string) => new Set(
    normTitle(s).split(' ').filter(t => t.length > 2 && !/^\d+$/.test(t))
  )
  const A = toks(a), B = toks(b)
  if (A.size === 0 || B.size === 0) return 0
  let shared = 0
  for (const t of A) if (B.has(t)) shared++
  return shared / Math.min(A.size, B.size)
}

const MERGE_SIMILARITY = 0.6 // لازم 60% من كلمات العنوان تتطابق عشان نعتبرهم نفس الإعلان

Deno.serve(async (_req) => {
  const out = { processed: 0, created: 0, merged: 0, sent: 0, send_failed: 0, skipped: 0, errors: [] as string[] }
  try {
    const { data: rows } = await sb().from('instant_listing_drafts')
      .select('id, contact_phone, contact_name, conversation_id, title, description, category_slug, image_urls')
      .is('published_listing_id', null)
      // ⚠️ كان بياخد الأقدم الأول. عندنا ١٣٤ مسودة مستنية، أغلبها
      //    قديمة وبتفشل كل مرة لنفس السبب (مفيش صورة) — فالدفعة
      //    بتفضل تلف عليهم والجديد عمره ما بيوصل.
      //    ٢٠ يوليو: مطعم بعت منيوه ومسودته فضلت واقفة ورا ١٠٦ مسودة
      //    قديمة فاشلة. الأحدث الأول — شغل النهاردة بيمشي دايمًا.
      .order('created_at', { ascending: false })
      .limit(BATCH)
    const drafts = (rows || []) as Array<Record<string, any>>

    for (const d of drafts) {
      try {
        if (!d.title || !d.contact_phone) { out.skipped++; continue }
        const categoryId = await resolveCategory(d.category_slug)
        if (!categoryId) { out.skipped++; out.errors.push(`${d.id}: no category`); continue }

        const title = String(d.title).slice(0, 120)
        const description = d.description ? String(d.description).slice(0, 1500) : null
        let imageUrls: string[] = Array.isArray(d.image_urls) ? d.image_urls.filter(Boolean) : []
        let usedPlaceholder = false
        const fullPhone = String(d.contact_phone)

        // 🖼️ سلسلة مصادر الصورة — النشر ماينفعش يقف عشان صورة.
        //
        //    الداتابيز بترفض نشر إعلان من غير صورة، وأغلب اللي بيبعت
        //    منيو بالنص مابيبعتش صور. النتيجة كانت إعلانات واقفة
        //    ومورّدين اتوعدوا ومحصلش.
        //
        //    بنجرّب بالترتيب:
        //      ١. صوره هو — أي صورة بعتها في المحادثة (أصدق مصدر)
        //      ٢. صورة التصنيف — مؤقتة لحد ما يبعت صوره
        //
        //    ⚠️ صورة التصنيف بتتعلّم `is_placeholder` عشان نعرف
        //       نستبدلها أول ما تيجي صورة حقيقية، وماتفضلش سايبة.
        if (!imageUrls.length) {
          const { data: convImgs } = await sb().from('whatsapp_messages')
            .select('body, created_at, whatsapp_conversations!inner(contact_phone)')
            .eq('whatsapp_conversations.contact_phone', fullPhone)
            .eq('direction', 'inbound')
            .eq('message_type', 'image')
            .order('created_at', { ascending: false })
            .limit(3)

          const found = ((convImgs || []) as Array<{ body: string }>)
            .map(m => (m.body || '').match(/https:\/\/\S+/)?.[0])
            .filter(Boolean) as string[]

          if (found.length) imageUrls = found
        }

        if (!imageUrls.length) {
          const { data: cat } = await sb().from('categories')
            .select('image_url').eq('id', categoryId).maybeSingle()
          const heroUrl = (cat as { image_url?: string } | null)?.image_url
          if (heroUrl) {
            imageUrls = [heroUrl]
            usedPlaceholder = true
          }
        }
        const windowStart = new Date(Date.now() - DEDUP_WINDOW_HOURS * 3600 * 1000).toISOString()

        // De-fragment: نجمع بس الرسايل اللي بتوصف **نفس الإعلان** (نفس الرقم + نفس الفئة
        // + عنوان متشابه). لو المطور بعت مشروع تاني مختلف → إعلان جديد مستقل.
        const { data: candidates } = await sb().from('listings')
          .select('id, title')
          .eq('supplier_id', MADMONA_SUPPLIER_ID)
          .eq('contact_phone', fullPhone)
          .eq('category_id', categoryId)
          .gte('created_at', windowStart)
          .order('created_at', { ascending: false })
          .limit(8)

        const match = ((candidates || []) as Array<{ id: string; title: string }>)
          .map(c => ({ ...c, score: titleSimilarity(c.title || '', title) }))
          .filter(c => c.score >= MERGE_SIMILARITY)
          .sort((a, b) => b.score - a.score)[0]

        let listingId: string
        if (match) {
          listingId = match.id
          const { data: have } = await sb().from('listing_photos').select('url').eq('listing_id', listingId)
          const haveSet = new Set(((have || []) as Array<{ url: string }>).map(p => p.url))
          const start = (have || []).length
          const newRows = imageUrls
            .filter(u => !haveSet.has(u))
            .map((u, i) => ({
              listing_id: listingId,
              url: u,
              display_order: start + i,
              is_primary: false,
              is_placeholder: usedPlaceholder,
            }))
          if (newRows.length) {
            await sb().from('listing_photos').insert(newRows)

            // 🔁 وصلت صورة حقيقية؟ نشيل المؤقتة فورًا.
            //    من غير ده الصورة العامة بتفضل سايبة والإعلان يبان
            //    ناقص رغم إن صاحبه بعت صوره.
            if (!usedPlaceholder) {
              await sb().from('listing_photos')
                .delete().eq('listing_id', listingId).eq('is_placeholder', true)
              await sb().from('listing_photos')
                .update({ is_primary: true, display_order: 0 })
                .eq('listing_id', listingId).eq('url', newRows[0].url)
            }
          }
          // ⛔ منستبدلش الوصف — بس نملاه لو فاضي. (الاستبدال هو اللي كان بيخلط المشاريع.)
          if (description && description.length > 40) {
            const { data: cur } = await sb().from('listings').select('description').eq('id', listingId).maybeSingle()
            const curDesc = (cur as { description?: string } | null)?.description || ''
            if (curDesc.length < 40) await sb().from('listings').update({ description }).eq('id', listingId)
          }
          out.merged++
        } else {
          // 🚨 الترتيب هنا مش تفصيلة — هو الفرق بين إن الإعلان يتنشر ولا لأ.
          //
          //    الكود القديم كان بيعمل insert بحالة النشر على طول وبعدين
          //    يربط الصور. والداتابيز فيها حارس بيرفض النشر من غير صورة
          //    («Cannot publish: at least one photo is required») —
          //    فكل إعلان جديد كان بيفشل عند أول سطر، حتى لو الصور
          //    موجودة وجاهزة في السطر اللي بعده.
          //
          //    اتكشفت يوم ٢٠ يوليو: مطعم بعت منيو وصورتين، والمسودة
          //    فشلت بنفس الرسالة رغم إن الصورتين متسجّلتين فعلاً.
          //
          //    الصح: ادخل مسودة → اربط الصور → وبعدين انشر.
          const { data: nl, error: lErr } = await sb().from('listings').insert({
            supplier_id: MADMONA_SUPPLIER_ID, category_id: categoryId,
            title, description, contact_phone: fullPhone, status: 'draft', country: 'EG'
          }).select('id').single()
          if (lErr || !nl) throw new Error('listing insert: ' + (lErr?.message || 'no row'))
          listingId = (nl as { id: string }).id

          if (imageUrls.length) {
            await sb().from('listing_photos').insert(
              imageUrls.map((u, i) => ({
                listing_id: listingId,
                url: u,
                display_order: i,
                is_primary: i === 0,
                is_placeholder: usedPlaceholder,
              }))
            )
          }

          // دلوقتي بس — والصور مربوطة — ينفع ننشر
          const { error: pubErr } = await sb().from('listings')
            .update({ status: LISTING_STATUS }).eq('id', listingId)
          if (pubErr) {
            // مفيش صور؟ يفضل مسودة بدل ما يضيع. ونقول السبب صريح.
            out.errors.push(`${d.id}: نُشر كمسودة — ${pubErr.message}`)
          }
          const token = genToken()
          await sb().from('listing_claims').insert({ listing_id: listingId, token, status: 'pending' })
          out.created++
          const claimUrl = `${SITE_URL}/claim/${token}`
          // ✅ الإعلان بينشر فوراً (سرعة)، بس بنطلب من صاحبه يراجعه ويقولنا لو فيه غلط.
          const msg =
            `🎉 جهّزنالك صفحة إعلانك على مضمونة ونشرناها — من غير ما تكتب ولا حرف!\n\n` +
            `📋 *${title}*\n${claimUrl}\n\n` +
            `🔍 *افتح اللينك وراجع الإعلان من فضلك* — اتأكد إن الاسم والصور والتفاصيل كلها صح.\n` +
            `لو فيه أي حاجة غلط أو ناقصة، ابعتلي هنا وأنا أصلّحها فوراً ✍️\n\n` +
            `أنا *المارد* 🧞 — مساعد مضمونة الذكي، موجود ٢٤/٧ على الرقم ده.\n` +
            `معاملاتك مضمونة 🟢`
          const res = await sendWA(fullPhone.replace(/^\+/, ''), msg)
          if (res.error) out.send_failed++; else out.sent++
          if (d.conversation_id) {
            await sb().from('whatsapp_messages').insert({
              conversation_id: d.conversation_id, direction: 'outbound', wa_message_id: res.wa_id,
              body: msg, message_type: 'text', status: res.error ? 'failed' : 'sent',
              status_updated_at: new Date().toISOString(), ai_generated: true, agent_name: 'instant-claim-builder',
              error_message: res.error, metadata: { listing_id: listingId, claim_token: token }
            })
          }
        }

        await sb().from('instant_listing_drafts').update({ published_listing_id: listingId }).eq('id', d.id)
        out.processed++
      } catch (e) {
        out.errors.push(`${d.id}: ${String(e).slice(0, 140)}`)
      }
    }
    return new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e).slice(0, 200) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
