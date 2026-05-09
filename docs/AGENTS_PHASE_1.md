# 🤖 Madmona Virtual Agents — Phase 1

> **3 Agents شغالة بلا توقف على البنية التحتية بتاعتك**

## 🎯 الـ Agents

| Agent | Trigger | الـ Output |
|-------|---------|----------|
| **Sign-up Concierge** | Webhook (supplier جديد يسجل) | إيميل ترحيب personalized |
| **Content Marketing** | Cron يومي 8 ص (6 UTC) | إيميل بـ بوست جاهز للنشر |
| **Daily Report** | Cron يومي 10 م (8 UTC) | إيميل بأرقام النهارده + تحليل |

---

## 🏗️ Architecture

```
┌─────────────────┐
│   Supabase DB   │
│ (مؤجر جديد)     │
└────────┬────────┘
         │ pg_net trigger
         ↓
┌──────────────────────────┐
│ Vercel API Routes         │
│ /api/agents/*             │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ Anthropic API             │
│ (Claude Sonnet 4.5)       │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ Resend                    │
│ (إيميل لمحمد/المؤجر)      │
└──────────────────────────┘

أيضاً:
┌──────────────────────────┐
│ Vercel Cron               │
│ 6 UTC + 20 UTC daily      │
└──────────┬───────────────┘
           ↓
   (نفس الـ API routes)
```

---

## 📁 الملفات

```
src/
├── lib/
│   ├── anthropic.ts                    ← SDK wrapper
│   ├── email.ts                        ← Resend (موجود)
│   ├── supabase.ts                     ← Admin client (موجود)
│   └── agent-prompts/
│       ├── signup-concierge.ts         ← System prompt
│       ├── content-marketing.ts        ← System prompt
│       └── daily-report.ts             ← System prompt
└── app/api/agents/
    ├── signup-concierge/route.ts       ← POST webhook
    ├── content-marketing/route.ts      ← GET cron + POST manual
    └── daily-report/route.ts           ← GET cron + POST manual

migrations/
└── 2026-05-agent-infrastructure.sql    ← outreach_log + agent_runs + trigger

vercel.json                              ← Crons added
package.json                             ← @anthropic-ai/sdk added
deploy-agents.bat                        ← One-click deploy
```

---

## 🚀 خطوات التنفيذ

### 1. شغّل الـ Deploy script
```cmd
cd C:\madmona-app
deploy-agents.bat
```

### 2. زوّد Environment Variables في Vercel
روح Vercel Dashboard → Settings → Environment Variables، وضيف:

| Variable | القيمة | من فين |
|---------|--------|--------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | https://console.anthropic.com/settings/keys |
| `AGENT_WEBHOOK_SECRET` | random string قوي | اعمله بـ `openssl rand -hex 32` |
| `CRON_SECRET` | random string قوي | اعمله بـ `openssl rand -hex 32` |
| `MADMONA_OWNER_EMAIL` | `madmonaspace@gmail.com` | الإيميل اللي هتوصلك التقارير |

> **مهم:** الـ `RESEND_API_KEY` و `EMAIL_FROM` و `NEXT_PUBLIC_SUPABASE_URL` و `SUPABASE_SERVICE_ROLE_KEY` مفروض موجودين بالفعل من قبل.

### 3. شغّل الـ SQL Migration

**الطريقة 1: من Supabase Dashboard**
1. افتح https://supabase.com/dashboard/project/mjhflxpxunwycbiquoig/sql/new
2. الصق محتوى `migrations/2026-05-agent-infrastructure.sql`
3. اضغط Run

**الطريقة 2: من الـ MCP** (هاعملها أنا لو طلبت)

### 4. حدّث الـ webhook secret في Supabase

بعد ما تحدد الـ `AGENT_WEBHOOK_SECRET` في Vercel، شغّل ده في Supabase SQL Editor:

```sql
UPDATE site_settings
SET value = 'نفس القيمة اللي حطيتها في Vercel'
WHERE key = 'agent_webhook_secret';
```

### 5. تجربة

**اختبر Content Marketing:**
```bash
curl -X POST https://madmonacairo.com/api/agents/content-marketing \
  -H "Authorization: Bearer YOUR_AGENT_WEBHOOK_SECRET"
```
لازم يوصلك إيميل في 30-60 ثانية.

**اختبر Daily Report:**
```bash
curl -X POST https://madmonacairo.com/api/agents/daily-report \
  -H "Authorization: Bearer YOUR_AGENT_WEBHOOK_SECRET"
```
لازم يوصلك إيميل بتقرير الأرقام.

**اختبر Sign-up Concierge:**
سجل supplier جديد على madmonacairo.com → لازم يوصله إيميل ترحيب.

---

## 💰 التكلفة الشهرية المتوقعة

| الـ Service | الـ Usage | التكلفة |
|------------|----------|--------|
| Anthropic API | ~3K tokens/يوم × 30 = 90K | ~$1-2 (~30-60 ج) |
| Resend | ~50 إيميل/شهر | 0 ج (الـ free tier 3000/شهر) |
| Vercel Cron | 2 crons | 0 ج (مجاني في Hobby) |
| Supabase pg_net | ~30 webhook calls/شهر | 0 ج |
| **المجموع** | | **~30-60 ج/شهر** |

---

## 🔍 Monitoring

**شوف runs الـ agents:**
```sql
SELECT
  agent_name,
  trigger_type,
  status,
  started_at,
  duration_ms,
  output_summary,
  error_message
FROM agent_runs
ORDER BY started_at DESC
LIMIT 50;
```

**شوف الإيميلات اللي اتبعتت:**
```sql
SELECT
  agent_name,
  channel,
  subject,
  status,
  sent_at,
  metadata
FROM outreach_log
WHERE agent_name IS NOT NULL
ORDER BY created_at DESC
LIMIT 50;
```

---

## ⚙️ Cron Schedules

| Agent | UTC | Cairo (UTC+2 winter / UTC+3 summer) |
|-------|-----|-----|
| Content Marketing | `0 6 * * *` | 8 ص (شتاء) / 9 ص (صيف) |
| Daily Report | `0 20 * * *` | 10 م (شتاء) / 11 م (صيف) |

> Vercel Cron بيشتغل بـ UTC. لو عايز تغير، عدل في `vercel.json`.

---

## 🚧 الـ Phase 2 (لما يخلص اختبار Phase 1)

- ✅ WhatsApp send عبر Twilio
- ✅ Onboarding Agent (للموردين العالقين)
- ✅ Listing Optimizer (تحسين descriptions)
- ✅ Lead Research Agent (بحث Google Maps)

---

**Built by Claude with Mohamed — Madmona 🤝**
