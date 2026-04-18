alter table public.service_orders
  add column if not exists started_at timestamptz,
  add column if not exists execution_status text;
