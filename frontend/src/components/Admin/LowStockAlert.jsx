import React from 'react';
import { HiExclamation } from 'react-icons/hi';
import { Link } from 'react-router-dom';

export default function LowStockAlert({ items = [] }) {
  if (!items.length) return null;

  return (
    <div className="luxury-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-playfair font-bold flex items-center gap-2">
          <HiExclamation className="w-5 h-5 text-yellow-400" />
          Low Stock Alerts
        </h3>
        <Link to="/admin/inventory" className="text-xs text-gold hover:text-gold-light font-montserrat">
          Manage →
        </Link>
      </div>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
            <div>
              <p className="text-sm text-white font-medium">{item.name}</p>
              <p className="text-xs text-gray-400">{item.size_ml}ml • SKU: {item.sku}</p>
            </div>
            <span className={`text-sm font-bold font-montserrat ${item.quantity === 0 ? 'text-red-400' : 'text-yellow-400'}`}>
              {item.quantity === 0 ? 'Out of Stock' : `${item.quantity} left`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
