# reel-engine — محرّك رندر مضمونة الموحّد

محرّك واحد بيثبّت **مستوى التصميم** عبر البوستات (PNG) والريلز (MP4) بنفس الهوية
(الكريمي/الأخضر/الدهبي + خط Cairo + تشكيل عربي سليم عبر Pillow/raqm).
الأجنت بيطلّع نص بس، والمحرّك بيضمن الشكل.

## ليه مش @vercel/og؟
الـ `og/reel-scene` (Satori) **مبيشكّلش العربي صح** — عشان كده الريلز القديمة كانت بتتجنّب النص العربي.
المحرّك ده بيستخدم Pillow+raqm اللي بيعمل shaping+bidi صح. ده **worker منفصل** (زي capcut worker)
لإن Vercel edge مبيشغّلش Pillow/ffmpeg.

## التشغيل السريع (Windows)
دبل-كليك `setup-and-test.bat` — بيثبّت Pillow، ينزّل الخط، ويطلّع `test_reel.mp4`.

يدوياً:
```
pip install -r requirements.txt
python madmona_render.py --setup
python madmona_render.py reel sample_reel.json out.mp4
python madmona_render.py post sample_post.json out.png
```

## ربطه بالأجنت (reel_worker.py)
`reel_worker.py` بياخد صف `reel_scripts` ويحوّله لفيديو:
```
python reel_worker.py demo   row.json   out.mp4              # تجربة محلية من JSON الأجنت
python reel_worker.py render <reel_id>  out.mp4 --publish    # يجيب من Supabase ويرفع وينشر
```
- `--publish` يرفع لـ Storage bucket `reels` ويحدّث `video_url` + `status='rendered'`.
- محتاج `.env` (انسخه من `.env.example`) فيه `SUPABASE_URL` + `SUPABASE_SERVICE_KEY`.
- الـ adapter بيـ map من `hook` + `scenes[].text_overlay` + CTA، وبيشيل الإيموجي تلقائياً.

### كـ worker دائم
لفّ `render` في loop بيـ poll `reel_scripts` (status='drafted') كل دقيقة — نفس فكرة `capcut_reel_worker.py`.

## عقد الـ JSON
`{"format":"reel|post","scenes":[{ "template":..., "theme":"light|green|dark", "duration":secs, ... }]}`

| template | الحقول |
|----------|--------|
| hook | kicker, title, accent |
| statement | kicker, lines[], sub |
| text | kicker, text (لف تلقائي), sub |
| chips | kicker, items[[نص,green/gold/line]], sub |
| checklist | kicker, rows[] |
| steps | kicker, steps[[رقم,عنوان,شرح]] |
| cards | kicker, title, cards[[عنوان,شرح]] |
| cta | kicker, title, pill, lines[] |

## ملاحظات
- الإيموجي مش بتترندر (مفيش خط إيموجي) — الـ worker بيشيلها. لو عايز إيموجي ملوّنة، نضيف Noto Color Emoji.
- للموسيقى/اللقطات الحقيقية: ده مسار تاني (Cloudinary/Descript) — المحرّك ده تيبوغرافي.
