alter table public.service_orders
  add column if not exists service_summary text,
  add column if not exists findings text,
  add column if not exists recommendations text,
  add column if not exists materials_used text;
