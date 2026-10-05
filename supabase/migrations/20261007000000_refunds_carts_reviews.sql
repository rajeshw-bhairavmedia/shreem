-- Refunds, abandoned-cart reminders, and verified product reviews.

-- ---------------------------------------------------------------------------
-- Refunds (created by the admin-refund function via Razorpay)
-- ---------------------------------------------------------------------------
alter table public.orders add column refunded_amount integer not null default 0;

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  razorpay_refund_id text unique,
  amount integer not null check (amount > 0),          -- rupees
  status text not null default 'pending' check (status in ('pending', 'processed', 'failed')),
  reason text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

alter table public.refunds enable row level security;

create policy "Admins can view refunds" on public.refunds
  for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Abandoned carts (saved from checkout once the shopper enters an email)
-- ---------------------------------------------------------------------------
create table public.abandoned_carts (
  id uuid primary key,                                  -- generated in the shopper's browser
  email text not null,
  name text,
  items jsonb not null,                                 -- [{ slug, name, image, size, color, price, quantity }]
  subtotal integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reminder_sent_at timestamptz,
  recovered_at timestamptz
);

create index abandoned_carts_due_idx on public.abandoned_carts (updated_at)
  where reminder_sent_at is null and recovered_at is null;

alter table public.abandoned_carts enable row level security;

create policy "Admins can view abandoned carts" on public.abandoned_carts
  for select to authenticated using (public.is_admin());

-- Emails that clicked "unsubscribe" in a reminder never get another one.
create table public.email_optouts (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table public.email_optouts enable row level security;

-- ---------------------------------------------------------------------------
-- Reviews (verified buyers only; shown after admin approval)
-- ---------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  name text not null check (length(trim(name)) between 2 and 60),
  rating integer not null check (rating between 1 and 5),
  title text check (title is null or length(title) <= 100),
  body text not null check (length(trim(body)) between 10 and 2000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique (order_id, product_id)
);

create index reviews_product_idx on public.reviews (product_id, created_at desc) where status = 'approved';

alter table public.reviews enable row level security;

create policy "Anyone can read approved reviews" on public.reviews
  for select to anon, authenticated
  using (status = 'approved' or public.is_admin());

create policy "Admins can moderate reviews" on public.reviews
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Admins can delete reviews" on public.reviews
  for delete to authenticated using (public.is_admin());

-- Called by the Razorpay webhook when a refund completes or fails. A failed refund
-- frees its amount so it can be refunded again.
create function public.set_refund_status(p_razorpay_refund_id text, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.refunds;
begin
  update public.refunds
     set status = p_status
   where razorpay_refund_id = p_razorpay_refund_id and status = 'pending'
  returning * into r;

  if found and p_status = 'failed' then
    update public.orders set refunded_amount = greatest(refunded_amount - r.amount, 0) where id = r.order_id;
  end if;
end;
$$;

revoke execute on function public.set_refund_status(text, text) from public, anon, authenticated;
