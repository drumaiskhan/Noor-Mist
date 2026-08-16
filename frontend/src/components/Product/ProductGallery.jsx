import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiChevronLeft, HiChevronRight, HiZoomIn, HiX } from 'react-icons/hi';

export default function ProductGallery({ images = [], videos = [] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  const allMedia = [
    ...images.map((img) => ({ type: 'image', url: img.url, alt: img.alt_text })),
    ...videos.map((vid) => ({ type: 'video', url: vid.url })),
  ];

  if (allMedia.length === 0) {
    return (
      <div className="aspect-square bg-noir-light rounded-2xl flex items-center justify-center">
        <div className="text-center text-theme-muted">
          <div className="text-6xl mb-4">🌸</div>
          <p className="text-sm">No image available</p>
        </div>
      </div>
    );
  }

  const current = allMedia[activeIndex];

  const prev = () => setActiveIndex((i) => (i === 0 ? allMedia.length - 1 : i - 1));
  const next = () => setActiveIndex((i) => (i === allMedia.length - 1 ? 0 : i + 1));

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="relative aspect-square bg-noir-light rounded-2xl overflow-hidden group">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full"
          >
            {current.type === 'image' ? (
              <img
                src={current.url}
                alt={current.alt || 'Product image'}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <video
                src={current.url}
                controls
                className="w-full h-full object-cover"
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        {allMedia.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 glass rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:border-gold/50"
            >
              <HiChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 glass rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:border-gold/50"
            >
              <HiChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Zoom button */}
        {current.type === 'image' && (
          <button
            onClick={() => setIsZoomed(true)}
            className="absolute top-3 right-3 w-9 h-9 glass rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
          >
            <HiZoomIn className="w-4 h-4" />
          </button>
        )}

        {/* Index dots */}
        {allMedia.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {allMedia.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === activeIndex ? 'bg-gold w-5' : 'bg-theme-muted/40'}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {allMedia.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {allMedia.map((media, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                i === activeIndex ? 'border-gold' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              {media.type === 'image' ? (
                <img src={media.url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-noir-light flex items-center justify-center text-xs text-theme-muted">
                  ▶
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Lightbox / Zoom */}
      <AnimatePresence>
        {isZoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsZoomed(false)}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          >
            <button
              onClick={() => setIsZoomed(false)}
              className="absolute top-4 right-4 w-10 h-10 glass rounded-full flex items-center justify-center"
            >
              <HiX className="w-5 h-5" />
            </button>
            <img
              src={current.url}
              alt=""
              className="max-w-full max-h-[90vh] object-contain rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
