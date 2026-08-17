import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  HiCheck, HiX, HiRefresh, HiExclamationCircle, HiPaperAirplane,
  HiDocumentText, HiClock, HiPhone, HiInformationCircle,
} from 'react-icons/hi';
import { whatsappAPI } from '../../services/api';
import toast from 'react-hot-toast';

const TABS = ['Settings', 'Message Template', 'Logs'];

const TRIGGER_OPTIONS = [
  { value: 'order_created', label: 'Order Created', hint: 'Sent as soon as the order is placed (recommended default).' },
  { value: 'payment_confirmed', label: 'Payment Confirmed', hint: 'Sent once payment is verified/approved.' },
  { value: 'admin_confirms_order', label: 'Admin Confirms Order', hint: 'Sent when an admin manually marks the order Confirmed.' },
];

const STATUS_STYLES = {
  sent: 'bg-green-500/10 text-green-400 border-green-500/30',
  failed: 'bg-red-500/10 text-red-400 border-red-500/30',
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  skipped: 'bg-gray-700/30 text-gray-400 border-gray-700',
};

function Toggle({ checked, onChange, label, hint }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div>
        <p className="text-sm text-white font-medium">{label}</p>
        {hint && <p className="text-xs text-gray-500 mt-0.5">{hint}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-gold' : 'bg-gray-700'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-black transition-transform ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

export default function WhatsAppSettings() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('Settings');
  const [form, setForm] = useState({
    enabled: false, order_confirmation_enabled: true, trigger_type: 'order_created',
    template_name: '', template_language: 'en_US',
  });
  const [templateDraft, setTemplateDraft] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [testing, setTesting] = useState(false);
  const [logStatusFilter, setLogStatusFilter] = useState('all');
  const [logSearch, setLogSearch] = useState('');
  const [retryingId, setRetryingId] = useState(null);
  const textareaRef = useRef(null);

  const { data: settingsData } = useQuery({
    queryKey: ['whatsappSettings'],
    queryFn: async () => { const { data } = await whatsappAPI.getSettings(); return data; },
  });

  useEffect(() => {
    if (settingsData?.settings) {
      setForm((p) => ({ ...p, ...settingsData.settings }));
      setTemplateDraft(settingsData.settings.message_template || '');
    }
  }, [settingsData]);

  const { data: previewData } = useQuery({
    queryKey: ['whatsappPreview', templateDraft],
    queryFn: async () => { const { data } = await whatsappAPI.preview(templateDraft); return data.preview; },
    enabled: tab === 'Message Template',
  });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['whatsappLogs', logStatusFilter, logSearch],
    queryFn: async () => {
      const params = { limit: 100 };
      if (logStatusFilter !== 'all') params.status = logStatusFilter;
      if (logSearch.trim()) params.search = logSearch.trim();
      const { data } = await whatsappAPI.getLogs(params);
      return data;
    },
    enabled: tab === 'Logs',
  });
  const logs = logsData?.logs || [];

  const connection = settingsData?.connection || { state: 'not_configured', label: 'Not Configured' };
  const availableVariables = settingsData?.available_variables || [];
  const variableMapping = settingsData?.variable_mapping || [];

  const saveMutation = useMutation({
    mutationFn: (payload) => whatsappAPI.updateSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsappSettings'] });
      toast.success('WhatsApp settings saved');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save settings'),
  });

  const saveToggles = (patch) => {
    const next = { ...form, ...patch };
    setForm(next);
    saveMutation.mutate(patch);
  };

  const saveTemplate = () => {
    saveMutation.mutate({ message_template: templateDraft, template_name: form.template_name, template_language: form.template_language });
  };

  const resetTemplateMutation = useMutation({
    mutationFn: () => whatsappAPI.resetTemplate(),
    onSuccess: ({ data }) => {
      setTemplateDraft(data.settings.message_template);
      queryClient.invalidateQueries({ queryKey: ['whatsappSettings'] });
      toast.success('Template reset to default');
    },
    onError: () => toast.error('Failed to reset template'),
  });

  const insertVariable = (name) => {
    const el = textareaRef.current;
    const token = `{{${name}}}`;
    if (!el) { setTemplateDraft((t) => t + token); return; }
    const start = el.selectionStart ?? templateDraft.length;
    const end = el.selectionEnd ?? templateDraft.length;
    const next = templateDraft.slice(0, start) + token + templateDraft.slice(end);
    setTemplateDraft(next);
    requestAnimationFrame(() => { el.focus(); el.selectionStart = el.selectionEnd = start + token.length; });
  };

  const handleTest = async () => {
    if (!testPhone.trim()) return toast.error('Enter a test phone number');
    setTesting(true);
    try {
      const { data } = await whatsappAPI.sendTest(testPhone.trim());
      toast.success(data.message || '✓ Test message sent successfully');
      queryClient.invalidateQueries({ queryKey: ['whatsappLogs'] });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send test message');
    } finally {
      setTesting(false);
    }
  };

  const handleRetry = async (id) => {
    setRetryingId(id);
    try {
      await whatsappAPI.retryMessage(id);
      toast.success('Message resent successfully');
      queryClient.invalidateQueries({ queryKey: ['whatsappLogs'] });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Retry failed');
    } finally {
      setRetryingId(null);
    }
  };

  const templateDirty = templateDraft !== (settingsData?.settings?.message_template || '');
  const metaDirty = form.template_name !== (settingsData?.settings?.template_name || '') || form.template_language !== (settingsData?.settings?.template_language || 'en_US');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-playfair font-bold mb-1">WhatsApp Notifications</h1>
        <p className="text-gray-400 text-sm">Automatically send customers an order confirmation on WhatsApp via the Meta WhatsApp Business Cloud API.</p>
      </div>

      <div className="flex gap-1 p-1 bg-noir-card rounded-xl border border-gray-800 w-fit">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2.5 rounded-lg text-sm font-montserrat transition-all ${tab === t ? 'bg-gold text-black font-semibold' : 'text-gray-400 hover:text-white'}`}
          >{t}</button>
        ))}
      </div>

      {tab === 'Settings' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 max-w-3xl">
          <div className="luxury-card p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="font-playfair font-bold text-white text-xl">WhatsApp API Status</h3>
                <p className="text-xs text-gray-500 mt-1">Credentials are configured via backend environment variables only.</p>
              </div>
              <div className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                connection.state === 'connected' ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-gray-800 text-gray-400 border-gray-700'
              }`}>
                {connection.state === 'connected' ? '✓ Connected' : '⚠ Not Configured'}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-noir rounded-lg border border-gray-800 p-3">
                <p className="text-[11px] text-gray-500">Phone Number ID</p>
                <p className="text-sm text-white mt-1">{connection.phoneNumberIdConfigured ? 'Configured ✓' : 'Not set'}</p>
              </div>
              <div className="bg-noir rounded-lg border border-gray-800 p-3">
                <p className="text-[11px] text-gray-500">Access Token</p>
                <p className="text-sm text-white mt-1">{connection.accessTokenConfigured ? 'Configured ✓' : 'Not set'}</p>
              </div>
            </div>
            {connection.state !== 'connected' && (
              <div className="mt-4 flex items-start gap-2 text-xs text-yellow-400 bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3">
                <HiExclamationCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                Set <code className="text-yellow-300">WHATSAPP_PHONE_NUMBER_ID</code> and <code className="text-yellow-300">WHATSAPP_ACCESS_TOKEN</code> in Railway's environment variables to enable sending.
              </div>
            )}
          </div>

          <div className="luxury-card p-6 space-y-1">
            <h3 className="font-playfair font-bold text-white text-lg mb-2">Automatic Order Confirmation</h3>
            <Toggle checked={form.enabled} onChange={(v) => saveToggles({ enabled: v })} label="WhatsApp Notifications" hint="Master switch — turns all outgoing WhatsApp messages on or off." />
            <div className="border-t border-gray-800 my-3" />
            <Toggle checked={form.order_confirmation_enabled} onChange={(v) => saveToggles({ order_confirmation_enabled: v })} label="Order Confirmation" hint="Send a WhatsApp message automatically when the trigger below fires." />
          </div>

          <div className="luxury-card p-6">
            <h3 className="font-playfair font-bold text-white text-lg mb-1">Trigger Settings</h3>
            <p className="text-xs text-gray-500 mb-4">Choose when the order confirmation message is sent.</p>
            <div className="space-y-2">
              {TRIGGER_OPTIONS.map((opt) => (
                <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${form.trigger_type === opt.value ? 'border-gold bg-gold/5' : 'border-gray-800 hover:border-gray-700'}`}>
                  <input
                    type="radio" name="trigger_type" className="mt-1 accent-[#D4AF37]"
                    checked={form.trigger_type === opt.value}
                    onChange={() => saveToggles({ trigger_type: opt.value })}
                  />
                  <div>
                    <p className="text-sm text-white font-medium">{opt.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{opt.hint}</p>
                  </div>
                </label>
              ))}
            </div>
            <p className="text-[11px] text-gray-600 mt-3 flex items-start gap-1.5">
              <HiInformationCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              "Payment Confirmed" and "Admin Confirms Order" both fire when the order reaches Confirmed status — Noor-Mist's order system doesn't distinguish those two moments separately.
            </p>
          </div>

          <div className="luxury-card p-6">
            <h3 className="font-playfair font-bold text-white text-lg mb-1">Test WhatsApp</h3>
            <p className="text-xs text-gray-500 mb-4">Sends the currently saved template with sample order data.</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <HiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input
                  value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="+92XXXXXXXXXX"
                  className="w-full bg-noir border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:border-gold outline-none"
                />
              </div>
              <button onClick={handleTest} disabled={testing} className="btn-outline-gold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50">
                <HiPaperAirplane className={`w-4 h-4 ${testing ? 'animate-pulse' : ''}`} />
                {testing ? 'Sending…' : 'Test WhatsApp'}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {tab === 'Message Template' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid lg:grid-cols-2 gap-5 max-w-6xl">
          <div className="space-y-5">
            <div className="luxury-card p-6">
              <h3 className="font-playfair font-bold text-white text-lg mb-1">Message Template</h3>
              <p className="text-xs text-gray-500 mb-3">Click a variable to insert it. The order variables appear in determines the Meta template parameter order below.</p>
              <textarea
                ref={textareaRef}
                value={templateDraft}
                onChange={(e) => setTemplateDraft(e.target.value)}
                rows={12}
                className="w-full bg-noir border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:border-gold outline-none font-mono resize-none"
              />
              <div className="flex flex-wrap gap-1.5 mt-3">
                {availableVariables.map((v) => (
                  <button key={v} onClick={() => insertVariable(v)}
                    className="text-[11px] px-2.5 py-1 rounded-md bg-noir border border-gray-700 text-gold hover:border-gold/50 transition-colors font-mono"
                  >{`{{${v}}}`}</button>
                ))}
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={saveTemplate} disabled={!templateDirty && !metaDirty || saveMutation.isPending} className="flex-1 btn-gold text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                  Save Template
                </button>
                <button onClick={() => resetTemplateMutation.mutate()} className="flex-1 btn-outline-gold text-sm">
                  Reset to Default
                </button>
              </div>
            </div>

            <div className="luxury-card p-6">
              <h3 className="font-playfair font-bold text-white text-lg mb-1">Meta Template Mapping</h3>
              <p className="text-xs text-gray-500 mb-4">
                Order confirmations must use a Meta-approved WhatsApp message template (business-initiated messages can't be sent as free text).
                Create/approve this template in Meta Business Manager with body variables in the same order shown below, then enter its exact name here.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Meta Template Name</label>
                  <input value={form.template_name} onChange={(e) => setForm((p) => ({ ...p, template_name: e.target.value }))}
                    placeholder="order_confirmation" className="w-full bg-noir border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-gold outline-none font-mono" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Template Language</label>
                  <input value={form.template_language} onChange={(e) => setForm((p) => ({ ...p, template_language: e.target.value }))}
                    placeholder="en_US" className="w-full bg-noir border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-gold outline-none font-mono" />
                </div>
              </div>
              {variableMapping.length > 0 ? (
                <div className="space-y-1.5">
                  {variableMapping.map((m) => (
                    <div key={m.meta_param} className="flex items-center gap-2 text-xs bg-noir rounded-lg border border-gray-800 px-3 py-2">
                      <span className="text-gold font-mono">{`{{${m.meta_param}}}`}</span>
                      <span className="text-gray-500">→</span>
                      <span className="text-white font-mono">{`{{${m.variable}}}`}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-600">No variables in the message yet — add some from the list on the left.</p>
              )}
            </div>
          </div>

          <div className="luxury-card p-6 h-fit lg:sticky lg:top-6">
            <h3 className="font-playfair font-bold text-white text-lg mb-3">Live Preview</h3>
            <div className="bg-[#0b141a] rounded-2xl p-4 min-h-[200px]">
              <div className="bg-[#005c4b] text-white rounded-lg rounded-tr-none p-3 text-sm whitespace-pre-wrap ml-auto max-w-[90%] shadow-md" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
                {previewData || 'Start typing to see a preview…'}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {tab === 'Logs' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <select value={logStatusFilter} onChange={(e) => setLogStatusFilter(e.target.value)}
              className="bg-noir border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-gold outline-none">
              <option value="all">All Statuses</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
              <option value="skipped">Skipped</option>
            </select>
            <input value={logSearch} onChange={(e) => setLogSearch(e.target.value)} placeholder="Search order number or phone…"
              className="bg-noir border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-gold outline-none flex-1 min-w-[200px]" />
          </div>

          <div className="luxury-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3">Order</th>
                    <th className="text-left px-4 py-3">Customer</th>
                    <th className="text-left px-4 py-3">Phone</th>
                    <th className="text-left px-4 py-3">Type</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Date/Time</th>
                    <th className="text-left px-4 py-3">Error</th>
                    <th className="text-right px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {logsLoading && (
                    <tr><td colSpan={8} className="text-center text-gray-500 py-8">Loading…</td></tr>
                  )}
                  {!logsLoading && logs.length === 0 && (
                    <tr><td colSpan={8} className="text-center text-gray-500 py-8">No WhatsApp messages yet</td></tr>
                  )}
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-900 hover:bg-noir/40">
                      <td className="px-4 py-3 text-gold font-mono text-xs">{log.order_number || '—'}</td>
                      <td className="px-4 py-3 text-gray-300">{log.customer_name || '—'}</td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">{log.phone_masked || '—'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs capitalize">{String(log.message_type || '').replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${STATUS_STYLES[log.status] || STATUS_STYLES.pending}`}>
                          {log.status === 'sent' && <HiCheck className="w-3 h-3" />}
                          {log.status === 'failed' && <HiX className="w-3 h-3" />}
                          {log.status === 'pending' && <HiClock className="w-3 h-3" />}
                          {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{log.created_at ? new Date(log.created_at).toLocaleString() : '—'}</td>
                      <td className="px-4 py-3 text-red-400/80 text-xs max-w-[220px] truncate" title={log.error_message || ''}>{log.error_message || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        {log.status === 'failed' && (
                          <button onClick={() => handleRetry(log.id)} disabled={retryingId === log.id}
                            className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-gold/10 text-gold border border-gold/30 hover:bg-gold/20 transition-colors disabled:opacity-50">
                            <HiRefresh className={`w-3.5 h-3.5 ${retryingId === log.id ? 'animate-spin' : ''}`} />
                            Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
