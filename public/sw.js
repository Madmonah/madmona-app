// Service Worker for Madmona PWA
// Offline caching + Push notifications + Notification clicks
// Version: 5 (22 يوليو 2026) — يجبر مسح الكاش القديم على كل الأجهزة (كان في
// أجهزة ماسكة نسخة قديمة فاضية من الماركت بليس). activate بيمسح أي كاش مختلف.
// Version: 6 (19 أغسطس 2026) — notificationclick مابقاش بيخطف تاب لوحة الأدمن
// المفتوح لصفحة تانية (محمد: «لما بكون فاتح صفحة الادمن بلاقي الصفحة لوحدها
// راحت لصفحة تانية»). السبب: إشعارات بوش كتير بتوصله وهو شغال على /admin
// (تقرير الساعتين كل ٢ ساعة، ردود المارد...)، ودوسة بغير قصد على واحد منها
// كانت بتـnavigate التاب المفتوح لصفحة الإشعار من تحته. دلوقتي: لو فيه تاب
// أدمن مفتوح، بنركّز عليه بس ونفتح المطلوب في تاب جديد بدل ما "نخطف" شغله.

// Version: 8 (20 أغسطس 2026) — 🔴🔴 إصلاح جذري ودائم لمشكلة «النسخة القديمة
// العالقة». محمد: «انا مش عايز حلول مؤقته».
//
// المشكلة اللي فضلت تتكرر: الـSW كان بيخزّن **صفحات HTML**. وNext.js بيغيّر
// أسماء ملفات الـJS (hash) مع كل نشر. فالنتيجة: HTML قديم مخزّن بيشاور على
// ملفات JS **اتشالت من السيرفر** → المستخدم عالق على نسخة قديمة شغالة،
// ومش بيعرف إن فيه تحديث. حصل فعليًا مع صفحة الدخول: محمد وأحمد فضلوا
// شايفين النسخة القديمة اللي بترفض الإيميل **قبل ما تبعت أي طلب للسيرفر**،
// والدليل إن سجل المصادقة مافيهوش ولا محاولة واحدة منهم رغم إنهم بيحاولوا.
//
// الحل الدائم (مش ترقيع):
//   ١) **صفحات HTML ماتتخزّنش خالص** — دايمًا من الشبكة. الكاش بقى للأصول
//      الثابتة بس (أيقونات/manifest) اللي أسماؤها ماتتغيرش.
//   ٢) **أي نسخة جديدة بتتفرض فورًا** على كل التابات المفتوحة: الـSW بيبلّغ
//      الصفحات (`SW_UPDATED`) وهي بتعمل reload لوحدها (بأمان — مش وسط كتابة).
//   ٣) مسارات المصادقة network-only دايمًا (وده الصح أمنيًا كمان).
// بكده أي نشر بيوصل لكل الناس من غير ما حد يعمل حاجة، ومفيش «امسح الكاش»
// تاني أبدًا.
// Version: 9 (25 أغسطس 2026) — 📡 صفحة أوفلاين. محمد: «لو النت فصل من
// التليفون يكتب this site can't be reached!؟». إصلاح v8 (HTML من الشبكة
// دايمًا) كان صح، بس ساب المستخدم مع صفحة خطأ المتصفح لو النت فصل.
// دلوقتي: أي صفحة تفشل بسبب الشبكة → /offline.html (ثابتة، مفيش فيها
// JS بأسماء متغيرة، فمفيش خطر «النسخة العالقة» اللي v8 اتعمل علشانها).
// وبترجع لوحدها أول ما النت يرجع (حدث online + زرار حاول تاني).
// 🔄 (١ سبتمبر ٢٠٢٦) v10 — الرقم لازم يترفع مع كل نشر مهم، وإلا الموبايل
//    يفضل على الـSW القديم. محمد: «مش شايف أي إضافة على الموبايل».
const CACHE_NAME = 'madmona-v75';
const OFFLINE_PAGE = '/offline.html';

