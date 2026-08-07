import React from 'react';

export default function SizeSelector({ variants = [], selected, onSelect }) {
  if (!variants.length) return null;

  return (
    <div className="mb-6">
      <h4 className="text-sm uppercase tracking-wider text-theme-muted mb-3 font-montserrat">Choose Size</h4>
      <div className="flex flex-wrap gap-3">
        {variants.map((variant) => (
          <button
            key={variant.id}
            onClick={() => onSelect(variant)}
            className={`size-btn rounded-lg ${
              selected?.id === variant.id ? 'active' : ''
            } ${variant.quantity === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
            disabled={variant.quantity === 0}
          >
            <span className="block text-sm font-medium">{variant.size_ml} ml</span>
            {variant.quantity <= 10 && variant.quantity > 0 && (
              <span className="block text-xs text-danger mt-1">Only {variant.quantity} left</span>
            )}
            {variant.quantity === 0 && (
              <span className="block text-xs text-danger mt-1">Out of stock</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
