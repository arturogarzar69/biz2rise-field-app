alter table public.service_orders
  add column if not exists actual_start_at timestamptz,
  add column if not exists actual_end_at timestamptz,
  add column if not exists completed_by text,
  add column if not exists completion_notes text;
