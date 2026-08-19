// src/lib/platformAdminConst.ts
// =====================================================================
// 🔐 (١٩ أغسطس ٢٠٢٦) ثوابت بس — من غير أي import لـnode:crypto أو
// @supabase/supabase-js. السبب: middleware.ts بيشتغل على الـEdge runtime،
// ولو استورد PLATFORM_ADMIN_COOKIE من platformAdmin.ts (اللي فيها
// `import crypto from 'node:crypto'` لعمل scrypt) هيجيب الموديول كله معاه
// جوّه حزمة الـEdge — و`node:crypto` مش قابل للتجميع هناك، فالبيلد بيقع.
// الملف ده بيتعزل عمدًا عشان middleware.ts + adminGate.ts (اللي بيتحمّل
// جوّه middleware.ts) يقدروا ياخدوا اسم الكوكي من غير ما يجيبوا crypto معاهم.
// =====================================================================

export const PLATFORM_ADMIN_COOKIE = 'madmona_admin_v2'
export const PLATFORM_ADMIN_SESSION_DAYS = 30
