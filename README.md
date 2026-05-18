# SEO Fixes - May 18 2026

## اللي اتعمل
٣ ملفات اتعدلوا في الـ repo `madmona-app` لإصلاح ٦ مشاكل خطيرة في الـ SEO/metadata:

### 🔧 الإصلاحات

| المشكلة | الملف | الحل |
|---|---|---|
| 1. Instagram handle غلط (`madmona.space` بدل `madmona.cairo`) في ٣ أماكن | `layout.tsx` | ✅ اتصلح |
| 2. `sameAs` فيها Instagram بس - مفيش الـ ٦ منصات التانية | `layout.tsx` | ✅ كل الـ ٧ منصات اتضافت |
| 3. اللون `#2FA084` (ممنوع في palette STRICT v3) في الـ OG image | `opengraph-image.tsx` | ✅ اتشال، اتبدل بـ cream/white |
| 4. ساعات العمل في Schema 9-23 (مع إن مضمونة 24/7) | `layout.tsx` | ✅ اتعدلت لـ 00:00-23:59 |
| 5. Tagline قديم "Your Space, Guaranteed" / "مساحتك اللي بتخصك" | كل الـ ٣ ملفات | ✅ اتبدل بـ "احنا بتوع الإيجار" |
| 6. الـ identity ضيقة (coworking فقط)، مفيش `openGraph.images` | `layout.tsx` | ✅ توسعت لـ rental marketplace + image refs اتضافت |

### Bonus اتعمل
- `@type` غيّر من `CoworkingSpace` لـ `RentalAgency` (الأنسب)
- `slogan: 'احنا بتوع الإيجار'` اتضاف في businessJsonLd
- `foundingDate: '2019'` اتضاف
- `areaServed: Egypt` اتضاف
- Twitter site/creator اتضافوا `@madmonacairo`
- الـ keywords توسعت لـ ٢٥ keyword (شاليهات، عربيات، قاعات، إلخ)

---

## خطوات التطبيق

### الخيار ١ — استبدال الملفات مباشرة (الأبسط)
انسخ الـ ٣ ملفات اللي في `src/app/` من المجلد ده وحطهم محل الموجودين في:
- `C:\madmona-app\src\app\layout.tsx`
- `C:\madmona-app\src\app\opengraph-image.tsx`
- `C:\madmona-app\src\app\manifest.ts`

### الخيار ٢ — استخدام الـ patch
```bash
cd C:\madmona-app
git apply seo-metadata-fixes.patch
```

### بعد التطبيق
```bash
cd C:\madmona-app
git add src/app/layout.tsx src/app/opengraph-image.tsx src/app/manifest.ts
git commit -m "fix(seo): align metadata/OG/schema with brand palette v3"
git push origin main
```

ثم شغّل `DEPLOY.bat` عشان Vercel deploy.

---

## بعد الـ deploy - الـ verification

١. روح على https://www.opengraph.xyz/url/https%3A%2F%2Fwww.madmonacairo.com — هتشوف الـ OG image الجديدة بدون مشاكل.
٢. روح على https://search.google.com/test/rich-results — حط الـ URL، هتشوف الـ schema الجديد (Organization + RentalAgency + WebSite).
٣. روح على واتساب وابعت لينك madmonacairo.com لنفسك — هتشوف الـ preview الجديدة.

---

## اللي لسه ناقص (محتاج تدخلك)

1. **Google Search Console** — submit `madmonacairo.com` + sitemap (`https://madmonacairo.com/sitemap.xml`).
2. **Google Business Profile** — رجع `business.google.com`، تحقق إن الـ profile claimed/verified، وحدّث المحتوى من Brand Sheet.
3. **Instagram username** — قرار: تخليه `@madmona.cairo` (الحالي) ولا تجرب تاخد `@madmonacairo` (لو متاح).
4. **LinkedIn Company Page** — الحالي شخصي، لازم تتعمل page رسمية للشركة.
