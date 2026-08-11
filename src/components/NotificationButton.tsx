'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, BellRing, Loader2, X, CheckCircle, XCircle } from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageProvider'
import {
  isPushSupported,
  getNotificationPermission,
  isSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push-subscription'

// ============================================================================
// NotificationButton — compact bell button for TopNav
// Shows pulsing CTA dot when not subscribed, solid bell when subscribed
// ============================================================================

type Status = 'loading' | 'unsupported' | 'denied' | 'idle' | 'subscribed'

interface Props {
  variant?: 'icon-only' | 'compact'
}

export default function NotificationButton({ variant = 'icon-only' }: Props) {
  const { t, dir } = useT()
  const [status, setStatus] = useState<Status>('loading')
  const [busy, setBusy] = useState(false)
  const [tooltip, setTooltip] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    const init = async () => {
      if (!isPushSupported()) { setStatus('unsupported'); return }
      const perm = getNotificationPermission()
      if (perm === 'denied') { setStatus('denied'); return }
      const subscribed = await isSubscribed()
      setStatus(subscribed ? 'subscribed' : 'idle')
    }
    init()
  }, [])

  const showTooltip = (msg: string) => {
    setTooltip(msg)
    setTimeout(() => setTooltip(null), 3000)
  }

  const handleEnable = async () => {
    setBusy(true)
    const result = await subscribeToPush()
    setBusy(false)
    if (result.ok) {
      setStatus('subscribed')
      showTooltip('✅ ' + t('comp.nb.enabled_ok'))
      setModalOpen(false)
    } else {
      const perm = getNotificationPermission()
      if (perm === 'denied') {
        setStatus('denied')
      }
      showTooltip('❌ ' + (result.error || t('comp.nb.enable_failed')))
    }
  }

  const handleDisable = async () => {
    setBusy(true)
    const result = await unsubscribeFromPush()
    setBusy(false)
    if (result.ok) {
      setStatus('idle')
      showTooltip(t('comp.nb.disabled_ok'))
      setModalOpen(false)
    } else {
      showTooltip('❌ ' + (result.error || t('comp.nb.failed')))
    }
  }

  if (status === 'loading' || status === 'unsupported') return null

  // Choose visual based on status
  const cfg = {
    idle: {
      icon: <Bell className="w-5 h-5" strokeWidth={2.25} />,
      bg: 'bg-white/15 hover:bg-white/25',
      text: 'text-white',
      pulse: true,
      label: t('comp.nb.cfg_idle'),
    },
    subscribed: {
      icon: <BellRing className="w-5 h-5" strokeWidth={2.25} />,
      bg: 'bg-white',
      text: 'text-[#1F6F5F]',
      pulse: false,
      label: t('comp.nb.cfg_subscribed'),
    },
    denied: {
      icon: <BellOff className="w-5 h-5" strokeWidth={2.25} />,
      bg: 'bg-red-500/20',
      text: 'text-red-100',
      pulse: false,
      label: t('comp.nb.cfg_denied'),
    },
  }[status as 'idle' | 'subscribed' | 'denied']

  const buttonClass = variant === 'compact'
    ? `flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5 ${cfg.bg} ${cfg.text} shadow-soft hover:shadow-card`
    : `relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all hover:-translate-y-0.5 shadow-soft hover:shadow-card ${cfg.bg} ${cfg.text}`

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={buttonClass}
        aria-label={cfg.label}
        title={cfg.label}
      >
        {cfg.icon}
        {variant === 'compact' && <span className="hidden lg:inline">{t('comp.nb.compact')}</span>}

        {cfg.pulse && (
          <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2FA084] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#2FA084] border border-white" />
          </span>
        )}
      </button>

      {tooltip && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[10000] bg-gray-900 text-white text-xs font-bold px-4 py-2 rounded-full shadow-luxe">
          {tooltip}
        </div>
      )}

      {modalOpen && (
        <>
          <div
            className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
            onClick={() => !busy && setModalOpen(false)}
          />
          <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center p-4 pointer-events-none" dir={dir}>
            <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full pointer-events-auto">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    status === 'subscribed' ? 'bg-[#1F6F5F]/10 text-[#1F6F5F]'
                      : status === 'denied' ? 'bg-red-100 text-red-600'
                      : 'bg-[#2FA084]/10 text-[#2FA084]'
                  }`}>
                    {status === 'subscribed' ? <BellRing className="w-6 h-6" />
                      : status === 'denied' ? <BellOff className="w-6 h-6" />
                      : <Bell className="w-6 h-6" />}
                  </div>
                  <div>
                    <h2 className="font-black text-gray-900 text-lg">{t('comp.nb.modal_title')}</h2>
                    <p className="text-xs text-gray-500">
                      {status === 'subscribed' ? t('comp.nb.status_subscribed') : status === 'denied' ? t('comp.nb.status_denied') : t('comp.nb.status_idle')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !busy && setModalOpen(false)}
                  disabled={busy}
                  className="w-9 h-9 hover:bg-gray-100 rounded-xl flex items-center justify-center transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {status === 'idle' && (
                <>
                  <div className="bg-gradient-to-l from-[#1F6F5F]/5 to-[#2FA084]/5 rounded-2xl p-4 mb-4">
                    <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                      <span className="text-lg">🔔</span>
                      {t('comp.nb.idle_when')}
                    </h3>
                    <ul className="space-y-2 text-sm text-gray-700 pr-2">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-[#1F6F5F] flex-shrink-0 mt-0.5" />
                        <span>{t('comp.nb.benefit1')}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-[#1F6F5F] flex-shrink-0 mt-0.5" />
                        <span>{t('comp.nb.benefit2')}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-[#1F6F5F] flex-shrink-0 mt-0.5" />
                        <span>{t('comp.nb.benefit3')}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-[#1F6F5F] flex-shrink-0 mt-0.5" />
                        <span>{t('comp.nb.benefit4')}</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={handleEnable}
                    disabled={busy}
                    className="w-full bg-[#1F6F5F] hover:bg-[#1F6F5F]/90 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors shadow-elevated"
                  >
                    {busy ? <><Loader2 className="w-5 h-5 animate-spin" /><span>{t('comp.nb.enabling')}</span></>
                      : <><Bell className="w-5 h-5" /><span>{t('comp.nb.enable_now')}</span></>}
                  </button>
                  <p className="text-[11px] text-center text-gray-400 mt-3">
                    {t('comp.nb.cancel_anytime')}
                  </p>
                </>
              )}

              {status === 'subscribed' && (
                <>
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-green-900">{t('comp.nb.working')}</p>
                        <p className="text-xs text-green-800 mt-1">
                          {t('comp.nb.working_sub')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDisable}
                    disabled={busy}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                  >
                    {busy ? <><Loader2 className="w-4 h-4 animate-spin" /><span>{t('comp.push.busy')}</span></>
                      : <><BellOff className="w-4 h-4" /><span>{t('comp.push.disable_btn')}</span></>}
                  </button>
                </>
              )}

              {status === 'denied' && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-red-900">{t('comp.nb.denied_title')}</p>
                      <p className="text-xs text-red-800 mt-1 leading-relaxed">
                        {t('comp.nb.denied_sub')}
                      </p>
                    </div>
                  </div>
                  <ol className="text-xs text-red-900 space-y-1 pr-6 list-decimal">
                    <li>{t('comp.nb.step1')}</li>
                    <li>{t('comp.nb.step2')}</li>
                    <li>{t('comp.nb.step3')}</li>
                    <li>{t('comp.nb.step4')}</li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
