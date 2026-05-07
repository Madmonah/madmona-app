// src/app/api/agents/supplier-outreach/route.ts
// Supplier Outreach Agent
// Finds suppliers WITHOUT listings, sends them a personalized WhatsApp message.

import { NextRequest, NextResponse } from 'next/server'
import { callClaude, parseJsonResponse } from '@/lib/anthropic'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { sendText, normalizePhone, upsertConversation } from '@/lib/whatsapp'
import { SUPPLIER_OUTREACH_PROMPT } from '@/lib/agent-prompts/supplier-outreach'

export const runtime = 'nodejs'
export const maxDuration = 60

const AGENT_NAME = 'supplier-outreach'

// Throttle config: max 50 per cron run, max 100 per 24h (safety net), max 200 per 7d
const MAX_PER_RUN = 50
const MAX_PER_24H = 100
const MAX_PER_7D = 200

interface ClaudeOutput {
  message: string
  personalization_used: string[]
  tone_check: string
}

interface SupplierToContact {
  supplier_id: string
  profile_id: string
  business_name: string
  business_name_en?: string | null
  account_type: string
  full_name: string | null
  phone: string | null
  preferred_language: string | null
}

/**
 * Hard throttle: count messages sent in last 24h and 7d.
 * If we've already hit the cap, bail out before doing anything.
 */
async function checkGlobalThrottle(): Promise<{ ok: boolean; reason?: string }> {
  const now = Date.now()
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString()
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { count: count24h } = await supabaseAdmin
    .from('outreach_log')
    .select('*', { count: 'exact', head: true })
    .eq('agent_name', AGENT_NAME)
    .eq('status', 'sent')
    .gte('sent_at', oneDayAgo)

  if ((count24h ?? 0) >= MAX_PER_24H) {
    return { ok: false, reason: `Hit 24h cap (${MAX_PER_24H}). Sent ${count24h} in last 24h.` }
  }

  const { count: count7d } = await supabaseAdmin
    .from('outreach_log')
    .select('*', { count: 'exact', head: true })
    .eq('agent_name', AGENT_NAME)
    .eq('status', 'sent')
    .gte('sent_at', sevenDaysAgo)

  if ((count7d ?? 0) >= MAX_PER_7D) {
    return { ok: false, reason: `Hit 7d cap (${MAX_PER_7D}). Sent ${count7d} in last 7 days.` }
  }

  return { ok: true }
}

async function findSuppliersNeedingOutreach(
  limit: number,
  specificSupplierId?: string
): Promise<SupplierToContact[]> {
  if (specificSupplierId) {
    const { data } = await supabaseAdmin
      .from('marketplace_suppliers')
      .select('id, profile_id, business_name, business_name_en, account_type')
      .eq('id', specificSupplierId)
      .maybeSingle()

    type S = {
      id: string
      profile_id: string
      business_name: string
      business_name_en: string | null
      account_type: string
    }
    const s = data as S | null
    if (!s) return []

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, phone, preferred_language')
      .eq('id', s.profile_id)
      .maybeSingle()

    type P = { full_name: string | null; phone: string | null; preferred_language: string | null }
    const p = (profile as P | null) ?? { full_name: null, phone: null, preferred_language: null }

    return [{
      supplier_id: s.id,
      profile_id: s.profile_id,
      business_name: s.business_name,
      business_name_en: s.business_name_en,
      account_type: s.account_type,
      full_name: p.full_name,
      phone: p.phone,
      preferred_language: p.preferred_language,
    }]
  }

  // Find approved suppliers, oldest first (longer waiting = higher priority)
  const { data: suppliers } = await supabaseAdmin
    .from('marketplace_suppliers')
    .select('id, profile_id, business_name, business_name_en, account_type, kyc_status, created_at')
    .eq('kyc_status', 'approved')
    .order('created_at', { ascending: true })
    .limit(200) // scan more, filter down

  type SRow = {
    id: string
    profile_id: string
    business_name: string
    business_name_en: string | null
    account_type: string
  }
  const supplierRows = (suppliers ?? []) as SRow[]
  if (supplierRows.length === 0) return []

  const candidates: SupplierToContact[] = []
  for (const s of supplierRows) {
    if (candidates.length >= limit) break

    // Has listings?
    const { count: listingCount } = await supabaseAdmin
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('supplier_id', s.id)
    if ((listingCount ?? 0) > 0) continue

    // Already outreached?
    const { count: outreachCount } = await supabaseAdmin
      .from('outreach_log')
      .select('*', { count: 'exact', head: true })
      .eq('agent_name', AGENT_NAME)
      .eq('target_id', s.id)
    if ((outreachCount ?? 0) > 0) continue

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, phone, preferred_language')
      .eq('id', s.profile_id)
      .maybeSingle()

    type P = { full_name: string | null; phone: string | null; preferred_language: string | null }
    const p = profile as P | null
    if (!p?.phone) continue

    candidates.push({
      supplier_id: s.id,
      profile_id: s.profile_id,
      business_name: s.business_name,
      business_name_en: s.business_name_en,
      account_type: s.account_type,
      full_name: p.full_name,
      phone: p.phone,
      preferred_language: p.preferred_language,
    })
  }

  return candidates
}

