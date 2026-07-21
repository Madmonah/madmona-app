// شات مضمونة — نفس مخ المارد، رد مباشر بدون واتساب. بيدعم نص + صور + صوت + ملفات.
import { NextRequest, NextResponse } from 'next/server'
import { supabaseUntyped } from '@/lib/supabase'
import { parseJsonResponse } from '@/lib/anthropic'
import { callMaridWithTools } from '@/lib/marid-brain'
import { processIncomingMedia, type MediaInput } from '@/lib/marid-media'
import { CUSTOMER_CONCIERGE_PROMPT } from '@/lib/agent-prompts/customer-concierge'
import { isAdmin } from '@/lib/marid-admin'

export const runtime = 'nodejs'
export const maxDuration = 60

function normalizeEg(raw: string): string {
  let d = (raw || '').replace(/\D/g, '')
  if (!d) return ''
  if (d.startsWith('0') && d.length === 11) d = '20' + d.slice(1)
  if (d.length === 10) d = '20' + d
  return d
}

export async function POST(request: NextRequest) {
  let body: { phone?: string; name?: string; message?: string; media?: MediaInput }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 })
  }

  const phone = normalizeEg(body.phone || '')
  const name = (body.name || '').trim() || null
  const message = (body.message || '').trim()
  const media = body.media && body.media.data_base64 ? body.media : null

  if (!phone || phone.length < 11) {
    return NextResponse.json({ ok: false, error: 'رقم غير صحيح' }, { status: 400 })
  }
  if (!message && !media) {
    return NextResponse.json({ ok: false, error: 'الرسالة فاضية' }, { status: 400 })
  }

  try {
    // ── ١) المحادثة (بالرقم + قناة الويب) ──────────────────────────────
    const { data: existing } = await supabaseUntyped
      .from('whatsapp_conversations')
      .select('id')
      .eq('contact_phone', phone)
      .eq('session_id', 'web')
      .maybeSingle()

    let conversationId = (existing as { id?: string } | null)?.id
    if (!conversationId) {
      const { data: created, error: cErr } = await supabaseUntyped
        .from('whatsapp_conversations')
        .insert({
          contact_phone: phone,
          contact_name: name,
          session_id: 'web',
          status: 'active',
          last_message_at: new Date().toISOString(),
          last_message_direction: 'inbound',
          last_inbound_at: new Date().toISOString(),
        })
        .select('id')
        .single()
      if (cErr) throw cErr
      conversationId = (created as { id: string }).id
    } else if (name) {
      await supabaseUntyped.from('whatsapp_conversations').update({ contact_name: name }).eq('id', conversationId)
    }

    // ── ٢) الميديا (لو موجودة): حفظ + تجهيز للمارد ──────────────────────
    let mediaBlocks: Array<Record<string, unknown>> = []
    let savedMediaUrl: string | null = null
    let effectiveText = message
    if (media) {
      const r = await processIncomingMedia(media, phone)
      mediaBlocks = r.blocks
      savedMediaUrl = r.savedUrl
      if (!effectiveText) effectiveText = r.textHint
    }

    // ── ٣) تسجيل رسالة العميل ───────────────────────────────────────────
    const logBody = media
      ? `[${media.type}${media.filename ? ': ' + media.filename : ''}]${message ? ' ' + message : ''}${savedMediaUrl ? ' ' + savedMediaUrl : ''}`
      : message
    await supabaseUntyped.from('whatsapp_messages').insert({
      conversation_id: conversationId,
      direction: 'inbound',
      body: logBody,
      message_type: media ? media.type : 'text',
      status: 'delivered',
    })

    // ── ٤) تاريخ المحادثة ───────────────────────────────────────────────
    const { data: hist } = await supabaseUntyped
      .from('whatsapp_messages')
      .select('direction, body, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(24)
    const histRows = ((hist ?? []) as Array<{ direction: string; body: string }>).reverse()
    const historyText = histRows
      .slice(0, -1)
      .map((h) => `${h.direction === 'inbound' ? 'العميل' : 'المارد'}: ${h.body || ''}`)
      .join('\n')
    const userMessage = historyText
      ? `سياق المحادثة السابقة:\n${historyText}\n\n---\nرسالة العميل الحالية:\n${effectiveText}`
      : effectiveText

    // ── ٥) رد المارد ────────────────────────────────────────────────────
    const raw = await callMaridWithTools({
      systemPrompt: CUSTOMER_CONCIERGE_PROMPT,
      userMessage,
      mediaBlocks,
      savedMediaUrl,
      senderPhone: phone,
      senderName: name,
      admin: isAdmin(phone),
    })

    let reply = ''
    try {
      reply = (parseJsonResponse<{ reply?: string }>(raw).reply || '').trim()
    } catch {
      reply = (raw || '').trim()
    }
    if (!reply && raw.trim().length > 10) reply = raw.trim().slice(0, 1200)
    if (!reply) reply = 'ثانية واحدة — ممكن تعيد صياغة طلبك؟'
    reply = reply.replace(/\*\*([\s\S]+?)\*\*/g, '$1').replace(/^#{1,6}\s+/gm, '').replace(/\n{3,}/g, '\n\n').trim()

    // ── ٦) تسجيل الرد ───────────────────────────────────────────────────
    await supabaseUntyped.from('whatsapp_messages').insert({
      conversation_id: conversationId,
      direction: 'outbound',
      body: reply,
      message_type: 'text',
      status: 'sent',
      ai_generated: true,
      agent_name: 'المارد',
    })
    await supabaseUntyped
      .from('whatsapp_conversations')
      .update({ last_message_at: new Date().toISOString(), last_message_direction: 'outbound', last_outbound_at: new Date().toISOString() })
      .eq('id', conversationId)

    return NextResponse.json({ ok: true, reply, conversationId })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    console.error('[chat]', msg)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
