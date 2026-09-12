-- 🚚 (١٢/٩/٢٠٢٦) موديول «النقل والشحن» — محمد: «هل بند المواصلات وأوامر تشغيل السيارات والشحن معمول حسابه في الموديل؟»
-- الجواب كان لا → الموديول ده لكل الأنشطة (core):
--   bz_vehicles        سيارات الشركة (لوحة · نوع · سائق · رخصة · تأمين · عدّاد)
--   bz_vehicle_orders  أوامر تشغيل السيارات (مأمورية بعربية: من/إلى · سائق · كم بداية/نهاية · بنزين · بدل · تكلفة أخرى)
--                      لما الأمر يبقى done ومجموع التكلفة > ٠ → مصروف في branch_expenses فئة transportation (مرة واحدة — expense_id)
--   bz_shipments       شحنات للعملاء (بعربية الشركة أو طيار مضمونة أو شركة شحن خارجية + رقم بوليصة) مربوطة اختياريًا بأوردر
-- الحارس: schedule_access_ok / schedule_edit_ok (البابين: جلسة Supabase أو توكن الواتساب) — نفس قاعدة ٥/٩.
-- ⛔ مفيش أرقام/تعريفات مخترعة — كل التكاليف من إدخال صاحب البيزنس.

create table if not exists public.bz_vehicles (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  name text not null,
  plate text,
  vehicle_type text not null default 'car' check (vehicle_type in ('car','van','truck','motorcycle','other')),
  driver_employee_id uuid references public.business_employees(id) on delete set null,
  license_expiry date,
  insurance_expiry date,
  odometer_km numeric(12,1) default 0,
  status text not null default 'active' check (status in ('active','maintenance','inactive')),
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists bz_vehicles_supplier_idx on public.bz_vehicles(supplier_id);

create table if not exists public.bz_vehicle_orders (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  vehicle_id uuid references public.bz_vehicles(id) on delete set null,
  driver_employee_id uuid references public.business_employees(id) on delete set null,
  purpose text not null default 'transport' check (purpose in ('delivery','transport','errand','site','other')),
  from_location text,
  to_location text,
  project_id uuid,
  order_id uuid,
  scheduled_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  km_start numeric(12,1),
  km_end numeric(12,1),
  fuel_cost numeric(12,2) default 0,
  allowance_amount numeric(12,2) default 0,
  other_cost numeric(12,2) default 0,
  status text not null default 'planned' check (status in ('planned','running','done','cancelled')),
  expense_id uuid,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists bz_vehicle_orders_supplier_idx on public.bz_vehicle_orders(supplier_id, created_at desc);

create table if not exists public.bz_shipments (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  order_id uuid,
  customer_name text,
  customer_phone text,
  address text,
  city text,
  carrier_type text not null default 'own_vehicle' check (carrier_type in ('own_vehicle','madmona_rider','external')),
  vehicle_order_id uuid references public.bz_vehicle_orders(id) on delete set null,
  carrier_name text,
  tracking_no text,
  cost numeric(12,2) default 0,
  charged_to_customer numeric(12,2) default 0,
  status text not null default 'pending' check (status in ('pending','shipped','delivered','returned','cancelled')),
  expense_id uuid,
  shipped_at timestamptz,
  delivered_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists bz_shipments_supplier_idx on public.bz_shipments(supplier_id, created_at desc);

alter table public.bz_vehicles enable row level security;
alter table public.bz_vehicle_orders enable row level security;
alter table public.bz_shipments enable row level security;
revoke all on public.bz_vehicles, public.bz_vehicle_orders, public.bz_shipments from anon, authenticated;

-- ── قراءة ─────────────────────────────────────────────────────────────────
create or replace function public.business_transport_bundle(p_supplier_id uuid, p_token uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.schedule_access_ok(p_supplier_id, p_token) then return jsonb_build_object('ok', false, 'error', 'مالكش صلاحية'); end if;
  return jsonb_build_object(
    'ok', true,
    'business', (select jsonb_build_object('business_name', s.business_name, 'currency', coalesce(s.currency,'EGP')) from suppliers s where s.id = p_supplier_id),
    'employees', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'name', e.full_name) order by e.full_name) from business_employees e where e.supplier_id = p_supplier_id and e.status = 'active'), '[]'::jsonb),
    'vehicles', coalesce((select jsonb_agg(to_jsonb(v) || jsonb_build_object('driver_name', (select full_name from business_employees where id = v.driver_employee_id)) order by v.created_at desc) from bz_vehicles v where v.supplier_id = p_supplier_id), '[]'::jsonb),
    'orders', coalesce((select jsonb_agg(to_jsonb(o) || jsonb_build_object(
        'vehicle_name', (select name from bz_vehicles where id = o.vehicle_id),
        'driver_name', (select full_name from business_employees where id = o.driver_employee_id),
        'total_cost', coalesce(o.fuel_cost,0) + coalesce(o.allowance_amount,0) + coalesce(o.other_cost,0),
        'km', case when o.km_end is not null and o.km_start is not null then o.km_end - o.km_start end
      ) order by coalesce(o.scheduled_at, o.created_at) desc) from (select * from bz_vehicle_orders where supplier_id = p_supplier_id order by created_at desc limit 200) o), '[]'::jsonb),
    'shipments', coalesce((select jsonb_agg(to_jsonb(sh) order by sh.created_at desc) from (select * from bz_shipments where supplier_id = p_supplier_id order by created_at desc limit 200) sh), '[]'::jsonb),
    'open_orders', coalesce((select jsonb_agg(jsonb_build_object('id', mo.id, 'label', coalesce(mo.delivery_address,'') || ' · ' || coalesce(mo.delivery_city,'') || ' · ' || coalesce(mo.delivery_phone,''), 'address', mo.delivery_address, 'city', mo.delivery_city, 'phone', mo.delivery_phone) order by mo.created_at desc)
        from (select * from marketplace_orders where supplier_id = p_supplier_id and status::text not in ('delivered','cancelled','completed','refunded') order by created_at desc limit 30) mo), '[]'::jsonb),
    'month_cost', coalesce((select sum(coalesce(fuel_cost,0)+coalesce(allowance_amount,0)+coalesce(other_cost,0)) from bz_vehicle_orders where supplier_id = p_supplier_id and status = 'done' and coalesce(ended_at, created_at) >= date_trunc('month', now())), 0)
  );
