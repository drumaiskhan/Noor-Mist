const express = require('express');
const { query } = require('../config/database');
const { requireAdmin } = require('../middleware/auth');
const {
  resolveAudience,
  sendBulkEmail,
  saveCampaign,
  getCampaignHistory,
  sendCampaignRecord,
  getEmailSettings,
  verifyUnsubscribeToken,
  resolveProvider,
  resolveProviderChain,
  getProviderCredentials,
  providerHasCredentials,
  attemptProviderSend,
  API_PROVIDERS,
  sendEmail,
} = require('../services/email');

const router = express.Router();

const AUDIENCE_LABELS = {
  all: 'All customers',
  active: 'Active customers',
  new: 'New customers (last 30 days)',
  with_orders: 'Customers with orders',
  selected: 'Selected customers',
};

// Merges an inline settings override (e.g. currently-typed-but-unsaved form
// values) onto the saved settings. A blank string in the override means
// "no opinion, use whatever's saved" — the same "leave blank to keep
// current" convention this app already uses for password/API-key fields
// everywhere else. Without this, testing right after a save (which clears
// the password/key field back to blank once it's safely stored) would
// silently overwrite the real saved secret with an empty string.
function mergeSettingsOverride(saved, override) {
  if (!override || typeof override !== 'object') return saved;
  const merged = { ...saved };
  for (const [key, value] of Object.entries(override)) {
    if (value === '' || value === undefined || value === null) continue;
    merged[key] = value;
  }
  return merged;
}

function mergeProviderTestSettings(saved, providerKey, override) {
  const merged = { ...saved };
  if (!override || typeof override !== 'object') return merged;
  if (providerKey === 'smtp') return mergeSettingsOverride(merged, override);

  const existing = getProviderCredentials(merged, providerKey);
  const providerOverride = {
    api_key: override.email_api_key ?? override.api_key,
    domain: override.email_api_domain ?? override.domain,
    api_url: override.api_url,
    api_method: override.api_method,
    api_headers: override.api_headers,
    api_body_template: override.api_body_template,
  };
  merged[`email_creds_${providerKey}`] = JSON.stringify(mergeSettingsOverride(existing, providerOverride));
  return mergeSettingsOverride(merged, {
    email_provider: override.email_provider,
    email_from_name: override.email_from_name,
    email_from_address: override.email_from_address,
    email_reply_to: override.email_reply_to,
    email_site_url: override.email_site_url,
    email_test_subject: override.email_test_subject,
    email_test_body: override.email_test_body,
    email_test_footer: override.email_test_footer,
  });
}

// GET /api/email/providers — lets the admin UI render provider options
// (and which extra fields, like Mailgun's domain, each one needs) without
// hardcoding the list on the frontend.
router.get('/providers', requireAdmin, (req, res) => {
  const providers = Object.entries(API_PROVIDERS).map(([key, p]) => ({
    key,
    label: p.label,
    type: 'api',
    fields: p.fields,
    setupUrl: p.setupUrl || null,
  }));
  res.json({ providers });
});

