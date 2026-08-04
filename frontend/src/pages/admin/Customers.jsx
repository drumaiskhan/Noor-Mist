import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userAPI } from '../../services/api';
import { HiSearch, HiTrash } from 'react-icons/hi';
import { formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function Customers() {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['adminCustomers', search],
    queryFn: () => userAPI.getAll({ search }),
  });

  const customers = data?.data?.users || [];

  const deleteMutation = useMutation({
    mutationFn: (id) => userAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminCustomers']);
      toast.success('Customer deleted');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to delete customer'),
  });

  const handleDelete = (id, name) => {
    if (!window.confirm(`Delete customer "${name}"? This cannot be undone.`)) return;
    deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-playfair font-bold mb-1">Customers</h1>
        <p className="text-gray-400 text-sm">{customers.length} customers</p>
      </div>

      <div className="relative">
        <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers..."
          className="w-full bg-noir border border-gray-700 rounded-lg pl-12 pr-4 py-3 text-white text-sm focus:border-gold outline-none max-w-md"
        />
      </div>

      <div className="luxury-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left p-4 text-xs text-gray-400 font-montserrat uppercase">Customer</th>
                <th className="text-left p-4 text-xs text-gray-400 font-montserrat uppercase hidden md:table-cell">Email</th>
                <th className="text-left p-4 text-xs text-gray-400 font-montserrat uppercase hidden lg:table-cell">Phone</th>
                <th className="text-left p-4 text-xs text-gray-400 font-montserrat uppercase hidden lg:table-cell">Joined</th>
                <th className="text-left p-4 text-xs text-gray-400 font-montserrat uppercase">Role</th>
                <th className="text-right p-4 text-xs text-gray-400 font-montserrat uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-gray-800/50">
                    <td className="p-4"><div className="skeleton h-5 w-32 rounded" /></td>
                    <td className="p-4 hidden md:table-cell"><div className="skeleton h-5 w-40 rounded" /></td>
                    <td className="p-4 hidden lg:table-cell"><div className="skeleton h-5 w-24 rounded" /></td>
                    <td className="p-4 hidden lg:table-cell"><div className="skeleton h-5 w-24 rounded" /></td>
                    <td className="p-4"><div className="skeleton h-5 w-16 rounded" /></td>
                    <td className="p-4"><div className="skeleton h-5 w-8 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : (
                customers.map((customer, index) => (
                  <motion.tr
                    key={customer.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className="border-b border-gray-800/50 hover:bg-gold/5"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center">
                          <span className="text-gold text-sm font-bold">
                            {customer.first_name?.charAt(0)}{customer.last_name?.charAt(0)}
                          </span>
                        </div>
                        <span className="text-white text-sm">
                          {customer.first_name} {customer.last_name}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <span className="text-gray-400 text-sm">{customer.email}</span>
                    </td>
                    <td className="p-4 hidden lg:table-cell">
                      <span className="text-gray-400 text-sm">{customer.phone || '—'}</span>
                    </td>
                    <td className="p-4 hidden lg:table-cell">
                      <span className="text-gray-400 text-sm">{formatDate(customer.created_at)}</span>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        customer.role === 'admin'
                          ? 'bg-gold/10 text-gold'
                          : 'bg-gray-500/10 text-gray-400'
                      }`}>
                        {customer.role}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {customer.role !== 'admin' && (
                        <button
                          onClick={() => handleDelete(customer.id, `${customer.first_name} ${customer.last_name}`)}
                          disabled={deleteMutation.isLoading}
                          className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                          title="Delete customer"
                        >
                          <HiTrash className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
