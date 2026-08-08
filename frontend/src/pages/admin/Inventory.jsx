import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryAPI } from '../../services/api';
import { HiExclamation, HiCheckCircle, HiArchive, HiPencil, HiCheck, HiX } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function Inventory() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null); // { productId, variantId } | null
  const [draftQty, setDraftQty] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['inventory'],
    queryFn: inventoryAPI.getOverview,
  });

  // The API groups stock by product, with each product carrying a `variants`
  // array (size/sku/quantity per bottle size) — flatten that into one row
  // per variant so the table below has something to render.
  const products = data?.data?.inventory || [];
  const rows = products.flatMap((product) =>
    (product.variants || []).map((variant) => ({
      productId: product.product_id,
      productName: product.name,
      brand: product.brand,
      ...variant,
    }))
  );

  const totalStock = rows.reduce((sum, row) => sum + (row.quantity || 0), 0);
  const lowStockItems = rows.filter((row) => row.quantity > 0 && row.quantity <= 10);
  const outOfStockItems = rows.filter((row) => row.quantity === 0);

  const updateMutation = useMutation({
    mutationFn: ({ productId, variantId, quantity }) =>
      inventoryAPI.updateStock(productId, variantId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Stock updated');
      setEditing(null);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update stock'),
  });

  const startEdit = (row) => {
    setEditing({ productId: row.productId, variantId: row.id });
    setDraftQty(String(row.quantity));
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraftQty('');
  };

  const saveEdit = () => {
    const quantity = parseInt(draftQty, 10);
    if (Number.isNaN(quantity) || quantity < 0) {
      toast.error('Enter a valid quantity');
      return;
    }
    updateMutation.mutate({ ...editing, quantity });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-playfair font-bold mb-2">Inventory Management</h1>
        <p className="text-gray-400">Track stock levels across all products and variants</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="luxury-card p-6 text-center">
          <HiArchive className="w-8 h-8 text-gold mx-auto mb-2" />
          <p className="text-2xl font-bold">{totalStock}</p>
          <p className="text-gray-400 text-sm">Total Stock</p>
        </div>
        <div className="luxury-card p-6 text-center">
          <HiExclamation className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
          <p className="text-2xl font-bold">{lowStockItems.length}</p>
          <p className="text-gray-400 text-sm">Low Stock</p>
        </div>
        <div className="luxury-card p-6 text-center">
          <HiCheckCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-2xl font-bold">{outOfStockItems.length}</p>
          <p className="text-gray-400 text-sm">Out of Stock</p>
        </div>
      </div>

      <div className="luxury-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left p-4 text-sm text-gray-400 font-montserrat">Product</th>
                <th className="text-left p-4 text-sm text-gray-400 font-montserrat">Size</th>
                <th className="text-left p-4 text-sm text-gray-400 font-montserrat">SKU</th>
                <th className="text-left p-4 text-sm text-gray-400 font-montserrat">Stock</th>
                <th className="text-left p-4 text-sm text-gray-400 font-montserrat">Status</th>
                <th className="text-right p-4 text-sm text-gray-400 font-montserrat">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-400 text-sm">Loading inventory…</td>
                </tr>
              )}
              {isError && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-red-400 text-sm">Failed to load inventory.</td>
                </tr>
              )}
              {!isLoading && !isError && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-400 text-sm">No inventory found.</td>
                </tr>
              )}
              {rows.map((row, index) => {
                const isEditingRow = editing?.productId === row.productId && editing?.variantId === row.id;
                return (
                  <motion.tr
                    key={`${row.productId}-${row.id}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className="border-b border-gray-800/50 hover:bg-gold/5"
                  >
                    <td className="p-4 text-white text-sm">{row.productName}</td>
                    <td className="p-4 text-gray-400 text-sm">{row.size_ml}ml</td>
                    <td className="p-4 text-gray-400 text-sm font-mono">{row.sku}</td>
                    <td className="p-4">
                      {isEditingRow ? (
                        <input
                          type="number"
                          min="0"
                          autoFocus
                          value={draftQty}
                          onChange={(e) => setDraftQty(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit();
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          className="w-20 bg-noir border border-gold/40 rounded px-2 py-1 text-white text-sm focus:border-gold outline-none"
                        />
                      ) : (
                        <span className={`text-sm font-bold ${
                          row.quantity === 0 ? 'text-red-400' :
                          row.quantity <= 10 ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                          {row.quantity}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        row.quantity === 0 ? 'bg-red-500/10 text-red-400' :
                        row.quantity <= 10 ? 'bg-yellow-500/10 text-yellow-400' :
                        'bg-green-500/10 text-green-400'
                      }`}>
                        {row.quantity === 0 ? 'Out of Stock' :
                         row.quantity <= 10 ? 'Low Stock' : 'In Stock'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {isEditingRow ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={saveEdit}
                            disabled={updateMutation.isLoading}
                            className="p-1.5 text-green-400 hover:bg-green-400/10 rounded-lg transition-colors"
                            title="Save"
                          >
                            <HiCheck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1.5 text-gray-400 hover:bg-gray-700/40 rounded-lg transition-colors"
                            title="Cancel"
                          >
                            <HiX className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(row)}
                          className="p-1.5 text-gold/60 hover:text-gold hover:bg-gold/10 rounded-lg transition-colors"
                          title="Update stock"
                        >
                          <HiPencil className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
