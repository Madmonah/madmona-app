// src/app/api/whatsapp/webhook/route.ts
// WhatsApp Cloud API webhook handler
//
// Meta sends 2 types of POST events here:
//   1. Message status updates (sent/delivered/read/failed)
//   2. Inbound messages from customers
//
// GET requests are used by Meta to verify webhook ownership

import { NextRequest, NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { upsertConversation, logInboundMessage } from '@/lib/whatsapp'

export const runtime = 'nodejs'
export const maxDuration = 30

// ============================================================================
// GET — webhook verification (Meta calls this once to confirm we own the URL)
// ============================================================================

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN

  if (mode === 'subscribe' && token === expectedToken && challenge) {
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  return NextResponse.json({ error: 'verification failed' }, { status: 403 })
}

// ============================================================================
// POST — receive events
// ============================================================================

interface WhatsAppWebhookPayload {
  object: string
  entry: Array<{
    id: string
    changes: Array<{
      value: {
        messaging_product?: string
        metadata?: { display_phone_number?: string; phone_number_id?: string }
        contacts?: Array<{ profile?: { name?: string }; wa_id: string }>
        messages?: Array<{
          from: string
          id: string
          timestamp: string
          type: string
          text?: { body: string }
          button?: { text: string; payload: string }
          interactive?: {
            type: string
            button_reply?: { id: string; title: string }
            list_reply?: { id: string; title: string; description?: string }
          }
        }>
        statuses?: Array<{
          id: string
          status: 'sent' | 'delivered' | 'read' | 'failed'
          timestamp: string
          recipient_id: string
          errors?: Array<{ code: number; title: string; message?: string }>
        }>
      }
      field: string
    }>
  }>
}

export async function POST(request: NextRequest) {
  let payload: WhatsAppWebhookPayload
  try {
    payload = (await request.json()) as WhatsAppWebhookPayload
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  // Always return 200 quickly to Meta — process async
  // (Meta will retry if we return non-2xx, leading to duplicates)
  try {
    await processPayload(payload)
  } catch (err) {
    console.error('WhatsApp webhook processing error:', err)
    // still return 200 to prevent retries
  }

  return NextResponse.json({ ok: true })
}

async function processPayload(payload: WhatsAppWebhookPayload): Promise<void> {
  if (payload.object !== 'whatsapp_business_account') return

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value

      // Inbound messages
      if (value.messages) {
        for (const msg of value.messages) {
          await handleInboundMessage(msg, value.contacts)
        }
      }

      // Status updates
      if (value.statuses) {
        for (const status of value.statuses) {
          await handleStatusUpdate(status)
        }
      }
    }
  }
}

async function handleInboundMessage(
  msg: NonNullable<WhatsAppWebhookPayload['entry'][0]['changes'][0]['value']['messages']>[0],
  contacts: WhatsAppWebhookPayload['entry'][0]['changes'][0]['value']['contacts']
): Promise<void> {
  const fromPhone = msg.from
  const contactName = contacts?.find((c) => c.wa_id === fromPhone)?.profile?.name

  // Extract body based on message type
  let body = ''
  let messageType: string = msg.type
  if (msg.type === 'text' && msg.text) {
    body = msg.text.body
  } else if (msg.type === 'button' && msg.button) {
    body = msg.button.text
    messageType = 'button_reply'
  } else if (msg.type === 'interactive' && msg.interactive) {
    if (msg.interactive.button_reply) {
      body = msg.interactive.button_reply.title
      messageType = 'button_reply'
    } else if (msg.interactive.list_reply) {
      body = msg.interactive.list_reply.title
      messageType = 'list_reply'
    }
  } else {
    body = `[unsupported message type: ${msg.type}]`
  }

  // Find related supplier/profile
  const related = await findRelated(fromPhone)

  // Upsert conversation
  const conversationId = await upsertConversation({
    phone: fromPhone,
    name: contactName,
    contactType: related.contactType,
    supplierId: related.supplierId,
    profileId: related.profileId,
  })

  if (!conversationId) {
    console.error('Failed to upsert conversation for', fromPhone)
    return
  }

  await logInboundMessage({
    conversationId,
    wa_message_id: msg.id,
    body,
    messageType,
  })

  // Trigger any auto-responder agents here in the future
  // (e.g., if conversation has agent_name = 'lead-conversion', call that agent)
}

async function findRelated(phone: string): Promise<{
  contactType: 'supplier_lead' | 'customer_lead' | 'existing_supplier' | 'existing_customer' | 'unknown'
  supplierId?: string
  profileId?: string
}> {
  // Try matching by phone in profiles
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('phone', phone)
    .maybeSingle()

  type ProfileRow = { id: string }
  const profileRow = profile as ProfileRow | null

  if (profileRow?.id) {
    const { data: supplier } = await supabaseAdmin
      .from('marketplace_suppliers')
      .select('id')
      .eq('profile_id', profileRow.id)
      .maybeSingle()
    type SupplierRow = { id: string }
    const supplierRow = supplier as SupplierRow | null
    if (supplierRow?.id) {
      return {
        contactType: 'existing_supplier',
        supplierId: supplierRow.id,
        profileId: profileRow.id,
      }
    }
    return { contactType: 'existing_customer', profileId: profileRow.id }
  }

  return { contactType: 'unknown' }
}

async function handleStatusUpdate(
  status: NonNullable<WhatsAppWebhookPayload['entry'][0]['changes'][0]['value']['statuses']>[0]
): Promise<void> {
  const errCode = status.errors?.[0]?.code?.toString()
  const errMsg = status.errors?.[0]?.title

  await supabaseAdmin
    .from('whatsapp_messages')
    .update({
      status: status.status,
      status_updated_at: new Date().toISOString(),
      error_code: errCode ?? null,
      error_message: errMsg ?? null,
    } as never)
    .eq('wa_message_id', status.id)
}
