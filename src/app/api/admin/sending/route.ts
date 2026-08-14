// src/app/api/admin/sending/route.ts
// ============================================================================
// 📡 «مين بيبعت إيه» — نداء واحد بيرجّع كل قنوات الإرسال.
//    نفس بوابة كلمة السر بتاعة /api/admin/leads (ADMIN_PASSWORD)، عشان
//    تشتغل من غير ما يبقى حسابك admin في الداتابيز.
// ============================================================================

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function checkAuth(request: Request): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false
  return request.headers.get('x-admin-password') === expected
}

export async function GET(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rpc = supabase.rpc as unknown as (
    fn: string,
    a?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>

  const { data, error } = await rpc('sending_overview')
  if (error) {
    console.error('[admin/sending] rpc error:', error.message)
    return NextResponse.json({ error: 'Failed', detail: error.message }, { status: 500 })
  }
  return NextResponse.json(data ?? {})
}
