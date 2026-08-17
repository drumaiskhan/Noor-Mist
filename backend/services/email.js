const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { query } = require('../config/database');

// Fell back to env-only SMTP before — the admin's Email Settings page saved
// smtp_host/smtp_user/etc to the settings table, and /api/email/test read
// them correctly, but real transactional emails (order confirmation, contact
// form) never did. A "successful" test send gave no signal that live orders
// still weren't emailing anyone. Settings table now wins; env vars remain a
// fallback for local dev when nothing has been configured in the admin yet.
function createUnsubscribeToken(user) {
  const secret = process.env.UNSUBSCRIBE_SECRET || process.env.JWT_SECRET || 'local-dev-unsubscribe-secret';
  return crypto.createHmac('sha256', secret).update(`${user.id}:${user.email}`).digest('hex');
}
function verifyUnsubscribeToken(userId, email, token) {
  const secret = process.env.UNSUBSCRIBE_SECRET || process.env.JWT_SECRET || 'local-dev-unsubscribe-secret';
  const expected = crypto.createHmac('sha256', secret).update(`${userId}:${email}`).digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(String(token)), Buffer.from(expected)); } catch { return false; }
}
function getUnsubscribeLink(user, settings) { return `${getPublicSiteUrl(settings)}/api/email/unsubscribe?user=${encodeURIComponent(user.id)}&token=${createUnsubscribeToken(user)}`; }

function getPublicSiteUrl(settings = {}) {
  return String(settings.email_site_url || process.env.SITE_URL || process.env.FRONTEND_URL || process.env.VITE_SITE_URL || 'http://localhost:5173').replace(/\/$/, '');
}

async function getEmailSettings() {
  const result = await query(
    "SELECT key, value FROM settings WHERE key LIKE 'smtp_%' OR key LIKE 'email_%'"
  );
  const s = {};
  result.rows.forEach((row) => { s[row.key] = row.value; });
  return s;
}

async function createTransporter(settings) {
  const host = settings.smtp_host || process.env.EMAIL_HOST;
  if (!host) return null;
  return nodemailer.createTransport({
    host,
    port: parseInt(settings.smtp_port || process.env.EMAIL_PORT || '587'),
    secure: (settings.smtp_secure ?? process.env.EMAIL_SECURE) === 'true',
    auth: {
      user: settings.smtp_user || process.env.EMAIL_USER,
      pass: settings.smtp_password || process.env.EMAIL_PASS,
    },
    // Railway (and some other hosts) resolve SMTP hostnames to IPv6 by
    // default. Many providers (Brevo included) don't answer reliably on
    // IPv6, so the connection just hangs until it hits the timeout below
    // instead of failing fast — forcing IPv4 avoids that entirely.
    family: 4,
    // Same reasoning as routes/email.js's test endpoint — a stalled
    // connection should fail loudly within seconds, not hang forever.
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });
}

// ── HTTP API transports ─────────────────────────────────────────────────
// Raw SMTP (ports 25/465/587/2525) is blocked outbound on Railway's
// Free/Trial/Hobby plans (and by some other hosts too), which made every
// send hang until connectionTimeout regardless of how the credentials were
// configured. The providers below all send over plain HTTPS (443), which is
// never blocked, so an API provider is the recommended default. SMTP
// remains available as a fallback/for any provider not listed here.
async function httpJson(url, { headers, body, method = 'POST', timeoutMs = 10000 }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method, headers, body, signal: controller.signal });
    const text = await res.text();
    let parsed;
    try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = { raw: text }; }
    if (!res.ok) {
      const detail = parsed?.message || parsed?.errors?.[0]?.message || parsed?.Message || parsed?.error || text;
      throw new Error(detail || `Request failed with status ${res.status}`);
    }
    return parsed;
  } finally {
    clearTimeout(timeout);
  }
}

