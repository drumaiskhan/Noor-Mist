import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { HiX } from 'react-icons/hi';
import { Link } from 'react-router-dom';
import { settingsAPI, couponAPI } from '../../services/api';
import { formatPrice } from '../../utils/helpers';

export default function ShippingBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [currentIndex, setCurrentIndex] = React.useState(0);

  const { data: settings = {} } = useQuery({
    queryKey: ['siteSettings'],
    queryFn: async () => {
      const { data } = await settingsAPI.get();
      return data.settings || {};
    },
    staleTime: 5 * 60 * 1000,
  });

  const freeShippingThreshold = settings.shipping_free_threshold !== undefined
    ? Number(settings.shipping_free_threshold) : (settings.free_shipping_threshold !== undefined ? Number(settings.free_shipping_threshold) : 5000);

  const { data: activeCoupons = [] } = useQuery({
    queryKey: ['activeCoupons'],
    queryFn: async () => (await couponAPI.getActive()).data.coupons ?? [],
    staleTime: 5 * 60 * 1000,
  });

  const messages = [
    { text: `✨ Free shipping on orders over ${formatPrice(freeShippingThreshold)}`, link: '/shop' },
    ...activeCoupons.slice(0, 2).map((coupon) => ({
      text: `🎁 Use code ${coupon.code} for ${coupon.type === 'percentage' ? `${coupon.value}% off` : `${formatPrice(coupon.value)} off`}`,
      link: '/shop',
    })),
  ];

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
