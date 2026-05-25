// src/lib/adminGate.ts
// =====================================================================
// قفل لوحة الإدارة (Owner-only Admin Gate)
// بنخزّن بصمة (SHA-256) للباسورد فقط — الباسورد نفسها مش موجودة في أي مكان.
// قيمة الجلسة (ADMIN_SESSION_VALUE) سيرفر فقط، مش بتوصل المتصفح إطلاقًا.
// =====================================================================

export const ADMIN_COOKIE = 'madmona_admin_session'

// بصمة الباسورد (SHA-256). لتغيير الباسورد: احسب hash جديد وحطه هنا.
export const ADMIN_PW_SHA256 = '4bd0842d45e2d1db5c38c84c72655c12e72ff2ddc44c0cea203ae2b4ccb37fa3'

// قيمة الكوكي بعد الدخول الناجح (مشتقّة بالهاش — مش الباسورد ولا بصمتها).
export const ADMIN_SESSION_VALUE = '222e1123c6475906012eb6bb01b859a727522df1deb2e890df469b36b0dab367'

// مدة الجلسة: 30 يوم
export const ADMIN_MAX_AGE = 60 * 60 * 24 * 30

// صفحة الدخول (لازم تكون بره /admin عشان ميحصلش loop)
export const ADMIN_ENTRY_PATH = '/admin-entry'