// Each provider takes the same { apiKey, domain, fromName, fromAddress, to,
// subject, html } shape and knows how to translate it into that provider's
// send API. `domain` is only used by Mailgun (its sending domain); every
// other provider ignores it.
const API_PROVIDERS = {
  brevo: {
    label: 'Brevo',
    setupUrl: 'https://app.brevo.com/settings/keys/api',
    fields: [],
    send: ({ apiKey, fromName, fromAddress, replyTo, to, subject, html }) =>
      httpJson('https://api.brevo.com/v3/smtp/email', {
        headers: { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          sender: { name: fromName, email: fromAddress },
          replyTo: replyTo ? { email: replyTo } : undefined,
          to: [{ email: to }],
          subject,
          htmlContent: html,
        }),
      }),
  },
  sendgrid: {
    label: 'SendGrid',
    setupUrl: 'https://app.sendgrid.com/settings/api_keys',
    fields: [],
    send: ({ apiKey, fromName, fromAddress, replyTo, to, subject, html }) =>
      httpJson('https://api.sendgrid.com/v3/mail/send', {
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: fromAddress, name: fromName },
          ...(replyTo ? { reply_to: replyTo } : {}),
          subject,
          content: [{ type: 'text/html', value: html }],
        }),
      }),
  },
  mailgun: {
    label: 'Mailgun',
    setupUrl: 'https://app.mailgun.com/app/account/security/api_keys',
    fields: ['domain'],
    send: ({ apiKey, domain, fromName, fromAddress, replyTo, to, subject, html }) => {
      const form = new URLSearchParams();
      form.set('from', `${fromName} <${fromAddress}>`);
      form.set('to', to);
      if (replyTo) form.set('h:Reply-To', replyTo);
      form.set('subject', subject);
      form.set('html', html);
      return httpJson(`https://api.mailgun.net/v3/${domain}/messages`, {
        headers: {
          Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
      });
    },
  },
  postmark: {
    label: 'Postmark',
    setupUrl: 'https://account.postmarkapp.com/',
    fields: [],
    send: ({ apiKey, fromName, fromAddress, replyTo, to, subject, html }) =>
      httpJson('https://api.postmarkapp.com/email', {
        headers: {
          'X-Postmark-Server-Token': apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          From: `${fromName} <${fromAddress}>`,
          ReplyTo: replyTo || undefined,
          To: to,
          Subject: subject,
          HtmlBody: html,
        }),
      }),
  },
  resend: {
    label: 'Resend',
    setupUrl: 'https://resend.com/api-keys',
    fields: [],
    send: ({ apiKey, fromName, fromAddress, replyTo, to, subject, html }) =>
      httpJson('https://api.resend.com/emails', {
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${fromName} <${fromAddress}>`,
          reply_to: replyTo || undefined,
          to: [to],
          subject,
          html,
        }),
      }),
  },
  // Generic HTTP API provider — for any transactional-email API not listed
  // above (or a private/internal sending gateway). The admin supplies the
  // endpoint, HTTP method, headers, and a JSON body template themselves;
  // {{tokens}} in the URL/headers/body are substituted with the send's
  // actual values before the request goes out. This is what makes SMTP
  // genuinely optional rather than the only option when a store's host
  // blocks outbound SMTP ports (a common Railway Free/Hobby-tier limit).
  custom: {
    label: 'Custom API',
    setupUrl: null,
    fields: ['api_url', 'api_method', 'api_headers', 'api_body_template'],
    send: ({ apiKey, apiUrl, apiMethod, apiHeaders, apiBodyTemplate, fromName, fromAddress, replyTo, to, subject, html }) => {
      if (!apiUrl) throw new Error('Custom API URL is not configured');
      if (!apiBodyTemplate) throw new Error('Custom API body template is not configured');
      const tokens = {
        api_key: apiKey || '',
        to, from_name: fromName || '', from_email: fromAddress || '',
        reply_to: replyTo || '', subject: subject || '',
        // JSON-escaped so the HTML content can sit inside a JSON string
        // literal in the body template without breaking the payload.
        html: JSON.stringify(html || '').slice(1, -1),
      };
      const substitute = (str) => String(str || '').replace(/{{\s*(\w+)\s*}}/g, (_, key) => (tokens[key] !== undefined ? tokens[key] : ''));

      let headers = { 'Content-Type': 'application/json' };
      if (apiHeaders) {
        try { headers = JSON.parse(substitute(apiHeaders)); }
        catch { throw new Error('Custom API headers must be valid JSON, e.g. {"Authorization":"Bearer {{api_key}}"}'); }
      }
      const body = substitute(apiBodyTemplate);
      // Validate the substituted body is well-formed JSON before sending —
      // a broken template should fail fast with a clear message, not as a
      // confusing 400 from the third-party API.
      try { JSON.parse(body); } catch { throw new Error('Custom API body template did not produce valid JSON after substitution — check for unescaped quotes'); }

      return httpJson(substitute(apiUrl), { method: apiMethod || 'POST', headers, body });
    },
  },
};

// ── Per-provider credential storage ───────────────────────────────────────
// Each API provider's credentials are stored under its own settings key
// (email_creds_<provider>, JSON-encoded) so an admin can configure several
// providers side by side — e.g. Brevo AND SendGrid AND a Custom API — for
// failover, without saving one overwriting another's key. SMTP keeps using
// its existing dedicated smtp_* keys (already isolated, unchanged).
//
// Backward compatible: accounts configured before this existed stored a
// single api key/domain under the old email_api_key/email_api_domain keys
// for whichever provider was "active" (email_provider). Those are honored
// as a fallback for that one provider until the admin re-saves it, at
// which point it's written into the new per-provider format going forward.
function getProviderCredentials(settings, providerKey) {
  if (providerKey === 'smtp') return {};
  const raw = settings[`email_creds_${providerKey}`];
  if (raw) {
    try { return JSON.parse(raw); } catch { /* fall through to legacy */ }
  }
  if (providerKey === settings.email_provider && (settings.email_api_key || settings.email_api_domain)) {
    return { api_key: settings.email_api_key, domain: settings.email_api_domain };
  }
  return {};
}

function providerHasCredentials(settings, providerKey) {
  if (providerKey === 'smtp') return !!settings.smtp_host;
  if (!API_PROVIDERS[providerKey]) return false;
  const creds = getProviderCredentials(settings, providerKey);
  if (providerKey === 'custom') return !!(creds.api_url && creds.api_body_template);
  return !!creds.api_key;
}

// 'smtp' unless the admin has picked a known API provider and saved
// credentials for it — in which case that provider's HTTP API is used.
// Used as the single-provider default when no explicit failover chain
// (email_provider_priority) has been configured.
function resolveProvider(settings) {
  const provider = settings.email_provider;
  if (provider && provider !== 'smtp' && providerHasCredentials(settings, provider)) {
    return provider;
  }
  return 'smtp';
}

// The ordered list of providers to attempt, for failover. Explicit priority
// (set via PUT /api/email/priority) wins; if the admin has never touched
// that feature, behavior is unchanged from before — a single provider,
// exactly as resolveProvider() already picked.
function resolveProviderChain(settings) {
  let chain = [];
  try { chain = JSON.parse(settings.email_provider_priority || '[]'); } catch { chain = []; }
  if (!Array.isArray(chain) || !chain.length) chain = [resolveProvider(settings)];

  const seen = new Set();
  const filtered = chain.filter((p) => {
    if (typeof p !== 'string' || seen.has(p)) return false;
    seen.add(p);
    if (p !== 'smtp' && !API_PROVIDERS[p]) return false;
    return providerHasCredentials(settings, p);
  });
  // Never return an empty chain — fall through to whatever resolveProvider
  // picks (which itself degrades to 'smtp'), so the existing "not
  // configured" handling in sendEmail() still fires with a clear message
  // instead of the loop below silently doing nothing.
  return filtered.length ? filtered : [resolveProvider(settings)];
}

async function sendViaApiProvider(providerKey, { apiKey, domain, apiUrl, apiMethod, apiHeaders, apiBodyTemplate, fromName, fromAddress, replyTo, to, subject, html }) {
  const provider = API_PROVIDERS[providerKey];
  if (!provider) throw new Error(`Unknown email API provider: ${providerKey}`);
  return provider.send({ apiKey, domain, apiUrl, apiMethod, apiHeaders, apiBodyTemplate, fromName, fromAddress, replyTo, to, subject, html });
}

// Sends via exactly one provider (no failover) — used by the per-provider
// "test this provider" endpoint and as the building block sendEmail()'s
// failover loop calls for each provider in the chain.
async function attemptProviderSend(providerKey, settings, { fromName, fromAddress, replyTo, to, subject, html }) {
  if (providerKey === 'smtp') {
    const transporter = await createTransporter(settings);
    if (!transporter) throw new Error('SMTP is not configured (no host set)');
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to,
      replyTo: replyTo || undefined,
      subject,
      html,
    });
    return { providerMessageId: info?.messageId || null, raw: info };
  }

  const creds = getProviderCredentials(settings, providerKey);
  const response = await sendViaApiProvider(providerKey, {
    apiKey: creds.api_key,
    domain: creds.domain,
    apiUrl: creds.api_url,
    apiMethod: creds.api_method,
    apiHeaders: creds.api_headers,
    apiBodyTemplate: creds.api_body_template,
    fromName,
    fromAddress,
    replyTo,
    to,
    subject,
    html,
  });
  return { providerMessageId: response?.messageId || response?.id || response?.MessageID || null, raw: response };
}

// ── Branded shell ───────────────────────────────────────────────────────
// Every outgoing email (transactional or broadcast) gets wrapped in this
// table-based layout so real inboxes (Gmail/Outlook clients strip <style>
// tags and unreliable CSS) render a consistent header/footer instead of
// each template re-declaring its own one-off <div> wrapper. Templates only
// need to supply their inner content.
function emailShell({ innerHtml, storeName, footerNote }) {
  const year = new Date().getFullYear();
  return `
  <div style="background:#0b0b0c;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#151515;border-radius:12px;overflow:hidden;border:1px solid #2a2a2a;">
      <tr>
        <td style="background:#151515;padding:28px 32px;border-bottom:1px solid #2a2a2a;text-align:center;">
          <span style="font-family:Georgia,'Playfair Display',serif;font-size:24px;letter-spacing:1px;color:#D4AF37;font-weight:bold;">${storeName}</span>
        </td>
      </tr>
      <tr>
        <td style="background:#ffffff;padding:36px 32px;color:#1a1a1a;font-size:15px;line-height:1.6;">
          ${innerHtml}
        </td>
      </tr>
      <tr>
        <td style="background:#151515;padding:20px 32px;text-align:center;">
          <p style="color:#8a8a8a;font-size:12px;margin:0 0 4px;">© ${year} ${storeName}. All rights reserved.</p>
          ${footerNote ? `<p style="color:#6a6a6a;font-size:11px;margin:0;">${footerNote}</p>` : ''}
        </td>
      </tr>
    </table>
  </div>`;
}

// Tries every provider in the resolved failover chain, in order, and
// returns as soon as one succeeds. Every attempt (success or failure) gets
// its own row in email_delivery_logs so the admin can see exactly which
// provider(s) were tried and why any of them failed — not just the final
// outcome. Only throws if every provider in the chain failed.
const sendEmail = async ({ to, subject, html, raw = false, settings: settingsOverride, footerNote }) => {
  const settings = settingsOverride || (await getEmailSettings());
  const fromName = settings.email_from_name || 'Noor Mist';
  const fromAddress = settings.email_from_address || settings.smtp_user || process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const replyTo = settings.email_reply_to || '';
  const finalHtml = raw ? html : emailShell({ innerHtml: html, storeName: fromName, footerNote });
  const startedAt = Date.now();

  const logDelivery = async (providerKey, { status, errorMessage = null, providerMessageId = null }) => {
    try {
      await query(
        `INSERT INTO email_delivery_logs (recipient, subject, email_type, provider, status, error_message, provider_message_id, duration_ms) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [to, subject, settings.email_current_type || 'transactional', providerKey, status, errorMessage, providerMessageId, Date.now() - startedAt]
      );
    } catch (e) { console.error('email_delivery_logs:', e.message); }
  };

  if (!fromAddress) {
    await logDelivery('none', { status: 'skipped', errorMessage: 'No from address configured' });
    console.log('Email not configured (no from address), skipping:', subject);
    return { ok: false, reason: 'not_configured' };
  }

  // Genuinely nothing set up yet (fresh install) — skip quietly rather than
  // attempting a send that's guaranteed to fail and throwing through the
  // loop below. Once at least one provider IS configured, failures from
  // here on are real attempts and do throw (after trying the whole chain).
  const anyProviderConfigured = ['smtp', ...Object.keys(API_PROVIDERS)].some((p) => providerHasCredentials(settings, p));
  if (!anyProviderConfigured) {
    await logDelivery('none', { status: 'skipped', errorMessage: 'Email provider is not configured' });
    console.log('Email not configured, skipping:', subject);
    return { ok: false, reason: 'not_configured' };
  }

  const chain = resolveProviderChain(settings);
  const attempts = [];
  let lastError = null;

  for (const providerKey of chain) {
    try {
      const result = await attemptProviderSend(providerKey, settings, { fromName, fromAddress, replyTo, to, subject, html: finalHtml });
      await logDelivery(providerKey, { status: 'sent', providerMessageId: result.providerMessageId });
      attempts.push({ provider: providerKey, status: 'sent' });
      return { ok: true, provider: providerKey, attempts, settings, providerResponse: result.raw, providerMessageId: result.providerMessageId };
    } catch (error) {
      await logDelivery(providerKey, { status: 'failed', errorMessage: error.message });
      attempts.push({ provider: providerKey, status: 'failed', error: error.message });
      lastError = error;
      // Fall through to the next provider in the chain, if any.
    }
  }

  // Every provider in the chain failed (or nothing is configured at all —
  // chain always has at least one entry, see resolveProviderChain()).
  const finalError = lastError || new Error('No email provider is configured');
  finalError.attempts = attempts;
  throw finalError;
};

