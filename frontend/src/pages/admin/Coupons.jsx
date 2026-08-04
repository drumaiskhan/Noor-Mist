import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { couponAPI } from '../../services/api';
import { HiPlus, HiTrash } from 'react-icons/hi';
import { formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function Coupons() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: '', description: '', discount_type: 'percentage',
    discount_value: '', min_purchase: '', max_discount: '',
    usage_limit: '', starts_at: '', expires_at: '',
  });

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['adminCoupons'],
    queryFn: async () => {
      const { data } = await couponAPI.getAll();
      return data.coupons ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: couponAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['adminCoupons']);
      toast.success('Coupon created');
      setShowForm(false);
      setForm({ code: '', description: '', discount_type: 'percentage', discount_value: '', min_purchase: '', max_discount: '', usage_limit: '', starts_at: '', expires_at: '' });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create coupon'),
  });

  const deleteMutation = useMutation({
    mutationFn: couponAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['adminCoupons']);
      toast.success('Coupon deleted');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.code.trim() || !form.discount_value) return toast.error('Code and discount value are required');
    saveMutation.mutate({
      ...form,
      discount_value: parseFloat(form.discount_value),
      min_purchase: form.min_purchase ? parseFloat(form.min_purchase) : 0,
      max_discount: form.max_discount ? parseFloat(form.max_discount) : null,
      usage_limit: form.usage_limit ? parseInt(form.usage_limit) : null,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-playfair font-bold mb-1">Coupons</h1>
          <p className="text-gray-400 text-sm">{coupons.length} coupons</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-gold flex items-center gap-2 text-sm">
          <HiPlus className="w-4 h-4" /> Add Coupon
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowForm(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-noir-light border border-gold/10 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-playfair font-bold mb-6">Add Coupon</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Code *</label>
                  <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required className="w-full bg-noir border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-gold outline-none" placeholder="SUMMER20" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Type</label>
                  <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })} className="w-full bg-noir border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-gold outline-none">
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Discount Value *</label>
                <input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} required className="w-full bg-noir border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-gold outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Min Purchase</label>
                  <input type="number" value={form.min_purchase} onChange={(e) => setForm({ ...form, min_purchase: e.target.value })} className="w-full bg-noir border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-gold outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Max Discount</label>
                  <input type="number" value={form.max_discount} onChange={(e) => setForm({ ...form, max_discount: e.target.value })} className="w-full bg-noir border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-gold outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Usage Limit</label>
                <input type="number" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} className="w-full bg-noir border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-gold outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Description</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-noir border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-gold outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Start Date</label>
                  <input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className="w-full bg-noir border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-gold outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Expiry Date</label>
                  <input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className="w-full bg-noir border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-gold outline-none" />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn-gold flex-1 text-sm" disabled={saveMutation.isLoading}>
                  {saveMutation.isLoading ? 'Creating...' : 'Create Coupon'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-outline-gold flex-1 text-sm">Cancel</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Coupons List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {coupons.map((coupon) => (
          <motion.div key={coupon.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="luxury-card p-5">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-gold font-mono text-lg font-bold">{coupon.code}</h3>
              <button onClick={() => deleteMutation.mutate(coupon.id)} className="text-gray-400 hover:text-red-400">
                <HiTrash className="w-4 h-4" />
              </button>
            </div>
            <p className="text-white font-bold mb-1">
              {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% OFF` : `₨${coupon.discount_value} OFF`}
            </p>
            {coupon.description && <p className="text-gray-400 text-sm mb-3">{coupon.description}</p>}
            <div className="text-xs text-gray-500 space-y-1">
              <p>Used: {coupon.used_count || 0}/{coupon.usage_limit || '∞'}</p>
              {coupon.expires_at && <p>Expires: {formatDate(coupon.expires_at)}</p>}
            </div>
            <span className={`inline-block mt-2 text-xs px-2 py-1 rounded-full ${coupon.is_active ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'}`}>
              {coupon.is_active ? 'Active' : 'Inactive'}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