// مسارات ممنوع تخزينها نهائيًا (مصادقة/دخول)
// 🚪 (١/٩/٢٠٢٦) '/fix' = باب خروج الجهاز العالق — ماينفعش يتخزّن أبدًا.
const NEVER_CACHE = ['/auth/', '/admin-entry', '/clock/', '/fix'];
const STATIC_ASSETS = [
  '/',
  OFFLINE_PAGE,
  '/manifest.json',
  '/madmona-logo.png',
  '/icon-192.png',
  '/icon-512.png',
];

// ============================================================================
// Install / Activate / Fetch
// ============================================================================

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[sw] Some assets failed to pre-cache:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // امسح أي كاش من نسخة قديمة
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
      await self.clients.claim();

      // 🔄 بلّغ كل التابات المفتوحة إن فيه نسخة جديدة اشتغلت، عشان تعمل
      //    reload لوحدها بدل ما المستخدم يفضل عالق على كود قديم من غير
      //    ما يعرف. الصفحة هي اللي بتقرر امتى تعمل reload بأمان
      //    (شوف SWUpdateHandler.tsx — مش بتقاطعه وهو بيكتب).
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clients) {
        client.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME });
      }
    })()
  );
});

// 🔎 (١ سبتمبر ٢٠٢٦) الصفحة بتسأل الـSW عن نسخته — عشان تكتشف لو الجهاز
//    عالق على نسخة قديمة وتصلّح نفسها (شوف versionGuard في ServiceWorkerRegister).
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'GET_VERSION') {
    const reply = { type: 'VERSION', version: CACHE_NAME };
    if (event.ports && event.ports[0]) event.ports[0].postMessage(reply);
    else if (event.source) event.source.postMessage(reply);
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // 🔒 صفحات المصادقة: من الشبكة دايمًا، ومابتتخزّنش خالص.
  //    (شوف تعليق v7 فوق — دي كانت سبب إن الناس تفضل شايفة صفحة دخول قديمة
  //     بعد النشر، ومحاولاتهم ماتوصلش السيرفر أصلًا.)
  if (NEVER_CACHE.some((p) => url.pathname.startsWith(p))) {
    // (v9) حتى صفحات المصادقة: لو الشبكة فصلت، صفحة الأوفلاين أحسن من
    // صفحة خطأ المتصفح. الصفحة نفسها لسه ماتتخزّنش أبدًا.
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_PAGE)));
    return;
  }

  // 📄 صفحات HTML: **من الشبكة دايمًا، وماتتخزّنش أبدًا.**
  //    ده جوهر إصلاح v8 — تخزين الـHTML هو اللي كان بيخلي الناس عالقة على
  //    نسخة قديمة بتشاور على ملفات JS اتشالت من السيرفر.
  //    (v9) الجديد الوحيد: لو الشبكة نفسها فصلت → صفحة الأوفلاين الثابتة،
  //    بدل «This site can't be reached» بتاعة المتصفح.
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_PAGE)));
    return;
  }

  // 🛡️ (17 Jul 2026) v3 كان cache-first لكل حاجة same-origin — بعد كذا deploy
  // في نفس اليوم: HTML قديم من الكاش + chunks اتشالت من السيرفر = صور وصفحات
  // بايظة لمستخدمي الـPWA. v4: network-first لكل حاجة، والكاش fallback للأوفلاين بس.
  //
  // (20 أغسطس 2026 — v8) الأصول بس هي اللي بتتخزّن دلوقتي، والصفحات لأ.
  // ملفات Next.js في /_next/static/ أسماؤها فيها hash — يعني أي نسخة جديدة
  // اسمها مختلف، فتخزينها آمن ومفيهوش خطر «نسخة قديمة عالقة».
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// ============================================================================
// Push Notifications
// ============================================================================

