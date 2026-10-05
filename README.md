# Shreem Lifestyle

The Shreem Lifestyle online store: the storefront, a Razorpay checkout, and a private admin panel.

- **Storefront:** React + Vite + Tailwind
- **Database, admin login and product photos:** [Supabase](https://supabase.com)
- **Payments:** [Razorpay](https://razorpay.com) (UPI, cards, netbanking, wallets)
- **Hosting:** [Vercel](https://vercel.com). Hosts the site and the 3 payment functions in `api/`.

## How an order works

1. The customer adds items to the cart and enters their address at `/checkout`.
2. `api/create-order` re-reads **prices and stock from the database**, so nothing the browser sends can change
   the price. It saves the order as "Awaiting payment" and creates a Razorpay order.
3. The customer pays in the Razorpay window.
4. `api/verify-payment` checks Razorpay's signature, marks the order **paid**, and reduces stock.
   `api/razorpay-webhook` does the same from Razorpay's side, in case the customer closes the tab first.
   Either one counts the order exactly once.
5. The order appears in **/admin → Orders → To ship**. You pack it, enter the tracking number, and mark it shipped.

## Managing the store (/admin)

Go to `yourdomain.com/admin` and sign in.

- **Dashboard:** sales for today, 7 and 30 days, orders, average order value, a daily sales chart,
  top sellers, low-stock sizes and recent orders.
- **Orders:** tabs for To ship, Shipped, Delivered, Cancelled and Awaiting payment (checkouts the customer never paid
  for). You can search by order number, name, email or phone, and **Export CSV** (opens in Excel) for your accounts.
  Each order shows the items, address, a WhatsApp link to the customer, a tracking field, private notes and a
  printable **GST invoice**. **Refund** sends money back to the customer through Razorpay (full or part); a full
  refund can also cancel the order and put the items back in stock. Refunds reach the customer in 5-7 working days.
- **Products:** add or edit products and photos, price, sale price, category, style, colours, HSN code and
  **stock per size**. On the product list, click **Trending** (shown in "Trending Now" on the home page),
  **Bestseller** (badge and Bestsellers filter) or **New** to switch them on or off instantly.
  "Hidden" removes a product from the store without deleting it.
- **Customers:** everyone who has paid, with number of orders, total spent and last order.
- **Discounts:** coupon codes, either % or ₹ off, with an optional minimum order, usage limit and start/end
  dates. Customers enter them at checkout; the server checks every code, so they can't be faked.
- **Carts:** shoppers who typed their email at checkout but didn't pay. Each gets **one** reminder email (once a day,
  for carts idle 3+ hours) with a link that refills their cart. Buyers and anyone who clicked "unsubscribe" are never
  emailed. The page shows how many carts were won back.
- **Reviews:** customers review a product with their order number and email, so only real buyers can review. New
  reviews wait here until you **Approve** them; then they show on the product page with star ratings.

Stock goes down when an order is paid and goes back up if you cancel it.

### GST invoices

Each paid order gets an invoice number (INV-00001, INV-00002, … with no gaps, as GST requires). The invoice
splits each price into taxable value + GST, as **CGST + SGST** for customers in your state or **IGST** for other
states. Open an order and click **GST Invoice**, then **Print / Save as PDF**.
Before issuing invoices, fill in your GSTIN and registered address in `src/config/site.ts`, add HSN codes to your
products, and **have your CA confirm the GST rates** in `shared/store.ts` (currently 5% up to ₹2,500 per piece,
18% above).

---

## Going live

You need three free accounts: Supabase, Razorpay and Vercel. Do the steps in this order.

### 1. Supabase (database)

1. Create a project at <https://supabase.com> (choose the Mumbai region).
2. **Create the tables:** open **SQL Editor** and run each file in `supabase/migrations/` **in order** (oldest date first).
3. **Optional starter products:** run `supabase/seed.sql` the same way to add the 7 original products.
   Their photos come from this website's `public/` folder.
4. **Turn off public sign-ups:** **Authentication → Sign In / Providers**, turn off "Allow new users to sign up".
5. **Create your admin login:** **Authentication → Users → Add user** (email + password, auto-confirm). Then in
   the SQL Editor run:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'you@example.com';
   ```
6. From **Project Settings → API**, note the Project URL, the `anon` public key and the `service_role` secret key.

### 2. Razorpay (payments)

1. Sign up at <https://razorpay.com>. Test mode works right away. Live payments need KYC, which checks that your
   website has Privacy, Terms, Refund/Cancellation, Shipping and Contact pages.
2. **Account & Settings → API Keys:** generate keys (start with **test** keys).
3. **Account & Settings → Payment capture:** make sure payments are **captured automatically**. Payments that are
   only authorised get refunded to the customer after a few days.
4. After deploying (step 3), go to **Webhooks → Add new webhook**:
   - URL: `https://yourdomain.com/api/razorpay-webhook`
   - Secret: make up a long random string and keep it for the env vars
   - Events: `payment.captured`, `order.paid`, `refund.processed` and `refund.failed`

### 3. Vercel (hosting)

1. Push this repository to GitHub and import it at <https://vercel.com/new>. The defaults are correct.
2. Add these **Environment Variables** (Project Settings → Environment Variables):

   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | Supabase Project URL |
   | `VITE_SUPABASE_ANON_KEY` | Supabase `anon` key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase `service_role` key (**secret**) |
   | `RAZORPAY_KEY_ID` | `rzp_test_…` (later `rzp_live_…`) |
   | `RAZORPAY_KEY_SECRET` | Razorpay key secret (**secret**) |
   | `RAZORPAY_WEBHOOK_SECRET` | the webhook secret you chose |
   | `SITE_URL` | your live address, e.g. `https://shreemlifestyle.com` (used in email links) |
   | `CRON_SECRET` | any long random string (protects the daily cart-reminder job) |

3. Deploy, then connect your domain under **Settings → Domains**.
4. Place a test order with Razorpay's test UPI ID `success@razorpay` and check it appears in `/admin`.
5. To go live, swap in your `rzp_live_…` keys and redeploy.

### 4. Your details

- `src/config/site.ts`: WhatsApp number, phone, email, address, social links. **Every value marked TODO is a
  placeholder.**
- `src/config/site.ts` → `business`: legal name, **GSTIN** and registered address for invoices.
- `shared/store.ts`: the shipping fee, free-shipping threshold and GST rates. These apply to both the website and
  the amount actually charged.
- `src/pages/AboutPage.tsx` and `src/pages/ContactPage.tsx`: placeholder stats, timeline and FAQ (marked TODO).

### Optional extras

- **Emails** ([Resend](https://resend.com)): set `RESEND_API_KEY`, `ORDER_EMAIL_FROM` (an address on a domain
  verified in Resend) and `ORDER_NOTIFY_EMAIL` (where new-order alerts go). This turns on order confirmations for
  customers, new-order alerts for you, and **cart reminder emails**. Without Resend, carts are still saved and listed
  in /admin but no reminders are sent. The reminder job runs daily at 10:00 IST (`vercel.json`); Vercel's free plan
  allows one run per day.
- **Contact form + newsletter by email** ([Formspree](https://formspree.io)): set `VITE_FORMSPREE_ID`. Without
  it, the contact form sends the message through WhatsApp.

---

## Local development

Requires Node.js 20+ and Docker Desktop.

```bash
npm install
npx supabase start   # local database, login and storage in Docker (ports 55321-55323)
npm run dev          # store + checkout API at http://localhost:5173
```

The first `supabase start` downloads Docker images. It creates its own containers (`supabase_*_shreem_lifestyle`)
on ports 553xx, so it can run alongside other local Supabase projects.

Put the local keys in `.env.local` (`npx supabase status` prints them):

```
VITE_SUPABASE_URL=http://127.0.0.1:55321
VITE_SUPABASE_ANON_KEY=<ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=anything-for-local
```

Create a local admin with the same SQL as step 1.5. Local Studio (database browser) is at <http://127.0.0.1:55323>.
`npx supabase db reset` restores the starter data. `npx supabase stop` stops the containers.

Without Supabase keys the site still runs: it shows the 7 built-in products and takes orders on WhatsApp.

## Project layout

```
api/                     Vercel functions: checkout, payments, webhook, refunds, cart reminders, reviews
shared/store.ts          shipping rules, order types (used by site + api)
supabase/migrations/     database tables, security rules, stock function
supabase/seed.sql        starter products
src/config/site.ts       business details (edit this)
src/admin/               /admin panel (dashboard, orders, refunds, invoices, products, customers, discounts, carts, reviews)
src/pages/               store pages incl. lookbook, checkout and order confirmation
src/components/          navbar, footer, cart drawer, search, product card
src/context/             catalog and cart state
public/                  images, favicon, logo
```
