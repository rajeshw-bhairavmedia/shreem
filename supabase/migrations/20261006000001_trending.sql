-- "Trending Now" on the home page is chosen in /admin, separately from the Bestseller badge.
alter table public.products add column is_trending boolean not null default false;

-- Start with the current bestsellers so the home page looks the same as before.
update public.products set is_trending = true where is_bestseller;
