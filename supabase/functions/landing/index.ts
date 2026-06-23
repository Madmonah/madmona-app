import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const WA_NUMBER = '201002229982'
const SITE_URL = 'https://madmonacairo.com'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

function escapeHtml(s: string): string {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function defaultPainPoints(name: string, isService: boolean): Array<any> {
  const noun = isService ? 'عميل' : 'عميل'
  return [
    {
      emoji: '❌',
      before_label: 'قبل مضمونة',
      before: `${noun} يحجز، يدفع مقدم، ويختفي قبل الميعاد. ${isService ? 'أنت' : 'انت'} خسرت يوم وميعاد.`,
      after_label: 'مع مضمونة',
      after: 'الدفع المقدم بيقعد عندنا. لو العميل ألغى، فلوسك مضمونة. لو الشغل اتعمل، تتحول لحسابك خلال 24 ساعة.'
    },
    {
      emoji: '📅',
      before_label: 'قبل مضمونة',
      before: 'إعلانات على OLX وفيسبوك. عميل واحد بيكلم 30 حد قبل ميقرر.',
      after_label: 'مع مضمونة',
      after: `العميل بيحدد احتياجاته بالظبط. الـ AI بتاعنا بيطابقه مع ${name}-ك مباشرة. عملاء جاهزين للحجز.`
    },
    {
      emoji: '💸',
      before_label: 'قبل مضمونة',
      before: 'عمولة 25-30٪ مع منصات تانية، أو شغل في الضلمة من غير حماية.',
      after_label: 'مع مضمونة',
      after: 'عمولة 10٪ بس، و<span class="font-black text-[#2FA084]">صفر عمولة لأول 30 يوم</span>. كله شفاف، فلوسك تتحول لحسابك مباشرة.'
    }
  ]
}

function defaultSteps(isService: boolean): Array<any> {
  return [
    { n: '١', title: isService ? 'سجّل خدمتك' : 'سجّل عرضك', subtitle: '5 دقايق · صور · أسعار · تفاصيل' },
    { n: '٢', title: 'عملاء جاهزة بتجيلك', subtitle: 'AI Matching · عملاء معاهم ميزانية وتاريخ' },
    { n: '٣', title: 'حجز محمي بدفع مقدم', subtitle: 'مضمونة بتحتفظ بالفلوس لحد التسليم' },
    { n: '٤', title: 'فلوسك في حسابك خلال 24س', subtitle: 'بعد التسليم · من غير تعقيد' }
  ]
}

const DEFAULT_WHY_STATS = [
  { value: '2019', label: 'سنة تأسيسنا' },
  { value: '100٪ مصري', label: 'فريق محلي' },
  { value: 'AI Matching', label: 'تقنية ذكية' },
  { value: 'دعم 24/7', label: 'فريق متخصص' }
]

const DEFAULT_HERO_TAGS = ['💰 دفعات محمية', '⚡ تحويل خلال 24س', '🛡️ ضمانة كاملة']

function renderHTML(c: any): string {
  const tagsHtml = (c.hero_tags as string[])
    .map(t => `<span class="bg-white/15 backdrop-blur px-3 py-1.5 rounded-full">${escapeHtml(t)}</span>`)
    .join('\n')

  const painPointsHtml = (c.pain_points as any[]).map(p => `
<div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-start gap-3">
  <div class="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
    <span class="text-xl">${escapeHtml(p.emoji || '❌')}</span>
  </div>
  <div class="flex-1">
    <p class="text-xs font-black text-red-700 mb-1">${escapeHtml(p.before_label || 'قبل مضمونة')}</p>
    <p class="text-sm text-gray-700">${p.before || ''}</p>
    <div class="gold-line h-px my-3"></div>
    <p class="text-xs font-black text-[#1F6F5F] mb-1">✓ ${escapeHtml(p.after_label || 'مع مضمونة')}</p>
    <p class="text-sm text-gray-700">${p.after || ''}</p>
  </div>
</div>`).join('\n')

  const stepsHtml = (c.steps as any[]).map((s, i) => `
<div class="bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm border border-gray-100">
  <div class="w-9 h-9 ${i === (c.steps.length - 1) ? 'bg-[#2FA084]' : 'bg-[#1F6F5F]'} text-white rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0">${escapeHtml(s.n || (i + 1))}</div>
  <div class="flex-1">
    <p class="font-black text-sm text-gray-900">${escapeHtml(s.title || '')}</p>
    <p class="text-xs text-gray-600">${escapeHtml(s.subtitle || '')}</p>
  </div>
</div>`).join('\n')

  const statsHtml = (c.why_stats as any[]).map(s => `
<div class="bg-white/10 backdrop-blur rounded-xl p-3">
  <p class="font-black mb-0.5">${escapeHtml(s.value || '')}</p>
  <p class="text-xs opacity-85">${escapeHtml(s.label || '')}</p>
</div>`).join('\n')

  const waMsg = encodeURIComponent(c.cta_whatsapp_message)
  const ctaPrimaryUrl = c.cta_primary_url_override
    || `${SITE_URL}/add-listing?category=${encodeURIComponent(c.category_slug)}&utm_source=landing&utm_medium=lp&utm_campaign=${encodeURIComponent(c.utm_campaign)}`

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5">
<title>${escapeHtml(c.meta_title)}</title>
<meta name="description" content="${escapeHtml(c.meta_description)}">
<meta property="og:title" content="${escapeHtml(c.meta_title)}">
<meta property="og:description" content="${escapeHtml(c.meta_description)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="ar_EG">
${c.og_image_url ? `<meta property="og:image" content="${escapeHtml(c.og_image_url)}">` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap" rel="stylesheet">
<script src="https://cdn.tailwindcss.com"></script>
<style>
body { font-family: 'Tajawal', system-ui, -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }
.gradient-green { background: linear-gradient(135deg, #1F6F5F 0%, #2A8B73 50%, #1F6F5F 100%); }
.gradient-gold { background: linear-gradient(135deg, #2FA084 0%, #6FCF97 50%, #2FA084 100%); }
.gradient-hero { background: linear-gradient(160deg, #0F4A40 0%, #1F6F5F 45%, #2A8B73 100%); }
.shine { position: relative; overflow: hidden; }
.shine::before { content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent); animation: shine 4s ease-in-out infinite; }
@keyframes shine { 50%, 100% { left: 100%; } }
.scale-on-active:active { transform: scale(0.97); transition: transform 0.1s; }
.gold-line { background: linear-gradient(90deg, transparent, #2FA084, transparent); }
.text-balance { text-wrap: balance; }
img { display: block; }
</style>
</head>
<body class="bg-[#EEEEEE] text-gray-900 min-h-screen pb-24">

<header class="bg-white border-b border-gray-200 sticky top-0 z-40">
<div class="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-3">
<div class="flex items-center gap-2.5">
<div class="w-10 h-10 bg-[#1F6F5F] rounded-xl flex items-center justify-center text-white font-black text-xl">م</div>
<div>
<p class="font-black text-[#1F6F5F] text-base leading-none">مضمونة</p>
<p class="text-[10px] text-gray-500 tracking-[0.2em] mt-1">احنا بتوع الإيجار</p>
</div>
</div>
<a href="https://wa.me/${WA_NUMBER}?text=${waMsg}" class="text-xs font-bold text-[#25D366] flex items-center gap-1">
<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
كلمنا
</a>
</div>
</header>

<section class="gradient-hero text-white relative overflow-hidden">
<div class="absolute top-0 right-0 w-64 h-64 bg-[#2FA084] opacity-10 rounded-full blur-3xl"></div>
<div class="absolute bottom-0 left-0 w-64 h-64 bg-[#2FA084] opacity-5 rounded-full blur-3xl"></div>
<div class="max-w-lg mx-auto px-5 py-10 relative">
<div class="inline-flex items-center gap-2 bg-[#2FA084]/20 backdrop-blur border border-[#2FA084]/40 px-3 py-1.5 rounded-full mb-4">
<span class="text-xs">${escapeHtml(c.hero_badge_emoji)}</span>
<span class="text-xs font-black tracking-widest text-[#6FCF97]">${escapeHtml(c.hero_badge_label)}</span>
</div>
<h1 class="text-3xl md:text-4xl font-black leading-tight text-balance mb-3">
${c.hero_title_html}
</h1>
<p class="text-base opacity-95 leading-relaxed mb-5">
${c.hero_subtitle_html}
</p>
<div class="flex flex-wrap gap-2 text-[11px] font-bold">
${tagsHtml}
</div>
</div>
</section>

<section class="max-w-lg mx-auto px-5 -mt-5 relative z-10 space-y-3">
<a href="${ctaPrimaryUrl}" class="scale-on-active shine block gradient-gold text-white p-5 rounded-2xl shadow-2xl relative">
<div class="flex items-start gap-4 relative z-10">
<div class="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center flex-shrink-0">
<svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path></svg>
</div>
<div class="flex-1">
<p class="text-xs font-black opacity-80 mb-1 tracking-widest">١</p>
<h3 class="text-xl font-black mb-1">${escapeHtml(c.cta_primary_label)}</h3>
<p class="text-sm opacity-95 leading-relaxed">${escapeHtml(c.cta_primary_subtitle)}</p>
<div class="flex items-center gap-1.5 mt-3 text-xs font-bold bg-white/20 backdrop-blur px-3 py-1.5 rounded-full inline-flex">
<span>${escapeHtml(c.cta_primary_badge)}</span>
</div>
</div>
<svg class="w-5 h-5 mt-2 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"></path></svg>
</div>
</a>

<a href="https://wa.me/${WA_NUMBER}?text=${waMsg}" class="scale-on-active shine block gradient-green text-white p-5 rounded-2xl shadow-lg relative">
<div class="flex items-start gap-4 relative z-10">
<div class="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center flex-shrink-0">
<svg class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/></svg>
</div>
<div class="flex-1">
<p class="text-xs font-black opacity-80 mb-1 tracking-widest">٢</p>
<h3 class="text-xl font-black mb-1">كلمنا واتساب</h3>
<p class="text-sm opacity-95 leading-relaxed">فريقنا يجاوبك خلال 3 دقايق. شرح كامل، استشارة مجانية.</p>
<div class="flex items-center gap-1.5 mt-3 text-xs font-bold bg-white/20 backdrop-blur px-3 py-1.5 rounded-full inline-flex">
<span>💬 رد فوري · 24/7</span>
</div>
</div>
<svg class="w-5 h-5 mt-2 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"></path></svg>
</div>
</a>
</section>

<section class="max-w-lg mx-auto px-5 py-8">
<div class="grid grid-cols-3 gap-2 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
<div class="text-center">
<div class="text-2xl mb-1.5">🛡️</div>
<p class="text-xs font-black text-gray-800 leading-tight">حماية كاملة</p>
<p class="text-[10px] text-gray-500 mt-0.5 leading-tight">دفعات محمية</p>
</div>
<div class="text-center border-x border-gray-100">
<div class="text-2xl mb-1.5">⚡</div>
<p class="text-xs font-black text-gray-800 leading-tight">دفع سريع</p>
<p class="text-[10px] text-gray-500 mt-0.5 leading-tight">24 ساعة</p>
</div>
<div class="text-center">
<div class="text-2xl mb-1.5">💬</div>
<p class="text-xs font-black text-gray-800 leading-tight">دعم مستمر</p>
<p class="text-[10px] text-gray-500 mt-0.5 leading-tight">24/7</p>
</div>
</div>
</section>

<section class="max-w-lg mx-auto px-5 py-2">
<div class="text-center mb-5">
<p class="text-[10px] font-black text-[#2FA084] uppercase tracking-[0.3em] mb-2">المشكلة اللي بنحلها</p>
<h2 class="text-xl font-black text-gray-900 leading-tight">بطّل تخسر فرص وعملاء بيهربوا</h2>
</div>
<div class="space-y-3">${painPointsHtml}</div>
</section>

<section class="max-w-lg mx-auto px-5 py-8">
<div class="text-center mb-5">
<p class="text-[10px] font-black text-[#2FA084] uppercase tracking-[0.3em] mb-2">إزاي بنشتغل</p>
<h2 class="text-xl font-black text-gray-900 leading-tight">٤ خطوات لأول حجز</h2>
</div>
<div class="space-y-2">${stepsHtml}</div>
</section>

<section class="max-w-lg mx-auto px-5 py-6">
<div class="gradient-green text-white rounded-2xl p-6 shadow-xl">
<p class="text-[10px] font-black text-[#6FCF97] uppercase tracking-[0.3em] mb-2">ليه مضمونة؟</p>
<h2 class="text-xl font-black mb-4 leading-tight">منصة مصرية. تقنية عالمية.</h2>
<div class="grid grid-cols-2 gap-3 text-sm">${statsHtml}</div>
</div>
</section>

<section class="max-w-lg mx-auto px-5 py-6">
<a href="https://wa.me/${WA_NUMBER}?text=${waMsg}" class="block bg-[#25D366] text-white p-5 rounded-2xl shadow-lg text-center scale-on-active shine">
<div class="flex items-center justify-center gap-2 mb-1 relative z-10">
<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.886-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"></path></svg>
<p class="font-black text-lg">احجز مكالمة مع فريقنا</p>
</div>
<p class="text-sm opacity-95 relative z-10">رد فوري · دعم بالعربي · مفيش التزام</p>
</a>
</section>

<footer class="max-w-lg mx-auto px-5 py-8 text-center">
<p class="font-black text-[#1F6F5F] text-2xl">مضمونة</p>
<p class="text-xs text-gray-500 mt-1 tracking-[0.2em]">احنا بتوع الإيجار</p>
<div class="flex items-center justify-center gap-2 mt-4 text-[11px] text-gray-500">
<span>٧ شارع سليمان عَزْمي، النزهة، مصر الجديدة، القاهرة</span>
</div>
<div class="flex items-center justify-center gap-3 mt-3 text-xs">
<a href="https://www.instagram.com/madmona.cairo" class="text-gray-500 hover:text-[#1F6F5F]">Instagram</a>
<span class="text-gray-300">·</span>
<a href="https://www.facebook.com/MadmonaCairo" class="text-gray-500 hover:text-[#1F6F5F]">Facebook</a>
<span class="text-gray-300">·</span>
<a href="${SITE_URL}" class="text-gray-500 hover:text-[#1F6F5F]">الموقع</a>
</div>
<p class="text-[10px] text-gray-400 mt-4">+20 100 222 9982 · madmona.admin@gmail.com</p>
</footer>

<a href="https://wa.me/${WA_NUMBER}?text=${waMsg}" class="fixed bottom-5 left-5 w-14 h-14 bg-[#25D366] rounded-full shadow-2xl flex items-center justify-center text-white z-50 scale-on-active" style="box-shadow: 0 10px 30px rgba(37,211,102,0.5);">
<svg class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"></path></svg>
</a>

</body>
</html>`
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url)
  const parts = url.pathname.split('/').filter(Boolean)
  let slug = parts[parts.length - 1] || ''
  if (slug === 'landing' || !slug) slug = url.searchParams.get('slug') || ''
  slug = slug.trim().toLowerCase()

  if (!slug) {
    return new Response('Missing category slug. Use /landing/{slug}', { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  }

  const { data: category, error: catErr } = await supabase
    .from('categories')
    .select('id, slug, name_ar, name_en, icon, domain, description')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (catErr || !category) {
    return new Response(`<!DOCTYPE html><html dir="rtl" lang="ar"><body style="font-family:Tajawal,sans-serif;text-align:center;padding:48px;color:#1F6F5F"><h1>الكاتيجوري مش موجود</h1><p>الـ slug "${escapeHtml(slug)}" مش موجود في DB.</p><a href="${SITE_URL}" style="color:#2FA084">رجوع لمضمونة</a></body></html>`, { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }

  const { data: override } = await supabase
    .from('category_landings')
    .select('*')
    .eq('category_id', category.id)
    .eq('status', 'live')
    .maybeSingle()

  const isService = category.domain === 'services'
  const audienceWord = isService ? 'شغّال في' : 'صاحب'

  const content = {
    category_slug: category.slug,
    category_name: category.name_ar,
    hero_badge_emoji: override?.hero_badge_emoji ?? (category.icon ?? '✨'),
    hero_badge_label: override?.hero_badge_label ?? (isService ? 'FOR PROFESSIONALS' : 'FOR OWNERS'),
    hero_title_html: override?.hero_title_html ?? `${audienceWord} ${escapeHtml(category.name_ar)}؟<br><span class="text-[#6FCF97]">عملاؤك القادمون على بعد كليكة.</span>`,
    hero_subtitle_html: override?.hero_subtitle_html ?? `منصة مضمونة بتجيب لـ ${escapeHtml(category.name_ar)}-ك عملاء موثقين بدفع مقدم محمي، عمولة 10٪ بس، وأول 30 يوم بـ <span class="font-black text-[#6FCF97]">0٪ عمولة</span> تجربة.`,
    hero_tags: override?.hero_tags ?? DEFAULT_HERO_TAGS,
    cta_primary_label: override?.cta_primary_label ?? (isService ? 'سجّل خدمتك دلوقتي' : 'سجّل عرضك دلوقتي'),
    cta_primary_subtitle: override?.cta_primary_subtitle ?? '5 دقايق على الموبايل. صور، تفاصيل، أسعار. تظهر للعملاء فوراً.',
    cta_primary_badge: override?.cta_primary_badge ?? '✨ ٠٪ عمولة لأول ٣٠ يوم',
    cta_primary_url_override: override?.cta_primary_url_override ?? null,
    cta_whatsapp_message: override?.cta_whatsapp_message ?? `أهلاً، عندي ${category.name_ar} وحابب أعرف تفاصيل الشراكة مع مضمونة`,
    pain_points: override?.pain_points ?? defaultPainPoints(category.name_ar, isService),
    steps: override?.steps ?? defaultSteps(isService),
    why_stats: override?.why_stats ?? DEFAULT_WHY_STATS,
    meta_title: override?.meta_title ?? `مضمونة | ${category.name_ar} - شراكة + حماية كاملة`,
    meta_description: override?.meta_description ?? `منصة مضمونة لـ ${category.name_ar} في مصر. عملاء موثقين، دفع مقدم محمي، 0٪ عمولة لأول 30 يوم.`,
    og_image_url: override?.og_image_url ?? null,
    utm_campaign: override?.utm_campaign ?? `cat_${slug}`,
  }

  if (override?.id) {
    supabase.from('category_landings')
      .update({ views_count: (override.views_count || 0) + 1 })
      .eq('id', override.id)
      .then(() => {})
  }

  const html = renderHTML(content)

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
      'Access-Control-Allow-Origin': '*',
      'Content-Security-Policy': "default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval'; style-src 'self' https: 'unsafe-inline'; script-src 'self' https: 'unsafe-inline' 'unsafe-eval'; font-src 'self' https: data:; img-src 'self' https: data:; connect-src 'self' https:;",
    },
  })
})
