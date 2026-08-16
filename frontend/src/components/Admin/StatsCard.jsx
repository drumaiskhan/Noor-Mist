import React from 'react';
import { motion } from 'framer-motion';
import { HiTrendingUp, HiTrendingDown } from 'react-icons/hi';

export default function StatsCard({ title, value, icon: Icon, change, color = 'bg-gold/20', index = 0 }) {
  const isPositive = change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="luxury-card p-6"
    >
      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
          {Icon && <Icon className="w-6 h-6 text-white" />}
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-montserrat ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? <HiTrendingUp className="w-3 h-3" /> : <HiTrendingDown className="w-3 h-3" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-gray-400 text-sm font-montserrat mb-1">{title}</p>
        <p className="text-2xl font-bold text-white font-playfair">{value}</p>
      </div>
    </motion.div>
  );
}
