// src/lib/image-generator.ts
// Generate Instagram-ready images for posts.
//
// 2026-05-13 update (Mohamed: "بوستات بصور غلط"):
// Two modes now:
//   1. listing-photo mode (preferred) — when listingId is provided, fetch its primary photo
//      and use it as the FULL background with a dark gradient overlay + text on top.
//      Per brand policy: real photos > AI-generated > NEVER stock.
//   2. branded-card mode (fallback) — when no listing photo is available (e.g. brand-level
//      posts not tied to a listing). Old SVG green gradient design.

import { supabase as supabaseAdmin } from './supabase'

// Madmona brand colors
const COLORS = {
  green: '#1F6F5F',
  ivory: '#FAF7F0',
  gold: '#2FA084',
  rust: '#6FCF97',
  white: '#FFFFFF',
}

interface GenerateImageParams {
  title: string
  body: string
  contentType: 'instagram_post' | 'instagram_carousel'
  hashtags?: string[]
  listingId?: string  // NEW: when provided, use real listing photo as background
}

/**
 * Fetch the primary photo URL for a listing, if any.
 */
async function fetchListingPrimaryPhoto(listingId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('listing_photos')
    .select('url, is_primary, display_order')
    .eq('listing_id', listingId)
    .order('is_primary', { ascending: false })
    .order('display_order', { ascending: true })
    .limit(1)
  return ((data ?? []) as Array<{ url: string }>)[0]?.url ?? null
}

/**
 * Build 1080x1350 SVG with a REAL listing photo as the background.
 * Title + CTA overlay with a dark gradient for legibility.
 */
function buildPhotoBackedSVG(params: GenerateImageParams & { photoUrl: string }): string {
  const { title, photoUrl } = params
  const W = 1080
  const H = 1350

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="overlay" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#000" stop-opacity="0.05"/>
      <stop offset="55%" stop-color="#000" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.85"/>
    </linearGradient>
  </defs>

  <!-- Real listing photo as background, cover-fit -->
  <image href="${escapeXml(photoUrl)}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/>

  <!-- Dark gradient overlay for text legibility -->
  <rect width="${W}" height="${H}" fill="url(#overlay)"/>

  <!-- Top-left brand chip -->
  <rect x="50" y="50" width="180" height="56" rx="28" fill="${COLORS.ivory}" opacity="0.95"/>
  <text x="140" y="88" font-family="Tahoma, Arial" font-size="22" font-weight="bold" fill="${COLORS.green}" text-anchor="middle" letter-spacing="2">
    MADMONA
  </text>

  <!-- Gold accent bar (top) -->
  <rect x="0" y="0" width="${W}" height="6" fill="${COLORS.gold}"/>

  <!-- Title (bottom area, white on dark gradient) -->
  <foreignObject x="60" y="${H - 380}" width="${W - 120}" height="220">
    <div xmlns="http://www.w3.org/1999/xhtml"
         style="font-family: Tahoma, Arial; font-size: 58px; font-weight: 900; color: #FFFFFF; text-align: right; direction: rtl; line-height: 1.25; text-shadow: 0 2px 8px rgba(0,0,0,0.6);">
      ${escapeXml(title)}
    </div>
  </foreignObject>

  <!-- Bottom CTA strip -->
  <rect x="0" y="${H - 140}" width="${W}" height="140" fill="${COLORS.green}" opacity="0.95"/>
  <text x="${W/2}" y="${H - 80}" font-family="Tahoma, Arial" font-size="40" font-weight="bold" fill="${COLORS.ivory}" text-anchor="middle" direction="rtl">
    احنا بتوع الإيجار
  </text>
  <text x="${W/2}" y="${H - 35}" font-family="Tahoma, Arial" font-size="20" fill="${COLORS.gold}" text-anchor="middle" letter-spacing="3">
    MADMONACAIRO.COM
  </text>
</svg>`
}

/**
 * Build a 1080x1350 SVG (4:5 ratio - optimal for Instagram feed)
 * with Madmona branding (fallback when no real photo available)
 */
function buildPostSVG(params: GenerateImageParams): string {
  const { title, body } = params
  const W = 1080
  const H = 1350

  // Truncate body to fit
  const bodyLines = wrapText(body, 35).slice(0, 12)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${COLORS.green}"/>
      <stop offset="100%" stop-color="#164430"/>
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  
  <!-- Decorative circle -->
  <circle cx="${W - 100}" cy="100" r="200" fill="${COLORS.gold}" opacity="0.08"/>
  <circle cx="100" cy="${H - 100}" r="150" fill="${COLORS.gold}" opacity="0.05"/>
  
  <!-- Top brand bar -->
  <rect x="0" y="0" width="${W}" height="80" fill="${COLORS.ivory}" opacity="0.05"/>
  
  <!-- Madmona logo text (top) -->
  <text x="${W/2}" y="55" font-family="Tahoma, Arial" font-size="24" font-weight="bold" fill="${COLORS.gold}" text-anchor="middle" letter-spacing="3">
    MADMONA
  </text>
  
  <!-- Title -->
  <foreignObject x="80" y="180" width="${W - 160}" height="200">
    <div xmlns="http://www.w3.org/1999/xhtml" 
         style="font-family: Tahoma, Arial; font-size: 56px; font-weight: bold; color: ${COLORS.ivory}; text-align: center; direction: rtl; line-height: 1.4;">
      ${escapeXml(title)}
    </div>
  </foreignObject>
  
  <!-- Decorative divider -->
  <line x1="${W/2 - 60}" y1="430" x2="${W/2 + 60}" y2="430" stroke="${COLORS.gold}" stroke-width="3"/>
  
  <!-- Body text -->
  <foreignObject x="80" y="470" width="${W - 160}" height="${H - 700}">
    <div xmlns="http://www.w3.org/1999/xhtml" 
         style="font-family: Tahoma, Arial; font-size: 32px; color: ${COLORS.ivory}; text-align: right; direction: rtl; line-height: 1.7;">
      ${bodyLines.map(l => escapeXml(l)).join('<br/>')}
    </div>
  </foreignObject>
  
  <!-- Bottom slogan -->
  <rect x="0" y="${H - 120}" width="${W}" height="120" fill="${COLORS.gold}" opacity="0.15"/>
  <text x="${W/2}" y="${H - 70}" font-family="Tahoma, Arial" font-size="42" font-weight="bold" fill="${COLORS.gold}" text-anchor="middle" direction="rtl">
    احنا بتوع الإيجار
  </text>
  <text x="${W/2}" y="${H - 30}" font-family="Tahoma, Arial" font-size="22" fill="${COLORS.ivory}" text-anchor="middle" opacity="0.7">
    madmonacairo.com
  </text>
</svg>`
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    if ((current + ' ' + word).length > maxChars) {
      if (current) lines.push(current)
      current = word
    } else {
      current = current ? current + ' ' + word : word
    }
  }
  if (current) lines.push(current)
  return lines
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Generate an image for a post and upload to Supabase Storage
 * Returns the public URL of the uploaded image
 *
 * Prefers real listing photo (params.listingId) over branded SVG card.
 */
