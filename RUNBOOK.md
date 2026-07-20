# رانبوك مضمونة

> آخر تحديث: ٢٠ يوليو ٢٠٢٦ — بعد الانتقال من WhatsApp Cloud API للمارد (Baileys)

---

## ١. المعمارية الحالية

```
                    ┌──────────────────────────┐
   واتساب  ────────▶│  خدمة المارد (Railway)   │
   01002229982      │  Baileys + WebSocket     │
   (شغال على         │  volume: /data           │
    الموبايل عادي)   └───────────┬──────────────┘
                                 │ webhook
                                 ▼
                    ┌──────────────────────────┐
                    │  Vercel — Next.js        │
                    │  /api/whatsapp/baileys   │
                    └───────────┬──────────────┘
                                │
                 ┌──────────────┼──────────────┐
                 ▼              ▼              ▼
            Supabase      Claude API      Groq Whisper
          (المحادثات)     (الردود)        (تفريغ الصوت)
```

### الخدمات والروابط

| الخدمة | الرابط | الغرض |
|---|---|---|
| الموقع | madmonacairo.com (Vercel `project-ew64j`) | التطبيق |
| خدمة المارد | `madmona-app-production.up.railway.app` | اتصال واتساب |
| Supabase | `mjhflxpxunwycbiquoig` | الداتابيز |
| الريبو | `Madmonah/madmona-app` (branch `main`) | الكود |

### متغيرات البيئة الأساسية

**Railway** (خدمة المارد):
```
APP_WEBHOOK_URL = https://www.madmonacairo.com/api/whatsapp/baileys
SHARED_SECRET   = (سر مشترك مع Vercel)
AUTH_DIR        = /data/auth
GROUP_MODE      = all | mentioned | off
```

**Vercel**:
```
WA_SERVICE_URL    = رابط Railway
WA_SERVICE_SECRET = نفس SHARED_SECRET
GROQ_API_KEY      = تفريغ الصوت
ANTHROPIC_API_KEY = ردود Claude
```

---

## ٢. التشغيل اليومي

### فحص سريع للصحة

```bash
# المارد متصل؟
curl https://madmona-app-production.up.railway.app/health
# المتوقع: {"ok":true,"connected":true,"me":"201002229982:...@s.whatsapp.net"}

# الويبهوك شغال؟
curl https://www.madmonacairo.com/api/whatsapp/baileys
# المتوقع: {"ok":true,"service":"madmona baileys webhook"}
```

### اختبار رد كامل من الآخر للآخر

```bash
TS=$(date +%s)
curl -X POST https://www.madmonacairo.com/api/whatsapp/baileys \
 -H "content-type: application/json" \
 -H "x-madmona-secret: $WA_SERVICE_SECRET" \
 -d "{\"from\":\"201002229982\",\"message_id\":\"T-$TS\",\"timestamp\":$TS,\"type\":\"text\",\"text\":\"اختبار\"}"
# المتوقع: {"ok":true,"logged":true,"replied":true,...}
```

---

## ٣. أعطال شائعة وحلولها

| العرض | السبب الأرجح | الحل |
|---|---|---|
| `connected: false` في /health | الجلسة اتفصلت | افتح `/qr` وامسح من الأجهزة المرتبطة |
| المارد بيستقبل مايردش | الويبهوك بيرمي 500 | شوف لوج Vercel — غالبًا توقيع دالة اتغيّر |
| مسار `/api/...` بيرجع 404 والباقي شغال | `.vercelignore` | راجع الأنماط — لازم تكون `/NAME` مش `NAME` |
| الصوت مش بيتفهم | `GROQ_API_KEY` ناقص | ضيفه في Vercel |
| الجلسة بتضيع كل deploy | الـ volume مش متظبط | Railway → Volume mount على `/data` |

### إعادة ربط المارد

1. Railway → الخدمة → `/qr`
2. الموبايل: واتساب ← الإعدادات ← الأجهزة المرتبطة ← ربط جهاز
3. تأكيد: `/health` يرجع `connected: true`

⚠️ **لو عملت تسجيل خروج من الموبايل:** لازم تمسح `/data/auth` من Railway وتعيد التشغيل قبل QR جديد.

---

## ٤. قواعد أمان الرقم

الرقم اتعاد تسجيله **١٩ يوليو ٢٠٢٦** — يعني "رقم جديد" من ناحية واتساب.

| | أول أسبوعين | بعد الاستقرار |
|---|---|---|
| رسايل يوميًا | ١٥-٣٠ | ١٠٠-٢٠٠ |
| الفاصل بين رسالة وأخرى | ٦٠-١٨٠ ثانية | ٤٥-١٢٠ ثانية |
| التوقيت | ١٠ص - ٨م | نفسه |

