-- Lets admins enter a product's price in another currency.
--
-- `price` and `original_price` stay in whole rupees: checkout, Razorpay, coupons
-- and GST invoices keep using them unchanged. When an admin types a price in
-- another currency, the admin panel converts it to rupees at that day's
-- exchange rate and also saves what was typed here, so the product form shows
-- the same currency and amounts when the product is reopened.
--
-- Safe to run on a live database: existing products default to INR, and the
-- entered_* columns stay empty until a product is saved again.

alter table public.products
  add column price_currency text not null default 'INR'
    check (price_currency in ('INR', 'USD', 'GBP', 'EUR', 'RUB', 'AED', 'CAD', 'AUD')),
  add column entered_price numeric(12, 2)
    check (entered_price is null or entered_price > 0),
  add column entered_original_price numeric(12, 2)
    check (entered_original_price is null or entered_original_price > 0);

comment on column public.products.price_currency is 'Currency the admin entered the price in. price/original_price are always rupees.';
comment on column public.products.entered_price is 'Price as typed by the admin, in price_currency.';
comment on column public.products.entered_original_price is 'Original price as typed by the admin, in price_currency.';
