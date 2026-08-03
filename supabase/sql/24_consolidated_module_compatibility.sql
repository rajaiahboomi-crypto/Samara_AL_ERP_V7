-- =====================================================================
-- SAMARA CARE ERP 1.0.23
-- CONSOLIDATED MODULE COMPATIBILITY REPAIR
-- Safe to run repeatedly. Existing records are preserved.
-- Repairs only missing tables/columns used by the current ERP screens.
-- =====================================================================

create extension if not exists pgcrypto;

-- 1. VITAL SIGNS
create table if not exists public.vital_signs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  temperature numeric,
  systolic integer,
  diastolic integer,
  pulse integer,
  respiration integer,
  spo2 integer,
  blood_sugar_type text default 'Not Taken',
  blood_sugar numeric,
  weight numeric,
  pain_score numeric,
  remarks text,
  alert_level text default 'Normal',
  recorded_by uuid references public.profiles(id),
  recorded_at timestamptz default now()
);
alter table public.vital_signs
  add column if not exists temperature numeric,
  add column if not exists systolic integer,
  add column if not exists diastolic integer,
  add column if not exists pulse integer,
  add column if not exists respiration integer,
  add column if not exists spo2 integer,
  add column if not exists blood_sugar_type text,
  add column if not exists blood_sugar numeric,
  add column if not exists weight numeric,
  add column if not exists pain_score numeric,
  add column if not exists remarks text,
  add column if not exists alert_level text,
  add column if not exists recorded_by uuid,
  add column if not exists recorded_at timestamptz;
update public.vital_signs set
  blood_sugar_type = case when blood_sugar is null then 'Not Taken' else coalesce(nullif(trim(blood_sugar_type),''),'RBS') end,
  alert_level = coalesce(nullif(trim(alert_level),''),'Normal'),
  recorded_at = coalesce(recorded_at,now());
alter table public.vital_signs alter column blood_sugar_type set default 'Not Taken';
alter table public.vital_signs alter column alert_level set default 'Normal';
alter table public.vital_signs alter column recorded_at set default now();
alter table public.vital_signs drop constraint if exists vital_signs_blood_sugar_type_check;
alter table public.vital_signs add constraint vital_signs_blood_sugar_type_check check (blood_sugar_type is null or blood_sugar_type in ('Not Taken','FBS','PPBS','RBS'));
alter table public.vital_signs drop constraint if exists vital_signs_pain_score_check;
alter table public.vital_signs add constraint vital_signs_pain_score_check check (pain_score is null or pain_score between 0 and 10);

