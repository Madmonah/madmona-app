// Submit a video-header WhatsApp marketing template to Meta.
// Accepts base64 video bytes inline, does resumable upload, creates template, persists status.
// Mirrors the auth/no-jwt pattern of submit-marketing-template.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "POST only" }, 405);

  try {
    const body = await req.json() as {
      template_name?: string;
      video_base64?: string;
      body_text?: string;
      footer_text?: string;
      button_url?: string;
      button_url_text?: string;
      button_phone?: string;
      button_phone_text?: string;
    };

    const templateName = body.template_name || "partnership_intro_video_v1";
    if (!body.video_base64) return json({ ok: false, error: "video_base64 required" }, 400);
    if (!body.body_text)    return json({ ok: false, error: "body_text required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: cfg } = await admin
      .from("whatsapp_config")
      .select("key, value")
      .in("key", ["access_token", "waba_id", "app_id"]);
    const c = Object.fromEntries((cfg || []).map((x) => [x.key, x.value]));
    if (!c.access_token || !c.waba_id || !c.app_id) {
      return json({ ok: false, error: "missing credentials in whatsapp_config", have: Object.keys(c) }, 500);
    }

    // Decode video
    const bin = Uint8Array.from(atob(body.video_base64), (c) => c.charCodeAt(0));
    const size = bin.byteLength;
    console.log(`Video bytes: ${size}`);

    // STEP 1: create resumable upload session
    const initUrl = `https://graph.facebook.com/v21.0/${c.app_id}/uploads?file_length=${size}&file_type=video/mp4&access_token=${c.access_token}`;
    const initRes = await fetch(initUrl, { method: "POST" });
    const initData = await initRes.json();
    if (!initData.id) {
      return json({ ok: false, step: "init_upload", status: initRes.status, response: initData }, 500);
    }
    const sessionId = initData.id;

    // STEP 2: upload bytes
    const upRes = await fetch(`https://graph.facebook.com/v21.0/${sessionId}`, {
      method: "POST",
      headers: { "Authorization": `OAuth ${c.access_token}`, "file_offset": "0" },
      body: bin,
    });
    const upData = await upRes.json();
    if (!upData.h) {
      return json({ ok: false, step: "upload_bytes", status: upRes.status, response: upData }, 500);
    }
    const handle = upData.h;

    // STEP 3: create template with video header
    const buttons: Array<Record<string, unknown>> = [];
    if (body.button_url) {
      buttons.push({ type: "URL", text: body.button_url_text || "أضف ليستنجك", url: body.button_url });
    }
    if (body.button_phone) {
      buttons.push({ type: "PHONE_NUMBER", text: body.button_phone_text || "كلمنا", phone_number: body.button_phone });
    }

    const components: Array<Record<string, unknown>> = [
      { type: "HEADER", format: "VIDEO", example: { header_handle: [handle] } },
      { type: "BODY", text: body.body_text },
    ];
    if (body.footer_text) components.push({ type: "FOOTER", text: body.footer_text });
    if (buttons.length)   components.push({ type: "BUTTONS", buttons });

    const tplPayload = {
      name: templateName,
      language: "ar_EG",
      category: "MARKETING",
      components,
    };

    const tplRes = await fetch(
      `https://graph.facebook.com/v21.0/${c.waba_id}/message_templates`,
      {
        method: "POST",
        headers: { "Authorization": `Bearer ${c.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify(tplPayload),
      },
    );
    const tplData = await tplRes.json();
    if (!tplRes.ok || !tplData.id) {
      return json({ ok: false, step: "create_template", status: tplRes.status, response: tplData, payload: tplPayload }, 500);
    }

    // STEP 4: persist
    await admin.from("whatsapp_config").upsert(
      [
        { key: `template_${templateName}`,               value: templateName },
        { key: `template_${templateName}_id`,            value: tplData.id },
        { key: `template_${templateName}_status`,        value: tplData.status || "PENDING" },
        { key: `template_${templateName}_submitted_at`,  value: new Date().toISOString() },
        { key: `template_${templateName}_handle`,        value: handle },
      ],
      { onConflict: "key" },
    );

    return json({
      ok: true,
      template_name: templateName,
      template_id: tplData.id,
      status: tplData.status,
      category: tplData.category,
      handle_preview: handle.slice(0, 40) + "…",
    });
  } catch (e) {
    return json({ ok: false, error: "exception", details: String(e) }, 500);
  }
});
