# Kuthari Beauty Store

The online shop for Kuthari Beauty Store, Sano Bazar, Brahmapur (Odisha). Customers buy cosmetics, skincare, haircare and salon products by the piece at retail price or by the box at bulk price, pay online, and get delivery across India. Staff run the shop from `/admin`, and delivery staff use `/delivery`.

## Stack

- Next.js 16 (App Router, `src/proxy.ts` instead of middleware), React 19, Tailwind CSS 4
- Supabase: Postgres, Storage and Auth (phone OTP via Message Central)
- Razorpay for payments (online only, no cash on delivery)
- Resend for transactional email; OpenRouter for the optional admin AI copy tools
- Hosted on Vercel, with two daily crons (`vercel.json`)

## Run locally

```bash
npm install
cp .env.local.example .env.local   # then fill in the values
npm run dev
```

## Environment

All variables are listed with notes in `.env.local.example`. Checkout needs these four to work:

| Variable | Why |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Database |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Payments. Also switch Razorpay on in Admin → Settings |
| `RAZORPAY_WEBHOOK_SECRET` | Records captured payments so lost checkouts are caught |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Order emails. The from-address must be on a domain verified in Resend |
| `CRON_SECRET` | Lets Vercel Cron call `/api/cron/*` |

## Database

SQL migrations live in `supabase/migrations` and are applied in filename order in the Supabase SQL editor. A few numbers were used twice early on (012 to 016). Those pairs are independent of each other, so either can run first.

Customer tables (profiles, addresses, orders) have no browser access. Every read and write goes through API routes using the service-role key. Migration `039` enforces this, so keep new customer tables the same way.

## Payments

Set in Admin → Settings → Payments:

- **Pay online** (Razorpay): the full amount, whenever Razorpay is on.
- **Cash on Delivery**: switch on to let customers pay the full amount in cash.
- **Part payment for bulk orders**: while COD is off, an order with any box or pack in it can pay a set share online (10–90%) and the rest in cash on delivery. The delivery app collects only the balance.

The order API enforces the same rules as the checkout (`availablePaymentModes` in `src/lib/cart/delivery.ts`). Part payment needs migration 042.

## Applying database changes

`supabase/RUN_039_TO_043.sql` applies migrations 039–043 in one transaction, after snapshotting `orders` and `cms_content` into backup tables. Paste it into the Supabase SQL editor and run it once.

## Scheduled jobs

| Route | When (UTC) | What |
| --- | --- | --- |
| `/api/cron/low-stock` | 02:30 daily | Emails admins about products at or below their low-stock threshold |
| `/api/cron/reconcile-payments` | 03:00 daily | Emails admins about Razorpay payments that never became an order, and clears old rate-limit counters |

## Design

The storefront takes its layout and motion from the client's reference (plumo.framer.website), in the client's palette: `#292966`, `#5C5C99`, `#A3A3CC` and `#CCCCFF`. Type is Anton for display, Fraunces italic for accent lines and Familjen Grotesk for body. Every colour and face is a token in `src/app/globals.css`. Statement heads use the `display` utility, and the italic line under them uses `accent-line`.
