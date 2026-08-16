import React from 'react';

export default function Skeleton({ className = '', variant = 'text' }) {
  const baseClass = 'skeleton animate-pulse';
  
  const variants = {
    text: 'h-4 w-full rounded',
    title: 'h-6 w-3/4 rounded',
    circle: 'rounded-full',
    card: 'aspect-square rounded-xl',
    button: 'h-12 w-32 rounded-lg',
  };

  return (
    <div className={`${baseClass} ${variants[variant] || variants.text} ${className}`} />
  );
}
