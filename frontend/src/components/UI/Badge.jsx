import React from 'react';

const variants = {
  new: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  bestseller: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  limited: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  gift: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  sale: 'bg-sale/10 text-sale border-sale/30',
  default: 'bg-theme-muted/10 text-theme-muted border-theme-muted/30',
};

export default function Badge({ children, variant = 'default', className = '' }) {
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-montserrat uppercase tracking-wider border ${
        variants[variant] || variants.default
      } ${className}`}
    >
      {children}
    </span>
  );
}
