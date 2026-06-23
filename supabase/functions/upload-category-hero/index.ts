// upload-category-hero — generates an on-brand Madmona SVG hero for a category and uploads to storage.
// Returns the public PNG URL (via wsrv.nl) so it can be stored in categories.image_url.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const BRAND = {
  green: "#1F5F3F",
  dark: "#0F3220",
  midDark: "#154430",
  gold: "#B8860B",
  goldSoft: "#9C7209",
  ivory: "#FAF7F0",
};

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

interface HeroSpec {
  category_label_en: string; // small label e.g. "CATEGORY"
  title_ar: string;          // big title e.g. "تجميل"
  subtitle_ar: string;       // gold subtitle
  tagline_ar: string;        // ivory tagline
  slug: string;              // file name on storage
}

function buildHeroSVG(s: HeroSpec): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="720" viewBox="0 0 1920 720">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${BRAND.green}"/>
      <stop offset="55%" stop-color="${BRAND.midDark}"/>
      <stop offset="100%" stop-color="${BRAND.dark}"/>
    </linearGradient>
    <radialGradient id="goldGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${BRAND.gold}" stop-opacity="0.20"/>
      <stop offset="70%" stop-color="${BRAND.gold}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="dots" width="60" height="60" patternUnits="userSpaceOnUse">
      <circle cx="30" cy="30" r="0.8" fill="${BRAND.gold}" opacity="0.12"/>
    </pattern>
  </defs>
  <rect width="1920" height="720" fill="url(#bgGrad)"/>
  <rect width="1920" height="720" fill="url(#dots)"/>
  <ellipse cx="500" cy="360" rx="700" ry="420" fill="url(#goldGlow)"/>
  <text x="120" y="95" font-family="Tahoma,Arial" font-size="20" font-weight="bold" fill="${BRAND.gold}" letter-spacing="12" text-anchor="start">M A D M O N A</text>
  <line x1="120" y1="115" x2="300" y2="115" stroke="${BRAND.gold}" stroke-width="1" opacity="0.7"/>
  <text x="1800" y="275" font-family="Tahoma,Arial" font-size="22" fill="${BRAND.ivory}" letter-spacing="10" opacity="0.65" text-anchor="end">${esc(s.category_label_en)}</text>
  <foreignObject x="0" y="290" width="1920" height="230">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Tahoma,Arial; font-size:200px; font-weight:bold; color:${BRAND.ivory}; text-align:right; direction:rtl; line-height:1; padding-right:120px; letter-spacing:-2px;">${esc(s.title_ar)}</div>
  </foreignObject>
  <line x1="1800" y1="515" x2="1580" y2="515" stroke="${BRAND.gold}" stroke-width="3"/>
  <foreignObject x="0" y="530" width="1920" height="60">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Tahoma,Arial; font-size:36px; font-weight:bold; color:${BRAND.gold}; text-align:right; direction:rtl; padding-right:120px;">${esc(s.subtitle_ar)}</div>
  </foreignObject>
  <foreignObject x="0" y="600" width="1920" height="60">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Tahoma,Arial; font-size:26px; color:${BRAND.ivory}; text-align:right; direction:rtl; opacity:0.78; padding-right:120px;">${esc(s.tagline_ar)}</div>
  </foreignObject>
  <text x="1800" y="695" font-family="Tahoma,Arial" font-size="16" fill="${BRAND.ivory}" opacity="0.5" text-anchor="end">madmonacairo.com</text>
  <line x1="1914" y1="0" x2="1914" y2="720" stroke="${BRAND.gold}" stroke-width="6"/>
</svg>`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });
  }
  const body = await req.json().catch(() => ({}));
  const spec: HeroSpec = {
    category_label_en: body.category_label_en || "CATEGORY",
    title_ar: body.title_ar || "فئة",
    subtitle_ar: body.subtitle_ar || "",
    tagline_ar: body.tagline_ar || "احنا بتوع الإيجار",
    slug: body.slug || "category",
  };

  const svg = buildHeroSVG(spec);
  const path = `category-heroes/${spec.slug}.svg`;
  const bytes = new TextEncoder().encode(svg);

  const { error } = await sb.storage
    .from("content-images")
    .upload(path, bytes, {
      contentType: "image/svg+xml",
      upsert: true,
    });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const { data: pub } = sb.storage.from("content-images").getPublicUrl(path);
  const png = `https://wsrv.nl/?url=${encodeURIComponent(pub.publicUrl)}&output=png&w=1920&h=720&q=90`;

  return new Response(JSON.stringify({
    ok: true,
    svg_url: pub.publicUrl,
    image_url: png,
    slug: spec.slug,
  }, null, 2), { headers: { "content-type": "application/json" } });
});
