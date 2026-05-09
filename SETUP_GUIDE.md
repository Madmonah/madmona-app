# 🚀 دليل الإعداد النهائي - مضمونة

## خطوات الإعداد السريع (30 دقيقة)

### المرحلة 1: إعداد Supabase Database (10 دقائق)

#### أ) إنشاء مشروع Supabase
1. روح على [app.supabase.com](https://app.supabase.com)
2. اعمل حساب جديد أو سجل دخول
3. اضغط "New Project"
4. اختار Organization أو اعمل واحد جديد
5. املأ البيانات:
   - **Project Name**: `madmona-coworking`
   - **Database Password**: (اختار password قوي واحفظه)
   - **Region**: `Southeast Asia (Singapore)` (الأقرب لمصر)
6. اضغط "Create new project"
7. استنى 2-3 دقائق للإعداد

#### ب) رفع Database Schema
1. لما المشروع يخلص إعداد، روح على **SQL Editor** من الشريط الجانبي
2. اضغط "New query"
3. انسخ كل محتوى ملف `supabase_schema.sql` 
4. ألصقه في الـ SQL Editor
5. اضغط **Run** (F5)
6. لازم تشوف رسالة: "مضمونة Database Setup Complete! 🎉"

#### ج) إعداد Authentication
1. روح على **Authentication** > **Settings** > **Auth Providers**
2. فعّل **Phone** provider:
   - شغّل "Enable phone confirmations"
   - في **SMS Provider**, اختار **Twilio** (أو سيبه افتراضي للتطوير)
3. في **Auth Settings**:
   - شغّل "Enable phone confirmations"
   - غيّر **Site URL** لـ: `https://madmonacairo.com`
   - أضيف **Redirect URLs**: `https://madmonacairo.com/auth/callback`

#### د) أخذ الـ API Keys
1. روح على **Settings** > **API**
2. انسخ:
   - **Project URL** (بتاع supabase.co)
   - **anon/public key**
   - **service_role key** (secret key)
3. روح على **Settings** > **Auth** > **JWT Settings**
4. انسخ **JWT Secret**

---

### المرحلة 2: إعداد Next.js App (10 دقائق)

#### أ) تحضير الملفات
1. الملفات موجودة في C:\madmona-app
2. افتح Command Prompt في المجلد
3. انسخ ملف البيئة:
   ```bash
   copy .env.local.template .env.local
   ```

#### ب) إعداد Environment Variables
1. افتح .env.local في أي محرر نصوص
2. استبدل القيم بتاعت Supabase:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   SUPABASE_JWT_SECRET=your-jwt-secret-here
   ```

#### ج) تثبيت وتشغيل
```bash
# تثبيت المكتبات
npm install

# تشغيل التطوير
npm run dev
```

#### د) اختبار الاتصال
1. افتح http://localhost:3000
2. جرب التسجيل برقم موبايل مصري
3. شوف لو البيانات بتحفظ في Supabase

---

### المرحلة 3: النشر على Vercel (10 دقائق)

#### أ) رفع الكود لـ GitHub
1. اعمل repository جديد على GitHub باسم madmona-app
2. في Command Prompt:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Madmona coworking app"
   git remote add origin https://github.com/your-username/madmona-app.git
   git push -u origin main
   ```

#### ب) ربط Vercel
1. روح على vercel.com
2. سجل دخول بـ GitHub
3. اضغط "New Project"
4. اختار madmona-app repository
5. اضغط "Deploy"

#### ج) إضافة Environment Variables
1. في Vercel Dashboard، روح على Settings > Environment Variables
2. أضيف المتغيرات من .env.local
3. اضغط "Save"

#### د) ربط الدومين
1. في Vercel، روح على Settings > Domains
2. أضيف madmonacairo.com
3. اتبع تعليمات ربط الـ DNS

---

## ✅ التحقق من الإعداد

### اختبار شامل للتطبيق:

1. **تسجيل حساب جديد**:
   - روح على الموقع
   - اضغط تسجيل دخول
   - ادخل رقم موبايل مصري
   - تأكد من وصول OTP

2. **عمل حجز كامل**:
   - اختار مساحة
   - اختار تاريخ ووقت
   - أكمل الحجز
   - شوف QR code في صفحة النجاح

3. **مراجعة البيانات**:
   - شوف الحجز في Supabase Database > bookings
   - تأكد من توليد كود الحجز (MAD-XXXX-XXX)

---

**التطبيق جاهز للاستخدام المباشر! 🚀**

**الملفات الأساسية:**
- SETUP_GUIDE.md: هذا الملف
- supabase_schema.sql: Database schema كاملة
- .env.local.template: متغيرات البيئة
- PROJECT_COMPLETION.md: ملخص كامل للمشروع
