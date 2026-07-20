import { safeStorage } from '@/lib/safe-storage'
// ============================================================================
// saved-accounts.ts — Manages list of remembered accounts in localStorage
//
// Stores: phone number + display label only (NEVER passwords).
// Used for fast account switching from /account page.
// ============================================================================

const STORAGE_KEY = 'madmona_saved_accounts_v1'
const MAX_ACCOUNTS = 5

export interface SavedAccount {
  phone: string          // normalized phone (01002229982)
  label: string          // "محمد علي" or "Madmona Supplier"
  role?: string          // 'customer' | 'supplier' | 'admin'
  lastUsed: number       // unix timestamp ms
}

export function getSavedAccounts(): SavedAccount[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = safeStorage.get(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(a => a && typeof a.phone === 'string')
      .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))
      .slice(0, MAX_ACCOUNTS)
  } catch {
    return []
  }
}

export function saveAccount(phone: string, label: string, role?: string): void {
  if (typeof window === 'undefined') return
  if (!phone) return
  try {
    const existing = getSavedAccounts()
    const filtered = existing.filter(a => a.phone !== phone)
    const updated: SavedAccount[] = [
      { phone, label: label || phone, role, lastUsed: Date.now() },
      ...filtered,
    ].slice(0, MAX_ACCOUNTS)
    safeStorage.set(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // ignore quota errors
  }
}

export function removeSavedAccount(phone: string): void {
  if (typeof window === 'undefined') return
  try {
    const existing = getSavedAccounts()
    const filtered = existing.filter(a => a.phone !== phone)
    safeStorage.set(STORAGE_KEY, JSON.stringify(filtered))
  } catch {
    // ignore
  }
}

export function clearAllSavedAccounts(): void {
  if (typeof window === 'undefined') return
  try {
    safeStorage.remove(STORAGE_KEY)
  } catch {
    // ignore
  }
}
