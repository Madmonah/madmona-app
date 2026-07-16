// src/app/real-estate/projects/[slug]/page.tsx
// =====================================================================
// 🏗️ صفحة المشروع الكاملة — (14 Jul 2026)
// كل مشروع في البورصة بقى ليه صفحة خاصة: معرض صور · فيديو · بروشور ·
// تفاصيل الوحدات وخطة السداد · زرار استفسار متتبَّع بكود المشروع.
// server component: SEO كامل (OG + JSON-LD) + ISR كل ساعة.
// التفاعل (المعرض والفيديو) في ProjectGallery (client).
// ⛔ المشاريع المحظور نشرها (embargoed) بترجّع 404 — زي أبراج العلمين.
// =====================================================================
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { MapPin, ArrowRight, FileText, CalendarClock, Wallet, Building2, MessageCircle } from 'lucide-react'
import TopNav from '@/components/TopNav'
import ProjectGallery from './ProjectGallery'
import UnitsBooking from './UnitsBooking'
import {
  inquiryWaLink, projectCode, PROPERTY_TYPE_LABEL, PROPERTY_TYPE_ICON,
  type MediaItem, type PropertyType, type PriceUnit,
} from '@/lib/projects'

export const revalidate = 3600

type Row = {
  id: string
  slug: string
  title: string
  developer: string | null
  area_label: string
  city: string | null
  district: string | null
  lat: number | null
  lng: number | null
  unit_label: string | null
  price_from: number | null
  price_to: number | null
  price_unit: PriceUnit
  note: string | null
  property_type: PropertyType | null
  payment_plan: string | null
  delivery_label: string | null
  cover_url: string | null
  brochure_url: string | null
  video_url: string | null
  media: MediaItem[] | null
  updated_at: string
  booking_enabled: boolean | null
  booking_fee: number | null
  booking_fee_note: string | null
}

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )
}

async function getProject(slug: string): Promise<Row | null> {
  try {
    const { data } = await sb()
      .from('property_market_items')
      .select(
        'id, slug, title, developer, area_label, city, district, lat, lng, unit_label, ' +
        'price_from, price_to, price_unit, note, property_type, payment_plan, delivery_label, ' +
        'cover_url, brochure_url, video_url, media, updated_at, ' +
        'booking_enabled, booking_fee, booking_fee_note',
      )
      .eq('slug', slug)
      .eq('is_active', true)
      .eq('status', 'published')
      .eq('embargoed', false) // ⛔ المحظور نشره مبيظهرش
      .maybeSingle()
    return (data as unknown as Row) || null
  } catch {
    return null
  }
}

const UNIT_SUFFIX: Record<PriceUnit, string> = {
  egp_total: ' ج',
  egp_per_m2: ' ج/م²',
  egp_month: ' ج/شهر',
  egp_night: ' ج/ليلة',
}

function short(v: number | null): string {
  if (v == null) return ''
  if (v >= 1_000_000) {
    const m = v / 1_000_000
    return `${m % 1 === 0 ? m : m.toFixed(1)} مليون`
  }
  if (v >= 1000) return `${Math.round(v / 1000)} ألف`
  return `${v}`
}

function fmtPrice(p: Row): string {
  const suffix = UNIT_SUFFIX[p.price_unit] || ' ج'
  if (p.price_from && p.price_to && p.price_from !== p.price_to)
    return `${short(p.price_from)} - ${short(p.price_to)}${suffix}`
  if (p.price_from) return `يبدأ من ${short(p.price_from)}${suffix}`
  if (p.price_to) return `حتى ${short(p.price_to)}${suffix}`
  return ''
}

// ---------------------------------------------------------------- SEO
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params
  const p = await getProject(slug)
  if (!p) return { title: 'المشروع مش موجود — مضمونة' }

  const dev = p.developer ? ` — ${p.developer}` : ''
  const price = fmtPrice(p)
  const title = `${p.title}${dev} | ${p.area_label}`
  const description = (
    `${p.title}${dev} في ${p.area_label}. ` +
    (p.unit_label ? `${p.unit_label}. ` : '') +
    (price ? `الأسعار ${price}. ` : '') +
    (p.payment_plan ? `${p.payment_plan}. ` : '') +
    'تفاصيل وصور وبروشور المشروع — بورصة عقارات مضمونة.'
  ).slice(0, 300)

  const url = `https://madmonacairo.com/real-estate/projects/${p.slug}`
  return {
    title,
    description,
    keywords: [
      p.title, p.developer || '', p.area_label,
      `أسعار ${p.title}`, `مشروع ${p.title}`, `${p.title} ${p.area_label}`,
      'عقارات مصر', 'مشروعات المطورين',
    ].filter(Boolean),
    openGraph: {
      title,
      description: description.slice(0, 200),
      url,
      siteName: 'Madmona',
      locale: 'ar_EG',
      type: 'website',
      images: p.cover_url ? [{ url: p.cover_url }] : undefined,
    },
    alternates: { canonical: url },
  }
}

