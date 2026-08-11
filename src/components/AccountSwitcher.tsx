'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Users, Plus, LogOut, Trash2, Check, ArrowRight, ShieldCheck, Building2, User,
  Loader2, Phone,
} from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { getSavedAccounts, removeSavedAccount, type SavedAccount } from '@/lib/saved-accounts'
import { useT } from '@/lib/i18n/LanguageProvider'

// ============================================================================
// AccountSwitcher — switch between accounts WITHOUT going to browser settings
//
// Props:
//   currentPhone? — current logged-in user's phone (to mark as "active")
//   currentLabel? — current account display label
//   currentRole? — 'customer' | 'supplier' | 'admin'
//
// Behavior:
//   - Lists all saved accounts (from localStorage)
//   - Click another account → signs out current + redirects to /auth/login?phone=X
//   - Click "Add another" → opens /auth/login (no preset)
// ============================================================================

interface Props {
  currentPhone?: string | null
  currentLabel?: string | null
  currentRole?: string | null
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'comp.as.role_admin',
  supplier: 'comp.as.role_supplier',
  customer: 'comp.as.role_customer',
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  supplier: 'bg-[#2FA084]/15 text-[#2FA084]',
  customer: 'bg-[#FA8125]/10 text-[#FA8125]',
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  admin: <ShieldCheck className="w-3.5 h-3.5" />,
  supplier: <Building2 className="w-3.5 h-3.5" />,
  customer: <User className="w-3.5 h-3.5" />,
}

export default function AccountSwitcher({ currentPhone, currentLabel, currentRole }: Props) {
  const { t } = useT()
  const router = useRouter()
  const [accounts, setAccounts] = useState<SavedAccount[]>([])
  const [switching, setSwitching] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)

  useEffect(() => {
    setAccounts(getSavedAccounts())
  }, [])

  const handleSwitch = async (account: SavedAccount) => {
    if (switching) return
    setSwitching(account.phone)
    try {
      // Sign out current Supabase session
      await supabaseBrowser.auth.signOut()
      // Clear admin password if any
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('madmona_admin_pw')
      }
      // Redirect to login with phone pre-filled
      router.push(`/auth/login?phone=${encodeURIComponent(account.phone)}`)
    } catch {
      setSwitching(null)
    }
  }

  const handleRemove = (phone: string) => {
    removeSavedAccount(phone)
    setAccounts(getSavedAccounts())
    setConfirmRemove(null)
  }

  // Filter out the current account from the list (already shown at top)
  const otherAccounts = accounts.filter(a => a.phone !== currentPhone)

  return (
    <div className="bg-white rounded-3xl shadow-soft p-5 md:p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl bg-[#FA8125]/10 flex items-center justify-center flex-shrink-0">
          <Users className="w-5 h-5 text-[#FA8125]" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-black text-gray-900 text-base">{t('comp.as.title')}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{t('comp.as.sub')}</p>
        </div>
      </div>

      {/* Current account card */}
      {currentPhone && (
        <div className="bg-[#FA8125]/5 border border-[#FA8125]/20 rounded-2xl p-3 mb-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white shadow-soft flex items-center justify-center flex-shrink-0">
            <Check className="w-5 h-5 text-[#FA8125]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <p className="font-bold text-sm text-gray-900 truncate">{currentLabel || t('comp.as.current_account')}</p>
              {currentRole && (
                <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${ROLE_COLORS[currentRole] || 'bg-gray-100 text-gray-700'}`}>
                  {ROLE_ICONS[currentRole]}
                  {ROLE_LABELS[currentRole] ? t(ROLE_LABELS[currentRole]) : currentRole}
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-500" dir="ltr" style={{ textAlign: 'right' }}>
              {currentPhone}
            </p>
          </div>
          <span className="text-[10px] font-black text-[#FA8125] bg-white px-2 py-1 rounded-full whitespace-nowrap">
            {t('comp.as.active_now')}
          </span>
        </div>
      )}

      {/* Other saved accounts */}
      {otherAccounts.length > 0 && (
        <div className="space-y-2 mb-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 px-1 mb-2">
            {t('comp.as.saved_accounts', { n: otherAccounts.length })}
          </p>
          {otherAccounts.map((account) => {
            const isSwitching = switching === account.phone
            const isRemoving = confirmRemove === account.phone

            return (
              <div
                key={account.phone}
                className="bg-[#FAFAF7] hover:bg-white border border-gray-100 hover:border-gray-200 hover:shadow-card rounded-2xl p-3 flex items-center gap-3 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-white shadow-soft flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4 text-gray-500" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="font-bold text-sm text-gray-900 truncate">{account.label}</p>
                    {account.role && (
                      <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${ROLE_COLORS[account.role] || 'bg-gray-100 text-gray-700'}`}>
                        {ROLE_ICONS[account.role]}
                        {ROLE_LABELS[account.role] ? t(ROLE_LABELS[account.role]) : account.role}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500" dir="ltr" style={{ textAlign: 'right' }}>
                    {account.phone}
                  </p>
                </div>

                {isRemoving ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleRemove(account.phone)}
                      className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700"
                    >
                      {t('comp.as.delete')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmRemove(null)}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-200"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleSwitch(account)}
                      disabled={isSwitching || !!switching}
                      className="inline-flex items-center gap-1 bg-[#FA8125] hover:bg-[#FA8125]/90 text-white text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                    >
                      {isSwitching ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>...</span>
                        </>
                      ) : (
                        <>
                          <span>{t('auth.login_btn')}</span>
                          <ArrowRight className="w-3 h-3" />
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmRemove(account.phone)}
                      disabled={!!switching}
                      className="w-7 h-7 hover:bg-red-50 hover:text-red-600 text-gray-400 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
                      title={t('comp.as.remove_from_list')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add new account / sign out + log in to another */}
      {currentPhone ? (
        <button
          type="button"
          onClick={async () => {
            await supabaseBrowser.auth.signOut()
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('madmona_admin_pw')
            }
            router.push('/auth/login')
          }}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 hover:border-[#FA8125] hover:bg-[#FA8125]/5 hover:text-[#FA8125] text-gray-600 rounded-2xl text-sm font-bold transition-all"
        >
          <Plus className="w-4 h-4" />
          {t('comp.as.login_another')}
        </button>
      ) : (
        <Link
          href="/auth/login"
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#FA8125] text-white rounded-2xl text-sm font-bold no-underline hover:bg-[#FA8125]/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('comp.as.add_account')}
        </Link>
      )}

      {/* Help text */}
      <p className="text-[11px] text-gray-400 text-center mt-3 leading-relaxed">
        {t('comp.as.help')}
      </p>
    </div>
  )
}
