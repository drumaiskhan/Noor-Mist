import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { HiCheck, HiMail, HiLightningBolt, HiUserGroup, HiPaperAirplane, HiClock, HiEye, HiEyeOff, HiSearch, HiX, HiRefresh, HiExternalLink, HiDatabase } from 'react-icons/hi';
import { emailAPI, emailTemplatesAPI, userAPI } from '../../services/api';
import toast from 'react-hot-toast';

const TABS = ['Delivery', 'Templates', 'Automations', 'Broadcasts', 'Logs'];

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'All customers' },
  { value: 'active', label: 'Active customers only' },
  { value: 'new', label: 'New customers (last 30 days)' },
  { value: 'with_orders', label: 'Customers who have ordered' },
  { value: 'selected', label: 'Choose specific customers' },
];

// Quick-start content for the most common admin broadcasts — the admin can
// still edit subject/body freely after picking one.
const BROADCAST_PRESETS = {};

const TEMPLATE_CATEGORIES = { order_received: 'Transactional', order_confirmation: 'Transactional', order_confirmed: 'Transactional', order_processing: 'Transactional', order_packed: 'Transactional', order_shipped: 'Transactional', order_delivered: 'Transactional', order_cancelled: 'Transactional', order_refunded: 'Transactional', welcome: 'Account', email_verification: 'Account', login_link: 'Account', password_reset: 'Account', newsletter: 'Marketing' };

const TEMPLATE_LABELS = {
  order_received: 'Order Received / Confirmation Request',
  order_confirmation: 'Order Confirmation Request',
  order_confirmed: 'Order Confirmed',
  order_processing: 'Order Processing',
  order_packed: 'Order Packed',
  order_shipped: 'Order Shipped',
  order_delivered: 'Order Delivered',
  order_cancelled: 'Order Cancelled',
  order_refunded: 'Order Refunded',
  welcome: 'Welcome Email (after verification)',
  email_verification: 'Email Verification (first-time account)',
  password_reset: 'Password Reset',
  newsletter: 'Newsletter Subscription Confirmation',
};

// Maps each template key to the settings toggle that enables/disables it
const TOGGLE_KEYS = {
  order_confirmation: 'email_order_confirmation',
  order_confirmed: 'email_order_confirmed',
  order_processing: 'email_order_processing',
  order_packed: 'email_order_packed',
  order_shipped: 'email_order_shipped',
  order_delivered: 'email_order_delivered',
  order_cancelled: 'email_order_cancelled',
  order_refunded: 'email_order_refunded',
  welcome: 'email_welcome',
  email_verification: 'email_verification',
  password_reset: 'email_password_reset',
  newsletter: 'email_newsletter',
};

