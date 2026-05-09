// src/lib/agent-runners/phase6-runners.ts
// Phase 6 — Inter-agent communication
// orchestrator + message-handler

import { supabase as supabaseAdmin } from '@/lib/supabase'
import { callClaude, parseJsonResponse } from '@/lib/anthropic'
import { ORCHESTRATOR_PROMPT } from '@/lib/agent-prompts/orchestrator'

// =============================================================================
// HELPER: Send message between agents (called by ANY agent)
// =============================================================================
export async function sendAgentMessage(args: {
  fromAgent: string
  toAgent: string
  messageType: 'request' | 'response' | 'notification' | 'handoff' | 'collaboration'
  subject: string
  payload: Record<string, unknown>
  priority?: 'urgent' | 'high' | 'normal' | 'low'
  responseRequired?: boolean
  threadId?: string
  parentMessageId?: string
}): Promise<string | null> {
  const { data, error } = await supabaseAdmin.rpc('send_agent_message', {
    p_from_agent: args.fromAgent,
    p_to_agent: args.toAgent,
    p_message_type: args.messageType,
    p_subject: args.subject,
    p_payload: args.payload as never,
    p_response_required: args.responseRequired ?? false,
    p_priority: args.priority ?? 'normal',
    p_thread_id: args.threadId ?? null,
    p_parent_message_id: args.parentMessageId ?? null,
  })

  if (error) {
    console.error('[sendAgentMessage]', error)
    return null
  }
  return data as string
}

// =============================================================================
// ORCHESTRATOR — given a goal, plans + dispatches tasks to multiple agents
// =============================================================================
export async function runOrchestrator(args?: {
  goal?: string
  context?: Record<string, unknown>
  constraints?: Record<string, unknown>
}): Promise<Record<string, unknown>> {
  if (!args?.goal) {
    return { skipped: true, reason: 'no goal provided' }
  }

  // Get current platform state for context
  const [{ count: listings }, { count: suppliers }, { count: bookings }] = await Promise.all([
    supabaseAdmin.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabaseAdmin.from('marketplace_suppliers').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('marketplace_bookings').select('*', { count: 'exact', head: true }),
  ])

  // Ask Claude to plan
  const text = await callClaude({
    systemPrompt: ORCHESTRATOR_PROMPT,
    userMessage: JSON.stringify({
      goal: args.goal,
      context: {
        ...args.context,
        platform_state: {
          listings_count: listings ?? 0,
          suppliers_count: suppliers ?? 0,
          bookings_count: bookings ?? 0,
        },
      },
      constraints: args.constraints ?? {},
    }),
    maxTokens: 3500,
    temperature: 0.5,
  })

  const result = parseJsonResponse<{
    plan_summary: string
    tasks: Array<{
      agent: string
      subject: string
      payload: Record<string, unknown>
      priority: 'urgent' | 'high' | 'normal' | 'low'
      depends_on?: number[]
    }>
    execution_order: 'parallel' | 'sequential' | 'hybrid'
    expected_outcome: string
    estimated_duration_min: number
    success_criteria: string[]
  }>(text)

  // Create collaboration record
  const { data: collab } = await supabaseAdmin
    .from('agent_collaborations')
    .insert({
      collaboration_name: args.goal.slice(0, 100),
      goal: args.goal,
      participating_agents: result.tasks.map(t => t.agent),
      coordinator_agent: 'orchestrator',
      status: 'active',
      contributions: {},
    } as never)
    .select('id')
    .single()

  type C = { id: string }
  const collabId = (collab as C | null)?.id

  // Dispatch messages to each agent (creates pending agent_runs via the trigger)
  const messageIds: string[] = []
  for (const task of result.tasks) {
    const msgId = await sendAgentMessage({
      fromAgent: 'orchestrator',
      toAgent: task.agent,
      messageType: 'request',
      subject: task.subject,
      payload: { ...task.payload, collaboration_id: collabId, goal: args.goal },
      priority: task.priority,
      responseRequired: true,
    })
    if (msgId) messageIds.push(msgId)
  }

  // Create insight for visibility
  await supabaseAdmin.from('agent_insights').insert({
    agent_name: 'orchestrator',
    insight_type: 'recommendation',
    title: `🎯 Collaboration started: ${args.goal.slice(0, 80)}`,
    description: `${result.plan_summary}\n\nالـ Agents المشاركة: ${result.tasks.map(t => t.agent).join('، ')}\nالنتيجة المتوقعة: ${result.expected_outcome}`,
    priority: 'medium',
    recommended_action: `تابع التقدم في /admin/collaborations`,
    data_points: {
      collaboration_id: collabId,
      tasks_count: result.tasks.length,
      execution_order: result.execution_order,
    },
  } as never)

  return {
    collaboration_id: collabId,
    plan_summary: result.plan_summary,
    tasks_dispatched: messageIds.length,
    participating_agents: result.tasks.map(t => t.agent),
    execution_order: result.execution_order,
    estimated_duration_min: result.estimated_duration_min,
  }
}

// =============================================================================
// MESSAGE PROCESSOR — agents check their inbox and process pending messages
// =============================================================================
export async function processAgentInbox(agentName: string): Promise<{
  processed: number
  messages: Array<Record<string, unknown>>
}> {
  const { data: pendingMessages } = await supabaseAdmin.rpc('get_pending_messages', {
    p_agent_name: agentName,
    p_limit: 5,
  })

  type Msg = {
    id: string
    from_agent: string
    message_type: string
    subject: string
    payload: Record<string, unknown>
    priority: string
    response_required: boolean
    thread_id: string
  }
  const messages = (pendingMessages ?? []) as Msg[]
  const results: Array<Record<string, unknown>> = []

  for (const msg of messages) {
    // Mark as processing
    await supabaseAdmin
      .from('agent_messages')
      .update({ status: 'processing' } as never)
      .eq('id', msg.id)

    // Mark as completed (the actual work happens in the agent's runner)
    await supabaseAdmin.rpc('mark_message_processed', {
      p_message_id: msg.id,
      p_response_payload: { acknowledged: true, by: agentName } as never,
    })

    results.push({
      message_id: msg.id,
      from: msg.from_agent,
      subject: msg.subject,
    })
  }

  return { processed: results.length, messages: results }
}
