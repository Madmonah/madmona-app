import { createClient } from "jsr:@supabase/supabase-js@2";

const MODEL = "claude-sonnet-4-6";
const MAX_ATTEMPTS = 3;
const json = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });

// Deterministic backstop — high-confidence forbidden patterns that must NEVER publish.
function hardViolations(parts: (string | null | undefined)[]): string[] {
  const t = parts.filter(Boolean).join("  ");
  const v: string[] = [];
  if (/01[0125]\d{8}/.test(t)) v.push("رقم تليفون/واتساب مباشر");
  if (/madmonacairo\.com\/[^\s)\"'<]+/i.test(t)) v.push("رابط صفحة فرعية (المسموح: madmonacairo.com فقط)");
  if (/\b(bit\.ly|tinyurl|lnkd\.in|cutt\.ly|rebrand\.ly|t\.co)\b/i.test(t)) v.push("رابط مختصر ممنوع");
  return v;
}

const SYS = `أنت «المُعتمِد» — رئيس تحرير الجودة لعلامة مضمونة (madmonacairo.com)، ماركت بليس إيجار مضمون في مصر. أنت آخر بوابة قبل النشر وبتاخد قرار المالك بدالـه. معاييرك عالية وصارمة ودقيقة.\n\nلكل أصل اعمل خطوتين:\n1) صلّحه بنفسك ليطابق السياسة 100% (اتصرف كأنك الموظف المختص بيعدّل شغله):\n   - الروابط: madmonacairo.com فقط (الرابط الجذر). امسح أي صفحة فرعية أو رابط مختصر أو دومين تاني.\n   - امسح أي رقم تليفون/واتساب مباشر نهائيًا — التواصل عبر madmonacairo.com بس.\n   - امسح أي ادعاء غير مؤكد: «دعم ٢٤/٧»، «حماية كاملة/١٠٠٪»، «ضمان مطلق»، وأي رقم/ميزة مش مؤكدة. المؤكد فقط: العمولة ١٠٪ موحدة على الكل، تأسست ٢٠١٩ وأعيد الإطلاق ٢٠٢٦، والإيجار «مضمون» عبر المنصة.\n   - امسح أي placeholder (X، {…}، TODO، […]).\n   - عامية مصرية، براند مضمونة (كريمي/أخضر، ذهبي مسموح)، والـCTA يوجّه على madmonacairo.com.\n2) بعد التصليح احكم على النسخة المصلّحة:\n   - decision=\"publish\": النسخة المصلّحة مطابقة 100% وكويسة وجاهزة تنشر.\n   - decision=\"revise\": محتاجة شغل أعمق من المختص (هوك ضعيف/فكرة ناقصة) — رجّعها بالنسخة المحسّنة + اكتب المطلوب بالظبط في note_to_specialist.\n   - decision=\"reject\": الأصل فاضي/مكسور/خارج عن رسالة المنصة ومش ينفع يتصلّح.\nرُدّ عبر الأداة chief_verdict فقط. corrected لازم يكون النسخة النهائية المصلّحة (مش الأصلية).`;

async function adjudicate(apiKey: string, guardrails: unknown, item: Record<string, unknown>) {
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL, max_tokens: 1600, system: SYS + "\nguardrails: " + JSON.stringify(guardrails),
        tools: [{
          name: "chief_verdict", description: "قرار المُعتمِد + النسخة المصلّحة",
          input_schema: {
            type: "object",
            properties: {
              decision: { type: "string", enum: ["publish", "revise", "reject"] },
              score: { type: "integer" },
              blocking_reasons: { type: "array", items: { type: "string" } },
              corrected: {
                type: "object",
                properties: {
                  title: { type: "string" }, body: { type: "string" },
                  cta: { type: "string" }, hashtags: { type: "array", items: { type: "string" } }
                }
              },
              note_to_specialist: { type: "string" }
            },
            required: ["decision", "score", "blocking_reasons", "corrected"]
          }
        }],
        tool_choice: { type: "tool", name: "chief_verdict" },
        messages: [{ role: "user", content: "الأصل (وملاحظات marketing-qc):\n" + JSON.stringify(item, null, 2) }]
      })
    });
    const d = await r.json();
    const tu = (d.content || []).find((c: { type: string }) => c.type === "tool_use");
    if (tu?.input) return tu.input as Record<string, unknown>;
    return { decision: "revise", score: 0, blocking_reasons: ["parse failed: " + JSON.stringify(d).slice(0, 200)], corrected: {} };
  } catch (e) {
    return { decision: "revise", score: 0, blocking_reasons: ["error: " + String(e)], corrected: {} };
  }
}

async function logFeedback(supabase: any, agent: string, id: string, type: string, val: string) {
  try {
    await supabase.from("feedback_signals").insert({ agent_name: agent, output_table: "content_calendar", output_id: id, signal_type: type, signal_value: val.slice(0, 300) });
  } catch (_e) { /* non-fatal */ }
}

