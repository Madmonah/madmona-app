'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { adminPanelStage } from '@/lib/platform-staff'
import {
  ArrowRight, Loader2, Lock, AlertCircle, Image as ImageIcon,
  Upload, Save, CheckCircle, X, ShieldAlert, Sparkles, Link as LinkIcon,
  RefreshCw, FolderTree, Newspaper, Instagram, Facebook, Linkedin,
  Youtube, Twitter, Music2, AtSign, ExternalLink, Globe,
  CreditCard, Building2,
} from 'lucide-react'

// ============================================================================
// /admin/site-settings — Edit dynamic site content
// Sections: News (link), Hero/Cards images, Categories images, SOCIAL MEDIA
// ============================================================================

type Stage = 'loading' | 'unauthenticated' | 'forbidden' | 'ready'

interface SettingField {
  key: string
  label: string
  description: string
  aspectRatio: string
  recommendedSize: string
}

interface FieldGroup {
  title: string
  subtitle: string
  icon: React.ReactNode
  iconColor: string
  fields: SettingField[]
}

interface SocialPlatform {
  key: string
  label: string
  placeholder: string
  example: string
  icon: React.ReactNode
  brandColor: string
  bgColor: string
}

const SOCIAL_PLATFORMS: SocialPlatform[] = [
  {
    key: 'social_instagram_url',
    label: 'Instagram',
    placeholder: 'https://instagram.com/madmonacairo',
    example: 'instagram.com/madmonacairo',
    icon: <Instagram className="w-5 h-5" />,
    brandColor: '#E4405F',
    bgColor: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400',
  },
  {
    key: 'social_facebook_url',
    label: 'Facebook',
    placeholder: 'https://facebook.com/madmonacairo',
    example: 'facebook.com/madmonacairo',
    icon: <Facebook className="w-5 h-5" />,
    brandColor: '#1877F2',
    bgColor: 'bg-[#1877F2]',
  },
  {
    key: 'social_tiktok_url',
    label: 'TikTok',
    placeholder: 'https://tiktok.com/@madmonacairo',
    example: 'tiktok.com/@madmonacairo',
    icon: <Music2 className="w-5 h-5" />,
    brandColor: '#000000',
    bgColor: 'bg-black',
  },
  {
    key: 'social_youtube_url',
    label: 'YouTube',
    placeholder: 'https://youtube.com/@madmonacairo',
    example: 'youtube.com/@madmonacairo',
    icon: <Youtube className="w-5 h-5" />,
    brandColor: '#FF0000',
    bgColor: 'bg-[#FF0000]',
  },
  {
    key: 'social_linkedin_url',
    label: 'LinkedIn',
    placeholder: 'https://linkedin.com/company/madmona',
    example: 'linkedin.com/company/madmona',
    icon: <Linkedin className="w-5 h-5" />,
    brandColor: '#0A66C2',
    bgColor: 'bg-[#0A66C2]',
  },
  {
    key: 'social_x_url',
    label: 'X (Twitter)',
    placeholder: 'https://x.com/madmonacairo',
    example: 'x.com/madmonacairo',
    icon: <Twitter className="w-5 h-5" />,
    brandColor: '#000000',
    bgColor: 'bg-black',
  },
  {
    key: 'social_threads_url',
    label: 'Threads',
    placeholder: 'https://threads.net/@madmonacairo',
    example: 'threads.net/@madmonacairo',
    icon: <AtSign className="w-5 h-5" />,
    brandColor: '#000000',
    bgColor: 'bg-black',
  },
]

// Phase Z (May 18 2026): payment settings shown as a separate section.
// Plain text fields (not images, not URLs). Each saves to site_settings
// via the same upsert flow as the other sections.
interface PaymentField {
  key: string
  label: string
  hint: string
  placeholder: string
  dir?: 'ltr' | 'rtl'
  mono?: boolean
}

