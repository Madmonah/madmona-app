// صفحة اللينكات — "لينك واحد" لكل صفحات مضمونة على السوشيال (لبايو انستجرام).
// (٨ أغسطس ٢٠٢٦ — محمد: «تحول الناس على تليجرام أو واتساب … والأفضل تليجرام الأول»)
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'مضمونة — كل روابطنا في مكان واحد',
  description: 'كلمنا على تليجرام أو واتساب، أو استكشف الماركت بليس والبورصة.',
  robots: { index: false, follow: false },
}

type LinkItem = { href: string; label: string; sub: string; emoji: string; primary?: boolean }

const LINKS: LinkItem[] = [
  { href: 'https://t.me/Madmona_bot', label: 'كلم المارد على تليجرام', sub: 'رد فوري · بحث · حجز · اقتراحات', emoji: '🧞', primary: true },
  { href: 'https://wa.me/201062001999', label: 'واتساب مباشرة', sub: 'محادثة مع فريق مضمونة', emoji: '💬' },
  { href: 'https://www.madmonacairo.com/marketplace', label: 'الماركت بليس', sub: 'عقارات · عربيات · مطاعم · خدمات', emoji: '🛍️' },
  { href: 'https://www.madmonacairo.com/real-estate', label: 'بورصة العقارات', sub: 'أسعار حية + كل المشاريع', emoji: '🏗️' },
  { href: 'https://www.madmonacairo.com', label: 'الموقع الرئيسي', sub: 'madmonacairo.com', emoji: '🌐' },
]

export default function LinksPage() {
  return (
    <main dir="rtl" style={{
      minHeight: '100vh', background: '#F7F6F1', color: '#22322C',
      fontFamily: "'Cairo', -apple-system, sans-serif",
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '48px 20px 60px',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;800;900&display=swap');
        a.link { transition: transform .15s ease, box-shadow .15s ease, background .15s ease; }
        a.link:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(31,111,95,.15); }
      `}</style>

      <div style={{
        width: 96, height: 96, borderRadius: '50%', background: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '3px solid #1F6F5F', marginBottom: 14,
      }}>
        <span style={{ fontSize: 44, fontWeight: 900, color: '#1F6F5F', lineHeight: 1 }}>م</span>
      </div>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: '.5px' }}>مضمونة</h1>
      <p style={{ margin: '6px 0 4px', fontSize: 13, color: '#5D6B64' }}>سوق مصر المضمون · حماية كاملة على كل معاملة</p>
      <p style={{ margin: '0 0 32px', fontSize: 11, color: '#A8A395', letterSpacing: '.2em' }}>MADMONA · CAIRO</p>

      <div style={{ width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {LINKS.map((l) => (
          <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="link"
            style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 16,
              background: l.primary ? '#1F6F5F' : '#fff', color: l.primary ? '#fff' : '#22322C',
              border: '1px solid ' + (l.primary ? '#1F6F5F' : '#E9E7DF'), textDecoration: 'none',
            }}>
            <span style={{
              fontSize: 22, width: 42, height: 42, borderRadius: 12,
              background: l.primary ? 'rgba(255,255,255,.15)' : '#F0EFE8',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
            }}>{l.emoji}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 900 }}>{l.label}</span>
              <span style={{ display: 'block', fontSize: 11, color: l.primary ? 'rgba(255,255,255,.75)' : '#8A9590', marginTop: 2 }}>{l.sub}</span>
            </span>
            <span style={{ fontSize: 14, opacity: 0.4 }}>←</span>
          </a>
        ))}
      </div>

      <div style={{ marginTop: 40 }}>
        <Link href="/" style={{ color: '#8A9590', fontSize: 12, textDecoration: 'none' }}>← الرجوع للموقع</Link>
      </div>
    </main>
  )
}
