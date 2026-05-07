// src/app/api/whatsapp/webhook/route.ts
// WhatsApp Cloud API webhook handler

import { NextRequest, NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { upsertConversation, logInboundMessage, sendText, getConversationHistory } from '@/lib/whatsapp'
import { callClaude, parseJsonResponse } from '@/lib/anthropic'
import { CUSTOMER_CONCIERGE_PROMPT } from '@/lib/agent-prompts/customer-concierge'

export const runtime = 'nodejs'
export const maxDuration = 30

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

interface WhatsAppWebhookPayload {
  object: string
  entry: Array<{
    id: string
    changes: Array<{
      value: {
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
            list_reply?: { id: string; title: string }
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

  try {
    await processPayload(payload)
  } catch (err) {
    console.error('WhatsApp webhook processing error:', err)
  }
  return NextResponse.json({ ok: true })
}

async function processPayload(payload: WhatsAppWebhookPayload): Promise<void> {
  if (payload.object !== 'whatsapp_business_account') return

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value
      if (value.messages) {
        for (const msg of value.messages) {
          await handleInboundMessage(msg, value.contacts)
        }
      }
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

  const related = await findRelated(fromPhone)
  const conversationId = await upsertConversation({
    phone: fromPhone,
    name: contactName,
    contactType: related.contactType,
    supplierId: related.supplierId,
    profileId: related.profileId,
  })
  if (!conversationId) return

  await logInboundMessage({ conversationId, wa_message_id: msg.id, body, messageType })

  // Trigger Customer Concierge to reply (realtime)
  if (msg.type === 'text' || messageType === 'button_reply' || messageType === 'list_reply') {
    await triggerCustomerConcierge({
      conversationId,
      contactType: related.contactType,
      currentMessage: body,
    })
  }
}

async function triggerCustomerConcierge(args: {
  conversationId: string
  contactType: string
  currentMessage: string
}): Promise<void> {
  try {
    const history = await getConversationHistory(args.conversationId, 15)

    // Get conversation phone for sending reply
    const { data: conv } = await supabaseAdmin
      .from('whatsapp_conversations')
      .select('contact_phone')
      .eq('id', args.conversationId)
      .single()
    type C = { contact_phone: string }
    const cv = conv as C | null
    if (!cv?.contact_phone) return

    const text = await callClaude({
      systemPrompt: CUSTOMER_CONCIERGE_PROMPT,
      userMessage: JSON.stringify({
        conversation_history: history,
        contact_type: args.contactType,
        current_message: args.currentMessage,
      }),
      maxTokens: 1024,
      temperature: 0.7,
    })
    const out = parseJsonResponse<{ reply: string; needs_human_handoff?: boolean }>(text)

    if (out.reply && !out.needs_human_handoff) {
      await sendText({
        to: cv.contact_phone,
        body: out.reply,
        conversationId: args.conversationId,
        agentName: 'customer-concierge',
        aiGenerated: true,
      })
    }
  } catch (err) {
    console.error('Customer concierge auto-reply failed:', err)
  }
}

async function findRelated(phone: string): Promise<{
  contactType: 'supplier_lead' | 'customer_lead' | 'existing_supplier' | 'existing_customer' | 'unknown'
  supplierId?: string
  profileId?: string
}> {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('phone', phone)
    .maybeSingle()
  type P = { id: string }
  const pr = profile as P | null
  if (pr?.id) {
    const { data: s } = await supabaseAdmin
      .from('marketplace_suppliers')
      .select('id')
      .eq('profile_id', pr.id)
      .maybeSingle()
    type S = { id: string }
    const sr = s as S | null
    if (sr?.id) return { contactType: 'existing_supplier', supplierId: sr.id, profileId: pr.id }
    return { contactType: 'existing_customer', profileId: pr.id }
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
