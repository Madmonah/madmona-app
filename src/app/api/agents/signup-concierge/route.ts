// src/app/api/agents/signup-concierge/route.ts
// Sign-up Concierge: triggered by Supabase webhook when a new marketplace_supplier is created
// Generates a personalized welcome email via Claude and sends it via Resend

import { NextRequest, NextResponse } from 'next/server'
import { callClaude, parseJsonResponse } from '@/lib/anthropic'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { SIGNUP_CONCIERGE_PROMPT } from '@/lib/agent-prompts/signup-concierge'

export const runtime = 'nodejs'
export const maxDuration = 60

interface ClaudeOutput {
  subject: string
  body_html: string
  next_action_link: string
  tone_score: string
  personalization_used: string[]
}

interface SupabaseWebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  schema: string
  record: {
    id: string
    profile_id: string
    business_name: string
    business_name_en?: string | null
    account_type: string
    kyc_status: string
    created_at: string
  }
  old_record: null | object
}

export async function POST(request: NextRequest) {
  // Verify webhook secret
  const authHeader = request.headers.get('authorization')
  const expectedSecret = process.env.AGENT_WEBHOOK_SECRET
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = (await request.json()) as SupabaseWebhookPayload

    // Only handle new supplier inserts
    if (payload.type !== 'INSERT' || payload.table !== 'marketplace_suppliers') {
      return NextResponse.json({ skipped: true, reason: 'not a new supplier' })
    }

    const supplier = payload.record

    // Fetch the profile to get email + full_name
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, phone, preferred_language')
      .eq('id', supplier.profile_id)
      .single()

    if (profileError || !profile) {
      console.error('Failed to fetch profile:', profileError)
      return NextResponse.json(
        { error: 'Profile not found', detail: profileError?.message },
        { status: 404 }
      )
    }

    if (!profile.email) {
      return NextResponse.json(
        { skipped: true, reason: 'profile has no email' },
        { status: 200 }
      )
    }

    // Build the user message for Claude
    const userMessage = JSON.stringify({
      full_name: profile.full_name,
      business_name: supplier.business_name,
      business_name_en: supplier.business_name_en,
      email: profile.email,
      account_type: supplier.account_type,
      preferred_language: profile.preferred_language ?? 'ar',
    })

    // Call Claude
    const claudeText = await callClaude({
      systemPrompt: SIGNUP_CONCIERGE_PROMPT,
      userMessage,
      maxTokens: 2048,
      temperature: 0.7,
    })

    const output = parseJsonResponse<ClaudeOutput>(claudeText)

    // Send the email via Resend (using existing helper)
    const sendResult = await sendEmail({
      to: profile.email,
      subject: output.subject,
      html: output.body_html,
      replyTo: 'support@madmonacairo.com',
    })

    if (!sendResult.ok) {
      throw new Error(`Email send failed: ${sendResult.error}`)
    }

    // Log the outreach to Supabase for tracking
    // Schema note: outreach_log requires phone (NOT NULL legacy field) — use empty string for email channel
    const { error: logError } = await supabaseAdmin.from('outreach_log').insert({
      agent_name: 'signup-concierge',
      target_type: 'supplier',
      target_id: supplier.id,
      channel: 'email',
      phone: profile.phone ?? '',
      message_text: output.body_html,
      subject: output.subject,
      body: output.body_html,
      status: 'sent',
      sent_at: new Date().toISOString(),
      external_id: sendResult.id,
      model_used: 'claude-sonnet-4-5',
      metadata: {
        tone_score: output.tone_score,
        personalization_used: output.personalization_used,
        recipient_email: profile.email,
      },
    } as never)

    if (logError) {
      // Non-fatal — email already sent
      console.warn('Failed to log outreach:', logError.message)
    }

    return NextResponse.json({
      success: true,
      supplier_id: supplier.id,
      email_id: sendResult.id,
      subject: output.subject,
    })
  } catch (err) {
    const error = err as Error
    console.error('Sign-up Concierge error:', error)
    return NextResponse.json(
      { error: 'Agent failed', detail: error.message },
      { status: 500 }
    )
  }
}
