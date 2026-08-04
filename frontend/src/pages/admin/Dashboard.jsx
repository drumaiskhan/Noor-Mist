import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { analyticsAPI } from '../../services/api';
import { HiCurrencyDollar, HiShoppingBag, HiUsers, HiCube } from 'react-icons/hi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatPrice, formatDate } from '../../utils/helpers';

const statusColors = {
  pending: 'text-yellow-400 bg-yellow-500/10',
  confirmed: 'text-blue-400 bg-blue-500/10',
  processing: 'text-purple-400 bg-purple-500/10',
  shipped: 'text-orange-400 bg-orange-500/10',
  delivered: 'text-green-400 bg-green-500/10',
  cancelled: 'text-red-400 bg-red-500/10',
};

const StatCard = ({ title, value, icon: Icon, change, color, to }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
    <Link
      to={to}
      className="luxury-card p-6 block group hover:border-gold/40 transition-colors"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color} group-hover:scale-105 transition-transform`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {change != null && (
          <span className={`text-sm font-montserrat ${change > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {change > 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>
      <p className="text-gray-400 text-sm mb-1 group-hover:text-gray-300 transition-colors">{title}</p>
      <p className="text-2xl font-bold text-white group-hover:text-gold transition-colors">{value}</p>
    </Link>
  </motion.div>
);

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: async () => {
      const { data } = await analyticsAPI.getDashboard();
      return data;
    },
  });

  // Build chart-ready sales data from the real API response
  const salesChartData = useMemo(() => {
    const rows = data?.salesData || [];
    return rows.map((r) => ({
      name: new Date(r.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      sales: parseFloat(r.revenue) || 0,
      orders: parseInt(r.orders) || 0,
    }));
  }, [data]);

  const recentOrders = data?.recentOrders || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-playfair font-bold mb-2">Dashboard</h1>
        <p className="text-gray-400">Welcome back to Noor Mist Admin</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" value={data?.revenue ?? '₨0'} icon={HiCurrencyDollar} color="bg-green-500/20" to="/admin/analytics" />
        <StatCard title="Orders" value={data?.orders ?? 0} icon={HiShoppingBag} color="bg-blue-500/20" to="/admin/orders" />
        <StatCard title="Customers" value={data?.customers ?? 0} icon={HiUsers} color="bg-purple-500/20" to="/admin/customers" />
        <StatCard title="Products" value={data?.products ?? 0} icon={HiCube} color="bg-gold/20" to="/admin/products" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="luxury-card p-6">
          <h3 className="text-lg font-playfair font-bold mb-1">Sales Overview</h3>
          <p className="text-xs text-gray-500 mb-6">Last 7 days</p>
          {isLoading ? (
            <div className="h-[300px] flex items-center justify-center text-gray-500 text-sm">Loading…</div>
          ) : salesChartData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-gray-500 text-sm">No sales data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                <XAxis dataKey="name" stroke="#6B7280" tick={{ fontSize: 11 }} />
                <YAxis stroke="#6B7280" tick={{ fontSize: 11 }} tickFormatter={(v) => `₨${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: '#1A1A1A', border: '1px solid #D4AF37', borderRadius: '8px' }}
                  formatter={(value) => [formatPrice(value), 'Revenue']}
                />
                <Line type="monotone" dataKey="sales" stroke="#D4AF37" strokeWidth={2} dot={{ fill: '#D4AF37', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="luxury-card p-6">
          <h3 className="text-lg font-playfair font-bold mb-6">Recent Orders</h3>
          <div className="space-y-3">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0">
                  <div className="skeleton h-4 w-32 rounded" />
                  <div className="skeleton h-5 w-20 rounded" />
                </div>
              ))
            ) : recentOrders.length === 0 ? (
              <p className="text-gray-500 text-sm py-8 text-center">No orders yet</p>
            ) : (
              recentOrders.map((order) => (
                <Link
                  key={order.id}
                  to="/admin/orders"
                  className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0 hover:opacity-80 transition-opacity"
                >
                  <div>
                    <p className="text-white text-sm font-medium">
                      {order.first_name ? `${order.first_name} ${order.last_name}` : 'Guest'}
                    </p>
                    <p className="text-gray-400 text-xs">{formatDate(order.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gold text-sm font-semibold">{formatPrice(order.total_amount)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusColors[order.status] || 'text-gray-400 bg-gray-700/30'}`}>
                      {order.status}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
