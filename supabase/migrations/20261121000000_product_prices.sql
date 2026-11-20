-- Manually set prices per product and currency (localized pricing).
--
-- products.price / original_price stay the rupee prices that checkout charges.
-- A row here is a price an admin chose for one currency, e.g. "$29.99 in USD".
-- The storefront shows it instead of a converted rupee price for shoppers using
-- that currency. Currencies with no row are converted from rupees at the live
-- exchange rate in the browser, and that converted value is never written here,
-- so automatic rate changes can never overwrite a manually saved price.
--
-- INR is not stored here: the rupee price is products.price.

create table public.product_prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  currency text not null check (currency in ('USD', 'GBP', 'EUR', 'RUB', 'AED', 'CAD', 'AUD')),
  price numeric(12, 2) not null check (price > 0),
  original_price numeric(12, 2) check (original_price is null or original_price > price),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users (id) on delete set null,
  unique (product_id, currency)
);

comment on table public.product_prices is 'Admin-set prices per product and currency. Missing currencies are converted from products.price (INR) at display time and never stored.';

create index product_prices_product_idx on public.product_prices (product_id);

create trigger product_prices_updated_at before update on public.product_prices
  for each row execute function public.set_updated_at();

alter table public.product_prices enable row level security;

-- Shoppers can read prices of products they can see; admins can read all.
create policy "Anyone can view prices of active products" on public.product_prices
  for select to anon, authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.products p where p.id = product_id and p.is_active)
  );

create policy "Admins can add product prices" on public.product_prices
  for insert to authenticated with check (public.is_admin());

create policy "Admins can change product prices" on public.product_prices
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Admins can delete product prices" on public.product_prices
  for delete to authenticated using (public.is_admin());
