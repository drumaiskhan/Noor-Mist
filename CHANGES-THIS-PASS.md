# Changes in this pass

## 1. WhatsApp: credentials now configurable from Admin (not just env vars)

Previously `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_ACCESS_TOKEN` /
`WHATSAPP_API_VERSION` could only be set as Railway backend environment
variables — the admin UI just displayed whether they were set. Now they can
be entered directly in **Admin → WhatsApp Notifications → Meta API
Connection**, stored in the database (same pattern as SMTP/API email
credentials — access token is write-only, never echoed back). Environment
variables still work as a fallback for anyone who hasn't moved to the admin
UI yet; a database value always wins if present.

Files touched:
- `backend/services/whatsappService.js` — `getCredentials()`,
  `credentialsConfigured()`, `getConnectionStatus()` are now async and
  check the `settings` table first; added `saveCredentials()` and
  `clearCredentials()`.
- `backend/routes/whatsapp.js` — new `PUT /admin/whatsapp/credentials` and
  `DELETE /admin/whatsapp/credentials`; `GET /settings` now also returns a
  `credentials` block (phone number ID, whether a token is set, API
  version, and whether the source is `admin` or `environment`).
- `frontend/src/services/api.js` — `whatsappAPI.saveCredentials` /
  `deleteCredentials`.
- `frontend/src/pages/admin/WhatsAppSettings.jsx` — new "Meta API
  Connection" card with Phone Number ID, Access Token (masked, "leave
  blank to keep current"), API Version, Save/Remove.

## 2. Email SMTP / API failover — reviewed, no code bug found

Read through `backend/services/email.js` and `backend/routes/email.js` in
full. The failover system you're asking for already exists and is fairly
deep:
- SMTP **and** 6 built-in API providers (Brevo, SendGrid, Mailgun,
  Postmark, Resend) **and** a fully custom API provider (arbitrary URL /
  HTTP method / JSON headers / JSON body template with `{{token}}`
  substitution).
- Each provider's credentials are stored independently
  (`email_creds_<provider>` / `smtp_*`), so several can be configured at
  once.
- One provider is the **primary** (`email_provider`); a **backup order**
  (`email_provider_priority`) is tried automatically on failure, and any
  other configured provider not explicitly ordered is appended as a final
  safety net (`resolveProviderChain`).
- Every attempt (success or failure) is logged per-provider to
  `email_delivery_logs`, visible in Admin → Email Settings → Logs.
- All of this is already exposed in the Admin → Email Settings → Delivery
  tab (provider cards, "Backup & Failover Providers" section, per-provider
  Test buttons, "Set as Primary").

**If SMTP still isn't sending**, the most likely cause is infrastructure,
not code: many hosts (Railway Free/Hobby tier included, per the existing
code comments) block outbound SMTP ports (25/465/587/2525) entirely, so
the connection just hangs until it times out — no credential is "wrong."
The fix is to configure at least one HTTPS API provider (any of Brevo /
SendGrid / Mailgun / Postmark / Resend / Custom API — all use port 443,
which is never blocked) as your **primary**, and keep SMTP as a backup if
you like. Free tiers exist for Brevo (300/day) and Resend (100/day /
3,000/month) if you want to test this quickly.

If you're seeing a *specific* error message when testing SMTP, send it
over and I can dig into that exact failure instead of guessing.

## 3. Admin sidebar — actual root cause found and fixed (from your screenshots)

Your two screenshots showed the nav content itself shifting between them
(Marketing & SEO/Settings visible in one, Email/Payment & Shipping in the
other) while the main content also scrolled — meaning the sidebar wasn't
actually pinned to the screen at all. It was scrolling along with the
page, and once its own content (nav + profile + Logout) ran out, the rest
of the page kept scrolling past empty space where the sidebar used to be.
That's what read as "short."

Root cause: `frontend/src/styles/globals.css` set `overflow-x: hidden` on
both `html` and `body` (added earlier to stop horizontal scroll on
product pages). Per the CSS spec, setting `overflow-x` to anything other
than `visible` while leaving `overflow-y` unset forces the browser to
compute `overflow-y: auto` too — silently turning `<html>`/`<body>` into
their own internal scroll container instead of the true browser viewport.
`position: sticky` (which `AdminLayout.jsx`'s `<aside>` uses on desktop)
then calculates "stuck" relative to *that* container instead of the
viewport, and effectively stops working — this is one of the most common
"why doesn't my sticky sidebar stick" bugs in CSS.

Fix: changed `overflow-x: hidden` → `overflow-x: clip` on `html`, `body`,
and `#root`. `clip` blocks the same horizontal overflow (so the original
mobile product-page fix this was protecting is untouched) without the
scroll-container side effect, so `position: sticky` now works correctly
site-wide — not just in the admin sidebar, but anywhere else sticky is
used too. The earlier `lg:h-screen` height hardening on the `<aside>`
(from the previous pass) is still in place as a belt-and-suspenders fix.

Note: `frontend/src/components/Admin/Sidebar.jsx` is dead code — it's not
imported anywhere; `AdminLayout.jsx` is the sidebar actually in use. Left
it in place untouched since removing unused files wasn't asked for.

## 4. SMTP test error — clearer diagnostics added

Read through the whole SMTP send path again; the code was already
catching every failure and returning a proper JSON `{ error: "..." }` (not
a raw, unhelpful "Internal Server Error") — so the 500 you're seeing is a
real, correctly-reported SMTP connection failure, not a crash. Since I
can't reproduce your exact network/provider from this environment, I
made the error message itself do more of the diagnosis:
`backend/routes/email.js`'s `/test-connection` route now inspects the
underlying error code (`ETIMEDOUT`, `ECONNREFUSED`, `EAUTH`, TLS/SSL
mismatches, `ENOTFOUND`, etc.) and appends a plain-language explanation —
e.g. a timeout now explicitly says the port is probably blocked by your
network/host and suggests switching to an API provider, an auth failure
tells you to check for an app-password requirement, and a TLS error tells
you to check the Encryption/port pairing.

**Next time you hit it**, the toast (or the Network tab response body for
that request) will show the full message with the hint attached — send
that over and I can pin down the exact cause instead of guessing at
categories.

## Verified

- `npm install && npm run build` in `frontend/` — builds clean, no errors.
- `node --check` on every modified backend file — no syntax errors.
- Backend server boots successfully (`node server.js`) with all routes
  mounted; only errors are the expected "no local Postgres available in
  this sandbox" migration failures, which are already caught/logged and
  non-fatal by design.
