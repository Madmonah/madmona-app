# 📩 فيتشر «استفسار» على إعلانات الماركت — مواصفات جاهزة للتنفيذ

> طلب المالك (2026-07-22): الإعلانات تفضل في الماركت، وزرار **«استفسار»** على الإعلان
> ينشئ جروب على شات مضمونة بين المستفسر وصاحب الإعلان، ويوصل لصاحب الإعلان **نوتيفيكيشن**؛
> ولو النوتيفيكيشن مش مفعّل، **المارد** يبعتله واتساب: «فيه استفسار على إعلانك، ادخل شات
> مضمونة للرد» + نشجّعه يفعّل النوتيفيكيشن (زرار تفعيل).

## الوضع الحالي (البنية اللي هنبني عليها — كلها موجودة)
- `POST /api/chat/dm` — بيلاقي/يعمل روم `direct` بين شخصين بالرقم. بيرجّع `no_account`
  لو الطرف التاني معندوش حساب. ← دي البريمِتف بتاعة إنشاء الجروب.
- `chat_rooms` (kind='direct') + `chat_room_members` — غرف الشات.
- `notification_queue` (recipient_id, type, title, body, url, data) → بيتفرّغ عبر
  `POST /api/push/process-queue` اللي بيبعت web-push من `push_subscriptions`. ← ده مسار
  النوتيفيكيشن للناس اللي عندهم حساب ومفعّلين البوش.
- `push_subscriptions` (profile_id, endpoint, p256dh, auth, deactivated_at).
- `marid_notifications` (kind, title, body, phone, ref_table, ref_id, seen) ← دي طابور
  المارد للواتساب. **مهم:** البوت دلوقتي بيعالج `hot_lead` و`daily_report` بس — أي kind
  جديد (`listing_inquiry`) محتاج **تعديل في كود البوت** (ريبو رايلواي المنفصل) علشان يتبعت.
- `project_inquiries` + `POST /api/projects/inquiry` — نفس الفكرة بس للمشاريع العقارية
  (نموذج مجرّب في الإنتاج، نقلّده).

## الخطة (3 أجزاء)

### 1) جدول `listing_inquiries` (migration)
```
id uuid pk default gen_random_uuid(), listing_id uuid not null refs listings,
listing_title text, inquirer_id uuid refs profiles, owner_profile_id uuid refs profiles null,
owner_phone text, room_id uuid refs chat_rooms null, channel text, -- 'in_app' | 'whatsapp'
status text default 'open', notified_via text[], created_at timestamptz default now()
```
RLS: خدمة service-role بس من الـAPI (زي project_inquiries).

### 2) `POST /api/listings/inquiry` (route جديد — additive)
- Auth: المستفسر لازم يكون مسجّل (علشان يبقى عضو في الروم).
- يجيب الإعلان + صاحبه: الأولوية لـ`listings.contact_phone` (ده رقم اللي نشر فعلاً)،
  بديل: `supplier.profile_id`.
- **لو الصاحب عنده حساب (profile):** يلاقي/يعمل روم direct (نفس منطق /api/chat/dm)،
  يـinsert في `notification_queue` (type='listing_inquiry', url=/team?room=<id>)، يرجّع
  `{ ok, roomId }`. الـprocess-queue بيبعت البوش تلقائي.
- **لو معندوش حساب:** يـinsert `listing_inquiries` (channel='whatsapp') + `marid_notifications`
  (kind='listing_inquiry', phone=owner_phone, ref_table='listings', ref_id=listing.id,
  body='فيه استفسار على إعلانك «..» — ادخل شات مضمونة للرد'). يرجّع `{ ok, pending:true }`.
  ← الجزء ده مايشتغلش لحد ما **كود البوت** يتعدّل يعالج kind='listing_inquiry'.

### 3) زرار «استفسار» في صفحة تفاصيل الإعلان (`marketplace/[slug]/page.tsx`)
- جنب زرار التواصل الحالي. onClick → POST /api/listings/inquiry.
- `roomId` → navigate `/team?room=<id>`. `pending` → توست «تم إرسال استفسارك، هنبلّغ صاحب الإعلان».
- لو مش مسجّل → يوجّهه للّوجين الأول.
- إضافة: بانر «فعّل الإشعارات» لصاحب الإعلان في /team + زرار تفعيل (subscribe push).

## اللي ينفع يتعمل من غير البوت (دلوقتي) مقابل اللي محتاج البوت
- ✅ **من غير بوت:** الزرار + الروم + بوش-نوتيفيكيشن **للملاك اللي عندهم حساب** (زي أبيكس).
- 🔴 **محتاج تعديل البوت:** المارد يبعت واتساب للملاك اللي **معندهمش حساب** (وده أغلب
  إعلانات مضمونة) — لازم كود بوت رايلواي يعالج `marid_notifications.kind='listing_inquiry'`.

## خطوة التنفيذ المقترحة للجلسة الجاية
1. migration `listing_inquiries`. 2. route `/api/listings/inquiry`. 3. زرار الاستفسار.
4. تعديل بوت رايلواي: قراءة `marid_notifications` kind='listing_inquiry' وإرسال الواتساب.
5. اختبار live: حساب مستفسر + إعلان لصاحب عنده حساب (روم+بوش)، وإعلان لصاحب من غير حساب (واتساب).

---

## ✅ تحديث 2026-07-22 (مساءً) — جزء مضمونة اتبنى ونزل

اتعمل واتنشر (commit على main):
1. **جدول `listing_inquiries`** — اتطبّق live (`sql/2026-07-22_listing_inquiries.sql`).
2. **`POST /api/listings/inquiry`** — جاهز: بيحدد صاحب الإعلان (contact_phone → بروفايل،
   وإلا بروفايل المورّد لو مش مضمونة داخلي). لو عنده حساب: يعمل/يلاقي روم direct + رسالة
   افتتاحية + `notification_queue` (بوش) + `listing_inquiries`. لو معندوش: `listing_inquiries`
   + `marid_notifications` (kind='listing_inquiry').
3. **زرار «استفسر عن الإعلان»** في صفحة تفاصيل الإعلان (للإعلانات غير الدليل/الديمو) —
   لو مش مسجّل يوجّه للّوجين؛ روم → `/team?room=<id>`؛ pending → توست تأكيد.

### 🔴 الباقي (البوت — رايلواي):
البوت لازم يقرا `marid_notifications` WHERE kind='listing_inquiry' AND seen=false،
يبعت الواتساب للـ`phone`:
> «فيه استفسار على إعلانك «{title}» على مضمونة. ادخل شات مضمونة للرد وفعّل الإشعارات.»
وبعدها UPDATE seen=true. (نفس نمط hot_lead/daily_report الموجود عند البوت.)
مسار الملاك اللي عندهم حساب (روم + بوش) شغّال دلوقتي من غير البوت.

### اختبار مقترح بعد الـdeploy:
- افتح إعلان أبيكس بحساب تاني → دوس «استفسر» → المفروض يفتح روم في /team + نوتيفيكيشن لصاحب أبيكس.
- افتح إعلان عقاري تحت مضمونة (رقم من غير حساب) → دوس «استفسر» → توست + صف في marid_notifications.
