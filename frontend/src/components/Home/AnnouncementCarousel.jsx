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
  const [paused, setPaused] = useState(false);

  const { data } = useQuery({
    queryKey: ['announcements', 'active'],
    queryFn: async () => {
      const { data } = await announcementsAPI.getActive();
      return Array.isArray(data) ? data : [];
    },
    // Announcements are admin-managed and change rarely, but when they do
    // (a new one added/removed) this strip should pick it up without a
    // full page reload — same window the storefront homepage uses.
    staleTime: 60 * 1000,
  });

  const announcements = data || [];

  // If the active set shrinks (an announcement expires/gets disabled)
  // while we're sitting on a now out-of-range slide, snap back to the
  // start instead of freezing on a stale index.
  useEffect(() => {
    if (current >= announcements.length) setCurrent(0);
  }, [announcements.length, current]);

  // Auto-advance — paused while the user is hovering/interacting so a
  // slide doesn't change out from under them mid-read or mid-swipe.
  useEffect(() => {
    if (announcements.length <= 1 || paused) return;
    const timer = setInterval(() => {
      setDirection(1);
      setCurrent((prev) => (prev + 1) % announcements.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [announcements.length, paused]);

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
    <section
      className="bg-noir-card border-b border-gold/10 overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="max-w-7xl mx-auto relative">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={safeIndex}
            custom={direction}
            drag={announcements.length > 1 ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragStart={() => setPaused(true)}
            onDragEnd={(e, info) => { handleDragEnd(e, info); setPaused(false); }}
            // Lets the browser still handle vertical page scrolling on
            // touch devices while horizontal drag is used for swipe —
            // without this, a vertical scroll starting on the slide can
            // get captured as a (failed) horizontal drag instead.
            style={{ touchAction: 'pan-y' }}
            initial={{ opacity: 0, x: direction >= 0 ? 60 : -60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction >= 0 ? -60 : 60 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className={`flex flex-col items-stretch select-none ${
              announcements.length > 1 ? 'cursor-grab active:cursor-grabbing' : ''
            }`}
          >
            {announcement.image_url && (
              // A fixed, sane height (rather than the old open-ended
              // md:h-full) stops a tall/portrait promo image from forcing
              // this whole row — and the text column beside it — to
              // stretch to match, which is what left "Shop Now" stranded
              // with a big empty gap above and below it.
              <div className="w-full aspect-[3/2] md:aspect-auto md:h-[420px] bg-black overflow-hidden">
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

            <div className="flex flex-col items-center justify-center text-center p-6 sm:p-10">
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
                  className="inline-block bg-gold text-black px-7 py-2.5 rounded-xl font-semibold hover:scale-105 transition w-fit"
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
