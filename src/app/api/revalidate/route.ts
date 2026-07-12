// =====================================================================
// 🔄 On-demand revalidation — بورصة عقارات مضمونة
// أي تغيير في property_opportunities / property_market_items (DB trigger)
// بينده على الراوت ده فيتمسح كاش الصفحة فوراً بدل ما نستنى ساعة (ISR).
// الحماية: هيدر x-revalidate-secret لازم يساوي REVALIDATE_SECRET.
// =====================================================================
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// المسارات المسموح بتحديثها (whitelist — مش أي مسار)
const ALLOWED = new Set<string>([
  '/real-estate/market',
  '/real-estate',
  '/marketplace',
])

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-revalidate-secret') || ''
  const expected = process.env.REVALIDATE_SECRET || ''

  if (!expected) {
    return NextResponse.json({ error: 'REVALIDATE_SECRET not configured' }, { status: 500 })
  }
  if (secret !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let paths: string[] = []
  try {
    const body = await req.json()
    const raw = Array.isArray(body?.paths) ? body.paths : [body?.path]
    paths = raw.filter((p: unknown): p is string => typeof p === 'string' && ALLOWED.has(p))
  } catch {
    paths = []
  }

  if (paths.length === 0) paths = ['/real-estate/market']

  const done: string[] = []
  for (const p of paths) {
    try {
      revalidatePath(p)
      done.push(p)
    } catch { /* تجاهل مسار فشل، كمّل الباقي */ }
  }

  return NextResponse.json({ revalidated: done, at: new Date().toISOString() })
}
