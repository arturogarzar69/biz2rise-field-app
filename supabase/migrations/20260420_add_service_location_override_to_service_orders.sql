alter table public.service_orders
  add column if not exists service_location_name text,
  add column if not exists service_location_address text,
  add column if not exists service_location_phone text,
  add column if not exists service_location_contact text,
  add column if not exists is_one_off_location boolean;
