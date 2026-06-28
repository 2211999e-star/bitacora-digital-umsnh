-- Bitácora Digital Institucional UMSNH
-- Esquema recomendado para Supabase (PostgreSQL)
--
-- Instrucciones:
-- 1) En tu proyecto Supabase abre: SQL Editor → New query
-- 2) Pega TODO este archivo y ejecútalo.
-- 3) En Authentication → Settings:
--    - Habilita Email/Password
--    - (Recomendado) Desactiva "Confirm email" para pruebas internas o ajusta correos.
--
-- Nota: Este esquema está pensado para funcionar con RLS (Row Level Security).

-- Extensions
create extension if not exists pgcrypto;

-- =========================
-- 1) Tabla de perfiles
-- =========================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text not null default 'Usuario',
  role text not null default 'practitioner' check (role in ('admin','coordinator','practitioner')),
  -- Flujo de aprobación de cuentas (requisito institucional)
  -- pending -> approved|rejected|suspended
  account_status text not null default 'pending' check (account_status in ('pending','approved','rejected','suspended')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role);

-- Migración segura (si la tabla ya existía antes de este cambio)
-- 1) Agrega account_status si no existe
alter table public.profiles
  add column if not exists account_status text;

-- 2) Backfill: si ya había usuarios activos, se consideran APROBADOS
do $$
begin
  update public.profiles
  set account_status = case when is_active = true then 'approved' else 'suspended' end
  where account_status is null;
exception when others then
  -- noop
end $$;

-- 3) Asegura defaults y NOT NULL (sin romper datos existentes)
alter table public.profiles
  alter column account_status set default 'pending';

do $$
begin
  alter table public.profiles alter column account_status set not null;
exception when others then
  -- noop
end $$;

-- 4) CHECK constraint idempotente
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_account_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_account_status_check
      check (account_status in ('pending','approved','rejected','suspended'));
  end if;
exception when others then
  -- noop
end $$;

-- Actualiza updated_at automático
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Auto-crear perfil al crear un usuario en auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- IMPORTANTE: una cuenta nueva NO debe quedar activa automáticamente.
  insert into public.profiles (id, email, full_name, role, account_status, is_active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'Usuario'),
    'practitioner',
    'pending',
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Helper: ¿es admin?
-- Helper: ¿es administrador principal?
-- Único con permisos críticos: aprobar/rechazar/suspender usuarios, cambiar roles,
-- administrar configuración crítica.
create or replace function public.is_primary_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.is_active = true
      and p.account_status = 'approved'
      and lower(p.email) = lower('2211999e@umich.mx')
  );
$$;

-- Helper: ¿es admin? (para lectura general)
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.is_active = true
      and p.account_status = 'approved'
  );
$$;

-- Helper: ¿es coordinador o admin?
create or replace function public.is_coordinator_or_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin','coordinator')
      and p.is_active = true
      and p.account_status = 'approved'
  );
$$;

-- Helper: ¿es usuario aprobado?
create or replace function public.is_approved_user()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.account_status = 'approved'
  );
$$;

-- RLS: profiles
alter table public.profiles enable row level security;

-- Lectura de su propio perfil
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (id = auth.uid());

-- Admin puede ver todos (para módulo usuarios)
drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
on public.profiles for select
to authenticated
using (public.is_primary_admin());

-- Admin puede insertar/actualizar perfiles (roles/activo)
drop policy if exists "profiles_insert_admin" on public.profiles;
create policy "profiles_insert_admin"
on public.profiles for insert
to authenticated
with check (public.is_primary_admin());

-- =========================
-- 1.1) Configuración (settings)
-- =========================
create table if not exists public.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.settings_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_settings_updated_at on public.settings;
create trigger set_settings_updated_at
before update on public.settings
for each row execute function public.settings_set_updated_at();

alter table public.settings enable row level security;

drop policy if exists "settings_select_all" on public.settings;
create policy "settings_select_all"
on public.settings for select
to authenticated
using (public.is_approved_user());

drop policy if exists "settings_upsert_primary_admin" on public.settings;
create policy "settings_upsert_primary_admin"
on public.settings for insert
to authenticated
with check (public.is_primary_admin());

drop policy if exists "settings_update_primary_admin" on public.settings;
create policy "settings_update_primary_admin"
on public.settings for update
to authenticated
using (public.is_primary_admin())
with check (public.is_primary_admin());

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
on public.profiles for update
to authenticated
using (public.is_primary_admin())
with check (public.is_primary_admin());

