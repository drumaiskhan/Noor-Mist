from pathlib import Path
p=Path('/mnt/data/smtp-work')
f=p/'backend/routes/email.js'; s=f.read_text()
s=s.replace("fields: p.fields,", "fields: p.fields,\n    setupUrl: p.setupUrl || null,")
s=s.replace("'email_reply_to', 'email_test_subject', 'email_test_body',", "'email_reply_to', 'email_test_subject', 'email_test_body', 'email_test_footer',")
needle="router.post('/test', requireAdmin, async (req, res) => {"
conn=r'''router.post('/test-connection', requireAdmin, async (req, res) => {
  try {
    const s = await getEmailSettings();
    const provider = resolveProvider(s);
    const fromAddress = s.email_from_address || s.smtp_user;
    if (!fromAddress) return res.status(400).json({ error: 'From address is required' });
    if (provider !== 'smtp') {
      const meta = API_PROVIDERS[provider];
      if (!s.email_api_key) return res.status(400).json({ error: `${meta.label} API key is not configured` });
      if (meta.fields.includes('domain') && !s.email_api_domain) return res.status(400).json({ error: `${meta.label} sending domain is required` });
      const checks = {
        brevo: ['https://api.brevo.com/v3/account', { 'api-key': s.email_api_key, Accept: 'application/json' }],
        sendgrid: ['https://api.sendgrid.com/v3/user/profile', { Authorization: `Bearer ${s.email_api_key}` }],
        mailgun: [`https://api.mailgun.net/v3/${encodeURIComponent(s.email_api_domain)}/domains`, { Authorization: `Basic ${Buffer.from(`api:${s.email_api_key}`).toString('base64')}` }],
        postmark: ['https://api.postmarkapp.com/server', { 'X-Postmark-Server-Token': s.email_api_key, Accept: 'application/json' }],
        resend: ['https://api.resend.com/domains', { Authorization: `Bearer ${s.email_api_key}` }],
      };
      const [url, headers] = checks[provider] || [];
      const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 10000);
      try { const check = await fetch(url, { headers, signal: controller.signal }); if (!check.ok) { const text = await check.text(); throw new Error(text || `Provider returned ${check.status}`); } }
      finally { clearTimeout(timer); }
      return res.json({ ok: true, provider, message: `${meta.label} connection verified successfully.` });
    }
    if (!s.smtp_host || !s.smtp_user || !s.smtp_password) return res.status(400).json({ error: 'SMTP host, username and password are required' });
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({ host: s.smtp_host, port: parseInt(s.smtp_port || '587'), secure: s.smtp_secure === 'true', auth: { user: s.smtp_user, pass: s.smtp_password }, family: 4, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 10000 });
    await transporter.verify();
    return res.json({ ok: true, provider: 'smtp', message: 'SMTP connection and authentication verified successfully.' });
  } catch (error) { res.status(500).json({ error: `Connection test failed: ${error.message}` }); }
});

'''
s=s.replace(needle,conn+needle)
# Add default test body in route before send
needle2="    // Delegate the actual send to the shared sendEmail() path"
insert="""    const subject = s.email_test_subject || `${storeName} — Email Configuration Test`;
    const body = s.email_test_body || '<h1>Email Delivery Confirmed</h1><p>This is a test email sent from {{store_name}}.</p><p>Provider: <strong>{{provider}}</strong></p><p>From: {{from_address}}</p><p>Sent to: {{recipient_email}}</p><p>Sent at: {{sent_at}}</p>';

"""
s=s.replace(needle2,insert+needle2)
s=s.replace("subject: `${storeName} — Email Configuration Test`,\n      html: buildTestEmailContent({ storeName, providerLabel, fromAddress, to }),", "subject,\n      html: buildTestEmailContent({ body, storeName, providerLabel, fromAddress, to }),")
s=s.replace("footerNote: 'This is an automated test message and does not require a reply.',", "footerNote: s.email_test_footer || 'This is an automated test message and does not require a reply.',")
# Persist status in test success and failure
success="    res.json({ message: `Test email sent successfully via ${providerLabel}` });"
rep="""    await query(\"INSERT INTO settings (key,value) VALUES ('email_last_test_at',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()\", [new Date().toISOString()]);
    await query(\"INSERT INTO settings (key,value) VALUES ('email_last_test_status','success') ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()\");
    await query(\"INSERT INTO settings (key,value) VALUES ('email_last_test_provider',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()\", [providerLabel]);
    await query(\"INSERT INTO settings (key,value) VALUES ('email_last_test_error','') ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()\");
    res.json({ message: `Test email sent successfully via ${providerLabel}` });"""
