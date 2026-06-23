// Madmona Admin WhatsApp Bot v2 - intercepts TOKEN: messages for vault save
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_PHONES = ["+201002229982", "201002229982"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

async function queueReply(admin: any, phone: string, message: string) {
  await admin.from("whatsapp_outbound_queue").insert({
    recipient_phone: phone,
    recipient_name: "محمد (Admin)",
    message,
    status: "pending",
    agent_name: "admin-bot",
    campaign: "admin_whatsapp_assistant",
    metadata: { intent: "admin_response" },
  });
}

async function handleTokenSave(admin: any, phone: string, body: string) {
  // Extract token after "TOKEN:" (case insensitive)
  const match = body.match(/TOKEN\s*:\s*(EAA[A-Za-z0-9_\-]+)/i);
  if (!match) {
    await queueReply(admin, phone,
      "مالقيتش token صح في الرسالة. الفورمات:\nTOKEN: EAAxxxxxxxxx\n\nالـtoken لازم يبدأ بـEAA");
    return;
  }
  
  const newToken = match[1];
  
  // Test the token first
  const testRes = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${newToken}`);
  const testData = await testRes.json();
  
  if (testData.error) {
    await queueReply(admin, phone,
      `❌ الـtoken مش صالح:\n${testData.error.message}\n\nجرب تولد واحد جديد.`);
    return;
  }
  
  // Token is valid - save as user token
  await admin.rpc("vault_upsert", {
    p_name: "meta_user_access_token",
    p_secret: newToken,
    p_description: "Madmona Meta user token - via WhatsApp " + new Date().toISOString(),
  });
  
  // Get fresh page token
  const pageId = "920414804771355";
  const pageRes = await fetch(
    `https://graph.facebook.com/v21.0/${pageId}?fields=access_token,name&access_token=${newToken}`
  );
  const pageData = await pageRes.json();
  
  if (pageData.error || !pageData.access_token) {
    await queueReply(admin, phone,
      `⚠️ حفظت الـuser token بس ماقدرتش أجيب page token:\n${pageData.error?.message || "unknown"}\n\nتأكد إن الـtoken عنده permissions: pages_show_list, pages_manage_posts, pages_read_engagement\n\nوإنت أدمين على Madmona FB Page.`);
    return;
  }
  
  // Save fresh page token
  await admin.rpc("vault_upsert", {
    p_name: "meta_page_access_token",
    p_secret: pageData.access_token,
    p_description: "Madmona FB Page token - auto-derived " + new Date().toISOString(),
  });
  
  // Verify page token works
  const verifyRes = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${pageData.access_token}`);
  const verifyData = await verifyRes.json();
  
  if (verifyData.error) {
    await queueReply(admin, phone,
      `⚠️ حفظت الـtokens بس الـpage token فشل في الاختبار:\n${verifyData.error.message}`);
    return;
  }
  
  // Now retry the failed FB post if any
  const { data: pendingPosts } = await admin
    .from("content_calendar")
    .select("id, title")
    .eq("status", "scheduled")
    .filter("metadata->>campaign", "eq", "rental_traffic_2026_05_10")
    .limit(1);
  
  let retryMsg = "";
  if (pendingPosts && pendingPosts.length > 0) {
    // Reset to approved + retry
    await admin.from("content_calendar")
      .update({ status: "approved" })
      .eq("id", pendingPosts[0].id);
    await admin.rpc("publish_post_to_facebook", { p_post_id: pendingPosts[0].id });
    retryMsg = `\n\n⚡ بدأت أعيد نشر بوست الإيجار على الـFB Page دلوقتي.`;
  }
  
  await queueReply(admin, phone,
    `✅ تم بنجاح!\n\nالـuser token محفوظ (${newToken.substring(0, 14)}...)\nالـpage token محفوظ ومختبر (${pageData.name})${retryMsg}\n\nالـFB auto-publisher رجع يشتغل.`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { phone, message } = await req.json();
    
    if (!phone || !ADMIN_PHONES.includes(phone)) {
      return new Response(JSON.stringify({ ok: false, error: "not_admin" }), { status: 403 });
    }
    if (!message || message.trim().length < 2) {
      return new Response(JSON.stringify({ ok: false, error: "empty" }), { status: 400 });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    
    // INTERCEPT: TOKEN command (must come before AI forwarding)
    if (/^\s*TOKEN\s*:/i.test(message) || /^\s*META\s+TOKEN/i.test(message)) {
      await handleTokenSave(admin, phone, message);
      return new Response(JSON.stringify({ ok: true, action: "token_save" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default: forward to ai-assistant
    const aiRes = await fetch(`${SUPABASE_URL}/functions/v1/ai-assistant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const aiData = await aiRes.json();

    let replyText = "";
    if (aiData.ok && aiData.reply) {
      replyText = aiData.reply;
      if (aiData.agents_dispatched && aiData.agents_dispatched > 0) {
        replyText += `\n\n⚙️ جاري تشغيل ${aiData.agents_dispatched} agent(s)`;
        if (aiData.estimated_minutes) replyText += ` (حوالي ${aiData.estimated_minutes} دقايق)`;
      } else if (aiData.needs_confirmation) {
        replyText += `\n\n⚠️ محتاج تأكيد. رد "نعم" عشان أنفذها`;
      }
      if (aiData.warnings && aiData.warnings.length > 0) {
        replyText += `\n\n⚠️ ${aiData.warnings.join(" · ")}`;
      }
    } else {
      replyText = aiData.reply || "حصلت مشكلة في فهم الأمر. جرب تاني.";
    }

    if (replyText.length > 3500) replyText = replyText.substring(0, 3450) + "\n\n...[مقتطع]";

    await queueReply(admin, phone, replyText);

    return new Response(JSON.stringify({ ok: true, reply: replyText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
});
