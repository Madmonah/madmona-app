// Customer Birthday Cron — runs daily, finds customers with today as birthday
// and queues WhatsApp greeting messages.
// Schedule via Supabase: SELECT cron.schedule('birthday-cron', '0 9 * * *', $$SELECT net.http_post(...)$$);

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const WA_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN')!
const WA_PHONE_ID = Deno.env.get('WHATSAPP_PHONE_ID')!
const BIRTHDAY_TEMPLATE = Deno.env.get('WHATSAPP_BIRTHDAY_TEMPLATE') || 'madmona_birthday_v1'

interface CustomerBirthday {
  id: string
  full_name: string
  phone: string
  supplier_id: string
  business_name: string
  customer_tier: string
}

serve(async (req) => {
  // Allow only POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const today = new Date()
  const month = today.getMonth() + 1
  const day = today.getDate()

  // Find customers whose birthday is today
  const { data: customers, error } = await supabase
    .from('customers')
    .select(`
      id, full_name, phone, supplier_id, customer_tier,
      suppliers!inner(business_name)
    `)
    .not('date_of_birth', 'is', null)
    .filter('date_of_birth', 'gte', `1900-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  // Filter to exact month/day match (Postgres filter on date can't match month/day alone)
  const todayBirthdays = (customers || []).filter((c: any) => {
    if (!c.date_of_birth) return false
    const dob = new Date(c.date_of_birth)
    return dob.getMonth() + 1 === month && dob.getDate() === day
  })

  let sent = 0
  let failed = 0
  const results: any[] = []

  for (const c of todayBirthdays) {
    try {
      // Send WhatsApp template
      const phone = c.phone.replace(/[^0-9]/g, '').replace(/^0/, '20')
      const waRes = await fetch(`https://graph.facebook.com/v18.0/${WA_PHONE_ID}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WA_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone,
          type: 'template',
          template: {
            name: BIRTHDAY_TEMPLATE,
            language: { code: 'ar' },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: c.full_name.split(' ')[0] }, // first name
                  { type: 'text', text: (c.suppliers as any)?.business_name || 'مضمونة' },
                ],
              },
            ],
          },
        }),
      })

      const waData = await waRes.json()

      // Log the message
      await supabase.from('whatsapp_campaign_messages').insert({
        supplier_id: c.supplier_id,
        customer_id: c.id,
        recipient_phone: phone,
        recipient_name: c.full_name,
        status: waRes.ok ? 'sent' : 'failed',
        message_content: `Birthday greeting · template: ${BIRTHDAY_TEMPLATE}`,
        whatsapp_msg_id: waData.messages?.[0]?.id || null,
        error_message: waRes.ok ? null : JSON.stringify(waData),
        sent_at: waRes.ok ? new Date().toISOString() : null,
      })

      if (waRes.ok) {
        sent++
        results.push({ customer: c.full_name, phone, status: 'sent' })
      } else {
        failed++
        results.push({ customer: c.full_name, phone, status: 'failed', error: waData })
      }
    } catch (err: any) {
      failed++
      results.push({ customer: c.full_name, phone: c.phone, status: 'error', error: err.message })
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      date: today.toISOString().slice(0, 10),
      birthdays_found: todayBirthdays.length,
      sent,
      failed,
      results,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
