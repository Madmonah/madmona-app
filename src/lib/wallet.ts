// src/lib/wallet.ts
// =====================================================================
// المحفظة الإلكترونية — أنواع وأدوات عرض آمنة للـ client و الـ server.
// ⚠️ مفيش أي استيراد لـ service-role (سيرفر) هنا — عشان الصفحات الـ client
//    تقدر تستورد منه من غير ما يتحمّل كود سيرفر في المتصفح.
//    كود المصادقة السيرفر موجود في wallet-server.ts
// =====================================================================

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

export interface AuthedUser { id: string; role: string | null }

// ---------- Display helpers (client-safe) ----------
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
