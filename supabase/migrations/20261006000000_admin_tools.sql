-- Admin tools: coupons, GST invoice numbers, HSN codes, cancel-with-restock.

-- ---------------------------------------------------------------------------
-- Coupons (managed in /admin; validated only by the server functions)
-- ---------------------------------------------------------------------------
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9_-]{3,30}$'),
  type text not null check (type in ('percent', 'flat')),
  value integer not null check (value > 0),
  min_subtotal integer not null default 0 check (min_subtotal >= 0),
  max_uses integer check (max_uses is null or max_uses > 0),
  used_count integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (type <> 'percent' or value <= 90)
);

alter table public.coupons enable row level security;

create policy "Admins manage coupons" on public.coupons
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Orders: discount, coupon, invoice number
-- ---------------------------------------------------------------------------
alter table public.orders
  add column discount integer not null default 0,
  add column coupon_code text,
  add column invoice_number text unique;

-- Invoice numbers are given only to paid orders, so they run without gaps (GST rule 46).
create sequence public.invoice_number_seq start 1;

-- HSN code per product, printed on GST invoices (e.g. 6204 women's suits, 6203 men's suits, 6211, 6214).
alter table public.products add column hsn text;

-- ---------------------------------------------------------------------------
-- mark_order_paid: now also assigns the invoice number and counts coupon use
-- ---------------------------------------------------------------------------
create or replace function public.mark_order_paid(p_razorpay_order_id text, p_payment_id text)
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
     set status = 'paid',
         razorpay_payment_id = p_payment_id,
         paid_at = now(),
         invoice_number = 'INV-' || lpad(nextval('public.invoice_number_seq')::text, 5, '0')
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

  if o.coupon_code is not null then
    update public.coupons set used_count = used_count + 1 where code = o.coupon_code;
  end if;

  return jsonb_build_object('order', to_jsonb(o), 'newly_paid', true);
end;
$$;

revoke execute on function public.mark_order_paid(text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- cancel_order: admin-only; cancels a paid/shipped order and puts stock back
-- ---------------------------------------------------------------------------
create function public.cancel_order(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders;
  item jsonb;
begin
  if not public.is_admin() then
    raise exception 'Only admins can cancel orders';
  end if;

  update public.orders
     set status = 'cancelled'
   where id = p_order_id and status in ('paid', 'shipped')
  returning * into o;

  if not found then
    raise exception 'Only paid or shipped orders can be cancelled';
  end if;

  for item in select * from jsonb_array_elements(o.items) loop
    update public.products
       set stock = jsonb_set(
             stock,
             array[item ->> 'size'],
             to_jsonb((stock ->> (item ->> 'size'))::int + (item ->> 'quantity')::int)
           )
     where id = (item ->> 'product_id')::uuid
       and stock ? (item ->> 'size');
  end loop;

  return o;
end;
$$;

revoke execute on function public.cancel_order(uuid) from public, anon;
