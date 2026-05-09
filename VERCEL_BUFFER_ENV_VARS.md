# Vercel Environment Variables for Buffer Integration

## ⚠️ أمان: rotate الـ token الحالي

الـ token الـالي اتبعت في chat بقى مش آمن. بعد ما تخلص setup:
1. روح https://login.buffer.com/developers/apps
2. Revoke الـ token الـالي
3. Generate token جديد
4. حدّث `BUFFER_ACCESS_TOKEN` في Vercel

---

## الخطوات

### 1. افتح Vercel project settings

https://vercel.com/dashboard → اختار مشروع madmona-app → Settings → Environment Variables

### 2. أضف الـ 5 env vars التالية (Production + Preview + Development)

| Name | Value |
|------|-------|
| `BUFFER_ACCESS_TOKEN` | `sn9ouybBU6jBx7i5_j-lrDs47n4T7KSzOG9MlX2Rp_S` |
| `BUFFER_ORGANIZATION_ID` | `69fdaa0b62b7b2a67ceb40c6` |
| `BUFFER_INSTAGRAM_CHANNEL_ID` | `69fdaa9d5c4c051afa22bbad` |
| `BUFFER_FACEBOOK_PAGE_CHANNEL_ID` | `69fdaaca5c4c051afa22bc45` |
| `BUFFER_FACEBOOK_GROUP_CHANNEL_ID` | `69fdab9a5c4c051afa22bf1f` |

> ⚠️ خلي بالك: `BUFFER_ACCESS_TOKEN` يفضل تعمله **Sensitive** لما تضيفه (checkbox في Vercel).

### 3. اعمل Redeploy

بعد ما تضيف الـ env vars، Vercel **مش بيعيد deploy تلقائياً**. لازم تعمل:
- Deployments → آخر deploy → ⋯ menu → **Redeploy**

أو ببساطة push commit جديد، الـ DEPLOY_BUFFER_GRAPHQL.bat بيعمل ده.

### 4. اختبر الـ connection

افتح في الـ browser:
```
https://madmonacairo.com/api/admin/buffer-diagnostic?pw=<MADMONA_ADMIN_PW>
```

استبدل `<MADMONA_ADMIN_PW>` بالـ admin password الموجود في Vercel env vars.

#### الـ response المتوقع:
```json
{
  "ok": true,
  "account": {
    "email": "madmona@madmonacairo.com",
    "name": "madmona"
  },
  "organization": {
    "id": "69fdaa0b62b7b2a67ceb40c6",
    "name": "My Organization"
  },
  "channels": [
    { "id": "69fdaa9d5c4c051afa22bbad", "service": "instagram", "type": "business", "name": "madmona.cairo", "connected": true },
    { "id": "69fdaaca5c4c051afa22bc45", "service": "facebook", "type": "page", "name": "Madmona", "connected": true },
    { "id": "69fdab9a5c4c051afa22bf1f", "service": "facebook", "type": "group", "name": "Madmona - مضمونة", "connected": true }
  ],
  "env_check": {
    "BUFFER_ACCESS_TOKEN": true,
    "BUFFER_ORGANIZATION_ID": "set_correctly",
    "BUFFER_INSTAGRAM_CHANNEL_ID": true,
    "BUFFER_FACEBOOK_PAGE_CHANNEL_ID": true,
    "BUFFER_FACEBOOK_GROUP_CHANNEL_ID": true
  }
}
```

لو شفت `ok: true` وكل الـ env_check `true`، **كله جاهز**.

### 5. شغّل الـ buffer-publisher agent

من `/admin/ai-os` → اضغط "🚀 شغّله دلوقتي" بجانب `buffer-publisher`.

#### اللي هيحصل:
1. الـ agent بيشوف لو فيه drafted instagram_post في `content_calendar`
2. بيولّد صورة branded
3. بيبعت الـ post للـ 3 قنوات (IG + FB Page + FB Group)
4. Buffer بيحط الـ post في الـ queue ويـ auto-publish في الـ optimal time
5. الـ status في DB بيتغير من `drafted` لـ `scheduled`

---

## Troubleshooting

### لو الـ diagnostic رجّع `error: "Invalid token"`
- الـ token expired أو wrong → generate token جديد من Buffer dashboard

### لو رجّع `error: "OIDC tokens are not accepted"`
- ده يعني Vercel بيستخدم القديم cached. اعمل redeploy تاني.

### لو الـ agent رجّع `error: "Buffer rejected the post"`
- شوف الـ Vercel logs للـ تفاصيل
- أكثر سبب شائع: الصورة (`imageUrl`) مش accessible publicly
- ابن ثاني سبب: caption طول جداً (max 2200 char)
