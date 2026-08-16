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

// GET /api/email/providers — lets the admin UI render provider options
// (and which extra fields, like Mailgun's domain, each one needs) without
// hardcoding the list on the frontend.
router.get('/providers', requireAdmin, (req, res) => {
  const providers = Object.entries(API_PROVIDERS).map(([key, p]) => ({
    key,
    label: p.label,
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
    res.json({ settings, smtp_password_set, email_api_key_set });
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

router.post('/test-connection', requireAdmin, async (req, res) => {
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

router.post('/test', requireAdmin, async (req, res) => {
  try {
    const result = await query("SELECT key, value FROM settings WHERE key LIKE 'smtp_%' OR key LIKE 'email_%'");
    const s = {};
    result.rows.forEach((r) => { s[r.key] = r.value; });

    const { to } = req.body;
    if (!to) return res.status(400).json({ error: 'Recipient email required' });

    const provider = resolveProvider(s);
    const storeName = s.email_from_name || 'Noor Mist';
    const fromAddress = s.email_from_address || s.smtp_user;
    const providerLabel = provider === 'smtp' ? 'SMTP' : API_PROVIDERS[provider].label;

    if (provider !== 'smtp') {
      const meta = API_PROVIDERS[provider];
      if (!s.email_api_key) return res.status(400).json({ error: `${meta.label} API key not configured` });
      if (!fromAddress) return res.status(400).json({ error: `"From Address" is required to send via ${meta.label}` });
      if (meta.fields.includes('domain') && !s.email_api_domain) {
        return res.status(400).json({ error: `${meta.label} requires a sending domain — set it in Email Settings` });
      }
    } else if (!s.smtp_host) {
      return res.status(400).json({ error: 'Email is not configured — add an API key or SMTP settings' });
    }

    const subjectTemplate = s.email_test_subject || `${storeName} — Email Configuration Test`;
    const subject = subjectTemplate.replace(/{{\s*(\w+)\s*}}/g, (_, key) => ({ store_name: storeName, provider: providerLabel, from_address: fromAddress || '', recipient_email: to })[key] ?? '');
    const body = s.email_test_body || '<h1>Email Delivery Confirmed</h1><p>This is a test email sent from {{store_name}}.</p><p>Provider: <strong>{{provider}}</strong></p><p>From: {{from_address}}</p><p>Sent to: {{recipient_email}}</p><p>Sent at: {{sent_at}}</p>';

    // Delegate the actual send to the shared sendEmail() path so the test
    // gets identical provider handling AND the same branded shell/footer
    // every real customer email gets — not a separate, unstyled code path.
    await sendEmail({
      to,
      subject,
      html: buildTestEmailContent({ body, storeName, providerLabel, fromAddress, to }),
      settings: s,
      footerNote: s.email_test_footer || 'This is an automated test message and does not require a reply.',
    });

    await query("INSERT INTO settings (key,value) VALUES ('email_last_test_at',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()", [new Date().toISOString()]);
    await query("INSERT INTO settings (key,value) VALUES ('email_last_test_status','success') ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()");
    await query("INSERT INTO settings (key,value) VALUES ('email_last_test_provider',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()", [providerLabel]);
    await query("INSERT INTO settings (key,value) VALUES ('email_last_test_error','') ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()");
    res.json({ message: `Test email sent successfully via ${providerLabel}` });
  } catch (error) {
    await query("INSERT INTO settings (key,value) VALUES ('email_last_test_at',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()", [new Date().toISOString()]).catch(()=>{});
    await query("INSERT INTO settings (key,value) VALUES ('email_last_test_status','failed') ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()").catch(()=>{});
    await query("INSERT INTO settings (key,value) VALUES ('email_last_test_error',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()", [error.message]).catch(()=>{});
    res.status(500).json({ error: `Failed to send test email: ${error.message}` });
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
