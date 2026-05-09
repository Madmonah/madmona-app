# 🔐 Vercel Environment Variables — Phase 1 Agents

> **مهم جداً:** الـ secrets دي لـ Madmona بس. متشاركهاش.
> ضيفها كلها في **Production** environment (مش Preview/Development).

---

## القيم اللي تحطها في Vercel

روح: https://vercel.com/dashboard → اختار `madmona-app` → Settings → Environment Variables

اضف الـ 4 دول:

### 1. ANTHROPIC_API_KEY
```
sk-ant-api03-XXXXXX  (لازم تجيبها بنفسك من https://console.anthropic.com/settings/keys)
```
> روح console.anthropic.com → Settings → API Keys → Create Key → اعمل واحد جديد اسمه "Madmona Agents"

### 2. AGENT_WEBHOOK_SECRET
```
e991ddebe1abef7c18c6f9888e7c65dd0d2f3518574b02593f2a710e4c0011c0
```
> ده اللي حطيته في Supabase بالفعل. لازم يبقى نفس القيمة بالظبط في Vercel.

### 3. CRON_SECRET
```
3e52b0392e5823f30e4656f2bf1856276883e8e5ee058c0071f1f7bb1ccf3553
```
> ده اللي Vercel Cron هيستخدمه عشان يصدق نفسه للـ API.

### 4. MADMONA_OWNER_EMAIL
```
madmonaspace@gmail.com
```
> غيره لو عايز التقارير توصل لإيميل تاني.

---

## الـ Variables اللي مفروض موجودة بالفعل
- ✅ `RESEND_API_KEY`
- ✅ `EMAIL_FROM`
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`

اتأكد منهم في Vercel → Settings → Environment Variables.

---

## ✅ Checklist بعد إضافة الـ Variables

- [ ] أضفت `ANTHROPIC_API_KEY` (من console.anthropic.com)
- [ ] أضفت `AGENT_WEBHOOK_SECRET` (نفس قيمة Supabase)
- [ ] أضفت `CRON_SECRET`
- [ ] أضفت `MADMONA_OWNER_EMAIL`
- [ ] تأكدت من وجود `RESEND_API_KEY`
- [ ] عملت Redeploy (Vercel → Deployments → آخر deployment → Redeploy)

---

## 🧪 الاختبار بعد الـ Deploy

### اختبر Content Marketing (يجيلك إيميل بوست جاهز)

افتح PowerShell واعمل:

```powershell
$secret = "e991ddebe1abef7c18c6f9888e7c65dd0d2f3518574b02593f2a710e4c0011c0"
Invoke-RestMethod -Uri "https://madmonacairo.com/api/agents/content-marketing" `
  -Method POST `
  -Headers @{ "Authorization" = "Bearer $secret" }
```

✅ المتوقع: response بـ `success: true` + إيميل في `MADMONA_OWNER_EMAIL` خلال 30-60 ثانية.

---

### اختبر Daily Report (يجيلك إيميل تقرير الأرقام)

```powershell
$secret = "e991ddebe1abef7c18c6f9888e7c65dd0d2f3518574b02593f2a710e4c0011c0"
Invoke-RestMethod -Uri "https://madmonacairo.com/api/agents/daily-report" `
  -Method POST `
  -Headers @{ "Authorization" = "Bearer $secret" }
```

✅ المتوقع: response + إيميل بكل أرقام النهارده.

---

### اختبر Sign-up Concierge (يبعت إيميل ترحيب لمؤجر جديد)

سجل supplier وهمي على madmonacairo.com → لازم يوصله إيميل ترحيب خلال دقيقة.

أو اختبره يدوياً بـ:

```powershell
$secret = "e991ddebe1abef7c18c6f9888e7c65dd0d2f3518574b02593f2a710e4c0011c0"
$body = @{
  type = "INSERT"
  table = "marketplace_suppliers"
  schema = "public"
  record = @{
    id = "7310f6ef-e474-4ef8-8b8a-388b5e1f5694"
    profile_id = "<profile_id_موجود>"
    business_name = "اختبار - تأجير كاميرات"
    business_name_en = "Test Camera Rentals"
    account_type = "business"
    kyc_status = "pending"
    created_at = "2026-05-07T12:00:00Z"
  }
  old_record = $null
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://madmonacairo.com/api/agents/signup-concierge" `
  -Method POST `
  -Headers @{ "Authorization" = "Bearer $secret"; "Content-Type" = "application/json" } `
  -Body $body
```

---

## 🔍 لو فيه مشكلة

**1. Build فشل:** 
- `cd C:\madmona-app && npm install && npm run build`
- لو الـ TypeScript errors، شوف `next.config.mjs` فيه `ignoreBuildErrors: true` (مفروض موجودة بالفعل)

**2. الإيميل مش بيوصل:**
- شوف Vercel Function Logs: Vercel Dashboard → Logs → فلتر على `/api/agents/`
- شوف `agent_runs` table في Supabase: 
  ```sql
  SELECT * FROM agent_runs ORDER BY started_at DESC LIMIT 10;
  ```

**3. Supabase trigger مش شغال:**
- اتأكد إن `pg_net` extension enabled (Supabase Dashboard → Database → Extensions)
- اتأكد إن `agent_webhook_secret` في `site_settings` قيمته مش `CHANGE_ME_AFTER_DEPLOY`

---

**خلاص. كله جاهز.** 🤝
