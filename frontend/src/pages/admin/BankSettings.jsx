import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  HiSave, HiUpload, HiPhotograph, HiX, HiCheckCircle,
  HiInformationCircle, HiCreditCard, HiEye, HiEyeOff,
} from 'react-icons/hi';
import { bankSettingsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const EMPTY_FORM = {
  bank_name: '',
  account_title: '',
  account_number: '',
  iban: '',
  branch_code: '',
  swift_code: '',
  instructions: '',
  easypaisa_number: '',
  jazzcash_number: '',
  bank_transfer_enabled: true,
  easypaisa_enabled: false,
  jazzcash_enabled: false,
};

/* ── Reusable helpers ─────────────────────────────────────────────────────── */

function Toggle({ value, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-white font-montserrat">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
          value ? 'bg-gold' : 'bg-gray-700'
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
            value ? 'translate-x-7' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, hint, textarea, type = 'text' }) {
  const cls =
    'w-full bg-noir border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-gold outline-none transition-colors';
  return (
    <div>
      <label className="text-xs text-gray-400 mb-1.5 block font-montserrat uppercase tracking-wide">
        {label}
      </label>
      {textarea ? (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className={`${cls} resize-none`}
        />
      ) : (
        <input
          type={type}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cls}
        />
      )}
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

function SectionCard({ children, enabled, className = '' }) {
  return (
    <div
      className={`bg-noir-card border rounded-2xl p-6 transition-colors ${
        enabled === false
          ? 'border-gray-800 opacity-60'
          : 'border-gray-700'
      } ${className}`}
    >
      {children}
    </div>
  );
}

function StatusBadge({ enabled }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border font-montserrat ${
        enabled
          ? 'bg-green-500/10 text-green-400 border-green-500/20'
          : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
      }`}
    >
      {enabled ? <HiEye className="w-3.5 h-3.5" /> : <HiEyeOff className="w-3.5 h-3.5" />}
      {enabled ? 'Visible at checkout' : 'Hidden from checkout'}
    </span>
  );
}

/* ── Main component ───────────────────────────────────────────────────────── */

export default function BankSettings() {
  const queryClient = useQueryClient();
  const qrInputRef = useRef(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [qrPreview, setQrPreview] = useState('');
  const [qrUploading, setQrUploading] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['bankSettings'],
    queryFn: () => bankSettingsAPI.get().then((r) => r.data),
  });

  useEffect(() => {
    if (data) {
      setForm({
        bank_name: data.bank_name || '',
        account_title: data.account_title || '',
        account_number: data.account_number || '',
        iban: data.iban || '',
        branch_code: data.branch_code || '',
        swift_code: data.swift_code || '',
        instructions: data.instructions || '',
        easypaisa_number: data.easypaisa_number || '',
        jazzcash_number: data.jazzcash_number || '',
        bank_transfer_enabled: data.bank_transfer_enabled ?? true,
        easypaisa_enabled: data.easypaisa_enabled ?? false,
        jazzcash_enabled: data.jazzcash_enabled ?? false,
      });
      if (data.qr_image_url) setQrPreview(data.qr_image_url);
    }
  }, [data]);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const saveMutation = useMutation({
    mutationFn: (payload) => bankSettingsAPI.save(payload),
    onSuccess: () => {
      toast.success('Bank settings saved');
      queryClient.invalidateQueries({ queryKey: ['bankSettings'] });
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to save settings'),
  });

  const handleSave = () => saveMutation.mutate(form);

  const handleQrChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setQrPreview(ev.target.result);
    reader.readAsDataURL(file);
    setQrUploading(true);
    try {
      const res = await bankSettingsAPI.uploadQr(file);
      setQrPreview(res.data.url);
      toast.success('QR code uploaded');
      queryClient.invalidateQueries({ queryKey: ['bankSettings'] });
    } catch (err) {
      toast.error(err?.response?.data?.error || 'QR upload failed');
    } finally {
      setQrUploading(false);
      e.target.value = '';
    }
  };

  const removeQr = async () => {
    setQrPreview('');
    try {
      await bankSettingsAPI.save({ ...form, qr_image_url: '' });
      queryClient.invalidateQueries({ queryKey: ['bankSettings'] });
    } catch (_) {}
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400 gap-2">
        <HiInformationCircle className="w-5 h-5" />
        Failed to load bank settings.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-10">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-playfair font-bold text-white">Bank Settings</h1>
          <p className="text-sm text-gray-500 mt-1 font-montserrat">
            Manage payment details shown to customers at checkout
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="flex items-center gap-2 px-5 py-2.5 bg-gold text-black text-sm font-semibold font-montserrat rounded-lg hover:bg-gold/90 transition-colors disabled:opacity-60"
        >
          {saveMutation.isPending ? (
            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
          ) : (
            <HiSave className="w-4 h-4" />
          )}
          Save Settings
        </motion.button>
      </div>

      {/* Info banner */}
      <div className="bg-gold/5 border border-gold/20 rounded-xl p-4 flex items-start gap-3">
        <HiCheckCircle className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
        <p className="text-sm text-gray-300">
          Use the toggles on each section to show or hide that payment method at checkout.
          Details are fetched automatically — no code changes required.
        </p>
      </div>

      {/* ── Bank Transfer ─────────────────────────────────────────────── */}
      <SectionCard enabled={form.bank_transfer_enabled}>
        {/* Section header with toggle */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
              <HiCreditCard className="w-5 h-5 text-gold" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white font-montserrat">Bank Transfer</h3>
              <p className="text-xs text-gray-500 mt-0.5">Direct account-to-account transfer</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <StatusBadge enabled={form.bank_transfer_enabled} />
            <Toggle
              value={form.bank_transfer_enabled}
              onChange={set('bank_transfer_enabled')}
              label=""
              description=""
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Bank Name" value={form.bank_name} onChange={set('bank_name')} placeholder="e.g. Meezan Bank" />
          <Field label="Account Title" value={form.account_title} onChange={set('account_title')} placeholder="e.g. Noor Mist Pvt Ltd" />
          <Field label="Account Number" value={form.account_number} onChange={set('account_number')} placeholder="e.g. 01234567890123" />
          <Field label="IBAN" value={form.iban} onChange={set('iban')} placeholder="e.g. PK36MEZN0001010123456789" />
          <Field label="Branch Code" value={form.branch_code} onChange={set('branch_code')} placeholder="e.g. 0696" />
          <Field label="SWIFT / BIC Code" value={form.swift_code} onChange={set('swift_code')} placeholder="e.g. MEZNPKKA" />
        </div>

        <div className="mt-4">
          <Field
            label="Payment Instructions"
            value={form.instructions}
            onChange={set('instructions')}
            placeholder="e.g. Please include your order number in the transfer reference..."
            textarea
          />
        </div>

        {/* QR Code */}
        <div className="mt-5">
          <label className="text-xs text-gray-400 mb-2 block font-montserrat uppercase tracking-wide">
            QR Code Image
          </label>
          <div className="flex items-start gap-4">
            {qrPreview ? (
              <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-gray-700 bg-white/5 flex-shrink-0">
                <img src={qrPreview} alt="Bank QR Code" className="w-full h-full object-contain p-2" />
                {qrUploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                <button
                  onClick={removeQr}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                >
                  <HiX className="w-3 h-3 text-white" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => qrInputRef.current?.click()}
                disabled={qrUploading}
                className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-700 hover:border-gold/50 transition-colors flex flex-col items-center justify-center gap-1.5 text-gray-500 hover:text-gray-300 flex-shrink-0 disabled:opacity-60"
              >
                {qrUploading ? (
                  <div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <HiPhotograph className="w-7 h-7" />
                    <span className="text-xs font-montserrat">Upload QR</span>
                  </>
                )}
              </button>
            )}
            <div className="flex-1 space-y-2">
              <p className="text-xs text-gray-500 leading-relaxed">
                Upload a QR code for bank transfers. Shown at checkout for easy scanning.
                Recommended: 400×400px, PNG or JPG.
              </p>
              <button
                onClick={() => qrInputRef.current?.click()}
                disabled={qrUploading}
                className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-gray-700 rounded-lg text-xs text-gray-300 hover:text-white hover:border-gray-500 transition-colors disabled:opacity-60"
              >
                <HiUpload className="w-4 h-4" />
                {qrPreview ? 'Replace QR Image' : 'Upload QR Image'}
              </button>
            </div>
          </div>
          <input
            ref={qrInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={handleQrChange}
          />
        </div>
      </SectionCard>

      {/* ── EasyPaisa ─────────────────────────────────────────────────── */}
      <SectionCard enabled={form.easypaisa_enabled}>
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-green-400 text-xs font-bold font-montserrat">EP</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white font-montserrat">EasyPaisa</h3>
              <p className="text-xs text-gray-500 mt-0.5">Telenor mobile wallet payment</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <StatusBadge enabled={form.easypaisa_enabled} />
            <Toggle
              value={form.easypaisa_enabled}
              onChange={set('easypaisa_enabled')}
              label=""
              description=""
            />
          </div>
        </div>

        <Field
          label="EasyPaisa Number"
          value={form.easypaisa_number}
          onChange={set('easypaisa_number')}
          placeholder="e.g. 0300 1234567"
          hint="Mobile number customers will send payment to"
        />
      </SectionCard>

      {/* ── JazzCash ──────────────────────────────────────────────────── */}
      <SectionCard enabled={form.jazzcash_enabled}>
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-red-400 text-xs font-bold font-montserrat">JC</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white font-montserrat">JazzCash</h3>
              <p className="text-xs text-gray-500 mt-0.5">Jazz mobile wallet payment</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <StatusBadge enabled={form.jazzcash_enabled} />
            <Toggle
              value={form.jazzcash_enabled}
              onChange={set('jazzcash_enabled')}
              label=""
              description=""
            />
          </div>
        </div>

        <Field
          label="JazzCash Number"
          value={form.jazzcash_number}
          onChange={set('jazzcash_number')}
          placeholder="e.g. 0300 7654321"
          hint="Mobile number customers will send payment to"
        />
      </SectionCard>

      {/* Bottom save */}
      <div className="flex justify-end pt-2">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="flex items-center gap-2 px-6 py-3 bg-gold text-black text-sm font-semibold font-montserrat rounded-lg hover:bg-gold/90 transition-colors disabled:opacity-60"
        >
          {saveMutation.isPending ? (
            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
          ) : (
            <HiSave className="w-4 h-4" />
          )}
          Save Bank Settings
        </motion.button>
      </div>
    </div>
  );
}
