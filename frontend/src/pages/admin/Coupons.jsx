import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { couponAPI } from '../../services/api';
import { HiPlus, HiTrash, HiPencil, HiRefresh } from 'react-icons/hi';
import { formatDateTime, formatPrice } from '../../utils/helpers';
import toast from 'react-hot-toast';

const EMPTY = () => ({
  code: '', description: '', discount_type: 'percentage', discount_value: '',
  min_purchase: '', max_discount: '', usage_limit: '', starts_at: '', expires_at: '', is_active: true,
});

function toLocalDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function Coupons() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY());

  const { data: coupons = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['adminCoupons'],
    queryFn: async () => (await couponAPI.getAll()).data.coupons ?? [],
  });

  const saveMutation = useMutation({
    mutationFn: (payload) => editing ? couponAPI.update(editing.id, payload) : couponAPI.create(payload),
    onSuccess: async (response) => {
      const saved = response?.data?.coupon;
      if (saved) queryClient.setQueryData(['adminCoupons'], (old = []) => old.some(c => c.id === saved.id) ? old.map(c => c.id === saved.id ? saved : c) : [saved, ...old]);
      await queryClient.invalidateQueries({ queryKey: ['adminCoupons'] });
      setShowForm(false); setEditing(null); setForm(EMPTY());
      toast.success(editing ? 'Coupon updated' : 'Coupon created');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save coupon'),
  });

  const deleteMutation = useMutation({
    mutationFn: couponAPI.delete,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['adminCoupons'] }); toast.success('Coupon deleted'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to delete coupon'),
  });

  const openCreate = () => { setEditing(null); setForm(EMPTY()); setShowForm(true); };
  const openEdit = (c) => {
    setEditing(c);
    setForm({
      code: c.code || '', description: c.description || '', discount_type: c.type || 'percentage',
      discount_value: c.value ?? '', min_purchase: c.minimum_order ?? '', max_discount: c.max_discount ?? '',
      usage_limit: c.max_uses ?? '', starts_at: toLocalDateTime(c.starts_at), expires_at: toLocalDateTime(c.expires_at),
      is_active: c.is_active !== false,
    });
    setShowForm(true);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.code.trim() || form.discount_value === '') return toast.error('Code and discount value are required');
    const payload = editing ? {
      code: form.code.trim().toUpperCase(), type: form.discount_type, value: Number(form.discount_value),
      minimum_order: form.min_purchase === '' ? 0 : Number(form.min_purchase),
      max_discount: form.max_discount === '' ? null : Number(form.max_discount),
      max_uses: form.usage_limit === '' ? null : Number(form.usage_limit), description: form.description || null,
      starts_at: form.starts_at || null, expires_at: form.expires_at || null, is_active: form.is_active !== false,
    } : { ...form, code: form.code.trim().toUpperCase(), discount_value: Number(form.discount_value),
      min_purchase: form.min_purchase === '' ? 0 : Number(form.min_purchase), max_discount: form.max_discount === '' ? null : Number(form.max_discount),
      usage_limit: form.usage_limit === '' ? null : Number(form.usage_limit), starts_at: form.starts_at || null, expires_at: form.expires_at || null };
    saveMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-playfair font-bold mb-1">Coupons</h1><p className="text-gray-400 text-sm">{coupons.length} coupons</p></div>
        <div className="flex gap-2">
          <button onClick={async () => { try { await refetch({ throwOnError: true }); toast.success('Coupons refreshed'); } catch (err) { toast.error(err.response?.data?.error || 'Failed to refresh coupons'); } }} disabled={isFetching} className="btn-outline-gold flex items-center gap-2 text-sm disabled:opacity-50"><HiRefresh className={isFetching ? 'animate-spin' : ''} /> {isFetching ? 'Refreshing…' : 'Refresh'}</button>
          <button onClick={openCreate} className="btn-gold flex items-center gap-2 text-sm"><HiPlus /> Add Coupon</button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowForm(false)} />
          <motion.div initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-noir-light border border-gold/10 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-playfair font-bold">{editing ? 'Edit Coupon' : 'Add Coupon'}</h2><button onClick={() => setShowForm(false)} className="text-gray-400">×</button></div>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Code *"><input value={form.code} onChange={e => setForm({...form, code:e.target.value.toUpperCase()})} required placeholder="SUMMER20" className="input" /></Field>
                <Field label="Type"><select value={form.discount_type} onChange={e => setForm({...form, discount_type:e.target.value})} className="input"><option value="percentage">Percentage</option><option value="fixed">Fixed Amount</option></select></Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Discount *"><input type="number" min="0" step="0.01" value={form.discount_value} onChange={e => setForm({...form, discount_value:e.target.value})} required className="input" /></Field>
                <Field label="Minimum order"><input type="number" min="0" step="0.01" value={form.min_purchase} onChange={e => setForm({...form, min_purchase:e.target.value})} className="input" /></Field>
                <Field label="Max discount"><input type="number" min="0" step="0.01" value={form.max_discount} onChange={e => setForm({...form, max_discount:e.target.value})} className="input" /></Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Usage limit"><input type="number" min="1" value={form.usage_limit} onChange={e => setForm({...form, usage_limit:e.target.value})} placeholder="Unlimited" className="input" /></Field>
                <Field label="Starts"><input type="datetime-local" value={form.starts_at} onChange={e => setForm({...form, starts_at:e.target.value})} className="input" /></Field>
                <Field label="Expires"><input type="datetime-local" value={form.expires_at} onChange={e => setForm({...form, expires_at:e.target.value})} className="input" /></Field>
              </div>
              <Field label="Description"><input value={form.description} onChange={e => setForm({...form, description:e.target.value})} placeholder="Optional customer-facing description" className="input" /></Field>
              {editing && <label className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active:e.target.checked})} /> Active</label>}
              <div className="flex gap-3 pt-2"><button type="submit" disabled={saveMutation.isPending} className="btn-gold flex-1">{saveMutation.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Create Coupon'}</button><button type="button" onClick={() => setShowForm(false)} className="btn-outline-gold flex-1">Cancel</button></div>
            </form>
          </motion.div>
        </div>
      )}

      {isLoading ? <p className="text-gray-500">Loading coupons…</p> : coupons.length === 0 ? <div className="luxury-card p-10 text-center text-gray-500">No coupons yet. Create one above.</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map(c => {
            const usable = c.is_active && (!c.starts_at || new Date(c.starts_at) <= new Date()) && (!c.expires_at || new Date(c.expires_at) > new Date()) && (c.max_uses == null || Number(c.used_count) < Number(c.max_uses));
            return <motion.div key={c.id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="luxury-card p-5">
              <div className="flex items-start justify-between"><div><h3 className="text-gold font-mono text-lg font-bold">{c.code}</h3><p className="text-white font-bold mt-1">{c.type === 'percentage' ? `${c.value}% OFF` : formatPrice(c.value) + ' OFF'}</p></div><div className="flex gap-1"><button onClick={() => openEdit(c)} className="p-2 text-gray-400 hover:text-gold"><HiPencil /></button><button onClick={() => window.confirm(`Delete ${c.code}?`) && deleteMutation.mutate(c.id)} className="p-2 text-gray-400 hover:text-red-400"><HiTrash /></button></div></div>
              {c.description && <p className="text-gray-400 text-sm mt-3">{c.description}</p>}
              <div className="text-xs text-gray-500 space-y-1 mt-3"><p>Used: {c.used_count || 0}/{c.max_uses ?? '∞'}</p>{Number(c.minimum_order) > 0 && <p>Minimum: {formatPrice(c.minimum_order)}</p>}{c.max_discount != null && <p>Max discount: {formatPrice(c.max_discount)}</p>}{c.starts_at && <p>Starts: {formatDateTime(c.starts_at)}</p>}{c.expires_at && <p>Expires: {formatDateTime(c.expires_at)}</p>}</div>
              <span className={`inline-block mt-3 text-xs px-2 py-1 rounded-full ${usable ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'}`}>{usable ? 'Active' : c.is_active ? 'Not currently usable' : 'Inactive'}</span>
            </motion.div>;
          })}
        </div>
      )}
      <style>{`.input{width:100%;background:#0b0b0c;border:1px solid #333;border-radius:8px;padding:10px 12px;color:#fff;outline:none}.input:focus{border-color:#D4AF37}`}</style>
    </div>
  );
}
function Field({ label, children }) { return <div><label className="text-xs text-gray-400 mb-1 block">{label}</label>{children}</div>; }
