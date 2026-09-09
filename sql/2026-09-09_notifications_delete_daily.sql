-- 🔔 (٩/٩/٢٠٢٦ — بليل) محمد: «عايز الإشعارات تتمسح وتتجدد يوم بيوم».
-- كانت بتتعلّم مقروءة بس مع توليد التاسكات (sql/2026-09-09_notifications_clear_with_tasks.sql)
-- — دلوقتي إشعارات الأيام اللي فاتت بتتمسح فعلًا من employee_notifications.
-- مطبّقة لايف (migration: notifications_delete_daily_with_tasks) + تنضيف يدوي مرة: ٥٬٠٦٦ صف اتمسحوا.
create or replace function public.generate_recurring_tasks(p_date date default current_date)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_dow int := extract(dow from p_date)::int; v_dom int := extract(day from p_date)::int;
        v_last int := extract(day from (date_trunc('month',p_date)+interval '1 month - 1 day'))::int;
        v_cnt int; v_cleared int;
begin
  delete from employee_notifications where (created_at at time zone 'Africa/Cairo')::date < p_date;
  get diagnostics v_cleared = row_count;
  insert into daily_tasks (employee_id, branch_id, task_date, title_ar, description, priority, due_time, task_kind, status, is_auto_generated)
  select t.employee_id, t.branch_id, p_date, t.title_ar, t.description, t.priority, t.due_time, t.task_kind, 'pending', true
    from recurring_task_templates t
   where t.is_active and coalesce(t.anchor_mode,'fixed') = 'fixed'
     and ( t.frequency='daily'
        or (t.frequency='weekly' and v_dow = any(t.weekdays))
        or (t.frequency='monthly' and t.day_of_month is not null and (t.day_of_month = v_dom or (t.day_of_month > v_last and v_dom = v_last))) )
     and not exists ( select 1 from daily_tasks d where d.employee_id=t.employee_id and d.task_date=p_date and d.title_ar=t.title_ar and d.is_auto_generated=true );
  get diagnostics v_cnt = row_count;
  update recurring_task_templates t set last_generated_date=p_date
   where t.is_active and coalesce(t.anchor_mode,'fixed')='fixed'
     and ( t.frequency='daily'
        or (t.frequency='weekly' and v_dow = any(t.weekdays))
        or (t.frequency='monthly' and t.day_of_month is not null and (t.day_of_month = v_dom or (t.day_of_month > v_last and v_dom = v_last))) );
  return jsonb_build_object('ok',true,'date',p_date,'tasks_created',v_cnt,'notifications_deleted',v_cleared);
end $function$;
