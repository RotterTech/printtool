-- Migration: Create public.apk_maintenance table for APK module
-- Date: 2026-01-14

-- Ensure pgcrypto is available for gen_random_uuid()
create extension if not exists pgcrypto;

-- Create table
create table if not exists public.apk_maintenance (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  job_id text unique not null,
  customer_name text not null,
  device_brand text not null,
  device_model text not null,
  scancircle_before integer,
  scancircle_after integer,
  performed_by text,
  status text not null default 'Ingeboekt' check (status in ('Ingeboekt', 'Bezig', 'Klaar')),
  checklist_data jsonb
);

-- Enable Row Level Security
alter table public.apk_maintenance enable row level security;

-- Safety: drop existing policies if present (idempotent-ish)
drop policy if exists "apk_maintenance select authenticated" on public.apk_maintenance;
drop policy if exists "apk_maintenance insert authenticated" on public.apk_maintenance;
drop policy if exists "apk_maintenance update authenticated" on public.apk_maintenance;

-- Allow authenticated users to SELECT
create policy "apk_maintenance select authenticated"
  on public.apk_maintenance
  for select
  to authenticated
  using (true);

-- Allow authenticated users to INSERT
create policy "apk_maintenance insert authenticated"
  on public.apk_maintenance
  for insert
  to authenticated
  with check (true);

-- Allow authenticated users to UPDATE
create policy "apk_maintenance update authenticated"
  on public.apk_maintenance
  for update
  to authenticated
  using (true)
  with check (true);
