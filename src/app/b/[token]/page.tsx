// ============================================================================
// 🖥️ /b/[token] — صفحة سيرفر
//
// (٢٨ أغسطس ٢٠٢٦) محمد: «الصفحة تتبني على السيرفر» — أكيد.
//
// 🐞 المشكلة: الصفحة كانت 'use client' بالكامل، فالـHTML اللي بيوصل
//    فاضي (BAILOUT_TO_CLIENT) والداتا بتتجاب بعد ما المتصفح يحمّل
//    الجافاسكريبت كله. في قاعة معرض بإنترنت ضعيف، العارض بيبص على
//    شاشة فاضية وإحنا واقفين قدامه — أسوأ لحظة ممكنة.
//
// ✅ دلوقتي: السيرفر بيجيب الداتا ويبعت HTML كامل. العارض يشوف اسم
//    شركته ولوجوها فورًا، والجافاسكريبت بيحمّل ورا عشان زرار الاستلام.
//
// 🔐 بنستخدم المفتاح العام (anon) — الدالة get_prospect_preview
//    security definer ومصمّمة للزوار، فمفيش تسريب.
// ============================================================================
import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import ProspectView, { type Preview } from './ProspectView'

// ⏱️ الصفحة بتتجدد كل دقيقة — لو عدّلنا بيانات شركة تظهر بسرعة،
//    ومع ذلك التحميل بيفضل فوري من الكاش.
export const revalidate = 60

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )
}

async function getPreview(token: string): Promise<Preview | null> {
  try {
    const { data } = await (db().rpc as unknown as (
      f: string, a: Record<string, unknown>,
    ) => Promise<{ data: unknown }>)('get_prospect_preview', { p_token: token, p_lang: 'ar' })
    return (data as Preview) ?? null
  } catch {
    // 🛟 لو السيرفر مش قادر يوصل، الكومبوننت بيتعامل مع null
    return null
  }
}

// 🏷️ عنوان الصفحة باسم الشركة — يبان في تاب المتصفح وفي المشاركة
export async function generateMetadata(
  { params }: { params: Promise<{ token: string }> },
): Promise<Metadata> {
  const { token } = await params
  const d = await getPreview(token)
  if (!d) return { title: 'مضمونة' }
  return {
    title: `${d.business_name} — نظام إدارتك على مضمونة`,
    description: d.description || `${d.business_name} — نظام إدارة كامل جاهز على مضمونة`,
    openGraph: {
      title: `${d.business_name} على مضمونة`,
      description: d.description || 'نظام إدارة كامل جاهز — استلمه بضغطة',
      images: d.logo_url ? [d.logo_url] : undefined,
    },
  }
}

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const data = await getPreview(token)
  return <ProspectView token={token} data={data} />
}
