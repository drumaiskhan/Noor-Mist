# Noor Mist consolidated fixes

This build consolidates the latest fixes into one project.

## Included
- Admin sidebar stays full-height with its own contained scroll (`h-dvh`/`min-h-0`), independent of the page underneath — it no longer shrinks/collapses on scroll.
- Digital Wallets folded into Payment & Shipping → Payment Methods: EasyPaisa, JazzCash, SadaPay, NayaPay, and Raast are configured directly under their own method card (mobile number, username, Raast ID, linked bank, QR code) instead of a separate tab, and toggling a wallet on/off now keeps the wallet record and the checkout-facing payment method in sync in both directions.
- Debit / Credit Card wired to Safepay's Hosted (Express) Checkout: admin enters Public/Private/Webhook keys and environment (Sandbox/Production) under the Card method; checkout creates a payment tracker + auth token, redirects to Safepay's hosted page, and returns to `/order/card-result`, which verifies the tracker server-side (and a `payment.succeeded` webhook independently confirms it) before marking the order `paid`/`confirmed`.
- New order columns for card payments: `payment_provider`, `payment_tracker`, `payment_transaction_id`, `payment_paid_at`, `payment_token_hash` — added via `ADD COLUMN IF NOT EXISTS`, so existing databases are never dropped.
- Email Delivery: provider configuration, test connection, editable test email, templates, automations, broadcasts, scheduling, drafts, previews, test sends, delivery logs and refresh.
- First-time account verification by email link and OTP; normal password login afterward.
- Dynamic public-site URL; no example.com or old Render API URL hardcoded in application source.
- Order confirmation links are idempotent and show a confirmed state when reopened.
- Customer order-progress emails for confirmed, processing, packed, shipped, delivered, cancelled and refunded statuses.
- Admin shipment management with carrier, tracking number and tracking URL.
- Public `/track-order` page with carrier tracking and status timeline.
- Coupon creation/edit/delete with immediate cache update and working refresh.
- Payment & Shipping admin fixes, including wallet toggle syntax and existing database migrations.
- Homepage Builder data refresh and reorder fixes.
- Broadcast history refresh.
- Shipment sidebar route and `HiTruck` import.
- Payment approval/refund customer status emails.
- Order status history for customer tracking.

## Local setup
1. Copy `backend/.env.example` to `backend/.env` and fill in your database/auth/email values.
2. Keep `frontend/.env` as `VITE_API_URL=http://localhost:3001` (or set your desired backend URL).
3. Install dependencies in both `backend` and `frontend`.
4. Run the backend and frontend dev servers separately.
