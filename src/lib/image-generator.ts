// src/lib/image-generator.ts
// Generate Instagram-ready images from text content using SVG
// SVG renders perfectly with Arabic text and uploads to Supabase Storage

import { supabase as supabaseAdmin } from './supabase'

// Madmona brand colors
const COLORS = {
  green: '#1F5F3F',
  ivory: '#FAF7F0',
  gold: '#B8860B',
  rust: '#C2410C',
  white: '#FFFFFF',
}

interface GenerateImageParams {
  title: string
  body: string
  contentType: 'instagram_post' | 'instagram_carousel'
  hashtags?: string[]
}

/**
 * Build a 1080x1350 SVG (4:5 ratio - optimal for Instagram feed)
 * with Madmona branding
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
 */
export async function generateAndUploadImage(
  params: GenerateImageParams & { contentId: string }
): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const svg = buildPostSVG(params)
    
    // Convert SVG to buffer using built-in encoding
    const svgBuffer = Buffer.from(svg, 'utf-8')
    
    // Upload as SVG (Instagram doesn't accept SVG, but we can serve it via image conversion service)
    // Better: use Supabase storage to host the SVG, then use weserv.nl or similar to convert to PNG
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
    // Returns a PNG URL that Instagram can read
    const pngUrl = `https://wsrv.nl/?url=${encodeURIComponent(svgUrl)}&output=png&w=1080&h=1350`
    
    return { ok: true, url: pngUrl }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown' }
  }
}
