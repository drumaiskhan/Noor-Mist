import React from 'react';
import { motion } from 'framer-motion';

const variants = {
  gold: 'btn-gold',
  outline: 'btn-outline-gold',
  ghost: 'bg-transparent border border-theme-border text-theme-muted hover:border-theme-primary hover:text-theme-primary',
  danger: 'bg-danger/10 border border-danger/30 text-danger hover:bg-danger/20',
};

const sizes = {
  sm: 'px-4 py-2 text-xs',
  md: 'px-6 py-3 text-sm',
  lg: 'px-8 py-4 text-sm',
  xl: 'px-10 py-5 text-base',
};

export default function Button({
  children,
  variant = 'gold',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  type = 'button',
  onClick,
  as: Component = 'button',
  ...props
}) {
  const baseClasses = 'inline-flex items-center justify-center gap-2 font-montserrat font-semibold tracking-wider uppercase rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gold/50';

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={!disabled && !loading ? { scale: 1.02 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      className={`${baseClasses} ${variants[variant] || variants.gold} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Loading...
        </>
      ) : children}
    </motion.button>
  );
}
