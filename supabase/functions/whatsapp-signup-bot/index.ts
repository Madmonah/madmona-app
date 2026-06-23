// Madmona WhatsApp Signup Bot v3
// May 13 2026 ROOT FIX: removed all PII-asking prompts.
// Policy: NEVER ask for name/email via WhatsApp. /add-listing collects info anonymously.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function normalizePhoneVariants(phone) {
  const cleaned = phone.replace(/[^\d+]/g, "");
  const variants = new Set();
  variants.add(cleaned);
  if (cleaned.startsWith("+")) variants.add(cleaned.slice(1));
  else variants.add("+" + cleaned);
  if (cleaned.startsWith("+20")) {
    variants.add(cleaned.slice(3));
    variants.add("0" + cleaned.slice(3));
  }
  return Array.from(variants);
}

async function classifyIntent(messageText, context, anthropicKey) {
  const systemPrompt = "أنت بوت لمضمونة (منصة تأجير في مصر). حلل نية الرسالة وارجع JSON فقط: {\"intent\": \"signup\" | \"info\" | \"other\", \"account_type\": \"supplier\" | \"customer\" | \"unknown\"}. signup = عايز يسجل أو يضيف إعلان. info = سؤال على تفاصيل. other = حاجة تانية. supplier = للإيجار. customer = عايز يأجر. لا تستخرج اسم أو إيميل. JSON فقط.";

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        system: systemPrompt,
        messages: [{ role: "user", content: "السياق:\n" + context + "\n\nالرسالة:\n" + messageText }],
      }),
    });
    const data = await res.json();
    let text = data && data.content && data.content[0] && data.content[0].text || "";
    text = text.replace(/```json\s*|```\s*/g, "").trim();
    return JSON.parse(text);
  } catch (e) {
    console.error("classify error:", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { phone } = await req.json();
    if (!phone) return new Response(JSON.stringify({ ok: false, error: "missing phone" }), { status: 400 });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const phoneVariants = normalizePhoneVariants(phone);

    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id, full_name, phone")
      .in("phone", phoneVariants)
      .maybeSingle();

    if (existingProfile) {
      return new Response(JSON.stringify({ ok: true, action: "already_registered", user_id: existingProfile.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: convo } = await admin
      .from("whatsapp_conversations")
      .select("id, contact_name, contact_phone")
      .in("contact_phone", phoneVariants)
      .maybeSingle();

    if (!convo) return new Response(JSON.stringify({ ok: false, error: "no conversation" }), { status: 404 });

    const { data: messages } = await admin
      .from("whatsapp_messages")
      .select("body, direction, created_at")
      .eq("conversation_id", convo.id)
      .order("created_at", { ascending: false })
      .limit(8);

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: "no messages" }), { status: 404 });
    }

    const latestInbound = messages.find((m) => m.direction === "inbound");
    if (!latestInbound) {
      return new Response(JSON.stringify({ ok: true, action: "no_inbound" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 60-min cooldown
    const { data: recentReplies } = await admin
      .from("whatsapp_outbound_queue")
      .select("id")
      .in("recipient_phone", phoneVariants)
      .eq("agent_name", "signup-bot")
      .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .limit(1);

    if (recentReplies && recentReplies.length > 0) {
      return new Response(JSON.stringify({ ok: true, action: "recently_replied" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: keyData, error: keyErr } = await admin.rpc("get_anthropic_key");
    if (keyErr || !keyData) {
      return new Response(JSON.stringify({ ok: false, error: "no API key" }), { status: 500 });
    }

    const context = messages.slice(1, 6).reverse()
      .map((m) => "[" + m.direction + "] " + ((m.body || "").substring(0, 200)))
      .join("\n");

    const classification = await classifyIntent(latestInbound.body || "", context, keyData);
    if (!classification) {
      return new Response(JSON.stringify({ ok: false, error: "classification failed" }), { status: 500 });
    }

    const result = { classification };

    if (classification.intent === "signup") {
      const isCustomer = classification.account_type === "customer";
      const link = isCustomer
        ? "https://madmonacairo.com/marketplace"
        : "https://madmonacairo.com/add-listing";

      const supplierMsg = "تمام! إدخل الرابط ده وضيف إعلانك بنفسك في دقيقة 🚀\n\n👉 " + link + "\n\n• حماية كاملة\n• دفع مستحقاتك سريع\n• عمولة 10% بس (5% للشركات)\n• دعم 24/7\n\nأي سؤال، رد على الرسالة دي.";

      const customerMsg = "تمام! دور على اللي تحتاجه على الماركتبلس:\n\n👉 " + link + "\n\nاحجز وادفع بأمان، دعم فوري لو احتجت.";

      const phoneToSendTo = convo.contact_phone || phoneVariants[0];
      await admin.from("whatsapp_outbound_queue").insert({
        recipient_phone: phoneToSendTo,
        recipient_name: convo.contact_name,
        message: isCustomer ? customerMsg : supplierMsg,
        status: "pending",
        agent_name: "signup-bot",
        campaign: "signup_redirect",
        metadata: { classification, link },
      });
      result.action = "redirected_to_form";
      result.link = link;
    } else {
      result.action = "no_action";
      result.reason = "intent=" + classification.intent;
    }

    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: "exception", details: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