-- =========================
-- 2) Incidencias (activities)
-- =========================
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- auditoría
  user_id uuid not null references public.profiles(id) on delete restrict,

  -- datos de registro
  date date not null,
  time text not null,
  received_date date not null,
  delivery_date date,

  reporter_name text not null,
  department text not null,
  coordination text,

  -- equipo
  brand text,
  model text,
  serial_number text,
  operating_system text,
  ram text,
  storage text,
  user_equipo text,

  -- soporte
  description text not null,
  diagnosis text,
  observations text,
  assigned_to text,
  service_type text not null,
  priority text not null default 'media' check (priority in ('baja','media','alta','urgente')),
  task_status text not null default 'pendiente' check (task_status in ('pendiente','en_proceso','completado','cancelado')),
  evaluation text
);

create index if not exists activities_created_at_idx on public.activities(created_at desc);
create index if not exists activities_status_idx on public.activities(task_status);
create index if not exists activities_service_idx on public.activities(service_type);
create index if not exists activities_user_idx on public.activities(user_id);

alter table public.activities enable row level security;

-- Select: todos los autenticados pueden leer (bitácora institucional)
drop policy if exists "activities_select_all" on public.activities;
create policy "activities_select_all"
on public.activities for select
to authenticated
using (public.is_approved_user());

-- Insert: cualquier autenticado puede insertar (se fuerza user_id = auth.uid() desde frontend)
drop policy if exists "activities_insert_all" on public.activities;
create policy "activities_insert_all"
on public.activities for insert
to authenticated
with check (public.is_approved_user() and user_id = auth.uid());

-- Update:
-- - Admin/Coordinador pueden editar cualquier incidencia
-- - Practicante solo puede editar sus propias incidencias
drop policy if exists "activities_update_role" on public.activities;
create policy "activities_update_role"
on public.activities for update
to authenticated
using (
  public.is_coordinator_or_admin()
  or user_id = auth.uid()
)
with check (
  public.is_coordinator_or_admin()
  or user_id = auth.uid()
);

-- Delete: solo admin
drop policy if exists "activities_delete_admin" on public.activities;
create policy "activities_delete_admin"
on public.activities for delete
to authenticated
using (public.is_admin());

-- =========================
-- 3) Eventos (events)
-- =========================
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references public.profiles(id) on delete restrict,

  title text not null,
  description text,
  event_date date not null,
  event_time text,
  location text,
  assigned_to text,
  observations text,
  status text not null default 'pendiente' check (status in ('pendiente','en_proceso','completado','cancelado'))
);

create index if not exists events_created_at_idx on public.events(created_at desc);
create index if not exists events_status_idx on public.events(status);

alter table public.events enable row level security;

drop policy if exists "events_select_all" on public.events;
create policy "events_select_all"
on public.events for select
to authenticated
using (public.is_approved_user());

drop policy if exists "events_insert_all" on public.events;
create policy "events_insert_all"
on public.events for insert
to authenticated
with check (public.is_approved_user() and user_id = auth.uid());

drop policy if exists "events_update_role" on public.events;
create policy "events_update_role"
on public.events for update
to authenticated
using (
  public.is_coordinator_or_admin()
  or user_id = auth.uid()
)
with check (
  public.is_coordinator_or_admin()
  or user_id = auth.uid()
);

drop policy if exists "events_delete_admin" on public.events;
create policy "events_delete_admin"
on public.events for delete
to authenticated
using (public.is_admin());

-- =========================
-- 4) Reportes (registro de generación)
-- =========================
create table if not exists public.reports_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  folio text not null,
  report_type text not null,
  filters jsonb not null default '{}'::jsonb
);

create index if not exists reports_log_created_at_idx on public.reports_log(created_at desc);
create index if not exists reports_log_type_idx on public.reports_log(report_type);

alter table public.reports_log enable row level security;

drop policy if exists "reports_log_select_all" on public.reports_log;
create policy "reports_log_select_all"
on public.reports_log for select
to authenticated
using (public.is_approved_user());

drop policy if exists "reports_log_insert_own" on public.reports_log;
create policy "reports_log_insert_own"
on public.reports_log for insert
to authenticated
with check (public.is_approved_user() and user_id = auth.uid());

-- =========================
-- 99) Bootstrap: Admin principal
-- =========================
-- Asegura que el correo principal exista en profiles como:
-- - role=admin
-- - account_status=approved
-- - is_active=true
-- Si el usuario aún no existe en auth.users, primero créalo desde Auth → Users.
do $$
begin
  insert into public.profiles (id, email, full_name, role, account_status, is_active)
  select
    u.id,
    u.email,
    coalesce(u.raw_user_meta_data->>'full_name', 'Administrador Principal'),
    'admin',
    'approved',
    true
  from auth.users u
  where lower(u.email) = lower('2211999e@umich.mx')
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        role = 'admin',
        account_status = 'approved',
        is_active = true,
        updated_at = now();
exception when others then
  -- noop
end $$;
