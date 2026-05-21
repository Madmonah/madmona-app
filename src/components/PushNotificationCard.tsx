'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageProvider'
import {
  isPushSupported,
  getNotificationPermission,
  isSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push-subscription'

// ============================================================================
// PushNotificationCard
//
// Drop-in component that shows the user a button to enable/disable
// push notifications. Renders nothing if push is unsupported.
// ============================================================================

type Status = 'loading' | 'unsupported' | 'denied' | 'idle' | 'subscribed'

export default function PushNotificationCard() {
  const { t } = useT()
  const [status, setStatus] = useState<Status>('loading')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [msgOk, setMsgOk] = useState(false)

  useEffect(() => {
    const init = async () => {
      if (!isPushSupported()) {
        setStatus('unsupported')
        return
      }

      const perm = getNotificationPermission()
      if (perm === 'denied') {
        setStatus('denied')
        return
      }

      const subscribed = await isSubscribed()
      setStatus(subscribed ? 'subscribed' : 'idle')
    }
    init()
  }, [])

  const handleEnable = async () => {
    setBusy(true)
    setMessage(null)
    const result = await subscribeToPush()
    setBusy(false)

    if (result.ok) {
      setStatus('subscribed')
      setMsgOk(true)
      setMessage(t('comp.push.enabled_ok'))
      setTimeout(() => setMessage(null), 3000)
    } else {
      setMsgOk(false)
      setMessage(result.error || t('common.error'))

      // Re-check permission state
      const perm = getNotificationPermission()
      if (perm === 'denied') {
        setStatus('denied')
      }
    }
  }

  const handleDisable = async () => {
    setBusy(true)
    setMessage(null)
    const result = await unsubscribeFromPush()
    setBusy(false)
    if (result.ok) {
      setStatus('idle')
      setMsgOk(true)
      setMessage(t('comp.push.disabled_ok'))
      setTimeout(() => setMessage(null), 3000)
    } else {
      setMsgOk(false)
      setMessage(result.error || t('common.error'))
    }
  }

  if (status === 'loading' || status === 'unsupported') {
    return null
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
          status === 'subscribed' ? 'bg-[#1F6F5F]/10 text-[#1F6F5F]' : 'bg-gray-100 text-gray-500'
        }`}>
          {status === 'subscribed' ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-sm">{t('comp.push.title')}</h3>
          {status === 'subscribed' && (
            <p className="text-xs text-gray-500 mt-0.5">
              {t('comp.push.subscribed_sub')}
            </p>
          )}
          {status === 'idle' && (
            <p className="text-xs text-gray-500 mt-0.5">
              {t('comp.push.idle_sub')}
            </p>
          )}
          {status === 'denied' && (
            <p className="text-xs text-red-600 mt-0.5">
              {t('comp.push.denied_sub')}
            </p>
          )}

          {message && (
            <div className={`mt-2 text-xs px-2 py-1 rounded-lg inline-flex items-center gap-1 ${
              msgOk ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {msgOk ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              {message}
            </div>
          )}

          <div className="mt-3">
            {status === 'subscribed' ? (
              <button
                onClick={handleDisable}
                disabled={busy}
                className="text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl flex items-center gap-1.5 disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <BellOff className="w-3 h-3" />}
                {busy ? t('comp.push.busy') : t('comp.push.disable_btn')}
              </button>
            ) : status === 'idle' ? (
              <button
                onClick={handleEnable}
                disabled={busy}
                className="text-xs font-bold text-white bg-[#1F6F5F] hover:bg-[#1F6F5F]/90 px-4 py-2 rounded-xl flex items-center gap-1.5 disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bell className="w-3 h-3" />}
                {busy ? t('comp.push.busy') : t('comp.push.enable_btn')}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
