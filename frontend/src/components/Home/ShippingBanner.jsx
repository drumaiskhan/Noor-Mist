import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiX } from 'react-icons/hi';
import { Link } from 'react-router-dom';

const messages = [
  { text: '✨ Free shipping on orders over ₨5,000', link: '/shop' },
  { text: '🎁 Use code WELCOME10 for 10% off your first order', link: '/shop' },
  { text: '💎 New arrivals — Discover our latest luxury fragrances', link: '/shop?new_arrival=true' },
];

export default function ShippingBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [currentIndex, setCurrentIndex] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % messages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  if (dismissed) return null;

  const current = messages[currentIndex];

  return (
    <div className="bg-announcement text-xs font-montserrat font-medium relative">
      {/* Animated message — pointer-events-none so it never blocks the close button */}
      <div className="flex items-center justify-center px-10 py-2.5 pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-1.5 pointer-events-auto"
          >
            <Link to={current.link} className="hover:underline tracking-wide">
              {current.text}
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Close button — fixed so it is above the fixed Header (z-40) */}
      <button
        onClick={() => setDismissed(true)}
        className="hover:opacity-60 transition-opacity"
        aria-label="Dismiss"
        style={{ position: 'fixed', top: '9px', right: '12px', zIndex: 100 }}
      >
        <HiX className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