// ── Editable templates ──────────────────────────────────────────────────
// Seeded once on startup so behavior is unchanged until an admin edits them
// via Email Settings > Templates. {{tokens}} are replaced per-send.
const TEMPLATE_DEFAULTS = {
  order_received: {
    subject: 'Your Order #{{order_number}} Has Been Received — Please Confirm',
    body: `
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;width:54px;height:54px;line-height:54px;border-radius:50%;background:#fff7df;color:#D4AF37;font-size:28px;">✓</div>
      </div>
      <h1 style="color:#1a1a1a;font-family:Georgia,serif;font-size:24px;text-align:center;margin:0 0 8px;">Order Received Successfully!</h1>
      <p style="text-align:center;color:#666;margin:0 0 24px;">Hi {{customer_name}}, your order <strong>#{{order_number}}</strong> has been received.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:10px;margin:0 0 20px;">
        <tr><td style="padding:14px 16px;color:#777;width:120px;">Items</td><td style="padding:14px 16px;color:#111;">{{items_html}}</td></tr>
        <tr style="border-top:1px solid #eee;"><td style="padding:14px 16px;color:#777;">Total</td><td style="padding:14px 16px;color:#111;font-weight:bold;">{{currency}}{{total_amount}}</td></tr>
        <tr style="border-top:1px solid #eee;"><td style="padding:14px 16px;color:#777;">Payment</td><td style="padding:14px 16px;color:#111;">{{payment_method}}</td></tr>
      </table>
      <div style="background:#f8f8f8;border-radius:10px;padding:16px;margin-bottom:24px;">
        <p style="margin:0 0 6px;font-weight:bold;color:#111;">Delivery Address</p>
        <p style="margin:0;color:#555;">{{shipping_address}}</p>
      </div>
      <p style="text-align:center;color:#333;margin:0 0 14px;font-weight:bold;">Is your order confirmed?</p>
      <p style="text-align:center;margin:0 0 22px;">
        <a href="{{confirm_link}}" style="background:#D4AF37;color:#111;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">✓ Yes, Confirm My Order</a>
      </p>
      <p style="text-align:center;color:#777;font-size:12px;margin:0;">This confirmation link expires in 24 hours. After confirmation, your order will be processed for delivery in approximately {{delivery_estimate}}.</p>
    `,
  },
  order_confirmation: {
    subject: 'Yay! 🎉 Your Order #{{order_number}} Is Confirmed',
    body: `
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;width:58px;height:58px;line-height:58px;border-radius:50%;background:#e8f8ed;color:#18864b;font-size:30px;">✓</div>
      </div>
      <h1 style="color:#1a1a1a;font-family:Georgia,serif;font-size:24px;text-align:center;margin:0 0 8px;">Yay! 🎉 Your Order Is Confirmed!</h1>
      <p style="text-align:center;color:#666;margin:0 0 24px;">Thank you for trusting {{store_name}}.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:10px;margin:0 0 20px;">
        <tr><td style="padding:14px 16px;color:#777;">Order No.</td><td style="padding:14px 16px;color:#111;font-weight:bold;">#{{order_number}}</td></tr>
        <tr style="border-top:1px solid #eee;"><td style="padding:14px 16px;color:#777;">Total</td><td style="padding:14px 16px;color:#111;font-weight:bold;">{{currency}}{{total_amount}}</td></tr>
      </table>
      <p style="text-align:center;margin:0 0 12px;font-weight:bold;color:#111;">🚚 Arriving in {{delivery_estimate}}</p>
      <p style="text-align:center;color:#777;margin:0;">We'll send you another update when your order ships.</p>
    `,
  },
  order_shipped: {
    subject: 'Your Order #{{order_number}} Has Shipped',
    body: `
      <h1 style="color:#1a1a1a;font-family:Georgia,serif;font-size:22px;margin:0 0 16px;">Your Order Is On Its Way</h1>
      <p style="margin:0 0 12px;">Dear {{customer_name}},</p>
      <p style="margin:0 0 12px;">Great news — order <strong>#{{order_number}}</strong> has shipped.</p>
      {{tracking_line}}
      <p style="margin:20px 0 0;color:#555;">Thank you for choosing {{store_name}}.</p>
    `,
  },
  order_cancelled: { subject: 'Your Order #{{order_number}} Has Been Cancelled', body: '<h1>Your Order Has Been Cancelled</h1><p>Hi {{customer_name}},</p><p>Order <strong>#{{order_number}}</strong> has been cancelled.</p><p>If you need help, please contact {{store_name}}.</p>' },
  order_refunded: { subject: 'Your Order #{{order_number}} Has Been Refunded', body: '<h1>Your Refund Has Been Processed</h1><p>Hi {{customer_name}},</p><p>Order <strong>#{{order_number}}</strong> has been marked as refunded.</p><p>Thank you, {{store_name}}.</p>' },
  order_confirmed: {
    subject: 'Yay! 🎉 Your Order #{{order_number}} Is Confirmed',
    body: '<h1>Yay! 🎉 Your Order Is Confirmed!</h1><p>Hi {{customer_name}},</p><p>Your order <strong>#{{order_number}}</strong> has been confirmed and is now being prepared.</p><p>Thank you for trusting {{store_name}}.</p>',
  },
  order_processing: {
    subject: 'Your Order #{{order_number}} Is Being Prepared',
    body: '<h1>Your Order Is Being Prepared</h1><p>Hi {{customer_name}},</p><p>Your order <strong>#{{order_number}}</strong> is now being prepared.</p><p>We will keep you updated as it moves through fulfillment.</p><p>— {{store_name}}</p>',
  },
  order_packed: {
    subject: 'Your Order #{{order_number}} Has Been Packed',
    body: '<h1>Your Order Has Been Packed</h1><p>Hi {{customer_name}},</p><p>Great news — order <strong>#{{order_number}}</strong> has been packed and is ready to leave us.</p><p>— {{store_name}}</p>',
  },
  order_delivered: {
    subject: 'Your Order #{{order_number}} Has Been Delivered',
    body: '<h1>Your Order Has Been Delivered</h1><p>Hi {{customer_name}},</p><p>Your order <strong>#{{order_number}}</strong> has been marked as delivered.</p><p>Thank you for choosing {{store_name}}.</p>',
  },
  email_verification: {
    subject: 'Verify your {{store_name}} account',
    body: `
      <h1 style="color:#1a1a1a;font-family:Georgia,serif;font-size:22px;margin:0 0 16px;">Verify your email</h1>
      <p style="margin:0 0 12px;">Hi {{customer_name}},</p>
      <p style="margin:0 0 12px;">Thanks for creating an account with {{store_name}}. Verify your email to activate your account.</p>
      <p style="margin:24px 0;text-align:center;">
        <a href="{{verification_link}}" style="background:#D4AF37;color:#111;padding:13px 26px;text-decoration:none;border-radius:7px;font-weight:bold;display:inline-block;">Verify My Email</a>
      </p>
      <p style="margin:0 0 12px;text-align:center;color:#777;">Or enter this one-time code:</p>
      <p style="margin:0 0 18px;text-align:center;"><span style="display:inline-block;background:#f5f0e0;color:#111;font-size:28px;letter-spacing:8px;font-weight:bold;padding:12px 20px;border-radius:8px;">{{verification_otp}}</span></p>
      <p style="margin:0;color:#777;font-size:13px;">This link and code expire in {{expiry_minutes}} minutes and can only be used once.</p>
    `,
  },
  welcome: {
    subject: 'Welcome to {{store_name}}',
    body: `
      <h1 style="color:#1a1a1a;font-family:Georgia,serif;font-size:22px;margin:0 0 16px;">Welcome, {{customer_name}}!</h1>
      <p style="margin:0 0 12px;">Thank you for creating an account with {{store_name}}. We're delighted to have you join us.</p>
      <p style="margin:0 0 12px;">Explore our latest fragrances and enjoy a personalized shopping experience.</p>
      <p style="margin:20px 0 0;color:#555;">With warm regards,<br>The {{store_name}} Team</p>
    `,
  },
  login_link: {
    subject: 'Your {{store_name}} Sign-In Link',
    body: `
      <h1 style="color:#1a1a1a;font-family:Georgia,serif;font-size:22px;margin:0 0 16px;">Sign in to {{store_name}}</h1>
      <p style="margin:0 0 12px;">Hi {{customer_name}},</p>
      <p style="margin:0 0 12px;">You requested a secure sign-in link for your account. Click the button below to sign in instantly — no password required.</p>
      <p style="margin:24px 0;text-align:center;">
        <a href="{{login_link}}" style="background:#D4AF37;color:#111;padding:13px 26px;text-decoration:none;border-radius:7px;font-weight:bold;display:inline-block;">Sign In Securely</a>
      </p>
      <p style="margin:0 0 12px;color:#777;font-size:13px;">This link expires in 15 minutes and can only be used once.</p>
      <p style="margin:20px 0 0;color:#555;">If you didn't request this, you can safely ignore this email.</p>
    `,
  },
  password_reset: {
    subject: 'Reset Your {{store_name}} Password',
    body: `
      <h1 style="color:#1a1a1a;font-family:Georgia,serif;font-size:22px;margin:0 0 16px;">Password Reset Request</h1>
      <p style="margin:0 0 12px;">Dear {{customer_name}},</p>
      <p style="margin:0 0 12px;">We received a request to reset your password. Use the code below, or click the button to reset it directly. This code and link will expire in {{expiry_hours}} hour(s).</p>
      <p style="margin:24px 0;text-align:center;">
        <span style="display:inline-block;background:#f5f0e0;color:#111;font-size:28px;letter-spacing:8px;font-weight:bold;padding:14px 24px;border-radius:8px;">{{otp_code}}</span>
      </p>
      <p style="margin:24px 0;">
        <a href="{{reset_link}}" style="background:#D4AF37;color:#111;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">Reset Password</a>
      </p>
      <p style="margin:0 0 12px;color:#555;">If you didn't request this, you can safely ignore this email — your password will remain unchanged.</p>
      <p style="margin:20px 0 0;color:#555;">With warm regards,<br>The {{store_name}} Team</p>
    `,
  },
  newsletter: {
    subject: "You're Subscribed to {{store_name}}",
    body: `
      <h1 style="color:#1a1a1a;font-family:Georgia,serif;font-size:22px;margin:0 0 16px;">Welcome to the {{store_name}} Family</h1>
      <p style="margin:0 0 12px;">Thank you for subscribing! You'll now be the first to hear about new launches, exclusive offers, and fragrance tips.</p>
      <p style="margin:20px 0 0;color:#555;">With warm regards,<br>The {{store_name}} Team</p>
    `,
  },
};

