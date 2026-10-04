# Shreem Lifestyle

The Shreem Lifestyle storefront: React + Vite + Tailwind, with a cart and checkout powered by
**Shopify** (products, stock, orders) and **Razorpay** (UPI, cards, netbanking) through Shopify's checkout.

The site works in two modes:

| | Without Shopify keys | With Shopify keys |
|---|---|---|
| Products | The 7 products in `src/data/products.ts` | Everything in your Shopify admin |
| Cart | Works (saved in the browser) | Works (saved in the browser) |
| Checkout | Sends the full order to your WhatsApp | Shopify checkout, paid via Razorpay. A WhatsApp option is also offered |
| Stock / sold out | Not tracked | Live from Shopify |

## Running it

Requires Node.js 20+.

```bash
npm install
npm run dev        # development server at http://localhost:5173
npm run build      # production build into dist/
python serve.py    # serve dist/ at http://localhost:8000
```

## 1. Put in your business details

Edit **`src/config/site.ts`**. Every value marked `TODO` is a placeholder: WhatsApp number, phone,
email, address, social links. **The WhatsApp number is a dummy number until you change it.** Orders sent
before then go nowhere.

Also review the placeholder content marked `TODO` in `src/pages/AboutPage.tsx` (stats, journey timeline)
and the FAQs in `src/pages/ContactPage.tsx`.

## 2. Connect Shopify (products, stock and orders)

1. Create a Shopify store at <https://www.shopify.com> (the Basic plan is enough).
2. In Shopify admin: **Sales channels → Add → Headless**, then create a storefront and copy the
   **public access token** from the Storefront API section.
3. Copy `.env.example` to `.env` and fill in:
   ```
   VITE_SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
   VITE_SHOPIFY_STOREFRONT_TOKEN=the-public-token
   ```
4. Rebuild (`npm run build`). The site now loads products from Shopify.

### Adding products in Shopify

Use **product tags** to place each product on the site:

| Tag | Effect |
|---|---|
| `men`, `women` or `occasion` | Main category (Men / Women / Occasion Wear) |
| `casual`, `formal` or `traditional` | Style under Men or Women |
| `new` | "New" badge, shown in New Arrivals |
| `bestseller` | "Bestseller" badge, shown in Trending Now |

- Add options named **Size** and **Color** to get the size and colour pickers. Each combination is a
  variant with its own stock.
- Set a **Compare-at price** higher than the price to show a sale badge and the "% OFF" label.
- The first product image is used on cards. All images appear on the product page.

## 3. Turn on Razorpay payments

Payments happen on Shopify's secure checkout, so there is no payment code in this site.

1. Create a Razorpay account at <https://razorpay.com> and complete KYC.
2. In Shopify admin: **Settings → Payments → Add payment methods**, search for **Razorpay**, install
   it, and connect your Razorpay account.
3. Place a test order to confirm.

Razorpay's KYC reviews your website. It expects Privacy, Terms, Refund/Cancellation, Shipping and
Contact pages. Shopify can generate policy templates under **Settings → Policies**. Customise those
before applying.

## 4. Contact form and newsletter (optional)

Without setup, the contact form opens WhatsApp with the message filled in, and the newsletter opens the
visitor's email app. To receive both by email instead:

1. Create a free form at <https://formspree.io> using your business email.
2. Put its ID in `.env`: `VITE_FORMSPREE_ID=xyzabcde`, then rebuild.

## 5. Deploy

Any static host works. The build output is the `dist/` folder.

- **Netlify:** build command `npm run build`, publish directory `dist`. `public/_redirects` handles page routes.
- **Vercel:** import the repo. `vercel.json` handles page routes.

Add the same `VITE_…` environment variables in the host's settings, since `.env` is not committed.

## Project layout

```
src/
  config/site.ts        business details (edit this)
  data/products.ts      local product list (used without Shopify)
  data/categories.ts    Men / Women / Occasion Wear, and Casual / Formal / Traditional
  lib/shopify.ts        Shopify Storefront API: products + checkout
  lib/utils.ts          prices, WhatsApp orders, search, Formspree
  context/              catalog and cart state
  components/           navbar, footer, cart drawer, search, product card
  pages/                home, collections, product, about, contact
public/                 images, favicon, logo
```
