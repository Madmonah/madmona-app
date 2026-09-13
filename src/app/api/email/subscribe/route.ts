// src/app/api/email/subscribe/route.ts
// 📧 (١٣/٩/٢٠٢٦) الاشتراك في نشرة «قصة حقيقية من عالم البيزنس» من المدونة و/pro.
// بيكتب في email_marketing_contacts عبر RPC بالـservice role. مفيش إرسال هنا — الحملات بتتحط في الطابور من الداتابيز.
import { NextRequest, NextResponse } from 'next/server'
import { supabase as admin } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  let body: { email?: string; name?: string; source?: string } = {}
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 }) }
  const email = String(body.email || '').trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email) || email.length > 200) return NextResponse.json({ ok: false, error: 'bad_email' }, { status: 400 })
  const source = String(body.source || 'newsletter').slice(0, 40).replace(/[^a-z0-9_:-]/gi, '')
  const rpc = (admin as unknown as { rpc: (f: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> }).rpc
  const { data, error } = await rpc('email_subscribe', { p_email: email, p_name: String(body.name || '').slice(0, 120) || null, p_source: source || 'newsletter' })
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json(data ?? { ok: true })
}