async function ensureEmailTemplatesTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id SERIAL PRIMARY KEY,
        key VARCHAR(50) UNIQUE NOT NULL,
        subject VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    for (const [key, tpl] of Object.entries(TEMPLATE_DEFAULTS)) {
      await query(
        'INSERT INTO email_templates (key, subject, body) VALUES ($1,$2,$3) ON CONFLICT (key) DO NOTHING',
        [key, tpl.subject, tpl.body]
      );
    }
  } catch (e) {
    console.error('email_templates migration:', e.message);
  }
}
ensureEmailTemplatesTable();

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>\"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[ch]));
}

function render(str, vars) {
  return str.replace(/{{\s*(\w+)\s*}}/g, (_, key) => (vars[key] !== undefined ? vars[key] : ''));
}

async function getTemplate(key) {
  const result = await query('SELECT subject, body FROM email_templates WHERE key=$1', [key]);
  return result.rows[0] || TEMPLATE_DEFAULTS[key];
}

// true unless the admin has explicitly switched it off in Email Settings
async function isEnabled(settings, toggleKey) {
  return settings[toggleKey] !== 'false';
}

async function sendTypedEmail(options) {
  return sendEmail({ ...options, settings: { ...(options.settings || {}), email_current_type: options.emailType || 'transactional' } });
}