// Handle incoming push events from server
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'مضمونة', body: event.data ? event.data.text() : 'إشعار جديد' };
  }

  const title = data.title || 'مضمونة';
  const options = {
    body: data.body || 'عندك إشعار جديد',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    image: data.image,
    tag: data.tag || 'madmona-notification',
    requireInteraction: data.requireInteraction || false,
    dir: 'rtl',
    lang: 'ar',
    data: {
      url: data.url || '/',
      bookingId: data.bookingId,
      ...data.data,
    },
    actions: data.actions || [
      { action: 'open', title: 'افتح' },
      { action: 'close', title: 'إغلاق' },
    ],
    vibrate: [200, 100, 200],
  };

  // لو الإشعار خاص بالشات والمستخدم فاتح الشات فعلاً وشايفه — منعرضهوش (مايزعّجوش)
  const suppressIfChatFocused = data.tag === 'chat_reply' || (data.data && data.data.suppressIfChatFocused);

  event.waitUntil((async () => {
    if (suppressIfChatFocused) {
      try {
        const cls = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        const chatFocused = cls.some((c) => c.focused && (c.url || '').indexOf('/chat') !== -1);
        if (chatFocused) return;
      } catch (e) { /* لو فشل الفحص، اعرض الإشعار عادي */ }
    }
    await self.registration.showNotification(title, options);
  })());
});

// Handle notification click — open the relevant page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const pathOf = (u) => { try { return new URL(u).pathname; } catch { return ''; } };

      // لو التاب مفتوح فعلاً بالظبط على نفس الصفحة المطلوبة، ركّز عليه بس
      // من غير أي تنقّل (مفيش داعي).
      const exact = clientList.find((c) => 'focus' in c && pathOf(c.url) === pathOf(targetUrl));
      if (exact) { exact.focus(); return exact; }

      // 🛡️ (١٩ أغسطس ٢٠٢٦) لو فيه تاب مفتوح على لوحة الأدمن (/admin/*) —
      // معندناش حق نتنقّل بيه لصفحة تانية من تحته. محمد كان بيشتغل على
      // /admin وإشعارات بتوصله كتير (زي "تقرير الساعتين" كل ٢ ساعة، أو ردود
      // المارد)، ولو دوس على واحد منها بغير قصد كان بيلاقي صفحته اتحوّلت
      // لصفحة تانية من غير ما يقصد. الحل: التاب الأدمن يفضل زي ما هو (بس
      // نركّز عليه)، والهدف يتفتح في تاب جديد لو حابب فعلاً يشوفه.
      const onAdmin = clientList.find((c) => 'focus' in c && pathOf(c.url).startsWith('/admin'));
      if (onAdmin) {
        onAdmin.focus();
        if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
        return onAdmin;
      }

      // مفيش تاب أدمن مفتوح — السلوك القديم زي ما هو: ركّز التاب الأول ونقّله.
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client && client.url !== targetUrl) {
            return client.navigate(targetUrl);
          }
          return client;
        }
      }
      // Otherwise open a new window.
      // شات مضمونة مثبّت بنطاق /chat، فأي هدف بره النطاق (زي /team?room=..)
      // لو فتحناه مباشرة هيطلع في براوزر مش جوه التطبيق. نمرّره على
      // /chat/go?to=... اللي جوه النطاق وهو يحوّل client-side. (30 يوليو 2026)
      if (self.clients.openWindow) {
        const inChatScope = targetUrl.startsWith('/chat');
        const url = inChatScope
          ? targetUrl
          : '/chat/go?to=' + encodeURIComponent(targetUrl);
        return self.clients.openWindow(url);
      }
    })
  );
});

// Handle subscription change (when subscription expires/refreshes)
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe({
        userVisibleOnly: true,
        applicationServerKey: event.oldSubscription?.options?.applicationServerKey,
      })
      .then((newSubscription) => {
        // Notify backend of the new subscription endpoint
        return fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: newSubscription.toJSON() }),
        });
      })
  );
});
