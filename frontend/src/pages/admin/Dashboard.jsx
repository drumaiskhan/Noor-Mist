import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { analyticsAPI } from '../../services/api';
import { HiCurrencyDollar, HiShoppingBag, HiUsers, HiCube, HiTrendingUp } from 'react-icons/hi';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
        {change && (
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

  const stats = data || {
    revenue: '₨0',
    orders: 0,
    customers: 0,
    products: 0,
    conversionRate: '0%',
  };

  const salesData = [
    { name: 'Mon', sales: 4000 }, { name: 'Tue', sales: 3000 },
    { name: 'Wed', sales: 5000 }, { name: 'Thu', sales: 4500 },
    { name: 'Fri', sales: 6000 }, { name: 'Sat', sales: 7000 },
    { name: 'Sun', sales: 5500 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-playfair font-bold mb-2">Dashboard</h1>
        <p className="text-gray-400">Welcome back to Noor Mist Admin</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" value={stats.revenue} icon={HiCurrencyDollar} change={12} color="bg-green-500/20" to="/admin/analytics" />
        <StatCard title="Orders" value={stats.orders} icon={HiShoppingBag} change={8} color="bg-blue-500/20" to="/admin/orders" />
        <StatCard title="Customers" value={stats.customers} icon={HiUsers} change={15} color="bg-purple-500/20" to="/admin/customers" />
        <StatCard title="Products" value={stats.products} icon={HiCube} color="bg-gold/20" to="/admin/products" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="luxury-card p-6">
          <h3 className="text-lg font-playfair font-bold mb-6">Sales Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
              <XAxis dataKey="name" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid #D4AF37' }} />
              <Line type="monotone" dataKey="sales" stroke="#D4AF37" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="luxury-card p-6">
          <h3 className="text-lg font-playfair font-bold mb-6">Recent Orders</h3>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0">
                <div>
                  <p className="text-white text-sm font-medium">Order #NM-{1000 + i}</p>
                  <p className="text-gray-400 text-xs">2 items • ₨{(Math.random() * 10000 + 3000).toFixed(0)}</p>
                </div>
                <span className="text-xs px-3 py-1 rounded-full bg-green-500/10 text-green-400">Completed</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