export async function generateAndUploadImage(
  params: GenerateImageParams & { contentId: string }
): Promise<{ ok: boolean; url?: string; error?: string; source?: 'listing_photo' | 'branded_card' }> {
  try {
    // Mode 1: try to fetch real listing photo and build a photo-backed SVG
    let svg: string
    let source: 'listing_photo' | 'branded_card' = 'branded_card'
    if (params.listingId) {
      const photoUrl = await fetchListingPrimaryPhoto(params.listingId)
      if (photoUrl) {
        svg = buildPhotoBackedSVG({ ...params, photoUrl })
        source = 'listing_photo'
      } else {
        svg = buildPostSVG(params)
      }
    } else {
      svg = buildPostSVG(params)
    }

    // Convert SVG to buffer using built-in encoding
    const svgBuffer = Buffer.from(svg, 'utf-8')

    // Upload as SVG to Supabase Storage
    const fileName = `posts/${params.contentId}.svg`

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('content-images')
      .upload(fileName, svgBuffer, {
        contentType: 'image/svg+xml',
        upsert: true,
      })

    if (uploadError) {
      return { ok: false, error: uploadError.message }
    }

    // Get public URL of SVG
    const { data: urlData } = supabaseAdmin.storage
      .from('content-images')
      .getPublicUrl(uploadData.path)

    const svgUrl = urlData.publicUrl

    // Convert SVG to PNG via weserv.nl (free, no auth needed)
    const pngUrl = `https://wsrv.nl/?url=${encodeURIComponent(svgUrl)}&output=png&w=1080&h=1350`

    return { ok: true, url: pngUrl, source }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown' }
  }
}
