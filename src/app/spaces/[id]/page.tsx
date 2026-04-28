import { ArrowRight, Clock, Users, Wifi, Coffee, Car, Shield, CheckCircle } from 'lucide-react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'
import type { Database } from '@/types/supabase'
import SpaceBookingButton from './SpaceBookingButton'

// ============================================================
// Slug → space_type mapping (URL slugs are stable, DB UUIDs are not)
// ============================================================
const SLUG_TO_TYPE: Record<string, Database['public']['Tables']['spaces']['Row']['space_type']> = {
  'indoor-coworking': 'indoor',
  'outdoor-garden': 'outdoor',
  'private-office': 'private_office',
  'meeting-room': 'meeting_room',
}

// ============================================================
// Static UI metadata that lives in code (not in the DB schema):
// icons, hero emojis, descriptions, features.
// Pricing comes from the DB.
// ============================================================
const SPACE_UI: Record<string, {
  emoji: string
  amenities: { icon: any; name: string }[]
  features: string[]
}> = {
  'indoor-coworking': {
    emoji: '💻',
    amenities: [
      { icon: Wifi, name: 'واي فاي عالي السرعة' },
      { icon: Coffee, name: 'قهوة ومشروبات' },
      { icon: Car, name: 'مواقف سيارات' },
      { icon: Shield, name: 'أمان ٢٤/٧' },
    ],
    features: [
      'مكاتب مريحة ومقاعد مريحة',
      'إضاءة طبيعية ممتازة',
      'مساحة هادئة للتركيز',
      'طابعات ومعدات مكتبية',
    ],
  },
  'outdoor-garden': {
    emoji: '🌿',
    amenities: [
      { icon: Wifi, name: 'واي فاي قوي في الحديقة' },
      { icon: Coffee, name: 'كافيه أوتدور' },
      { icon: Car, name: 'مواقف مجانية' },
      { icon: Shield, name: 'حراسة مستمرة' },
    ],
    features: [
      'جلسات مريحة وسط النباتات',
      'هواء نقي ومنظر طبيعي',
      'مساحة مفتوحة للإبداع',
      'إضاءة ليلية مميزة',
    ],
  },
  'private-office': {
    emoji: '🏢',
    amenities: [
      { icon: Wifi, name: 'إنترنت مخصص عالي السرعة' },
      { icon: Users, name: 'مساحة تسع ٨ أشخاص' },
      { icon: Car, name: 'موقف مخصص' },
      { icon: Shield, name: 'دخول ٢٤/٧ بالكارت' },
    ],
    features: [
      'مكتب مغلق بخصوصية كاملة',
      'تكييف منفصل قابل للتحكم',
      'خزانة مغلقة للأوراق المهمة',
      'مساحة استقبال صغيرة',
    ],
  },
  'meeting-room': {
    emoji: '👥',
    amenities: [
      { icon: Users, name: 'تسع حتى ٨ أشخاص' },
      { icon: Wifi, name: 'واي فاي مخصص' },
      { icon: Shield, name: 'عزل صوتي كامل' },
      { icon: Clock, name: 'حجز بالساعة' },
    ],
    features: [
      'طاولة اجتماعات مريحة',
      'إضاءة طبيعية مع ستائر',
      'مساحة عرض للعروض التقديمية',
      'خصوصية وهدوء كامل',
    ],
  },
}

interface PricingItem {
  type: string
  price: number
  period: string
  highlight: boolean
}

// Server-side data fetch — keeps Supabase out of the client bundle
async function fetchSpace(slug: string) {
  const spaceType = SLUG_TO_TYPE[slug]
  if (!spaceType) return null

  const { data: spaceRow } = await supabase
    .from('spaces')
    .select('*')
    .eq('space_type', spaceType)
    .maybeSingle()

  if (!spaceRow) return null

  const { data: plans } = await supabase
    .from('pricing_plans')
    .select('*')
    .eq('space_id', spaceRow.id)
    .order('price_egp', { ascending: true })

  const planList = plans ?? []

  return {
    id: slug,
    name: spaceRow.name,
    description: spaceRow.description,
    pricing: planList.map((p, i) => ({
      type: p.name, // use the human-readable name as the type identifier
      price: Number(p.price_egp),
      period: p.name,
      highlight: i === Math.floor(planList.length / 2), // middle plan highlighted as default
    })) as PricingItem[],
  }
}

interface PageProps {
  params: { id: string }
}

export default async function SpaceDetailPage({ params }: PageProps) {
  const space = await fetchSpace(params.id)

  if (!space) {
    notFound()
  }

  const ui = SPACE_UI[params.id]
  if (!ui) notFound()

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="p-2 rounded-full hover:bg-gray-50 transition-colors"
            aria-label="رجوع"
          >
            <ArrowRight className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">{space.name}</h1>
          <div className="w-9" />
        </div>
      </div>

      {/* Hero */}
      <div className="relative h-64 bg-gradient-to-br from-[#1F5F3F]/20 to-[#B8860B]/10">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center px-8">
            <div className="w-20 h-20 bg-[#1F5F3F]/10 rounded-full flex items-center justify-center mb-3 mx-auto">
              <span className="text-2xl">{ui.emoji}</span>
            </div>
            <h2 className="text-xl font-bold text-[#1F5F3F] mb-1">{space.name}</h2>
            {space.description && (
              <p className="text-sm text-gray-600">{space.description}</p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pb-24">
        {/* Amenities */}
        <section className="py-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">المميزات</h3>
          <div className="grid grid-cols-2 gap-3">
            {ui.amenities.map((amenity, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100"
              >
                <amenity.icon className="w-5 h-5 text-[#1F5F3F] flex-shrink-0" />
                <span className="text-sm font-medium text-gray-700">{amenity.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="py-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">تفاصيل المساحة</h3>
          <div className="space-y-2">
            {ui.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#B8860B] flex-shrink-0" />
                <span className="text-sm text-gray-600">{feature}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing — fetched from DB */}
        <section className="py-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">أسعار الاشتراك</h3>
          <SpaceBookingButton
            spaceId={space.id}
            pricing={space.pricing}
          />
        </section>

        {/* Free Trial Banner */}
        <div className="my-6 p-4 bg-gradient-to-l from-[#B8860B]/10 to-[#1F5F3F]/5 rounded-xl border border-[#B8860B]/20">
          <div className="flex items-center justify-center gap-2">
            <span className="text-lg">🎉</span>
            <span className="text-sm font-bold text-gray-800">يومك الأول مجاناً!</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Pre-render all known space pages at build time
export function generateStaticParams() {
  return Object.keys(SLUG_TO_TYPE).map((id) => ({ id }))
}
