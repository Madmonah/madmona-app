# 📧 التسويق بالإيميل — نشرة «قصة حقيقية من عالم البيزنس» (١٣/٩/٢٠٢٦)

محمد نصًا: «عايزك تسوق بالايميل برضو».

## الواقع قبل أي حاجة
- الإيميلات **الخارجية الحقيقية** المتاحة عندنا: **~٩٠** بس (١٣ من `suppliers.contact_email` + ~٨٠ من `profiles.email`).
  الباقي (٣٠٠+) عناوين داخلية بتتولد للحسابات (`<رقم>@madmonacairo.com` · `.local` · `lid`) — مش بشر.
- البنية موجودة من قبل: Resend (الدومين موثّق) + `customer_email_outbox` + كرون `/api/cron/email-outbox` كل ١٠ دقايق
  (٣ رسايل عميل لكل تِك = ~٤٣٠/يوم) — **مقفول** بـ`site_settings.email_outbox_cron_enabled` (لازم `'1'`).

## اللي اتبنى (١٣/٩)
| الجزء | المكان | الحالة |
|---|---|---|
| جدول القايمة + توكن إلغاء + استيراد الحقيقيين | `sql/2026-09-13_email_marketing.sql` | ⏸️ **مش مطبّق** — الحارس الآلي رفض تطبيق ميجريشن إرسال جماعي؛ محمد يطبّقها من SQL Editor أو يأمر صراحةً |
| جدول الحملات + `enqueue_email_campaign(key, test_email)` | نفس الملف | ⏸️ |
| إلغاء الاشتراك | `/api/email/unsubscribe?t=<token>` (`src/app/api/email/unsubscribe/route.ts`) | ✅ كود جاهز (بيشتغل بعد الميجريشن) |
| الاشتراك من الموقع | `/api/email/subscribe` + `src/components/NewsletterBox.tsx` | ✅ كود جاهز — **مش متركّب** في المدونة/`/pro` لحد ما الميجريشن تتطبّق |

## خطة الحملات
- **الإيقاع:** رسالة واحدة أسبوعيًا (الثلاثاء ١٠ ص) = قصة حقيقية + الدرس + مشهد مضمونة واحد + CTA `/start` بـ`utm_source=email&utm_medium=newsletter&utm_content=<key>`.
- **الحملة ١ `stories-1`:** «٤ شركات عملاقة… والدرس لبيزنسك» (بلوك باستر · كوداك · نوكيا · ليجو) بلينكات المقالين + الشورتس.
- **الحملة ٢ `stories-2`:** دومينوز (أول ما الصوت يتسجّل) · بعدها طلعت حرب (`stories-queue.md`).
- كل رسالة: اسم المُرسل «مضمونة Madmona» · `reply_to` support@ · فوتر بالعنوان + **لينك إلغاء اشتراك** إجباري · نسخة نص عادي.
- **اختبار قبل الكل:** `select enqueue_email_campaign('stories-1', 'moh91arabco@gmail.com')` ومحمد يشوفها الأول.

## القياس
- `customer_email_outbox` (category `marketing`) → sent/failed · `site_events` بـ`utm_source=email` · إلغاءات في `email_marketing_contacts.unsubscribed_at`.
- الهدف الحقيقي مش الـ٩٠ — **صندوق الاشتراك** تحت كل مقال وفي `/pro` هو اللي بيكبّر القايمة من زوار جوجل.
