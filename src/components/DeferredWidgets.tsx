'use client'
// ⚡ (4 Aug 2026) FCP: ودجتس جانبية غير حرجة للرسم الأول — بتتحمّل dynamic
// بعد الهيدرة بدل ما تتشحن في باندل أول رسمة وتزاحم الـFCP.
// (كانت كلها بتترندر مباشرة في الـroot layout — منهم AutoResubscribe مرتين!)
import dynamic from 'next/dynamic'

const NotificationPrompt = dynamic(() => import('./NotificationPrompt'), { ssr: false })
const MadmonaListingClaimer = dynamic(() => import('./MadmonaListingClaimer'), { ssr: false })
const ReferralCapture = dynamic(() => import('./ReferralCapture'), { ssr: false })
const AutoResubscribe = dynamic(() => import('./AutoResubscribe'), { ssr: false })
const DailyMessageBanner = dynamic(() => import('./DailyMessageBanner'), { ssr: false })
const MaridChatFab = dynamic(() => import('./MaridChatFab'), { ssr: false })

export default function DeferredWidgets() {
  return (
    <>
      <NotificationPrompt />
      <MadmonaListingClaimer />
      <ReferralCapture />
      <AutoResubscribe />
      <DailyMessageBanner />
      <MaridChatFab />
    </>
  )
}