s=s.replace(success,rep)
old="""  } catch (error) {
    res.status(500).json({ error: `Failed to send test email: ${error.message}` });
  }
});"""
new="""  } catch (error) {
    await query(\"INSERT INTO settings (key,value) VALUES ('email_last_test_at',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()\", [new Date().toISOString()]).catch(()=>{});
    await query(\"INSERT INTO settings (key,value) VALUES ('email_last_test_status','failed') ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()\").catch(()=>{});
    await query(\"INSERT INTO settings (key,value) VALUES ('email_last_test_error',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()\", [error.message]).catch(()=>{});
    res.status(500).json({ error: `Failed to send test email: ${error.message}` });
  }
});"""
s=s.replace(old,new,1)
# delivery logs / broadcast templates
idx=s.rfind('module.exports = router;')
extra=r'''router.get('/logs', requireAdmin, async (req, res) => {
  try { const limit = Math.min(parseInt(req.query.limit || '100'), 200); const result = await query('SELECT * FROM email_delivery_logs ORDER BY created_at DESC LIMIT $1',[limit]); res.json({ logs: result.rows }); }
  catch (error) { res.status(500).json({ error: 'Failed to fetch email delivery logs' }); }
});

router.get('/broadcast-templates', requireAdmin, async (req, res) => {
  try { const result = await query('SELECT * FROM email_broadcast_templates ORDER BY label ASC'); res.json({ templates: result.rows }); }
  catch (error) { res.status(500).json({ error: 'Failed to fetch broadcast templates' }); }
});

router.post('/broadcast-templates', requireAdmin, async (req, res) => {
  try { const { key, label, subject, body, is_active = true } = req.body; if (!key || !label || subject === undefined || body === undefined) return res.status(400).json({ error: 'Key, label, subject and body are required' }); const result = await query(`INSERT INTO email_broadcast_templates (key,label,subject,body,is_active) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (key) DO UPDATE SET label=EXCLUDED.label,subject=EXCLUDED.subject,body=EXCLUDED.body,is_active=EXCLUDED.is_active,updated_at=NOW() RETURNING *`,[key,label,subject,body,is_active]); res.json({ template: result.rows[0] }); }
  catch (error) { res.status(500).json({ error: 'Failed to save broadcast template' }); }
});

router.delete('/broadcast-templates/:id', requireAdmin, async (req, res) => {
  try { await query('DELETE FROM email_broadcast_templates WHERE id=$1',[req.params.id]); res.json({ message: 'Broadcast template deleted' }); }
  catch (error) { res.status(500).json({ error: 'Failed to delete broadcast template' }); }
});

'''
s=s[:idx]+extra+s[idx:]
f.write_text(s)

# Frontend API
f=p/'frontend/src/services/api.js'; s=f.read_text();
if 'testConnection:' not in s:
    s=s.replace("test: (data) => api.post('/email/test', data, { timeout: 20000 }),", "test: (data) => api.post('/email/test', data, { timeout: 20000 }),\n  testConnection: () => api.post('/email/test-connection', {}, { timeout: 15000 }),\n  getLogs: (params) => api.get('/email/logs', { params }),\n  getBroadcastTemplates: () => api.get('/email/broadcast-templates'),\n  saveBroadcastTemplate: (data) => api.post('/email/broadcast-templates', data),\n  deleteBroadcastTemplate: (id) => api.delete(`/email/broadcast-templates/${id}`),")
f.write_text(s)