Deno.serve(async (req) => {
  let mode = "live";
  try { const b = await req.json(); if (b?.mode) mode = String(b.mode); } catch { /* default live */ }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: apiKey } = await supabase.rpc("get_anthropic_key");
  if (!apiKey || typeof apiKey !== "string") return json({ error: "no_api_key" }, 500);
  const { data: ctx } = await supabase.rpc("get_system_context");
  const guardrails = ((ctx as Record<string, Record<string, unknown>>)?.marketing_pod?.guardrails) ?? {};

  const { data: rows } = await supabase.from("content_calendar")
    .select("id,content_type,title,body,cta,hashtags,image_url,agent_name,metadata,status")
    .eq("status", "pending_review").limit(20);

  const highRisk = (rows ?? []).filter((p: Record<string, any>) => (p.metadata?.qc?.risk) === "high").slice(0, 6);

  const report: unknown[] = [];
  let published = 0, revised = 0, rejected = 0, parked = 0;

  for (const p of highRisk) {
    const meta = (p.metadata as Record<string, any>) || {};
    const attempt = Number(meta?.revision?.attempt ?? 0);
    const item = {
      content_type: p.content_type, title: p.title, body: p.body, cta: p.cta,
      hashtags: p.hashtags, specialist_agent: p.agent_name,
      marketing_qc_issues: meta?.qc?.issues ?? [], suggested_fix: meta?.qc?.suggested_fix ?? null
    };
    const v = await adjudicate(apiKey, guardrails, item) as Record<string, any>;
    const corrected = (v.corrected || {}) as Record<string, any>;
    const newTitle = corrected.title ?? p.title;
    const newBody = corrected.body ?? p.body;
    const newCta = corrected.cta ?? p.cta;
    const newTags = corrected.hashtags ?? p.hashtags;

    const hv = hardViolations([newTitle, newBody, newCta]);
    let decision = String(v.decision || "revise");
    if (decision === "publish" && hv.length) decision = "revise";

    const chiefQc = {
      by: "chief-approver", at: new Date().toISOString(),
      decision, score: v.score ?? null, blocking_reasons: v.blocking_reasons ?? [],
      hard_violations: hv, note: v.note_to_specialist ?? null, attempt
    };

    if (mode === "observe") {
      report.push({ id: p.id, agent: p.agent_name, type: p.content_type, decision, score: v.score ?? null, blocking_reasons: v.blocking_reasons ?? [], hard_violations: hv, corrected_preview: String(newBody ?? "").slice(0, 240) });
      await supabase.from("content_calendar").update({ metadata: { ...meta, chief_preview: chiefQc } }).eq("id", p.id);
      continue;
    }

    if (decision === "publish") {
      await supabase.from("content_calendar").update({
        title: newTitle, body: newBody, cta: newCta, hashtags: newTags,
        metadata: { ...meta, qc_approved: "true", qc: chiefQc, revision: { attempt, last: "approved_by_chief", at: new Date().toISOString() } },
        status: "approved"
      }).eq("id", p.id);
      published++;
      await logFeedback(supabase, p.agent_name, p.id, "approved", "chief-approver");
    } else if (decision === "reject") {
      await supabase.from("content_calendar").update({
        status: "rejected",
        metadata: { ...meta, qc: chiefQc, reject_reason: ((v.blocking_reasons as string[]) || []).join("; ") || "rejected by chief-approver" }
      }).eq("id", p.id);
      rejected++;
      await logFeedback(supabase, p.agent_name, p.id, "rejected", ((v.blocking_reasons as string[]) || []).join("; "));
    } else {
      if (attempt + 1 >= MAX_ATTEMPTS) {
        await supabase.from("content_calendar").update({
          status: "rejected",
          metadata: { ...meta, qc: chiefQc, reject_reason: "فشل اجتياز الجودة بعد " + MAX_ATTEMPTS + " محاولات", parked: true }
        }).eq("id", p.id);
        parked++;
        await logFeedback(supabase, p.agent_name, p.id, "rejected", "parked after max attempts");
      } else {
        const m2: Record<string, any> = { ...meta, qc: chiefQc, revision: { attempt: attempt + 1, last: "sent_to_specialist", fixes: v.blocking_reasons ?? [], note: v.note_to_specialist ?? null, at: new Date().toISOString() } };
        delete m2.qc_approved;
        await supabase.from("content_calendar").update({
          title: newTitle, body: newBody, cta: newCta, hashtags: newTags, metadata: m2, status: "pending_review"
        }).eq("id", p.id);
        revised++;
        await logFeedback(supabase, p.agent_name, p.id, "revised", ((v.blocking_reasons as string[]) || []).join("; "));
      }
    }
  }

  return json({ ok: true, mode, high_risk_seen: highRisk.length, published, revised, rejected, parked, report, at: new Date().toISOString() });
});
