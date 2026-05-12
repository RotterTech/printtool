-- Migration: Create audit_logs table for tracking user activities
-- Date: 2026-01-28

-- Ensure pgcrypto is available for gen_random_uuid()
create extension if not exists pgcrypto;

-- Create audit_logs table
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  action text not null,
  entity text not null,
  entity_id text not null,
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  
  -- Foreign key to profiles table
        constraint audit_logs_user_id_fkey 
    foreign key (user_id) 
    references public.profiles(id) 
    on delete cascade
);

-- Create index for faster queries
create index if not exists idx_audit_logs_user_id on public.audit_logs(user_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);
create index if not exists idx_audit_logs_entity on public.audit_logs(entity);
create index if not exists idx_audit_logs_action on public.audit_logs(action);

-- Enable Row Level Security
alter table public.audit_logs enable row level security;

-- Drop existing policies if present (idempotent)
drop policy if exists "audit_logs_select_authenticated" on public.audit_logs;
drop policy if exists "audit_logs_insert_authenticated" on public.audit_logs;

-- Allow authenticated users to SELECT their own logs or if they're admin
create policy "audit_logs_select_authenticated"
  on public.audit_logs
  for select
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Allow authenticated users to INSERT audit logs
create policy "audit_logs_insert_authenticated"
  on public.audit_logs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Comment on table
comment on table public.audit_logs is 'Tracks all user activities across the application';
