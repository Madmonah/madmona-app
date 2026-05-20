# دليل النشر النهائي — Elite B2B Platform

## 1️⃣ نشر الـ Frontend (Vercel)
```cmd
cd C:\madmona-app
SETUP.bat
DEPLOY.bat
```
> ⚠️ ده بـ ينشر كل الصفحات الجديدة (23 admin module + owner portal + booking widget + waitlist).

---

## 2️⃣ نشر الـ Edge Functions (مرتين، كل واحدة لوحدها)

```cmd
cd C:\madmona-app

REM Birthday cron
npx supabase functions deploy customer-birthday-cron --project-ref mjhflxpxunwycbiquoig

REM Booking notifications cron (confirmations + reminders + review followup)
npx supabase functions deploy booking-notifications-cron --project-ref mjhflxpxunwycbiquoig
```

### الـ Secrets المطلوبة للـ Edge Functions:
```cmd
npx supabase secrets set WHATSAPP_ACCESS_TOKEN=<توكن_ميتا> --project-ref mjhflxpxunwycbiquoig
npx supabase secrets set WHATSAPP_PHONE_ID=1084433138092430 --project-ref mjhflxpxunwycbiquoig
npx supabase secrets set APP_BASE_URL=https://madmonacairo.com --project-ref mjhflxpxunwycbiquoig
```
> الـ SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY بـ يتحطوا تلقائياً.

---

## 3️⃣ جدولة الـ Crons (SQL في Supabase)

```sql
-- Birthday cron — يومياً 9 صباحاً
SELECT cron.schedule(
  'customer-birthday-cron', '0 9 * * *',
  $$ SELECT net.http_post(
    url := 'https://mjhflxpxunwycbiquoig.supabase.co/functions/v1/customer-birthday-cron',
    headers := jsonb_build_object('Authorization', 'Bearer <SERVICE_ROLE_KEY>', 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  ) $$
);

-- Booking notifications — كل 15 دقيقة
SELECT cron.schedule(
  'booking-notifications-cron', '*/15 * * * *',
  $$ SELECT net.http_post(
    url := 'https://mjhflxpxunwycbiquoig.supabase.co/functions/v1/booking-notifications-cron',
    headers := jsonb_build_object('Authorization', 'Bearer <SERVICE_ROLE_KEY>', 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  ) $$
);
```

---

## 4️⃣ قوالب WhatsApp (Meta Business Manager → Message Templates)

اعمل الـ 4 قوالب دي (Category: UTILITY، Language: Arabic):

### 📋 madmona_booking_confirm_v1
```
مرحباً {{1}}! ✅
تم تأكيد حجزك في {{5}}
الخدمة: {{2}}
التاريخ: {{3}}
الوقت: {{4}}
نتشرف بزيارتك! لأي تعديل تواصل معانا.
```
Body params: 1=الاسم، 2=الخدمة، 3=التاريخ، 4=الوقت، 5=اسم المكان

### 📋 madmona_booking_reminder_v1
```
تذكير ⏰ {{1}}
عندك حجز {{2}} في {{5}}
{{3}} الساعة {{4}}
مستنينك! 💚
```
Body params: نفس الترتيب فوق

### 📋 madmona_booking_followup_v1
```
{{1}} شكراً لزيارتك! 💚
نتمنى تكوني استمتعتي بـ {{2}}.
رأيك يهمنا — قيّمي تجربتك من هنا:
{{3}}
```
Body params: 1=الاسم، 2=الخدمة، 3=رابط التقييم

### 📋 madmona_birthday_v1
```
كل سنة وانتي طيبة {{1}}! 🎂🎉
{{2}} بتتمنالك سنة سعيدة.
وعندنا هدية مستنياكي — تعالي زورينا!
```
Body params: 1=الاسم، 2=اسم المكان

---

## 5️⃣ إنشاء حساب مالك Elite

**أ)** Supabase Dashboard → Authentication → Users → Add User
- إيميل المالك (مثلاً `ahmed@elite.com`) + Auto Confirm
- انسخ الـ User UID

**ب)** شغّل الـ SQL:
```sql
SELECT admin_link_owner_account(
  '<UID>'::uuid,
  '93eaa8cf-1def-4101-bca6-8fa33450cdce'::uuid,
  'احمد - مالك Elite',
  'ahmed@elite.com',
  'owner',
  NULL
);
```

**ج)** المالك يدخل `madmonacairo.com/owner/login`

---

## 6️⃣ روابط الحجز (شاركها لـ Elite)

| الفرع | رابط الحجز |
|---|---|
| مصر الجديدة (HQ) | madmonacairo.com/book/HQ |
| الجولف | madmonacairo.com/book/GOLF |
| التجمع | madmonacairo.com/book/TAGAMOA |
| المحجبات | madmonacairo.com/book/HIJAB |

حطها في: Instagram bio · WhatsApp Business · Google Maps · Facebook.

---

## ✅ Checklist
- [ ] DEPLOY.bat
- [ ] نشر 2 Edge Functions + secrets
- [ ] جدولة 2 crons
- [ ] 4 Meta templates approved
- [ ] حساب مالك Elite
- [ ] مشاركة روابط الحجز
