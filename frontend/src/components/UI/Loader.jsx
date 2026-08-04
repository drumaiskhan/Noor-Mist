import React from 'react';
import { motion } from 'framer-motion';

export default function Loader({ fullScreen = true, size = 'md' }) {
  const sizes = { sm: 'w-6 h-6', md: 'w-10 h-10', lg: 'w-16 h-16' };

  const spinner = (
    <div className="flex flex-col items-center gap-4">
      <motion.div
        className={`${sizes[size]} rounded-full border-2 border-gold/20 border-t-gold`}
        animate={{ rotate: 360 }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      />
      {size !== 'sm' && (
        <p className="text-gold/60 text-sm font-montserrat tracking-widest uppercase animate-pulse">
          Noor Mist
        </p>
      )}
    </div>
  );

  if (!fullScreen) return spinner;

  return (
    <div className="fixed inset-0 bg-noir flex items-center justify-center z-50">
      {spinner}
    </div>
  );
}
