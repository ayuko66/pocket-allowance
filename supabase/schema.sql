create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_household_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id
    from public.app_user
   where id = auth.uid()
   limit 1
$$;

create table if not exists public.household (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  created_by uuid not null,
  created_at timestamptz not null default now()
);

create table if not exists public.app_user (
  id uuid primary key default auth.uid(),
  household_id uuid not null references public.household(id) on delete cascade,
  role text not null check (role in ('parent', 'child')),
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.link_parent_child (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household(id) on delete cascade,
  parent_id uuid not null references public.app_user(id) on delete cascade,
  child_id uuid not null references public.app_user(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (parent_id, child_id),
  check (parent_id <> child_id)
);

create table if not exists public.child_settings (
  child_id uuid primary key references public.app_user(id) on delete cascade,
  yen_per_point integer not null default 100 check (yen_per_point between 1 and 10000),
  updated_at timestamptz not null default now()
);

create table if not exists public.rule_snapshot (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household(id) on delete cascade,
  child_id uuid not null references public.app_user(id) on delete cascade,
  target_month text not null check (target_month ~ '^[0-9]{4}-[0-9]{2}$'),
  label text not null,
  point_value integer not null check (point_value between -999 and 999),
  status text not null check (status in ('draft', 'pending_child_approval', 'pending_parent_approval', 'active', 'rejected')) default 'pending_child_approval',
  created_by uuid not null references public.app_user(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_rule_snapshot_child_month on public.rule_snapshot (child_id, target_month);

create table if not exists public.rule_approval (
  id uuid primary key default gen_random_uuid(),
  rule_snapshot_id uuid not null references public.rule_snapshot(id) on delete cascade,
  approver_id uuid not null references public.app_user(id) on delete cascade,
  approver_role text not null check (approver_role in ('parent', 'child')),
  decision text not null check (decision in ('approved', 'rejected')),
  comment text,
  created_at timestamptz not null default now(),
  unique (rule_snapshot_id, approver_role)
);

create table if not exists public.point_log (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household(id) on delete cascade,
  child_id uuid not null references public.app_user(id) on delete cascade,
  rule_snapshot_id uuid references public.rule_snapshot(id) on delete set null,
  target_month text not null check (target_month ~ '^[0-9]{4}-[0-9]{2}$'),
  occurred_on date not null,
  point_delta integer not null check (point_delta between -999 and 999),
  note text,
  created_by uuid not null references public.app_user(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_point_log_child_month on public.point_log (child_id, target_month);

create table if not exists public.month_summary (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household(id) on delete cascade,
  child_id uuid not null references public.app_user(id) on delete cascade,
  target_month text not null check (target_month ~ '^[0-9]{4}-[0-9]{2}$'),
  total_points integer not null default 0,
  yen_per_point integer not null default 100,
  total_yen integer not null default 0,
  status text not null check (status in ('open', 'closed')) default 'open',
  closed_by uuid references public.app_user(id) on delete set null,
  closed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (child_id, target_month)
);

create table if not exists public.operation_log (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household(id) on delete cascade,
  actor_id uuid not null references public.app_user(id) on delete cascade,
  action_type text not null,
  target_table text not null,
  target_id uuid,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.ensure_household_parent_limit()
returns trigger
language plpgsql
as $$
declare
  parent_count integer;
begin
  if new.role = 'parent' then
    select count(*)
      into parent_count
      from public.app_user
     where household_id = new.household_id
       and role = 'parent'
       and id <> new.id;

    if parent_count >= 2 then
      raise exception 'parent limit exceeded for household';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.ensure_monthly_rule_limit()
returns trigger
language plpgsql
as $$
declare
  rule_count integer;
begin
  select count(*)
    into rule_count
    from public.rule_snapshot
   where child_id = new.child_id
     and target_month = new.target_month
     and id <> new.id;

  if rule_count >= 20 then
    raise exception 'monthly rule limit exceeded';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_app_user_parent_limit on public.app_user;
create trigger trg_app_user_parent_limit
before insert or update on public.app_user
for each row
execute function public.ensure_household_parent_limit();

drop trigger if exists trg_app_user_updated_at on public.app_user;
create trigger trg_app_user_updated_at
before update on public.app_user
for each row
execute function public.set_updated_at();

drop trigger if exists trg_child_settings_updated_at on public.child_settings;
create trigger trg_child_settings_updated_at
before update on public.child_settings
for each row
execute function public.set_updated_at();

drop trigger if exists trg_rule_snapshot_rule_limit on public.rule_snapshot;
create trigger trg_rule_snapshot_rule_limit
before insert or update on public.rule_snapshot
for each row
execute function public.ensure_monthly_rule_limit();

drop trigger if exists trg_rule_snapshot_updated_at on public.rule_snapshot;
create trigger trg_rule_snapshot_updated_at
before update on public.rule_snapshot
for each row
execute function public.set_updated_at();

drop trigger if exists trg_point_log_updated_at on public.point_log;
create trigger trg_point_log_updated_at
before update on public.point_log
for each row
execute function public.set_updated_at();

drop trigger if exists trg_month_summary_updated_at on public.month_summary;
create trigger trg_month_summary_updated_at
before update on public.month_summary
for each row
execute function public.set_updated_at();

alter table public.household enable row level security;
alter table public.app_user enable row level security;
alter table public.link_parent_child enable row level security;
alter table public.child_settings enable row level security;
alter table public.rule_snapshot enable row level security;
alter table public.rule_approval enable row level security;
alter table public.point_log enable row level security;
alter table public.month_summary enable row level security;
alter table public.operation_log enable row level security;

drop policy if exists household_insert on public.household;
create policy household_insert on public.household
for insert
with check (auth.uid() = created_by);

drop policy if exists household_select on public.household;
create policy household_select on public.household
for select
using (
  auth.uid() is not null
);

drop policy if exists app_user_insert_self on public.app_user;
create policy app_user_insert_self on public.app_user
for insert
with check (auth.uid() = id);

drop policy if exists app_user_select_same_household on public.app_user;
create policy app_user_select_same_household on public.app_user
for select
using (
  auth.uid() = id
  or household_id = public.current_household_id()
);

drop policy if exists app_user_update_self on public.app_user;
create policy app_user_update_self on public.app_user
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists link_parent_child_select on public.link_parent_child;
create policy link_parent_child_select on public.link_parent_child
for select
using (
  household_id = public.current_household_id()
);

drop policy if exists link_parent_child_insert on public.link_parent_child;
create policy link_parent_child_insert on public.link_parent_child
for insert
with check (
  (auth.uid() = parent_id or auth.uid() = child_id)
  and household_id = public.current_household_id()
);

drop policy if exists child_settings_select on public.child_settings;
create policy child_settings_select on public.child_settings
for select
using (
  child_id = auth.uid()
  or exists (
    select 1
      from public.link_parent_child l
     where l.child_id = child_settings.child_id
       and l.parent_id = auth.uid()
  )
);

drop policy if exists child_settings_insert on public.child_settings;
create policy child_settings_insert on public.child_settings
for insert
with check (
  child_id = auth.uid()
  or exists (
    select 1
      from public.link_parent_child l
     where l.child_id = child_settings.child_id
       and l.parent_id = auth.uid()
  )
);

drop policy if exists child_settings_update on public.child_settings;
create policy child_settings_update on public.child_settings
for update
using (
  exists (
    select 1
      from public.link_parent_child l
     where l.child_id = child_settings.child_id
       and l.parent_id = auth.uid()
  )
)
with check (
  exists (
    select 1
      from public.link_parent_child l
     where l.child_id = child_settings.child_id
       and l.parent_id = auth.uid()
  )
);

drop policy if exists rule_snapshot_select on public.rule_snapshot;
create policy rule_snapshot_select on public.rule_snapshot
for select
using (
  child_id = auth.uid()
  or exists (
    select 1
      from public.link_parent_child l
     where l.child_id = rule_snapshot.child_id
       and l.parent_id = auth.uid()
  )
);

drop policy if exists rule_snapshot_insert on public.rule_snapshot;
create policy rule_snapshot_insert on public.rule_snapshot
for insert
with check (
  exists (
    select 1
      from public.link_parent_child l
     where l.child_id = rule_snapshot.child_id
       and l.parent_id = auth.uid()
  )
);

drop policy if exists rule_snapshot_update on public.rule_snapshot;
create policy rule_snapshot_update on public.rule_snapshot
for update
using (
  exists (
    select 1
      from public.link_parent_child l
     where l.child_id = rule_snapshot.child_id
       and l.parent_id = auth.uid()
  )
)
with check (
  exists (
    select 1
      from public.link_parent_child l
     where l.child_id = rule_snapshot.child_id
       and l.parent_id = auth.uid()
  )
);

drop policy if exists rule_approval_select on public.rule_approval;
create policy rule_approval_select on public.rule_approval
for select
using (
  exists (
    select 1
      from public.rule_snapshot r
     where r.id = rule_approval.rule_snapshot_id
       and (
         r.child_id = auth.uid()
         or exists (
           select 1
             from public.link_parent_child l
            where l.child_id = r.child_id
              and l.parent_id = auth.uid()
         )
       )
  )
);

drop policy if exists rule_approval_insert on public.rule_approval;
create policy rule_approval_insert on public.rule_approval
for insert
with check (
  approver_id = auth.uid()
  and exists (
    select 1
      from public.app_user u
     where u.id = auth.uid()
       and u.role = rule_approval.approver_role
  )
  and exists (
    select 1
      from public.rule_snapshot r
     where r.id = rule_approval.rule_snapshot_id
       and (
         r.child_id = auth.uid()
         or exists (
           select 1
             from public.link_parent_child l
            where l.child_id = r.child_id
              and l.parent_id = auth.uid()
         )
       )
  )
);

drop policy if exists rule_approval_update on public.rule_approval;
create policy rule_approval_update on public.rule_approval
for update
using (approver_id = auth.uid())
with check (approver_id = auth.uid());

drop policy if exists point_log_select on public.point_log;
create policy point_log_select on public.point_log
for select
using (
  child_id = auth.uid()
  or exists (
    select 1
      from public.link_parent_child l
     where l.child_id = point_log.child_id
       and l.parent_id = auth.uid()
  )
);

drop policy if exists point_log_insert on public.point_log;
create policy point_log_insert on public.point_log
for insert
with check (
  exists (
    select 1
      from public.link_parent_child l
     where l.child_id = point_log.child_id
       and l.parent_id = auth.uid()
  )
);

drop policy if exists point_log_update on public.point_log;
create policy point_log_update on public.point_log
for update
using (
  exists (
    select 1
      from public.link_parent_child l
     where l.child_id = point_log.child_id
       and l.parent_id = auth.uid()
  )
)
with check (
  exists (
    select 1
      from public.link_parent_child l
     where l.child_id = point_log.child_id
       and l.parent_id = auth.uid()
  )
);

drop policy if exists month_summary_select on public.month_summary;
create policy month_summary_select on public.month_summary
for select
using (
  child_id = auth.uid()
  or exists (
    select 1
      from public.link_parent_child l
     where l.child_id = month_summary.child_id
       and l.parent_id = auth.uid()
  )
);

drop policy if exists month_summary_insert on public.month_summary;
create policy month_summary_insert on public.month_summary
for insert
with check (
  exists (
    select 1
      from public.link_parent_child l
     where l.child_id = month_summary.child_id
       and l.parent_id = auth.uid()
  )
);

drop policy if exists month_summary_update on public.month_summary;
create policy month_summary_update on public.month_summary
for update
using (
  exists (
    select 1
      from public.link_parent_child l
     where l.child_id = month_summary.child_id
       and l.parent_id = auth.uid()
  )
)
with check (
  exists (
    select 1
      from public.link_parent_child l
     where l.child_id = month_summary.child_id
       and l.parent_id = auth.uid()
  )
);

drop policy if exists operation_log_select on public.operation_log;
create policy operation_log_select on public.operation_log
for select
using (
  household_id = public.current_household_id()
);

drop policy if exists operation_log_insert on public.operation_log;
create policy operation_log_insert on public.operation_log
for insert
with check (
  actor_id = auth.uid()
  and household_id = public.current_household_id()
);
