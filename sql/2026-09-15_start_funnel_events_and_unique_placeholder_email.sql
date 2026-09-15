-- ١٥ سبتمبر ٢٠٢٦ — محمد: «عايز growth»
-- الحقيقة من site_events (٧ أيام): ١٩١ جلسة بشر · ١٧٤ جلسة من يوتيوب وصلت /start · صفر أحداث غير page_view على /start
-- = كنا عميان عن القمع. وأول ما القمع اتقاس كشف بج إنشاء الشركة (تحت).
-- (مطبّقة لايف عبر execute_sql في نفس اليوم — الملف نسخة للتوثيق وإعادة البناء)

-- ١) أحداث قمع /start — القيد كان بيرفض أي نوع جديد بصمت (supabase-js مابيرميش، والراوت كان بيرجّع ok:true)
alter table public.site_events drop constraint if exists site_events_event_type_check;
alter table public.site_events add constraint site_events_event_type_check check (event_type = any (array[
  'page_view','listing_view','search','cart_add','checkout_start','checkout_complete','phone_click','whatsapp_click',
  'signup_start','signup_complete','wizard_step_view','wizard_submit','booking_helper_shown','booking_helper_dismissed','phone_captured',
  'start_form_started','start_wa_requested','start_google_click','start_created','start_error']));
comment on constraint site_events_event_type_check on public.site_events is
  '١٥/٩/٢٠٢٦ — أحداث قمع /start اتضافت (محمد: «عايز growth»). أي event_type جديد في /api/events/track لازم يتضاف هنا كمان وإلا الإدخال بيترفض بصمت.';

-- ٢) self_create_business: إيميل placeholder فريد
-- admin_create_b2b_partner_unguarded بتعمل <اسم_الشركة>.placeholder@madmonacairo.com لما الإيميل فاضي، وsuppliers.contact_email UNIQUE
-- → تاني شركة بنفس الاسم من /start (الإيميل اختياري ومطوي دلوقتي) كانت بتقع بـ«duplicate key value violates unique constraint suppliers_contact_email_key».
CREATE OR REPLACE FUNCTION public.self_create_business(p_user uuid, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v jsonb; sid uuid; v_name text := trim(coalesce(p_payload->>'business_name','')); v_phone text; v_existing uuid; v_email text;
begin
  if p_user is null then return jsonb_build_object('ok', false, 'error', 'no_user'); end if;
  if length(v_name) < 2 then return jsonb_build_object('ok', false, 'error', 'اكتب اسم الشركة'); end if;
  select ms.id into v_existing from marketplace_suppliers ms where ms.profile_id = p_user limit 1;
  if v_existing is not null then return jsonb_build_object('ok', true, 'supplier_id', v_existing, 'existing', true); end if;
  select phone into v_phone from profiles where id = p_user;
  v_email := nullif(lower(trim(coalesce(p_payload->>'contact_email',''))), '');
  if v_email is null or position('@' in v_email) = 0 then
    v_email := 'biz-' || replace(p_user::text, '-', '') || '.placeholder@madmonacairo.com';
  end if;
  v := public.admin_create_b2b_partner_unguarded(p_payload || jsonb_build_object(
         'contract_status', 'active',
         'contact_email', v_email,
         'contact_phone', coalesce(nullif(p_payload->>'contact_phone',''), v_phone)));
  if coalesce((v->>'ok')::boolean, false) is not true then return v; end if;
  sid := (v->>'supplier_id')::uuid;
  update suppliers set auth_user_id = p_user, employee_seats = 2, has_erp_crm = true where id = sid;
  if exists (select 1 from marketplace_suppliers where id = sid) then
    update marketplace_suppliers set profile_id = p_user, business_name = v_name, kyc_status = 'approved', max_employees = 2 where id = sid;
  else
    insert into marketplace_suppliers (id, profile_id, business_name, kyc_status, max_employees) values (sid, p_user, v_name, 'approved', 2);
  end if;
  update profiles set role = 'supplier' where id = p_user and (role is null or role = 'customer');
  return v || jsonb_build_object('existing', false);
end $function$;

-- 🧪 الإثبات لايف (_start_e2e2.cjs، حسابين اختبار اتمسحوا): شركتين بنفس الاسم من غير إيميل → الاتنين اتعملوا،
-- وsite_events فيها: page_view → start_form_started → start_wa_requested → start_created لكل جلسة.
-- قراءة القمع:
--   select event_type, count(distinct session_id) from site_events
--    where page_url like '%/start%' and created_at > now()-interval '7 days' group by 1;
