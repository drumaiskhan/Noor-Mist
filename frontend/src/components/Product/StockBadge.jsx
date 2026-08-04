import React from 'react';
import { getStockStatus } from '../../utils/helpers';

export default function StockBadge({ quantity }) {
  const { label, class: cls } = getStockStatus(quantity);
  const dotColor =
    quantity === 0 ? 'bg-danger' :
    quantity <= 10 ? 'bg-danger' :
    quantity <= 20 ? 'bg-warning' :
    'bg-success';

  return (
    <div className={`flex items-center gap-1.5 ${cls}`}>
      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
      <span className="text-xs font-montserrat">{label}</span>
    </div>
  );
}
