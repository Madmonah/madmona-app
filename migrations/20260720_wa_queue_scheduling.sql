-- طابور إرسال المارد: جدولة زمنية آمنة
-- إضافي بالكامل — مفيش حذف ولا تعديل على داتا موجودة

alter table public.whatsapp_campaign_messages
  add column if not exists scheduled_for timestamptz,
  add column if not exists channel text default 'marid',
  add column if not exists attempts int default 0;

-- فهرس لسحب الرسالة التالية المستحقة بسرعة
create index if not exists idx_wa_campaign_msgs_due
  on public.whatsapp_campaign_messages (status, scheduled_for)
  where status = 'queued';

comment on column public.whatsapp_campaign_messages.scheduled_for is
  'موعد الإرسال المخطط — بيتحسب بفواصل عشوائية لحماية الرقم';
comment on column public.whatsapp_campaign_messages.channel is
  'marid = Baileys | cloud_api = القديم (ميت)';
