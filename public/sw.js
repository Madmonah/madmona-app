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

// Version: 7 (20 أغسطس 2026) — 🔴 إصلاح جذري: صفحات الدخول والمصادقة
// (/auth/*) كانت بتتخزّن في الكاش زي أي صفحة. النتيجة: بعد ما نزلنا إصلاح
// صفحة الدخول، محمد وأحمد سامي فضلوا شايفين **النسخة القديمة** من المتصفح،
// والنسخة القديمة بترفض الإيميل قبل ما تبعت أي طلب للسيرفر أصلًا (كانت
// مصمّمة لرقم تليفون بس). الدليل: سجل المصادقة مافيهوش **ولا محاولة واحدة**
// من عندهم رغم إنهم بيحاولوا — الصفحة المخزّنة كانت بتوقفهم عندها.
// الحل: /auth/* بقى **network-only** (ماينحفظش ولا يتقري من الكاش أبدًا)،
// وده كمان الصح أمنيًا — صفحات تسجيل الدخول مايصحش تتخزّن على الجهاز.
// ورفع رقم الكاش بيمسح كل القديم أوتوماتيك على كل الأجهزة عند أول فتح.
const CACHE_NAME = 'madmona-v7';

// مسارات ممنوع تخزينها نهائيًا (مصادقة/دخول)
const NEVER_CACHE = ['/auth/', '/admin-entry', '/clock/'];
const STATIC_ASSETS = [
  '/',
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
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
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
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/')))
    );
    return;
  }

  // 🛡️ (17 Jul 2026) v3 كان cache-first لكل حاجة same-origin — بعد كذا deploy
  // في نفس اليوم: HTML قديم من الكاش + chunks اتشالت من السيرفر = صور وصفحات
  // بايظة لمستخدمي الـPWA. v4: network-first لكل حاجة، والكاش fallback للأوفلاين بس.
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
