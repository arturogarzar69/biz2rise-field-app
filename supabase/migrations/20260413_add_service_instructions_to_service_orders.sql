alter table public.service_orders
  add column if not exists service_instructions text;
