import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Cache the HTML between requests within a warm instance.
let cachedHtml: string = "";
let cachedAt: number = 0;
const CACHE_TTL_MS = 60_000;

async function getHtml(slug: string): Promise<string> {
  const now = Date.now();
  if (cachedHtml && now - cachedAt < CACHE_TTL_MS) return cachedHtml;
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/static_pages?slug=eq.${encodeURIComponent(slug)}&select=html_content`,
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } },
    );
    if (!res.ok) {
      const txt = await res.text();
      return `<!doctype html><meta charset=utf-8><pre>HTTP ${res.status}\n${txt}</pre>`;
    }
    const data = await res.json() as Array<{ html_content: string }>;
    if (!data?.[0]?.html_content) {
      return `<!doctype html><meta charset=utf-8><h1>Page not found: ${slug}</h1>`;
    }
    cachedHtml = data[0].html_content;
    cachedAt = now;
    return cachedHtml;
  } catch (e) {
    return `<!doctype html><meta charset=utf-8><pre>Error: ${(e as Error).message}</pre>`;
  }
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  if (url.pathname.endsWith("/health")) {
    return new Response(
      JSON.stringify({ ok: true, cached: !!cachedHtml, size: cachedHtml.length }),
      { headers: { "Content-Type": "application/json" } },
    );
  }
  if (url.pathname.endsWith("/refresh")) {
    cachedHtml = "";
    cachedAt = 0;
  }
  const html = await getHtml("team-hq");
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=120",
      "X-Content-Type-Options": "nosniff",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
