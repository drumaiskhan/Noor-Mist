import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  HiX,
  HiChevronLeft,
  HiChevronRight,
} from "react-icons/hi";
import { announcementsAPI } from "../../services/api";

const DISMISS_KEY = "noor_mist_announcement_closed";

export default function AnnouncementPopup() {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // react-query caches this alongside the rest of the app (5 min staleTime,
  // set globally in main.jsx) instead of re-fetching from scratch on every
  // mount, and serves a cached response instantly when one is available -
  // this is what makes the popup appear immediately rather than waiting on
  // a fresh network round trip every time.
  const { data } = useQuery({
    queryKey: ["announcements", "active"],
    queryFn: async () => {
      const { data } = await announcementsAPI.getActive();
      return Array.isArray(data) ? data : [];
    },
  });

  const announcements = data || [];

  // Identify the current active set so a closed popup reappears if the
  // admin publishes a new announcement, instead of staying hidden for the
  // rest of the browser session just because an older one was dismissed.
  const setId = useMemo(
    () => announcements.map((a) => a.id).sort((a, b) => a - b).join(","),
    [announcements]
  );

  useEffect(() => {
    if (!setId) return;
    const closedFor = sessionStorage.getItem(DISMISS_KEY);
    setDismissed(closedFor === setId);
  }, [setId]);

  useEffect(() => {
    if (announcements.length > 0 && !dismissed) {
      setVisible(true);
    }
  }, [announcements.length, dismissed]);

  // Auto slider
  useEffect(() => {
    if (announcements.length <= 1) return;

    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % announcements.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [announcements.length]);

  const closePopup = () => {
    setVisible(false);
    sessionStorage.setItem(DISMISS_KEY, setId);
  };

  const next = () => {
    setCurrent((prev) => (prev + 1) % announcements.length);
  };

  const previous = () => {
    setCurrent((prev) => (prev - 1 + announcements.length) % announcements.length);
  };

  if (!visible || announcements.length === 0) return null;

  // Guard against index drift if the active set ever shrinks mid-session
  const safeIndex = current < announcements.length ? current : 0;
  const announcement = announcements[safeIndex];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-5"
        >
          <motion.div
            initial={{ scale: 0.92, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-3xl bg-noir rounded-3xl overflow-hidden border border-gold/20 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            {/* Close Button */}
            <button
              onClick={closePopup}
              aria-label="Close announcement"
              className="absolute top-5 right-5 z-30 bg-black/70 rounded-full p-2 text-white hover:text-gold transition"
            >
              <HiX size={26} />
            </button>

            {/* Full Image */}
            {announcement.image_url && (
              <div className="w-full h-[300px] sm:h-[420px] md:h-[520px] bg-black overflow-hidden">
                <img
                  src={announcement.image_url}
                  alt={announcement.title}
                  loading="eager"
                  fetchpriority="high"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Content */}
            <div className="p-8 sm:p-10 text-center">
              <h2 className="text-3xl sm:text-4xl font-playfair font-bold text-white mb-4">
                {announcement.title}
              </h2>

              {announcement.description && (
                <p className="text-gray-300 leading-relaxed mb-6 text-base sm:text-lg">
                  {announcement.description}
                </p>
              )}

              {announcement.button_text && (
                <a
                  href={announcement.button_link || "/"}
                  className="inline-block bg-gold text-black px-8 py-3 rounded-xl font-semibold hover:scale-105 transition"
                >
                  {announcement.button_text}
                </a>
              )}

              {announcements.length > 1 && (
                <div className="flex items-center justify-between mt-8">
                  <button
                    onClick={previous}
                    aria-label="Previous announcement"
                    className="p-3 rounded-full bg-gold/10 text-gold hover:bg-gold/20"
                  >
                    <HiChevronLeft size={26} />
                  </button>

                  <span className="text-gray-400 text-sm">
                    {safeIndex + 1}/{announcements.length}
                  </span>

                  <button
                    onClick={next}
                    aria-label="Next announcement"
                    className="p-3 rounded-full bg-gold/10 text-gold hover:bg-gold/20"
                  >
                    <HiChevronRight size={26} />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
