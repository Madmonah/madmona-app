import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });

const NOTIFY_TO = "madmona@madmonacairo.com";
const NOTIFY_FROM = "Madmona Careers <careers@madmonacairo.com>";

const esc = (v: unknown) => String(v ?? "—").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));

async function sendEmail(supa: any, row: Record<string, unknown>): Promise<{ ok: boolean; status: number; detail?: string }> {
  try {
    const { data: key } = await supa.rpc("get_resend_key");
    if (!key) return { ok: false, status: 0, detail: "no_resend_key" };
    const html = `
      <div dir="rtl" style="font-family:Cairo,Arial,sans-serif;color:#0A0A0A">
        <h2 style="color:#1F6F5F">📩 طلب توظيف جديد — مضمونة</h2>
        <table style="border-collapse:collapse;font-size:15px">
          <tr><td style="padding:6px 12px;color:#666">الاسم</td><td style="padding:6px 12px;font-weight:700">${esc(row.full_name)}</td></tr>
          <tr><td style="padding:6px 12px;color:#666">الموبايل</td><td style="padding:6px 12px;font-weight:700">${esc(row.phone)}</td></tr>
          <tr><td style="padding:6px 12px;color:#666">الإيميل</td><td style="padding:6px 12px">${esc(row.email)}</td></tr>
          <tr><td style="padding:6px 12px;color:#666">الوظيفة</td><td style="padding:6px 12px">${esc(row.position)}</td></tr>
          <tr><td style="padding:6px 12px;color:#666">المؤهل</td><td style="padding:6px 12px">${esc(row.education)}</td></tr>
          <tr><td style="padding:6px 12px;color:#666">الراتب المتوقع</td><td style="padding:6px 12px">${esc(row.expected_salary)}</td></tr>
          <tr><td style="padding:6px 12px;color:#666">رابط CV</td><td style="padding:6px 12px">${esc(row.cv_url)}</td></tr>
          <tr><td style="padding:6px 12px;color:#666">نبذة</td><td style="padding:6px 12px">${esc(row.message)}</td></tr>
        </table>
      </div>`;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: NOTIFY_FROM, to: [NOTIFY_TO], subject: `📩 طلب توظيف جديد — ${row.full_name}`, html }),
    });
    const d = await res.text();
    return { ok: res.ok, status: res.status, detail: res.ok ? undefined : d.slice(0, 200) };
  } catch (e) {
    return { ok: false, status: 0, detail: String(e) };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const b = await req.json().catch(() => ({}));
    const s = (v: unknown) => (v == null ? null : String(v).trim() || null);
    const full_name = s(b.full_name);
    const phone = s(b.phone);
    if (!full_name || !phone) return json({ error: "الاسم ورقم الموبايل مطلوبين" }, 400);
    const row = {
      full_name, phone,
      email: s(b.email), position: s(b.position), education: s(b.education),
      expected_salary: s(b.expected_salary), cv_url: s(b.cv_url), message: s(b.message),
      source: "careers_page",
    };
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error } = await supa.from("job_applications").insert(row);
    if (error) return json({ error: "db_error", detail: error.message }, 500);
    const email = await sendEmail(supa, row);
    return json({ ok: true, email });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
