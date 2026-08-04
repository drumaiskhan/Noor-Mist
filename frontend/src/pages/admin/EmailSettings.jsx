import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { HiCheck, HiMail, HiLightningBolt } from 'react-icons/hi';
import { emailAPI } from '../../services/api';
import toast from 'react-hot-toast';

const TABS = ['SMTP', 'Templates'];

const TEMPLATE_DEFAULTS = {
  email_order_confirmation: true,
  email_shipping_notification: true,
  email_welcome: true,
  email_password_reset: true,
  email_newsletter: true,
};

export default function EmailSettings() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('SMTP');
  const [form, setForm] = useState({ smtp_port: '587', smtp_secure: 'false' });
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ['emailSettings'],
    queryFn: async () => { const { data } = await emailAPI.getSettings(); return data.settings ?? {}; },
  });

  useEffect(() => { if (settings) setForm((p) => ({ ...p, ...settings })); }, [settings]);

  const saveMutation = useMutation({
    mutationFn: emailAPI.updateSettings,
    onSuccess: () => { queryClient.invalidateQueries(['emailSettings']); toast.success('Email settings saved'); },
  });

  const handleTest = async () => {
    if (!testEmail) return toast.error('Enter a recipient email');
    setTesting(true);
    try {
      await emailAPI.test({ to: testEmail });
      toast.success('Test email sent! Check your inbox.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Test failed');
    } finally {
      setTesting(false);
    }
  };

  const f = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));
  const cls = 'w-full bg-noir border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-gold outline-none';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-playfair font-bold mb-1">Email Settings</h1>
        <p className="text-gray-400 text-sm">Configure SMTP and manage email notification templates.</p>
      </div>

      <div className="flex gap-1 p-1 bg-noir-card rounded-xl border border-gray-800 w-fit">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2.5 rounded-lg text-sm font-montserrat transition-all ${tab === t ? 'bg-gold text-black font-semibold' : 'text-gray-400 hover:text-white'}`}
          >{t}</button>
        ))}
      </div>

      {tab === 'SMTP' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 max-w-2xl">
          <div className="luxury-card p-6 space-y-4">
            <h3 className="font-playfair font-bold text-white text-lg">SMTP Configuration</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">SMTP Host</label>
                <input type="text" value={form.smtp_host || ''} onChange={f('smtp_host')} placeholder="smtp.gmail.com" className={cls} />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Port</label>
                <input type="number" value={form.smtp_port || '587'} onChange={f('smtp_port')} className={cls} />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Username / Email</label>
                <input type="email" value={form.smtp_user || ''} onChange={f('smtp_user')} placeholder="your@email.com" className={cls} />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Password / App Password</label>
                <input type="password" value={form.smtp_password || ''} onChange={f('smtp_password')} placeholder="••••••••" className={cls} />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">From Name</label>
                <input type="text" value={form.email_from_name || ''} onChange={f('email_from_name')} placeholder="Noor Mist" className={cls} />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">From Address</label>
                <input type="email" value={form.email_from_address || ''} onChange={f('email_from_address')} placeholder="noreply@noormist.com" className={cls} />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Encryption</label>
              <select value={form.smtp_secure || 'false'} onChange={f('smtp_secure')} className={cls}>
                <option value="false">STARTTLS (Port 587)</option>
                <option value="true">SSL/TLS (Port 465)</option>
              </select>
            </div>
            <button onClick={() => saveMutation.mutate(form)} className="btn-gold" disabled={saveMutation.isLoading}>
              <HiCheck className="w-4 h-4 inline mr-2" />
              {saveMutation.isLoading ? 'Saving…' : 'Save SMTP Settings'}
            </button>
          </div>

          <div className="luxury-card p-6 space-y-4">
            <h3 className="font-playfair font-bold text-white text-lg flex items-center gap-2">
              <HiLightningBolt className="w-5 h-5 text-gold" /> Send Test Email
            </h3>
            <div className="flex gap-3">
              <input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="recipient@example.com" className={`${cls} flex-1`} />
              <button onClick={handleTest} disabled={testing} className="btn-outline-gold flex-shrink-0">
                {testing ? 'Sending…' : 'Send Test'}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {tab === 'Templates' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 max-w-2xl">
          <div className="luxury-card p-6 space-y-4">
            <h3 className="font-playfair font-bold text-white text-lg">Email Notifications</h3>
            <p className="text-xs text-gray-500">Enable or disable automated email notifications sent to customers.</p>
            {Object.entries({
              email_order_confirmation: 'Order Confirmation',
              email_shipping_notification: 'Shipping Notification',
              email_welcome: 'Welcome Email (on registration)',
              email_password_reset: 'Password Reset',
              email_newsletter: 'Newsletter Subscription Confirmation',
            }).map(([key, label]) => (
              <label key={key} className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0 cursor-pointer">
                <div>
                  <p className="text-white text-sm font-medium">{label}</p>
                  <p className="text-xs text-gray-500">Automated email sent to customer</p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={form[key] !== 'false'}
                    onChange={(e) => setForm((p) => ({ ...p, [key]: String(e.target.checked) }))}
                    className="sr-only"
                  />
                  <div
                    onClick={() => setForm((p) => ({ ...p, [key]: String(p[key] === 'false') }))}
                    className={`w-11 h-6 rounded-full cursor-pointer transition-colors ${form[key] !== 'false' ? 'bg-gold' : 'bg-gray-700'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full mt-1 transition-transform ${form[key] !== 'false' ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
                </div>
              </label>
            ))}
            <button onClick={() => saveMutation.mutate(form)} className="btn-gold mt-2" disabled={saveMutation.isLoading}>
              <HiCheck className="w-4 h-4 inline mr-2" />Save Template Settings
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
