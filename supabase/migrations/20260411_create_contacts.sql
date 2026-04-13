create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  branch_id uuid references public.branches (id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  role text,
  notes text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists contacts_company_id_idx
  on public.contacts (company_id);

create index if not exists contacts_client_id_idx
  on public.contacts (client_id);

create index if not exists contacts_branch_id_idx
  on public.contacts (branch_id);

create index if not exists contacts_client_primary_idx
  on public.contacts (client_id, is_primary);
