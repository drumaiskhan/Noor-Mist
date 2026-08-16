import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { HiCheck, HiCreditCard, HiTruck, HiPlus, HiTrash } from 'react-icons/hi';
import { settingsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const TABS = ['Payment Methods', 'Shipping Zones'];

function Toggle({ value, onChange, label, description }) {
  return (
    <label className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0 cursor-pointer group">
      <div>
        <p className="text-white text-sm font-medium group-hover:text-gold transition-colors">{label}</p>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
      <div className={`w-11 h-6 rounded-full cursor-pointer transition-colors flex-shrink-0 ${value ? 'bg-gold' : 'bg-gray-700'}`} onClick={() => onChange(!value)}>
        <div className={`w-4 h-4 bg-white rounded-full mt-1 transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
      </div>
    </label>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text', hint }) {
  return (
    <div>
      <label className="text-xs text-gray-400 mb-1 block font-montserrat">{label}</label>
      <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-noir border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-gold outline-none" />
      {hint && <p className="text-xs text-gray-600 mt-1">{hint}</p>}
    </div>
  );
}

export default function PaymentShipping() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('Payment Methods');
  const [form, setForm] = useState({});
  const [zones, setZones] = useState([]);

  const { data: settings } = useQuery({
    queryKey: ['siteSettings'],
    queryFn: async () => { const { data } = await settingsAPI.get(); return data.settings ?? {}; },
  });

  useEffect(() => {
    if (!settings) return;
    setForm(settings);
    try {
      setZones(JSON.parse(settings.shipping_zones || '[]'));
    } catch { setZones([]); }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: settingsAPI.update,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['siteSettings'] }); toast.success('Settings saved'); },
  });

  const bool = (key) => form[key] !== 'false' && form[key] !== undefined ? (form[key] === 'true' || form[key] === true) : false;
  const set = (key) => (val) => setForm((p) => ({ ...p, [key]: typeof val === 'boolean' ? String(val) : val }));

  const savePayment = () => saveMutation.mutate({
    payment_cod_enabled: form.payment_cod_enabled,
    payment_jazzcash_enabled: form.payment_jazzcash_enabled,
    payment_jazzcash_merchant_id: form.payment_jazzcash_merchant_id || '',
    payment_jazzcash_password: form.payment_jazzcash_password || '',
    payment_easypaisa_enabled: form.payment_easypaisa_enabled,
    payment_easypaisa_store_id: form.payment_easypaisa_store_id || '',
    payment_easypaisa_hash_key: form.payment_easypaisa_hash_key || '',
    payment_stripe_enabled: form.payment_stripe_enabled,
    payment_stripe_public_key: form.payment_stripe_public_key || '',
    payment_stripe_secret_key: form.payment_stripe_secret_key || '',
    payment_bank_enabled: form.payment_bank_enabled,
    payment_bank_name: form.payment_bank_name || '',
    payment_bank_account: form.payment_bank_account || '',
    payment_bank_iban: form.payment_bank_iban || '',
    payment_test_mode: form.payment_test_mode,
  });

  const saveShipping = () => saveMutation.mutate({
    shipping_free_threshold: form.shipping_free_threshold || '',
    shipping_flat_rate: form.shipping_flat_rate || '',
    shipping_zones: JSON.stringify(zones),
  });

  const addZone = () => setZones((z) => [...z, { name: '', regions: '', flat_rate: '', free_threshold: '', estimated_days: '' }]);
  const removeZone = (i) => setZones((z) => z.filter((_, idx) => idx !== i));
  const updateZone = (i, key, val) => setZones((z) => z.map((zone, idx) => idx === i ? { ...zone, [key]: val } : zone));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-playfair font-bold mb-1">Payment & Shipping</h1>
        <p className="text-gray-400 text-sm">Configure payment gateways and shipping zones.</p>
      </div>

      <div className="flex gap-1 p-1 bg-noir-card rounded-xl border border-gray-800 w-fit">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-montserrat transition-all ${tab === t ? 'bg-gold text-black font-semibold' : 'text-gray-400 hover:text-white'}`}
          >
            {t === 'Payment Methods' ? <HiCreditCard className="w-4 h-4" /> : <HiTruck className="w-4 h-4" />}{t}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>

          {tab === 'Payment Methods' && (
            <div className="space-y-4 max-w-2xl">
              <div className="luxury-card p-6 space-y-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-playfair font-bold text-white text-lg">Test Mode</h3>
                  <Toggle value={bool('payment_test_mode')} onChange={set('payment_test_mode')} label="" />
                </div>
                <p className="text-xs text-gray-500 -mt-2">When enabled, payments are processed in sandbox/test mode. Disable in production.</p>
              </div>

              {/* Cash on Delivery */}
              <div className="luxury-card p-6 space-y-3">
                <Toggle value={bool('payment_cod_enabled')} onChange={set('payment_cod_enabled')} label="Cash on Delivery (COD)" description="Customer pays when order is delivered" />
              </div>

              {/* JazzCash */}
              <div className="luxury-card p-6 space-y-3">
                <Toggle value={bool('payment_jazzcash_enabled')} onChange={set('payment_jazzcash_enabled')} label="JazzCash" description="Pakistan's leading mobile payment" />
                {bool('payment_jazzcash_enabled') && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <Field label="Merchant ID" value={form.payment_jazzcash_merchant_id} onChange={set('payment_jazzcash_merchant_id')} />
                    <Field label="Password" value={form.payment_jazzcash_password} onChange={set('payment_jazzcash_password')} type="password" />
                  </div>
                )}
              </div>

              {/* EasyPaisa */}
              <div className="luxury-card p-6 space-y-3">
                <Toggle value={bool('payment_easypaisa_enabled')} onChange={set('payment_easypaisa_enabled')} label="EasyPaisa" description="Telenor mobile wallet payments" />
                {bool('payment_easypaisa_enabled') && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <Field label="Store ID" value={form.payment_easypaisa_store_id} onChange={set('payment_easypaisa_store_id')} />
                    <Field label="Hash Key" value={form.payment_easypaisa_hash_key} onChange={set('payment_easypaisa_hash_key')} type="password" />
                  </div>
                )}
              </div>

              {/* Stripe */}
              <div className="luxury-card p-6 space-y-3">
                <Toggle value={bool('payment_stripe_enabled')} onChange={set('payment_stripe_enabled')} label="Stripe" description="International credit/debit card payments" />
                {bool('payment_stripe_enabled') && (
                  <div className="space-y-3 pt-2">
                    <Field label="Publishable Key" value={form.payment_stripe_public_key} onChange={set('payment_stripe_public_key')} placeholder="pk_test_..." />
                    <Field label="Secret Key" value={form.payment_stripe_secret_key} onChange={set('payment_stripe_secret_key')} placeholder="sk_test_..." type="password" />
                  </div>
                )}
              </div>

              {/* Bank Transfer */}
              <div className="luxury-card p-6 space-y-3">
                <Toggle value={bool('payment_bank_enabled')} onChange={set('payment_bank_enabled')} label="Bank Transfer" description="Direct bank account transfer" />
                {bool('payment_bank_enabled') && (
                  <div className="space-y-3 pt-2">
                    <Field label="Bank Name" value={form.payment_bank_name} onChange={set('payment_bank_name')} placeholder="HBL / MCB / Meezan" />
                    <Field label="Account Number" value={form.payment_bank_account} onChange={set('payment_bank_account')} />
                    <Field label="IBAN" value={form.payment_bank_iban} onChange={set('payment_bank_iban')} placeholder="PK00XXXX0000000000000000" />
                  </div>
                )}
              </div>

              <button onClick={savePayment} className="btn-gold" disabled={saveMutation.isPending}>
                <HiCheck className="w-4 h-4 inline mr-2" />{saveMutation.isPending ? 'Saving…' : 'Save Payment Settings'}
              </button>
            </div>
          )}

          {tab === 'Shipping Zones' && (
            <div className="space-y-4 max-w-2xl">
              <div className="luxury-card p-6 space-y-4">
                <h3 className="font-playfair font-bold text-white text-lg">Global Defaults</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Default Flat Rate (₨)" value={form.shipping_flat_rate} onChange={set('shipping_flat_rate')} placeholder="200" type="number" />
                  <Field label="Free Shipping Threshold (₨)" value={form.shipping_free_threshold} onChange={set('shipping_free_threshold')} placeholder="5000" type="number" hint="0 = no free shipping" />
                </div>
              </div>

              <div className="luxury-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-playfair font-bold text-white text-lg">Shipping Zones</h3>
                  <button onClick={addZone} className="flex items-center gap-1.5 text-sm text-gold hover:text-gold/80 transition-colors">
                    <HiPlus className="w-4 h-4" /> Add Zone
                  </button>
                </div>

                {zones.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">No zones yet — add a zone to set region-specific rates.</p>
                )}

                {zones.map((zone, i) => (
                  <div key={i} className="p-4 bg-noir rounded-xl border border-gray-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-white font-medium text-sm">{zone.name || `Zone ${i + 1}`}</p>
                      <button onClick={() => removeZone(i)} className="text-gray-600 hover:text-red-400 transition-colors"><HiTrash className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Zone Name" value={zone.name} onChange={(v) => updateZone(i, 'name', v)} placeholder="Lahore / Karachi" />
                      <Field label="Regions / Cities" value={zone.regions} onChange={(v) => updateZone(i, 'regions', v)} placeholder="Lahore, Islamabad" />
                      <Field label="Rate (₨)" value={zone.flat_rate} onChange={(v) => updateZone(i, 'flat_rate', v)} type="number" />
                      <Field label="Free Threshold (₨)" value={zone.free_threshold} onChange={(v) => updateZone(i, 'free_threshold', v)} type="number" />
                      <Field label="Est. Delivery Days" value={zone.estimated_days} onChange={(v) => updateZone(i, 'estimated_days', v)} placeholder="2-3" />
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={saveShipping} className="btn-gold" disabled={saveMutation.isPending}>
                <HiCheck className="w-4 h-4 inline mr-2" />{saveMutation.isPending ? 'Saving…' : 'Save Shipping Settings'}
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