// ── Order emails ─────────────────────────────────────────────────────────
// Recipient always comes from shipping_address (captured at checkout for
// every order, guest or logged-in) rather than req.user — using req.user
// meant guest checkouts never got a confirmation email at all, and would
// have meant the ADMIN's account got emailed instead of the customer's for
// shipping-status updates (that route runs as the admin, not the customer).
function recipientFromOrder(order) {
  const addr = order.shipping_address || {};
  const name = [addr.firstName, addr.lastName].filter(Boolean).join(' ') || 'Customer';
  return { email: addr.email, name };
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const sendOrderReceivedEmail = async (order, confirmToken, items = []) => {
  const settings = await getEmailSettings();
  if (!(await isEnabled(settings, 'email_order_confirmation'))) return;

  const recipient = recipientFromOrder(order);
  if (!recipient?.email) return;

  const baseUrl = getPublicSiteUrl(settings);
  const confirmLink = `${baseUrl.replace(/\/$/, '')}/order-confirmation?token=${encodeURIComponent(confirmToken)}`;
  const addr = order.shipping_address || {};
  const addressLine = [addr.address, addr.city, addr.state].filter(Boolean).join(', ');
  const itemsHtml = items.length
    ? items.map((item) => `${escapeHtml(item.product_name)}${item.variant_size ? ` (${escapeHtml(item.variant_size)})` : ''} × ${item.quantity}`).join('<br>')
    : 'Your selected items';

  const tpl = await getTemplate('order_received');
  const vars = {
    customer_name: escapeHtml(recipient.name || 'Customer'),
    order_number: escapeHtml(order.order_number),
    total_amount: Number(order.total_amount || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    payment_method: escapeHtml((order.payment_method || 'cod').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())),
    shipping_address: escapeHtml(addressLine || 'Address provided at checkout'),
    items_html: itemsHtml,
    confirm_link: confirmLink,
    store_name: escapeHtml(settings.email_from_name || 'Noor Mist'),
    currency: escapeHtml(settings.currency || '₨'),
    delivery_estimate: escapeHtml(settings.delivery_estimate || '3–4 working days'),
  };
  await sendTypedEmail({ emailType: 'order', to: recipient.email, subject: render(tpl.subject, vars), html: render(tpl.body, vars), settings });
};

const sendOrderConfirmation = async (order, recipientOverride) => {
  const settings = await getEmailSettings();
  if (!(await isEnabled(settings, 'email_order_confirmation'))) return;

  const recipient = recipientOverride || recipientFromOrder(order);
  if (!recipient?.email) return;

  const tpl = await getTemplate('order_confirmation');
  const vars = {
    customer_name: recipient.name || 'Customer',
    order_number: order.order_number,
    total_amount: order.total_amount,
    store_name: settings.email_from_name || 'Noor Mist',
    currency: settings.currency || '₨',
    delivery_estimate: settings.delivery_estimate || '3–4 working days',
  };
  await sendTypedEmail({ emailType: 'order', to: recipient.email, subject: render(tpl.subject, vars), html: render(tpl.body, vars), settings });
};

const STATUS_TEMPLATE_MAP = {
  confirmed: 'order_confirmed',
  processing: 'order_processing',
  packed: 'order_packed',
  shipped: 'order_shipped',
  delivered: 'order_delivered',
  cancelled: 'order_cancelled',
  refunded: 'order_refunded',
};

const STATUS_TOGGLE_MAP = { confirmed:'email_order_confirmed', processing:'email_order_processing', packed:'email_order_packed', shipped:'email_order_shipped', delivered:'email_order_delivered', cancelled:'email_order_cancelled', refunded:'email_order_refunded' };

const sendOrderStatusUpdateEmail = async (order, previousStatus) => {
  const settings = await getEmailSettings();
  const toggle = STATUS_TOGGLE_MAP[order.status] || 'email_order_status_updates';
  if (!(await isEnabled(settings, toggle))) return;
  const recipient = recipientFromOrder(order);
  if (!recipient?.email) return;
  const key = STATUS_TEMPLATE_MAP[order.status];
  if (!key || order.status === previousStatus) return;
  const tpl = await getTemplate(key);
  const siteTrackLink = `${getPublicSiteUrl(settings)}/track-order?tracking=${encodeURIComponent(order.order_number)}`;
  const trackingLineParts = [];
  if (order.tracking_carrier) trackingLineParts.push(`<p>Delivery service: <strong>${escapeHtml(order.tracking_carrier)}</strong></p>`);
  if (order.tracking_number) trackingLineParts.push(`<p>Tracking number: <strong>${escapeHtml(order.tracking_number)}</strong></p>`);
  if (order.tracking_url) trackingLineParts.push(`<p><a href="${escapeHtml(order.tracking_url)}">Track with ${escapeHtml(order.tracking_carrier || 'the courier')}</a></p>`);
  trackingLineParts.push(`<p><a href="${siteTrackLink}">Track your order on our site</a></p>`);
  const vars = {
    customer_name: escapeHtml(recipient.name || 'Customer'),
    order_number: escapeHtml(order.order_number),
    store_name: escapeHtml(settings.email_from_name || 'Noor Mist'),
    tracking_line: trackingLineParts.join(''),
    tracking_number: escapeHtml(order.tracking_number || ''),
    tracking_url: escapeHtml(order.tracking_url || ''),
    currency: escapeHtml(settings.currency || '₨'),
    total_amount: Number(order.total_amount || 0).toLocaleString('en-PK',{minimumFractionDigits:2,maximumFractionDigits:2}),
  };
  return sendTypedEmail({ emailType: 'order_status', to: recipient.email, subject: render(tpl.subject, vars), html: render(tpl.body, vars), settings });
};

const sendShippingNotification = async (order) => sendOrderStatusUpdateEmail(order, '');

// ── Account & marketing emails ─────────────────────────────────────────────
const sendEmailVerificationEmail = async (user, verificationLink, otp) => {
  const settings = await getEmailSettings();
  if (!(await isEnabled(settings, 'email_verification'))) return;
  if (!user?.email) return;

  const tpl = await getTemplate('email_verification');
  const vars = {
    customer_name: escapeHtml(user.first_name || 'there'),
    store_name: escapeHtml(settings.email_from_name || 'Noor Mist'),
    verification_link: verificationLink,
    verification_otp: escapeHtml(otp || ''),
    expiry_minutes: '15',
  };
  await sendTypedEmail({ emailType: 'authentication', to: user.email, subject: render(tpl.subject, vars), html: render(tpl.body, vars), settings });
};

const sendWelcomeEmail = async (user) => {
  const settings = await getEmailSettings();
  if (!(await isEnabled(settings, 'email_welcome'))) return;
  if (!user?.email) return;

  const tpl = await getTemplate('welcome');
  const vars = {
    customer_name: user.first_name || 'there',
    store_name: settings.email_from_name || 'Noor Mist',
  };
  await sendTypedEmail({ emailType: 'authentication', to: user.email, subject: render(tpl.subject, vars), html: render(tpl.body, vars), settings });
};

const sendMagicLoginEmail = async (user, loginLink) => {
  const settings = await getEmailSettings();
  if (!(await isEnabled(settings, 'email_login_link'))) return;
  if (!user?.email) return;

  const tpl = await getTemplate('login_link');
  const vars = {
    customer_name: escapeHtml(user.first_name || 'there'),
    store_name: escapeHtml(settings.email_from_name || 'Noor Mist'),
    login_link: loginLink,
  };
  await sendTypedEmail({ emailType: 'authentication', to: user.email, subject: render(tpl.subject, vars), html: render(tpl.body, vars), settings });
};

const sendPasswordResetEmail = async (user, resetLink, otp) => {
  const settings = await getEmailSettings();
  if (!(await isEnabled(settings, 'email_password_reset'))) return;
  if (!user?.email) return;

  const tpl = await getTemplate('password_reset');
  const vars = {
    customer_name: user.first_name || 'there',
    store_name: settings.email_from_name || 'Noor Mist',
    reset_link: resetLink,
    otp_code: otp || '',
    expiry_hours: '1',
  };
  await sendTypedEmail({ emailType: 'authentication', to: user.email, subject: render(tpl.subject, vars), html: render(tpl.body, vars), settings });
};

async function ensureEmailDeliveryLogsTable() {
  try {
    await query(`CREATE TABLE IF NOT EXISTS email_delivery_logs (
      id SERIAL PRIMARY KEY, recipient VARCHAR(320) NOT NULL, subject VARCHAR(255) NOT NULL,
      email_type VARCHAR(80) DEFAULT 'transactional', provider VARCHAR(40) NOT NULL,
      status VARCHAR(20) NOT NULL, error_message TEXT, provider_message_id VARCHAR(255),
      duration_ms INTEGER, created_at TIMESTAMP DEFAULT NOW()
    )`);
  } catch (e) { console.error('email_delivery_logs migration:', e.message); }
}
ensureEmailDeliveryLogsTable();

async function ensureBroadcastTemplatesTable() {
  try {
    await query(`CREATE TABLE IF NOT EXISTS email_broadcast_templates (
      id SERIAL PRIMARY KEY, key VARCHAR(80) UNIQUE NOT NULL, label VARCHAR(120) NOT NULL,
      subject VARCHAR(255) NOT NULL DEFAULT '', body TEXT NOT NULL DEFAULT '', is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
    )`);
    const defaults = [
      ['new_arrival','New Arrival',"New at {{store_name}} — You'll Want This","<h1>Something New Has Arrived</h1><p>Hi {{customer_name}},</p><p>We've just added something new to the {{store_name}} collection.</p>"],
      ['promotion','Sale / Promotion',"A Little Something For You, {{customer_name}}",'<h1>An Offer Just For You</h1><p>Hi {{customer_name}},</p><p>For a limited time, enjoy a special offer from {{store_name}}.</p>'],
      ['shipping_update','Shipping Update','An Update on Shipping From {{store_name}}','<h1>A Quick Shipping Update</h1><p>Hi {{customer_name}},</p><p>We wanted to give you an update about shipping.</p>'],
      ['custom','Custom','','']
    ];
    for (const [key,label,subject,body] of defaults) await query('INSERT INTO email_broadcast_templates (key,label,subject,body) VALUES ($1,$2,$3,$4) ON CONFLICT (key) DO NOTHING',[key,label,subject,body]);
  } catch (e) { console.error('email_broadcast_templates migration:', e.message); }
}
ensureBroadcastTemplatesTable();

// ── Broadcast (admin sends one email to many users at once) ────────────
async function ensureEmailCampaignsTable() {
  try {
    await query(`CREATE TABLE IF NOT EXISTS email_campaigns (
      id SERIAL PRIMARY KEY, name VARCHAR(160), subject VARCHAR(255) NOT NULL, body TEXT NOT NULL,
      audience VARCHAR(50) NOT NULL, user_ids INTEGER[], recipient_count INTEGER NOT NULL DEFAULT 0,
      sent_count INTEGER NOT NULL DEFAULT 0, failed_count INTEGER NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'draft', scheduled_at TIMESTAMP, sent_at TIMESTAMP,
      created_by INTEGER, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
    )`);
    for (const sql of [
      `ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS name VARCHAR(160)`,
      `ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS user_ids INTEGER[]`,
      `ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'draft'`,
      `ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP`,
      `ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP`,
      `ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`
    ]) await query(sql);
  } catch (e) { console.error('email_campaigns migration:', e.message); }
}
ensureEmailCampaignsTable();

// Audience filters map to a WHERE clause fragment over `users u` (role
// already scoped to 'customer' by the caller).
const AUDIENCE_FILTERS = {
  all: 'AND u.marketing_opt_in = true',
  active: 'AND u.is_active = true AND u.marketing_opt_in = true',
  new: "AND u.created_at >= NOW() - INTERVAL '30 days' AND u.marketing_opt_in = true",
  with_orders: "AND EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id) AND u.marketing_opt_in = true",
};

async function resolveAudience(audience, userIds) {
  if (audience === 'selected') {
    if (!Array.isArray(userIds) || !userIds.length) return [];
    const result = await query(
      `SELECT id, email, first_name, last_name FROM users WHERE role='customer' AND marketing_opt_in = true AND id = ANY($1::int[])`,
      [userIds]
    );
    return result.rows;
  }
  const filter = AUDIENCE_FILTERS[audience];
  if (filter === undefined) return [];
  const result = await query(
    `SELECT id, email, first_name, last_name FROM users u WHERE u.role='customer' ${filter} ORDER BY u.created_at DESC`
  );
  return result.rows;
}

// Sends one subject/body (with {{customer_name}}/{{store_name}} tokens) to
// every recipient. Batches with a short pause between them so we don't trip
// an SMTP provider's rate limiting/spam heuristics when sending to a large
// list, and so one bad recipient can't abort the rest (Promise.allSettled).
async function sendBulkEmail({ recipients, subject, body, settings, batchSize = 8, delayMs = 400 }) {
  const storeName = settings.email_from_name || 'Noor Mist';
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((r) => {
        if (!r.email) return Promise.reject(new Error('missing email'));
        const vars = { customer_name: escapeHtml(r.first_name || 'there'), store_name: escapeHtml(storeName), current_year: String(new Date().getFullYear()), unsubscribe_link: getUnsubscribeLink(r, settings) };
        return sendEmail({
          to: r.email,
          subject: render(subject, vars),
          html: render(body, vars),
          settings: { ...settings, email_current_type: 'broadcast' },
          footerNote: `You're receiving this because you're a ${storeName} customer.`,
        });
      })
    );
    results.forEach((r) => {
      if (r.status === 'fulfilled' && r.value?.ok) sent += 1;
      else failed += 1;
    });
    if (i + batchSize < recipients.length) await new Promise((r) => setTimeout(r, delayMs));
  }

  return { sent, failed, total: recipients.length };
}

