alter table public.companies
add column if not exists business_name text,
add column if not exists tax_id text,
add column if not exists main_phone text,
add column if not exists main_email text,
add column if not exists main_contact text,
add column if not exists address_line_1 text,
add column if not exists address_line_2 text,
add column if not exists city text,
add column if not exists state text,
add column if not exists postal_code text,
add column if not exists country text;
