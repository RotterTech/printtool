This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Supabase: Repairs table

Run this SQL in your Supabase project to create the `repairs` table required by the app:

```sql
create type repair_status as enum ('Ingeboekt', 'Onderweg', 'Besteld', 'Reparatie klaar', 'Afgehaald');

create table if not exists public.repairs (
  id uuid primary key default gen_random_uuid(),
  jobId text not null,
  klant text not null,
  email text,
  telefoon text,
  klantnummer text,
  merk text,
  model text,
  omschrijving text,
  status repair_status not null default 'Ingeboekt',
  onderdeel_besteld boolean not null default false,
  onderdeel_naam text,
  onderdeel_leverancier text not null default 'DDKM',
  datum_in timestamptz not null default now(),
  datum_uit timestamptz,
  inserted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists repairs_jobid_idx on public.repairs (jobId);
create index if not exists repairs_status_idx on public.repairs (status);
create index if not exists repairs_klant_idx on public.repairs (klant);

-- Row Level Security policies (adjust as needed)
alter table public.repairs enable row level security;

-- By default allow authenticated users full access
create policy if not exists "repairs_auth_read" on public.repairs for select to authenticated using (true);
create policy if not exists "repairs_auth_insert" on public.repairs for insert to authenticated with check (true);
create policy if not exists "repairs_auth_update" on public.repairs for update to authenticated using (true) with check (true);
create policy if not exists "repairs_auth_delete" on public.repairs for delete to authenticated using (true);

-- If you want anon access locally (because localhost bypass), you may add:
-- create policy if not exists "repairs_anon_all" on public.repairs for all to anon using (true) with check (true);
```

Note: Requires pgcrypto (gen_random_uuid) and RLS policies adjusted to your needs.