async function generateMessage(supplier: SupplierToContact): Promise<ClaudeOutput> {
  const userMessage = JSON.stringify({
    full_name: supplier.full_name,
    business_name: supplier.business_name,
    business_name_en: supplier.business_name_en,
    account_type: supplier.account_type,
    preferred_language: supplier.preferred_language ?? 'ar',
  })

  const claudeText = await callClaude({
    systemPrompt: SUPPLIER_OUTREACH_PROMPT,
    userMessage,
    maxTokens: 1024,
    temperature: 0.7,
  })

  return parseJsonResponse<ClaudeOutput>(claudeText)
}

async function processSingle(supplier: SupplierToContact, dryRun: boolean): Promise<{
  supplier_id: string
  business_name: string
  status: 'sent' | 'failed' | 'skipped' | 'dry_run'
  message?: string
  wa_message_id?: string
  error?: string
}> {
  if (!supplier.phone) {
    return {
      supplier_id: supplier.supplier_id,
      business_name: supplier.business_name,
      status: 'skipped',
      error: 'no phone',
    }
  }

  let output: ClaudeOutput
  try {
    output = await generateMessage(supplier)
  } catch (err) {
    return {
      supplier_id: supplier.supplier_id,
      business_name: supplier.business_name,
      status: 'failed',
      error: `claude_error: ${err instanceof Error ? err.message : 'unknown'}`,
    }
  }

  if (dryRun) {
    return {
      supplier_id: supplier.supplier_id,
      business_name: supplier.business_name,
      status: 'dry_run',
      message: output.message,
    }
  }

  const conversationId = await upsertConversation({
    phone: supplier.phone,
    name: supplier.full_name ?? supplier.business_name,
    contactType: 'existing_supplier',
    supplierId: supplier.supplier_id,
    profileId: supplier.profile_id,
    agentName: AGENT_NAME,
  })

  const sendResult = await sendText({
    to: supplier.phone,
    body: output.message,
    conversationId: conversationId ?? undefined,
    agentName: AGENT_NAME,
    aiGenerated: true,
  })

  const phone = normalizePhone(supplier.phone)
  await supabaseAdmin.from('outreach_log').insert({
    agent_name: AGENT_NAME,
    target_type: 'supplier',
    target_id: supplier.supplier_id,
    channel: 'whatsapp',
    phone,
    message_text: output.message,
    body: output.message,
    status: sendResult.ok ? 'sent' : 'failed',
    sent_at: sendResult.ok ? new Date().toISOString() : null,
    external_id: sendResult.wa_message_id ?? null,
    model_used: 'claude-sonnet-4-5',
    metadata: {
      personalization_used: output.personalization_used,
      tone_check: output.tone_check,
      conversation_id: conversationId,
      error: sendResult.error,
    },
  } as never)

  return {
    supplier_id: supplier.supplier_id,
    business_name: supplier.business_name,
    status: sendResult.ok ? 'sent' : 'failed',
    message: output.message,
    wa_message_id: sendResult.wa_message_id,
    error: sendResult.error,
  }
}

