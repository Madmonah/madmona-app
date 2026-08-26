// 🌳 (٢٦ أغسطس ٢٠٢٦) /api/listing-drafts/categories
// شجرة تصنيفات الإضافة — نفس قواعد الويزارد بالظبط (lib/wizardCategories).
// بيستخدمها مودال «ضيف إعلان» في /admin/listings — وأي شاشة إضافة جاية.
// ميتاداتا عامة، فمفيش حساسية في عرضها (زي راوت attributes اللي جنبها).
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getWizardCategoryOptions } from '@/lib/wizardCategories'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

export async function GET() {
  try {
    const options = await getWizardCategoryOptions(supabase)
    return NextResponse.json({ success: true, options })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'unknown' },
      { status: 500 },
    )
  }
}
