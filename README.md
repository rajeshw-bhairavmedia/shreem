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

- **Orders:** tabs for To ship, Shipped, Delivered, Cancelled and Awaiting payment (checkouts the customer
  never paid for). Each order shows the items, the delivery address, a WhatsApp link to the customer, a tracking
  field and private notes. Cancelling an order does **not** refund it. Refund from the Razorpay dashboard.
- **Products:** add or edit products and upload photos (the first photo is the main one). Set price, original
  price (for a sale badge), category (Men / Women / Occasion Wear), style (Casual / Formal / Traditional),
  colours, and **stock per size**. Untick "Visible in store" to hide a product without deleting it.

Stock goes down automatically when an order is paid. It does not go back up when you cancel. Adjust it by hand.

---

## Going live

You need three free accounts: Supabase, Razorpay and Vercel. Do the steps in this order.

### 1. Supabase (database)

1. Create a project at <https://supabase.com> (choose the Mumbai region).
2. **Create the tables:** open **SQL Editor**, paste all of `supabase/migrations/20261005000000_store.sql`, and run it.
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
   - Events: `payment.captured` and `order.paid`

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

3. Deploy, then connect your domain under **Settings → Domains**.
4. Place a test order with Razorpay's test UPI ID `success@razorpay` and check it appears in `/admin`.
5. To go live, swap in your `rzp_live_…` keys and redeploy.

### 4. Your details

- `src/config/site.ts`: WhatsApp number, phone, email, address, social links. **Every value marked TODO is a
  placeholder.**
- `shared/store.ts`: the shipping fee and free-shipping threshold. These apply to both the website and the
  amount actually charged.
- `src/pages/AboutPage.tsx` and `src/pages/ContactPage.tsx`: placeholder stats, timeline and FAQ (marked TODO).

### Optional extras

- **Order emails** ([Resend](https://resend.com)): set `RESEND_API_KEY`, `ORDER_EMAIL_FROM` (an address on a
  domain verified in Resend) and `ORDER_NOTIFY_EMAIL` (where new-order alerts go). Customers then get a
  confirmation email and you get an alert for every paid order. Razorpay also emails you about each payment.
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
api/                     Vercel functions: create-order, verify-payment, razorpay-webhook
shared/store.ts          shipping rules, order types (used by site + api)
supabase/migrations/     database tables, security rules, stock function
supabase/seed.sql        starter products
src/config/site.ts       business details (edit this)
src/admin/               /admin panel (orders, products)
src/pages/               store pages incl. checkout and order confirmation
src/components/          navbar, footer, cart drawer, search, product card
src/context/             catalog and cart state
public/                  images, favicon, logo
```
