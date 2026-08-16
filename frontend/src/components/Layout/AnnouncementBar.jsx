import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { HiX } from 'react-icons/hi';
import { settingsAPI } from '../../services/api';
import { formatPrice, toBool } from '../../utils/helpers';

// Renders the announcement bar that sits above the header.
// Color is fully theme-driven via --announcement-bg / --announcement-text,
// both set by themeStore from admin Theme Editor settings.
// Messages are admin-controlled from Settings → Announcement Bar, where an
// admin can add one or more rotating messages (each with optional link).
// The dismiss button used to only set local component state, so the bar
// came right back on the next page navigation or refresh — reading as "the
// X doesn't work". Persisting which message set was dismissed (keyed to
// its content) fixes that, while still automatically reappearing if the
// admin changes the announcements to something new.
const DISMISS_KEY = 'noor_mist_announcement_dismissed';

// Default rotating messages shown when no admin announcement is configured.
function useDefaultMessages(settings) {
  const freeShippingThreshold = settings.free_shipping_threshold !== undefined
    ? Number(settings.free_shipping_threshold) : 5000;

  return useMemo(() => [
  ], [freeShippingThreshold]);
}

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

  const isEnabled = toBool(settings.announcement_enabled);

  // Admin-configured messages (new multi-message shape). Falls back to the
  // older single announcement_text field for sites that saved a message
  // before this became a list, so nothing configured previously disappears.
  const adminMessages = useMemo(() => {
    if (settings.announcement_messages) {
      try {
        const parsed = JSON.parse(settings.announcement_messages);
        if (Array.isArray(parsed) && parsed.length) {
          return parsed.filter((m) => m?.text?.trim());
        }
      } catch {
        // fall through to legacy field below
      }
    }
    if (settings.announcement_text?.trim()) {
      return [{ text: settings.announcement_text, link: '' }];
    }
    return [];
  }, [settings.announcement_messages, settings.announcement_text]);

  const defaultMessages = useDefaultMessages(settings);
  const useAdmin = isEnabled && adminMessages.length > 0;
  const messages = useAdmin ? adminMessages : defaultMessages;

  // Re-check dismissal once we know what's actually showing — dismissing
  // one set of messages shouldn't hide a later, different set the admin
  // configures, and vice versa.
  useEffect(() => {
    const key = messages.map((m) => m.text).join('|') || 'default';
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === key);
    } catch {
      // localStorage unavailable (private browsing, etc) — just don't persist.
    }
  }, [messages]);

  // Snap back to a valid slide if the active message set shrinks (e.g. an
  // admin removes a message) while sitting on a now out-of-range index.
  useEffect(() => {
    if (currentIndex >= messages.length) setCurrentIndex(0);
  }, [messages.length, currentIndex]);

  const dismiss = () => {
    const key = messages.map((m) => m.text).join('|') || 'default';
    try {
      localStorage.setItem(DISMISS_KEY, key);
    } catch {
      // ignore
    }
    setDismissed(true);
  };

  // Rotate through whichever message set is active.
  useEffect(() => {
    if (messages.length <= 1) return;
    const id = setInterval(() => setCurrentIndex((i) => (i + 1) % messages.length), 4000);
    return () => clearInterval(id);
  }, [messages.length]);

  if (dismissed || messages.length === 0) return null;

  const safeIndex = currentIndex < messages.length ? currentIndex : 0;
  const current = messages[safeIndex];

  return (
    <div className="bg-announcement text-xs font-montserrat font-medium relative z-40 text-center">
      <div className="flex items-center justify-center px-10 py-2.5">
        <AnimatePresence mode="wait">
          <motion.div
            key={safeIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            {current.link ? (
              <Link to={current.link} className="hover:underline tracking-wide text-center">
                {current.text}
              </Link>
            ) : (
              <span className="tracking-wide text-center">{current.text}</span>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="absolute top-1/2 right-3 -translate-y-1/2 hover:opacity-60 transition-opacity z-10"
        aria-label="Dismiss announcement"
      >
        <HiX className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