// GET /api/email/settings
router.get('/settings', requireAdmin, async (req, res) => {
  try {
    const result = await query("SELECT key, value FROM settings WHERE key LIKE 'smtp_%' OR key LIKE 'email_%'");
    const settings = {};
    result.rows.forEach((row) => { settings[row.key] = row.value; });

    // Compute per-provider status BEFORE stripping secret fields below —
    // getProviderCredentials()'s legacy fallback reads settings.email_api_key.
    const providersStatus = {};
    for (const key of ['smtp', ...Object.keys(API_PROVIDERS)]) {
      if (key === 'smtp') {
        providersStatus.smtp = { configured: providerHasCredentials(settings, 'smtp'), type: 'smtp' };
        continue;
      }
      const creds = getProviderCredentials(settings, key);
      providersStatus[key] = {
        configured: providerHasCredentials(settings, key),
        type: 'api',
        api_key_set: !!creds.api_key,
        domain: creds.domain || '',
        api_url: creds.api_url || '',
        api_method: creds.api_method || 'POST',
        api_headers: creds.api_headers || '',
        api_body_template: creds.api_body_template || '',
      };
    }
    let priority = [];
    try { priority = JSON.parse(settings.email_provider_priority || '[]'); } catch { priority = []; }

    // Never send the real password back to the client — not even masked.
    // Returning a fixed-length placeholder (e.g. 8 dots) made it look like
    // a long API key had been "shortened" on save, when really it was just
    // a stand-in with no relation to the actual saved length. Send only
    // whether one is configured; the field stays blank and the admin can
    // leave it blank to keep the current key or type a new one to replace it.
    const smtp_password_set = !!settings.smtp_password;
    delete settings.smtp_password;
    // Same reasoning as smtp_password above — never echo the real API key
    // back to the client, just whether one is on file.
    const email_api_key_set = !!settings.email_api_key;
    delete settings.email_api_key;

    // Per-provider API credentials live under email_creds_<provider>. They are
    // needed internally by the backend, but MUST NEVER be returned by the
    // admin settings endpoint. Only non-secret metadata is exposed through
    // providers_status above (api_key_set, domain, endpoint, etc.).
    Object.keys(settings).forEach((key) => {
      if (key.startsWith('email_creds_')) delete settings[key];
    });

    res.json({ settings, smtp_password_set, email_api_key_set, providers_status: providersStatus, provider_priority: priority });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch email settings' });
  }
});

// PUT /api/email/settings
router.put('/settings', requireAdmin, async (req, res) => {
  try {
    const allowed = [
      'smtp_host', 'smtp_port', 'smtp_user', 'smtp_password',
      'smtp_secure', 'email_from_name', 'email_from_address',
      'email_order_confirmation', 'email_shipping_notification', 'email_order_status_updates', 'email_order_confirmed', 'email_order_processing', 'email_order_packed', 'email_order_shipped', 'email_order_delivered', 'email_order_cancelled', 'email_order_refunded',
      'email_welcome', 'email_password_reset', 'email_login_link', 'email_newsletter',
      'email_provider', 'email_api_key', 'email_api_domain',
      'email_reply_to', 'email_site_url', 'email_test_subject', 'email_test_body', 'email_test_footer',
    ];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        // An empty password/key field means "keep the existing value" — the
        // field is intentionally sent blank unless the admin typed a new
        // one, so don't let a blank submit wipe out a real saved secret.
        if ((key === 'smtp_password' || key === 'email_api_key') && req.body[key] === '') continue;
        await query(
          'INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()',
          [key, String(req.body[key])]
        );
      }
    }
    res.json({ message: 'Email settings updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update email settings' });
  }
});

router.post('/clear-credential', requireAdmin, async (req, res) => {
  try { const type = req.body?.type; const key = type === 'smtp' ? 'smtp_password' : type === 'api' ? 'email_api_key' : null; if (!key) return res.status(400).json({ error: 'Invalid credential type' }); await query('DELETE FROM settings WHERE key=$1',[key]); res.json({ message: 'Credential removed' }); }
  catch (error) { res.status(500).json({ error: 'Failed to remove credential' }); }
});

