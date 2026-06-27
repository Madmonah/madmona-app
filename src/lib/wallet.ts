// src/lib/wallet.ts
// =====================================================================
// المحفظة الإلكترونية — أنواع وأدوات مشتركة (سيرفر + كلاينت)
// =====================================================================
import { createClient } from '@supabase/supabase-js'
import { supabase as supabaseAdmin } from '@/lib/supabase'

// ---------- Types ----------
export type WalletStatus = 'active' | 'frozen' | 'closed'
export type WalletBalanceKind = 'cash' | 'credit'
export type WalletTxnType =
  | 'topup' | 'payment' | 'transfer_in' | 'transfer_out'
  | 'withdrawal' | 'withdrawal_refund' | 'refund'
  | 'credit_grant' | 'adjustment'
export type WalletTxnStatus = 'pending' | 'completed' | 'failed' | 'reversed'
export type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'paid' | 'cancelled'

export interface Wallet {
  id: string
  profile_id: string
  balance_cash: number
  balance_credit: number
  currency: string
  status: WalletStatus
  created_at: string
  updated_at: string
}

export interface WalletTransaction {
  id: string
  wallet_id: string
  profile_id: string
  type: WalletTxnType
  kind: WalletBalanceKind
  direction: 'in' | 'out'
  amount: number
  currency: string
  status: WalletTxnStatus
  balance_cash_after: number | null
  balance_credit_after: number | null
  reference_type: string | null
  reference_id: string | null
  counterparty_id: string | null
  description: string | null
  created_at: string
}

export interface WalletWithdrawal {
  id: string
  wallet_id: string
  profile_id: string
  amount: number
  currency: string
  method: string
  details: string
  status: WithdrawalStatus
  admin_notes: string | null
  processed_at: string | null
  created_at: string
}

// ---------- Display helpers ----------
export const WITHDRAW_METHODS: Record<string, string> = {
  bank_transfer: 'تحويل بنكي',
  instapay: 'إنستاباي',
  vodafone_cash: 'فودافون كاش',
  etisalat_cash: 'اتصالات كاش',
  orange_cash: 'أورنج كاش',
}

export const TXN_LABELS: Record<WalletTxnType, string> = {
  topup: 'شحن المحفظة',
  payment: 'دفع',
  transfer_in: 'تحويل وارد',
  transfer_out: 'تحويل صادر',
  withdrawal: 'سحب رصيد',
  withdrawal_refund: 'استرجاع سحب',
  refund: 'استرجاع دفعة',
  credit_grant: 'كريدت / مكافأة',
  adjustment: 'تعديل',
}

export function formatMoney(n: number, currency = 'EGP'): string {
  const v = Number(n || 0).toLocaleString('ar-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${v} ${currency === 'EGP' ? 'ج.م' : currency}`
}

// ---------- Server-side auth helper (Bearer token → profile) ----------
// Mirrors the pattern used across /api routes: anon client to validate the
// access token, then service-role client for the actual data work.
export interface AuthedUser { id: string; role: string | null }

export async function verifyUser(
  authHeader: string | null,
): Promise<{ ok: boolean; user?: AuthedUser; reason?: string }> {
  try {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { ok: false, reason: 'no_token' }
    }
    const token = authHeader.replace('Bearer ', '')
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data: { user } } = await sb.auth.getUser(token)
    if (!user) return { ok: false, reason: 'not_authenticated' }

    // @ts-ignore new schema not in generated types
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('role').eq('id', user.id).maybeSingle()

    return { ok: true, user: { id: user.id, role: (profile as { role?: string } | null)?.role ?? null } }
  } catch (e) {
    console.error('[wallet/verifyUser] error:', e)
    return { ok: false, reason: 'auth_error' }
  }
}

export async function verifyAdmin(
  authHeader: string | null,
): Promise<{ ok: boolean; user?: AuthedUser; reason?: string }> {
  const res = await verifyUser(authHeader)
  if (!res.ok) return res
  if (res.user?.role !== 'admin') return { ok: false, reason: 'not_admin' }
  return res
}
