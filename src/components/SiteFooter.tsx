'use client'

// ============================================================================
// SiteFooter — فوتر موحّد لكل صفحات العميل (١١ أغسطس ٢٠٢٦، طلب محمد: "الهيدر
// والفوتر يبقوا لونهم اخضر"). أخضر البراند القياسي #FA8125 (زي هيدر TopNav
// وشات المارد) — مش الأخضر الغامق #0E332C اللي كان في فوتر HomeRedesign.
// يحل محل الفوترات المتفرقة (بعضها شفاف، بعضها أسود #0A0A0A، بعضها أخضر
// غامق مختلف) في كل صفحات العميل — عشان يبقى في هوية واحدة متسقة.
// ============================================================================

import Link from 'next/link'

export default function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer
      style={{
        background: '#FA8125',
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
                alt="مضمونة"
                width={36}
                height={36}
                style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 10, background: '#fff' }}
              />
              <span style={{ fontWeight: 900, fontSize: 20 }}>مضمونة</span>
            </div>
            <p style={{ margin: '14px 0 0', fontSize: 13, lineHeight: 1.9, color: 'rgba(250,250,247,0.75)' }}>
              سوقك المصري المضمون — أجّر، اشتري، واحجز خدمات ومطاعم وبيوتي. معاملاتك مضمونة.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 56, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <span style={{ fontWeight: 800, color: '#FFE9A8', fontSize: 12, letterSpacing: '0.1em' }}>السوق</span>
              <Link href="/marketplace?track=products" style={{ color: 'rgba(250,250,247,0.85)', textDecoration: 'none' }}>بيع</Link>
              <Link href="/marketplace?track=rentals" style={{ color: 'rgba(250,250,247,0.85)', textDecoration: 'none' }}>إيجار</Link>
              <Link href="/marketplace?track=services" style={{ color: 'rgba(250,250,247,0.85)', textDecoration: 'none' }}>خدمات</Link>
              <Link href="/real-estate/market" style={{ color: 'rgba(250,250,247,0.85)', textDecoration: 'none' }}>بورصة مضمونة العقارية</Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <span style={{ fontWeight: 800, color: '#FFE9A8', fontSize: 12, letterSpacing: '0.1em' }}>مضمونة</span>
              <Link href="/about" style={{ color: 'rgba(250,250,247,0.85)', textDecoration: 'none' }}>عن المنصة</Link>
              <Link href="/list-your-asset" style={{ color: 'rgba(250,250,247,0.85)', textDecoration: 'none' }}>ضيف إعلانك</Link>
              <Link href="/chat/marid" style={{ color: 'rgba(250,250,247,0.85)', textDecoration: 'none' }}>اسأل الجني</Link>
              <Link href="/careers" style={{ color: 'rgba(250,250,247,0.85)', textDecoration: 'none' }}>التوظيف</Link>
              <a href="https://wa.me/201002229982" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(250,250,247,0.85)', textDecoration: 'none' }}>واتساب</a>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <span style={{ fontWeight: 800, color: '#FFE9A8', fontSize: 12, letterSpacing: '0.1em' }}>قانوني</span>
              <Link href="/privacy" style={{ color: 'rgba(250,250,247,0.85)', textDecoration: 'none' }}>الخصوصية</Link>
              <Link href="/terms" style={{ color: 'rgba(250,250,247,0.85)', textDecoration: 'none' }}>الشروط</Link>
            </div>
          </div>
        </div>

        <p style={{ margin: '20px 0 0', textAlign: 'center', fontSize: 12, color: 'rgba(250,250,247,0.6)' }}>
          © {year} مضمونة — معاملاتك مضمونة
        </p>
      </div>
    </footer>
  )
}