**ممنوع:** إرسال جماعي بفواصل ثواني · رسايل متطابقة · إرسال لأرقام ماكلمتناش.
**عند أي تحذير من واتساب:** وقف كل إرسال فورًا.

---

## ٥. الوضع الحالي — إيه شغال وإيه لأ

### ✅ شغال ومتأكد منه (متختبر ٢٠ يوليو)

- استقبال الرسايل (فردي + جروبات)
- الرد الذكي بـ Claude — متختبر end-to-end
- تسجيل المحادثات في Supabase
- تفريغ الصوت (Groq Whisper، عربي)
- إرسال نص / صوت / ميديا
- تأكيد كود دخول `MADxxxxx`

### ⚠️ محتاج اختبار حقيقي

- الصور والـ PDF — الكود متكتب وبيبني، بس ماجربتش صورة فعلية
- الرد في الجروبات — `GROUP_MODE=all` متفعّل ومااتجربش

### ❌ متعطّل — يحتاج قرار

كل ده كان بيعتمد على **WhatsApp Cloud API** اللي الرقم اتشال منه يوم ٢٠ يوليو:

| المكوّن | النوع | الأثر |
|---|---|---|
| `whatsapp-bulk-template` | Edge Function | الإرسال الجماعي واقف |
| `admin-whatsapp-bot` | Edge Function | بوت الأدمن واقف |
| `madmona-otp` / `owner-wa-otp` | Edge Function | OTP بالواتساب واقف |
| `whatsapp-send-real` / `-draft` / `-test-send` | Edge Function | الإرسال اليدوي واقف |
| `whatsapp-webhook` | Edge Function | استقبال قديم — مكرر مع المارد |
| `wa-outreach-util` | Edge Function | أدوات التواصل واقفة |
| `whatsapp-signup-bot` | Edge Function | بوت التسجيل واقف |
| `admin/wa-review/send` | API route | مراجعة الرسايل واقفة |
| صفحة `whatsapp-campaigns` | صفحة أدمن | أزرارها مش هتشتغل |

**القرار المطلوب:** تتحوّل للمارد، ولا تتشال؟

### 📊 أحجام الداتا (٢٠ يوليو)

```
whatsapp_messages          10,001+
whatsapp_conversations      2,173
listings                      344
profiles                      249
suppliers                     159
wa_login_tokens                99
wa_inbound_verifications       11
whatsapp_campaign_messages      0   ← فاضي
```

---

## ٦. أعطال اتصلحت (للتاريخ)

**`.vercelignore` كان بيحجب `/api/whatsapp/*`** — سطر `WHATSAPP` (المقصود بيه فولدر التوثيق) كان بيطابق `src/app/api/whatsapp/` كمان. الويبهوك كان **404 لشهور**، وده السبب الحقيقي إن الردود التلقائية مكانتش بتشتغل. اتصلح بـ `/WHATSAPP`.

**تأكيد كود الدخول مكانش متكتب أصلاً** — الفلو كان: العميل ياخد كود ويبعته للمارد، والويبهوك يأكّده. الجزء الأخير مكانش موجود في أي ملف. اتكتب في `api/whatsapp/baileys`.

**`next@14.2.34`** — ثغرة CVE-2025-67779 (خطورة عالية). اترقّى لـ 14.2.35.

**توقيعات دوال غلط في ويبهوك المارد** — اتكتب بالتخمين فكان بيرمي 500. اتصلح بعد قراءة `lib/whatsapp.ts` و `lib/anthropic.ts`.

---

## ٧. حدود تقنية مهمة

1. **الرقم إما واتساب عادي أو Cloud API** — مستحيل الاتنين. لو عايز الاتنين → رقمين.
2. **`callClaude` بتاخد نص واحد بس** (`{systemPrompt, userMessage}`) — الصور والـ PDF محتاجة نداء `anthropic.messages.create` مباشر.
3. **Claude مابيسمعش صوت** — التفريغ لازم مزود خارجي.
4. **Baileys محتاج بروسيس دايم** — Vercel serverless مايقدرش، عشان كده Railway.
5. **الجلسة على volume** — من غيره بتضيع كل deploy.

---

## ٨. اللي لسه محتاج شغل

- [ ] تحويل الإرسال الجماعي من Cloud API للمارد + توقيت عشوائي وسقوف
- [ ] دعم أرقام متعددة (جلسات متوازية) + إدارة في الأدمن
- [ ] تنضيف الـ Edge Functions الميتة (بعد قرار: تحويل ولا حذف)
- [ ] اختبار صورة و PDF حقيقيين
- [ ] وسيلة دفع على حساب ميتا (لو رجعنا للـ Cloud API يومًا ما)
- [ ] الرد على ١٩ محادثة مستنية من مايو-يوليو