const PAYMENT_FIELDS: PaymentField[] = [
  {
    key: 'payment_bank_name',
    label: 'اسم البنك',
    hint: 'البنك اللي عنده الحساب (مثلاً: بنك مصر)',
    placeholder: 'بنك مصر',
  },
  {
    key: 'instapay_holder_name',
    label: 'اسم المستفيد على الحساب',
    hint: 'الاسم اللي العميل هيشوفه',
    placeholder: 'مضمونة - شركة الإيجار',
  },
  {
    key: 'instapay_account_number',
    label: 'رقم الحساب',
    hint: 'رقم الحساب البنكي (يقبل InstaPay من أي بنك)',
    placeholder: '5220001000009207',
    dir: 'ltr',
    mono: true,
  },
  {
    key: 'instapay_ipa',
    label: 'الـ IPA (اختياري)',
    hint: 'مثل: madmona@instapay — أسهل لو متاح',
    placeholder: '',
    dir: 'ltr',
    mono: true,
  },
  {
    key: 'payment_iban',
    label: 'IBAN (اختياري — للتحويل الدولي)',
    hint: 'يبدأ بـ EG ثم 27 رقم',
    placeholder: 'EG380002...',
    dir: 'ltr',
    mono: true,
  },
  {
    key: 'instapay_payment_link',
    label: 'رابط Collect Money (اختياري)',
    hint: 'لو ولّدت لينك من InstaPay حطه هنا — حساب الشركات غالباً مش يقدره.',
    placeholder: 'https://ipn.eg/S/.../instapay/...',
    dir: 'ltr',
    mono: true,
  },
]

const FIELD_GROUPS: FieldGroup[] = [
  {
    title: 'الصور الكبيرة (Hero & Cards)',
    subtitle: 'الصور الرئيسية في أعلى الصفحة والكروت الكبيرة',
    icon: <Sparkles className="w-4 h-4" />,
    iconColor: 'bg-[#2FA084]/10 text-[#2FA084]',
    fields: [
      {
        key: 'hero_image_url',
        label: 'صورة الـHero الرئيسية',
        description: 'الصورة الكبيرة في أعلى الصفحة الرئيسية',
        aspectRatio: '3/4',
        recommendedSize: '١٢٠٠ × ١٦٠٠ بكسل',
      },
      {
        key: 'marketplace_image_url',
        label: 'صورة كارت الـMarketplace',
        description: 'الصورة في كارت "Madmona Marketplace" بالصفحة الرئيسية',
        aspectRatio: '3/4',
        recommendedSize: '٩٠٠ × ١٢٠٠ بكسل',
      },
      {
        key: 'spaces_image_url',
        label: 'صورة كارت "خدمات مضمونة"',
        description: 'الصورة في كارت "خدمات مضمونة" بالصفحة الرئيسية',
        aspectRatio: '3/4',
        recommendedSize: '٩٠٠ × ١٢٠٠ بكسل',
      },
    ],
  },
  {
    title: 'صور الأقسام (Categories)',
    subtitle: 'الصور اللي بتظهر فوق كل قسم في الصفحة الرئيسية',
    icon: <FolderTree className="w-4 h-4" />,
    iconColor: 'bg-[#34D399]/10 text-[#059669]',
    fields: [
      {
        key: 'category_spaces_image_url',
        label: 'صورة قسم "مساحات عمل"',
        description: 'الكارت الكبير على اليمين في الـCategories',
        aspectRatio: '1/1',
        recommendedSize: '٨٠٠ × ٨٠٠ بكسل',
      },
      {
        key: 'category_properties_image_url',
        label: 'صورة قسم "عقارات"',
        description: 'كارت العقارات في الـCategories',
        aspectRatio: '1/1',
        recommendedSize: '٦٠٠ × ٦٠٠ بكسل',
      },
      {
        key: 'category_vehicles_image_url',
        label: 'صورة قسم "مركبات"',
        description: 'كارت المركبات في الـCategories',
        aspectRatio: '1/1',
        recommendedSize: '٦٠٠ × ٦٠٠ بكسل',
      },
      {
        key: 'category_equipment_image_url',
        label: 'صورة قسم "معدات"',
        description: 'كارت المعدات في الـCategories',
        aspectRatio: '1/1',
        recommendedSize: '٦٠٠ × ٦٠٠ بكسل',
      },
      {
        key: 'category_events_image_url',
        label: 'صورة قسم "فعاليات"',
        description: 'كارت الفعاليات في الـCategories',
        aspectRatio: '1/1',
        recommendedSize: '٦٠٠ × ٦٠٠ بكسل',
      },
    ],
  },
]

