import React from 'react';
import { motion } from 'framer-motion';

export default function Card({ children, className = '', hover = true, padding = true, ...props }) {
  return (
    <motion.div
      whileHover={hover ? { y: -4, borderColor: 'rgba(212,175,55,0.3)' } : {}}
      className={`luxury-card ${padding ? 'p-6' : ''} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`border-b border-gold/10 pb-4 mb-6 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '' }) {
  return (
    <h3 className={`text-xl font-playfair font-bold text-theme-text ${className}`}>
      {children}
    </h3>
  );
}
