// src/app/api/agents/email-content-digest/route.ts
// Email all drafted content to Mohamed in one organized email

import { NextRequest, NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'

export const runtime = 'nodejs'
export const maxDuration = 60

const OWNER_EMAIL = 'madmona.admin@gmail.com'

function checkAuth(request: NextRequest): boolean {
  const auth = request.headers.get('authorization')
  const expected = process.env.AGENT_WEBHOOK_SECRET
  if (!expected) return false
  return auth === `Bearer ${expected}`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br/>')
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [posts, ads, reels, campaigns] = await Promise.all([
    supabaseAdmin
      .from('content_calendar')
      .select('id, title, body, hashtags, cta, content_type, created_at')
      .eq('status', 'drafted')
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('ad_creatives')
      .select('id, headline, primary_text, cta_text, category, ad_type, created_at')
      .eq('status', 'drafted')
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('reel_scripts')
      .select('id, title, hook, caption, hashtags, total_duration_sec, created_at')
      .eq('status', 'drafted')
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('marketing_campaigns')
      .select('id, campaign_name, campaign_type, message_template, created_at')
      .eq('status', 'draft')
      .order('created_at', { ascending: false }),
  ])

  type Post = { id: string; title: string; body: string; hashtags: string[] | null; cta: string | null; content_type: string; created_at: string }
  type Ad = { id: string; headline: string; primary_text: string | null; cta_text: string | null; category: string; ad_type: string; created_at: string }
  type Reel = { id: string; title: string; hook: string; caption: string; hashtags: string[] | null; total_duration_sec: number; created_at: string }
  type Campaign = { id: string; campaign_name: string; campaign_type: string; message_template: string; created_at: string }

  const allPosts = (posts.data ?? []) as Post[]
  const allAds = (ads.data ?? []) as Ad[]
  const allReels = (reels.data ?? []) as Reel[]
  const allCampaigns = (campaigns.data ?? []) as Campaign[]
  const total = allPosts.length + allAds.length + allReels.length + allCampaigns.length

  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><title>المحتوى الجاهز</title></head>
<body style="margin:0;padding:0;background:#FAFAF7;font-family:Tahoma,sans-serif;color:#1a1a1a;direction:rtl">
<div style="max-width:780px;margin:0 auto;padding:20px">
<div style="background:linear-gradient(135deg,#059669 0%,#34D399 100%);color:#fff;padding:32px;border-radius:24px;text-align:center;margin-bottom:24px">
<h1 style="margin:0;font-size:32px;font-weight:900">📦 المحتوى الجاهز</h1>
<p style="margin:8px 0 0;font-size:14px;opacity:0.9">${total} محتوى جاهز للنشر</p>
<div style="margin-top:20px;padding:8px 16px;background:rgba(255,255,255,0.15);border-radius:20px;font-size:13px;display:inline-block">
📸 ${allPosts.length} Instagram • 📱 ${allAds.length} ads • 🎬 ${allReels.length} reels • 💬 ${allCampaigns.length} campaigns
</div></div>
${allPosts.length > 0 ? `<h2 style="color:#059669;font-size:24px;margin:32px 0 16px;border-bottom:3px solid #2FA084;padding-bottom:8px">📸 Instagram Posts (${allPosts.length})</h2>${allPosts.map((p, i) => `<div style="background:#fff;border-radius:16px;padding:24px;margin-bottom:16px;border-right:4px solid #059669"><div style="font-size:11px;color:#999;margin-bottom:4px">#${i + 1} • ${p.content_type === 'instagram_carousel' ? 'Carousel' : 'Single Post'}</div><h3 style="margin:0 0 12px;font-size:18px;color:#059669">${escapeHtml(p.title)}</h3><div style="background:#FAF7F0;padding:16px;border-radius:12px;font-size:14px;line-height:1.7">${escapeHtml(p.body)}</div>${p.cta ? `<div style="margin-top:12px;padding:8px 16px;background:#059669;color:#fff;border-radius:8px;display:inline-block;font-size:13px;font-weight:bold">📢 ${escapeHtml(p.cta)}</div>` : ''}${p.hashtags && p.hashtags.length > 0 ? `<div style="margin-top:12px;color:#2FA084;font-size:12px">${escapeHtml(p.hashtags.join(' '))}</div>` : ''}</div>`).join('')}` : ''}
${allReels.length > 0 ? `<h2 style="color:#059669;font-size:24px;margin:32px 0 16px;border-bottom:3px solid #2FA084;padding-bottom:8px">🎬 Reel Scripts (${allReels.length})</h2>${allReels.map((r, i) => `<div style="background:#fff;border-radius:16px;padding:24px;margin-bottom:16px;border-right:4px solid #6FCF97"><div style="font-size:11px;color:#999;margin-bottom:4px">#${i + 1} • ${r.total_duration_sec}s</div><h3 style="margin:0 0 12px;font-size:18px;color:#059669">${escapeHtml(r.title)}</h3><div style="background:#059669;color:#FAF7F0;padding:12px;border-radius:8px;margin-bottom:12px;font-weight:bold">💥 Hook: ${escapeHtml(r.hook)}</div><div style="background:#FAF7F0;padding:16px;border-radius:12px;font-size:14px;line-height:1.7">${escapeHtml(r.caption)}</div>${r.hashtags && r.hashtags.length > 0 ? `<div style="margin-top:12px;color:#2FA084;font-size:12px">${escapeHtml(r.hashtags.join(' '))}</div>` : ''}</div>`).join('')}` : ''}
${allAds.length > 0 ? `<h2 style="color:#059669;font-size:24px;margin:32px 0 16px;border-bottom:3px solid #2FA084;padding-bottom:8px">📱 Facebook/Meta Ads (${allAds.length})</h2>${allAds.map((a, i) => `<div style="background:#fff;border-radius:16px;padding:20px;margin-bottom:12px;border-right:4px solid #2FA084"><div style="font-size:11px;color:#999;margin-bottom:4px">#${i + 1} • ${escapeHtml(a.category)}</div><h3 style="margin:0 0 8px;font-size:16px;color:#059669">${escapeHtml(a.headline)}</h3>${a.primary_text ? `<div style="background:#FAF7F0;padding:12px;border-radius:8px;font-size:13px;line-height:1.7">${escapeHtml(a.primary_text)}</div>` : ''}${a.cta_text ? `<div style="margin-top:8px;padding:6px 12px;background:#2FA084;color:#fff;border-radius:6px;display:inline-block;font-size:12px;font-weight:bold">${escapeHtml(a.cta_text)}</div>` : ''}</div>`).join('')}` : ''}
${allCampaigns.length > 0 ? `<h2 style="color:#059669;font-size:24px;margin:32px 0 16px;border-bottom:3px solid #2FA084;padding-bottom:8px">💬 Marketing Campaigns (${allCampaigns.length})</h2>${allCampaigns.map((c, i) => `<div style="background:#fff;border-radius:16px;padding:24px;margin-bottom:16px;border-right:4px solid #34D399"><div style="font-size:11px;color:#999;margin-bottom:4px">#${i + 1} • ${escapeHtml(c.campaign_type)}</div><h3 style="margin:0 0 12px;font-size:18px;color:#059669">${escapeHtml(c.campaign_name)}</h3><div style="background:#FAF7F0;padding:16px;border-radius:12px;font-size:14px;line-height:1.7">${escapeHtml(c.message_template)}</div></div>`).join('')}` : ''}
<div style="margin-top:32px;padding:24px;background:#059669;color:#fff;border-radius:24px;text-align:center">
<p style="margin:0 0 8px;font-size:16px;font-weight:bold">معاملاتك مضمونة 💚</p>
<p style="margin:0;font-size:11px;opacity:0.6">madmonacairo.com</p>
</div>
</div></body></html>`

  const result = await sendEmail({
    to: OWNER_EMAIL,
    subject: `📦 ${total} محتوى جاهز للنشر — مضمونة`,
    html,
  })

  return NextResponse.json({
    sent: result.ok,
    error: result.error,
    counts: {
      instagram_posts: allPosts.length,
      ads: allAds.length,
      reels: allReels.length,
      campaigns: allCampaigns.length,
      total,
    },
  })
}