// PUT /api/email/providers/:key — save ONE provider's credentials without
// touching any other provider's saved credentials. This is what makes it
// possible to have Brevo AND SendGrid AND a Custom API all configured at
// once for failover, instead of the old single email_api_key slot that
// only ever held one provider's key at a time.
router.put('/providers/:key', requireAdmin, async (req, res) => {
  try {
    const key = req.params.key;
    if (key !== 'smtp' && !API_PROVIDERS[key]) return res.status(400).json({ error: `Unknown provider: ${key}` });

    if (key === 'smtp') {
      const allowed = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_password', 'smtp_secure'];
      for (const k of allowed) {
        if (req.body[k] === undefined) continue;
        if (k === 'smtp_password' && req.body[k] === '') continue; // blank = keep existing
        await query('INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()', [k, String(req.body[k])]);
      }
      return res.json({ message: 'SMTP credentials saved' });
    }

    // API-type provider — merge onto whatever's already saved so a blank
    // api_key field means "keep the current key", same pattern as SMTP's
    // password field and the old single-provider email_api_key field.
    const existingRow = await query('SELECT value FROM settings WHERE key=$1', [`email_creds_${key}`]);
    let existing = {};
    if (existingRow.rows[0]) { try { existing = JSON.parse(existingRow.rows[0].value); } catch { existing = {}; } }

    const incoming = {
      api_key: req.body.api_key === '' ? existing.api_key : (req.body.api_key ?? existing.api_key ?? ''),
      domain: req.body.domain ?? existing.domain ?? '',
      api_url: req.body.api_url ?? existing.api_url ?? '',
      api_method: req.body.api_method ?? existing.api_method ?? 'POST',
      api_headers: req.body.api_headers ?? existing.api_headers ?? '',
      api_body_template: req.body.api_body_template ?? existing.api_body_template ?? '',
    };

    if (key === 'custom') {
      if (incoming.api_headers) { try { JSON.parse(incoming.api_headers); } catch { return res.status(400).json({ error: 'Headers must be valid JSON, e.g. {"Authorization":"Bearer {{api_key}}"}' }); } }
    }

    await query(
      'INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()',
      [`email_creds_${key}`, JSON.stringify(incoming)]
    );
    res.json({ message: `${API_PROVIDERS[key].label} credentials saved` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save provider credentials' });
  }
});

// DELETE /api/email/providers/:key — remove one provider's saved
// credentials (also drops it from the failover chain if present there).
router.delete('/providers/:key', requireAdmin, async (req, res) => {
  try {
    const key = req.params.key;
    if (key === 'smtp') {
      await query('DELETE FROM settings WHERE key=$1', ['smtp_password']);
    } else {
      await query('DELETE FROM settings WHERE key=$1', [`email_creds_${key}`]);
    }
    const row = await query("SELECT value FROM settings WHERE key='email_provider_priority'");
    if (row.rows[0]) {
      try {
        const priority = JSON.parse(row.rows[0].value).filter((p) => p !== key);
        await query("UPDATE settings SET value=$1, updated_at=NOW() WHERE key='email_provider_priority'", [JSON.stringify(priority)]);
      } catch { /* ignore malformed existing priority */ }
    }
    res.json({ message: 'Provider credentials removed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove provider credentials' });
  }
});

// PUT /api/email/priority — set the BACKUP failover order, e.g. {"priority":
// ["sendgrid","resend","smtp"]}. The selected email_provider is
// always the primary provider; these keys define the preferred backup order.
// Any other configured providers are appended automatically as a final safety net.
router.put('/priority', requireAdmin, async (req, res) => {
  try {
    const priority = req.body?.priority;
    if (!Array.isArray(priority)) return res.status(400).json({ error: 'priority must be an array of provider keys' });
    const valid = priority.every((p) => p === 'smtp' || !!API_PROVIDERS[p]);
    if (!valid) return res.status(400).json({ error: 'priority contains an unknown provider key' });
    if (new Set(priority).size !== priority.length) return res.status(400).json({ error: 'priority cannot contain duplicate providers' });
    await query(
      "INSERT INTO settings (key,value) VALUES ('email_provider_priority',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()",
      [JSON.stringify(priority)]
    );
    res.json({ message: 'Failover order saved', priority });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save failover order' });
  }
});

// POST /api/email/test
// Professional, on-brand content for the admin's "send test email" action —
// this is what an admin actually reads to confirm delivery works, so it
// gets the same branded shell/typography as real customer emails rather
// than a bare, unstyled "it works!" snippet.
function buildTestEmailContent({ body, storeName, providerLabel, fromAddress, to }) {
  const sentAt = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  const vars = {
    store_name: storeName, provider: providerLabel, from_address: fromAddress || '',
    recipient_email: to, sent_at: sentAt,
  };
  return String(body || '').replace(/{{\s*(\w+)\s*}}/g, (_, key) => vars[key] !== undefined ? vars[key] : '');
}

// Verifies a single provider's credentials without sending anything.
// Accepts an optional inline `settings` override so the admin can verify
// what's currently typed in the form — this is the fix for "clicking Test
// doesn't work": it used to always re-read whatever was last SAVED to the
// database, silently ignoring anything typed but not yet saved.
router.post('/test-connection', requireAdmin, async (req, res) => {
  try {
    const saved = await getEmailSettings();
    const s = mergeSettingsOverride(saved, req.body?.settings);
    // Explicit provider param lets the per-provider "Test" button in the
    // new failover UI check exactly that card, regardless of which
    // provider is currently "primary".
    const provider = req.body?.provider || resolveProvider(s);
    const fromAddress = s.email_from_address || s.smtp_user || process.env.EMAIL_FROM || process.env.EMAIL_USER;
    if (!fromAddress) return res.status(400).json({ error: 'From address is required' });
    if (provider !== 'smtp') {
      const meta = API_PROVIDERS[provider];
      if (!meta) return res.status(400).json({ error: `Unknown provider: ${provider}` });
      const creds = getProviderCredentials(s, provider);
      const apiKey = provider === s.email_provider && s.email_api_key ? s.email_api_key : creds.api_key;
      if (provider === 'custom') {
        if (!(s.api_url || creds.api_url)) return res.status(400).json({ error: 'Custom API URL is required' });
        // No generic "verify" call exists for an arbitrary API — a real
        // Send Test Email is the meaningful check for Custom providers.
        return res.json({ ok: true, provider, message: 'Custom API endpoint saved — use "Send Test Email" below to verify it actually delivers.' });
      }
      if (!apiKey) return res.status(400).json({ error: `${meta.label} API key is not configured` });
      const domain = provider === s.email_provider && s.email_api_domain ? s.email_api_domain : creds.domain;
      if (meta.fields.includes('domain') && !domain) return res.status(400).json({ error: `${meta.label} sending domain is required` });
      const checks = {
        brevo: ['https://api.brevo.com/v3/account', { 'api-key': apiKey, Accept: 'application/json' }],
        sendgrid: ['https://api.sendgrid.com/v3/user/profile', { Authorization: `Bearer ${apiKey}` }],
        mailgun: [`https://api.mailgun.net/v3/${encodeURIComponent(domain)}/domains`, { Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}` }],
        postmark: ['https://api.postmarkapp.com/server', { 'X-Postmark-Server-Token': apiKey, Accept: 'application/json' }],
        resend: ['https://api.resend.com/domains', { Authorization: `Bearer ${apiKey}` }],
      };
      const [url, headers] = checks[provider] || [];
      const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 10000);
      try { const check = await fetch(url, { headers, signal: controller.signal }); if (!check.ok) { const text = await check.text(); throw new Error(text || `Provider returned ${check.status}`); } }
      finally { clearTimeout(timer); }
      return res.json({ ok: true, provider, message: `${meta.label} connection verified successfully.` });
    }
    const smtpHost = s.smtp_host || process.env.EMAIL_HOST || '';
    const smtpUser = s.smtp_user || process.env.EMAIL_USER || '';
    const smtpPass = s.smtp_password || process.env.EMAIL_PASS || '';
    if (!smtpHost || !smtpUser || !smtpPass) return res.status(400).json({ error: 'SMTP host, username and password are required' });
    if (String(smtpHost).includes('@') || /\s/.test(String(smtpHost))) {
      return res.status(400).json({ error: `Invalid SMTP host "${smtpHost}". Enter the server hostname (for Brevo: smtp-relay.brevo.com), not the SMTP login email.` });
    }
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({ host: smtpHost, port: parseInt(s.smtp_port || process.env.EMAIL_PORT || '587'), secure: (s.smtp_secure ?? process.env.EMAIL_SECURE) === 'true', auth: { user: smtpUser, pass: smtpPass }, family: 4, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 10000 });
    await transporter.verify();
    return res.json({ ok: true, provider: 'smtp', message: 'SMTP connection and authentication verified successfully.' });
  } catch (error) {
    // Raw nodemailer/network error codes are accurate but not
    // self-explanatory to an admin — translate the common ones into a
    // plain-language hint appended to the real message, so "Connection
    // test failed: connect ETIMEDOUT" doesn't leave someone guessing.
    const code = error.code || '';
    const msg = error.message || '';
    let hint = '';
    if (code === 'ETIMEDOUT' || code === 'ESOCKET' || /timed? ?out/i.test(msg)) {
      hint = ' — the connection timed out. This almost always means the SMTP port is blocked by your network, firewall, or hosting provider (many hosts, including Railway\'s Free/Hobby tier, block outbound SMTP ports 25/465/587 entirely). Try a different network, or use an API provider (Brevo/SendGrid/etc.) instead — those use HTTPS (port 443), which is essentially never blocked.';
    } else if (code === 'ECONNREFUSED') {
      hint = ' — the server actively refused the connection. Double-check the host and port are correct for your provider.';
    } else if (code === 'EAUTH' || /invalid login|authentication failed|535/i.test(msg)) {
      hint = ' — the server rejected the username/password. For Gmail/Google Workspace you need an "app password", not your normal login password; for most transactional providers use the SMTP username/key shown on their dashboard, not your account email.';
    } else if (/wrong version number|ssl routines|self.signed/i.test(msg)) {
      hint = ' — this usually means the Encryption setting doesn\'t match the port (port 465 needs "SSL/TLS", port 587 needs "STARTTLS"). Double-check that pairing above.';
    } else if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
      hint = ' — the hostname could not be resolved. Check the SMTP Host field for typos.';
    }
    res.status(500).json({ error: `Connection test failed: ${msg}${hint}` });
  }
});

// Sends a real test email through the full configured failover chain —
// the same code path (sendEmail) real order/account emails use — so a
// passing test actually means live emails will go out, not just that one
// isolated check succeeded. Accepts an optional inline `settings` override
// (same fix as test-connection above): the admin's currently-typed form
// values are what gets tested, whether or not they've clicked Save yet.
router.post('/test', requireAdmin, async (req, res) => {
  try {
    const result = await query("SELECT key, value FROM settings WHERE key LIKE 'smtp_%' OR key LIKE 'email_%'");
    const saved = {};
    result.rows.forEach((r) => { saved[r.key] = r.value; });
    const requestedProvider = req.body?.settings?.email_provider || saved.email_provider || 'smtp';
    const s = mergeProviderTestSettings(saved, requestedProvider, req.body?.settings);

    const { to } = req.body;
    if (!to) return res.status(400).json({ error: 'Recipient email required' });

    const storeName = s.email_from_name || 'Noor Mist';
    const fromAddress = s.email_from_address || s.smtp_user || process.env.EMAIL_FROM || process.env.EMAIL_USER;
    const labelFor = (p) => (p === 'smtp' ? 'SMTP' : API_PROVIDERS[p]?.label || p);
    // Best-effort provider name for the email's own body text — the actual
    // provider used (which may differ if this one fails and it falls back)
    // is reported back to the admin in the API response regardless.
    const predictedProvider = labelFor(resolveProviderChain(s)[0]);

    const subjectTemplate = s.email_test_subject || `${storeName} — Email Configuration Test`;
    const body = s.email_test_body || '<h1>Email Delivery Confirmed</h1><p>This is a test email sent from {{store_name}}.</p><p>Provider: <strong>{{provider}}</strong></p><p>From: {{from_address}}</p><p>Sent to: {{recipient_email}}</p><p>Sent at: {{sent_at}}</p>';

    // Delegate the actual send to the shared sendEmail() path so the test
    // gets identical provider handling AND failover behavior AND the same
    // branded shell/footer every real customer email gets — not a
    // separate, unstyled code path that could pass while the real path fails.
    let sendResult;
    try {
      sendResult = await sendEmail({
        to,
        subject: subjectTemplate.replace(/{{\s*(\w+)\s*}}/g, (_, key) => ({ store_name: storeName, provider: predictedProvider, from_address: fromAddress || '', recipient_email: to })[key] ?? ''),
        html: buildTestEmailContent({ body, storeName, providerLabel: predictedProvider, fromAddress, to }),
        settings: s,
        footerNote: s.email_test_footer || 'This is an automated test message and does not require a reply.',
      });
    } catch (sendError) {
      const attempts = sendError.attempts || [];
      const summary = attempts.length
        ? attempts.map((a) => `${labelFor(a.provider)}: ${a.status === 'sent' ? 'sent' : a.error}`).join(' | ')
        : sendError.message;
      await query("INSERT INTO settings (key,value) VALUES ('email_last_test_at',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()", [new Date().toISOString()]).catch(()=>{});
      await query("INSERT INTO settings (key,value) VALUES ('email_last_test_status','failed') ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()").catch(()=>{});
      await query("INSERT INTO settings (key,value) VALUES ('email_last_test_error',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()", [summary]).catch(()=>{});
      return res.status(502).json({ error: attempts.length > 1 ? `All configured providers failed — ${summary}` : summary, attempts });
    }

    if (!sendResult.ok) {
      // Genuinely nothing configured at all (no provider, no from address).
      return res.status(400).json({ error: 'Email is not configured — add an API key or SMTP settings' });
    }

    const providerLabel = labelFor(sendResult.provider);
    const attempts = sendResult.attempts || [];
    const failedFirst = attempts.filter((a) => a.status === 'failed');
    const note = failedFirst.length
      ? ` (fell back from ${failedFirst.map((a) => labelFor(a.provider)).join(', ')} after failure)`
      : '';

    await query("INSERT INTO settings (key,value) VALUES ('email_last_test_at',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()", [new Date().toISOString()]);
    await query("INSERT INTO settings (key,value) VALUES ('email_last_test_status','success') ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()");
    await query("INSERT INTO settings (key,value) VALUES ('email_last_test_provider',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()", [providerLabel]);
    await query("INSERT INTO settings (key,value) VALUES ('email_last_test_error','') ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()");
    res.json({ message: `Test email sent successfully via ${providerLabel}${note}`, provider: sendResult.provider, attempts });
  } catch (error) {
    await query("INSERT INTO settings (key,value) VALUES ('email_last_test_at',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()", [new Date().toISOString()]).catch(()=>{});
    await query("INSERT INTO settings (key,value) VALUES ('email_last_test_status','failed') ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()").catch(()=>{});
    await query("INSERT INTO settings (key,value) VALUES ('email_last_test_error',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()", [error.message]).catch(()=>{});
    res.status(500).json({ error: `Failed to send test email: ${error.message}` });
  }
});

// POST /api/email/providers/:key/test — tests exactly ONE provider,
// bypassing the failover chain entirely. Used by each provider card's own
// "Test" button so the admin can verify each configured provider
// individually before relying on it as a fallback. Accepts inline
// credential overrides the same way /test does.
router.post('/providers/:key/test', requireAdmin, async (req, res) => {
  try {
    const key = req.params.key;
    if (key !== 'smtp' && !API_PROVIDERS[key]) return res.status(400).json({ error: `Unknown provider: ${key}` });
    const { to } = req.body;
    if (!to) return res.status(400).json({ error: 'Recipient email required' });

    const saved = await getEmailSettings();
    const s = mergeProviderTestSettings(saved, key, req.body?.settings);

    if (!providerHasCredentials(s, key)) {
      return res.status(400).json({ error: `${key === 'smtp' ? 'SMTP' : API_PROVIDERS[key].label} is not configured` });
    }

    const storeName = s.email_from_name || 'Noor Mist';
    const fromAddress = s.email_from_address || s.smtp_user || process.env.EMAIL_FROM || process.env.EMAIL_USER;
    if (!fromAddress) return res.status(400).json({ error: '"From Address" is required' });
    const providerLabel = key === 'smtp' ? 'SMTP' : API_PROVIDERS[key].label;
    const replyTo = s.email_reply_to || '';

    const subjectTemplate = s.email_test_subject || `${storeName} — Email Configuration Test`;
    const subject = subjectTemplate.replace(/{{\s*(\w+)\s*}}/g, (_, k) => ({ store_name: storeName, provider: providerLabel, from_address: fromAddress, recipient_email: to })[k] ?? '');
    const body = s.email_test_body || '<h1>Email Delivery Confirmed</h1><p>This is a test email sent from {{store_name}}.</p><p>Provider: <strong>{{provider}}</strong></p><p>From: {{from_address}}</p><p>Sent to: {{recipient_email}}</p><p>Sent at: {{sent_at}}</p>';
    const html = buildTestEmailContent({ body, storeName, providerLabel, fromAddress, to });

    await attemptProviderSend(key, s, { fromName: storeName, fromAddress, replyTo, to, subject, html });
    await query(`INSERT INTO email_delivery_logs (recipient, subject, email_type, provider, status, error_message, provider_message_id, duration_ms) VALUES ($1,$2,$3,$4,'sent',NULL,NULL,0)`, [to, subject, 'test', key]).catch(() => {});
    res.json({ message: `Test email sent successfully via ${providerLabel}` });
  } catch (error) {
    await query(`INSERT INTO email_delivery_logs (recipient, subject, email_type, provider, status, error_message, provider_message_id, duration_ms) VALUES ($1,$2,'test',$3,'failed',$4,NULL,0)`, [req.body?.to || '', 'Provider test', req.params.key, error.message]).catch(() => {});
    res.status(502).json({ error: error.message || 'Failed to send test email', provider: req.params.key });
  }
});

// ── Broadcast campaigns ───────────────────────────────────────────────
router.get('/broadcast/audience-count', requireAdmin, async (req, res) => {
  try {
    const audience=req.query.audience||'all';
    if(!AUDIENCE_LABELS[audience]) return res.status(400).json({error:'Invalid audience'});
    const ids=String(req.query.userIds||'').split(',').map(v=>parseInt(v,10)).filter(Boolean);
    const recipients=await resolveAudience(audience,ids);
    res.json({count:recipients.length});
  } catch(e){res.status(500).json({error:'Failed to count audience'});}
});

router.post('/broadcast/test', requireAdmin, async (req,res)=>{
  try{
    const {to,subject,body}=req.body;
    if(!to||!subject?.trim()||!body?.trim()) return res.status(400).json({error:'Recipient, subject and body are required'});
    const settings=await getEmailSettings();
    const vars={customer_name:'Preview Customer',store_name:settings.email_from_name||'Store',current_year:String(new Date().getFullYear())};
    const renderLocal=x=>String(x).replace(/{{\s*(\w+)\s*}}/g,(_,k)=>vars[k]??'');
    const result=await sendEmail({to:String(to).trim(),subject:renderLocal(subject),html:renderLocal(body),settings:{...settings,email_current_type:'broadcast_test'},footerNote:`Test email from ${settings.email_from_name||'your store'}.`});
    if(!result.ok)return res.status(400).json({error:result.reason||'Email could not be sent'});
    res.json({message:'Broadcast test email sent successfully'});
  }catch(e){res.status(500).json({error:e.message||'Failed to send broadcast test'});}
});

router.post('/broadcast', requireAdmin, async (req,res)=>{
  try{
    const {mode='send',name,audience,userIds,subject,body,scheduledAt}=req.body;
    if(!audience||!AUDIENCE_LABELS[audience])return res.status(400).json({error:'Invalid audience'});
    if(!subject?.trim()||!body?.trim())return res.status(400).json({error:'Subject and body are required'});
    if(mode==='schedule'&&(!scheduledAt||new Date(scheduledAt)<=new Date()))return res.status(400).json({error:'Choose a future date and time'});
    const settings=await getEmailSettings();
    if(resolveProvider(settings)==='smtp'&&!settings.smtp_host)return res.status(400).json({error:'Email is not configured yet — set it up in Email Settings first'});
    const recipients=await resolveAudience(audience,userIds);
    if(!recipients.length)return res.status(400).json({error:'No recipients match that audience'});
    const ids=audience==='selected'?recipients.map(r=>r.id):null;
    if(mode==='draft'){
      const campaign=await saveCampaign({name,subject,body,audience,userIds:ids,recipientCount:recipients.length,status:'draft',createdBy:req.user?.id});
      return res.status(201).json({message:'Broadcast draft saved',campaign});
    }
    if(mode==='schedule'){
      const campaign=await saveCampaign({name,subject,body,audience,userIds:ids,recipientCount:recipients.length,status:'scheduled',scheduledAt:new Date(scheduledAt),createdBy:req.user?.id});
      return res.status(201).json({message:'Broadcast scheduled',campaign});
    }
    const campaign=await saveCampaign({name,subject,body,audience,userIds:ids,recipientCount:recipients.length,status:'processing',createdBy:req.user?.id});
    const outcome=await sendCampaignRecord(campaign);
    const fresh=(await query('SELECT * FROM email_campaigns WHERE id=$1',[campaign.id])).rows[0];
    res.json({message:`Sent to ${outcome.sent} of ${outcome.total} recipients`,...outcome,campaign:fresh});
  }catch(e){console.error(e);res.status(500).json({error:e.message||'Failed to process broadcast'});}
});

router.post('/broadcast/:id/send', requireAdmin, async (req,res)=>{
  try{
    const r=await query("SELECT * FROM email_campaigns WHERE id=$1 AND status IN ('draft','scheduled')",[req.params.id]);
    if(!r.rows.length)return res.status(404).json({error:'Draft or scheduled campaign not found'});
    await query("UPDATE email_campaigns SET status='processing',scheduled_at=NULL,updated_at=NOW() WHERE id=$1",[req.params.id]);
    const outcome=await sendCampaignRecord({...r.rows[0],status:'processing'});
    res.json({message:`Sent to ${outcome.sent} of ${outcome.total} recipients`,...outcome});
  }catch(e){res.status(500).json({error:e.message||'Failed to send campaign'});}
});
router.post('/broadcast/:id/cancel', requireAdmin, async (req,res)=>{
  try{const r=await query("UPDATE email_campaigns SET status='cancelled',updated_at=NOW() WHERE id=$1 AND status IN ('draft','scheduled') RETURNING *",[req.params.id]);if(!r.rows.length)return res.status(404).json({error:'Only draft or scheduled campaigns can be cancelled'});res.json({campaign:r.rows[0]});}
  catch(e){res.status(500).json({error:'Failed to cancel campaign'});}
});
router.get('/broadcast/history', requireAdmin, async (req,res)=>{try{res.json({campaigns:await getCampaignHistory()});}catch(e){res.status(500).json({error:'Failed to fetch broadcast history'});}});

router.get('/unsubscribe', async (req,res)=>{
  try{
    const userId=Number(req.query.user); const token=String(req.query.token||'');
    if(!userId||!token)return res.status(400).send('<h2>Invalid unsubscribe link</h2>');
    const r=await query("SELECT id,email FROM users WHERE id=$1 AND role='customer'",[userId]);
    if(!r.rows.length||!verifyUnsubscribeToken(userId,r.rows[0].email,token))return res.status(400).send('<h2>Invalid unsubscribe link</h2>');
    await query('UPDATE users SET marketing_opt_in=false,updated_at=NOW() WHERE id=$1',[userId]);
    res.send('<div style="font-family:Arial;max-width:600px;margin:60px auto;text-align:center;padding:24px"><h1>You’re unsubscribed</h1><p>Promotional emails are now disabled for your account. Transactional order and account emails will still be sent.</p></div>');
  }catch(e){res.status(500).send('<h2>Unable to process unsubscribe request</h2>');}
});

router.get('/logs', requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50'), 200);
    const result = await query('SELECT * FROM email_delivery_logs ORDER BY created_at DESC LIMIT $1', [limit]);
    res.json({ logs: result.rows });
  } catch (error) { res.status(500).json({ error: 'Failed to fetch email delivery logs' }); }
});

router.get('/broadcast-templates', requireAdmin, async (req, res) => {
  try { const result = await query('SELECT * FROM email_broadcast_templates ORDER BY label ASC'); res.json({ templates: result.rows }); }
  catch (error) { res.status(500).json({ error: 'Failed to fetch broadcast templates' }); }
});

router.post('/broadcast-templates', requireAdmin, async (req, res) => {
  try { const { key, label, subject, body, is_active = true } = req.body; if (!key || !label || subject === undefined || body === undefined) return res.status(400).json({ error: 'Key, label, subject and body are required' }); const result = await query(`INSERT INTO email_broadcast_templates (key,label,subject,body,is_active) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (key) DO UPDATE SET label=EXCLUDED.label,subject=EXCLUDED.subject,body=EXCLUDED.body,is_active=EXCLUDED.is_active,updated_at=NOW() RETURNING *`, [key,label,subject,body,is_active]); res.json({ template: result.rows[0] }); }
  catch (error) { res.status(500).json({ error: 'Failed to save broadcast template' }); }
});

router.delete('/broadcast-templates/:id', requireAdmin, async (req, res) => {
  try { await query('DELETE FROM email_broadcast_templates WHERE id=$1', [req.params.id]); res.json({ message: 'Broadcast template deleted' }); }
  catch (error) { res.status(500).json({ error: 'Failed to delete broadcast template' }); }
});

module.exports = router;
