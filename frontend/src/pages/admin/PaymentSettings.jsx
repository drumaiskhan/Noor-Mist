import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiCheck, HiX, HiPlus, HiTrash, HiPencil, HiUpload, HiPhotograph,
  HiRefresh, HiDownload, HiEye, HiSearch, HiFilter, HiExclamationCircle,
  HiCheckCircle, HiXCircle, HiClock, HiBadgeCheck,
} from 'react-icons/hi';
import { paymentAPI } from '../../services/api';
import toast from 'react-hot-toast';

const TABS = ['Payment Methods', 'Bank Accounts', 'Digital Wallets', 'Payment Proofs', 'Stats'];

const WALLET_TYPES = [
  { type: 'easypaisa', label: 'EasyPaisa', color: 'from-green-600 to-green-800' },
  { type: 'jazzcash', label: 'JazzCash', color: 'from-red-600 to-red-800' },
  { type: 'sadapay', label: 'SadaPay', color: 'from-purple-600 to-purple-800' },
  { type: 'nayapay', label: 'NayaPay', color: 'from-blue-600 to-blue-800' },
  { type: 'raast', label: 'Raast (SBP)', color: 'from-teal-600 to-teal-800' },
];

const STATUS_STYLES = {
  pending: { label: 'Pending', icon: HiClock, cls: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' },
  approved: { label: 'Approved', icon: HiCheckCircle, cls: 'text-green-400 bg-green-400/10 border-green-400/30' },
  rejected: { label: 'Rejected', icon: HiXCircle, cls: 'text-red-400 bg-red-400/10 border-red-400/30' },
  refunded: { label: 'Refunded', icon: HiRefresh, cls: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
};

// ── Small helpers ──────────────────────────────────────────────────────────
function Toggle({ value, onChange }) {
  return (
    <div
      onClick={() => onChange(!value)}
      className={`w-11 h-6 rounded-full cursor-pointer transition-colors flex-shrink-0 ${value ? 'bg-gold' : 'bg-gray-700'}`}
    >
      <div className={`w-4 h-4 bg-white rounded-full mt-1 transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text', hint, textarea }) {
  const cls = 'w-full bg-noir border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-gold outline-none transition-colors';
  return (
    <div>
      <label className="text-xs text-gray-400 mb-1 block font-montserrat">{label}</label>
      {textarea
        ? <textarea value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} className={`${cls} resize-none`} />
        : <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      }
      {hint && <p className="text-xs text-gray-600 mt-1">{hint}</p>}
    </div>
  );
}

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${s.cls}`}>
      <s.icon className="w-3.5 h-3.5" />{s.label}
    </span>
  );
}

function ImageUploadBtn({ label, currentUrl, onChange, small }) {
  const ref = useRef();
  return (
    <div className="space-y-2">
      {label && <label className="text-xs text-gray-400 block font-montserrat">{label}</label>}
      <div
        onClick={() => ref.current?.click()}
        className={`border-2 border-dashed border-gray-700 hover:border-gold/40 rounded-xl cursor-pointer transition-all flex items-center justify-center ${small ? 'h-20' : 'h-32'}`}
      >
        {currentUrl
          ? <img src={currentUrl} alt="" className="max-h-full max-w-full object-contain rounded-lg p-1" />
          : <div className="text-center text-gray-500"><HiPhotograph className="w-6 h-6 mx-auto mb-1" /><p className="text-xs">Upload</p></div>
        }
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => onChange(e.target.files?.[0])} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
export default function PaymentSettings() {
  const [tab, setTab] = useState('Payment Methods');
  const qc = useQueryClient();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-playfair font-bold mb-1">Payment Settings</h1>
        <p className="text-gray-400 text-sm">Manage payment methods, bank accounts, digital wallets, and verify payments.</p>
      </div>

      <div className="flex gap-1 p-1 bg-noir-card rounded-xl border border-gray-800 flex-wrap">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 rounded-lg text-sm font-montserrat transition-all whitespace-nowrap ${tab === t ? 'bg-gold text-black font-semibold' : 'text-gray-400 hover:text-white'}`}
          >{t}</button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          {tab === 'Payment Methods' && <PaymentMethodsTab qc={qc} />}
          {tab === 'Bank Accounts' && <BankAccountsTab qc={qc} />}
          {tab === 'Digital Wallets' && <DigitalWalletsTab qc={qc} />}
          {tab === 'Payment Proofs' && <PaymentProofsTab qc={qc} />}
          {tab === 'Stats' && <StatsTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── Tab 1: Payment Methods ─────────────────────────────────────────────────
function PaymentMethodsTab({ qc }) {
  const { data, isLoading } = useQuery({ queryKey: ['adminMethods'], queryFn: async () => (await paymentAPI.getAdminMethods()).data });

  const updateMutation = useMutation({
    mutationFn: ({ key, data }) => paymentAPI.updateMethod(key, data),
    onSuccess: () => { qc.invalidateQueries(['adminMethods']); toast.success('Saved'); },
    onError: () => toast.error('Failed to save'),
  });

  const [editing, setEditing] = useState({});

  if (isLoading) return <div className="flex justify-center py-20"><HiRefresh className="w-6 h-6 text-gold animate-spin" /></div>;
  const methods = data?.methods || [];

  return (
    <div className="space-y-4 max-w-2xl">
      {methods.map(m => {
        const isEditing = editing[m.key];
        const localData = editing[m.key] || m;
        const set = (field) => (val) => setEditing(prev => ({ ...prev, [m.key]: { ...(prev[m.key] || m), [field]: val } }));
        return (
          <div key={m.key} className="luxury-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {m.icon_url && <img src={m.icon_url} alt={m.label} className="w-8 h-8 object-contain" />}
                <div>
                  <p className="text-white font-semibold text-sm">{m.label}</p>
                  <p className="text-xs text-gray-500">{m.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Toggle
                  value={isEditing ? localData.is_enabled : m.is_enabled}
                  onChange={(v) => {
                    setEditing(prev => ({ ...prev, [m.key]: { ...(prev[m.key] || m), is_enabled: v } }));
                    updateMutation.mutate({ key: m.key, data: { is_enabled: v } });
                  }}
                />
                <button onClick={() => setEditing(prev => ({ ...prev, [m.key]: prev[m.key] ? undefined : { ...m } }))}
                  className="text-gray-400 hover:text-gold transition-colors">
                  <HiPencil className="w-4 h-4" />
                </button>
              </div>
            </div>

            <AnimatePresence>
              {isEditing && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="space-y-3 pt-3 border-t border-gray-800">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Display Order" value={localData.display_order} onChange={set('display_order')} type="number" />
                      <Field label="Min Order Amount (₨)" value={localData.min_order_amount} onChange={set('min_order_amount')} type="number" />
                    </div>
                    <Field label="Instructions (shown to customer)" value={localData.instructions} onChange={set('instructions')} textarea placeholder="How to pay using this method..." />
                    <Field label="Admin Notes" value={localData.notes} onChange={set('notes')} textarea placeholder="Internal notes..." />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { updateMutation.mutate({ key: m.key, data: localData }); setEditing(p => ({ ...p, [m.key]: undefined })); }}
                        className="btn-gold text-sm py-2 px-4"
                      >
                        <HiCheck className="w-4 h-4 inline mr-1" />Save
                      </button>
                      <button onClick={() => setEditing(p => ({ ...p, [m.key]: undefined }))} className="px-4 py-2 text-gray-400 hover:text-white border border-gray-700 rounded-lg text-sm transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// ── Tab 2: Bank Accounts ───────────────────────────────────────────────────
function BankAccountsTab({ qc }) {
  const { data, isLoading } = useQuery({ queryKey: ['adminBankAccounts'], queryFn: async () => (await paymentAPI.getAdminBankAccounts()).data });
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const emptyForm = { bank_name: '', account_title: '', account_number: '', iban: '', branch_name: '', branch_code: '', swift_code: '', instructions: '', display_order: '0', is_active: true };
  const [form, setForm] = useState(emptyForm);
  const [qrFile, setQrFile] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const set = (field) => (val) => setForm(p => ({ ...p, [field]: val }));

  const deleteMutation = useMutation({
    mutationFn: paymentAPI.deleteBankAccount,
    onSuccess: () => { qc.invalidateQueries(['adminBankAccounts']); toast.success('Deleted'); },
    onError: () => toast.error('Delete failed'),
  });

  const openEdit = (acc) => {
    setForm({ ...acc });
    setEditId(acc.id);
    setQrFile(null); setLogoFile(null);
    setShowForm(true);
  };

  const openNew = () => {
    setForm(emptyForm);
    setEditId(null);
    setQrFile(null); setLogoFile(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.bank_name || !form.account_title) { toast.error('Bank name and account title required'); return; }
    setIsSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== null && v !== undefined) fd.append(k, v); });
      if (qrFile) fd.append('qr_image', qrFile);
      if (logoFile) fd.append('logo', logoFile);
      if (editId) await paymentAPI.updateBankAccount(editId, fd);
      else await paymentAPI.createBankAccount(fd);
      qc.invalidateQueries(['adminBankAccounts']);
      toast.success(editId ? 'Updated' : 'Created');
      setShowForm(false);
    } catch { toast.error('Failed to save'); }
    finally { setIsSaving(false); }
  };

  if (isLoading) return <div className="flex justify-center py-20"><HiRefresh className="w-6 h-6 text-gold animate-spin" /></div>;
  const accounts = data?.accounts || [];

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex justify-end">
        <button onClick={openNew} className="btn-gold text-sm py-2 px-4 flex items-center gap-2">
          <HiPlus className="w-4 h-4" />Add Bank Account
        </button>
      </div>

      {accounts.length === 0 && !showForm && (
        <div className="luxury-card p-12 text-center text-gray-500">
          <HiPhotograph className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No bank accounts yet. Add one above.</p>
        </div>
      )}

      {accounts.map(acc => (
        <div key={acc.id} className="luxury-card p-5">
          <div className="flex items-start gap-4">
            {acc.logo_url && <img src={acc.logo_url} alt={acc.bank_name} className="w-12 h-12 object-contain rounded-lg bg-white/5 p-1 flex-shrink-0" />}
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-white">{acc.bank_name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${acc.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                  {acc.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-sm text-gray-400">{acc.account_title}</p>
              {acc.account_number && <p className="text-xs text-gray-500">Account: {acc.account_number}</p>}
              {acc.iban && <p className="text-xs text-gray-500">IBAN: {acc.iban}</p>}
            </div>
            {acc.qr_image_url && <img src={acc.qr_image_url} alt="QR" className="w-16 h-16 object-contain rounded-lg border border-gray-700" />}
            <div className="flex gap-2">
              <button onClick={() => openEdit(acc)} className="text-gray-400 hover:text-gold transition-colors p-1"><HiPencil className="w-4 h-4" /></button>
              <button onClick={() => { if (confirm('Delete this bank account?')) deleteMutation.mutate(acc.id); }} className="text-gray-400 hover:text-red-400 transition-colors p-1"><HiTrash className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      ))}

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="luxury-card p-6 space-y-4 border-gold/20">
            <div className="flex items-center justify-between">
              <h3 className="font-playfair font-bold text-white">{editId ? 'Edit' : 'New'} Bank Account</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white"><HiX className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Bank Name *" value={form.bank_name} onChange={set('bank_name')} placeholder="HBL / MCB / Meezan" />
              <Field label="Account Title *" value={form.account_title} onChange={set('account_title')} />
              <Field label="Account Number" value={form.account_number} onChange={set('account_number')} />
              <Field label="IBAN" value={form.iban} onChange={set('iban')} placeholder="PK00XXXX..." />
              <Field label="Branch Name" value={form.branch_name} onChange={set('branch_name')} />
              <Field label="Branch Code" value={form.branch_code} onChange={set('branch_code')} />
              <Field label="SWIFT Code" value={form.swift_code} onChange={set('swift_code')} />
              <Field label="Display Order" value={form.display_order} onChange={set('display_order')} type="number" />
            </div>
            <Field label="Instructions" value={form.instructions} onChange={set('instructions')} textarea placeholder="Instructions shown to customers..." />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <ImageUploadBtn
                label="Bank Logo"
                currentUrl={logoFile ? URL.createObjectURL(logoFile) : form.logo_url}
                onChange={setLogoFile}
              />
              <ImageUploadBtn
                label="QR Code Image"
                currentUrl={qrFile ? URL.createObjectURL(qrFile) : form.qr_image_url}
                onChange={setQrFile}
              />
              <div className="sm:col-span-2 flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className={`w-10 h-6 rounded-full transition-colors ${form.is_active ? 'bg-gold' : 'bg-gray-700'}`} onClick={() => set('is_active')(!form.is_active)}>
                    <div className={`w-4 h-4 bg-white rounded-full mt-1 transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-1'}`} />
                  </div>
                  <span className="text-sm text-gray-400">Active (visible to customers)</span>
                </label>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={handleSave} disabled={isSaving} className="btn-gold text-sm py-2 px-5">
                {isSaving ? <HiRefresh className="w-4 h-4 animate-spin inline mr-1" /> : <HiCheck className="w-4 h-4 inline mr-1" />}
                {isSaving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-400 hover:text-white border border-gray-700 rounded-lg text-sm transition-colors">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Tab 3: Digital Wallets ─────────────────────────────────────────────────
function DigitalWalletsTab({ qc }) {
  const { data, isLoading } = useQuery({ queryKey: ['adminWallets'], queryFn: async () => (await paymentAPI.getAdminWallets()).data });
  const [editing, setEditing] = useState({});
  const [qrFiles, setQrFiles] = useState({});
  const [saving, setSaving] = useState({});

  const handleSave = async (type) => {
    setSaving(p => ({ ...p, [type]: true }));
    try {
      const fd = new FormData();
      const w = editing[type];
      if (w) Object.entries(w).forEach(([k, v]) => { if (v !== null && v !== undefined) fd.append(k, v); });
      if (qrFiles[type]) fd.append('qr_image', qrFiles[type]);
      await paymentAPI.updateWallet(type, fd);
      qc.invalidateQueries(['adminWallets']);
      toast.success('Wallet updated');
      setEditing(p => ({ ...p, [type]: undefined }));
      setQrFiles(p => ({ ...p, [type]: undefined }));
    } catch { toast.error('Failed to update'); }
    finally { setSaving(p => ({ ...p, [type]: false })); }
  };

  if (isLoading) return <div className="flex justify-center py-20"><HiRefresh className="w-6 h-6 text-gold animate-spin" /></div>;
  const wallets = {};
  (data?.wallets || []).forEach(w => { wallets[w.type] = w; });

  return (
    <div className="space-y-4 max-w-2xl">
      {WALLET_TYPES.map(({ type, label, color }) => {
        const w = wallets[type] || {};
        const isEditing = !!editing[type];
        const local = editing[type] || w;
        const set = (field) => (val) => setEditing(p => ({ ...p, [type]: { ...(p[type] || w), [field]: val } }));

        return (
          <div key={type} className="luxury-card overflow-hidden">
            <div className={`bg-gradient-to-r ${color} px-5 py-3 flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <p className="text-white font-semibold">{label}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${w.is_active ? 'bg-white/20 text-white' : 'bg-black/20 text-white/60'}`}>
                  {w.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Toggle
                  value={isEditing ? local.is_active : !!w.is_active}
                  onChange={(v) => { setEditing(p => ({ ...p, [type]: { ...(p[type] || w), is_active: v } })); paymentAPI.updateWallet(type, (() => { const fd = new FormData(); fd.append('is_active', v); return fd; })()).then(() => qc.invalidateQueries(['adminWallets'])).catch(() => {}); }}
                />
                <button onClick={() => setEditing(p => ({ ...p, [type]: p[type] ? undefined : { ...w } }))} className="text-white/80 hover:text-white transition-colors">
                  <HiPencil className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5">
              {!isEditing ? (
                <div className="flex items-start gap-4">
                  <div className="flex-1 space-y-1 text-sm">
                    {w.account_name && <p className="text-gray-300">Name: {w.account_name}</p>}
                    {w.mobile_number && <p className="text-gray-400">Mobile: {w.mobile_number}</p>}
                    {w.username && <p className="text-gray-400">Username: {w.username}</p>}
                    {w.raast_id && <p className="text-gray-400">Raast ID: {w.raast_id}</p>}
                    {w.linked_bank && <p className="text-gray-400">Bank: {w.linked_bank}</p>}
                    {!w.account_name && !w.mobile_number && !w.username && <p className="text-gray-600 italic text-xs">Not configured. Click edit to set up.</p>}
                  </div>
                  {w.qr_image_url && <img src={w.qr_image_url} alt="QR" className="w-20 h-20 object-contain rounded-lg border border-gray-700" />}
                </div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Account Name" value={local.account_name} onChange={set('account_name')} />
                    {['easypaisa','jazzcash'].includes(type) && <Field label="Mobile Number" value={local.mobile_number} onChange={set('mobile_number')} placeholder="03001234567" />}
                    {['sadapay','nayapay'].includes(type) && (
                      <>
                        <Field label="Mobile Number" value={local.mobile_number} onChange={set('mobile_number')} />
                        <Field label="Username" value={local.username} onChange={set('username')} placeholder="@username" />
                      </>
                    )}
                    {type === 'raast' && (
                      <>
                        <Field label="Raast ID" value={local.raast_id} onChange={set('raast_id')} />
                        <Field label="Linked Bank" value={local.linked_bank} onChange={set('linked_bank')} />
                      </>
                    )}
                  </div>
                  <Field label="Instructions" value={local.instructions} onChange={set('instructions')} textarea placeholder="How to pay via this wallet..." />
                  <ImageUploadBtn
                    label="QR Code"
                    currentUrl={qrFiles[type] ? URL.createObjectURL(qrFiles[type]) : local.qr_image_url}
                    onChange={(f) => setQrFiles(p => ({ ...p, [type]: f }))}
                    small
                  />
                  <div className="flex gap-2">
                    <button onClick={() => handleSave(type)} disabled={saving[type]} className="btn-gold text-sm py-2 px-4">
                      {saving[type] ? <HiRefresh className="w-4 h-4 animate-spin inline mr-1" /> : <HiCheck className="w-4 h-4 inline mr-1" />}
                      {saving[type] ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => { setEditing(p => ({ ...p, [type]: undefined })); setQrFiles(p => ({ ...p, [type]: undefined })); }} className="px-4 py-2 text-gray-400 hover:text-white border border-gray-700 rounded-lg text-sm transition-colors">Cancel</button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Tab 4: Payment Proofs ──────────────────────────────────────────────────
function PaymentProofsTab({ qc }) {
  const [filters, setFilters] = useState({ page: 1, limit: 20, status: '', method: '', search: '' });
  const [selected, setSelected] = useState(null);
  const [verifyNote, setVerifyNote] = useState('');
  const [zoomed, setZoomed] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['adminProofs', filters],
    queryFn: async () => (await paymentAPI.getProofs(filters)).data,
    keepPreviousData: true,
  });

  const verifyMutation = useMutation({
    mutationFn: ({ id, status, admin_note }) => paymentAPI.verifyProof(id, { status, admin_note }),
    onSuccess: (res) => {
      qc.invalidateQueries(['adminProofs']);
      qc.invalidateQueries(['paymentStats']);
      toast.success(`Payment ${res.data.proof.status}`);
      setSelected(res.data.proof);
    },
    onError: () => toast.error('Failed to update'),
  });

  const handleVerify = (status) => {
    if (!selected) return;
    verifyMutation.mutate({ id: selected.id, status, admin_note: verifyNote });
  };

  const exportCsv = async () => {
    try {
      const { data: blob } = await paymentAPI.exportCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'payments.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Export failed'); }
  };

  const proofs = data?.proofs || [];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
            placeholder="Search order #, name, transaction…"
            className="w-full bg-noir-card border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:border-gold outline-none"
          />
        </div>
        <select
          value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}
          className="bg-noir-card border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-gold outline-none"
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_STYLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select
          value={filters.method} onChange={e => setFilters(f => ({ ...f, method: e.target.value, page: 1 }))}
          className="bg-noir-card border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-gold outline-none"
        >
          <option value="">All Methods</option>
          {['bank_transfer','easypaisa','jazzcash','sadapay','nayapay','raast'].map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2.5 bg-gold/10 border border-gold/30 text-gold text-sm rounded-xl hover:bg-gold hover:text-black transition-all">
          <HiDownload className="w-4 h-4" />Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Proofs list */}
        <div className="space-y-2">
          {isLoading && <div className="flex justify-center py-10"><HiRefresh className="w-6 h-6 text-gold animate-spin" /></div>}
          {!isLoading && proofs.length === 0 && (
            <div className="luxury-card p-10 text-center text-gray-500">No payment proofs found.</div>
          )}
          {proofs.map(proof => (
            <button
              key={proof.id}
              onClick={() => { setSelected(proof); setVerifyNote(proof.admin_note || ''); }}
              className={`w-full text-left luxury-card p-4 transition-all hover:border-gold/30 ${selected?.id === proof.id ? 'border-gold/40 bg-gold/5' : ''}`}
            >
              <div className="flex items-start gap-3">
                <img src={proof.screenshot_url} alt="" className="w-14 h-14 object-cover rounded-lg border border-gray-700 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-white text-sm font-medium truncate">#{proof.order_number}</p>
                    <StatusBadge status={proof.status} />
                  </div>
                  <p className="text-xs text-gray-400">{proof.first_name} {proof.last_name}</p>
                  <p className="text-xs text-gray-500">{proof.payment_method} • {proof.amount ? `₨${Number(proof.amount).toLocaleString()}` : 'Amount N/A'}</p>
                  <p className="text-xs text-gray-600 mt-1">{new Date(proof.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </button>
          ))}

          {/* Pagination */}
          {data?.pages > 1 && (
            <div className="flex gap-2 justify-center pt-2">
              <button disabled={filters.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))} className="px-3 py-1.5 border border-gray-700 rounded-lg text-sm text-gray-400 hover:text-white disabled:opacity-30 transition-colors">Prev</button>
              <span className="px-3 py-1.5 text-sm text-gray-400">{filters.page} / {data.pages}</span>
              <button disabled={filters.page >= data.pages} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))} className="px-3 py-1.5 border border-gray-700 rounded-lg text-sm text-gray-400 hover:text-white disabled:opacity-30 transition-colors">Next</button>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div>
          {selected ? (
            <motion.div key={selected.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="luxury-card p-5 space-y-4 sticky top-24">
              <div className="flex items-center justify-between">
                <h3 className="font-playfair font-bold text-white">Proof #{selected.id}</h3>
                <StatusBadge status={selected.status} />
              </div>

              {/* Screenshot */}
              <div className="relative cursor-pointer" onClick={() => setZoomed(!zoomed)}>
                <img src={selected.screenshot_url} alt="Proof" className={`w-full rounded-xl border border-gray-700 object-contain transition-all ${zoomed ? 'max-h-screen' : 'max-h-48'}`} />
                <div className="absolute top-2 right-2 bg-black/60 rounded-lg p-1">
                  <HiEye className="w-4 h-4 text-white" />
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm">
                <DetailRow label="Order" value={`#${selected.order_number}`} />
                <DetailRow label="Customer" value={`${selected.first_name || ''} ${selected.last_name || ''}`} />
                <DetailRow label="Email" value={selected.email} />
                <DetailRow label="Method" value={selected.payment_method} />
                {selected.transaction_id && <DetailRow label="Transaction ID" value={selected.transaction_id} />}
                {selected.sender_name && <DetailRow label="Sender" value={selected.sender_name} />}
                {selected.sender_number && <DetailRow label="Sender #" value={selected.sender_number} />}
                {selected.amount && <DetailRow label="Amount" value={`₨${Number(selected.amount).toLocaleString()}`} highlight />}
                {selected.payment_date && <DetailRow label="Date" value={selected.payment_date} />}
                {selected.notes && <DetailRow label="Notes" value={selected.notes} />}
              </div>

              {/* Admin note */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Admin Note</label>
                <textarea
                  value={verifyNote} onChange={e => setVerifyNote(e.target.value)}
                  rows={2} placeholder="Optional note (shown to customer on rejection)..."
                  className="w-full bg-noir border border-gray-700 rounded-lg px-3 py-2 text-white text-xs focus:border-gold outline-none resize-none"
                />
              </div>

              {/* Verification buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => handleVerify('approved')} disabled={verifyMutation.isLoading || selected.status === 'approved'}
                  className="flex items-center justify-center gap-1.5 py-2.5 bg-green-600 hover:bg-green-500 text-white text-sm rounded-xl transition-all disabled:opacity-40">
                  <HiCheckCircle className="w-4 h-4" />Approve
                </button>
                <button onClick={() => handleVerify('rejected')} disabled={verifyMutation.isLoading || selected.status === 'rejected'}
                  className="flex items-center justify-center gap-1.5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm rounded-xl transition-all disabled:opacity-40">
                  <HiXCircle className="w-4 h-4" />Reject
                </button>
                <button onClick={() => handleVerify('pending')} disabled={verifyMutation.isLoading || selected.status === 'pending'}
                  className="flex items-center justify-center gap-1.5 py-2.5 bg-yellow-600 hover:bg-yellow-500 text-white text-sm rounded-xl transition-all disabled:opacity-40">
                  <HiClock className="w-4 h-4" />Mark Pending
                </button>
                <button onClick={() => handleVerify('refunded')} disabled={verifyMutation.isLoading || selected.status === 'refunded'}
                  className="flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-xl transition-all disabled:opacity-40">
                  <HiRefresh className="w-4 h-4" />Refunded
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="luxury-card p-12 text-center text-gray-500">
              <HiBadgeCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Select a proof to review</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, highlight }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-500 text-xs min-w-[90px]">{label}:</span>
      <span className={`text-xs ${highlight ? 'text-gold font-bold' : 'text-gray-300'}`}>{value}</span>
    </div>
  );
}

// ── Tab 5: Stats ───────────────────────────────────────────────────────────
function StatsTab() {
  const { data, isLoading } = useQuery({ queryKey: ['paymentStats'], queryFn: async () => (await paymentAPI.getStats()).data });

  if (isLoading) return <div className="flex justify-center py-20"><HiRefresh className="w-6 h-6 text-gold animate-spin" /></div>;

  const stats = data?.stats || {};
  const methodStats = data?.methodStats || [];
  const recent = data?.recent || [];

  const cards = [
    { label: 'Total Proofs', value: stats.total, color: 'text-white' },
    { label: "Today's Proofs", value: stats.today, color: 'text-white' },
    { label: 'Pending Verification', value: stats.pending, color: 'text-yellow-400' },
    { label: 'Approved', value: stats.approved, color: 'text-green-400' },
    { label: 'Rejected', value: stats.rejected, color: 'text-red-400' },
    { label: 'Total Revenue', value: `₨${Number(stats.total_revenue || 0).toLocaleString()}`, color: 'text-gold' },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map(c => (
          <div key={c.label} className="luxury-card p-5">
            <p className="text-gray-400 text-xs font-montserrat mb-2">{c.label}</p>
            <p className={`text-2xl font-playfair font-bold ${c.color}`}>{c.value ?? '—'}</p>
          </div>
        ))}
      </div>

      {/* Method breakdown */}
      {methodStats.length > 0 && (
        <div className="luxury-card p-6">
          <h3 className="font-playfair font-bold text-white mb-4">Revenue by Payment Method</h3>
          <div className="space-y-3">
            {methodStats.map(m => (
              <div key={m.payment_method} className="flex items-center gap-3">
                <span className="text-sm text-gray-300 min-w-[120px] capitalize">{m.payment_method.replace('_', ' ')}</span>
                <div className="flex-1 bg-gray-800 rounded-full h-2">
                  <div className="bg-gold rounded-full h-2" style={{ width: `${Math.min(100, (m.count / Math.max(...methodStats.map(x => x.count))) * 100)}%` }} />
                </div>
                <span className="text-sm text-gray-400">{m.count} · ₨{Number(m.total).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent proofs */}
      {recent.length > 0 && (
        <div className="luxury-card p-6">
          <h3 className="font-playfair font-bold text-white mb-4">Recent Proofs</h3>
          <div className="space-y-3">
            {recent.map(p => (
              <div key={p.id} className="flex items-center gap-3">
                <img src={p.screenshot_url} alt="" className="w-10 h-10 object-cover rounded-lg border border-gray-700 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">#{p.order_number} — {p.first_name} {p.last_name}</p>
                  <p className="text-xs text-gray-500">{p.payment_method} · {new Date(p.created_at).toLocaleDateString()}</p>
                </div>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
