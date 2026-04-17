alter table public.service_orders
  add column if not exists service_report text,
  add column if not exists completed_at timestamptz;
