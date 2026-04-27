# ✅ Deployment Checklist - مضمونة

## خطوة 1: GitHub Repository (5 دقائق)

### A) إنشاء Repository على GitHub:
1. **افتح** [github.com](https://github.com) في المتصفح
2. **سجل دخول** لحسابك أو اعمل حساب جديد
3. **اضغط** الزر الأخضر "New" أو "+" في الشريط العلوي
4. **املأ** المعلومات:
   - Repository name: `madmona-app`
   - Description: `Madmona coworking space booking app`
   - **اختار** Public أو Private (حسب رغبتك)
   - **ماتختارش** Initialize with README (عندنا ملف جاهز)
5. **اضغط** "Create repository"

### B) رفع الكود:
1. **افتح** Command Prompt (cmd) كـ Administrator
2. **اكتب** `cd C:\madmona-app`
3. **نفذ** الأوامر دي بالترتيب:

```cmd
git init
git add .
git commit -m "Initial commit: Madmona coworking app ready for production"
git remote add origin https://github.com/YOUR_USERNAME/madmona-app.git
git branch -M main
git push -u origin main
```

**⚠️ غير `YOUR_USERNAME` باسم المستخدم بتاعك على GitHub**

---

## خطوة 2: Vercel Deployment (5 دقائق)

### A) إعداد Vercel:
1. **افتح** [vercel.com](https://vercel.com)
2. **اضغط** "Sign Up" أو "Log In"
3. **اختار** "Continue with GitHub" واديله الإذن
4. **اضغط** "New Project" من Dashboard

### B) ربط المشروع:
1. **دور** على `madmona-app` في قائمة الـ repositories
2. **اضغط** "Import" جنب اسم المشروع
3. **في Configure Project**:
   - Framework Preset: Next.js (هيختارها تلقائي)
   - Build Command: `npm run build` (هيملأها تلقائي)
   - Output Directory: `.next` (هيملأها تلقائي)
4. **اضغط** "Deploy"

### C) انتظار النشر:
- Vercel هياخد 2-3 دقائق للنشر
- لما يخلص هتشوف "Congratulations!" 
- هتحصل على URL زي: `https://madmona-app-xxx.vercel.app`

---

## خطوة 3: Environment Variables (3 دقائق)

### في Vercel Dashboard:
1. **اضغط** على اسم المشروع `madmona-app`
2. **روح** لـ Settings > Environment Variables
3. **أضيف** المتغيرات دي واحد واحد:

| Name | Value | Environment |
|------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Production |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your-anon-key` | Production |
| `SUPABASE_SERVICE_ROLE_KEY` | `your-service-key` | Production |
| `SUPABASE_JWT_SECRET` | `your-jwt-secret` | Production |

4. **لكل متغير**: أكتب Name، أكتب Value، اختار Production، اضغط Add

---

## خطوة 4: Custom Domain (2 دقيقة)

### ربط madmonacairo.com:
1. **في Vercel Dashboard** > Settings > Domains  
2. **اكتب** `madmonacairo.com` في الحقل
3. **اضغط** "Add"
4. **اتبع** التعليمات لضبط DNS في Cloudflare:
   - Type: CNAME
   - Name: @  
   - Target: cname.vercel-dns.com
5. **انتظر** 5-10 دقائق للتفعيل

---

## ✅ التأكد من النجاح:

### اختبر الموقع:
1. **افتح** https://madmonacairo.com
2. **جرب** التسجيل برقم موبايل
3. **اعمل** حجز كامل للنهاية
4. **شوف** QR code في صفحة النجاح

### مراقبة الأداء:
- **Vercel Dashboard**: لمراقبة الزيارات والأداء
- **GitHub**: للتحديثات المستقبلية للكود
- **Supabase Dashboard**: لمراقبة البيانات والمستخدمين

---

## 🎉 النتيجة النهائية:

بعد اتباع الخطوات دي هتكون عندك:

- ✅ **الموقع شغال** على https://madmonacairo.com
- ✅ **البيانات محفوظة** في Supabase  
- ✅ **التطبيق جاهز** للاستخدام المباشر
- ✅ **النسخ احتياطي** على GitHub
- ✅ **مراقبة الأداء** عبر Vercel

**الموقع جاهز لاستقبال العملاء! 🚀**

---

## 📞 المساعدة:

**لو واجهت مشكلة في أي خطوة:**
- Screenshot المشكلة وابعتها
- تأكد من صحة GitHub username
- تأكد من إدخال Environment Variables بدقة
- تحقق من DNS settings في Cloudflare

**التوفيق! 🎊**
