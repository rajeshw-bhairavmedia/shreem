-- Shreem Lifestyle store: products, orders, admins, product image storage.

-- ---------------------------------------------------------------------------
-- Admins: Supabase Auth users who may use /admin.
-- Add one with:  insert into public.admins (user_id)
--                select id from auth.users where email = 'you@example.com';
-- ---------------------------------------------------------------------------
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
-- No policies: only the SQL editor / service role can manage admins.

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) > 0),
  description text not null default '',
  price integer not null check (price > 0),                    -- rupees
  original_price integer check (original_price is null or original_price > 0),
  category text not null check (category in ('men', 'women', 'occasion')),
  style text check (style in ('casual', 'formal', 'traditional')),
  images text[] not null default '{}',
  sizes text[] not null default '{}',
  colors text[] not null default '{}',
  stock jsonb not null default '{}'::jsonb,                   -- { "M": 5, "L": 0 }
  is_new boolean not null default false,
  is_bestseller boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

alter table public.products enable row level security;

create policy "Anyone can view active products" on public.products
  for select to anon, authenticated
  using (is_active or public.is_admin());

create policy "Admins can insert products" on public.products
  for insert to authenticated with check (public.is_admin());

create policy "Admins can update products" on public.products
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Admins can delete products" on public.products
  for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Orders (created only by the server functions, which use the service role)
-- ---------------------------------------------------------------------------
create sequence public.order_number_seq start 1001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('SL' || nextval('public.order_number_seq')),
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'paid', 'shipped', 'delivered', 'cancelled')),
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  address jsonb not null,          -- { line1, line2, city, state, pincode }
  items jsonb not null,            -- [{ product_id, slug, name, image, size, color, price, quantity }]
  subtotal integer not null,
  shipping integer not null,
  total integer not null,
  razorpay_order_id text unique,
  razorpay_payment_id text,
  tracking text,
  admin_notes text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  shipped_at timestamptz,
  updated_at timestamptz not null default now()
);

create index orders_status_created_idx on public.orders (status, created_at desc);

create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

alter table public.orders enable row level security;

create policy "Admins can view orders" on public.orders
  for select to authenticated using (public.is_admin());

create policy "Admins can update orders" on public.orders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Marks an order paid exactly once and reduces stock for each item.
-- Called by the verify-payment function and the Razorpay webhook (whichever arrives first).
create function public.mark_order_paid(p_razorpay_order_id text, p_payment_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders;
  item jsonb;
begin
  update public.orders
     set status = 'paid', razorpay_payment_id = p_payment_id, paid_at = now()
   where razorpay_order_id = p_razorpay_order_id and status = 'pending_payment'
  returning * into o;

  if not found then
    select * into o from public.orders where razorpay_order_id = p_razorpay_order_id;
    if not found then
      return null;
    end if;
    return jsonb_build_object('order', to_jsonb(o), 'newly_paid', false);
  end if;

  for item in select * from jsonb_array_elements(o.items) loop
    update public.products
       set stock = jsonb_set(
             stock,
             array[item ->> 'size'],
             to_jsonb(greatest((stock ->> (item ->> 'size'))::int - (item ->> 'quantity')::int, 0))
           )
     where id = (item ->> 'product_id')::uuid
       and stock ? (item ->> 'size');
  end loop;

  return jsonb_build_object('order', to_jsonb(o), 'newly_paid', true);
end;
$$;

revoke execute on function public.mark_order_paid(text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Product images (public bucket; only admins can upload or delete)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "Admins can upload product images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

create policy "Admins can update product images" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

create policy "Admins can delete product images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
