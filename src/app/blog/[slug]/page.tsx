import type { Metadata } from 'next'
import Link from 'next/link'

// صفحة مقال البلوج — ماركداون مبسّط → HTML + Article JSON-LD
export const revalidate = 1800
const SITE = 'https://www.madmonacairo.com'

type Post = { slug: string; title: string; excerpt: string | null; content_md: string; category: string | null; cover_url: string | null; published_at: string }

async function getPost(slug: string): Promise<Post | null> {
  try {
    const r = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/blog_posts?status=eq.published&slug=eq.${encodeURIComponent(slug)}&select=slug,title,excerpt,content_md,category,cover_url,published_at&limit=1`,
      { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}` }, next: { revalidate: 1800 } }
    )
    const arr = await r.json()
    return Array.isArray(arr) && arr[0] ? arr[0] : null
  } catch { return null }
}

// محوّل ماركداون مصغّر (يدعم اللي المارد بيكتبه: ##/###، **bold**، [t](u)، قوائم -، فقرات)
function esc(s: string) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }
function inline(s: string) {
  return esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" class="text-[#2B4521] font-bold underline underline-offset-2">$1</a>')
}
function mdToHtml(md: string) {
  const lines = md.split(/\r?\n/)
  const out: string[] = []
  let inList = false
  for (const raw of lines) {
    const l = raw.trim()
    if (!l) { if (inList) { out.push('</ul>'); inList = false }; continue }
    if (l.startsWith('### ')) { if (inList) { out.push('</ul>'); inList = false }; out.push(`<h3 class="text-lg font-black text-[#14231E] mt-6 mb-2">${inline(l.slice(4))}</h3>`); continue }
    if (l.startsWith('## ')) { if (inList) { out.push('</ul>'); inList = false }; out.push(`<h2 class="text-xl font-black text-[#14231E] mt-8 mb-3">${inline(l.slice(3))}</h2>`); continue }
    if (l.startsWith('# ')) { continue }
    if (/^[-*] /.test(l)) { if (!inList) { out.push('<ul class="list-disc pr-6 space-y-1.5 my-3 text-[15px] leading-relaxed">'); inList = true }; out.push(`<li>${inline(l.slice(2))}</li>`); continue }
    if (inList) { out.push('</ul>'); inList = false }
    out.push(`<p class="my-3 text-[15px] leading-[1.9] text-gray-800">${inline(l)}</p>`)
  }
  if (inList) out.push('</ul>')
  return out.join('\n')
}

type P = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(decodeURIComponent(slug))
  if (!post) return { title: 'مضمونة', robots: { index: false } }
  const url = `${SITE}/blog/${post.slug}`
  return {
    title: post.title,
    description: post.excerpt || undefined,
    alternates: { canonical: url },
    openGraph: { title: post.title, description: post.excerpt || undefined, url, siteName: 'مضمونة', locale: 'ar_EG', type: 'article', images: post.cover_url ? [{ url: post.cover_url }] : undefined },
  }
}

export default async function BlogPost({ params }: P) {
  const { slug } = await params
  const post = await getPost(decodeURIComponent(slug))
  if (!post) {
    return (
      <main className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <p className="font-black text-[#14231E]">المقال مش موجود</p>
          <Link href="/blog" className="text-[#2B4521] font-bold text-sm">← رجوع للمدونة</Link>
        </div>
      </main>
    )
  }
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || undefined,
    image: post.cover_url || undefined,
    datePublished: post.published_at,
    inLanguage: 'ar-EG',
    author: { '@type': 'Organization', name: 'مضمونة', url: SITE },
    publisher: { '@id': `${SITE}/#organization` },
    mainEntityOfPage: `${SITE}/blog/${post.slug}`,
  }
  return (
    <main className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="bg-gradient-to-l from-[#14231E] to-[#2B4521] text-white px-4 py-10">
        <div className="max-w-3xl mx-auto">
          <Link href="/blog" className="text-white/70 text-xs font-bold no-underline">مدونة مضمونة ←</Link>
          {post.category && <span className="block mt-3"><span className="inline-block text-[11px] font-black text-white bg-white/15 rounded-full px-2.5 py-1">{post.category}</span></span>}
          <h1 className="text-xl md:text-2xl font-black leading-snug mt-2">{post.title}</h1>
          <p className="text-white/60 text-[11px] mt-3">{new Date(post.published_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>
      <article className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl p-5 md:p-8 shadow-sm ring-1 ring-black/5" dangerouslySetInnerHTML={{ __html: mdToHtml(post.content_md) }} />
        <div className="mt-6 bg-gradient-to-l from-[#2B4521] to-[#2FA084] rounded-2xl p-5 text-white text-center">
          <p className="font-black">جاهز تبيع أو تأجر بأمان؟ ✅</p>
          <p className="text-white/85 text-sm mt-1">كل معاملة على مضمونة بحماية كاملة ودفع مستحقات سريع.</p>
          <Link href="/marketplace" className="inline-block mt-3 bg-white text-[#2B4521] font-black text-sm rounded-full px-5 py-2 no-underline">اتفرج على الإعلانات</Link>
        </div>
      </article>
    </main>
  )
}
