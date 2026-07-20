# مراجعة قاعدة البيانات — مضمونة

> ٢٠ يوليو ٢٠٢٦ · **مفيش أي حذف اتعمل — ده تقرير للقراءة والقرار**

---

## الملخص

- **٣٣٣ جدول** في المجمل
- **١٤ جدول `_backup_*`** قديم
- **واحد منهم مستخدم في كود حي** ⚠️

---

## ١. جداول النسخ الاحتياطي

| الجدول | الصفوف | مستخدم في الكود؟ | القرار المقترح |
|---|---:|---|---|
| `_backup_noprice_listings_20260705` | **8,735** | ✅ **أيوه** — `marid-restaurant-agent` سطر ١٨٤ | ⛔ **ماتحذفوش** |
| `_backup_20260609_cold_leads` | 401 | ❌ | يتحذف بعد تصدير |
| `_backup_20260609_sales_leads` | 59 | ❌ | يتحذف بعد تصدير |
| `_backup_20260609_clinic_leads` | 44 | ❌ | يتحذف بعد تصدير |
| `_backup_20260609_restaurant_leads` | 38 | ❌ | يتحذف بعد تصدير |
| `_backup_agent_registry_20260705` | 9 | ❌ | يتحذف |
| `_backup_20260609_content_calendar` | — | ❌ | يتحذف |
| `_backup_20260609_reel_scripts` | — | ❌ | يتحذف |
| `_backup_20260609_social_pack_posts` | — | ❌ | يتحذف |
| `_backup_20260611_agent_registry_old` | — | ❌ | يتحذف |
| `_backup_20260615_tagamoa_login_accounts` | — | ❌ | يتحذف |
| `_backup_20260704_unclaimed_directory_flip` | — | ❌ | يتحذف |
| `_backup_20260705_platform_seeded_flip` | — | ❌ | يتحذف |
| `_backup_noprice_photos_20260705` | — | ❌ | يتحذف |

> 🚨 **`_backup_noprice_listings_20260705` مش نسخة احتياطية فعليًا** — هو مصدر بيانات شغال للوكيل.
> الاسم مضلل. **الأفضل يتعاد تسميته** لحاجة زي `directory_listings_archive`
> بدل ما حد يمسحه بالغلط في المستقبل.

---

## ٢. مكوّنات واتساب الميتة (Cloud API)

الرقم اتشال من Cloud API يوم ٢٠ يوليو، فكل ده وقف:

| المكوّن | البديل |
|---|---|
| `whatsapp-bulk-template` | ✅ اتبنى بديل: `/api/whatsapp/queue` |
| `madmona-otp` | ✅ اتحوّل لـ `/api/auth/otp` |
| `owner-wa-otp` | ✅ اتحوّل لـ `/api/auth/otp` |
| `whatsapp-webhook` | ✅ اتحوّل لـ `/api/whatsapp/baileys` |
| `admin-whatsapp-bot` | ⏳ لسه |
| `whatsapp-send-real` / `-draft` / `-test-send` | ⏳ لسه |
| `wa-outreach-util` | ⏳ لسه |
| `whatsapp-signup-bot` | ⏳ لسه |
| `admin/wa-review/send` | ⏳ لسه |
| صفحة `whatsapp-campaigns` | ⏳ لسه |

**التوصية:** ماتتحذفش دلوقتي. سيبها لحد ما البدائل تثبت إنها شغالة أسبوع على الأقل.

---

## ٣. جداول الواتساب الحية

```
whatsapp_messages           10,001+
whatsapp_conversations       2,173   (574 منهم ردوا علينا)
whatsapp_campaign_messages       0   ← الطابور الجديد
wa_login_tokens                 99
wa_inbound_verifications        11
cold_leads                   1,654
listings                       344
profiles                       249
suppliers                      159
```

---

## ٤. خطة التنضيف المقترحة (لسه مااتنفذتش)

**المرحلة ١ — إعادة تسمية (آمنة، مفيش فقد بيانات):**
```sql
alter table public._backup_noprice_listings_20260705
  rename to directory_listings_archive;
-- وبعدين تحديث السطر ١٨٤ في marid-restaurant-agent
```

**المرحلة ٢ — تصدير قبل الحذف:**
صدّر الـ ١٣ جدول الباقيين كـ CSV واحتفظ بيهم برّه الداتابيز.

**المرحلة ٣ — الحذف (بعد موافقة صريحة):**
```sql
drop table if exists public._backup_20260609_clinic_leads;
drop table if exists public._backup_20260609_cold_leads;
-- ... باقي الجداول
```

**المرحلة ٤ — بعد أسبوع من استقرار المارد:**
حذف الـ Edge Functions الميتة.

---

## ٥. الدرس

`_backup_noprice_listings_20260705` اسمه بيقول "نسخة احتياطية"، وفيه ٨٧٣٥ صف،
و**وكيل حي بيقرا منه**. لو اتمسح على أساس إنه نسخة قديمة، كان الوكيل هيقع بصمت.

**القاعدة:** ماتحذفش جدول لمجرد إن اسمه بيوحي إنه قديم. دوّر عليه في الكود الأول.
