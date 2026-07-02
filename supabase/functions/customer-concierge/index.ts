// customer-concierge — AI-powered listing match for customer leads.
// POST { contact_phone, conversation_id?, category?, city?, budget_max?, query? }
// Returns: { listings: [...], suggested_reply: "..." }
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CLAUDE_MODEL = 'claude-sonnet-4-6'
const SITE_URL = 'https://madmonacairo.com'

const CATEGORY_MAP: Record<string, string> = {
  'apartments': 'properties',
  'shaqqa': 'properties',
  'شقة': 'properties',
  'شقق': 'properties',
  'properties': 'properties',
  'cars': 'vehicles',
  'car': 'vehicles',
  'عربية': 'vehicles',
  'عربيات': 'vehicles',
  'سيارة': 'vehicles',
  'vehicles': 'vehicles',
  'workspace': 'workspaces',
  'office': 'workspaces',
  'ورك سبيس': 'workspaces',
  'مكتب': 'workspaces',
  'workspaces': 'workspaces',
  'chalet': 'tourism',
  'chalets': 'tourism',
  'شاليه': 'tourism',
  'شاليهات': 'tourism',
  'cameras': 'media',
  'camera': 'media',
  'كاميرا': 'media',
  'media': 'media',
  'equipment': 'equipment',
  'معدات': 'equipment',
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 })

  const body = await req.json()
  const { contact_phone, conversation_id, category, city, budget_max, query } = body

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Map category to canonical slug
  const canonicalCat = category ? (CATEGORY_MAP[category.toLowerCase()] || category) : null

  // Build query: find published listings matching criteria, ranked by views (popularity)
  let q = sb
    .from('listings')
    .select('id, title, slug, city, district, description, rating, reviews_count, views_count, bookings_count, category_id, categories!inner(slug, name_ar)')
    .eq('status', 'published')
    .order('views_count', { ascending: false, nullsFirst: false })
    .limit(5)

  if (canonicalCat) {
    q = q.like('categories.slug', `${canonicalCat}%`)
  }
  if (city) {
    q = q.ilike('city', `%${city}%`)
  }

  const { data: listings, error } = await q
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }

  // If no listings found, suggest a broader search
  if (!listings || listings.length === 0) {
    return new Response(JSON.stringify({
      ok: true,
      listings: [],
      suggested_reply: `للأسف مفيش ${category || 'منتج'} متوفر دلوقتي${city ? ' في ' + city : ''}. بص تقدر تتفرج على كل اللي عندنا هنا: ${SITE_URL}/marketplace${canonicalCat ? '?category=' + canonicalCat : ''}\n\nلو عاوز حد معين أنا هنا أساعدك 🙌`,
      query_received: { category, city, budget_max, query },
    }, null, 2), { headers: { 'Content-Type': 'application/json' } })
  }

  // Build reply using AI for personalization
  let suggestedReply = ''
  try {
    const { data: keyData } = await sb.rpc('get_anthropic_key')
    if (keyData) {
      const topListings = listings.slice(0, 3)
      const listingsContext = topListings.map((l: Record<string, unknown>, i: number) =>
        `${i + 1}. "${l.title}" - ${l.city}${l.rating ? ` ★${l.rating}` : ''} - ${SITE_URL}/marketplace/${(l.categories as { slug: string }).slug}/${l.slug}`
      ).join('\n')

      const system = `أنت Madmona Concierge. رد على عميل بيدور على ${category || 'haga'} للإيجار.

Query: ${query || category || 'general inquiry'}
City: ${city || 'any'}
Budget: ${budget_max || 'any'}

Top matches:
${listingsContext}

Make a SHORT (4-6 lines) reply in Egyptian Arabic colloquial:
- Greet briefly
- Suggest 2-3 listings with name + city + link
- Invite them to book
- DO NOT ask for personal info

Reply with plain Arabic text only.`

      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': keyData as string, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 800, system, messages: [{ role: 'user', content: query || `عايز ${category || 'haga'} للإيجار` }] })
      })

      if (r.ok) {
        const data = await r.json()
        suggestedReply = data?.content?.[0]?.text || ''
      }
    }
  } catch (e) {
    console.error('AI reply failed:', e)
  }

  // Fallback reply if AI didn't work
  if (!suggestedReply) {
    const top = listings[0] as Record<string, unknown>
    suggestedReply = `أهلاً 👋
لقيتلك منتجات جاهزة:
\n${listings.slice(0, 3).map((l: Record<string, unknown>, i: number) =>
      `${i + 1}️⃣ ${l.title} · ${l.city}\n${SITE_URL}/marketplace/${(l.categories as { slug: string }).slug}/${l.slug}`
    ).join('\n\n')}

أحجز أي واحد وأنا هنا لو محتاج مساعدة 🙌`
  }

  // Log the match for analytics
  if (contact_phone) {
    sb.from('site_events').insert({
      event_type: 'concierge_match',
      visitor_id: contact_phone,
      session_id: conversation_id || contact_phone,
      category: canonicalCat,
      metadata: { listings: listings.map((l: Record<string, unknown>) => l.id), query, city, budget_max }
    }).then(() => {}, () => {})
  }

  return new Response(JSON.stringify({
    ok: true,
    matched_count: listings.length,
    listings: listings.map((l: Record<string, unknown>) => ({
      id: l.id,
      title: l.title,
      city: l.city,
      district: l.district,
      url: `${SITE_URL}/marketplace/${(l.categories as { slug: string }).slug}/${l.slug}`,
      views: l.views_count,
      bookings: l.bookings_count,
      rating: l.rating,
      reviews_count: l.reviews_count,
    })),
    suggested_reply: suggestedReply,
  }, null, 2), { headers: { 'Content-Type': 'application/json' } })
})
