// Polls Meta for partnership_intro_video_v1 status and, when APPROVED,
// queues the beauty wave (makeup_artists + hair_stylists, status='new').
// Idempotent: never queues the same lead twice for this campaign.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TEMPLATE = "partnership_intro_video_v1";

Deno.serve(async () => {
  const admin = createClient(SUPABASE_URL, SR);

  const { data: cfg } = await admin.from("whatsapp_config").select("key,value")
    .in("key", ["access_token", "waba_id", `template_${TEMPLATE}_id`, `template_${TEMPLATE}_status`]);
  const c = Object.fromEntries((cfg || []).map((x: any) => [x.key, x.value]));

  // STEP 1: refresh status from Meta
  const url = `https://graph.facebook.com/v21.0/${c[`template_${TEMPLATE}_id`]}?fields=name,status,category,rejected_reason,quality_score&access_token=${c.access_token}`;
  const r = await fetch(url);
  const tpl = await r.json();
  if (tpl.error) return new Response(JSON.stringify({ step: "meta_fetch", error: tpl.error }, null, 2), { status: 500 });

  await admin.from("whatsapp_config").upsert(
    [{ key: `template_${TEMPLATE}_status`, value: tpl.status, updated_at: new Date().toISOString() }],
    { onConflict: "key" }
  );

  const prev = c[`template_${TEMPLATE}_status`];
  const current = tpl.status;

  if (current !== "APPROVED") {
    return new Response(JSON.stringify({
      ok: true, action: "status_only", prev, current, rejected_reason: tpl.rejected_reason
    }, null, 2), { headers: { "Content-Type": "application/json" } });
  }

  // STEP 2: queue the beauty wave (idempotent — skip leads already queued for this template)
  const campaign = `${TEMPLATE}_beauty_${new Date().toISOString().slice(0, 10)}`;

  const { data: leads } = await admin
    .from("cold_leads")
    .select("id, business_name, phone, category")
    .in("category", ["makeup_artists", "hair_stylists"])
    .eq("status", "new")
    .not("phone", "is", null);

  if (!leads || leads.length === 0) {
    return new Response(JSON.stringify({ ok: true, action: "approved_no_leads" }, null, 2));
  }

  // Skip already-queued
  const phones = leads.map((l: any) => l.phone);
  const { data: existing } = await admin
    .from("whatsapp_outbound_queue")
    .select("recipient_phone")
    .eq("template_name", TEMPLATE)
    .in("recipient_phone", phones);
  const already = new Set((existing || []).map((x: any) => x.recipient_phone));
  const toQueue = leads.filter((l: any) => !already.has(l.phone));

  const startAt = Date.now();
  const PER_MIN = 5;
  const rows = toQueue.map((l: any, i: number) => ({
    recipient_phone: l.phone,
    recipient_name: l.business_name || null,
    template_name: TEMPLATE,
    template_params: {},
    agent_name: "video_campaign_sender",
    campaign,
    status: "pending",
    scheduled_at: new Date(startAt + (i / PER_MIN) * 60000).toISOString(),
    metadata: { lead_id: l.id, category: l.category, wave: "beauty" },
  }));

  if (rows.length === 0) {
    return new Response(JSON.stringify({ ok: true, action: "approved_already_queued", existing_count: already.size }, null, 2));
  }

  const { data: inserted, error: insErr } = await admin.from("whatsapp_outbound_queue").insert(rows).select("id");
  if (insErr) return new Response(JSON.stringify({ ok: false, step: "queue_insert", error: insErr }, null, 2), { status: 500 });

  return new Response(JSON.stringify({
    ok: true,
    action: "approved_and_queued",
    campaign,
    template: TEMPLATE,
    leads_total: leads.length,
    already_queued: already.size,
    newly_queued: inserted?.length || 0,
    first_send_at: rows[0]?.scheduled_at,
    last_send_at: rows[rows.length - 1]?.scheduled_at,
  }, null, 2), { headers: { "Content-Type": "application/json" } });
});
