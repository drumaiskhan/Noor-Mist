import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiArrowRight } from 'react-icons/hi';

const defaultCollections = [
  {
    title: "Men's Fragrances",
    description: 'Bold and sophisticated scents for the modern gentleman',
    image: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=800&q=80',
    link: '/shop?gender=male',
    gradient: 'from-blue-900/60 to-noir',
  },
  {
    title: "Women's Fragrances",
    description: 'Elegant and captivating perfumes for the modern woman',
    image: 'https://images.unsplash.com/photo-1595535873420-a599195b3f4a?w=800&q=80',
    link: '/shop?gender=female',
    gradient: 'from-pink-900/60 to-noir',
  },
  {
    title: 'Oud Collection',
    description: 'Rich, intense Arabian oud blended with exotic notes',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
    link: '/shop?fragrance_family=oud',
    gradient: 'from-amber-900/60 to-noir',
  },
  {
    title: 'Royal Collection',
    description: 'Our most prestigious and luxurious signature fragrances',
    image: 'https://images.unsplash.com/photo-1541643600914-78b084683702?w=800&q=80',
    link: '/shop?featured=true',
    gradient: 'from-yellow-900/60 to-noir',
  },
  {
    title: 'Limited Edition',
    description: 'Exclusive seasonal releases in limited quantities',
    image: 'https://images.unsplash.com/photo-1587834685524-2ac8b5578f1b?w=800&q=80',
    link: '/shop?limited_edition=true',
    gradient: 'from-purple-900/60 to-noir',
  },
  {
    title: 'Gift Sets',
    description: 'Curated fragrance sets for every special occasion',
    image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&q=80',
    link: '/shop?gift_set=true',
    gradient: 'from-emerald-900/60 to-noir',
  },
];

export default function Collections({ data = {} }) {
  const collections = data.collections || defaultCollections;

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
            {data.title || 'Our Collections'}
          </h2>
          <p className="section-subtitle">
            {data.subtitle || 'Discover our carefully curated fragrance collections'}
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
