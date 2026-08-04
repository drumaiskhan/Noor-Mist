import React from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass p-3 rounded-xl text-sm">
      <p className="text-gray-400 mb-2 font-montserrat">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value?.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
};

export function SalesLineChart({ data = [], dataKey = 'revenue', label = 'Revenue' }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
        <XAxis dataKey="name" stroke="#4B5563" tick={{ fontSize: 11 }} />
        <YAxis stroke="#4B5563" tick={{ fontSize: 11 }} />
        <Tooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey={dataKey} stroke="#D4AF37" strokeWidth={2} dot={{ fill: '#D4AF37', r: 3 }} activeDot={{ r: 5 }} name={label} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SalesBarChart({ data = [], dataKey = 'orders', label = 'Orders' }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
        <XAxis dataKey="name" stroke="#4B5563" tick={{ fontSize: 11 }} />
        <YAxis stroke="#4B5563" tick={{ fontSize: 11 }} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey={dataKey} fill="#D4AF37" radius={[4, 4, 0, 0]} name={label} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default SalesLineChart;
