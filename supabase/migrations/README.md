# Phase 0 — Universal Marketplace Layer (FIXED)

> ⚠️ **اقرأ كل اللي تحت قبل ما تشغّل أي حاجة.**

---

## 🔍 المشكلة اللي اتصلحت

النسخة الأولى وقعت في النص لأنها بتعمل types وtables أسماؤها متعارضة مع اللي عندك:

| العنصر اللي عندك | اللي كان متعارض في الـmigration | الحل |
|---|---|---|
| ENUM `booking_status` | ENUM `booking_status` بـvalues مختلفة | غيرته لـ `mp_booking_status` |
| ENUM `payment_status` | ENUM `payment_status` بـvalues مختلفة | غيرته لـ `mp_payment_status` |
| TABLE `bookings` | TABLE `bookings` (مختلف) | غيرته لـ `marketplace_bookings` |
| TABLE `suppliers` | TABLE `suppliers` (من iteration3) | غيرته لـ `marketplace_suppliers` |
| TABLE `payments` *(مش موجود عندك)* | — | غيرته preventively لـ `marketplace_payments` |

**كل اللي ما بيتعارضش (categories, attributes, listings, listing_photos, listing_values, pricing_rules, availability, reviews, favorites, profiles) أسماء كما هي.**

---

## 📁 الملفات

```
C:\madmona-app\supabase\migrations\
  20260430000000_cleanup_partial.sql        ← شغّل ده الأول (لو حاولت قبل كده)
  20260430000001_initial_schema.sql         ← الـschema المُصَلَح
  20260430000002_functions_and_triggers.sql ← triggers + functions
  20260430000003_rls_policies.sql           ← Row Level Security
  20260430000004_seed_data.sql              ← فئات + خصائص جاهزة
  README.md                                 ← الملف ده
```

---

## 🚀 خطوات التشغيل

### لو الـmigration الأولى وقعت قبل كده

شغّل الـ5 ملفات بالترتيب ده في Supabase SQL Editor:

1. `20260430000000_cleanup_partial.sql` — يمسح أي حاجة جزئية اتعملت
2. `20260430000001_initial_schema.sql` — الـ13 جدول
3. `20260430000002_functions_and_triggers.sql` — triggers
4. `20260430000003_rls_policies.sql` — RLS
5. `20260430000004_seed_data.sql` — البيانات

### لو ده أول مرة

ابدأ من الملف رقم 2 (تخطّى الـcleanup).

---

## ✅ تحقق من النجاح

في SQL Editor شغّل:

```sql
-- لازم تطلع 13 جدول جديدة
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'profiles', 'marketplace_suppliers', 'categories', 'attributes',
  'listings', 'listing_photos', 'listing_values', 'pricing_rules',
  'availability', 'marketplace_bookings', 'marketplace_payments',
  'reviews', 'favorites'
)
ORDER BY tablename;

-- لازم تطلع 5 root categories
SELECT name_ar, slug FROM categories WHERE parent_id IS NULL ORDER BY display_order;

-- ولازم تطلع 25 sub-category
SELECT COUNT(*) AS sub_categories FROM categories WHERE parent_id IS NOT NULL;
```

---

## 🔜 بعد ما يشتغل

1. **سجّل دخول مرة من الـapp** — ده هيخلق `auth.users` row + `profile` تلقائي
2. **اعمل نفسك ادمن:**
   ```sql
   UPDATE profiles SET role = 'admin' WHERE phone = '+201002229982';
   ```
3. **ولّد TypeScript types الجديدة:**
   ```bash
   cd C:\madmona-app
   npx supabase gen types typescript --project-id YOUR_ID > src\types\supabase-marketplace.ts
   ```
4. **قولي عشان نبدأ Phase 1** — صفحة Admin للفئات + Supplier registration

---

## ⚠️ ملاحظات مهمة

- **ملف الـcleanup آمن** — بيمسح بس حاجاتي. مش بيلمس الـsuppliers/spaces/bookings/users بتاعتك.
- **الـtrigger `handle_new_user`** بيـINSERT في الـ`profiles` الجديدة + الـ`users` القديمة (لو موجودة). كده الـapp القديم يفضل شغال.
- **الـapp الحالي يكمل شغل عادي** على `bookings`/`suppliers`/`space_units` القديمة. الـuniversal layer جنبهم.