end $$;

-- ── السيارات ──────────────────────────────────────────────────────────────
create or replace function public.business_vehicle_save(p_supplier_id uuid, p_vehicle jsonb, p_token uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid := nullif(p_vehicle->>'id','')::uuid;
begin
  if not public.schedule_edit_ok(p_supplier_id, p_token) then return jsonb_build_object('ok', false, 'error', 'مالكش صلاحية'); end if;
  if coalesce(trim(p_vehicle->>'name'),'') = '' then return jsonb_build_object('ok', false, 'error', 'اكتب اسم العربية'); end if;
  if v_id is null then
    insert into bz_vehicles (supplier_id, name, plate, vehicle_type, driver_employee_id, license_expiry, insurance_expiry, odometer_km, status, notes)
    values (p_supplier_id, trim(p_vehicle->>'name'), nullif(p_vehicle->>'plate',''), coalesce(nullif(p_vehicle->>'vehicle_type',''),'car'), nullif(p_vehicle->>'driver_employee_id','')::uuid,
            nullif(p_vehicle->>'license_expiry','')::date, nullif(p_vehicle->>'insurance_expiry','')::date, coalesce((p_vehicle->>'odometer_km')::numeric,0), coalesce(nullif(p_vehicle->>'status',''),'active'), nullif(p_vehicle->>'notes',''))
    returning id into v_id;
  else
    update bz_vehicles set name = trim(p_vehicle->>'name'), plate = nullif(p_vehicle->>'plate',''), vehicle_type = coalesce(nullif(p_vehicle->>'vehicle_type',''),'car'),
      driver_employee_id = nullif(p_vehicle->>'driver_employee_id','')::uuid, license_expiry = nullif(p_vehicle->>'license_expiry','')::date, insurance_expiry = nullif(p_vehicle->>'insurance_expiry','')::date,
      odometer_km = coalesce((p_vehicle->>'odometer_km')::numeric, odometer_km), status = coalesce(nullif(p_vehicle->>'status',''),'active'), notes = nullif(p_vehicle->>'notes','')
    where id = v_id and supplier_id = p_supplier_id;
  end if;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function public.business_vehicle_delete(p_supplier_id uuid, p_id uuid, p_token uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.schedule_edit_ok(p_supplier_id, p_token) then return jsonb_build_object('ok', false, 'error', 'مالكش صلاحية'); end if;
  delete from bz_vehicles where id = p_id and supplier_id = p_supplier_id;
  return jsonb_build_object('ok', true);
end $$;

-- ── أوامر تشغيل السيارات ──────────────────────────────────────────────────
create or replace function public.business_vehicle_order_save(p_supplier_id uuid, p_order jsonb, p_token uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid := nullif(p_order->>'id','')::uuid; v_status text := coalesce(nullif(p_order->>'status',''),'planned'); r bz_vehicle_orders; v_total numeric; v_exp uuid; v_branch uuid;
begin
  if not public.schedule_edit_ok(p_supplier_id, p_token) then return jsonb_build_object('ok', false, 'error', 'مالكش صلاحية'); end if;
  if v_status not in ('planned','running','done','cancelled') then v_status := 'planned'; end if;
  if v_id is null then
    insert into bz_vehicle_orders (supplier_id, vehicle_id, driver_employee_id, purpose, from_location, to_location, project_id, order_id, scheduled_at, started_at, ended_at, km_start, km_end, fuel_cost, allowance_amount, other_cost, status, notes)
    values (p_supplier_id, nullif(p_order->>'vehicle_id','')::uuid, nullif(p_order->>'driver_employee_id','')::uuid, coalesce(nullif(p_order->>'purpose',''),'transport'),
            nullif(p_order->>'from_location',''), nullif(p_order->>'to_location',''), nullif(p_order->>'project_id','')::uuid, nullif(p_order->>'order_id','')::uuid,
            nullif(p_order->>'scheduled_at','')::timestamptz, nullif(p_order->>'started_at','')::timestamptz, nullif(p_order->>'ended_at','')::timestamptz,
            nullif(p_order->>'km_start','')::numeric, nullif(p_order->>'km_end','')::numeric, coalesce((p_order->>'fuel_cost')::numeric,0), coalesce((p_order->>'allowance_amount')::numeric,0), coalesce((p_order->>'other_cost')::numeric,0),
            v_status, nullif(p_order->>'notes',''))
    returning * into r;
  else
    update bz_vehicle_orders set vehicle_id = nullif(p_order->>'vehicle_id','')::uuid, driver_employee_id = nullif(p_order->>'driver_employee_id','')::uuid, purpose = coalesce(nullif(p_order->>'purpose',''),'transport'),
      from_location = nullif(p_order->>'from_location',''), to_location = nullif(p_order->>'to_location',''), project_id = nullif(p_order->>'project_id','')::uuid, order_id = nullif(p_order->>'order_id','')::uuid,
      scheduled_at = nullif(p_order->>'scheduled_at','')::timestamptz, started_at = nullif(p_order->>'started_at','')::timestamptz, ended_at = nullif(p_order->>'ended_at','')::timestamptz,
      km_start = nullif(p_order->>'km_start','')::numeric, km_end = nullif(p_order->>'km_end','')::numeric,
      fuel_cost = coalesce((p_order->>'fuel_cost')::numeric,0), allowance_amount = coalesce((p_order->>'allowance_amount')::numeric,0), other_cost = coalesce((p_order->>'other_cost')::numeric,0),
      status = v_status, notes = nullif(p_order->>'notes','')
    where id = v_id and supplier_id = p_supplier_id returning * into r;
    if r.id is null then return jsonb_build_object('ok', false, 'error', 'الأمر مش موجود'); end if;
  end if;
  -- ✅ خلص → عدّاد العربية يتحدّث + مصروف «مواصلات» مرة واحدة
  if r.status = 'done' then
    if r.ended_at is null then update bz_vehicle_orders set ended_at = now() where id = r.id; end if;
    if r.vehicle_id is not null and r.km_end is not null then update bz_vehicles set odometer_km = greatest(coalesce(odometer_km,0), r.km_end) where id = r.vehicle_id; end if;
    v_total := coalesce(r.fuel_cost,0) + coalesce(r.allowance_amount,0) + coalesce(r.other_cost,0);
    if v_total > 0 and r.expense_id is null then
      select id into v_branch from supplier_branches where supplier_id = p_supplier_id order by created_at limit 1;
      insert into branch_expenses (supplier_id, branch_id, category, amount_egp, payment_method, notes, expense_date, metadata)
      values (p_supplier_id, v_branch, 'transportation', v_total, 'cash',
              'أمر تشغيل عربية: ' || coalesce((select name from bz_vehicles where id = r.vehicle_id), '—') || ' · ' || coalesce(r.from_location,'') || ' ← ' || coalesce(r.to_location,''),
              coalesce(r.ended_at, now())::date, jsonb_build_object('vehicle_order_id', r.id, 'fuel', r.fuel_cost, 'allowance', r.allowance_amount, 'other', r.other_cost))
      returning id into v_exp;
      update bz_vehicle_orders set expense_id = v_exp where id = r.id;
    end if;
  end if;
  return jsonb_build_object('ok', true, 'id', r.id, 'expense_id', coalesce(v_exp, r.expense_id));
end $$;

create or replace function public.business_vehicle_order_delete(p_supplier_id uuid, p_id uuid, p_token uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_exp uuid;
begin
  if not public.schedule_edit_ok(p_supplier_id, p_token) then return jsonb_build_object('ok', false, 'error', 'مالكش صلاحية'); end if;
  select expense_id into v_exp from bz_vehicle_orders where id = p_id and supplier_id = p_supplier_id;
  if v_exp is not null then return jsonb_build_object('ok', false, 'error', 'الأمر اتقيّد كمصروف — الغيه من المصاريف الأول'); end if;
  delete from bz_vehicle_orders where id = p_id and supplier_id = p_supplier_id;
  return jsonb_build_object('ok', true);
end $$;

-- ── الشحنات ───────────────────────────────────────────────────────────────
create or replace function public.business_shipment_save(p_supplier_id uuid, p_ship jsonb, p_token uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid := nullif(p_ship->>'id','')::uuid; v_status text := coalesce(nullif(p_ship->>'status',''),'pending'); r bz_shipments; v_exp uuid; v_branch uuid;
begin
  if not public.schedule_edit_ok(p_supplier_id, p_token) then return jsonb_build_object('ok', false, 'error', 'مالكش صلاحية'); end if;
  if v_status not in ('pending','shipped','delivered','returned','cancelled') then v_status := 'pending'; end if;
  if v_id is null then
    insert into bz_shipments (supplier_id, order_id, customer_name, customer_phone, address, city, carrier_type, vehicle_order_id, carrier_name, tracking_no, cost, charged_to_customer, status, shipped_at, delivered_at, notes)
    values (p_supplier_id, nullif(p_ship->>'order_id','')::uuid, nullif(p_ship->>'customer_name',''), nullif(p_ship->>'customer_phone',''), nullif(p_ship->>'address',''), nullif(p_ship->>'city',''),
            coalesce(nullif(p_ship->>'carrier_type',''),'own_vehicle'), nullif(p_ship->>'vehicle_order_id','')::uuid, nullif(p_ship->>'carrier_name',''), nullif(p_ship->>'tracking_no',''),
            coalesce((p_ship->>'cost')::numeric,0), coalesce((p_ship->>'charged_to_customer')::numeric,0), v_status, nullif(p_ship->>'shipped_at','')::timestamptz, nullif(p_ship->>'delivered_at','')::timestamptz, nullif(p_ship->>'notes',''))
    returning * into r;
  else
    update bz_shipments set order_id = nullif(p_ship->>'order_id','')::uuid, customer_name = nullif(p_ship->>'customer_name',''), customer_phone = nullif(p_ship->>'customer_phone',''), address = nullif(p_ship->>'address',''), city = nullif(p_ship->>'city',''),
      carrier_type = coalesce(nullif(p_ship->>'carrier_type',''),'own_vehicle'), vehicle_order_id = nullif(p_ship->>'vehicle_order_id','')::uuid, carrier_name = nullif(p_ship->>'carrier_name',''), tracking_no = nullif(p_ship->>'tracking_no',''),
      cost = coalesce((p_ship->>'cost')::numeric,0), charged_to_customer = coalesce((p_ship->>'charged_to_customer')::numeric,0), status = v_status,
      shipped_at = nullif(p_ship->>'shipped_at','')::timestamptz, delivered_at = nullif(p_ship->>'delivered_at','')::timestamptz, notes = nullif(p_ship->>'notes','')
    where id = v_id and supplier_id = p_supplier_id returning * into r;
    if r.id is null then return jsonb_build_object('ok', false, 'error', 'الشحنة مش موجودة'); end if;
  end if;
  if r.status = 'shipped' and r.shipped_at is null then update bz_shipments set shipped_at = now() where id = r.id; end if;
  if r.status = 'delivered' then
    if r.delivered_at is null then update bz_shipments set delivered_at = now() where id = r.id; end if;
    -- تكلفة شركة شحن خارجية → مصروف مواصلات مرة واحدة (عربية الشركة تكلفتها في أمر التشغيل نفسه)
    if r.carrier_type = 'external' and coalesce(r.cost,0) > 0 and r.expense_id is null then
      select id into v_branch from supplier_branches where supplier_id = p_supplier_id order by created_at limit 1;
      insert into branch_expenses (supplier_id, branch_id, category, amount_egp, payment_method, vendor_name, notes, expense_date, metadata)
      values (p_supplier_id, v_branch, 'transportation', r.cost, 'cash', r.carrier_name, 'شحنة لعميل: ' || coalesce(r.customer_name,'') || ' · ' || coalesce(r.city,'') || coalesce(' · بوليصة ' || r.tracking_no, ''), now()::date, jsonb_build_object('shipment_id', r.id))
      returning id into v_exp;
      update bz_shipments set expense_id = v_exp where id = r.id;
    end if;
  end if;
  return jsonb_build_object('ok', true, 'id', r.id);
end $$;

create or replace function public.business_shipment_delete(p_supplier_id uuid, p_id uuid, p_token uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.schedule_edit_ok(p_supplier_id, p_token) then return jsonb_build_object('ok', false, 'error', 'مالكش صلاحية'); end if;
  if exists (select 1 from bz_shipments where id = p_id and supplier_id = p_supplier_id and expense_id is not null) then return jsonb_build_object('ok', false, 'error', 'الشحنة اتقيّدت كمصروف — الغيها من المصاريف الأول'); end if;
  delete from bz_shipments where id = p_id and supplier_id = p_supplier_id;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.business_transport_bundle(uuid, uuid), public.business_vehicle_save(uuid, jsonb, uuid), public.business_vehicle_delete(uuid, uuid, uuid),
  public.business_vehicle_order_save(uuid, jsonb, uuid), public.business_vehicle_order_delete(uuid, uuid, uuid), public.business_shipment_save(uuid, jsonb, uuid), public.business_shipment_delete(uuid, uuid, uuid) from public;
grant execute on function public.business_transport_bundle(uuid, uuid), public.business_vehicle_save(uuid, jsonb, uuid), public.business_vehicle_delete(uuid, uuid, uuid),
  public.business_vehicle_order_save(uuid, jsonb, uuid), public.business_vehicle_order_delete(uuid, uuid, uuid), public.business_shipment_save(uuid, jsonb, uuid), public.business_shipment_delete(uuid, uuid, uuid) to anon, authenticated, service_role;
