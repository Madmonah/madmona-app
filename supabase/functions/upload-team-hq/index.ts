import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SRV = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "POST only" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }
  const body = await req.arrayBuffer();
  if (body.byteLength === 0) {
    return new Response(JSON.stringify({ ok: false, error: "empty body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const r = await fetch(
    `${URL_}/storage/v1/object/outreach/team-hq.html`,
    {
      method: "POST",
      headers: {
        "apikey": SRV,
        "Authorization": `Bearer ${SRV}`,
        "Content-Type": "text/html",
        "x-upsert": "true",
      },
      body,
    },
  );
  const text = await r.text();
  return new Response(
    JSON.stringify({
      ok: r.ok,
      status: r.status,
      response: text,
      bytes_uploaded: body.byteLength,
      public_url: `${URL_}/storage/v1/object/public/outreach/team-hq.html`,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
});
