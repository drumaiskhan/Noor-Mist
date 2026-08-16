import React from 'react';
import { SalesLineChart, SalesBarChart } from './SalesChart';

export default function ChartWidget({ title, type = 'line', data = [], dataKey, label, className = '' }) {
  const formatted = data.map((d) => ({
    ...d,
    name: d.name || (d.date ? new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : d.period || ''),
  }));

  return (
    <div className={`luxury-card p-6 ${className}`}>
      <h3 className="text-lg font-playfair font-bold mb-6">{title}</h3>
      {type === 'bar' ? (
        <SalesBarChart data={formatted} dataKey={dataKey} label={label} />
      ) : (
        <SalesLineChart data={formatted} dataKey={dataKey} label={label} />
      )}
    </div>
  );
}
