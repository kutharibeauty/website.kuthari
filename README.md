# Kuthari Beauty Store

The online shop for Kuthari Beauty Store, Sano Bazar, Brahmapur (Odisha). Customers buy cosmetics, skincare, haircare and salon products by the piece at retail price or by the box at bulk price, pay online, and get delivery across India. Staff run the shop from `/admin`, and delivery staff use `/delivery`.

## Stack

- Next.js 16 (App Router, `src/proxy.ts` instead of middleware), React 19, Tailwind CSS 4
- Supabase: Postgres and Auth (phone OTP via Message Central)
- Cloudflare R2 for images, served by a small Worker (`cloudflare/media-worker`)
- Razorpay for online payments, with optional cash on delivery and part payment (see Payments)
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

Razorpay features in use:

- **Checkout**: UPI is listed first, a failed payment can be retried in the same window, saved cards are remembered, and Android reads the OTP automatically. Each Razorpay order carries the customer's name, phone and payment mode in its notes, so it can be searched in the dashboard.
- **Automatic refunds**: cancelling an order, whether the customer does it or staff do, refunds whatever was paid online (`src/lib/orders/refund.ts`). Speed is "optimum", so the refund is instant where the bank supports it. The admin order page shows the refund status and has a **Refund online payment** button for a failed or missed refund.
- **Doorstep payment links**: the delivery app creates a payment link for the amount due. It is texted to the customer and shown as a QR, and it marks itself paid when the customer pays.
- **Webhook** (`/api/webhooks/razorpay`): in Razorpay Dashboard → Settings → Webhooks, add `https://www.kutharibeauty.com/api/webhooks/razorpay` with the events `payment.captured`, `payment.failed`, `refund.processed`, `refund.failed` and `payment_link.paid`, and put its secret in `RAZORPAY_WEBHOOK_SECRET`.

Refunds and payment links need migrations 046 and 047.

## Applying database changes

`supabase/RUN_039_TO_043.sql` applies migrations 039–043 in one transaction, after snapshotting `orders` and `cms_content` into backup tables. All migrations up to 051 are applied on the live database (as of 5 November 2026).

## Cancellations and damaged items

- Customers can cancel only while an order is **Placed**. Once staff confirm it, the cancel button goes and the API refuses. Paid online orders are refunded automatically on cancellation.
- After delivery, customers have **48 hours** (`ISSUE_WINDOW_HOURS` in `src/lib/orders/issues.ts`) to report a damaged, faulty, wrong, missing or expired item from their order page. They pick the items, give a reason, add up to five photos, and choose a replacement or an exchange. **No money is refunded for delivered orders.**
- Every staff member who gets order emails is notified. Staff review the request under **Admin → Damaged items**, then approve or reject it (a rejection needs a reason, which the customer sees). On approval the team gets an email with everything needed to book the replacement: name, phone, WhatsApp, email, address, items and photos. The same details are on the request page with a copy button. **Mark replacement sent** closes it. The customer is emailed at every step.
- The data is in `order_issues` (migration 048). Photos go to R2 under `claims/`.

## Images

Product and banner images live in the R2 bucket `kuthari-media` on the Cloudflare account kuthari.dev@gmail.com. The `kuthari-media` Worker serves them at `https://media.kutharibeauty.com/product-images/<file>` (also reachable at kuthari-media.kuthari-dev.workers.dev) with a one-year cache, and accepts uploads only with `Authorization: Bearer <UPLOAD_SECRET>`.

- The admin upload route (`/api/upload` → `src/lib/media.ts`) sends files there when `NEXT_PUBLIC_MEDIA_URL` and `MEDIA_UPLOAD_SECRET` are set. Without them it uses Supabase Storage.
- To change the Worker: edit `cloudflare/media-worker/worker.js`, then run `npx wrangler deploy` in that folder.
- Migration `045` moved the stored URLs from Supabase to the Worker. `050` moved them onto media.kutharibeauty.com, and `051` moved them back to workers.dev for now, because some ISPs still cached the old Hostinger nameservers and couldn't resolve the media domain. Re-run `050` (and set NEXT_PUBLIC_MEDIA_URL to the media domain) once the nameserver change has spread, about 48 hours after 5 November 2026. The Supabase copies were kept.

## Scheduled jobs

| Route | When (UTC) | What |
| --- | --- | --- |
| `/api/cron/low-stock` | 02:30 daily | Emails admins about products at or below their low-stock threshold |
| `/api/cron/reconcile-payments` | 03:00 daily | Emails admins about Razorpay payments that never became an order, and clears old rate-limit counters |

## Design

The storefront takes its layout and motion from the client's reference (plumo.framer.website), in the client's palette: `#292966`, `#5C5C99`, `#A3A3CC` and `#CCCCFF`. Type is Anton for display, Fraunces italic for accent lines and Familjen Grotesk for body. Every colour and face is a token in `src/app/globals.css`. Statement heads use the `display` utility, and the italic line under them uses `accent-line`.
