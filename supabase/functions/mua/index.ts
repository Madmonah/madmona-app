import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const HTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5">
<title>مضمونة | للميكب أرتيست - عملاء جدد + استوديو احترافي</title>
<meta name="description" content="منصة مضمونة بتدعم الميكب أرتيست بحاجتين: عملاء عرايس وحفلات + استوديو محترف للترايل والكورسات في مصر الجديدة">

<meta property="og:title" content="مضمونة | للميكب أرتيست المحترفات">
<meta property="og:description" content="عملاء عرايس + استوديو احترافي في مصر الجديدة. منصة مصرية موثقة.">
<meta property="og:image" content="https://mjhflxpxunwycbiquoig.supabase.co/storage/v1/object/public/listing-photos/c68ad8a4-8ece-429d-9a42-c81d17cda8f7/01-mirror-corner.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="900">
<meta property="og:type" content="website">
<meta property="og:locale" content="ar_EG">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap" rel="stylesheet">
<script src="https://cdn.tailwindcss.com"></script>
<style>
body { font-family: 'Tajawal', system-ui, -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }
.gradient-green { background: linear-gradient(135deg, #1F5F3F 0%, #2d7a52 50%, #1F5F3F 100%); }
.gradient-gold { background: linear-gradient(135deg, #B8860B 0%, #d4a017 50%, #B8860B 100%); }
.shine { position: relative; overflow: hidden; }
.shine::before { content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent); animation: shine 4s ease-in-out infinite; }
@keyframes shine { 50%, 100% { left: 100%; } }
.scale-on-active:active { transform: scale(0.97); transition: transform 0.1s; }
img { display: block; }
</style>
</head>
<body class="bg-[#FAF7F0] text-gray-900 min-h-screen pb-24">

<header class="bg-white border-b border-gray-200 sticky top-0 z-40">
<div class="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-3">
<div class="flex items-center gap-2.5">
<div class="w-10 h-10 bg-[#1F5F3F] rounded-xl flex items-center justify-center text-white font-black text-xl">م</div>
<div>
<p class="font-black text-[#1F5F3F] text-base leading-none">مضمونة</p>
<p class="text-[10px] text-gray-500 tracking-[0.2em] mt-1">احنا بتوع الإيجار</p>
</div>
</div>
<a href="https://wa.me/201002229982" class="text-xs font-bold text-[#25D366] flex items-center gap-1">
<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
كلمنا
</a>
</div>
</header>

<section class="bg-white">
<div class="relative aspect-[4/3] overflow-hidden bg-gray-100">
<img src="https://mjhflxpxunwycbiquoig.supabase.co/storage/v1/object/public/listing-photos/c68ad8a4-8ece-429d-9a42-c81d17cda8f7/01-mirror-corner.jpg" alt="استوديو ميكب أرتيست احترافي" class="absolute inset-0 w-full h-full object-cover" loading="eager">
<div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
<div class="absolute top-4 right-4 bg-[#B8860B] text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg">
<span>💄 Beauty Pros</span>
</div>
<div class="absolute bottom-5 right-5 left-5 text-white">
<p class="text-[10px] font-bold tracking-[0.3em] opacity-90 mb-1">FOR MAKEUP ARTISTS</p>
<h1 class="text-2xl md:text-3xl font-black leading-tight">
ميكب أرتيست؟<br>مضمونة معاكي بحاجتين 💄
</h1>
</div>
</div>
</section>

<section class="max-w-lg mx-auto px-5 py-6 bg-white">
<p class="text-base text-gray-700 leading-relaxed text-center">
منصة مصرية بتدعم محترفي التجميل بطريقتين أساسيتين 👇
</p>
</section>

<section class="max-w-lg mx-auto px-5 -mt-2 space-y-3">

<a href="https://madmonacairo.com/supplier/register?utm_source=meta&utm_campaign=mua&utm_content=landing_register" class="scale-on-active shine block gradient-gold text-white p-5 rounded-2xl shadow-lg relative">
<div class="flex items-start gap-4 relative z-10">
<div class="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center flex-shrink-0">
<svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5"></path></svg>
</div>
<div class="flex-1">
<p class="text-xs font-black opacity-80 mb-1 tracking-widest">١</p>
<h3 class="text-xl font-black mb-1">سجّلي كموردة محترفة</h3>
<p class="text-sm opacity-95 leading-relaxed">عملاء عرايس وحفلات وسيدات بيدوروا على ميكب أرتيست - إحنا بنوصّلهم لك. مجاناً تماماً.</p>
<div class="flex items-center gap-1.5 mt-3 text-xs font-bold bg-white/20 backdrop-blur px-3 py-1.5 rounded-full inline-flex">
<span>✨ ٠٪ عمولة لأول ٣٠ يوم</span>
</div>
</div>
<svg class="w-5 h-5 mt-2 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"></path></svg>
</div>
</a>

<a href="https://madmonacairo.com/marketplace/madmona-makeup-studio-heliopolis?utm_source=meta&utm_campaign=mua&utm_content=landing_book" class="scale-on-active shine block gradient-green text-white p-5 rounded-2xl shadow-lg relative">
<div class="flex items-start gap-4 relative z-10">
<div class="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center flex-shrink-0">
<svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
</div>
<div class="flex-1">
<p class="text-xs font-black opacity-80 mb-1 tracking-widest">٢</p>
<h3 class="text-xl font-black mb-1">احجزي استوديو احترافي</h3>
<p class="text-sm opacity-95 leading-relaxed">في مصر الجديدة، مجهّز بالكامل للترايل والكورسات. مرايا، إضاءة LED، Ring Light، كل حاجة.</p>
<div class="flex items-center gap-1.5 mt-3 text-xs font-bold bg-white/20 backdrop-blur px-3 py-1.5 rounded-full inline-flex">
<span>💰 من ٣٠٠ ج/ساعة</span>
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
<p class="text-[10px] text-gray-500 mt-0.5 leading-tight">مدفوعات آمنة</p>
</div>
<div class="text-center border-x border-gray-100">
<div class="text-2xl mb-1.5">⚡</div>
<p class="text-xs font-black text-gray-800 leading-tight">دفع سريع</p>
<p class="text-[10px] text-gray-500 mt-0.5 leading-tight">٢٤ ساعة</p>
</div>
<div class="text-center">
<div class="text-2xl mb-1.5">💬</div>
<p class="text-xs font-black text-gray-800 leading-tight">دعم مستمر</p>
<p class="text-[10px] text-gray-500 mt-0.5 leading-tight">٢٤/٧</p>
</div>
</div>
</section>

<section class="max-w-lg mx-auto px-5 py-2">
<div class="flex items-center justify-between mb-3">
<h2 class="text-base font-black text-[#1F5F3F]">شوفي الاستوديو</h2>
<a href="https://madmonacairo.com/marketplace/madmona-makeup-studio-heliopolis?utm_source=meta&utm_campaign=mua&utm_content=landing_gallery" class="text-xs font-bold text-[#B8860B]">شوفي الكل ←</a>
</div>
<div class="grid grid-cols-2 gap-2">
<img src="https://mjhflxpxunwycbiquoig.supabase.co/storage/v1/object/public/listing-photos/c68ad8a4-8ece-429d-9a42-c81d17cda8f7/02-meeting-room.jpg" alt="القاعة الرئيسية" class="aspect-square w-full object-cover rounded-xl shadow-sm" loading="lazy">
<img src="https://mjhflxpxunwycbiquoig.supabase.co/storage/v1/object/public/listing-photos/c68ad8a4-8ece-429d-9a42-c81d17cda8f7/03-workspace-led.jpg" alt="منطقة العمل" class="aspect-square w-full object-cover rounded-xl shadow-sm" loading="lazy">
<img src="https://mjhflxpxunwycbiquoig.supabase.co/storage/v1/object/public/listing-photos/c68ad8a4-8ece-429d-9a42-c81d17cda8f7/04-reception.jpg" alt="استقبال" class="aspect-square w-full object-cover rounded-xl shadow-sm" loading="lazy">
<img src="https://mjhflxpxunwycbiquoig.supabase.co/storage/v1/object/public/listing-photos/c68ad8a4-8ece-429d-9a42-c81d17cda8f7/01-mirror-corner.jpg" alt="زاوية الميكب بالمرايا" class="aspect-square w-full object-cover rounded-xl shadow-sm" loading="lazy">
</div>
</section>

<section class="max-w-lg mx-auto px-5 py-6">
<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
<p class="text-[10px] font-black text-[#B8860B] uppercase tracking-[0.3em] mb-2">الاستوديو</p>
<h2 class="text-lg font-black text-gray-900 leading-tight mb-1">
استوديو ميكب أرتيست محترف
</h2>
<p class="text-sm text-gray-600 mb-4 flex items-center gap-1.5">
<svg class="w-3.5 h-3.5 text-[#1F5F3F]" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path></svg>
النزهة، مصر الجديدة
</p>

<div class="space-y-2 mb-4">
<div class="flex items-center justify-between p-3 bg-[#FAF7F0] rounded-xl">
<span class="text-sm font-bold text-gray-700">بالساعة</span>
<div class="text-left">
<span class="font-black text-[#1F5F3F]">٣٠٠ ج</span>
<p class="text-[10px] text-gray-500">حد أدنى ساعتين</p>
</div>
</div>
<div class="flex items-center justify-between p-3 bg-[#FAF7F0] rounded-xl">
<span class="text-sm font-bold text-gray-700">باليوم</span>
<div class="text-left">
<span class="font-black text-[#1F5F3F]">١٥٠٠ ج</span>
<p class="text-[10px] text-gray-500">٨ ساعات</p>
</div>
</div>
<div class="flex items-center justify-between p-3 bg-gradient-to-l from-[#B8860B]/10 to-transparent rounded-xl border border-[#B8860B]/20">
<span class="text-sm font-bold text-gray-700">باقة شهرية للكورسات ⭐</span>
<span class="font-black text-[#1F5F3F]">١٢٠٠٠ ج</span>
</div>
</div>

<p class="text-xs font-black text-gray-700 mb-2">المميزات:</p>
<div class="grid grid-cols-2 gap-1.5 text-xs">
<span class="bg-green-50 text-green-800 px-2.5 py-1.5 rounded-lg font-semibold">✓ مرايا ديكور</span>
<span class="bg-green-50 text-green-800 px-2.5 py-1.5 rounded-lg font-semibold">✓ إضاءة LED</span>
<span class="bg-green-50 text-green-800 px-2.5 py-1.5 rounded-lg font-semibold">✓ Ring Light</span>
<span class="bg-green-50 text-green-800 px-2.5 py-1.5 rounded-lg font-semibold">✓ كرسي ميكب</span>
<span class="bg-green-50 text-green-800 px-2.5 py-1.5 rounded-lg font-semibold">✓ تكييف + WiFi</span>
<span class="bg-green-50 text-green-800 px-2.5 py-1.5 rounded-lg font-semibold">✓ موقف سيارات</span>
</div>

<a href="https://madmonacairo.com/marketplace/madmona-makeup-studio-heliopolis?utm_source=meta&utm_campaign=mua&utm_content=landing_studio_detail" class="block mt-4 text-center bg-[#1F5F3F] text-white py-3 rounded-xl font-black text-sm shadow-sm">
شوفي التفاصيل الكاملة + احجزي ←
</a>
</div>
</section>

<section class="max-w-lg mx-auto px-5 py-6">
<a href="https://wa.me/201002229982?text=أهلاً،%20شفت%20الإعلان%20بتاع%20مضمونة%20للميكب%20أرتيست%20وحابة%20أعرف%20تفاصيل%20أكتر" class="block bg-[#25D366] text-white p-4 rounded-2xl shadow-lg text-center scale-on-active">
<div class="flex items-center justify-center gap-2 mb-1">
<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"></path></svg>
<p class="font-black text-lg">كلمنا واتساب مباشرة</p>
</div>
<p class="text-sm opacity-90">رد فوري · ٢٤/٧</p>
</a>
</section>

<footer class="max-w-lg mx-auto px-5 py-8 text-center">
<p class="font-black text-[#1F5F3F] text-2xl">مضمونة</p>
<p class="text-xs text-gray-500 mt-1 tracking-[0.2em]">احنا بتوع الإيجار</p>
<div class="flex items-center justify-center gap-2 mt-4 text-[10px] text-gray-400">
<span>٧ شارع سليمان عَزْمي، النزهة، مصر الجديدة</span>
</div>
<div class="flex items-center justify-center gap-3 mt-3">
<a href="https://www.instagram.com/madmona.cairo" class="text-gray-400 hover:text-[#1F5F3F]">Instagram</a>
<span class="text-gray-300">·</span>
<a href="https://madmonacairo.com" class="text-gray-400 hover:text-[#1F5F3F]">الموقع</a>
</div>
</footer>

<a href="https://wa.me/201002229982" class="fixed bottom-5 left-5 w-14 h-14 bg-[#25D366] rounded-full shadow-2xl flex items-center justify-center text-white z-50 scale-on-active" style="box-shadow: 0 10px 30px rgba(37,211,102,0.5);">
<svg class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"></path></svg>
</a>

</body>
</html>`

Deno.serve(async (_req: Request) => {
  return new Response(HTML, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
    },
  })
})
