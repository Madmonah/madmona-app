'use client'

// ============================================================================
// SiteAnalytics — طقم التتبّع التسويقي، بيشتغل على الموقع بس مش جوّه الشات.
// (٣١ يوليو ٢٠٢٦ — قرار محمد)
//
// السبب: شات مضمونة تطبيق مثبّت مش صفحة تسويقية، وكان وارث من اللايوت
// الرئيسي: Metricool + Google Analytics + Meta Pixel + Vercel Analytics +
// Speed Insights. دول دومينات خارجية، كل واحد بـDNS وTLS منفصلين، وأول
// فتحة كلهم باردين — فبيزاحموا تحميل التطبيق نفسه.
// قياس قبل التغيير: 35 <script> على صفحة /chat.
//
// أي حاجة تحت /chat مبتحمّلش أي منهم.
// ============================================================================

import { Suspense, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics'
import MetaPixel from '@/components/analytics/MetaPixel'
import AnalyticsTracker from '@/components/AnalyticsTracker'

const METRICOOL_HASH = 'c9accfe580e3aaee641686f8f516bdcd'

declare global {
  interface Window {
    __madmonaMetricool?: boolean
    beTracker?: { t: (o: { hash: string }) => void }
  }
}

export default function SiteAnalytics() {
  const pathname = usePathname() || ''
  const isChat = pathname === '/chat' || pathname.startsWith('/chat/')

  // Metricool: كان سكربت inline في <head> بيشتغل على كل صفحة.
  // بقى هنا عشان يتحكم فيه نفس شرط المسار — وهو أصلاً بيحمّل نفسه
  // ديناميكياً فمش محتاج يكون في الهيد.
  useEffect(() => {
    if (isChat || typeof window === 'undefined') return
    if (window.__madmonaMetricool) return
    window.__madmonaMetricool = true
    const s = document.createElement('script')
    s.type = 'text/javascript'
    s.src = 'https://tracker.metricool.com/resources/be.js'
    s.async = true
    s.onload = () => { try { window.beTracker?.t({ hash: METRICOOL_HASH }) } catch { /* التتبّع مش حرج */ } }
    document.head.appendChild(s)
  }, [isChat])

  if (isChat) return null

  return (
    <>
      <Analytics />
      <SpeedInsights />
      <GoogleAnalytics />
      <MetaPixel />
      <Suspense fallback={null}>
        <AnalyticsTracker />
      </Suspense>
    </>
  )
}
