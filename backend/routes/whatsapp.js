const express = require('express');
const { query } = require('../config/database');
const { requireAdmin } = require('../middleware/auth');
const whatsappService = require('../services/whatsappService');
const { maskPhone, normalizePhone } = require('../utils/phone');

const router = express.Router();

// GET /api/admin/whatsapp/settings
router.get('/settings', requireAdmin, async (req, res) => {
  try {
    const settings = await whatsappService.getSettings();
    const status = await whatsappService.getConnectionStatus();
    const creds = await whatsappService.getCredentials();
    res.json({
      settings: {
        enabled: settings.enabled,
        order_confirmation_enabled: settings.order_confirmation_enabled,
        trigger_type: settings.trigger_type,
        message_template: settings.message_template,
        template_name: settings.template_name || '',
        template_language: settings.template_language || 'en_US',
      },
      // Never the raw values — only presence — matches email.js's
      // smtp_password_set / email_api_key_set pattern.
      connection: status,
      // Phone Number ID isn't a secret (it's just an identifier, not a
      // credential) so it's safe to echo back for the admin to confirm —
      // the access token never is.
      credentials: {
        phone_number_id: creds.phoneNumberId || '',
        access_token_set: !!creds.accessToken,
        api_version: creds.apiVersion,
        source: creds.source,
      },
      // The order variables currently appear in message_template maps
      // 1:1 onto Meta's {{1}}, {{2}}, ... positional template parameters.
      variable_mapping: whatsappService.extractVariableOrder(settings.message_template)
        .map((key, i) => ({ meta_param: i + 1, variable: key })),
      available_variables: whatsappService.SUPPORTED_VARIABLES,
      trigger_types: whatsappService.TRIGGER_TYPES,
      default_message_template: whatsappService.DEFAULT_MESSAGE_TEMPLATE,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch WhatsApp settings' });
  }
});

// PUT /api/admin/whatsapp/settings
router.put('/settings', requireAdmin, async (req, res) => {
  try {
    const { enabled, order_confirmation_enabled, trigger_type, message_template, template_name, template_language } = req.body;
    if (trigger_type !== undefined && !whatsappService.TRIGGER_TYPES.includes(trigger_type)) {
      return res.status(400).json({ error: 'Invalid trigger_type' });
    }
    const settings = await whatsappService.updateSettings({
      enabled, order_confirmation_enabled, trigger_type, message_template, template_name, template_language,
    });
    res.json({ message: 'WhatsApp settings updated', settings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update WhatsApp settings' });
  }
});

// PUT /api/admin/whatsapp/credentials — save the Meta WhatsApp Business
// Cloud API credentials from the admin panel (Phone Number ID, Access
// Token, API version). Blank access_token means "keep the current one".
router.put('/credentials', requireAdmin, async (req, res) => {
  try {
    const { phone_number_id, access_token, api_version } = req.body || {};
    const status = await whatsappService.saveCredentials({ phone_number_id, access_token, api_version });
    res.json({ message: 'WhatsApp credentials saved', connection: status });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save WhatsApp credentials' });
  }
});

// DELETE /api/admin/whatsapp/credentials — remove admin-saved credentials
// (falls back to environment variables, if any, after removal).
router.delete('/credentials', requireAdmin, async (req, res) => {
  try {
    const status = await whatsappService.clearCredentials();
    res.json({ message: 'WhatsApp credentials removed', connection: status });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove WhatsApp credentials' });
  }
});

// POST /api/admin/whatsapp/settings/reset — restore default message template
router.post('/settings/reset', requireAdmin, async (req, res) => {
  try {
    const settings = await whatsappService.updateSettings({ message_template: whatsappService.DEFAULT_MESSAGE_TEMPLATE });
    res.json({ message: 'Template reset to default', settings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset template' });
  }
});

// POST /api/admin/whatsapp/preview — render the (possibly unsaved) draft
// template against sample order data, for the live preview panel.
router.post('/preview', requireAdmin, (req, res) => {
  try {
    const template = req.body?.message_template ?? '';
    const rendered = whatsappService.render(template, whatsappService.sampleVars());
    res.json({ preview: rendered });
  } catch (error) {
    res.status(500).json({ error: 'Failed to render preview' });
  }
});

// POST /api/admin/whatsapp/test — send the currently SAVED template to a
// test number using sample order data. Never reveals the access token.
router.post('/test', requireAdmin, async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });
    if (!(await whatsappService.credentialsConfigured())) {
      return res.status(400).json({ error: 'WhatsApp is not configured. Add the Phone Number ID and Access Token in Admin > WhatsApp Notifications.' });
    }
    await whatsappService.sendTestMessage(phone);
    res.json({ message: '✓ Test message sent successfully' });
  } catch (error) {
    console.error('WhatsApp test send:', error.message);
    res.status(400).json({ error: error.message || 'Failed to send test message' });
  }
});

// GET /api/admin/whatsapp/logs
router.get('/logs', requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const offset = (page - 1) * limit;
    const clauses = [];
    const params = [];
    if (req.query.status) { params.push(req.query.status); clauses.push(`m.status = $${params.length}`); }
    if (req.query.search) {
      const q = `%${String(req.query.search).trim()}%`;
      params.push(q);
      clauses.push(`(o.order_number ILIKE $${params.length} OR m.phone ILIKE $${params.length})`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const countResult = await query(`SELECT COUNT(*) FROM whatsapp_messages m LEFT JOIN orders o ON o.id=m.order_id ${where}`, params);
    const listParams = [...params, limit, offset];
    const result = await query(
      `SELECT m.*, o.order_number,
        COALESCE(NULLIF(TRIM(CONCAT_WS(' ', o.shipping_address->>'firstName', o.shipping_address->>'lastName')), ''), 'Guest Customer') AS customer_name
       FROM whatsapp_messages m
       LEFT JOIN orders o ON o.id = m.order_id
       ${where}
       ORDER BY m.created_at DESC
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams
    );
    const logs = result.rows.map((row) => ({ ...row, phone_masked: maskPhone(row.phone) }));
    const total = parseInt(countResult.rows[0].count, 10);
    res.json({ logs, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch WhatsApp message logs' });
  }
});

// POST /api/admin/whatsapp/messages/:id/retry
router.post('/messages/:id/retry', requireAdmin, async (req, res) => {
  try {
    const result = await whatsappService.retryMessage(req.params.id);
    if (!result.ok) {
      return res.status(400).json({ error: result.error || `Retry could not be sent (${result.reason})` });
    }
    res.json({ message: 'Message resent successfully', result });
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to retry message' });
  }
});

// POST /api/admin/whatsapp/orders/:orderId/send — manual "Send Again" from
// Admin > Orders > Order Details. Requires confirmation on the frontend
// before calling this (duplicate-notification guard is a UI concern).
router.post('/orders/:orderId/send', requireAdmin, async (req, res) => {
  try {
    const orderResult = await query('SELECT * FROM orders WHERE id=$1', [req.params.orderId]);
    if (!orderResult.rows.length) return res.status(404).json({ error: 'Order not found' });
    const result = await whatsappService.sendForOrder(orderResult.rows[0]);
    if (!result.ok) {
      const messages = {
        disabled: 'WhatsApp notifications are currently disabled',
        invalid_phone: 'This order has no valid WhatsApp/phone number on file',
        not_configured: 'WhatsApp is not configured on the backend',
        template_not_configured: 'No Meta-approved template name is configured',
      };
      return res.status(400).json({ error: messages[result.reason] || result.error || 'Message could not be sent' });
    }
    res.json({ message: 'WhatsApp notification sent', result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send WhatsApp notification' });
  }
});

// GET /api/admin/whatsapp/orders/:orderId — notification status for a
// single order, used by the Order Details drawer.
router.get('/orders/:orderId', requireAdmin, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM whatsapp_messages WHERE order_id=$1 ORDER BY created_at DESC LIMIT 5',
      [req.params.orderId]
    );
    res.json({ logs: result.rows.map((row) => ({ ...row, phone_masked: maskPhone(row.phone) })) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notification status for this order' });
  }
});

module.exports = router;
