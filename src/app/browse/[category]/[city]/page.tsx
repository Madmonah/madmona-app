import type { Metadata } from 'next'
import Link from 'next/link'

// pSEO: صفحة «تصنيف × مدينة» — /browse/[category]/[city]
// الهدف: التقاط بحث جوجل العربي الطويل (مثال: «مراكب للايجار في الاسكندرية»)
// ISR كل ساعة + JSON-LD ItemList + روابط داخلية للمدن/التصنيفات الشقيقة

export const revalidate = 3600

const SITE = 'https://www.madmonacairo.com'

async function browseData(cat: string, city: string) {
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/seo_browse_data`, {
      method: 'POST',
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_cat: cat, p_city: city }),
      next: { revalidate: 3600 },
    })
    return await r.json()
  } catch { return { ok: false } }
}

type P = { params: Promise<{ category: string; city: string }> }
const dec = (s: string) => decodeURIComponent(s || '').trim()

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { category, city } = await params
  const d = await browseData(dec(category), dec(city))
  if (!d?.ok) return { title: 'مضمونة', robots: { index: false } }
  const catAr = d.cat?.name_ar || dec(category)
  const cityAr = d.city || dec(city)
  const n = Array.isArray(d.listings) ? d.listings.length : 0
  const title = `${catAr} في ${cityAr} — ${n > 0 ? n + ' إعلان مضمون' : 'إعلانات مضمونة'}`
  const desc = `اكتشف ${catAr} في ${cityAr} على مضمونة — منصة المعاملات المضمونة في مصر. حماية كاملة، دفع مستحقات سريع، ودعم مستمر. معاملاتك مضمونة.`
  const url = `${SITE}/browse/${encodeURIComponent(dec(category))}/${encodeURIComponent(cityAr)}`
  return {
    title,
    description: desc,
    alternates: { canonical: url },
    openGraph: { title, description: desc, url, siteName: 'مضمونة', locale: 'ar_EG', type: 'website' },
    robots: n > 0 ? { index: true, follow: true } : { index: false, follow: true },
  }
}

export default async function BrowseCityPage({ params }: P) {
  const { category, city } = await params
  const d = await browseData(dec(category), dec(city))
  const catAr = d?.cat?.name_ar || dec(category)
  const cityAr = d?.city || dec(city)
  const listings: any[] = Array.isArray(d?.listings) ? d.listings : []
  const otherCities: string[] = Array.isArray(d?.other_cities) ? d.other_cities : []
  const otherCats: any[] = Array.isArray(d?.other_cats) ? d.other_cats : []
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `${catAr} في ${cityAr}`,
      numberOfItems: listings.length,
      itemListElement: listings.slice(0, 30).map((l, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: l.title,
        url: `${SITE}/marketplace/${l.slug}`,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'مضمونة', item: SITE },
        { '@type': 'ListItem', position: 2, name: catAr, item: `${SITE}/marketplace` },
        { '@type': 'ListItem', position: 3, name: `${catAr} في ${cityAr}` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: `إزاي أضمن معاملتي في ${catAr} في ${cityAr}؟`,
          acceptedAnswer: { '@type': 'Answer', text: `كل إعلانات ${catAr} على مضمونة بتتم بحماية كاملة للمعاملة، دفع مستحقات سريع، ودعم مستمر — معاملاتك مضمونة.` },
        },
        {
          '@type': 'Question',
          name: `إزاي أنشر إعلان ${catAr} في ${cityAr}؟`,
          acceptedAnswer: { '@type': 'Answer', text: `من صفحة «ضيف الليستنج» على مضمونة تقدر تنشر إعلانك في دقايق مجانًا، وفريقنا بيراجعه قبل النشر.` },
        },
        {
          '@type': 'Question',
          name: 'هل التواصل مع المعلن مباشر؟',
          acceptedAnswer: { '@type': 'Answer', text: 'أيوه — كل إعلان فيه وسيلة تواصل مباشرة، ومضمون (مساعد مضمونة الذكي) متاح على واتساب يساعدك في أي خطوة.' },
        },
      ],
    },
  ]
  return (
    <main dir="rtl" className="min-h-screen bg-[#FAFAF7] pb-24" style={{ fontFamily: 'Cairo,sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="bg-gradient-to-br from-[#1F6F5F] to-[#2d7a52] text-white px-5 pt-10 pb-8">
        <h1 className="text-2xl font-black leading-snug">{catAr} في {cityAr}</h1>
        <p className="text-sm text-white/85 mt-2 leading-relaxed">
          {listings.length > 0 ? `${listings.length} إعلان مضمون` : 'إعلانات مضمونة'} — حماية كاملة، دفع مستحقات سريع، ودعم مستمر على مضمونة.
        </p>
      </div>

      <div className="px-4 -mt-4">
        <div className="grid grid-cols-1 gap-3">
          {listings.map((l) => (
            <Link key={l.slug} href={`/marketplace/${l.slug}`} className="block bg-white rounded-2xl p-4 shadow-sm no-underline">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-[#0A0A0A] truncate">{l.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{[l.district, cityAr].filter(Boolean).join(' — ')}</p>
                </div>
                <div className="text-left flex-shrink-0">
                  {l.price ? <p className="text-sm font-black text-[#1F6F5F]">{Number(l.price).toLocaleString('ar-EG')} ج.م</p> : <p className="text-xs font-bold text-[#d4a017]">السعر عند الطلب</p>}
                  {l.rating ? <p className="text-[11px] text-gray-500 mt-0.5">⭐ {l.rating}</p> : null}
                </div>
              </div>
            </Link>
          ))}
          {listings.length === 0 && (
            <div className="bg-white rounded-2xl p-6 text-center text-sm text-gray-600">
              مفيش إعلانات منشورة هنا حاليًا — <Link href="/add-listing" className="text-[#1F6F5F] font-black">ضيف الليستنج بتاعك</Link> وكن أول واحد.
            </div>
          )}
        </div>

        {otherCities.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-black text-[#14231E] mb-2">{catAr} في مدن تانية</h2>
            <div className="flex flex-wrap gap-2">
              {otherCities.slice(0, 20).map((c) => (
                <Link key={c} href={`/browse/${encodeURIComponent(dec(category))}/${encodeURIComponent(c)}`} className="bg-white border border-[#1F6F5F]/25 text-[#1F6F5F] text-xs font-bold rounded-full px-3 py-1.5 no-underline">
                  {catAr} في {c}
                </Link>
              ))}
            </div>
          </div>
        )}
        {otherCats.length > 0 && (
          <div className="mt-5">
            <h2 className="text-sm font-black text-[#14231E] mb-2">تصنيفات تانية في {cityAr}</h2>
            <div className="flex flex-wrap gap-2">
              {otherCats.slice(0, 20).map((c: any) => (
                <Link key={c.slug} href={`/browse/${encodeURIComponent(c.slug)}/${encodeURIComponent(cityAr)}`} className="bg-white border border-gray-200 text-[#0A0A0A] text-xs font-bold rounded-full px-3 py-1.5 no-underline">
                  {c.name_ar} في {cityAr}
                </Link>
              ))}
            </div>
          </div>
        )}
        <p className="text-[11px] text-gray-400 text-center mt-8">مضمونة — معاملاتك مضمونة • منصة جديدة بتنمو بسرعة</p>
      </div>
    </main>
  )
}
