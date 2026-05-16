// Next.js Route Handler — serves the wedding halls landing page directly from Vercel.
// Moved from Supabase Edge Function (supabase/functions/halls) because Supabase
// injects 'default-src none; sandbox' CSP for browsers, breaking all styling.

const HTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5">
<title>مضمونة | لأصحاب قاعات الأفراح - عرسان جدد + حماية كاملة</title>
<meta name="description" content="منصة مضمونة لأصحاب قاعات الأفراح والفنادق في مصر. عرسان موثقين، دفع مقدم محمي، 0٪ عمولة لأول 30 يوم.">

<meta property="og:title" content="مضمونة | لأصحاب قاعات الأفراح">
<meta property="og:description" content="عرسان جدد بدفع مقدم محمي + 0٪ عمولة لأول 30 يوم. منصة مصرية موثوقة.">
<meta property="og:type" content="website">
<meta property="og:locale" content="ar_EG">

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
<a href="https://wa.me/201002229982" class="text-xs font-bold text-[#25D366] flex items-center gap-1">
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
<span class="text-xs">💒</span>
<span class="text-xs font-black tracking-widest text-[#6FCF97]">FOR HALL OWNERS</span>
</div>
<h1 class="text-3xl md:text-4xl font-black leading-tight text-balance mb-3">
صاحب قاعة أفراح؟<br>
<span class="text-[#6FCF97]">عرسانك القادمين على بعد كليكة.</span>
</h1>
<p class="text-base opacity-95 leading-relaxed mb-5">
منصة مضمونة بتجيب لقاعتك عرسان موثوقين بدفع مقدم محمي، عمولة 10٪ بس، وأول 30 يوم بـ <span class="font-black text-[#6FCF97]">0٪ عمولة</span> تجربة.
</p>
<div class="flex flex-wrap gap-2 text-[11px] font-bold">
<span class="bg-white/15 backdrop-blur px-3 py-1.5 rounded-full">💰 دفعات محمية</span>
<span class="bg-white/15 backdrop-blur px-3 py-1.5 rounded-full">⚡ تحويل خلال 24س</span>
<span class="bg-white/15 backdrop-blur px-3 py-1.5 rounded-full">🛡️ ضمانة كاملة</span>
</div>
</div>
</section>

<section class="max-w-lg mx-auto px-5 -mt-5 relative z-10 space-y-3">

<a href="https://madmonacairo.com/add-listing?category=weddings-halls&utm_source=whatsapp&utm_campaign=halls&utm_content=cta_register" class="scale-on-active shine block gradient-gold text-white p-5 rounded-2xl shadow-2xl relative">
<div class="flex items-start gap-4 relative z-10">
<div class="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center flex-shrink-0">
<svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
</div>
<div class="flex-1">
<p class="text-xs font-black opacity-80 mb-1 tracking-widest">١</p>
<h3 class="text-xl font-black mb-1">سجّل قاعتك دلوقتي</h3>
<p class="text-sm opacity-95 leading-relaxed">5 دقايق على الموبايل. صور، تفاصيل، أسعار. تظهر للعرسان فوراً.</p>
<div class="flex items-center gap-1.5 mt-3 text-xs font-bold bg-white/20 backdrop-blur px-3 py-1.5 rounded-full inline-flex">
<span>✨ ٠٪ عمولة لأول ٣٠ يوم</span>
</div>
</div>
<svg class="w-5 h-5 mt-2 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"></path></svg>
</div>
</a>

<a href="https://wa.me/201002229982?text=أهلاً،%20عندي%20قاعة%20أفراح%20وحابب%20أعرف%20تفاصيل%20الشراكة%20مع%20مضمونة" class="scale-on-active shine block gradient-green text-white p-5 rounded-2xl shadow-lg relative">
<div class="flex items-start gap-4 relative z-10">
<div class="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center flex-shrink-0">
<svg class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/></svg>
</div>
<div class="flex-1">
<p class="text-xs font-black opacity-80 mb-1 tracking-widest">٢</p>
<h3 class="text-xl font-black mb-1">كلمنا واتساب</h3>
<p class="text-sm opacity-95 leading-relaxed">فريقنا يجاوبك خلال 3 دقايق. شرح كامل، استشارة مجانية، وتجهيز ملف قاعتك معاك.</p>
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
<h2 class="text-xl font-black text-gray-900 leading-tight">
بطّل تخسر قعدات فاضية وعملاء بيهربوا
</h2>
</div>

<div class="space-y-3">

<div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-start gap-3">
<div class="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
<span class="text-xl">❌</span>
</div>
<div class="flex-1">
<p class="text-xs font-black text-red-700 mb-1">قبل مضمونة</p>
<p class="text-sm text-gray-700">عميل يحجز، يدفع 500 ج مقدم، ويختفي قبل الحفل بأسبوع. قاعدتك خسرت يوم وميعاد.</p>
<div class="gold-line h-px my-3"></div>
<p class="text-xs font-black text-[#1F6F5F] mb-1">✓ مع مضمونة</p>
<p class="text-sm text-gray-700">الدفع المقدم بيقعد عندنا. لو العميل ألغى، فلوسك مضمونة. لو الحفل اتعمل، تتحول لحسابك خلال 24 ساعة.</p>
</div>
</div>

<div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-start gap-3">
<div class="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
<span class="text-xl">📅</span>
</div>
<div class="flex-1">
<p class="text-xs font-black text-red-700 mb-1">قبل مضمونة</p>
<p class="text-sm text-gray-700">إعلانات على OLX وفيسبوك. عميل واحد كل ميعاد بيكلم 30 قاعة قبل ميقرر.</p>
<div class="gold-line h-px my-3"></div>
<p class="text-xs font-black text-[#1F6F5F] mb-1">✓ مع مضمونة</p>
<p class="text-sm text-gray-700">العميل يحدد عدد المعازيم، الميزانية، والتاريخ. الـ AI بتاعنا بتطابقه مع قاعتك مباشرة. عملاء جاهزين للحجز.</p>
</div>
</div>

