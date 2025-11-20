create extension if not exists pgcrypto;

create table if not exists public.app_user (
  id uuid primary key default auth.uid(),
  role text not null check (role in ('parent','child')),
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.link_parent_child (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.app_user(id) on delete cascade,
  child_id  uuid not null references public.app_user(id) on delete cascade,
  unique(parent_id, child_id)
);

create table if not exists public.child_settings (
  child_id uuid primary key references public.app_user(id) on delete cascade,
  yen_per_point int not null check (yen_per_point between 1 and 999),
  closing_day int not null check (closing_day between 1 and 31),
  base_allowance_yen int not null default 0
);

create table if not exists public.rule_snapshot (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.app_user(id) on delete cascade,
  month text not null,
  label text not null,
  points int not null,
  status text not null check (status in ('awaiting_approval','active')) default 'awaiting_approval',
  created_by uuid not null references public.app_user(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_rule_snapshot_child_month on public.rule_snapshot(child_id, month);

create table if not exists public.rule_approval (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.rule_snapshot(id) on delete cascade,
  approver_id uuid not null references public.app_user(id),
  role text not null check (role in ('parent','child')),
  decision text not null check (decision in ('approved','rejected')),
  decided_at timestamptz not null default now(),
  unique(snapshot_id, role)
);

create table if not exists public.point_entry (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.app_user(id) on delete cascade,
  snapshot_id uuid references public.rule_snapshot(id) on delete set null, -- Nullable for ad-hoc points
  occurs_on date not null,
  delta_points int not null,
  note text,
  created_by uuid not null references public.app_user(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_point_entry_child on public.point_entry(child_id);

create table if not exists public.monthly_summary (
  child_id uuid not null references public.app_user(id) on delete cascade,
  month text not null,
  total_points int not null,
  total_yen int not null,
  status text not null check (status in ('collecting','finalized')) default 'collecting',
  finalized_by uuid references public.app_user(id),
  finalized_at timestamptz,
  primary key(child_id, month)
);

alter table app_user enable row level security;
alter table link_parent_child enable row level security;
alter table child_settings enable row level security;
alter table rule_snapshot enable row level security;
alter table rule_approval enable row level security;
alter table point_entry enable row level security;
alter table monthly_summary enable row level security;

-- Allow users to read their own profile AND parents to read their linked children's profiles
create policy me_read on app_user for select using (
  auth.uid() = id
  or exists(select 1 from link_parent_child l where l.child_id = id and l.parent_id = auth.uid())
  or exists(select 1 from link_parent_child l where l.parent_id = id and l.child_id = auth.uid())
);

create policy link_read on link_parent_child for select using (auth.uid() in (parent_id, child_id));

create policy child_settings_read on child_settings for select using (
  child_id = auth.uid()
  or exists(select 1 from link_parent_child l where l.child_id = child_id and l.parent_id = auth.uid())
);
create policy child_settings_write_parent on child_settings for insert with check (
  exists(select 1 from link_parent_child l where l.child_id = child_id and l.parent_id = auth.uid())
);
create policy child_settings_update_parent on child_settings for update using (
  exists(select 1 from link_parent_child l where l.child_id = child_id and l.parent_id = auth.uid())
);

create policy rule_read on rule_snapshot for select using (
  child_id = auth.uid() or exists(select 1 from link_parent_child l where l.child_id = child_id and l.parent_id = auth.uid())
);
create policy rule_write_parent on rule_snapshot for insert with check (
  exists(select 1 from link_parent_child l where l.child_id = child_id and l.parent_id = auth.uid())
);
create policy rule_update_parent on rule_snapshot for update using (
  exists(select 1 from link_parent_child l where l.child_id = child_id and l.parent_id = auth.uid())
);

create policy approval_write_self on rule_approval for insert with check (approver_id = auth.uid());
create policy approval_read_related on rule_approval for select using (
  exists(select 1 from rule_snapshot r where r.id = snapshot_id
         and (r.child_id = auth.uid() or exists(select 1 from link_parent_child l where l.child_id = r.child_id and l.parent_id = auth.uid())))
);

create policy point_read on point_entry for select using (
  child_id = auth.uid() or exists(select 1 from link_parent_child l where l.child_id = child_id and l.parent_id = auth.uid())
);
create policy point_write_parent on point_entry for insert with check (
  exists(select 1 from link_parent_child l where l.child_id = child_id and l.parent_id = auth.uid())
);

create policy summary_read on monthly_summary for select using (
  child_id = auth.uid() or exists(select 1 from link_parent_child l where l.child_id = child_id and l.parent_id = auth.uid())
);
create policy summary_write_parent on monthly_summary for insert with check (
  exists(select 1 from link_parent_child l where l.child_id = child_id and l.parent_id = auth.uid())
);
create policy summary_update_parent on monthly_summary for update using (
  exists(select 1 from link_parent_child l where l.child_id = child_id and l.parent_id = auth.uid())
);
