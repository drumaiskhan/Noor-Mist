import React from 'react';
import { HiStar } from 'react-icons/hi';

const sizes = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

export default function Rating({ value = 0, max = 5, size = 'md', showValue = false }) {
  const stars = [];
  
  for (let i = 1; i <= max; i++) {
    if (i <= Math.floor(value)) {
      stars.push('full');
    } else if (i - 0.5 <= value) {
      stars.push('half');
    } else {
      stars.push('empty');
    }
  }

  return (
    <div className="flex items-center gap-1">
      {stars.map((type, index) => (
        <HiStar
          key={index}
          className={`${sizes[size]} ${
            type === 'full'
              ? 'text-gold fill-current'
              : type === 'half'
              ? 'text-gold fill-current opacity-50'
              : 'text-theme-muted'
          }`}
        />
      ))}
      {showValue && (
        <span className="text-sm text-theme-muted ml-1">{value.toFixed(1)}</span>
      )}
    </div>
  );
}
