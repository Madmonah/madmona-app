// Booking Notifications Cron — runs every 15 min
// Sends pending booking confirmations + reminders via WhatsApp Cloud API
// Schedule: SELECT cron.schedule('booking-notif', '*/15 * * * *', $$SELECT net.http_post(...)$$);

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const WA_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN')!
const WA_PHONE_ID = Deno.env.get('WHATSAPP_PHONE_ID')!

// Template names (must be approved in Meta)
const TEMPLATES: Record<string, string> = {
  confirmation: Deno.env.get('WA_TEMPLATE_BOOKING_CONFIRM') || 'madmona_booking_confirm_v1',
  reminder_24h: Deno.env.get('WA_TEMPLATE_BOOKING_REMINDER') || 'madmona_booking_reminder_v1',
  reminder_2h: Deno.env.get('WA_TEMPLATE_BOOKING_REMINDER') || 'madmona_booking_reminder_v1',
  followup: Deno.env.get('WA_TEMPLATE_BOOKING_FOLLOWUP') || 'madmona_booking_followup_v1',
}

const APP_BASE_URL = Deno.env.get('APP_BASE_URL') || 'https://madmonacairo.com'

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Get pending notifications that are due (scheduled_for <= now)
  const { data: notifications, error } = await supabase
    .from('booking_notifications')
    .select(`
      id, booking_id, customer_phone, customer_name, notification_type, supplier_id,
      branch_bookings!inner(scheduled_at, service_name_snapshot, price_egp,
        supplier_branches(name), suppliers(business_name))
    `)
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .limit(50)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  let sent = 0
  let failed = 0
  const results: any[] = []

  for (const notif of notifications || []) {
    try {
      const booking = (notif as any).branch_bookings
      const businessName = booking?.suppliers?.business_name || 'مضمونة'
      const branchName = booking?.supplier_branches?.name || ''
      const serviceName = booking?.service_name_snapshot || 'خدمة'
      const scheduledAt = new Date(booking?.scheduled_at)
      const dateStr = scheduledAt.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })
      const timeStr = scheduledAt.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
      const firstName = (notif.customer_name || '').split(' ')[0] || 'عميلتنا'

      // Time-based Arabic greeting (Cairo time) — replaces the old fixed "يا مدير" prefix.
      // Folded into the existing first parameter so the template param count stays the same.
      const cairoHour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', hour: 'numeric', hour12: false }).format(new Date()))
      const greeting = (cairoHour >= 5 && cairoHour < 12) ? 'صباح الخير' : 'مساء الخير'
      const hello = `${greeting} يا ${firstName}`

      const phone = notif.customer_phone.replace(/[^0-9]/g, '').replace(/^0/, '20')
      const templateName = TEMPLATES[notif.notification_type] || TEMPLATES.confirmation

      // Build body params per notification type
      let bodyParams: any[]
      if (notif.notification_type === 'followup') {
        // Review request: greeting+name, service, review link
        bodyParams = [
          { type: 'text', text: hello },
          { type: 'text', text: serviceName },
          { type: 'text', text: `${APP_BASE_URL}/review/${notif.booking_id}` },
        ]
      } else {
        bodyParams = [
          { type: 'text', text: hello },
          { type: 'text', text: serviceName },
          { type: 'text', text: dateStr },
          { type: 'text', text: timeStr },
          { type: 'text', text: businessName },
        ]
      }

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
            name: templateName,
            language: { code: 'ar' },
            components: [{ type: 'body', parameters: bodyParams }],
          },
        }),
      })

      const waData = await waRes.json()

      await supabase.from('booking_notifications').update({
        status: waRes.ok ? 'sent' : 'failed',
        whatsapp_msg_id: waData.messages?.[0]?.id || null,
        sent_at: waRes.ok ? new Date().toISOString() : null,
        error_message: waRes.ok ? null : JSON.stringify(waData),
        message_content: `${notif.notification_type} · ${serviceName} · ${dateStr} ${timeStr}`,
      }).eq('id', notif.id)

      if (waRes.ok) { sent++; results.push({ type: notif.notification_type, phone, status: 'sent' }) }
      else { failed++; results.push({ type: notif.notification_type, phone, status: 'failed', error: waData }) }
    } catch (err: any) {
      failed++
      await supabase.from('booking_notifications').update({
        status: 'failed', error_message: err.message,
      }).eq('id', notif.id)
      results.push({ id: notif.id, status: 'error', error: err.message })
    }
  }

  return new Response(
    JSON.stringify({ success: true, processed: notifications?.length || 0, sent, failed, results }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