// --------------------------------------------------------------- page
export default async function ProjectPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const p = await getProject(slug)
  if (!p) notFound()

  const images = (p.media || []).filter((m) => m.type === 'image')
  const price = fmtPrice(p)
  const type = p.property_type

  // 🔍 JSON-LD — جوجل يفهم إن دي وحدة عقارية معروضة
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Residence',
    name: p.title,
    description: p.note || p.unit_label || undefined,
    image: p.cover_url || undefined,
    url: `https://madmonacairo.com/real-estate/projects/${p.slug}`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: p.area_label,
      addressRegion: p.city || undefined,
      addressCountry: 'EG',
    },
    ...(p.price_from
      ? {
          offers: {
            '@type': 'Offer',
            price: p.price_from,
            priceCurrency: 'EGP',
            availability: 'https://schema.org/InStock',
          },
        }
      : {}),
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <TopNav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="max-w-4xl mx-auto px-4 pb-24">
        <Link
          href="/real-estate/market"
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#1F6F5F] mt-5 mb-4 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          رجوع لبورصة العقارات
        </Link>

        {/* 🖼️ المعرض — البطل */}
        <ProjectGallery
          cover={p.cover_url}
          images={images}
          videoUrl={p.video_url}
          title={p.title}
        />

        {/* العنوان + الأساسيات */}
        <section className="mt-6">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {type && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-[#1F6F5F]/10 text-[#1F6F5F] px-2.5 py-1 rounded-full">
                {PROPERTY_TYPE_ICON[type]} {PROPERTY_TYPE_LABEL[type]}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
              <MapPin className="w-3 h-3 text-[#2FA084]" />
              {/* 🗺️ المدينة + الحتة بالظبط: «القاهرة الجديدة · التجمع الخامس» */}
              {[p.city || p.area_label, p.district].filter(Boolean).join(' · ')}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-snug">
            {p.title}
          </h1>
          {p.developer && (
            <p className="text-sm text-gray-500 mt-1.5 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-[#2FA084]" />
              {p.developer}
            </p>
          )}

          {price && <p className="mt-4 text-xl font-bold text-[#1F6F5F]">{price}</p>}
        </section>

        {/* 📋 التفاصيل */}
        <section className="mt-6 grid gap-3 sm:grid-cols-2">
          {p.unit_label && (
            <DetailCard icon={<Building2 className="w-4 h-4" />} label="الوحدات">
              {p.unit_label}
            </DetailCard>
          )}
          {p.payment_plan && (
            <DetailCard icon={<Wallet className="w-4 h-4" />} label="خطة السداد">
              {p.payment_plan}
            </DetailCard>
          )}
          {p.delivery_label && (
            <DetailCard icon={<CalendarClock className="w-4 h-4" />} label="التسليم">
              {p.delivery_label}
            </DetailCard>
          )}
          {p.note && (
            <DetailCard icon={<FileText className="w-4 h-4" />} label="تفاصيل إضافية">
              {p.note}
            </DetailCard>
          )}
        </section>

        {/* 🗺️ الموقع بالظبط — «المشروع فين» كان أكبر سؤال. خريطة + زرار جوجل ماب.
            الإحداثيات من Nawy. لو مفيش موقع، الكارت مبيظهرش. */}
        {p.lat != null && p.lng != null && (
          <section className="mt-6">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#2FA084] mb-2">
              <MapPin className="w-4 h-4" /> موقع المشروع بالظبط
            </p>
            <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
              <iframe
                title={`موقع ${p.title}`}
                width="100%"
                height="240"
                loading="lazy"
                style={{ border: 0 }}
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://maps.google.com/maps?q=${p.lat},${p.lng}&z=14&output=embed`}
              />
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`}
              target="_blank"
              rel="noopener"
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#1F6F5F] hover:underline"
            >
              <MapPin className="w-3.5 h-3.5" />
              افتح الموقع في خرايط جوجل
            </a>
          </section>
        )}

        {/* 🗂️ حجز الوحدات من الماستر بلان — 48 ساعة عبر مضمونة (لو المطوّر مفعّلها) */}
        {p.booking_enabled && (
          <UnitsBooking
            projectId={p.id}
            projectTitle={p.title}
            projectCode={projectCode(p.id)}
            bookingFee={p.booking_fee}
            bookingFeeNote={p.booking_fee_note}
          />
        )}

        {/* 📄 البروشور */}
        {p.brochure_url && (
          <a
            href={p.brochure_url}
            target="_blank"
            rel="noopener"
            className="mt-5 flex items-center justify-center gap-2 w-full bg-white border-2 border-[#1F6F5F]/20 text-[#1F6F5F] font-semibold py-3.5 rounded-2xl hover:bg-[#1F6F5F]/5 hover:border-[#1F6F5F]/40 transition-all"
          >
            <FileText className="w-4 h-4" />
            حمّل بروشور المشروع (PDF)
          </a>
        )}

        {/* 💬 الاستفسار — الكود جوّه الرسالة عشان نعرف الاستفسار ده لأنهي مشروع */}
        <a
          href={inquiryWaLink(p)}
          target="_blank"
          rel="noopener"
          className="mt-3 flex items-center justify-center gap-2 w-full bg-[#1F6F5F] text-white font-bold py-4 rounded-2xl hover:bg-[#175a4d] shadow-sm hover:shadow-md transition-all"
        >
          <MessageCircle className="w-5 h-5" />
          اسأل المارد عن المشروع ده
        </a>

        <p className="mt-3 text-center text-[11px] text-gray-400 font-mono">
          {projectCode(p.id)}
        </p>
        <p className="mt-1 text-center text-[11px] text-gray-400">
          آخر تحديث:{' '}
          {new Date(p.updated_at).toLocaleDateString('ar-EG', {
            day: 'numeric', month: 'long', year: 'numeric',
          })}
        </p>
      </main>
    </div>
  )
}

function DetailCard({
  icon, label, children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#2FA084] mb-1.5">
        {icon} {label}
      </p>
      <p className="text-sm text-gray-700 leading-relaxed">{children}</p>
    </div>
  )
}
