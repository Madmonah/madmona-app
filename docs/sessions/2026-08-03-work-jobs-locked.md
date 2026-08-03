# إيقاف وقفل وظايف الـ work — ٣ أغسطس ٢٠٢٦

بأمر محمد. **٤١ وظيفة** في فئة `work` واقفة ومقفولة. مايتشغّلوش تاني إلا بأمر صريح.

## الوضع الحالي

| الفئة | شغال | واقف |
|---|---|---|
| `work` | **0** | **41 (مقفولين)** |
| `infra` | 8 | 2 |
| `monitor` | 5 | 0 |
| `system` | 5 | 0 |
| `listings` | 3 | 1 |
| `chat` | 2 | 0 |
| `intelligence` | 1 | 0 |
| `outreach` | 0 | 1 |

الواتساب بيوصّل عادي والمارد بيرد على العملاء — `process-whatsapp-outbound` و
`fire-whatsapp-outbound` لسه شغالين.

## إزاي القفل شغال

- `orchestrator_job_locks` — جدول فيه الوظايف المقفولة
- `trg_block_locked_job_enable` — ترايجر على `orchestrator_jobs` بيرمي استثناء لو
  حد حاول يرجّع `enabled` من false لـ true وهي مقفولة. بيمنع أي حد: أداة أدمن،
  سكربت، أو المارد نفسه.
- الـ dispatcher `marid_orchestrate` بيقرا `where managed and enabled` — فالوظايف
  الواقفة مش بتتنفذ أصلاً.

**اتأكدنا:** مفيش أي دالة في الداتابيز بترجّع `orchestrator_jobs.enabled` أوتوماتيك.
الحارس `marid_heartbeat_watchdog` بيلمس pg_cron بس (النبضة نفسها) — مش الوظايف.

## التشغيل (أمر صريح مطلوب)

```sql
-- وظيفة واحدة
select public.unlock_orchestrator_job('meeting-reminders');

-- فك القفل من غير تشغيل
select public.unlock_orchestrator_job('olx-scrape-d1', false);

-- الكل مرة واحدة
select public.unlock_orchestrator_job(job_key) from public.orchestrator_job_locks;
```

محاولة `update orchestrator_jobs set enabled = true` من غير فك القفل **هتفشل**
برسالة بتقول اسم الوظيفة والأمر الصح. (اتجرّب فعلاً على `olx-scrape-d1`.)

## آثار جانبية مقصودة

- **`meeting-reminders`** واقف → تذكيرات المواعيد مش بتتبعت للعملاء
- **`snapshot-daily-kpis`** واقف → `daily_kpis` مش هيتسجّل فيه صفوف جديدة
- `olx-scrape-d1..d5` واقفين → مفيش سحب إعلانات جديد
- `reels-autopublish` و `story-render-batch` واقفين → مفيش نشر تلقائي

## اتمسح في نفس الجلسة (من غير باك أب، بأمر محمد)

`flow_sentinel_runs` 405 · `fraud_alerts` 259 (منهم 235 كانوا `open`) ·
`admin_email_outbox` 31 (منهم 2 كانوا `pending`) · `wa_delivery_alert_log` 7 ·
`admin_alerts` 4 · `agent_alerts` 1
