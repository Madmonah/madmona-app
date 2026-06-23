import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey"
};

async function getContext(supabase: any) {
  const [agents, leads, queue, runbook] = await Promise.all([
    supabase.from("agent_registry").select("agent_name,description,enabled,last_run_at,run_count").eq("enabled", true).limit(50),
    supabase.from("cold_leads").select("status", { count: "exact", head: true }),
    supabase.from("whatsapp_outbound_queue").select("status").gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()).limit(1000),
    supabase.from("system_runbook").select("topic,title,status,content,blocker,next_steps").limit(20)
  ]);
  
  const queueStats: Record<string, number> = {};
  (queue.data ?? []).forEach((m: any) => { queueStats[m.status] = (queueStats[m.status] ?? 0) + 1; });
  
  return {
    agents: agents.data ?? [],
    cold_leads_total: leads.count ?? 0,
    whatsapp_7d: queueStats,
    runbook: runbook.data ?? []
  };
}

function buildSystemPrompt(ctx: any): string {
  const runbookSummary = ctx.runbook.map((r: any) => `- ${r.title} (${r.status}): ${r.content?.substring(0, 200)}`).join("\n");
  const agentsList = ctx.agents.map((a: any) => `- ${a.agent_name}: ${a.description}`).join("\n");
  
  return `انت المساعد الذكي لـ Madmona (مضمونة)، منصة إيجارات في مصر.

صاحب المنصة اسمه محمد. التواصل بالعامية المصرية.

# الوظيفة
ترد على أسئلة محمد عن حالة النظام، تدّي توصيات، تساعده يفهم الأرقام، أو تشغل أجينتس.

# حالة النظام الحالي
${runbookSummary}

# الأجينتس النشطين
${agentsList}

# إحصائيات سريعة
- Cold leads إجمالاً: ${ctx.cold_leads_total}
- رسائل WhatsApp آخر 7 أيام: ${JSON.stringify(ctx.whatsapp_7d)}

# قواعد الرد
1. ردّ بالعامية المصرية، بسيط وواضح
2. لو محمد سأل عن حالة شيء، جاوب بأرقام حقيقية من الـ context فوق
3. لو طلب حاجة واضحة وعندنا agent ليها، حط الـ agent في agents
4. لو السؤال غامض، خلي needs_confirmation = true واسأله سؤال محدد
5. استخدم submit_response tool عشان ترد - ده الطريقة الوحيدة المسموح بيها`;
}

const RESPONSE_TOOL = {
  name: "submit_response",
  description: "Submit your response to Mohamed. Use this for ALL replies.",
  input_schema: {
    type: "object",
    properties: {
      understood: {
        type: "boolean",
        description: "true if you understood Mohamed's request, false if it's ambiguous"
      },
      reply: {
        type: "string",
        description: "Your reply in Egyptian Arabic colloquial. Be concise and direct."
      },
      needs_confirmation: {
        type: "boolean",
        description: "true if you need Mohamed to confirm something before acting"
      },
      agents: {
        type: "array",
        items: { type: "string" },
        description: "List of agent_names to trigger (from the available agents). Empty array if none."
      },
      workflow_name: {
        type: ["string", "null"],
        description: "Short name for the workflow if multiple agents are coordinated"
      },
      workflow_goal: {
        type: ["string", "null"],
        description: "What the workflow aims to achieve"
      },
      estimated_minutes: {
        type: "integer",
        description: "Estimated time in minutes for the requested action"
      },
      warnings: {
        type: "array",
        items: { type: "string" },
        description: "Any warnings or caveats Mohamed should know"
      }
    },
    required: ["understood", "reply", "needs_confirmation", "agents", "estimated_minutes", "warnings"]
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  
  try {
    const body = await req.json();
    const message = body.message || body.content || body.query || body.prompt || "";
    
    if (!message) {
      return new Response(JSON.stringify({ ok: false, reply: "الرسالة فاضية، ابعت سؤال." }), { headers: { ...CORS, "Content-Type": "application/json" } });
    }
    
    const supabase = createClient(SB_URL, SB_SVC);
    
    const { data: anthropicKey } = await supabase.rpc("get_anthropic_key");
    if (!anthropicKey) {
      return new Response(JSON.stringify({ ok: false, reply: "الـ API key بتاع Anthropic مفقود. اتصل بالـ admin." }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
    }
    
    const ctx = await getContext(supabase);
    const systemPrompt = buildSystemPrompt(ctx);
    
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        system: systemPrompt,
        tools: [RESPONSE_TOOL],
        tool_choice: { type: "tool", name: "submit_response" },
        messages: [{ role: "user", content: message }]
      })
    });
    
    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      return new Response(JSON.stringify({ 
        ok: false, 
        reply: "حصل مشكلة في Anthropic API. حاول تاني.",
        error: errText
      }), { headers: { ...CORS, "Content-Type": "application/json" } });
    }
    
    const claudeData = await claudeRes.json();
    
    // Extract tool_use block (guaranteed structure when tool_choice is forced)
    const toolUseBlock = claudeData.content?.find((b: any) => b.type === "tool_use");
    
    if (toolUseBlock?.input) {
      const result = toolUseBlock.input;
      return new Response(JSON.stringify({ 
        ok: true,
        understood: result.understood ?? true,
        reply: result.reply || "تمام",
        needs_confirmation: result.needs_confirmation ?? false,
        agents: Array.isArray(result.agents) ? result.agents : [],
        workflow_name: result.workflow_name ?? null,
        workflow_goal: result.workflow_goal ?? null,
        estimated_minutes: result.estimated_minutes ?? 0,
        warnings: Array.isArray(result.warnings) ? result.warnings : []
      }), { headers: { ...CORS, "Content-Type": "application/json" } });
    }
    
    // Fallback - shouldn't happen with forced tool_choice but handle gracefully
    const textBlock = claudeData.content?.find((b: any) => b.type === "text");
    return new Response(JSON.stringify({
      ok: true,
      understood: false,
      reply: textBlock?.text || "معلش، حاول تاني بطريقة مختلفة.",
      needs_confirmation: true,
      agents: [],
      workflow_name: null,
      workflow_goal: null,
      estimated_minutes: 0,
      warnings: ["Tool use response missing - using text fallback"]
    }), { headers: { ...CORS, "Content-Type": "application/json" } });
    
  } catch (e) {
    return new Response(JSON.stringify({
      ok: false,
      reply: "حصل خطأ تقني. اتصل بالـ admin.",
      error: (e as Error).message
    }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
