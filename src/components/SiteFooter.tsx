'use client'

// ============================================================================
// SiteFooter — فوتر موحّد لكل صفحات العميل (١١ أغسطس ٢٠٢٦، طلب محمد: "غيّر
// شكل الديزاين للهيدر والفوتر"). برتقالي البراند الأساسي #059669 (زي هيدر
// TopNav وشات المارد) — نفس لون الهيدر الجديد بعد قلب الهرمية اللونية.
// يحل محل الفوترات المتفرقة (بعضها شفاف، بعضها أسود #0A0A0A، بعضها نص بسيط)
// اللي كانت متنشرة في صفحات العميل (about, careers, welcome, add-listing,
// demo/clinic) — عشان يبقى في هوية واحدة متسقة على كل الصفحات.
// ============================================================================

import Link from 'next/link'
import { useT } from '@/lib/i18n/LanguageProvider'

export default function SiteFooter() {
  const { t } = useT()
  const year = new Date().getFullYear()

  return (
    <footer
      style={{
        background: '#059669',
        color: '#FAFAF7',
        padding: '48px 20px 28px',
        fontFamily: 'var(--font-cairo), system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 40,
            flexWrap: 'wrap',
            paddingBottom: 32,
            borderBottom: '1px solid rgba(250,250,247,0.15)',
          }}
        >
          <div style={{ maxWidth: 300 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/madmona-logo.png"
                alt={t('common.brand')}
                width={36}
                height={36}
                style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 10, background: '#fff' }}
              />
              <span style={{ fontWeight: 900, fontSize: 20 }}>{t('common.brand')}</span>
            </div>
            <p style={{ margin: '14px 0 0', fontSize: 13, lineHeight: 1.9, color: 'rgba(250,250,247,0.75)' }}>
              {t('sf.tagline')}
            </p>
            {/* 📍 (٢٢ أغسطس ٢٠٢٦) عنوان المقر — كان ناقص من الفوتر خالص.
                عنوان حقيقي ظاهر بيفرق في ثقة الزائر وفي البحث المحلي كمان. */}
            <address
              style={{
                margin: '16px 0 0', fontSize: 13, lineHeight: 1.9,
                fontStyle: 'normal', color: 'rgba(250,250,247,0.9)',
              }}
            >
              {t('sf.addr1')}
              <br />
              {t('sf.addr2')}
              <a
                href="https://wa.me/201002229982"
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'block', marginTop: 8, color: '#FFE9A8', textDecoration: 'none', fontWeight: 700 }}
              >
                {t('sf.whatsapp')} <span dir="ltr">010 022 29982</span>
              </a>
            </address>
          </div>

          <div style={{ display: 'flex', gap: 56, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <span style={{ fontWeight: 800, color: '#FFE9A8', fontSize: 12, letterSpacing: '0.1em' }}>{t('sf.market')}</span>
              <Link href="/marketplace?track=products" style={{ color: 'rgba(250,250,247,0.85)', textDecoration: 'none' }}>{t('sf.buy')}</Link>
              <Link href="/marketplace?track=rentals" style={{ color: 'rgba(250,250,247,0.85)', textDecoration: 'none' }}>{t('sf.rent')}</Link>
              <Link href="/marketplace?track=services" style={{ color: 'rgba(250,250,247,0.85)', textDecoration: 'none' }}>{t('sf.services')}</Link>
              <Link href="/real-estate/market" style={{ color: 'rgba(250,250,247,0.85)', textDecoration: 'none' }}>{t('sf.bourse')}</Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <span style={{ fontWeight: 800, color: '#FFE9A8', fontSize: 12, letterSpacing: '0.1em' }}>{t('common.brand')}</span>
              <Link href="/about" style={{ color: 'rgba(250,250,247,0.85)', textDecoration: 'none' }}>{t('sf.about')}</Link>
              <Link href="/list-your-asset" style={{ color: 'rgba(250,250,247,0.85)', textDecoration: 'none' }}>{t('sf.add_listing')}</Link>
              <Link href="/chat/marid" style={{ color: 'rgba(250,250,247,0.85)', textDecoration: 'none' }}>{t('sf.ask_marid')}</Link>
              <Link href="/careers" style={{ color: 'rgba(250,250,247,0.85)', textDecoration: 'none' }}>{t('sf.careers')}</Link>
              <a href="https://wa.me/201002229982" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(250,250,247,0.85)', textDecoration: 'none' }}>{t('sf.whatsapp')}</a>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <span style={{ fontWeight: 800, color: '#FFE9A8', fontSize: 12, letterSpacing: '0.1em' }}>{t('sf.legal')}</span>
              <Link href="/privacy" style={{ color: 'rgba(250,250,247,0.85)', textDecoration: 'none' }}>{t('sf.privacy')}</Link>
              <Link href="/terms" style={{ color: 'rgba(250,250,247,0.85)', textDecoration: 'none' }}>{t('sf.terms')}</Link>
            </div>
          </div>
        </div>

        <p style={{ margin: '20px 0 0', textAlign: 'center', fontSize: 12, color: 'rgba(250,250,247,0.6)' }}>
          {t('sf.copyright', { y: year })}
        </p>
      </div>
    </footer>
  )
}
