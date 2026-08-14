import type { Metadata } from 'next'
import Link from 'next/link'

// مدونة مضمونة — بلوج المارد: مقالات SEO مولّدة آليًا من داتا المنصة
export const revalidate = 1800
const SITE = 'https://www.madmonacairo.com'

async function getPosts() {
  try {
    const r = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/blog_posts?status=eq.published&select=slug,title,excerpt,category,published_at&order=published_at.desc&limit=50`,
      { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}` }, next: { revalidate: 1800 } }
    )
    return (await r.json()) as Array<{ slug: string; title: string; excerpt: string | null; category: string | null; published_at: string }>
  } catch { return [] }
}

export const metadata: Metadata = {
  title: 'مدونة مضمونة — أدلة وأرقام سوق البيع والإيجار في مصر',
  description: 'مقالات وأدلة عملية من داتا منصة مضمونة الحقيقية: العقارات، المركبات، الأسعار، ونصائح المعاملات الآمنة. معاملاتك مضمونة.',
  alternates: { canonical: `${SITE}/blog` },
}

export default async function BlogIndex() {
  const posts = await getPosts()
  const list = Array.isArray(posts) ? posts : []
  return (
    <main className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <div className="bg-gradient-to-l from-[#14231E] to-[#34D399] text-white px-4 py-10">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-black">مدونة مضمونة ✍️</h1>
          <p className="text-white/80 text-sm mt-2">أدلة وأرقام من قلب المنصة — بيكتبها المارد من الداتا الحقيقية.</p>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 py-8 grid gap-4">
        {list.map((p) => (
          <Link key={p.slug} href={`/blog/${p.slug}`} className="block bg-white rounded-2xl p-5 shadow-sm ring-1 ring-black/5 hover:-translate-y-0.5 transition-all no-underline">
            {p.category && <span className="inline-block text-[11px] font-black text-[#059669] bg-[#34D399]/10 rounded-full px-2.5 py-1 mb-2">{p.category}</span>}
            <h2 className="text-base md:text-lg font-black text-[#0A0A0A] leading-snug">{p.title}</h2>
            {p.excerpt && <p className="text-sm text-gray-600 mt-2 leading-relaxed">{p.excerpt}</p>}
            <p className="text-[11px] text-gray-400 mt-3">{new Date(p.published_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </Link>
        ))}
        {list.length === 0 && <p className="text-center text-sm text-gray-500 py-10">المقالات في الطريق…</p>}
      </div>
    </main>
  )
}
