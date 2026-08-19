// WhatsApp order-notification service — Meta WhatsApp Business Cloud API.
//
// Mirrors the structure of services/email.js: self-migrating schema,
// settings read from the database (admin-editable), a render() helper for
// {{variable}} substitution, and typed send functions the rest of the app
// calls. WhatsApp credentials (Phone Number ID / Access Token / API
// version) are admin-configurable from the Admin > WhatsApp Notifications
// screen, stored in the `settings` table the same way SMTP/API email
// credentials are — the access token is write-only (never echoed back to
// the frontend, only whether one is set). Railway/environment variables
// (WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN, WHATSAPP_API_VERSION)
// remain a fallback for local dev / accounts that haven't moved to the
// admin UI yet — the database value always wins when present. See
// getCredentials() below.
//
// ── Why messages are sent as Meta "template" type, not free text ──────────
// Meta's Cloud API only allows free-form text messages inside a 24-hour
// window after the *customer* messages the business first. An automatic
// order-confirmation message is, by definition, business-initiated with no
// prior customer message, so it MUST be sent as a pre-approved WhatsApp
// message template (created and approved inside Meta Business Manager —
// this backend cannot create or approve templates on Meta's side, that is
// a manual one-time setup step, documented in the admin UI and README).
//
// The admin-editable "message template" stored here is Noor-Mist's local
// mirror of that approved template's body, using {{variable}} placeholders
// for readability/preview. When a message is sent, the variables are
// extracted **in the order they first appear** in that text and passed to
// Meta as positional body parameters ({{1}}, {{2}}, {{3}}, ...) — so the
// approved Meta template's placeholder order must match the order
// variables appear in this editor. This mapping is surfaced explicitly in
// the admin UI (see routes/whatsapp.js GET /settings -> variable_mapping).

const { query } = require('../config/database');
const { normalizePhone, isValidPhone, maskPhone } = require('../utils/phone');

const DEFAULT_MESSAGE_TEMPLATE = `🌟 Noor-Mist — Order Confirmed

Thank you, {{customer_name}}!

Your order has been successfully received.

Order Number: {{order_number}}
Total: Rs. {{order_total}}
Payment Method: {{payment_method}}

We'll process your order shortly.

Thank you for choosing Noor-Mist.
Be the Scent. ✨`;

const SUPPORTED_VARIABLES = [
  'customer_name', 'order_number', 'order_total', 'payment_method',
  'order_status', 'order_date', 'phone', 'shipping_address', 'city',
  'tracking_number', 'store_name', 'store_phone', 'store_website',
];

const TRIGGER_TYPES = ['order_created', 'payment_confirmed', 'admin_confirms_order'];

// ── Schema (self-migrating, additive-only — same pattern as email.js) ────
async function ensureWhatsappSchema() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS whatsapp_settings (
        id SERIAL PRIMARY KEY,
        enabled BOOLEAN NOT NULL DEFAULT false,
        order_confirmation_enabled BOOLEAN NOT NULL DEFAULT true,
        trigger_type VARCHAR(30) NOT NULL DEFAULT 'order_created',
        message_template TEXT NOT NULL DEFAULT '',
        template_name VARCHAR(100) DEFAULT '',
        template_language VARCHAR(20) NOT NULL DEFAULT 'en_US',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await query(`ALTER TABLE whatsapp_settings ADD COLUMN IF NOT EXISTS template_name VARCHAR(100) DEFAULT ''`);
    await query(`ALTER TABLE whatsapp_settings ADD COLUMN IF NOT EXISTS template_language VARCHAR(20) NOT NULL DEFAULT 'en_US'`);

    await query(`
      CREATE TABLE IF NOT EXISTS whatsapp_messages (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
        customer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        phone VARCHAR(20),
        message_type VARCHAR(30) NOT NULL DEFAULT 'order_confirmation',
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('sent','failed','pending','skipped')),
        provider_message_id VARCHAR(255),
        error_message TEXT,
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_order_id ON whatsapp_messages(order_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at ON whatsapp_messages(created_at DESC)`);

    const existing = await query('SELECT id FROM whatsapp_settings LIMIT 1');
    if (!existing.rows.length) {
      await query(
        `INSERT INTO whatsapp_settings (enabled, order_confirmation_enabled, trigger_type, message_template)
         VALUES (false, true, 'order_created', $1)`,
        [DEFAULT_MESSAGE_TEMPLATE]
      );
    }
  } catch (e) {
    console.error('whatsapp schema migration:', e.message);
  }
}
ensureWhatsappSchema();

