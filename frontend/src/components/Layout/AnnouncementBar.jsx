import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { HiX } from 'react-icons/hi';
import { settingsAPI } from '../../services/api';

// Default rotating messages shown when no admin announcement is configured.
// Once the admin enables an announcement in Settings → Announcement Bar,
// those take over and these defaults are hidden.
const DEFAULT_MESSAGES = [
  { text: '✨ Free shipping on orders over ₨5,000', link: '/shop' },
  { text: '🎁 Use code WELCOME10 for 10% off your first order', link: '/shop' },
  { text: '💎 New arrivals — Discover our latest luxury fragrances', link: '/shop?new_arrival=true' },
];

// Renders the announcement bar that sits above the header.
// Color is fully theme-driven via --announcement-bg / --announcement-text,
// both set by themeStore from admin Theme Editor settings.
// Text is admin-controlled from Settings → Announcement Bar.
export default function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: settings = {} } = useQuery({
    queryKey: ['siteSettings'],
    queryFn: async () => {
      const { data } = await settingsAPI.get();
      return data.settings || {};
    },
    staleTime: 5 * 60 * 1000,
  });

  // Rotate default messages only when no admin announcement is active
  const useDefaults = !settings.announcement_enabled || !settings.announcement_text;
  React.useEffect(() => {
    if (!useDefaults) return;
    const id = setInterval(() => setCurrentIndex((i) => (i + 1) % DEFAULT_MESSAGES.length), 4000);
    return () => clearInterval(id);
  }, [useDefaults]);

  if (dismissed) return null;

  // Admin-controlled single message
  if (!useDefaults) {
    return (
      <div className="bg-announcement text-xs font-montserrat font-medium relative">
        <div className="flex items-center justify-center px-10 py-2.5">
          <span className="tracking-wide text-center">{settings.announcement_text}</span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-1/2 right-3 -translate-y-1/2 hover:opacity-60 transition-opacity"
          aria-label="Dismiss announcement"
        >
          <HiX className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Default rotating marketing messages (fallback)
  const current = DEFAULT_MESSAGES[currentIndex];
  return (
    <div className="bg-announcement text-xs font-montserrat font-medium relative">
      <div className="flex items-center justify-center px-10 py-2.5 pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="pointer-events-auto"
          >
            <Link to={current.link} className="hover:underline tracking-wide">
              {current.text}
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>
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
