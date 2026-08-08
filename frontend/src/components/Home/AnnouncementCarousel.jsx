import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import { announcementsAPI } from '../../services/api';

// A plain <a href="/shop?..."> makes the browser do a full page reload,
// which drops all client-side app state (cart, auth, etc). Internal links
// (relative paths, or same-origin absolute URLs) should go through the
// router instead; only genuinely external links need a real navigation.
const isInternalLink = (link) => {
  if (!link) return true;
  if (link.startsWith('/')) return true;
  try {
    const url = new URL(link, window.location.origin);
    return url.origin === window.location.origin;
  } catch {
    return true;
  }
};

const toInternalPath = (link) => {
  if (link.startsWith('/')) return link;
  try {
    const url = new URL(link, window.location.origin);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return link;
  }
};

// Same admin-managed announcements the old popup used — now shown as a
// normal, always-visible section on the homepage instead of an intrusive
// full-screen overlay. Swipeable on touch, with arrow controls for desktop.
export default function AnnouncementCarousel() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  const { data } = useQuery({
    queryKey: ['announcements', 'active'],
    queryFn: async () => {
      const { data } = await announcementsAPI.getActive();
      return Array.isArray(data) ? data : [];
    },
  });

  const announcements = data || [];

  // Auto-advance
  useEffect(() => {
    if (announcements.length <= 1) return;
    const timer = setInterval(() => {
      setDirection(1);
      setCurrent((prev) => (prev + 1) % announcements.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [announcements.length]);

  if (announcements.length === 0) return null;

  const safeIndex = current < announcements.length ? current : 0;
  const announcement = announcements[safeIndex];

  const next = () => {
    setDirection(1);
    setCurrent((prev) => (prev + 1) % announcements.length);
  };

  const previous = () => {
    setDirection(-1);
    setCurrent((prev) => (prev - 1 + announcements.length) % announcements.length);
  };

  const goToButtonLink = () => {
    const link = announcement.button_link || '/';
    if (isInternalLink(link)) {
      navigate(toInternalPath(link));
    } else {
      window.open(link, '_blank', 'noopener,noreferrer');
    }
  };

  // Swipe handling — drag left/right past a threshold advances/retreats
  const handleDragEnd = (e, { offset, velocity }) => {
    const swipe = Math.abs(offset.x) * velocity.x;
    if (swipe < -10000 || offset.x < -80) {
      next();
    } else if (swipe > 10000 || offset.x > 80) {
      previous();
    }
  };

  return (
    <section className="bg-noir-card border-b border-gold/10 overflow-hidden">
      <div className="max-w-7xl mx-auto relative">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={safeIndex}
            custom={direction}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            initial={{ opacity: 0, x: direction >= 0 ? 60 : -60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction >= 0 ? -60 : 60 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="grid grid-cols-1 md:grid-cols-2 items-stretch cursor-grab active:cursor-grabbing select-none"
          >
            {announcement.image_url && (
              <div className="w-full h-48 sm:h-64 md:h-full md:min-h-[280px] bg-black overflow-hidden order-1 md:order-2">
                <img
                  src={announcement.image_url}
                  alt={announcement.title}
                  loading="eager"
                  fetchpriority="high"
                  decoding="async"
                  draggable={false}
                  className="w-full h-full object-cover pointer-events-none"
                />
              </div>
            )}

            <div
              className={`flex flex-col justify-center p-6 sm:p-10 text-center md:text-left order-2 md:order-1 ${
                !announcement.image_url ? 'md:col-span-2 items-center text-center' : ''
              }`}
            >
              <h2 className="text-2xl sm:text-3xl font-playfair font-bold text-white mb-3">
                {announcement.title}
              </h2>

              {announcement.description && (
                <p className="text-gray-300 leading-relaxed mb-5 text-sm sm:text-base">
                  {announcement.description}
                </p>
              )}

              {announcement.button_text && (
                <button
                  type="button"
                  onClick={goToButtonLink}
                  className="self-center md:self-start inline-block bg-gold text-black px-7 py-2.5 rounded-xl font-semibold hover:scale-105 transition w-fit"
                >
                  {announcement.button_text}
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {announcements.length > 1 && (
          <>
            <button
              onClick={previous}
              aria-label="Previous announcement"
              className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/50 text-gold hover:bg-black/70 transition-colors"
            >
              <HiChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={next}
              aria-label="Next announcement"
              className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/50 text-gold hover:bg-black/70 transition-colors"
            >
              <HiChevronRight className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-center gap-1.5 pb-3">
              {announcements.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setDirection(i > safeIndex ? 1 : -1); setCurrent(i); }}
                  aria-label={`Go to announcement ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === safeIndex ? 'w-5 bg-gold' : 'w-1.5 bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
