import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { inventoryAPI } from '../../services/api';
import { HiExclamation, HiCheckCircle, HiArchive } from 'react-icons/hi';
import { formatPrice } from '../../utils/helpers';

export default function Inventory() {
  const { data, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: inventoryAPI.getOverview,
  });

  const items = data?.data?.items || [];

  const totalStock = items.reduce((sum, item) => sum + (item.total_quantity || 0), 0);
  const lowStockItems = items.filter((item) => item.total_quantity <= 10 && item.total_quantity > 0);
  const outOfStockItems = items.filter((item) => item.total_quantity === 0);

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
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <motion.tr
                  key={item.id || index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-gray-800/50 hover:bg-gold/5"
                >
                  <td className="p-4 text-white text-sm">{item.product_name}</td>
                  <td className="p-4 text-gray-400 text-sm">{item.size_ml}ml</td>
                  <td className="p-4 text-gray-400 text-sm font-mono">{item.sku}</td>
                  <td className="p-4">
                    <span className={`text-sm font-bold ${
                      item.quantity === 0 ? 'text-red-400' :
                      item.quantity <= 10 ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {item.quantity}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      item.quantity === 0 ? 'bg-red-500/10 text-red-400' :
                      item.quantity <= 10 ? 'bg-yellow-500/10 text-yellow-400' :
                      'bg-green-500/10 text-green-400'
                    }`}>
                      {item.quantity === 0 ? 'Out of Stock' :
                       item.quantity <= 10 ? 'Low Stock' : 'In Stock'}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