export default function SiteSettingsPage() {
  const [stage, setStage] = useState<Stage>('loading')
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [originalSettings, setOriginalSettings] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { session } } = await supabaseBrowser.auth.getSession()
    // 🚪 (٢٣ أغسطس ٢٠٢٦) الصفحة دي جوّه لوحة مقفولة بكوكي — فبنسأل عن
    // جلسة اللوحة الأول، وجلسة Supabase تبقى الطريق التاني مش الوحيد.
    const gate = await adminPanelStage(!!session?.user)
    if (gate !== 'ready') { setStage(gate); return }

    await loadSettings()
    setStage('ready')
  }

  const loadSettings = async () => {
    const { data } = await supabaseBrowser
      .from('site_settings')
      .select('key, value')

    type Row = { key: string; value: string }
    const map: Record<string, string> = {}
    ;(data || []).forEach((row: Row) => {
      map[row.key] = row.value || ''
    })
    setSettings(map)
    setOriginalSettings({ ...map })
  }

  const handleSave = async (key: string) => {
    setSaving(key)
    setMessage(null)

    const value = settings[key] || ''

    try {
      const { data: { user } } = await supabaseBrowser.auth.getUser()

      const { error } = await supabaseBrowser
        .from('site_settings')
        .upsert(
          { key, value, updated_at: new Date().toISOString(), updated_by: user?.id },
          { onConflict: 'key' }
        )

      if (error) {
        setMessage({ ok: false, text: 'فشل الحفظ: ' + error.message })
        setSaving(null)
        return
      }

      setOriginalSettings(prev => ({ ...prev, [key]: value }))
      setMessage({ ok: true, text: 'تم الحفظ بنجاح! الصفحة الرئيسية هتحدّث خلال ثواني.' })
      setTimeout(() => setMessage(null), 4000)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'unknown'
      setMessage({ ok: false, text: 'حصل خطأ: ' + msg })
    }
    setSaving(null)
  }

  const updateValue = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  if (stage === 'loading') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-6 h-6 text-[#059669] animate-spin" />
      </div>
    )
  }

  if (stage === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl shadow-luxe p-8 text-center max-w-sm">
          <Lock className="w-8 h-8 text-[#059669] mx-auto mb-3" />
          <h1 className="font-bold mb-4">سجّل دخول الأول</h1>
          <Link href="/auth/login?redirect=/admin/site-settings" className="block bg-[#34D399] text-[#04352A] py-3 rounded-xl font-semibold">
            دخول
          </Link>
        </div>
      </div>
    )
  }

  if (stage === 'forbidden') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl shadow-luxe p-8 text-center max-w-sm">
          <ShieldAlert className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <h1 className="font-bold mb-2">مش مسموح</h1>
          <p className="text-sm text-gray-600 mb-4">الصفحة دي للأدمن فقط.</p>
          <Link href="/account" className="inline-block bg-[#34D399] text-[#04352A] px-5 py-2.5 rounded-xl font-semibold">
            ارجع للحساب
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] pb-20" dir="rtl">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/admin/dashboard"
            className="w-9 h-9 bg-white shadow-soft hover:shadow-card hover:-translate-y-0.5 rounded-full flex items-center justify-center transition-all"
          >
            <ArrowRight className="w-4 h-4 text-gray-700" />
          </Link>
          <div className="flex items-center gap-2 flex-1">
            <Sparkles className="w-5 h-5 text-[#2FA084]" />
            <h1 className="text-lg font-black text-gray-900">إعدادات الموقع</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* News management quick link */}
        <Link
          href="/admin/news"
          className="block bg-white rounded-3xl shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all p-5 no-underline border border-gray-100"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#2FA084]/10 text-[#2FA084] flex items-center justify-center flex-shrink-0">
              <Newspaper className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h2 className="font-black text-gray-900 text-base">إدارة الأخبار</h2>
              <p className="text-xs text-gray-500">أضف أخبار يدوية تظهر في news widget على الصفحة الرئيسية</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 -scale-x-100" />
          </div>
        </Link>

        {/* Hero info */}
        <div className="bg-gradient-to-l from-[#34D399] to-[#34D399] text-white rounded-3xl p-6 shadow-luxe">
          <h2 className="text-xl font-black mb-2">صور الصفحة الرئيسية</h2>
          <p className="text-sm text-white/85 leading-relaxed">
            من هنا تقدر تغيّر كل الصور اللي بتظهر في صفحة madmonacairo.com بدون ما تحتاج تعدّل في الكود.
          </p>
          <div className="mt-3 flex items-center gap-3 flex-wrap text-xs">
            <span className="bg-white/15 backdrop-blur px-2.5 py-1 rounded-full">
              {FIELD_GROUPS.reduce((sum, g) => sum + g.fields.length, 0)} صورة قابلة للتعديل
            </span>
            <span className="bg-white/15 backdrop-blur px-2.5 py-1 rounded-full">
              {SOCIAL_PLATFORMS.length} حسابات سوشيال ميديا
            </span>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-2xl border flex items-start gap-2 ${
            message.ok
              ? 'bg-green-50 border-green-200 text-green-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}>
            {message.ok ? <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
            <p className="text-sm">{message.text}</p>
          </div>
        )}

        {/* SOCIAL MEDIA SECTION (NEW - on top because most important) */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 px-1 pt-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-white flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-black text-gray-900 text-base">حسابات السوشيال ميديا</h2>
              <p className="text-xs text-gray-500">الحسابات اللي هتظهر في الـFooter وصفحة Contact. الفاضي مش بيظهر.</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-soft p-5 md:p-6">
            <div className="space-y-4">
              {SOCIAL_PLATFORMS.map(platform => (
                <SocialField
                  key={platform.key}
                  platform={platform}
                  value={settings[platform.key] || ''}
                  originalValue={originalSettings[platform.key] || ''}
                  onChange={(v) => updateValue(platform.key, v)}
                  onSave={() => handleSave(platform.key)}
                  saving={saving === platform.key}
                />
              ))}
            </div>

            <div className="mt-5 pt-5 border-t border-gray-100">
              <p className="text-xs text-gray-500 leading-relaxed">
                💡 <strong>نصيحة:</strong> اللي مش هتحط لينك ليه، الأيقونة بتاعته مش هتظهر على الموقع.
                ده بيخلي الـFooter نظيف ومحترم. لما تحط لينك جديد، هيظهر فوراً.
              </p>
            </div>
          </div>
        </div>

        {/* Field Groups (Images) */}
        {FIELD_GROUPS.map((group, gIdx) => (
          <div key={gIdx} className="space-y-3">
            <div className="flex items-center gap-3 px-1 pt-2">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${group.iconColor}`}>
                {group.icon}
              </div>
              <div>
                <h2 className="font-black text-gray-900 text-base">{group.title}</h2>
                <p className="text-xs text-gray-500">{group.subtitle}</p>
              </div>
            </div>

            <div className="space-y-3">
              {group.fields.map(field => (
                <ImageSettingField
                  key={field.key}
                  field={field}
                  value={settings[field.key] || ''}
                  originalValue={originalSettings[field.key] || ''}
                  onChange={(v) => updateValue(field.key, v)}
                  onSave={() => handleSave(field.key)}
                  saving={saving === field.key}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Phase Z (May 18 2026): Payment settings section.
            Customer-facing payment box on the booking page reads these. */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 px-1 pt-2">
            <div className="w-9 h-9 rounded-xl bg-[#34D399]/10 text-[#059669] flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-black text-gray-900 text-base">إعدادات الدفع (التحويل البنكي)</h2>
              <p className="text-xs text-gray-500">البيانات اللي العميل بيشوفها على صفحة الحجز. يحوّل من تطبيق بنكه أو InstaPay.</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-soft p-5 md:p-6">
            <div className="space-y-4">
              {PAYMENT_FIELDS.map(field => (
                <PaymentSettingField
                  key={field.key}
                  field={field}
                  value={settings[field.key] || ''}
                  originalValue={originalSettings[field.key] || ''}
                  onChange={(v) => updateValue(field.key, v)}
                  onSave={() => handleSave(field.key)}
                  saving={saving === field.key}
                />
              ))}
            </div>
            <div className="mt-5 pt-5 border-t border-gray-100">
              <p className="text-xs text-gray-500 leading-relaxed">
                💡 <strong>نصيحة:</strong> الـ InstaPay link اختياري — لو حساب الشركة مش بيقدر يولّده، سيبه فاضي. العميل هيشوف رقم الحساب + البنك + المستفيد ويحوّل من أي تطبيق.
              </p>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-sm text-yellow-900 leading-relaxed">
          <p className="font-bold mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            نصايح للصور المتميزة:
          </p>
          <ul className="space-y-1.5 text-xs pr-4">
            <li>• استخدم صور عالية الجودة (1200px+ عرض)</li>
            <li>• الصور الـvertical (طولية) أحسن للـHero</li>
            <li>• الصور الـsquare أحسن للأقسام (Categories)</li>
            <li>• الـfile upload بيرفع على Supabase Storage تلقائياً (حد أقصى 10MB)</li>
            <li>• لتصدير من Canva: Download → PNG/JPG ثم ارفعها هنا</li>
          </ul>
        </div>
      </main>
    </div>
  )
}

// ============================================================================
// PaymentSettingField — plain text field (no images, no URLs).
// Same save-on-button-click flow as the social and image fields.
// ============================================================================
function PaymentSettingField({
  field, value, originalValue, onChange, onSave, saving,
}: {
  field: PaymentField
  value: string
  originalValue: string
  onChange: (v: string) => void
  onSave: () => void
  saving: boolean
}) {
  const isDirty = value !== originalValue
  return (
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-2xl bg-[#34D399]/10 text-[#059669] flex items-center justify-center flex-shrink-0">
        <Building2 className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <label className="text-xs font-bold text-gray-700 block mb-1">{field.label}</label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          dir={field.dir || 'rtl'}
          className={`w-full px-3 py-2 bg-[#FAFAF7] border border-gray-100 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-[#059669]/40 ${field.mono ? 'font-mono' : ''}`}
          style={field.dir === 'ltr' ? { textAlign: 'left' } : undefined}
        />
        <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">{field.hint}</p>
      </div>
      <button
        type="button"
        onClick={onSave}
        disabled={!isDirty || saving}
        className="px-3 py-2 bg-[#34D399] hover:bg-[#34D399]/90 text-[#04352A] font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        title={!isDirty ? 'مفيش تغييرات' : 'حفظ'}
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
}

// ============================================================================
// SocialField — Input + Preview button + Save
// ============================================================================

function SocialField({
  platform, value, originalValue, onChange, onSave, saving,
}: {
  platform: SocialPlatform
  value: string
  originalValue: string
  onChange: (v: string) => void
  onSave: () => void
  saving: boolean
}) {
  const isDirty = value !== originalValue
  const hasValue = value.trim().length > 0
  const isValidUrl = value.startsWith('https://') || value.startsWith('http://')

  return (
    <div className="flex items-center gap-3">
      {/* Brand icon */}
      <div className={`w-11 h-11 rounded-2xl ${platform.bgColor} text-white flex items-center justify-center flex-shrink-0 shadow-soft`}>
        {platform.icon}
      </div>

      {/* Label + Input */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-bold text-gray-700">{platform.label}</p>
          {hasValue && isValidUrl && (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-gray-400 hover:text-[#059669] flex items-center gap-1 no-underline"
            >
              <ExternalLink className="w-2.5 h-2.5" />
              اختبر
            </a>
          )}
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={platform.placeholder}
          className="w-full px-3 py-2 bg-[#FAFAF7] border border-gray-100 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-[#059669]/40 font-mono"
          dir="ltr"
          style={{ textAlign: 'left' }}
        />
      </div>

      {/* Save button */}
      <button
        type="button"
        onClick={onSave}
        disabled={!isDirty || saving || (hasValue && !isValidUrl)}
        className="px-3 py-2 bg-[#34D399] hover:bg-[#34D399]/90 text-[#04352A] font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        title={!isDirty ? 'مفيش تغييرات' : (hasValue && !isValidUrl) ? 'الرابط لازم يبدأ بـ https://' : 'حفظ'}
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
}

// ============================================================================
// ImageSettingField — image preview + URL input + file upload + save
// ============================================================================

function ImageSettingField({
  field, value, originalValue, onChange, onSave, saving,
}: {
  field: SettingField
  value: string
  originalValue: string
  onChange: (v: string) => void
  onSave: () => void
  saving: boolean
}) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const isDirty = value !== originalValue
  const isValidUrl = value.startsWith('https://') || value.startsWith('http://')

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError(null)

    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const fileName = `${field.key}-${Date.now()}.${ext}`

      const { error: uploadErr } = await supabaseBrowser
        .storage
        .from('site-assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadErr) {
        setUploadError('فشل الرفع: ' + uploadErr.message)
        setUploading(false)
        return
      }

      const { data: urlData } = supabaseBrowser
        .storage
        .from('site-assets')
        .getPublicUrl(fileName)

      onChange(urlData.publicUrl)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'unknown'
      setUploadError('حصل خطأ: ' + msg)
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="bg-white rounded-3xl shadow-soft p-5 md:p-6">
      <div className="mb-4">
        <h3 className="font-black text-gray-900 text-base mb-1">{field.label}</h3>
        <p className="text-xs text-gray-500">{field.description}</p>
        <p className="text-[10px] text-gray-400 mt-1">
          الحجم المُوصى به: {field.recommendedSize} · نسبة العرض: {field.aspectRatio}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="md:col-span-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">معاينة</p>
          <div
            className="bg-gray-100 rounded-2xl overflow-hidden border-2 border-gray-100"
            style={{ aspectRatio: field.aspectRatio }}
          >
            {value && isValidUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={value}
                alt={field.label}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-gray-300" />
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-2 space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5 flex items-center gap-1">
              <LinkIcon className="w-3 h-3" />
              رابط الصورة
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full px-4 py-2.5 bg-[#FAFAF7] border border-gray-100 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-[#059669]/40 font-mono"
              dir="ltr"
              style={{ textAlign: 'left' }}
            />
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">
              أو ارفع صورة من الكمبيوتر
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full px-4 py-2.5 bg-[#FAFAF7] hover:bg-gray-100 border-2 border-dashed border-gray-300 hover:border-[#059669]/40 rounded-xl text-sm font-bold text-gray-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري الرفع...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  اختار صورة من الكمبيوتر
                </>
              )}
            </button>
            {uploadError && (
              <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                <X className="w-3 h-3" />
                {uploadError}
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onSave}
              disabled={!isDirty || !isValidUrl || saving}
              className="flex-1 px-4 py-2.5 bg-[#34D399] hover:bg-[#34D399]/90 text-[#04352A] font-bold rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  حفظ التغييرات
                </>
              )}
            </button>
            {isDirty && !saving && (
              <button
                type="button"
                onClick={() => onChange(originalValue)}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm flex items-center justify-center gap-1.5 transition-colors"
                title="إلغاء التغييرات"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
