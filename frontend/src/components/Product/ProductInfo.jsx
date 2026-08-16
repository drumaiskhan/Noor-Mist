import React from 'react';
import { CONCENTRATIONS, LONGEVITY_OPTIONS, PROJECTION_OPTIONS } from '../../utils/constants';

export default function ProductInfo({ product }) {
  const details = [
    { label: 'Brand', value: product.brand },
    { label: 'Gender', value: product.gender },
    { label: 'Fragrance Family', value: product.fragrance_family },
    { label: 'Concentration', value: CONCENTRATIONS.find(c => c.value === product.concentration)?.label },
    { label: 'Longevity', value: LONGEVITY_OPTIONS.find(l => l.value === product.longevity)?.label },
    { label: 'Projection', value: PROJECTION_OPTIONS.find(p => p.value === product.projection)?.label },
    { label: 'Season', value: product.season?.map(s => s.replace('_',' ')).join(', ') },
    { label: 'Occasion', value: product.occasion?.map(o => o.replace('_',' ')).join(', ') },
  ].filter(d => d.value);

  return (
    <div className="space-y-3">
      {details.map(({ label, value }) => (
        <div key={label} className="flex justify-between items-center py-2 border-b border-theme-border/50">
          <span className="text-sm text-theme-muted font-montserrat">{label}</span>
          <span className="text-sm text-theme-text capitalize">{value}</span>
        </div>
      ))}
    </div>
  );
}
