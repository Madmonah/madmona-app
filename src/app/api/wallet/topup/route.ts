// src/app/api/wallet/topup/route.ts
// POST → شحن المحفظة.
// نظام هجين: دلوقتي بنشحن كريدت/كاش داخلي فورًا (provider='manual').
// جاهز للربط ببوابة دفع لاحقًا: امرر provider + provider_reference بعد نجاح الدفع.
import { NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { verifyUser } from '@/lib/wallet-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// لتفعيل/تعطيل الشحن الفوري بدون بوابة دفع (للتجربة الداخلية)
// 🔒 (١٢ أغسطس ٢٠٢٦ — مراجعة الأمان) الافتراضي بقى **مقفول**:
// كان `!== 'false'` يعني الشحن الفوري شغال إلا لو حد قفله صراحةً — وده
// معناه أي مستخدم مسجّل يشحن محفظته بأي مبلغ (لحد مليون) من غير ما يدفع
// مليم، والرصيد قابل للسحب والشراء. دلوقتي مقفول إلا لو
// WALLET_ALLOW_INSTANT_TOPUP='true' صراحةً (للتجربة الداخلية بس).
const ALLOW_INSTANT_TOPUP = process.env.WALLET_ALLOW_INSTANT_TOPUP === 'true'

export async function POST(request: Request) {
  const auth = await verifyUser(request.headers.get('authorization'))
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 })

  let body: { amount?: number; kind?: string; provider?: string; reference?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }

  const amount = Number(body.amount)
  const kind = body.kind === 'credit' ? 'credit' : 'cash'
  const provider = body.provider || 'manual'

  if (!amount || amount <= 0 || amount > 1_000_000) {
    return NextResponse.json({ error: 'invalid_amount' }, { status: 400 })
  }

  // بوابة الدفع لسه مش متفعّلة: أي شحن من العميل = رصيد ببلاش.
  // 🔒 الفحص بقى على **كل** الطلبات مش بس provider='manual' — قبل كده
  // العميل كان يقدر يبعت provider='أي حاجة' ويتخطى البوابة خالص
  // (اتكشف في مراجعة ١٢ أغسطس ٢٠٢٦). لما بوابة دفع حقيقية تتركب،
  // الشحن هيتم من مسار الـcallback بتاعها (بتحقق التوقيع) مش من هنا.
  if (!ALLOW_INSTANT_TOPUP) {
    return NextResponse.json({ error: 'topup_gateway_required' }, { status: 403 })
  }

  // @ts-ignore rpc not in generated types
  const { data, error } = await supabaseAdmin.rpc('wallet_topup', {
    p_profile: auth.user!.id,
    p_amount: amount,
    p_kind: kind,
    p_provider: provider,
    p_reference: body.reference ?? undefined,
    p_description: kind === 'credit' ? 'إضافة كريدت' : 'شحن المحفظة',
    p_actor: auth.user!.id,
  })

  if (error) {
    console.error('[api/wallet/topup]', error)
    return NextResponse.json({ error: error.message || 'topup_failed' }, { status: 400 })
  }
  return NextResponse.json({ ok: true, transaction: data })
}