async function runAgent(opts: {
  dryRun?: boolean
  supplierId?: string
  limit?: number
}): Promise<{
  success: boolean
  candidates_count: number
  results: Array<unknown>
  duration_ms: number
  throttle_status?: string
}> {
  const runStart = Date.now()
  const limit = Math.min(opts.limit ?? MAX_PER_RUN, MAX_PER_RUN)

  const { data: run } = await supabaseAdmin
    .from('agent_runs')
    .insert({
      agent_name: AGENT_NAME,
      trigger_type: opts.supplierId ? 'manual' : 'cron',
      status: 'started',
      input_payload: opts as unknown as Record<string, unknown>,
    } as never)
    .select('id')
    .single()
  const runId = (run as { id?: string } | null)?.id

  try {
    // Skip global throttle for dry-run and single-supplier tests
    let throttleStatus = 'not_checked'
    if (!opts.dryRun && !opts.supplierId) {
      const throttleCheck = await checkGlobalThrottle()
      if (!throttleCheck.ok) {
        if (runId) {
          await supabaseAdmin
            .from('agent_runs')
            .update({
              status: 'success',
              finished_at: new Date().toISOString(),
              duration_ms: Date.now() - runStart,
              output_summary: { skipped: true, reason: throttleCheck.reason },
            } as never)
            .eq('id', runId)
        }
        return {
          success: true,
          candidates_count: 0,
          results: [],
          duration_ms: Date.now() - runStart,
          throttle_status: `BLOCKED: ${throttleCheck.reason}`,
        }
      }
      throttleStatus = 'ok'
    }

    const candidates = await findSuppliersNeedingOutreach(limit, opts.supplierId)

    const results: unknown[] = []
    for (const c of candidates) {
      const r = await processSingle(c, opts.dryRun ?? false)
      results.push(r)
    }

    if (runId) {
      await supabaseAdmin
        .from('agent_runs')
        .update({
          status: 'success',
          finished_at: new Date().toISOString(),
          duration_ms: Date.now() - runStart,
          output_summary: {
            candidates_count: candidates.length,
            sent: results.filter((r) => (r as { status: string }).status === 'sent').length,
            failed: results.filter((r) => (r as { status: string }).status === 'failed').length,
            skipped: results.filter((r) => (r as { status: string }).status === 'skipped').length,
            dry_run: opts.dryRun ?? false,
          },
        } as never)
        .eq('id', runId)
    }

    return {
      success: true,
      candidates_count: candidates.length,
      results,
      duration_ms: Date.now() - runStart,
      throttle_status: throttleStatus,
    }
  } catch (err) {
    const error = err as Error
    if (runId) {
      await supabaseAdmin
        .from('agent_runs')
        .update({
          status: 'error',
          finished_at: new Date().toISOString(),
          duration_ms: Date.now() - runStart,
          error_message: error.message,
        } as never)
        .eq('id', runId)
    }
    throw error
  }
}

function checkAuth(request: NextRequest, useCronSecret: boolean): boolean {
  const auth = request.headers.get('authorization')
  const expected = useCronSecret ? process.env.CRON_SECRET : process.env.AGENT_WEBHOOK_SECRET
  if (!expected) return false
  return auth === `Bearer ${expected}`
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request, true)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await runAgent({})
    return NextResponse.json(result)
  } catch (err) {
    const error = err as Error
    return NextResponse.json({ error: 'Agent failed', detail: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request, false)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  let body: { dryRun?: boolean; supplierId?: string; limit?: number } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  try {
    const result = await runAgent({
      dryRun: body.dryRun,
      supplierId: body.supplierId,
      limit: body.limit,
    })
    return NextResponse.json(result)
  } catch (err) {
    const error = err as Error
    return NextResponse.json({ error: 'Agent failed', detail: error.message }, { status: 500 })
  }
}
