import React from 'react';
import { getStockStatus } from '../../utils/helpers';

export default function InventoryCard({ item, onUpdate }) {
  return (
    <div className="luxury-card p-5">
      <div className="flex items-start gap-4 mb-4">
        <img
          src={item.image || '/images/placeholder-perfume.jpg'}
          alt={item.name}
          className="w-14 h-14 rounded-xl object-cover"
        />
        <div className="flex-1 min-w-0">
          <h4 className="font-playfair font-bold text-white text-sm truncate">{item.name}</h4>
          <p className="text-xs text-gray-400">{item.brand}</p>
        </div>
      </div>
      <div className="space-y-2">
        {(item.variants || []).map((v) => {
          const { label, class: cls } = getStockStatus(v.quantity);
          return (
            <div key={v.id} className="flex items-center justify-between text-xs">
              <span className="text-gray-400">{v.size_ml}ml</span>
              <span className={cls + ' font-montserrat'}>{label}</span>
              {onUpdate && (
                <button
                  onClick={() => onUpdate(item.product_id, v.id, v.quantity)}
                  className="text-gold/60 hover:text-gold transition-colors underline"
                >
                  Update
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