async function saveCampaign({ id, name, subject, body, audience, userIds, recipientCount=0, sentCount=0, failedCount=0, status='draft', scheduledAt=null, sentAt=null, createdBy }) {
  if (id) {
    const r = await query(`UPDATE email_campaigns SET name=$1,subject=$2,body=$3,audience=$4,user_ids=$5,recipient_count=$6,sent_count=$7,failed_count=$8,status=$9,scheduled_at=$10,sent_at=$11,updated_at=NOW() WHERE id=$12 RETURNING *`, [name||null,subject,body,audience,userIds||null,recipientCount,sentCount,failedCount,status,scheduledAt,sentAt,id]);
    return r.rows[0];
  }
  const r = await query(`INSERT INTO email_campaigns (name,subject,body,audience,user_ids,recipient_count,sent_count,failed_count,status,scheduled_at,sent_at,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`, [name||null,subject,body,audience,userIds||null,recipientCount,sentCount,failedCount,status,scheduledAt,sentAt,createdBy||null]);
  return r.rows[0];
}
async function getCampaignHistory(limit=50) { const r=await query('SELECT * FROM email_campaigns ORDER BY created_at DESC LIMIT $1',[limit]); return r.rows; }
async function sendCampaignRecord(campaign) {
  const settings=await getEmailSettings();
  if (resolveProvider(settings)==='smtp' && !settings.smtp_host) throw new Error('Email delivery is not configured');
  const recipients=await resolveAudience(campaign.audience,campaign.user_ids||[]);
  if (!recipients.length) { await query(`UPDATE email_campaigns SET status='failed',sent_at=NOW(),updated_at=NOW() WHERE id=$1`,[campaign.id]); return {sent:0,failed:0,total:0}; }
  const result=await sendBulkEmail({recipients,subject:campaign.subject,body:campaign.body,settings});
  const status=result.failed===0?'sent':result.sent===0?'failed':'partial';
  await query(`UPDATE email_campaigns SET recipient_count=$1,sent_count=$2,failed_count=$3,status=$4,sent_at=NOW(),updated_at=NOW() WHERE id=$5`,[result.total,result.sent,result.failed,status,campaign.id]);
  return result;
}
let schedulerBusy=false;
async function processScheduledCampaigns(){
  if(schedulerBusy)return; schedulerBusy=true;
  try{const r=await query(`SELECT * FROM email_campaigns WHERE status='scheduled' AND scheduled_at<=NOW() ORDER BY scheduled_at ASC LIMIT 5`); for(const c of r.rows){const claim=await query(`UPDATE email_campaigns SET status='processing',updated_at=NOW() WHERE id=$1 AND status='scheduled' RETURNING *`,[c.id]); if(!claim.rows.length)continue; try{await sendCampaignRecord(claim.rows[0]);}catch(e){await query(`UPDATE email_campaigns SET status='failed',failed_count=recipient_count,sent_at=NOW(),updated_at=NOW() WHERE id=$1`,[c.id]); console.error('scheduled campaign:',e.message);}}}catch(e){console.error('campaign scheduler:',e.message)}finally{schedulerBusy=false}}
