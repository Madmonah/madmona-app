# 📕 رَن‌بوك — مشاريع المطورين (بورصة مضمونة)

آخر تحديث: **١٣ يوليو ٢٠٢٦**

---

## ⛔ القاعدة الذهبية

> **المارد ميقولش «اتسجّل» غير لما يكون اتسجّل فعلاً في `property_market_items`.**

ده أخطر باج اتكشف. اقرا قسم «الحوادث» تحت.

---

## 🗺️ الخريطة — مين بيمسك إيه

| الجدول | بيمسك إيه | مين بيكتب فيه |
|---|---|---|
| `property_market_items` | **المشروع** (بورصة مضمونة) | المارد · الأدمن · `/my-projects` |
| `listings` | **وحدة مفردة** (الماركت) | المارد (instant-claim-builder) |
| `listings.project_id` 🔗 | **الربط بينهم** — أضيف ١٣ يوليو | إجباري لأي وحدة تخص مشروع |
| `madmona_accounts` | حساب المطوّر (دخول بالموبايل) | **trigger أوتوماتيك** |
| `madmona_sessions` | جلسة الدخول | `madmona_wa_login_confirm` |

**الربط بين المشروع وصاحبه:** `property_market_items.source_lead_phone` ← آخر ١٠ أرقام من موبايله.

---

## 🤖 الأتمتة الشغالة

### ١) مشروع جديد → حساب أوتوماتيك
```
trigger: trg_project_owner_account  (after insert on property_market_items)
```
أي مشروع بيتضاف ومعاه `source_lead_phone` → بيتعمل حساب في `madmona_accounts` تلقائياً.
مفيش إيميل ولا باسورد — **الدخول بالموبايل عن طريق واتساب**.

**اتأكد إنه شغال:**
```sql
select count(*) from property_market_items p
where p.source_lead_phone is not null and p.is_active
  and not exists (
    select 1 from madmona_accounts a
    where right(regexp_replace(a.phone_normalized,'\D','','g'),10)
        = right(regexp_replace(p.source_lead_phone,'\D','','g'),10)
  );
-- لازم = 0
```

### ٢) المطوّر بيدخل ويظبط مشروعه بنفسه
- **`/login`** → دخول بالموبايل (واتساب أو OTP)
- **`/my-projects`** → مشاريعه هو بس · يرفع صورة · يظبط السعر
- **الأمان:** `/api/my-projects` بيتحقق إن المشروع بتاعه قبل أي تعديل (مُختبر: محاولة تعديل مشروع غيره = 403)

### ٣) الأدمن بيشوف الميديا الناقصة
- **`/admin/projects-media`** → كل مشروع + الصور/الملفات اللي وصلت المارد من صاحبه + ربط بضغطة
- **الهدف:** منطلبش من مطوّر حاجة هو بعتهالنا قبل كده

---

## 🚨 الحوادث — إيه اللي حصل وإزاي اتصلح

### حادثة ARQA (١٣ يوليو) — **الأخطر**

**اللي حصل:** إسلام خيري (ARQA) بعت بيانات **كاملة** لـ٣ مشاريع على مدار يومين.
المارد رد عليه **٦ مرات** بـ«اتسجّل» و«الأبديت اتعمل» و«الملف اكتمل».

**الحقيقة:** ولا مشروع اتسجّل. الـ٣ كانوا **مش موجودين في البورصة خالص**.
المارد عمل `listings` (وحدات مفردة) وقال للراجل «المشروع اتسجّل».

**الضرر:** الراجل شايف وعد ومش شايف تنفيذ. طلب أكونت والمارد قاله «الفريق هيتواصل معاك».

**الإصلاح:**
- الـ٣ مشاريع اتدخّلوا كاملين (ANNEX 26 · RITZ New Zayed · I Business Park)
- `listings.project_id` اتضاف عشان الوحدة تبقى مربوطة بمشروعها
- trigger الحساب الأوتوماتيك

**⚠️ الدرس:** لو المارد قال «اتسجّل» لازم يكون فيه صف في `property_market_items`. **راجع الداتابيز مش رد المارد.**

### حادثة الرسايل الصوتية
الويبهوك كان بيرجّع 200 من غير `waitUntil` → الـisolate بيتقفل قبل ما التفريغ يخلص.
**النص والصور كانوا بيلحقوا (< ٢ ثانية)، الصوت لأ (٥–١٠ ثواني).**
النتيجة: **صفر رسالة صوتية** اتسجّلت من يوم ما المارد اشتغل.
**اتصلح:** `EdgeRuntime.waitUntil(work)` في `whatsapp-webhook/index.ts`.

### بروشور ضاع (RITZ)
`RITZ New Zayed Brochure.pdf` وصل الواتساب بس `metadata = {}` — **الملف متحفظش**.
غالباً عدّى حد الحجم (`DOC_MAX_BYTES = 45MB`).
**⚠️ لسه محتاج إصلاح:** لازم fallback يسجّل إن الملف فشل بدل ما يضيع بصمت.

### الرد الأعمى على الميديا
لو ربطت أي صورة وصلت من مطوّر بمشروعه **من غير ما تشوفها** هتحط:
- صور مواقع بناء (جراج تحت الإنشاء)
- لوجوهات
- ألواح شمسية
**القاعدة: شوف الصورة بعينك قبل ما تربطها كـ cover.**

---

## ✅ تشيك‌ليست — قبل ما تقول «تمام»

```sql
-- ١) مفيش مشروع ناقص صورة وإحنا معانا صورته
with m as (
  select right(regexp_replace(c.contact_phone,'\D','','g'),10) tail,
         count(*) filter (where msg.message_type='image'
                            and msg.metadata->>'image_url' is not null) imgs
  from whatsapp_messages msg
  join whatsapp_conversations c on c.id = msg.conversation_id
  where msg.direction='inbound' group by 1
)
select count(*) as fixable_now
from property_market_items p
left join m on m.tail = right(regexp_replace(coalesce(p.source_lead_phone,''),'\D','','g'),10)
where p.is_active and not p.embargoed
  and p.cover_url is null and coalesce(m.imgs,0) > 0;
-- لازم = 0

-- ٢) مفيش مطوّر من غير حساب
-- (الاستعلام فوق في قسم الأتمتة)

-- ٣) مفيش «السعر عند الطلب» على الموقع
-- fmtPrice في MarketExplorer.tsx بترجّع '' مش نص
```

---

## 🔒 قواعد ثابتة

1. **⛔ أبراج العلمين** — `embargoed = true`. ممنوع الإعلان عنه قبل اللونش الرسمي (تعليمات لويّ / HDP).
2. **العمولة** (`commission_pct`) — تظهر في `/admin/*` بس. صفحة البورصة **عمرها ما بتجيبها** من الداتابيز.
3. **الصورة هي البطل** — المشاريع اللي بصور بتظهر الأول، واللي من غير صورة بياخد بانر بهوية مضمونة.
4. **أي وحدة في `listings` تخص مشروع → لازم `project_id`**. من غيره بيحصل كونفليكت.

---

## 📊 الوضع الحالي (١٣ يوليو ٢٠٢٦)

- **١٠٧** مشروع live
- **٨٦** بسعر · **٢٧** بصورة · **٩** ببروشور
- **٧٤** حساب في `madmona_accounts`
- **٠** مشروع ناقص صورة وإحنا معانا صورته ✅
- **٠** مطوّر من غير حساب ✅
