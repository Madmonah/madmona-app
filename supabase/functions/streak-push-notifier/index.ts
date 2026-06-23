// streak-push-notifier — Enqueues push notifications for users whose streak is at risk
// Runs daily at 20:00 UTC (22:00 Cairo) — 2 hours before midnight cutoff.
// Reads from get_streaks_at_risk() RPC + push_subscriptions to find recipients.
// Inserts into notification_queue for downstream push delivery.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  const runStartedAt = new Date().toISOString();
  let enqueued = 0;
  let skipped_no_subscription = 0;
  let skipped_recent_notification = 0;

  try {
    // 1) Get all at-risk users from the RPC
    const { data: atRisk, error: rpcErr } = await supabase.rpc("get_streaks_at_risk");

    if (rpcErr) throw new Error(`get_streaks_at_risk failed: ${rpcErr.message}`);

    if (!atRisk || atRisk.length === 0) {
      await supabase.from("agent_runs").insert({
        agent_name: "streak-push-notifier",
        trigger_type: "cron",
        status: "success",
        started_at: runStartedAt,
        finished_at: new Date().toISOString(),
        output_summary: { at_risk_count: 0, enqueued: 0, note: "مفيش مستخدمين streak في خطر" },
      });
      return new Response(
        JSON.stringify({ status: "no_at_risk_users", enqueued: 0 }),
        { headers: { ...CORS, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // 2) For each at-risk user, check if they have a push subscription + haven't been notified in last 12h
    for (const user of atRisk as any[]) {
      const userId = user.user_id;
      const message = user.push_message;
      const streak = user.current_streak;

      // Has active push subscription?
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("id")
        .eq("profile_id", userId)
        .limit(1);

      if (!subs || subs.length === 0) {
        skipped_no_subscription++;
        continue;
      }

      // Anti-spam: skip if we sent a streak notification to this user in the last 12 hours
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
      const { data: recentNotif } = await supabase
        .from("notification_queue")
        .select("id")
        .eq("recipient_id", userId)
        .eq("type", "streak_at_risk")
        .gte("created_at", twelveHoursAgo)
        .limit(1);

      if (recentNotif && recentNotif.length > 0) {
        skipped_recent_notification++;
        continue;
      }

      // Enqueue notification
      const { error: insertErr } = await supabase.from("notification_queue").insert({
        recipient_id: userId,
        type: "streak_at_risk",
        title: `🔥 streak ${streak} يوم في خطر!`,
        body: message,
        url: "/pulse",
        data: {
          streak,
          longest_streak: user.longest_streak,
          hours_remaining: user.hours_remaining,
          source: "streak-push-notifier",
        },
      });

      if (!insertErr) enqueued++;
    }

    // 3) Log success
    await supabase.from("agent_runs").insert({
      agent_name: "streak-push-notifier",
      trigger_type: "cron",
      status: "success",
      started_at: runStartedAt,
      finished_at: new Date().toISOString(),
      output_summary: {
        at_risk_total: atRisk.length,
        enqueued,
        skipped_no_subscription,
        skipped_recent_notification,
      },
    });

    return new Response(
      JSON.stringify({
        status: "completed",
        at_risk_total: atRisk.length,
        enqueued,
        skipped_no_subscription,
        skipped_recent_notification,
      }),
      { headers: { ...CORS, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: any) {
    await supabase.from("agent_runs").insert({
      agent_name: "streak-push-notifier",
      trigger_type: "cron",
      status: "error",
      started_at: runStartedAt,
      finished_at: new Date().toISOString(),
      error_message: err.message || String(err),
    });
    return new Response(
      JSON.stringify({ status: "error", error: err.message || String(err) }),
      { headers: { ...CORS, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
