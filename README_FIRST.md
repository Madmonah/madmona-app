# 🟢 Madmona — One-Click Install

## كل اللي عليك تعمله

1. **فك ضغط الـ zip دا**
2. **ابعت المجلد كله** (`madmona-install`) لـ `C:\madmona-app\`
   - يعني المجلد لازم يقعد جنب `deploy.bat` بتاعك
3. **دوس مرتين على `INSTALL.bat`**

كده. خلاص.

---

## السكريبت هيعمل كل ده تلقائيًا:

- ✅ ينسخ كل الـ pages والـ API routes في المكان الصح
- ✅ يبدل كل `/supplier/register` بـ `/add-listing` في الـ Nav
- ✅ يحقن `<MadmonaListingClaimer />` في الـ root layout (يحل ربط الـ signup أوتوماتيك)
- ✅ يتأكد إن `.env.local` فيه الـ keys المطلوبة
- ✅ يشغل `deploy.bat` بتاعك

---

## بعد الـ deploy
افتح:
- `madmonacairo.com/add-listing`         → النموذج الجديد
- `madmonacairo.com/admin/listing-drafts` → لوحة المتابعة
- الـ tab الذهبي فوق الأخبار             → بقى يفتح النموذج

---

## لو حصلت مشكلة
السكريبت بيطبع كل خطوة. لو وقف على حاجة، ابعتلي الرسالة وأنا أصلحها.