export default function EmailSettings() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('Delivery');
  const [form, setForm] = useState({ smtp_port: '587', smtp_secure: 'false', email_provider: 'brevo' });
  const [showApiKey, setShowApiKey] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const [drafts, setDrafts] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [connectionTesting, setConnectionTesting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [editingBroadcast, setEditingBroadcast] = useState(null);
  const [broadcastForm, setBroadcastForm] = useState({ key: '', label: '', subject: '', body: '', is_active: true });
  const [templateCategory, setTemplateCategory] = useState('All');

  // Broadcast tab state
  const [audience, setAudience] = useState('all');
  const [preset, setPreset] = useState('custom');
  const [broadcastName, setBroadcastName] = useState('');
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [scheduleMode, setScheduleMode] = useState('now');
  const [scheduledAt, setScheduledAt] = useState('');
  const [broadcastTestEmail, setBroadcastTestEmail] = useState('');
  const [broadcastPreview, setBroadcastPreview] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);

  // Customer picker (only used when audience === 'selected')
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomers, setSelectedCustomers] = useState([]); // [{id, email, first_name, last_name}]

  const { data: settingsData } = useQuery({
    queryKey: ['emailSettings'],
    queryFn: async () => { const { data } = await emailAPI.getSettings(); return data; },
  });
  const passwordSet = !!settingsData?.smtp_password_set;
  const apiKeySet = !!settingsData?.email_api_key_set;

  // Provider list (label + any extra fields like Mailgun's sending domain)
  // comes from the backend so adding a new provider there is enough — no
  // frontend redeploy needed to pick it up.
  const { data: providers = [] } = useQuery({
    queryKey: ['emailProviders'],
    queryFn: async () => { const { data } = await emailAPI.getProviders(); return data.providers ?? []; },
  });
  const selectedProvider = providers.find((p) => p.key === (form.email_provider || 'brevo'));
  const emailStatus = settingsData?.settings || {};
  const { data: deliveryLogs = [] } = useQuery({ queryKey: ['emailLogs'], queryFn: async () => { const { data } = await emailAPI.getLogs({ limit: 100 }); return data.logs ?? []; }, enabled: tab === 'Logs' });
  const { data: broadcastTemplates = [] } = useQuery({ queryKey: ['emailBroadcastTemplates'], queryFn: async () => { const { data } = await emailAPI.getBroadcastTemplates(); return data.templates ?? []; } });

  const { data: templates = [] } = useQuery({
    queryKey: ['emailTemplates'],
    queryFn: async () => { const { data } = await emailTemplatesAPI.getAll(); return data.templates ?? []; },
  });

  // Only merge in settings once per fetch (keyed off the query result
  // itself, not a derived object) — smtp_password is intentionally absent
  // from the response now, so the field starts blank rather than getting
  // pre-filled with a fake value that isn't the real saved key.
  useEffect(() => {
    if (settingsData?.settings) setForm((p) => ({ ...p, ...settingsData.settings }));
  }, [settingsData]);

  useEffect(() => {
    if (!templates.length) return;
    setDrafts((prev) => {
      const next = { ...prev };
      templates.forEach((tpl) => {
        if (!next[tpl.key]) next[tpl.key] = { subject: tpl.subject, body: tpl.body };
      });
      return next;
    });
  }, [templates]);

  const saveMutation = useMutation({
    mutationFn: emailAPI.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailSettings'] });
      // Clear the typed password out of state after a successful save —
      // it's already stored server-side; leaving it sitting in memory
      // serves no purpose. The field goes back to blank + "leave blank to
      // keep current" placeholder, same as before anything was typed.
      setForm((p) => ({ ...p, smtp_password: '', email_api_key: '' }));
      toast.success('Email settings saved');
    },
  });

  const saveTemplateMutation = useMutation({
    mutationFn: ({ key, data }) => emailTemplatesAPI.update(key, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['emailTemplates'] }); toast.success('Template saved'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save template'),
  });

  const resetTemplateMutation = useMutation({
    mutationFn: (key) => emailTemplatesAPI.reset(key),
    onSuccess: (_res, key) => {
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
      setDrafts((d) => { const next = { ...d }; delete next[key]; return next; });
      toast.success('Template reset to default');
    },
  });

  const { data: audienceCount } = useQuery({
    queryKey: ['emailAudienceCount', audience],
    queryFn: async () => {
      const { data } = await emailAPI.getAudienceCount({ audience });
      return data.count ?? 0;
    },
    enabled: tab === 'Broadcasts' && audience !== 'selected',
  });
  const recipientCount = audience === 'selected' ? selectedCustomers.length : audienceCount;

  // Searches existing customers by name/email/phone; only fetched once the
  // admin has typed something and picked "Choose specific customers".
  const { data: customerResults = [] } = useQuery({
    queryKey: ['customerSearch', customerSearch],
    queryFn: async () => {
      const { data } = await userAPI.getAll({ search: customerSearch, limit: 10 });
      return data.users ?? [];
    },
    enabled: tab === 'Broadcasts' && audience === 'selected' && customerSearch.trim().length > 0,
  });

  const toggleCustomer = (customer) => {
    setSelectedCustomers((prev) =>
      prev.some((c) => c.id === customer.id)
        ? prev.filter((c) => c.id !== customer.id)
        : [...prev, customer]
    );
  };
  const removeCustomer = (id) => setSelectedCustomers((prev) => prev.filter((c) => c.id !== id));

  const { data: broadcastHistory = [] } = useQuery({
    queryKey: ['emailBroadcastHistory'],
    queryFn: async () => {
      const { data } = await emailAPI.getBroadcastHistory();
      return data.campaigns ?? [];
    },
    enabled: tab === 'Broadcasts',
  });

  const applyPreset = (key) => { setPreset(key); const p = broadcastTemplates.find((x) => x.key === key); if (p) { setBroadcastName(p.label || ''); setBroadcastSubject(p.subject || ''); setBroadcastBody(p.body || ''); setConfirming(false); } };

  const resetBroadcast = () => { setBroadcastName(''); setBroadcastSubject(''); setBroadcastBody(''); setPreset('custom'); setScheduleMode('now'); setScheduledAt(''); setConfirming(false); setBroadcastPreview(false); };

  const handleBroadcastAction = async (mode='send') => {
    if (!broadcastSubject.trim() || !broadcastBody.trim()) return toast.error('Subject and message body are required');
    if (audience === 'selected' && selectedCustomers.length === 0) return toast.error('Select at least one customer');
    if (mode === 'schedule' && (!scheduledAt || new Date(scheduledAt) <= new Date())) return toast.error('Choose a future date and time');
    setSending(true);
    try {
      const payload = { mode, name: broadcastName.trim() || null, audience, subject: broadcastSubject, body: broadcastBody, ...(audience === 'selected' ? { userIds: selectedCustomers.map((c) => c.id) } : {}), ...(mode === 'schedule' ? { scheduledAt: new Date(scheduledAt).toISOString() } : {}) };
      const { data } = await emailAPI.sendBroadcast(payload);
      toast.success(data.message || (mode === 'draft' ? 'Draft saved' : mode === 'schedule' ? 'Broadcast scheduled' : 'Broadcast sent'));
      await queryClient.invalidateQueries({ queryKey: ['emailBroadcastHistory'] });
      setConfirming(false);
      if (mode !== 'draft') { setSelectedCustomers([]); resetBroadcast(); }
    } catch (err) { toast.error(err.response?.data?.error || 'Broadcast action failed'); } finally { setSending(false); }
  };

  const handleBroadcastTest = async () => {
    if (!broadcastTestEmail.trim()) return toast.error('Enter a test recipient email');
    if (!broadcastSubject.trim() || !broadcastBody.trim()) return toast.error('Add a subject and message first');
    try { const { data } = await emailAPI.testBroadcast({ to: broadcastTestEmail.trim(), subject: broadcastSubject, body: broadcastBody }); toast.success(data.message || 'Broadcast test sent'); queryClient.invalidateQueries({ queryKey: ['emailLogs'] }); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed to send broadcast test'); }
  };

  const previewBody = String(broadcastBody || '').replace(/{{\s*customer_name\s*}}/g, 'Aisha').replace(/{{\s*store_name\s*}}/g, form.email_from_name || 'Your Store').replace(/{{\s*current_year\s*}}/g, String(new Date().getFullYear()));

  const updateDraft = (key, field, value) =>
    setDrafts((d) => ({ ...d, [key]: { ...d[key], [field]: value } }));

  const handleTestConnection = async () => {
    setConnectionTesting(true);
    try {
      const { data } = await emailAPI.testConnection({ settings: form, provider: form.email_provider });
      toast.success(data.message || 'Connection verified');
    } catch (err) { toast.error(err.response?.data?.error || 'Connection test failed'); }
    finally { setConnectionTesting(false); }
  };

  // Sends the CURRENT form values as an inline override — this is the fix
  // for "the test button doesn't work": it used to always test whatever
  // was last saved to the database, silently ignoring anything typed but
  // not yet saved. Now it tests exactly what's on screen, and — if a
  // failover order is configured — the whole chain, reporting which
  // provider(s) were tried.
  const handleTest = async () => {
    if (!testEmail.trim()) return toast.error('Enter a recipient email');
    setTesting(true);
    try {
      const { data } = await emailAPI.test({ to: testEmail.trim(), settings: form });
      toast.success(data.message || 'Test email sent');
      queryClient.invalidateQueries({ queryKey: ['emailSettings'] });
      queryClient.invalidateQueries({ queryKey: ['emailLogs'] });
    } catch (err) {
      const data = err.response?.data;
      if (data?.attempts?.length > 1) {
        toast.error(data.attempts.map((a) => `${a.provider}: ${a.status === 'sent' ? 'sent' : a.error}`).join('\n'), { duration: 8000 });
      } else {
        toast.error(data?.error || 'Failed to send test email');
      }
    } finally { setTesting(false); }
  };

  const saveBroadcastTemplate = async () => { if (!broadcastForm.key || !broadcastForm.label) return toast.error('Template key and label are required'); try { await emailAPI.saveBroadcastTemplate(broadcastForm); toast.success('Broadcast template saved'); setEditingBroadcast(null); queryClient.invalidateQueries({ queryKey: ['emailBroadcastTemplates'] }); } catch (err) { toast.error(err.response?.data?.error || 'Failed to save broadcast template'); } };

  // Saves the currently-displayed provider card. Provider-specific
  // credentials (API key, SMTP host, Custom API template, etc.) go through
  // the per-provider endpoint so each provider's credentials are stored
  // independently — that's what makes it possible to have several
  // providers configured at once for failover. Global fields (from name/
  // address, reply-to, site URL) apply no matter which provider ends up
  // sending, so those still go through the shared settings endpoint.
  const handleSaveProviderCard = async () => {
    const key = form.email_provider || 'brevo';
    try {
      if (key === 'smtp') {
        await emailAPI.saveProviderCredentials('smtp', {
          smtp_host: form.smtp_host, smtp_port: form.smtp_port, smtp_user: form.smtp_user,
          smtp_password: form.smtp_password, smtp_secure: form.smtp_secure,
        });
      } else {
        await emailAPI.saveProviderCredentials(key, {
          api_key: form.email_api_key, domain: form.email_api_domain,
          api_url: form.api_url, api_method: form.api_method || 'POST',
          api_headers: form.api_headers, api_body_template: form.api_body_template,
        });
      }
      // Provider credentials are independent from the PRIMARY provider.
      // This is important when configuring a backup API: saving its API key
      // must not silently promote that backup to primary.
      await emailAPI.updateSettings({
        email_from_name: form.email_from_name, email_from_address: form.email_from_address,
        email_reply_to: form.email_reply_to, email_site_url: form.email_site_url,
      });
      queryClient.invalidateQueries({ queryKey: ['emailSettings'] });
      setForm((p) => ({ ...p, smtp_password: '', email_api_key: '' }));
      toast.success(`${key === 'smtp' ? 'SMTP' : selectedProvider?.label || key} settings saved${key === (settingsData?.settings?.email_provider || form.email_provider) ? '' : ' — primary provider unchanged'}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save settings');
    }
  };

  const handleSetPrimaryProvider = async () => {
    const key = form.email_provider || 'brevo';
    if (!providersStatus[key]?.configured && key !== 'smtp') {
      return toast.error(`${providerLabel(key)} must be configured before it can be primary`);
    }
    if (key === 'smtp' && !providersStatus.smtp?.configured) {
      return toast.error('SMTP must be configured before it can be primary');
    }
    try {
      await emailAPI.updateSettings({
        email_provider: key,
        email_from_name: form.email_from_name,
        email_from_address: form.email_from_address,
        email_reply_to: form.email_reply_to,
        email_site_url: form.email_site_url,
      });
      queryClient.invalidateQueries({ queryKey: ['emailSettings'] });
      toast.success(`${providerLabel(key)} is now the primary email provider`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to set primary provider');
    }
  };

  // Tests exactly the currently-displayed provider card, using whatever is
  // typed right now (even if not yet saved) — bypasses the failover chain
  // so the admin can verify one provider at a time.
  const [providerTesting, setProviderTesting] = useState(false);
  const handleTestProviderCard = async () => {
    if (!testEmail.trim()) return toast.error('Enter a recipient email');
    const key = form.email_provider || 'brevo';
    setProviderTesting(true);
    try {
      const settings = key === 'smtp'
        ? { smtp_host: form.smtp_host, smtp_port: form.smtp_port, smtp_user: form.smtp_user, smtp_password: form.smtp_password, smtp_secure: form.smtp_secure, email_from_name: form.email_from_name, email_from_address: form.email_from_address, email_reply_to: form.email_reply_to }
        : { api_key: form.email_api_key, domain: form.email_api_domain, api_url: form.api_url, api_method: form.api_method, api_headers: form.api_headers, api_body_template: form.api_body_template, email_from_name: form.email_from_name, email_from_address: form.email_from_address, email_reply_to: form.email_reply_to };
      const { data } = await emailAPI.testProvider(key, { to: testEmail.trim(), settings });
      toast.success(data.message || 'Test email sent');
      queryClient.invalidateQueries({ queryKey: ['emailLogs'] });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Test failed');
    } finally { setProviderTesting(false); }
  };

  // ── Failover order ──────────────────────────────────────────────────
  // Which configured providers are tried, and in what order, when sending
  // a real email. Local draft is seeded from the saved priority once, then
  // edited freely until "Save Failover Order" is clicked.
  const providersStatus = settingsData?.providers_status || {};
  // Populate the card's non-secret fields (domain, custom API url/method/
  // headers/body template) when the admin switches WHICH provider they're
  // viewing — but only then, not on every background settings refetch,
  // so it never clobbers something they're mid-typing.
  const lastViewedProviderRef = React.useRef(null);
  useEffect(() => {
    const key = form.email_provider || 'brevo';
    if (key === lastViewedProviderRef.current) return;
    lastViewedProviderRef.current = key;
    if (key === 'smtp' || !providersStatus[key]) return;
    const p = providersStatus[key];
    setForm((prev) => ({
      ...prev,
      email_api_domain: p.domain || '',
      api_url: p.api_url || '',
      api_method: p.api_method || 'POST',
      api_headers: p.api_headers || '',
      api_body_template: p.api_body_template || '',
    }));
  }, [form.email_provider, providersStatus]);
  const apiKeySetForSelected = !!providersStatus[form.email_provider || 'brevo']?.api_key_set;
  const [priorityDraft, setPriorityDraft] = useState(null);
  useEffect(() => {
    if (priorityDraft === null && settingsData?.provider_priority) {
      setPriorityDraft(settingsData.provider_priority.length ? settingsData.provider_priority : []);
    }
  }, [settingsData, priorityDraft]);
  const allProviderKeys = ['smtp', ...providers.map((p) => p.key)];
  const configuredKeys = allProviderKeys.filter((k) => providersStatus[k]?.configured);
  const activePriority = priorityDraft || [];
  const inactiveConfigured = configuredKeys.filter((k) => !activePriority.includes(k));
  const apiProviderOptions = providers.filter((p) => p.type === 'api' || p.type === undefined);
  const [backupType, setBackupType] = useState('api');
  const [backupApiProvider, setBackupApiProvider] = useState('brevo');
  useEffect(() => {
    const available = providers.filter((p) => p.type === 'api' || p.type === undefined);
    if (available.length && !available.some((p) => p.key === backupApiProvider)) {
      setBackupApiProvider(available[0].key);
    }
  }, [providers, backupApiProvider]);

  const providerLabel = (key) => (key === 'smtp' ? 'Custom SMTP' : providers.find((p) => p.key === key)?.label || key);
  const providerType = (key) => key === 'smtp' ? 'SMTP' : 'API';
  const addBackupProvider = (key) => {
    if (!key) return;
    if (activePriority.includes(key)) {
      toast('That provider is already in the failover order');
      return;
    }
    if (!providersStatus[key]?.configured) {
      setForm((prev) => ({ ...prev, email_provider: key }));
      toast.error(`${providerLabel(key)} is not configured yet. Configure and save it above, then add it to the failover order.`);
      return;
    }
    setPriorityDraft((p) => [...(p || []), key]);
  };
  const toggleInPriority = (key) => setPriorityDraft((p) => (p || []).includes(key) ? (p || []).filter((k) => k !== key) : [...(p || []), key]);
  const movePriority = (index, dir) => setPriorityDraft((p) => {
    const next = [...(p || [])];
    const swap = index + dir;
    if (swap < 0 || swap >= next.length) return next;
    [next[index], next[swap]] = [next[swap], next[index]];
    return next;
  });
  const savePriorityMutation = useMutation({
    mutationFn: () => emailAPI.savePriority(activePriority),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['emailSettings'] }); toast.success('Failover order saved'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save failover order'),
  });

  const f = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));
  const cls = 'w-full bg-noir border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-gold outline-none';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-playfair font-bold mb-1">Email Settings</h1>
        <p className="text-gray-400 text-sm">Manage email delivery, templates, automations, broadcasts, and delivery logs from one place.</p>
      </div>

      <div className="flex gap-1 p-1 bg-noir-card rounded-xl border border-gray-800 w-fit">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2.5 rounded-lg text-sm font-montserrat transition-all ${tab === t ? 'bg-gold text-black font-semibold' : 'text-gray-400 hover:text-white'}`}
          >{t}</button>
        ))}
      </div>

      {tab === 'Delivery' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 max-w-4xl">
          <div className="luxury-card p-6">
            <div className="flex items-center justify-between gap-4"><div><h3 className="font-playfair font-bold text-white text-xl">Email Delivery</h3><p className="text-xs text-gray-500 mt-1">Configure delivery, verify the connection, and send a real test message.</p></div><div className={`px-3 py-1.5 rounded-full text-xs font-semibold ${emailStatus.email_last_test_status === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/30' : emailStatus.email_last_test_status === 'failed' ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>{emailStatus.email_last_test_status === 'success' ? '● Operational' : emailStatus.email_last_test_status === 'failed' ? '● Needs attention' : '● Not tested'}</div></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">{[['Provider', selectedProvider?.label || ((form.email_provider || 'smtp') === 'smtp' ? 'Custom SMTP' : form.email_provider)], ['From', form.email_from_address || 'Not configured'], ['Last test', emailStatus.email_last_test_at ? new Date(emailStatus.email_last_test_at).toLocaleString() : 'Never'], ['Result', emailStatus.email_last_test_error || (emailStatus.email_last_test_status === 'success' ? 'Ready' : '—')]].map(([k,v]) => <div key={k} className="bg-noir rounded-lg border border-gray-800 p-3"><p className="text-[11px] text-gray-500">{k}</p><p className="text-sm text-white mt-1 break-words">{v}</p></div>)}</div>
            <div className="flex flex-wrap gap-3 mt-5"><button onClick={handleTestConnection} disabled={connectionTesting} className="btn-outline-gold text-sm"><HiRefresh className={`w-4 h-4 inline mr-2 ${connectionTesting ? 'animate-spin' : ''}`}/>{connectionTesting ? 'Checking…' : 'Test Connection'}</button></div>
          </div>
          <div className="luxury-card p-6 space-y-4"><div className="flex items-center justify-between gap-3"><div><h3 className="font-playfair font-bold text-white text-lg">Delivery Provider</h3><p className="text-xs text-gray-500 mt-1">This is the primary provider. Backups are configured separately below and never replace it unless you explicitly choose Set as Primary.</p></div><span className="text-[11px] px-2 py-1 rounded-full border border-green-500/20 text-green-400 bg-green-500/5">Primary: {providerLabel(emailStatus.email_provider || form.email_provider || 'smtp')}</span></div><div className="flex flex-wrap gap-2">{[...providers.map((p)=>({value:p.key,label:p.label})),{value:'smtp',label:'Custom SMTP'}].map((o)=><button key={o.value} onClick={()=>setForm(p=>({...p,email_provider:o.value}))} className={`px-4 py-2 rounded-lg text-sm border ${(form.email_provider||'brevo')===o.value?'bg-gold text-black border-gold font-semibold':'text-gray-400 border-gray-700 hover:text-white'}`}>{o.label}</button>)}</div>{selectedProvider?.setupUrl&&<a href={selectedProvider.setupUrl} target="_blank" rel="noreferrer" className="text-xs text-gold hover:underline inline-flex items-center gap-1">Open {selectedProvider.label} setup <HiExternalLink className="w-3 h-3"/></a>}</div>
          {(form.email_provider || 'brevo') !== 'smtp' && selectedProvider && <div className="luxury-card p-6 space-y-4"><h3 className="font-playfair font-bold text-white text-lg">{selectedProvider.label} Configuration</h3><div className="grid md:grid-cols-2 gap-4">{selectedProvider.key !== 'custom' && <div className="md:col-span-2"><label className="text-xs text-gray-400 mb-1 block">{selectedProvider.label} API Key</label><div className="relative"><input type={showApiKey?'text':'password'} value={form.email_api_key||''} onChange={f('email_api_key')} placeholder={apiKeySetForSelected?'Leave blank to keep current key':`Paste your ${selectedProvider.label} API key`} className={`${cls} pr-10`}/><button type="button" onClick={()=>setShowApiKey(x=>!x)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showApiKey?<HiEyeOff/>:<HiEye/>}</button></div>{apiKeySetForSelected&&!form.email_api_key&&<p className="text-xs text-gray-500 mt-1">✓ Credential saved securely. It is never returned to the browser.</p>}</div>}{selectedProvider.fields.includes('domain')&&<div className="md:col-span-2"><label className="text-xs text-gray-400 mb-1 block">Sending Domain</label><input value={form.email_api_domain||''} onChange={f('email_api_domain')} placeholder="mg.yourdomain.com" className={cls}/></div>}
            {selectedProvider.key === 'custom' && <>
              <div className="md:col-span-2"><label className="text-xs text-gray-400 mb-1 block">API Key / Token</label><div className="relative"><input type={showApiKey?'text':'password'} value={form.email_api_key||''} onChange={f('email_api_key')} placeholder={apiKeySetForSelected?'Leave blank to keep current key':'Paste your API key or token'} className={`${cls} pr-10`}/><button type="button" onClick={()=>setShowApiKey(x=>!x)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showApiKey?<HiEyeOff/>:<HiEye/>}</button></div><p className="text-xs text-gray-500 mt-1">Reference this below as <code className="text-gold">{'{{api_key}}'}</code> — it's substituted in, never displayed in the templates below.</p></div>
              <div className="md:col-span-2"><label className="text-xs text-gray-400 mb-1 block">API Endpoint URL</label><input value={form.api_url||''} onChange={f('api_url')} placeholder="https://api.youremailservice.com/v1/send" className={`${cls} font-mono text-xs`}/></div>
              <div><label className="text-xs text-gray-400 mb-1 block">HTTP Method</label><select value={form.api_method||'POST'} onChange={f('api_method')} className={cls}><option value="POST">POST</option><option value="PUT">PUT</option></select></div>
              <div className="md:col-span-2"><label className="text-xs text-gray-400 mb-1 block">Headers (JSON)</label><textarea rows={2} value={form.api_headers||''} onChange={f('api_headers')} placeholder={'{"Authorization":"Bearer {{api_key}}","Content-Type":"application/json"}'} className={`${cls} font-mono text-xs`}/></div>
              <div className="md:col-span-2"><label className="text-xs text-gray-400 mb-1 block">Body Template (JSON)</label><textarea rows={4} value={form.api_body_template||''} onChange={f('api_body_template')} placeholder={'{"to":"{{to}}","from":"{{from_email}}","subject":"{{subject}}","html":"{{html}}"}'} className={`${cls} font-mono text-xs`}/><p className="text-xs text-gray-500 mt-1">Tokens: <code className="text-gold">{'{{api_key}} {{to}} {{from_name}} {{from_email}} {{reply_to}} {{subject}} {{html}}'}</code></p></div>
            </>}
            <div><label className="text-xs text-gray-400 mb-1 block">Public Site URL</label><input value={form.email_site_url||''} onChange={f('email_site_url')} placeholder="https://your-site.example" className={cls}/><p className="text-xs text-gray-500 mt-1">Used for verification, password-reset, order and email links. Leave blank to use SITE_URL/FRONTEND_URL.</p></div><div><label className="text-xs text-gray-400 mb-1 block">From Name</label><input value={form.email_from_name||''} onChange={f('email_from_name')} placeholder="Noor Mist" className={cls}/></div><div><label className="text-xs text-gray-400 mb-1 block">From Address</label><input type="email" value={form.email_from_address||''} onChange={f('email_from_address')} placeholder="noreply@example.com" className={cls}/></div><div className="md:col-span-2"><label className="text-xs text-gray-400 mb-1 block">Reply-To</label><input type="email" value={form.email_reply_to||''} onChange={f('email_reply_to')} placeholder="support@example.com" className={cls}/><p className="text-xs text-gray-500 mt-1">Customer replies go here.</p></div></div><div className="flex flex-wrap gap-3 items-center"><button onClick={handleSaveProviderCard} className="btn-gold"><HiCheck className="w-4 h-4 inline mr-2"/>Save {selectedProvider.label} Settings</button>{form.email_provider !== emailStatus.email_provider && <button onClick={handleSetPrimaryProvider} className="btn-outline-gold text-sm">Set as Primary</button>}<button onClick={handleTestProviderCard} disabled={providerTesting||!testEmail.trim()} className="btn-outline-gold text-sm">{providerTesting?'Testing…':`Test ${selectedProvider.label}`}</button>{apiKeySetForSelected&&<button onClick={async()=>{if(!window.confirm(`Remove the saved ${selectedProvider.label} credentials?`))return;await emailAPI.deleteProviderCredentials(selectedProvider.key);queryClient.invalidateQueries({queryKey:['emailSettings']});toast.success('Credentials removed');}} className="text-xs text-red-400 hover:text-red-300">Remove credentials</button>}{!testEmail.trim()&&<p className="text-xs text-gray-600">Enter a recipient below to test this provider directly.</p>}</div></div>}
          {(form.email_provider || 'brevo') === 'smtp' && <div className="luxury-card p-6 space-y-4"><h3 className="font-playfair font-bold text-white text-lg">Custom SMTP</h3><div className="grid md:grid-cols-2 gap-4"><div><label className="text-xs text-gray-400 mb-1 block">SMTP Host</label><input value={form.smtp_host||''} onChange={f('smtp_host')} placeholder="smtp.example.com" className={cls}/></div><div><label className="text-xs text-gray-400 mb-1 block">Port</label><input type="number" value={form.smtp_port||'587'} onChange={(e)=>{const port=e.target.value;setForm(p=>({...p,smtp_port:port,smtp_secure:port==='465'?'true':port==='587'?'false':p.smtp_secure}))}} className={cls}/></div><div><label className="text-xs text-gray-400 mb-1 block">Username / Email</label><input value={form.smtp_user||''} onChange={f('smtp_user')} className={cls}/></div><div><label className="text-xs text-gray-400 mb-1 block">Password / App Password</label><div className="relative"><input type={showPassword?'text':'password'} value={form.smtp_password||''} onChange={f('smtp_password')} placeholder={passwordSet?'Leave blank to keep current password':'Paste SMTP password / app key'} className={`${cls} pr-10`}/><button type="button" onClick={()=>setShowPassword(x=>!x)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPassword?<HiEyeOff/>:<HiEye/>}</button></div></div><div><label className="text-xs text-gray-400 mb-1 block">Encryption</label><select value={form.smtp_secure||'false'} onChange={f('smtp_secure')} className={cls}><option value="false">STARTTLS</option><option value="true">SSL/TLS</option></select></div><div><label className="text-xs text-gray-400 mb-1 block">Public Site URL</label><input value={form.email_site_url||''} onChange={f('email_site_url')} placeholder="https://your-site.example" className={cls}/></div><div><label className="text-xs text-gray-400 mb-1 block">From Name</label><input value={form.email_from_name||''} onChange={f('email_from_name')} placeholder="Noor Mist" className={cls}/></div><div><label className="text-xs text-gray-400 mb-1 block">From Address</label><input type="email" value={form.email_from_address||''} onChange={f('email_from_address')} placeholder="noreply@example.com" className={cls}/></div><div><label className="text-xs text-gray-400 mb-1 block">Reply-To</label><input type="email" value={form.email_reply_to||''} onChange={f('email_reply_to')} placeholder="support@example.com" className={cls}/></div></div><p className="text-xs text-gray-500">Port 587 normally uses STARTTLS; port 465 normally uses SSL/TLS. Many hosts (including Railway's Free/Hobby tiers) block outbound SMTP ports entirely — if this never works, use an API provider or Custom API above instead.</p><div className="flex flex-wrap gap-3 items-center"><button onClick={handleSaveProviderCard} className="btn-gold"><HiCheck className="w-4 h-4 inline mr-2"/>Save SMTP Settings</button>{form.email_provider !== emailStatus.email_provider && <button onClick={handleSetPrimaryProvider} className="btn-outline-gold text-sm">Set as Primary</button>}<button onClick={handleTestProviderCard} disabled={providerTesting||!testEmail.trim()} className="btn-outline-gold text-sm">{providerTesting?'Testing…':'Test SMTP'}</button>{passwordSet&&<button onClick={async()=>{if(!window.confirm('Remove the saved SMTP password?'))return;await emailAPI.deleteProviderCredentials('smtp');queryClient.invalidateQueries({queryKey:['emailSettings']});toast.success('SMTP credential removed');}} className="text-xs text-red-400 hover:text-red-300">Remove password</button>}</div></div>}

          <div className="luxury-card p-6 space-y-4">
            <div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-playfair font-bold text-white text-lg">Backup & Failover Providers</h3>
                  <p className="text-xs text-gray-500 mt-1">The primary provider is the Delivery Provider above. If it fails, Noor-Mist automatically tries each backup below in order.</p>
                </div>
                <span className="text-[11px] px-2 py-1 rounded-full border border-gold/20 text-gold bg-gold/5">SMTP + API</span>
              </div>
            </div>

            <div className="rounded-xl border border-gray-800 bg-noir/60 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-white">Add backup provider</p>
                  <p className="text-xs text-gray-500">Choose either a traditional SMTP server or an HTTPS email API.</p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Provider Type</label>
                  <select value={backupType} onChange={(e) => { setBackupType(e.target.value); if (e.target.value === 'api' && !backupApiProvider) setBackupApiProvider(apiProviderOptions[0]?.key || 'brevo'); }} className={cls}>
                    <option value="api">API — recommended for Railway</option>
                    <option value="smtp">SMTP</option>
                  </select>
                </div>
                {backupType === 'api' ? (
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">API Provider</label>
                    <select value={backupApiProvider} onChange={(e) => setBackupApiProvider(e.target.value)} className={cls}>
                      {apiProviderOptions.map((p) => <option key={p.key} value={p.key}>{p.label}{providersStatus[p.key]?.configured ? ' — Configured ✓' : ' — Not configured'}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="flex items-end">
                    <div className="w-full rounded-lg border border-gray-700 px-3 py-2.5 text-sm text-gray-300">Custom SMTP profile</div>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => { const key = backupType === 'smtp' ? 'smtp' : backupApiProvider; if (!providersStatus[key]?.configured) { setForm((prev) => ({ ...prev, email_provider: key })); toast(`Opening ${providerLabel(key)} configuration above`); window.scrollTo({ top: 0, behavior: 'smooth' }); return; } addBackupProvider(key); }} className="btn-outline-gold text-sm">+ Add to Failover</button>
                <button type="button" onClick={() => { const key = backupType === 'smtp' ? 'smtp' : backupApiProvider; setForm((prev) => ({ ...prev, email_provider: key })); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-xs text-gray-400 hover:text-gold">Configure this provider</button>
              </div>
              <p className="text-[11px] text-gray-600">Safety net: any other configured provider not explicitly ordered above is automatically tried after your listed backups.</p>
            </div>

            {activePriority.length === 0 && <p className="text-xs text-gray-600">No backup provider is currently selected. The system will use the Delivery Provider only.</p>}
            {activePriority.map((key, i) => (
              <div key={key} className="flex items-center gap-3 bg-noir rounded-lg border border-gray-800 px-3 py-2">
                <span className="text-xs text-gold font-mono w-5">{i + 1}.</span>
                <span className="text-sm text-white flex-1">{providerLabel(key)} <span className="ml-2 text-[10px] text-gray-500 border border-gray-700 rounded px-1.5 py-0.5">{providerType(key)}</span></span>
                <button onClick={() => movePriority(i, -1)} disabled={i === 0} className="text-gray-400 hover:text-white disabled:opacity-20 text-xs px-1">▲</button>
                <button onClick={() => movePriority(i, 1)} disabled={i === activePriority.length - 1} className="text-gray-400 hover:text-white disabled:opacity-20 text-xs px-1">▼</button>
                <button onClick={() => toggleInPriority(key)} className="text-red-400 hover:text-red-300 text-xs px-2">Remove</button>
              </div>
            ))}
            {inactiveConfigured.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {inactiveConfigured.map((key) => (
                  <button key={key} onClick={() => toggleInPriority(key)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:border-gold/50 hover:text-gold transition-colors">+ Add {providerLabel(key)}</button>
                ))}
              </div>
            )}
            <button onClick={() => savePriorityMutation.mutate()} disabled={savePriorityMutation.isPending} className="btn-outline-gold text-sm mt-2"><HiCheck className="w-4 h-4 inline mr-2"/>Save Failover Order</button>
          </div>

          <div className="luxury-card p-6 space-y-4"><h3 className="font-playfair font-bold text-white text-lg">Test Email</h3><div className="grid md:grid-cols-2 gap-4"><div><label className="text-xs text-gray-400 mb-1 block">Recipient</label><input type="email" value={testEmail} onChange={e=>setTestEmail(e.target.value)} placeholder="your@email.com" className={cls}/></div><div><label className="text-xs text-gray-400 mb-1 block">Test Subject</label><input value={form.email_test_subject||''} onChange={f('email_test_subject')} placeholder="{{store_name}} — Email Configuration Test" className={cls}/></div><div className="md:col-span-2"><label className="text-xs text-gray-400 mb-1 block">Test Message (HTML)</label><textarea rows={8} value={form.email_test_body||''} onChange={f('email_test_body')} className={`${cls} font-mono text-xs`}/><p className="text-xs text-gray-500 mt-1">Placeholders: {'{{store_name}}'}, {'{{provider}}'}, {'{{from_address}}'}, {'{{recipient_email}}'}, {'{{sent_at}}'}</p></div><div className="md:col-span-2"><label className="text-xs text-gray-400 mb-1 block">Test Footer</label><input value={form.email_test_footer||''} onChange={f('email_test_footer')} placeholder="This is an automated test message." className={cls}/></div></div><div className="flex flex-wrap gap-3"><button onClick={()=>setPreview({subject:form.email_test_subject,body:form.email_test_body})} className="btn-outline-gold text-sm"><HiEye className="w-4 h-4 inline mr-2"/>Preview</button><button onClick={()=>saveMutation.mutate(form)} className="btn-outline-gold text-sm" disabled={saveMutation.isPending}><HiCheck className="w-4 h-4 inline mr-2"/>Save Test Content</button><button onClick={handleTest} disabled={testing||!testEmail.trim()} className="btn-gold text-sm">{testing?'Sending…':'Send Test Email'}</button></div></div>
        </motion.div>
      )}

      {tab === 'Templates' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 max-w-2xl">
          <div className="luxury-card p-6 space-y-4">
            <h3 className="font-playfair font-bold text-white text-lg">Email Notifications</h3>
            <p className="text-xs text-gray-500">Enable or disable automated emails sent to customers, and edit their subject and content below.</p>
            {Object.entries(TEMPLATE_LABELS).map(([key, label]) => (
              <label key={key} className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0 cursor-pointer">
                <div>
                  <p className="text-white text-sm font-medium">{label}</p>
                  <p className="text-xs text-gray-500">Automated email sent to customer</p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={form[TOGGLE_KEYS[key]] !== 'false'}
                    readOnly
                    className="sr-only"
                  />
                  <div
                    onClick={() => setForm((p) => {
                      const settingKey = TOGGLE_KEYS[key];
                      return { ...p, [settingKey]: String(p[settingKey] === 'false') };
                    })}
                    className={`w-11 h-6 rounded-full cursor-pointer transition-colors ${
                      form[TOGGLE_KEYS[key]] !== 'false' ? 'bg-gold' : 'bg-gray-700'
                    }`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full mt-1 transition-transform ${
                      form[TOGGLE_KEYS[key]] !== 'false' ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </div>
                </div>
              </label>
            ))}
            <button onClick={() => saveMutation.mutate(form)} className="btn-gold mt-2" disabled={saveMutation.isPending}>
              <HiCheck className="w-4 h-4 inline mr-2" />Save Toggle Settings
            </button>
          </div>

          <div className="flex flex-wrap gap-2">{['All','Transactional','Account','Marketing'].map(c=><button key={c} onClick={()=>setTemplateCategory(c)} className={`px-3 py-1.5 rounded-lg text-xs border ${templateCategory===c?'bg-gold text-black border-gold':'text-gray-400 border-gray-700'}`}>{c}</button>)}</div>

          {templates.filter((tpl) => tpl.key !== 'login_link' && (templateCategory === 'All' || TEMPLATE_CATEGORIES[tpl.key] === templateCategory)).map((tpl) => {
            const draft = drafts[tpl.key] || { subject: tpl.subject, body: tpl.body };
            const dirty = draft.subject !== tpl.subject || draft.body !== tpl.body;
            return (
              <div key={tpl.key} className="luxury-card p-6 space-y-3">
                <h3 className="font-playfair font-bold text-white text-lg">{TEMPLATE_LABELS[tpl.key] || tpl.key}</h3>
                {tpl.placeholders?.length > 0 && (
                  <p className="text-xs text-gray-500">
                    Available placeholders: {tpl.placeholders.map((p) => `{{${p}}}`).join(', ')}
                  </p>
                )}
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Subject</label>
                  <input
                    type="text"
                    value={draft.subject}
                    onChange={(e) => updateDraft(tpl.key, 'subject', e.target.value)}
                    className={cls}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Body (HTML)</label>
                  <textarea
                    value={draft.body}
                    onChange={(e) => updateDraft(tpl.key, 'body', e.target.value)}
                    rows={8}
                    className={`${cls} font-mono text-xs resize-y`}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setPreview({ subject: draft.subject, body: draft.body })}
                    className="btn-outline-gold text-sm"
                  >
                    <HiEye className="w-4 h-4 inline mr-2" />Preview
                  </button>
                  <button
                    onClick={() => saveTemplateMutation.mutate({ key: tpl.key, data: draft })}
                    disabled={!dirty || saveTemplateMutation.isPending}
                    className="btn-gold text-sm disabled:opacity-40"
                  >
                    <HiCheck className="w-4 h-4 inline mr-2" />Save Template
                  </button>
                  <button
                    onClick={() => resetTemplateMutation.mutate(tpl.key)}
                    className="text-xs text-gray-500 hover:text-gold"
                  >
                    Reset to default
                  </button>
                </div>
              </div>
            );
          })}
        </motion.div>
      )}

      {tab === 'Automations' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 max-w-3xl"><div className="luxury-card p-6"><h3 className="font-playfair font-bold text-white text-lg">Automatic Emails</h3><p className="text-xs text-gray-500 mt-1 mb-4">Turn each automated email on or off without changing code.</p>{Object.entries(TEMPLATE_LABELS).filter(([key])=>TOGGLE_KEYS[key]).map(([key,label])=><label key={key} className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0 cursor-pointer"><div><p className="text-white text-sm">{label}</p><p className="text-xs text-gray-500">{key==='email_verification'?'First-time account verification email.':'Triggered automatically by the matching event.'}</p></div><div onClick={()=>setForm(p=>({...p,[TOGGLE_KEYS[key]]:String(p[TOGGLE_KEYS[key]]==='false')}))} className={`w-11 h-6 rounded-full cursor-pointer ${form[TOGGLE_KEYS[key]]!=='false'?'bg-gold':'bg-gray-700'}`}><div className={`w-4 h-4 bg-white rounded-full mt-1 transition-transform ${form[TOGGLE_KEYS[key]]!=='false'?'translate-x-6':'translate-x-1'}`}/></div></label>)}<button onClick={()=>saveMutation.mutate(form)} className="btn-gold mt-4" disabled={saveMutation.isPending}><HiCheck className="w-4 h-4 inline mr-2"/>Save Automation Settings</button></div></motion.div>
      )}
      {tab === 'Broadcasts' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 max-w-2xl">
          <div className="luxury-card p-6 space-y-4">
            <h3 className="font-playfair font-bold text-white text-lg flex items-center gap-2">
              <HiUserGroup className="w-5 h-5 text-gold" /> Send to Many Users at Once
            </h3>
            <p className="text-xs text-gray-500">
              Notify customers about new arrivals, shipping updates, promotions, or anything else — one email, sent to a whole audience.
            </p>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Campaign name</label>
              <input value={broadcastName} onChange={(e) => setBroadcastName(e.target.value)} placeholder="August Sale, New Launch, Eid Campaign…" className={cls} />
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Recipients</label>
              <select
                value={audience}
                onChange={(e) => { setAudience(e.target.value); setConfirming(false); }}
                className={cls}
              >
                {AUDIENCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {audience !== 'selected' && (
                <p className="text-xs text-gray-500 mt-1">
                  {recipientCount === undefined ? 'Counting recipients…' : `${recipientCount} customer${recipientCount === 1 ? '' : 's'} will receive this email`}
                </p>
              )}
            </div>

            {audience === 'selected' && (
              <div className="space-y-2">
                <label className="text-xs text-gray-400 mb-1 block">Choose Customers</label>
                <div className="relative">
                  <HiSearch className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search by name, email, or phone…"
                    className={`${cls} pl-9`}
                  />
                </div>

                {customerSearch.trim() && (
                  <div className="border border-gray-700 rounded-lg divide-y divide-gray-800 max-h-56 overflow-y-auto">
                    {customerResults.length === 0 ? (
                      <p className="text-xs text-gray-500 px-3 py-3">No customers match "{customerSearch}"</p>
                    ) : (
                      customerResults.map((c) => {
                        const picked = selectedCustomers.some((s) => s.id === c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => toggleCustomer(c)}
                            className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-3 hover:bg-noir transition-colors ${picked ? 'bg-gold/10' : ''}`}
                          >
                            <div className="min-w-0">
                              <p className="text-white text-sm truncate">{[c.first_name, c.last_name].filter(Boolean).join(' ') || 'Unnamed'}</p>
                              <p className="text-xs text-gray-500 truncate">{c.email}</p>
                            </div>
                            {picked && <HiCheck className="w-4 h-4 text-gold flex-shrink-0" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}

                {selectedCustomers.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">
                      {selectedCustomers.length} customer{selectedCustomers.length === 1 ? '' : 's'} selected
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedCustomers.map((c) => (
                        <span
                          key={c.id}
                          className="inline-flex items-center gap-1.5 bg-noir border border-gray-700 rounded-full pl-3 pr-2 py-1 text-xs text-white"
                        >
                          {c.email}
                          <button type="button" onClick={() => removeCustomer(c.id)} className="text-gray-500 hover:text-white">
                            <HiX className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="text-xs text-gray-400 mb-2 block">Quick start</label>
              <div className="flex flex-wrap gap-2">
                {broadcastTemplates.filter((p) => p.is_active).map((p) => (
                  <button
                    key={p.key}
                    onClick={() => applyPreset(p.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-montserrat border transition-colors ${
                      preset === p.key ? 'bg-gold text-black border-gold font-semibold' : 'text-gray-400 border-gray-700 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Subject</label>
              <input
                type="text"
                value={broadcastSubject}
                onChange={(e) => setBroadcastSubject(e.target.value)}
                placeholder="e.g. New at Noor Mist — You'll Want This"
                className={cls}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Message (HTML)</label>
              <textarea
                value={broadcastBody}
                onChange={(e) => setBroadcastBody(e.target.value)}
                rows={10}
                className={`${cls} font-mono text-xs resize-y`}
                placeholder="<p>Hi {{customer_name}}, ...</p>"
              />
              <p className="text-xs text-gray-500 mt-1">Placeholders: {'{{customer_name}}'}, {'{{store_name}}'}, {'{{current_year}}'}. Test/preview before sending.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setBroadcastPreview(true)} disabled={!broadcastBody.trim()} className="btn-outline-gold text-sm"><HiEye className="inline w-4 h-4 mr-1"/>Preview</button>
              <button type="button" onClick={() => handleBroadcastAction('draft')} disabled={sending || !broadcastSubject.trim() || !broadcastBody.trim()} className="btn-outline-gold text-sm">Save Draft</button>
              <input type="email" value={broadcastTestEmail} onChange={(e) => setBroadcastTestEmail(e.target.value)} placeholder="test@example.com" className={`${cls} max-w-xs`} />
              <button type="button" onClick={handleBroadcastTest} disabled={sending || !broadcastTestEmail.trim()} className="btn-outline-gold text-sm"><HiMail className="inline w-4 h-4 mr-1"/>Send Test</button>
            </div>

            <div className="border border-gray-800 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-400 mr-2">Delivery:</span>
                <button type="button" onClick={() => setScheduleMode('now')} className={`px-3 py-1.5 rounded-lg text-xs border ${scheduleMode === 'now' ? 'bg-gold text-black border-gold' : 'text-gray-400 border-gray-700'}`}>Send now</button>
                <button type="button" onClick={() => setScheduleMode('schedule')} className={`px-3 py-1.5 rounded-lg text-xs border ${scheduleMode === 'schedule' ? 'bg-gold text-black border-gold' : 'text-gray-400 border-gray-700'}`}><HiClock className="inline mr-1"/>Schedule</button>
                {scheduleMode === 'schedule' && <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className={`${cls} max-w-xs`} />}
              </div>
              {!confirming ? <button onClick={() => setConfirming(true)} disabled={!broadcastSubject.trim() || !broadcastBody.trim() || (audience === 'selected' && selectedCustomers.length === 0) || (scheduleMode === 'schedule' && !scheduledAt)} className="btn-gold disabled:opacity-40"><HiPaperAirplane className="w-4 h-4 inline mr-2"/>{scheduleMode === 'schedule' ? 'Schedule Broadcast' : 'Send Broadcast'}</button> : <div className="p-4 rounded-lg border border-gold/40 bg-gold/5 space-y-3"><p className="text-sm text-white">{scheduleMode === 'schedule' ? <>Schedule <strong>{broadcastName || broadcastSubject}</strong> for <strong>{new Date(scheduledAt).toLocaleString()}</strong>?</> : <>Send <strong>{broadcastName || broadcastSubject}</strong> to <strong>{recipientCount ?? '…'}</strong> customers? This can't be undone.</>}</p><div className="flex gap-3"><button onClick={() => handleBroadcastAction(scheduleMode === 'schedule' ? 'schedule' : 'send')} disabled={sending} className="btn-gold text-sm disabled:opacity-40">{sending ? 'Processing…' : scheduleMode === 'schedule' ? 'Confirm & Schedule' : 'Confirm & Send'}</button><button onClick={() => setConfirming(false)} disabled={sending} className="text-xs text-gray-400">Cancel</button></div></div>}
            </div>

            {broadcastPreview && <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/80" onClick={() => setBroadcastPreview(false)}/><div className="relative bg-white text-black rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"><div className="flex items-center justify-between p-4 border-b"><div><strong>Email Preview</strong><p className="text-xs text-gray-500">{broadcastSubject}</p></div><button onClick={() => setBroadcastPreview(false)}><HiX/></button></div><div className="p-6 overflow-y-auto max-h-[75vh]" dangerouslySetInnerHTML={{__html: previewBody}}/></div></div>}
          </div>

          <div className="luxury-card p-6 space-y-4"><div className="flex items-center justify-between"><div><h3 className="font-playfair font-bold text-white text-lg">Broadcast Templates</h3><p className="text-xs text-gray-500">Create and edit quick-start campaigns from the admin panel.</p></div><button onClick={()=>{setEditingBroadcast('new');setBroadcastForm({key:`custom_${Date.now()}`,label:'New Template',subject:'',body:'',is_active:true});}} className="btn-outline-gold text-xs">Add Template</button></div>{editingBroadcast&&<div className="grid gap-3 p-4 border border-gray-800 rounded-lg"><div className="grid md:grid-cols-2 gap-3"><input className={cls} value={broadcastForm.key} onChange={e=>setBroadcastForm(p=>({...p,key:e.target.value}))} placeholder="unique_key"/><input className={cls} value={broadcastForm.label} onChange={e=>setBroadcastForm(p=>({...p,label:e.target.value}))} placeholder="Label"/></div><input className={cls} value={broadcastForm.subject} onChange={e=>setBroadcastForm(p=>({...p,subject:e.target.value}))} placeholder="Subject"/><textarea className={`${cls} font-mono text-xs`} rows={6} value={broadcastForm.body} onChange={e=>setBroadcastForm(p=>({...p,body:e.target.value}))} placeholder="<p>Hi {{customer_name}}</p>"/><div className="flex gap-2"><button onClick={saveBroadcastTemplate} className="btn-gold text-sm">Save Template</button><button onClick={()=>setEditingBroadcast(null)} className="text-xs text-gray-400">Cancel</button></div></div>}{broadcastTemplates.map(t=><div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0"><div><p className="text-white text-sm">{t.label}</p><p className="text-xs text-gray-500">{t.key}</p></div><div className="flex gap-2"><button onClick={()=>{setEditingBroadcast(t.id);setBroadcastForm({key:t.key,label:t.label,subject:t.subject,body:t.body,is_active:t.is_active});}} className="text-xs text-gold">Edit</button>{t.key!=='custom'&&<button onClick={async()=>{await emailAPI.deleteBroadcastTemplate(t.id);queryClient.invalidateQueries({queryKey:['emailBroadcastTemplates']});toast.success('Template deleted');}} className="text-xs text-red-400">Delete</button>}</div></div>)}</div>
          <div className="luxury-card p-6 space-y-3">
            <div className="flex items-center justify-between"><h3 className="font-playfair font-bold text-white text-lg flex items-center gap-2"><HiClock className="w-5 h-5 text-gold" /> Recent Broadcasts</h3><button type="button" onClick={async()=>{try{await queryClient.refetchQueries({queryKey:['emailBroadcastHistory'],type:'active'});toast.success('Broadcast history refreshed')}catch(e){toast.error('Failed to refresh broadcast history')}}} className="btn-outline-gold text-xs"><HiRefresh className="inline w-4 h-4 mr-1"/>Refresh</button></div>
            {broadcastHistory.length === 0 ? (
              <p className="text-xs text-gray-500">No broadcasts sent yet.</p>
            ) : (
              <div className="space-y-2">
                {broadcastHistory.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                    <div className="min-w-0">
                      <p className="text-white text-sm truncate">{c.subject}</p>
                      <p className="text-xs text-gray-500">
                        {AUDIENCE_OPTIONS.find((a) => a.value === c.audience)?.label || c.audience} · {new Date(c.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mr-3">
                      {c.status === 'draft' || c.status === 'scheduled' ? <button onClick={async () => { try { await emailAPI.sendBroadcastCampaign(c.id); queryClient.invalidateQueries({ queryKey: ['emailBroadcastHistory'] }); toast.success('Campaign sent'); } catch (err) { toast.error(err.response?.data?.error || 'Failed to send campaign'); } }} className="text-xs text-green-400">Send now</button> : null}
                      {c.status === 'draft' || c.status === 'scheduled' ? <button onClick={async () => { try { await emailAPI.cancelBroadcastCampaign(c.id); queryClient.invalidateQueries({ queryKey: ['emailBroadcastHistory'] }); toast.success('Campaign cancelled'); } catch (err) { toast.error(err.response?.data?.error || 'Failed to cancel campaign'); } }} className="text-xs text-red-400">Cancel</button> : null}
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-xs text-gold">{c.sent_count}/{c.recipient_count} sent</p>
                      {c.failed_count > 0 && <p className="text-xs text-red-400">{c.failed_count} failed</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
      {tab === 'Logs' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 max-w-5xl"><div className="luxury-card p-6"><div className="flex items-center justify-between mb-4"><div><h3 className="font-playfair font-bold text-white text-lg flex items-center gap-2"><HiDatabase className="text-gold"/>Delivery Logs</h3><p className="text-xs text-gray-500">Transactional, test, and broadcast email attempts.</p></div><button onClick={async()=>{try{await queryClient.refetchQueries({queryKey:['emailLogs'],type:'active'});toast.success('Logs refreshed');}catch(e){toast.error('Failed to refresh logs');}}} className="btn-outline-gold text-xs"><HiRefresh className="inline w-4 h-4 mr-1"/>Refresh</button></div><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="text-gray-500 border-b border-gray-800"><th className="py-2">Time</th><th>Recipient</th><th>Type</th><th>Provider</th><th>Status</th><th>Error</th></tr></thead><tbody>{deliveryLogs.map(l=><tr key={l.id} className="border-b border-gray-800/60"><td className="py-2 text-gray-500">{new Date(l.created_at).toLocaleString()}</td><td className="text-white">{l.recipient}</td><td className="text-gray-400">{l.email_type}</td><td className="text-gray-400">{l.provider}</td><td className={l.status==='sent'?'text-green-400':l.status==='failed'?'text-red-400':'text-yellow-400'}>{l.status}</td><td className="text-gray-500 max-w-xs truncate">{l.error_message||'—'}</td></tr>)}{deliveryLogs.length===0&&<tr><td colSpan="6" className="py-8 text-center text-gray-500">No email deliveries logged yet.</td></tr>}</tbody></table></div></div></motion.div>
      )}
      {preview&&<div className="fixed inset-0 z-50 bg-black/70 p-4 flex items-center justify-center" onClick={()=>setPreview(null)}><div className="bg-noir-card border border-gray-700 rounded-xl w-full max-w-3xl overflow-hidden" onClick={e=>e.stopPropagation()}><div className="p-4 border-b border-gray-800 flex justify-between"><h3 className="text-white font-playfair">Email Preview</h3><button onClick={()=>setPreview(null)} className="text-gray-400"><HiX/></button></div><iframe title="Email preview" className="w-full h-[70vh] bg-white" srcDoc={`<!doctype html><html><body>${preview.body||''}</body></html>`}/></div></div>}
    </div>
  );
}

