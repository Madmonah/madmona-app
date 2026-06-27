# إزاي الأجنتس تنشر تصميمات (بدل صورة المارد العارية)

## الفكرة
بدل ما `smart-image-picker` يحط صورة المارد العارية، الـ **post_worker** يرندر **تصميم بوست** لكل صف في `content_calendar`، يرفعه على Cloudinary، ويحط رابطه في `image_url` — وبعدها `metricool-publish` (الأجنت اللي شغّال) ينشره عادي على كل الشبكات.

## أهم نقطة: مفيش تعديل على الـ DB gate ولا أي edge function
الصور بتترفع تحت المسار **`madmona/mascots/designs/<id>`**. القاعدة (`trg_content_publish_gate`) و`smart-image-picker` الاتنين بيسمحوا بأي رابط فيه `madmona/mascots/` — فالتصميمات بتعدّي تلقائياً **من غير ما نلمس الحماية**.

## التشغيل
```
cd reel-engine
pip install -r requirements.txt
python post_worker.py setup          # ينزّل خط Cairo + صورة المارد
# جرّب تصميم محلي (من غير DB):
python post_worker.py demo row.json out.png
# الإنتاج: يرندر ويرفع ويحدّث content_calendar:
python post_worker.py run 10 --publish
```
`run` من غير `--publish` = dry-run (يرندر بس، ميرفعش ميحدّثش).

محتاج `.env` (انسخه من `.env.example`): `SUPABASE_URL` + `SUPABASE_SERVICE_KEY`.
كريدنشيالز Cloudinary بتتقري لوحدها من جدول `whatsapp_config`.

## السلسلة الكاملة (الـ cycle)
1. أنت تبعت موضوع على واتساب → الأجنت يكتب الصف في `content_calendar` (title/body/cta/category).
2. **`post_worker run --publish`** → يرندر تصميم → يرفع Cloudinary → يحط `image_url`.
3. **`metricool-publish`** (الكرون الموجود) → ينشر على IG/FB/X/Threads/LinkedIn/Google.

## الجدولة
شغّل `post_worker run --publish` على جدول (كل ساعة مثلاً) على نفس الجهاز/السيرفر اللي فيه بايثون
(زي ما الـ CapCut worker بيشتغل) — **قبل** ما `metricool-publish` يلف. أو على Render/Railway كـ cron job.

## التصميم
دلوقتي ستايل "عرض مضمونة" (أخضر سينمائي + المارد + عنوان + سعر اختياري + CTA).
لإضافة ستايلات تانية (ثقة/فئة/كريمي) — نزوّد دوال render في `post_worker.py`.