<div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-start gap-3">
<div class="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
<span class="text-xl">💸</span>
</div>
<div class="flex-1">
<p class="text-xs font-black text-red-700 mb-1">قبل مضمونة</p>
<p class="text-sm text-gray-700">عمولة 25-30٪ مع منصات تانية، أو شغل في الضلمة من غير حماية.</p>
<div class="gold-line h-px my-3"></div>
<p class="text-xs font-black text-[#1F6F5F] mb-1">✓ مع مضمونة</p>
<p class="text-sm text-gray-700">عمولة 10٪ بس، و<span class="font-black text-[#2FA084]">صفر عمولة لأول 30 يوم</span>. كله شفاف، فلوسك تتحول لحسابك مباشرة.</p>
</div>
</div>

</div>
</section>

<section class="max-w-lg mx-auto px-5 py-8">
<div class="text-center mb-5">
<p class="text-[10px] font-black text-[#2FA084] uppercase tracking-[0.3em] mb-2">إزاي بنشتغل</p>
<h2 class="text-xl font-black text-gray-900 leading-tight">٤ خطوات لأول حجز</h2>
</div>

<div class="space-y-2">
<div class="bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm border border-gray-100">
<div class="w-9 h-9 bg-[#1F6F5F] text-white rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0">١</div>
<div class="flex-1">
<p class="font-black text-sm text-gray-900">سجّل قاعتك</p>
<p class="text-xs text-gray-600">5 دقايق · صور · أسعار · سعة</p>
</div>
</div>
<div class="bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm border border-gray-100">
<div class="w-9 h-9 bg-[#1F6F5F] text-white rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0">٢</div>
<div class="flex-1">
<p class="font-black text-sm text-gray-900">عرسان جاهزة بتجيلك</p>
<p class="text-xs text-gray-600">AI Matching · عملاء معاهم ميزانية وتاريخ</p>
</div>
</div>
<div class="bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm border border-gray-100">
<div class="w-9 h-9 bg-[#1F6F5F] text-white rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0">٣</div>
<div class="flex-1">
<p class="font-black text-sm text-gray-900">حجز محمي بدفع مقدم</p>
<p class="text-xs text-gray-600">مضمونة بتحتفظ بالفلوس لحد الحفل</p>
</div>
</div>
<div class="bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm border border-gray-100">
<div class="w-9 h-9 bg-[#2FA084] text-white rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0">٤</div>
<div class="flex-1">
<p class="font-black text-sm text-gray-900">فلوسك في حسابك خلال 24س</p>
<p class="text-xs text-gray-600">بعد الحفل · من غير تعقيد</p>
</div>
</div>
</div>
</section>

<section class="max-w-lg mx-auto px-5 py-6">
<div class="gradient-green text-white rounded-2xl p-6 shadow-xl">
<p class="text-[10px] font-black text-[#6FCF97] uppercase tracking-[0.3em] mb-2">ليه مضمونة؟</p>
<h2 class="text-xl font-black mb-4 leading-tight">منصة مصرية. تقنية عالمية.</h2>
<div class="grid grid-cols-2 gap-3 text-sm">
<div class="bg-white/10 backdrop-blur rounded-xl p-3">
<p class="font-black mb-0.5">2019</p>
<p class="text-xs opacity-85">سنة تأسيسنا</p>
</div>
<div class="bg-white/10 backdrop-blur rounded-xl p-3">
<p class="font-black mb-0.5">100٪ مصري</p>
<p class="text-xs opacity-85">فريق محلي</p>
</div>
<div class="bg-white/10 backdrop-blur rounded-xl p-3">
<p class="font-black mb-0.5">AI Matching</p>
<p class="text-xs opacity-85">تقنية ذكية</p>
</div>
<div class="bg-white/10 backdrop-blur rounded-xl p-3">
<p class="font-black mb-0.5">دعم 24/7</p>
<p class="text-xs opacity-85">فريق متخصص</p>
</div>
</div>
</div>
</section>

<section class="max-w-lg mx-auto px-5 py-6">
<a href="https://wa.me/201002229982?text=أهلاً،%20عندي%20قاعة%20أفراح%20وحابب%20أعرف%20تفاصيل%20الشراكة%20مع%20مضمونة" class="block bg-[#25D366] text-white p-5 rounded-2xl shadow-lg text-center scale-on-active shine">
<div class="flex items-center justify-center gap-2 mb-1 relative z-10">
<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"></path></svg>
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
<a href="https://madmonacairo.com" class="text-gray-500 hover:text-[#1F6F5F]">الموقع</a>
</div>
<p class="text-[10px] text-gray-400 mt-4">+20 100 222 9982 · madmona.admin@gmail.com</p>
</footer>

<a href="https://wa.me/201002229982?text=أهلاً،%20عندي%20قاعة%20أفراح%20وحابب%20أعرف%20تفاصيل%20الشراكة%20مع%20مضمونة" class="fixed bottom-5 left-5 w-14 h-14 bg-[#25D366] rounded-full shadow-2xl flex items-center justify-center text-white z-50 scale-on-active" style="box-shadow: 0 10px 30px rgba(37,211,102,0.5);">
<svg class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"></path></svg>
</a>

</body>
</html>`

export const dynamic = 'force-static'

export async function GET() {
  return new Response(HTML, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  })
}
