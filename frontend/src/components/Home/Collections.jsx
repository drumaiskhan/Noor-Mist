import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiArrowRight } from 'react-icons/hi';

// Small fixed palette of gradients, cycled by index — real collections don't
// carry a per-item gradient in the database, so this keeps the visual
// variety the original hardcoded version had.
const GRADIENTS = [
  'from-blue-900/60 to-noir',
  'from-pink-900/60 to-noir',
  'from-amber-900/60 to-noir',
  'from-yellow-900/60 to-noir',
  'from-purple-900/60 to-noir',
  'from-emerald-900/60 to-noir',
];

export default function Collections({ data = [] }) {
  // Home.jsx passes the raw array of active collections from the API.
  // Fall back to sample content only when there are genuinely none yet,
  // so the section isn't empty for a brand-new store.
  const realCollections = Array.isArray(data) ? data : data?.collections;
  const sectionData = Array.isArray(data) ? {} : (data || {});
  const collections = (realCollections || []).map((c, i) => ({
        title: c.name,
        description: c.description || '',
        image: c.image_url || '/images/placeholder-perfume.jpg',
        link: `/shop?collection=${c.slug}`,
        gradient: GRADIENTS[i % GRADIENTS.length],
      }));

  if (!collections.length) return null;

  return (
    <section className="py-16 md:py-24 bg-noir-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="text-gold text-xs uppercase tracking-[0.3em] font-montserrat mb-3 block">
            Explore
          </span>
          <h2 className="section-title">
            {sectionData.title || 'Our Collections'}
          </h2>
          <p className="section-subtitle">
            {sectionData.subtitle || 'Discover our carefully curated fragrance collections'}
          </p>
        </motion.div>

        {/* Collections Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {collections.map((collection, index) => (
            <motion.div
              key={collection.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
            >
              <Link
                to={collection.link}
                className="group block relative h-72 md:h-80 rounded-2xl overflow-hidden"
              >
                {/* Background Image */}
                <img
                  src={collection.image}
                  alt={collection.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  loading="lazy"
                />

                {/* Gradient Overlay */}
                <div className={`absolute inset-0 bg-gradient-to-t ${collection.gradient} opacity-75 group-hover:opacity-90 transition-opacity duration-500`} />

                {/* Content */}
                <div className="absolute inset-0 flex flex-col justify-end p-6">
                  <h3 className="text-xl md:text-2xl font-playfair font-bold text-theme-text mb-1.5 group-hover:text-theme-primary transition-colors duration-300">
                    {collection.title}
                  </h3>
                  <p className="text-theme-text text-sm mb-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 leading-snug">
                    {collection.description}
                  </p>
                  <span className="inline-flex items-center gap-2 text-gold text-xs font-montserrat uppercase tracking-widest">
                    Explore
                    <HiArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform duration-300" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