setTimeout(processScheduledCampaigns,5000); setInterval(processScheduledCampaigns,30000);
const sendNewsletterConfirmation = async (email) => {
  const settings = await getEmailSettings();
  if (!(await isEnabled(settings, 'email_newsletter'))) return;
  if (!email) return;

  const tpl = await getTemplate('newsletter');
  const vars = { store_name: settings.email_from_name || 'Noor Mist' };
  await sendTypedEmail({ emailType: 'newsletter', to: email, subject: render(tpl.subject, vars), html: render(tpl.body, vars), settings });
};

module.exports = {
  sendEmail,
  sendTypedEmail,
  resolveProvider,
  resolveProviderChain,
  getProviderCredentials,
  providerHasCredentials,
  attemptProviderSend,
  sendViaApiProvider,
  API_PROVIDERS,
  sendOrderReceivedEmail,
  sendOrderConfirmation,
  sendShippingNotification,
  sendOrderStatusUpdateEmail,
  sendWelcomeEmail,
  sendEmailVerificationEmail,
  sendMagicLoginEmail,
  sendPasswordResetEmail,
  sendNewsletterConfirmation,
  getTemplate,
  getEmailSettings,
  TEMPLATE_DEFAULTS,
  // Broadcast
  resolveAudience,
  sendBulkEmail,
  saveCampaign,
  getCampaignHistory,
  sendCampaignRecord,
  AUDIENCE_FILTERS,
  getPublicSiteUrl,
  verifyUnsubscribeToken,
};
