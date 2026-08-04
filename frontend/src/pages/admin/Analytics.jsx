import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { analyticsAPI } from '../../services/api';
import { HiCurrencyDollar, HiShoppingBag, HiUsers, HiTrendingUp } from 'react-icons/hi';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { formatPrice } from '../../utils/helpers';

const COLORS = ['#D4AF37', '#B8960C', '#8B6914', '#FFD700', '#F5E6CC'];

export default function Analytics() {
  const [period, setPeriod] = useState('week');

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', period],
    queryFn: async () => {
      const { data } = await analyticsAPI.getSales({ period });
      return data;
    },
  });

  // Backend now returns { salesData, stats, topProducts, period }
  const stats = data?.stats || { revenue: 0, orders: 0, customers: 0, conversionRate: 0 };
  const salesData = (data?.salesData || []).map((r) => ({
    ...r,
    date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));
  const topProducts = data?.topProducts || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-playfair font-bold mb-1">Analytics</h1>
        <p className="text-gray-400 text-sm">Track your store's performance</p>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
        {['week', 'month', 'year'].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg text-sm font-montserrat capitalize transition-all ${
              period === p ? 'bg-gold/10 text-gold border border-gold/30' : 'text-gray-400 border border-gray-700'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Revenue', value: formatPrice(stats.revenue), icon: HiCurrencyDollar, color: 'bg-green-500/20' },
          { title: 'Orders', value: stats.orders, icon: HiShoppingBag, color: 'bg-blue-500/20' },
          { title: 'Customers', value: stats.customers, icon: HiUsers, color: 'bg-purple-500/20' },
          { title: 'Conversion', value: `${stats.conversionRate}%`, icon: HiTrendingUp, color: 'bg-gold/20' },
        ].map((stat) => (
          <div key={stat.title} className="luxury-card p-5">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color} mb-3`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-gray-400 text-xs mb-1">{stat.title}</p>
            <p className="text-xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Sales Chart */}
      <div className="luxury-card p-6">
        <h3 className="text-lg font-playfair font-bold mb-6">Sales Overview</h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={salesData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
            <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
            <YAxis stroke="#6B7280" fontSize={12} />
            <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid #D4AF37', borderRadius: '8px' }} />
            <Line type="monotone" dataKey="revenue" stroke="#D4AF37" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top Products */}
      <div className="luxury-card p-6">
        <h3 className="text-lg font-playfair font-bold mb-6">Top Products</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left p-3 text-xs text-gray-400 font-montserrat">Product</th>
                <th className="text-left p-3 text-xs text-gray-400 font-montserrat">Sales</th>
                <th className="text-left p-3 text-xs text-gray-400 font-montserrat">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((product, i) => (
                <tr key={i} className="border-b border-gray-800/50">
                  <td className="p-3 text-white text-sm">{product.name}</td>
                  <td className="p-3 text-gray-400 text-sm">{product.sold ?? product.total_sold ?? 0}</td>
                  <td className="p-3 text-gold text-sm font-medium">{formatPrice(product.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
