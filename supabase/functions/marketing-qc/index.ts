// marketing-qc v6 (11 Jun 2026) — COMMISSION REVERSAL: restaurants/cafes = FREE FOR A LIMITED TIME (0% promo, Mohamed decision).
// 0% claims for restaurants are APPROVED when framed as limited-time promo. Permanent/unframed 0% = medium note. v4: 2019/relaunch = hard violation.
import { createClient } from "jsr:@supabase/supabase-js@2";

const MODEL = "claude-sonnet-4-6";
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });

async function qcReview(
  apiKey: string,
  guardrails: unknown,
  productLines: unknown,
  brandInfo: unknown,
  item: unknown,
) {
  const sys = `أنت مدقّق جودة (QC) دقيق وعادل لعلامة مضمونة (madmonacairo.com) — ماركت بليس مضمون شامل في مصر (إيجار، بيع وشرا، خدمات، مطاعم وكافيهات، تجميل).

=== معايير الرفض الحاسمة (risk=high) ===
1) خرق سياسة مثبتة تحت (commission/CRM+ERP/coworking forbidden/links/templates).
2) لينك خارجي غير madmonacairo.com (bit.ly، landing edge functions، لينكات مختصرة، دومين تاني). لينكات madmonacairo.com/add-listing وmadmonacairo.com/marketplace = مسموحة وهي الـ CTAs الرسمية.
3) Placeholders غير محلولة: X، {...}، TODO، [...]، أرقام غير محددة تبدو منسية.
4) ادعاء صريح بدعم بشري 24/7 أو فريق بشر — مضمونة بشغلها agents + موافقة المالك. "دعم مستمر" أو "دعم دايماً" = عادي (جزء من الـ 3 pillars).
5) ادعاء جائزة/تخفيض محدد غير موثق (مث: "اخصم 50%") بدون سند — باستثناء عرض المطاعم المعتمد تحت.

=== سياسة العمولة الرسمية (11 يونيو 2026) ===
- العمولة 10% موحدة على الكل. إضافة المنتج مجانية للكل.
- المطاعم والكافيهات: مجاناً تماماً (عمولة 0%) — عرض رسمي معتمد لفترة محدودة. ادعاء 0%/ببلاش للمطاعم = مسموح وصحيح. الأفضل إن المحتوى يذكر «لفترة محدودة» — لو مذكرهاش دي ملاحظة medium مش رفض.
- ادعاء 0% لفئة تانية غير المطاعم/الكافيهات = خرق high.

=== ما ليس خرقاً ===
- أي محتوى عن أي product line معتمد (إيجار، بيع، خدمات، مطاعم، كافيهات، تجميل) = صحيح وليس هلوسة.
- CRM+ERP مجاني للمطاعم/الكافيهات = عرض إطلاق معتمد 2026.
- عبارة «منصة جديدة اتلانشت مايو 2026 وبتنمو بسرعة» = الصياغة الرسمية الصحيحة.
- City Mart Cafe + ~37 مطعم/كافيه تاني = منتجات حقيقية.

=== خرق مصيري (risk=high فوري) ===
- أي ذكر لسنة 2019 أو «تأسيس 2019» أو «من 2019» أو «إعادة إطلاق» أو «أكبر منصة» — المنصة اتلانشت مايو 2026 ودي قاعدة مقفولة من المالك.
- أي ذكر لـ coworking/مساحة عمل مشتركة (ملغي نهائياً).
- أي ذكر لعبارة «أجر معانا» (الصح: «ضيف المنتج»).
- أي ذكر لتمبليت outreach ملغي (partnership_intro_v2).
- أي رابط لـ Edge Function URL علناً.

=== درجات الخطورة ===
- high = خرق حقيقي للواحدة من القواعد أعلاه (يمنع النشر).
- medium = صياغة ضعيفة، hook غير جذّاب، hashtags ناقصة، CTA مبهم، أو 0% مطاعم بدون «لفترة محدودة» (يعدي مع ملاحظة).
- low = سليم.

=== بيانات البراند والـ product lines ===
brand: ${JSON.stringify(brandInfo)}
product_lines: ${JSON.stringify(productLines)}
guardrails: ${JSON.stringify(guardrails)}

ردّ عبر أداة qc_verdict فقط.`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL, max_tokens: 800, system: sys,
        tools: [{
          name: "qc_verdict",
          description: "إصدار حكم QC على الأصل",
          input_schema: {
            type: "object",
            properties: {
              pass: { type: "boolean" },
              risk: { type: "string", enum: ["low", "medium", "high"] },
              issues: { type: "array", items: { type: "string" } },
              suggested_fix: { type: "string" },
            },
            required: ["pass", "risk", "issues"],
          },
        }],
        tool_choice: { type: "tool", name: "qc_verdict" },
        messages: [{ role: "user", content: "الأصل المطلوب فحصه:\n" + JSON.stringify(item, null, 2) }],
      }),
    });
    const d = await r.json();
    const tu = (d.content || []).find((c: { type: string }) => c.type === "tool_use");
    if (tu?.input) return tu.input as { pass: boolean; risk: string; issues: string[]; suggested_fix?: string };
    return { pass: false, risk: "high", issues: ["QC parse failed: " + JSON.stringify(d).slice(0, 300)] };
  } catch (e) {
    return { pass: false, risk: "high", issues: ["QC error: " + String(e)] };
  }
}

Deno.serve(async () => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: apiKey } = await supabase.rpc("get_anthropic_key");
  if (!apiKey || typeof apiKey !== "string") return json({ error: "no_api_key" }, 500);

  const { data: ctx } = await supabase.rpc("get_system_context");
  const c = (ctx as Record<string, Record<string, unknown>>) || {};
  const guardrails = (c.marketing_pod?.guardrails) ?? {};
  const productLines = c.product_lines ?? {};
  const brandInfo = {
    slogan_ar: c.brand?.slogan_ar,
    positioning: c.brand?.positioning,
    three_pillars: c.brand?.three_pillars_ordered,
  };

  const { data: posts } = await supabase.from("content_calendar")
    .select("id,content_type,title,body,cta,hashtags,image_url,metadata")
    .eq("status", "pending_review").limit(20);
  let approved = 0, blocked = 0;
  for (const p of posts ?? []) {
    const v = await qcReview(apiKey, guardrails, productLines, brandInfo, {
      content_type: p.content_type, title: p.title, body: p.body, cta: p.cta,
      hashtags: p.hashtags, has_image: !!p.image_url,
    });
    const meta = (p.metadata as Record<string, unknown>) || {};
    const qc = { pass: v.pass, risk: v.risk, by: "marketing-qc", at: new Date().toISOString(), issues: v.issues, suggested_fix: v.suggested_fix ?? null };
    if (v.risk !== "high") {
      await supabase.from("content_calendar").update({ status: "approved", metadata: { ...meta, qc_approved: "true", qc } }).eq("id", p.id);
      approved++;
    } else {
      await supabase.from("content_calendar").update({ metadata: { ...meta, qc } }).eq("id", p.id);
      blocked++;
    }
  }

  const { data: waRows } = await supabase.from("whatsapp_outbound_queue").select("id").eq("status", "pending_approval").limit(50);
  const waPending = (waRows ?? []).length;

  return json({ ok: true, posts_seen: (posts ?? []).length, approved, blocked_high_risk: blocked, wa_email_awaiting_owner: waPending, at: new Date().toISOString() });
});
