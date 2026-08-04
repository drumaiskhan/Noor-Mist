import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiX,
  HiChevronLeft,
  HiChevronRight,
} from "react-icons/hi";
import { announcementsAPI } from "../../services/api";

export default function AnnouncementPopup() {
  const [announcements, setAnnouncements] = useState([]);
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const closed = sessionStorage.getItem(
      "noor_mist_announcement_closed"
    );

    if (closed) return;

    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      const { data } = await announcementsAPI.getActive();

      if (Array.isArray(data) && data.length > 0) {
        setAnnouncements(data);
        setVisible(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Auto slider
  useEffect(() => {
    if (announcements.length <= 1) return;

    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % announcements.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [announcements]);

  const closePopup = () => {
    setVisible(false);

    sessionStorage.setItem(
      "noor_mist_announcement_closed",
      "true"
    );
  };

  const next = () =>
    setCurrent((c) => (c + 1) % announcements.length);

  const prev = () =>
    setCurrent((c) => (c - 1 + announcements.length) % announcements.length);

  if (!visible || announcements.length === 0) return null;

  const announcement = announcements[current];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-5"
        >
          <motion.div
            initial={{ scale: 0.9, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9 }}
            transition={{ duration: 0.25 }}
            className="relative w-full max-w-xl bg-noir rounded-3xl overflow-hidden border border-gold/20 shadow-2xl"
          >
            <button
              onClick={closePopup}
              className="absolute top-4 right-4 z-20 bg-black/70 rounded-full p-2 hover:text-gold"
            >
              <HiX size={24} />
            </button>

            {announcement.image_url && (
              <img
                src={announcement.image_url}
                alt={announcement.title}
                className="w-full h-72 object-cover"
              />
            )}

            <div className="p-8 text-center">
              <h2 className="text-3xl font-playfair font-bold text-white mb-4">
                {announcement.title}
              </h2>

              <p className="text-gray-300 leading-relaxed mb-6">
                {announcement.description}
              </p>

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
                    onClick={prev}
                    className="p-2 rounded-full bg-gold/10 hover:bg-gold/20"
                  >
                    <HiChevronLeft className="text-gold" size={24} />
                  </button>

                  <div className="flex gap-2">
                    {announcements.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrent(i)}
                        className={`w-3 h-3 rounded-full transition ${
                          i === current
                            ? "bg-gold"
                            : "bg-white/30"
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={next}
                    className="p-2 rounded-full bg-gold/10 hover:bg-gold/20"
                  >
                    <HiChevronRight className="text-gold" size={24} />
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
