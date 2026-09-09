-- 🔔 (٩/٩/٢٠٢٦) محمد: «عايز النوتيفيكيشن تتشال كل يوم مع توليد التاسكات».
-- generate_recurring_tasks(p_date) بقت تبدأ بتعليم أي إشعار موظف من قبل اليوم
-- (بتوقيت القاهرة) ولسه مقروش كمقروء — مش مسح، الأثر محفوظ — وبترجّع
-- notifications_cleared في النتيجة. مطبّقة لايف ٩/٩/٢٠٢٦.
-- ⚠️ الجوب generate-recurring-tasks نفسه enabled=false من ٢٦/٨ (قفل فئة work) —
--    التنضيف مش هيتنفّذ يوميًا لحد ما محمد يأمر بفكّه:
--    select public.unlock_orchestrator_job('generate-recurring-tasks', true);
update employee_notifications set read_at = now()
 where read_at is null and (created_at at time zone 'Africa/Cairo')::date < current_date;
