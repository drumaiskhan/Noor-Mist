// Safepay Hosted (Express) Checkout integration.
//
// Flow implemented here (per https://safepay-docs.netlify.app/build-your-integration/express-checkout/):
//   1. Create a payment "tracker" (payment session) for the order total.
//   2. Create a short-lived authentication token ("passport").
//   3. Build the Hosted Checkout URL from the tracker + token.
//   4. Redirect the shopper there; Safepay redirects back to redirect_url
//      with ?tracker=... on success.
//   5. Fetch the tracker server-side to confirm its state before trusting
//      the redirect (the redirect alone is not proof of payment) and/or
//      verify the payment.succeeded webhook.
//
// Credentials are admin-configurable (Payment & Shipping → Payment Methods
// → Debit / Credit Card) and stored in the generic `settings` key/value
// table, the same pattern already used for SMTP/email credentials.

const { query } = require('../config/database');

const SETTINGS_PREFIX = 'card_';

async function getCardSettings() {
  const { rows } = await query(`SELECT key, value FROM settings WHERE key LIKE '${SETTINGS_PREFIX}%'`);
  const s = {};
  rows.forEach((r) => { s[r.key] = r.value; });
  return {
    enabled: s.card_enabled === 'true',
    provider: s.card_provider || 'safepay',
    environment: s.card_environment === 'production' ? 'production' : 'sandbox',
    publicKey: s.card_public_key || '',
    secretKey: s.card_secret_key || '',
    webhookSecret: s.card_webhook_secret || '',
    siteUrl: s.card_site_url || '',
  };
}

async function saveCardSetting(key, value) {
  await query(
    `INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`,
    [SETTINGS_PREFIX + key, String(value)]
  );
}

async function deleteCardSetting(key) {
  await query(`DELETE FROM settings WHERE key=$1`, [SETTINGS_PREFIX + key]);
}

function hostFor(environment) {
  return environment === 'production'
    ? 'https://api.getsafepay.com'
    : 'https://sandbox.api.getsafepay.com';
}

function getClient(cfg) {
  if (!cfg.secretKey) throw new Error('Card payments are not fully configured (missing secret key)');
  // Lazy require so the app doesn't crash on boot in environments where the
  // dependency hasn't been installed yet (e.g. this sandbox couldn't run npm
  // install — see README-FIXES.md).
  const Safepay = require('@sfpy/node-core');
  return Safepay(cfg.secretKey, { authType: 'secret', host: hostFor(cfg.environment) });
}

// Some SDK response shapes vary between examples in Safepay's own docs
// (sometimes `response.data.x`, sometimes `response.x`) — unwrap defensively.
function unwrap(response) {
  return response && response.data !== undefined ? response.data : response;
}

/**
 * Create a Safepay payment tracker + auth token for an order, and build the
 * Hosted Checkout URL the shopper should be redirected to.
 */
async function createCheckoutSession({ cfg, order, redirectUrl, cancelUrl }) {
  const safepay = getClient(cfg);

  const amount = Math.round(parseFloat(order.total_amount) * 100); // lowest denomination
  const sessionRes = await safepay.payments.session.setup({
    merchant_api_key: cfg.publicKey,
    intent: 'CYBERSOURCE',
    mode: 'payment',
    entry_mode: 'raw',
    currency: 'PKR',
    amount,
    metadata: { order_id: String(order.id), order_number: order.order_number },
  });
  const sessionData = unwrap(sessionRes);
  const tracker = sessionData?.tracker?.token || sessionData?.tracker;
  if (!tracker) throw new Error('Safepay did not return a payment tracker');

  const passportRes = await safepay.client.passport.create();
  const passportData = unwrap(passportRes);
  const tbt = typeof passportData === 'string' ? passportData : passportData?.token;
  if (!tbt) throw new Error('Safepay did not return an authentication token');

  const checkoutUrl = safepay.checkout.createCheckoutUrl({
    env: cfg.environment,
    tracker,
    tbt,
    source: 'hosted',
    redirect_url: redirectUrl,
    cancel_url: cancelUrl,
  });

  return { tracker, checkoutUrl };
}

/** Fetch the current state of a tracker from Safepay (server-side, authoritative). */
async function fetchTracker({ cfg, tracker }) {
  const safepay = getClient(cfg);
  const res = await safepay.reporter.payments.fetch(tracker);
  const data = unwrap(res);
  return data?.tracker || data;
}

/** True once Safepay reports the tracker as fully settled. */
function isTrackerPaid(tracker) {
  return !!tracker && tracker.state === 'TRACKER_ENDED';
}

/**
 * Verify an incoming webhook's X-SFPY-SIGNATURE header: HMAC-SHA256 of the
 * raw request body, keyed with the webhook secret, hex-encoded.
 */
function verifyWebhookSignature({ rawBody, signature, webhookSecret }) {
  if (!signature || !webhookSecret || !rawBody) return false;
  const crypto = require('crypto');
  const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(String(signature), 'utf8'));
  } catch {
    return false;
  }
}

module.exports = {
  getCardSettings,
  saveCardSetting,
  deleteCardSetting,
  createCheckoutSession,
  fetchTracker,
  isTrackerPaid,
  verifyWebhookSignature,
};