-- 2. DAILY CARE
create table if not exists public.care_logs (
  id uuid primary key default gen_random_uuid(),
  care_order_id uuid references public.care_orders(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  care_date date not null default current_date,
  shift text,
  status text,
  completed_at timestamptz,
  completed_by uuid references public.profiles(id),
  remarks text,
  created_at timestamptz not null default now()
);
alter table public.care_logs
  add column if not exists care_order_id uuid,
  add column if not exists patient_id uuid,
  add column if not exists care_date date,
  add column if not exists shift text,
  add column if not exists status text,
  add column if not exists completed_at timestamptz,
  add column if not exists completed_by uuid,
  add column if not exists remarks text,
  add column if not exists created_at timestamptz;
alter table public.care_logs alter column care_order_id drop not null;
update public.care_logs set care_date=coalesce(care_date,current_date), created_at=coalesce(created_at,now());
alter table public.care_logs alter column care_date set default current_date;
alter table public.care_logs alter column created_at set default now();

-- 3. SHIFT HANDOVER
create table if not exists public.shift_handovers (
  id uuid primary key default gen_random_uuid(),
  handover_date date not null default current_date,
  shift text,
  patient_summary text,
  pending_tasks text,
  special_instructions text,
  priority text default 'Routine',
  submitted_by uuid references public.profiles(id),
  acknowledged_by uuid references public.profiles(id),
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.shift_handovers
  add column if not exists handover_date date,
  add column if not exists shift text,
  add column if not exists patient_summary text,
  add column if not exists pending_tasks text,
  add column if not exists special_instructions text,
  add column if not exists priority text,
  add column if not exists submitted_by uuid,
  add column if not exists acknowledged_by uuid,
  add column if not exists acknowledged_at timestamptz,
  add column if not exists created_at timestamptz;
update public.shift_handovers set handover_date=coalesce(handover_date,current_date), priority=coalesce(nullif(trim(priority),''),'Routine'), created_at=coalesce(created_at,now());
alter table public.shift_handovers alter column handover_date set default current_date;
alter table public.shift_handovers alter column priority set default 'Routine';
alter table public.shift_handovers alter column created_at set default now();

-- 4. INCIDENTS
create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete set null,
  incident_type text,
  description text,
  immediate_action text,
  severity text default 'Low',
  status text default 'Open',
  incident_at timestamptz default now(),
  reported_by uuid references public.profiles(id),
  reviewed_by uuid references public.profiles(id),
  closure_note text,
  closed_at timestamptz
);
alter table public.incidents
  add column if not exists patient_id uuid,
  add column if not exists incident_type text,
  add column if not exists description text,
  add column if not exists immediate_action text,
  add column if not exists severity text,
  add column if not exists status text,
  add column if not exists incident_at timestamptz,
  add column if not exists reported_by uuid,
  add column if not exists reviewed_by uuid,
  add column if not exists closure_note text,
  add column if not exists closed_at timestamptz;
update public.incidents set severity=coalesce(nullif(trim(severity),''),'Low'), status=coalesce(nullif(trim(status),''),'Open'), incident_at=coalesce(incident_at,now());
alter table public.incidents alter column severity set default 'Low';
alter table public.incidents alter column status set default 'Open';
alter table public.incidents alter column incident_at set default now();

-- 5. FOOD & DIET
create table if not exists public.meal_records (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  meal_date date default current_date,
  meal_type text,
  menu text,
  consumption_status text,
  remarks text,
  served_at timestamptz default now(),
  recorded_by uuid references public.profiles(id)
);
alter table public.meal_records
  add column if not exists patient_id uuid,
  add column if not exists meal_date date,
  add column if not exists meal_type text,
  add column if not exists menu text,
  add column if not exists consumption_status text,
  add column if not exists remarks text,
  add column if not exists served_at timestamptz,
  add column if not exists recorded_by uuid;
update public.meal_records set meal_date=coalesce(meal_date,current_date), served_at=coalesce(served_at,now());
alter table public.meal_records alter column meal_date set default current_date;
alter table public.meal_records alter column served_at set default now();

-- 6. BILLING & PAYMENTS
create table if not exists public.billing_transactions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  transaction_type text,
  category text,
  amount numeric(12,2),
  description text,
  payment_mode text,
  transaction_date timestamptz default now(),
  entered_by uuid references public.profiles(id),
  approved_by uuid references public.profiles(id)
);
alter table public.billing_transactions
  add column if not exists patient_id uuid,
  add column if not exists transaction_type text,
  add column if not exists category text,
  add column if not exists amount numeric(12,2),
  add column if not exists description text,
  add column if not exists payment_mode text,
  add column if not exists transaction_date timestamptz,
  add column if not exists entered_by uuid,
  add column if not exists approved_by uuid;
update public.billing_transactions set transaction_date=coalesce(transaction_date,now());
alter table public.billing_transactions alter column transaction_date set default now();

-- Authenticated ERP users can use these operational tables.
do $$
declare t text;
begin
  foreach t in array array['vital_signs','care_logs','shift_handovers','incidents','meal_records','billing_transactions'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('drop policy if exists erp_authenticated_read on public.%I',t);
    execute format('create policy erp_authenticated_read on public.%I for select to authenticated using (true)',t);
    execute format('drop policy if exists erp_authenticated_insert on public.%I',t);
    execute format('create policy erp_authenticated_insert on public.%I for insert to authenticated with check (true)',t);
    execute format('drop policy if exists erp_authenticated_update on public.%I',t);
    execute format('create policy erp_authenticated_update on public.%I for update to authenticated using (true) with check (true)',t);
    execute format('grant select, insert, update on public.%I to authenticated',t);
  end loop;
end $$;

-- Realtime registration; harmless when already registered.
do $$
declare t text;
begin
  foreach t in array array['vital_signs','care_logs','shift_handovers','incidents','meal_records','billing_transactions'] loop
    begin execute format('alter publication supabase_realtime add table public.%I',t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- Force PostgREST/Supabase to recognise the repaired schema immediately.
notify pgrst, 'reload schema';

-- Final confirmation. Every listed item should show TRUE.
select
  to_regclass('public.vital_signs') is not null as vital_signs_table,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='vital_signs' and column_name='blood_sugar') as blood_sugar_column,
  to_regclass('public.care_logs') is not null as care_logs_table,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='shift_handovers' and column_name='handover_date') as handover_date_column,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='incidents' and column_name='severity') as incident_severity_column,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='meal_records' and column_name='consumption_status') as meal_consumption_column,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='billing_transactions' and column_name='category') as billing_category_column;