// ── Settings ───────────────────────────────────────────────────────────
async function getSettings() {
  const result = await query('SELECT * FROM whatsapp_settings ORDER BY id ASC LIMIT 1');
  return result.rows[0] || {
    enabled: false, order_confirmation_enabled: true, trigger_type: 'order_created',
    message_template: DEFAULT_MESSAGE_TEMPLATE, template_name: '', template_language: 'en_US',
  };
}

async function updateSettings(patch) {
  const current = await getSettings();
  const merged = {
    enabled: patch.enabled !== undefined ? !!patch.enabled : !!current.enabled,
    order_confirmation_enabled: patch.order_confirmation_enabled !== undefined ? !!patch.order_confirmation_enabled : !!current.order_confirmation_enabled,
    trigger_type: TRIGGER_TYPES.includes(patch.trigger_type) ? patch.trigger_type : (current.trigger_type || 'order_created'),
    message_template: patch.message_template !== undefined ? String(patch.message_template) : current.message_template,
    template_name: patch.template_name !== undefined ? String(patch.template_name).trim() : (current.template_name || ''),
    template_language: patch.template_language !== undefined ? String(patch.template_language).trim() || 'en_US' : (current.template_language || 'en_US'),
  };
  if (current.id) {
    const result = await query(
      `UPDATE whatsapp_settings SET enabled=$1, order_confirmation_enabled=$2, trigger_type=$3, message_template=$4, template_name=$5, template_language=$6, updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [merged.enabled, merged.order_confirmation_enabled, merged.trigger_type, merged.message_template, merged.template_name, merged.template_language, current.id]
    );
    return result.rows[0];
  }
  const result = await query(
    `INSERT INTO whatsapp_settings (enabled, order_confirmation_enabled, trigger_type, message_template, template_name, template_language)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [merged.enabled, merged.order_confirmation_enabled, merged.trigger_type, merged.message_template, merged.template_name, merged.template_language]
  );
  return result.rows[0];
}

// ── Admin-configurable credentials (database, with env-var fallback) ─────
// Stored in the shared `settings` key/value table under whatsapp_* keys —
// same table/pattern email.js uses for smtp_*/email_* settings. The access
// token is the only secret piece; it is never returned to the frontend,
// only whether one is currently set (mirrors smtp_password_set).
async function getDbCredentialRow() {
  const result = await query(
    "SELECT key, value FROM settings WHERE key IN ('whatsapp_phone_number_id','whatsapp_access_token','whatsapp_api_version')"
  );
  const s = {};
  result.rows.forEach((row) => { s[row.key] = row.value; });
  return s;
}

async function getCredentials() {
  const db = await getDbCredentialRow();
  const phoneNumberId = db.whatsapp_phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID || '';
  const accessToken = db.whatsapp_access_token || process.env.WHATSAPP_ACCESS_TOKEN || '';
  const apiVersion = db.whatsapp_api_version || process.env.WHATSAPP_API_VERSION || 'v20.0';
  const source = (db.whatsapp_phone_number_id || db.whatsapp_access_token) ? 'admin' : (process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_ACCESS_TOKEN) ? 'environment' : 'none';
  return { phoneNumberId, accessToken, apiVersion, source };
}

async function credentialsConfigured() {
  const { phoneNumberId, accessToken } = await getCredentials();
  return !!(phoneNumberId && accessToken);
}

// GET /api/admin/whatsapp/settings connection-status helper. Never returns
// the token itself — only whether each piece is present, and where it
// came from (admin-saved vs. environment variable).
async function getConnectionStatus() {
  const { phoneNumberId, accessToken, apiVersion, source } = await getCredentials();
  if (!phoneNumberId || !accessToken) {
    return { state: 'not_configured', label: 'Not Configured', source };
  }
  return { state: 'connected', label: 'Connected', apiVersion, source, phoneNumberIdConfigured: true, accessTokenConfigured: true };
}

// Saves admin-entered credentials. A blank access_token means "keep the
// existing one" — same convention as SMTP password / email API key fields
// elsewhere in the app, so re-saving the phone number ID or API version
// alone never wipes out an already-saved token.
async function saveCredentials({ phone_number_id, access_token, api_version }) {
  const writes = [];
  if (phone_number_id !== undefined) writes.push(['whatsapp_phone_number_id', String(phone_number_id || '')]);
  if (access_token !== undefined && access_token !== '') writes.push(['whatsapp_access_token', String(access_token)]);
  if (api_version !== undefined) writes.push(['whatsapp_api_version', String(api_version || '').trim() || 'v20.0']);
  for (const [key, value] of writes) {
    await query(
      'INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()',
      [key, value]
    );
  }
  return getConnectionStatus();
}

// Clears admin-saved credentials, falling back to environment variables
// (if any) after removal.
async function clearCredentials() {
  await query("DELETE FROM settings WHERE key IN ('whatsapp_phone_number_id','whatsapp_access_token','whatsapp_api_version')");
  return getConnectionStatus();
}

// ── Template variable extraction / rendering ──────────────────────────────
// Extracts {{var}} tokens from a template in the order they FIRST appear —
// this order becomes the Meta template's positional {{1}}, {{2}}, ... params.
function extractVariableOrder(template) {
  const seen = [];
  const re = /{{\s*(\w+)\s*}}/g;
  let m;
  while ((m = re.exec(String(template || '')))) {
    if (!seen.includes(m[1])) seen.push(m[1]);
  }
  return seen;
}

function render(template, vars) {
  return String(template || '').replace(/{{\s*(\w+)\s*}}/g, (_, key) => (vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : ''));
}

// ── Building variables from real order/customer/store data ───────────────
async function getStoreInfo() {
  const result = await query(
    "SELECT key, value FROM settings WHERE key IN ('site_name','email_site_url','page_contact')"
  );
  const s = {};
  result.rows.forEach((row) => { s[row.key] = row.value; });
  let contact = {};
  try { contact = JSON.parse(s.page_contact || '{}'); } catch { contact = {}; }
  return {
    store_name: s.site_name || 'Noor Mist',
    store_phone: contact.whatsapp || contact.phone || '',
    store_website: (s.email_site_url || process.env.SITE_URL || process.env.FRONTEND_URL || '').replace(/\/$/, ''),
  };
}

function orderAddressLine(order) {
  const addr = order.shipping_address || {};
  return [addr.address, addr.city, addr.state].filter(Boolean).join(', ');
}

async function buildVarsFromOrder(order) {
  const addr = order.shipping_address || {};
  const store = await getStoreInfo();
  const customerName = [addr.firstName, addr.lastName].filter(Boolean).join(' ') || 'Customer';
  return {
    customer_name: customerName,
    order_number: order.order_number,
    order_total: Number(order.total_amount || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    payment_method: String(order.payment_method || 'cod').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    order_status: order.status || 'pending',
    order_date: order.created_at ? new Date(order.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
    phone: addr.phone || '',
    shipping_address: orderAddressLine(order),
    city: addr.city || '',
    tracking_number: order.tracking_number || '',
    ...store,
  };
}

function sampleVars() {
  return {
    customer_name: 'Ahmed', order_number: 'NM-1042', order_total: '4,500.00',
    payment_method: 'Cash on Delivery', order_status: 'confirmed', order_date: new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }),
    phone: '+92 300 1234567', shipping_address: '123 Model Town, Lahore', city: 'Lahore',
    tracking_number: 'TRK123456', store_name: 'Noor Mist', store_phone: '+92 300 1234567', store_website: 'https://noormist.com',
  };
}

// ── Meta WhatsApp Business Cloud API call ─────────────────────────────────
async function callMetaSendMessage({ to, templateName, templateLanguage, bodyParams }) {
  const { phoneNumberId, accessToken, apiVersion } = await getCredentials();
  if (!phoneNumberId || !accessToken) {
    const err = new Error('WhatsApp is not configured — add the Phone Number ID and Access Token in Admin > WhatsApp Notifications, or set WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN in the backend environment.');
    err.code = 'not_configured';
    throw err;
  }
  if (!templateName) {
    const err = new Error('No Meta-approved template name is configured for WhatsApp Notifications');
    err.code = 'template_not_configured';
    throw err;
  }

  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: templateLanguage || 'en_US' },
      components: bodyParams.length
        ? [{ type: 'body', parameters: bodyParams.map((text) => ({ type: 'text', text: String(text) })) }]
        : [],
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    if (!res.ok) {
      const metaError = data?.error;
      const detail = metaError?.error_user_msg || metaError?.message || `Meta API returned status ${res.status}`;
      const err = new Error(detail);
      err.code = metaError?.code === 190 ? 'invalid_token' : metaError?.type || 'meta_api_error';
      err.metaError = metaError;
      throw err;
    }
    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      const e = new Error('WhatsApp API request timed out');
      e.code = 'timeout';
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

// ── Logging ────────────────────────────────────────────────────────────
async function logMessage({ orderId, customerId, phone, messageType, status, providerMessageId, errorMessage }) {
  try {
    const result = await query(
      `INSERT INTO whatsapp_messages (order_id, customer_id, phone, message_type, status, provider_message_id, error_message, sent_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [orderId || null, customerId || null, phone || null, messageType || 'order_confirmation', status,
       providerMessageId || null, errorMessage || null, status === 'sent' ? new Date() : null]
    );
    return result.rows[0];
  } catch (e) {
    console.error('whatsapp_messages log:', e.message);
    return null;
  }
}

// ── Core send: order confirmation ─────────────────────────────────────────
// Never throws — WhatsApp must never determine whether an order succeeds.
// Every outcome (sent, failed, skipped) is logged for the admin.
async function sendOrderConfirmationMessage(order) {
  const settings = await getSettings();
  const rawPhone = order.shipping_address?.phone;
  const normalizedForLog = normalizePhone(rawPhone) || rawPhone || null;

  if (!settings.enabled || !settings.order_confirmation_enabled) {
    await logMessage({ orderId: order.id, customerId: order.user_id, phone: normalizedForLog, status: 'skipped', errorMessage: 'WhatsApp notifications are disabled' });
    return { ok: false, reason: 'disabled' };
  }

  const normalized = normalizePhone(rawPhone);
  if (!normalized || !isValidPhone(rawPhone)) {
    await logMessage({ orderId: order.id, customerId: order.user_id, phone: rawPhone || null, status: 'skipped', errorMessage: 'Missing/invalid phone number' });
    return { ok: false, reason: 'invalid_phone' };
  }

  const vars = await buildVarsFromOrder(order);
  const varOrder = extractVariableOrder(settings.message_template);
  const bodyParams = varOrder.map((key) => vars[key] ?? '');

  try {
    const response = await callMetaSendMessage({
      to: normalized,
      templateName: settings.template_name,
      templateLanguage: settings.template_language,
      bodyParams,
    });
    const providerMessageId = response?.messages?.[0]?.id || null;
    await logMessage({ orderId: order.id, customerId: order.user_id, phone: normalized, status: 'sent', providerMessageId });
    return { ok: true, providerMessageId };
  } catch (error) {
    console.error('WhatsApp send failed for order', order.order_number, ':', error.message);
    await logMessage({ orderId: order.id, customerId: order.user_id, phone: normalized, status: 'failed', errorMessage: error.message });
    return { ok: false, reason: error.code || 'send_failed', error: error.message };
  }
}

// Fires (or skips) an order-confirmation WhatsApp send based on the
// admin's configured trigger, without ever affecting the calling route's
// own success response. Safe to call as `notifyOrderEvent(...).catch(...)`.
//
// eventType: 'order_created' | 'order_confirmed'
// 'order_confirmed' covers BOTH the "Payment Confirmed" and "Admin Confirms
// Order" trigger options — in Noor-Mist's existing order/payment
// architecture, every path that confirms payment (proof approval, card
// webhook, card result poll) also sets order.status='confirmed' at the
// same time as an admin manually confirming an order does. There is no
// separate "payment confirmed but order not yet confirmed" state to hook
// into, so both trigger options are wired to this one event.
async function notifyOrderEvent(order, eventType) {
  const settings = await getSettings();

  const fires = eventType === 'order_created'
    ? settings.trigger_type === 'order_created'
    : (settings.trigger_type === 'payment_confirmed' || settings.trigger_type === 'admin_confirms_order');

  // Trigger not applicable to this event at all (e.g. admin configured
  // "payment_confirmed" but this is the order_created event) — nothing to
  // log, this event was simply never meant to notify.
  if (!fires) return { ok: false, reason: 'trigger_not_matched' };

  // Trigger matched — delegate to sendOrderConfirmationMessage(), which
  // independently re-checks enabled/order_confirmation_enabled and phone
  // validity, and always writes a log row (sent/failed/skipped) so the
  // admin's WhatsApp Logs page has a complete audit trail either way.
  return sendOrderConfirmationMessage(order);
}

// ── Admin: manual send/retry for a specific order (bypasses trigger check,
// but still respects the enabled toggle and phone validation) ────────────
async function sendForOrder(order) {
  return sendOrderConfirmationMessage(order);
}

async function retryMessage(messageId) {
  const result = await query('SELECT * FROM whatsapp_messages WHERE id=$1', [messageId]);
  if (!result.rows.length) throw new Error('Message log not found');
  const log = result.rows[0];
  if (!log.order_id) throw new Error('This message log has no associated order to retry');
  const orderResult = await query('SELECT * FROM orders WHERE id=$1', [log.order_id]);
  if (!orderResult.rows.length) throw new Error('The order for this message no longer exists');
  return sendOrderConfirmationMessage(orderResult.rows[0]);
}

// ── Admin: test send using sample data ────────────────────────────────────
async function sendTestMessage(toRaw) {
  if (!isValidPhone(toRaw)) {
    const err = new Error('Enter a valid phone number, e.g. +923001234567');
    err.code = 'invalid_phone';
    throw err;
  }
  const settings = await getSettings();
  const to = normalizePhone(toRaw);
  const vars = sampleVars();
  const varOrder = extractVariableOrder(settings.message_template);
  const bodyParams = varOrder.map((key) => vars[key] ?? '');

  const response = await callMetaSendMessage({
    to,
    templateName: settings.template_name,
    templateLanguage: settings.template_language,
    bodyParams,
  });
  await logMessage({ orderId: null, customerId: null, phone: to, messageType: 'test', status: 'sent', providerMessageId: response?.messages?.[0]?.id || null });
  return response;
}

module.exports = {
  DEFAULT_MESSAGE_TEMPLATE,
  SUPPORTED_VARIABLES,
  TRIGGER_TYPES,
  getSettings,
  updateSettings,
  getConnectionStatus,
  credentialsConfigured,
  getCredentials,
  saveCredentials,
  clearCredentials,
  extractVariableOrder,
  render,
  buildVarsFromOrder,
  sampleVars,
  sendOrderConfirmationMessage,
  notifyOrderEvent,
  sendForOrder,
  retryMessage,
  sendTestMessage,
  maskPhone,
};
