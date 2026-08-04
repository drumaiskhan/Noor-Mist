import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { collectionsAPI } from '../services/api';
import { HiArrowRight, HiCollection } from 'react-icons/hi';
import { HelmetProvider, Helmet } from 'react-helmet-async';

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

export default function Collections() {
  const { data, isLoading } = useQuery({
    queryKey: ['publicCollections'],
    queryFn: collectionsAPI.getAll,
  });

  const collections = (data?.data?.collections || data?.data || []).filter((c) => c.is_active !== false);

  return (
    <>
      <Helmet>
        <title>Collections — Noor Mist</title>
        <meta name="description" content="Explore Noor Mist's curated luxury fragrance collections." />
      </Helmet>

      {/* Hero */}
      <section className="relative pt-32 pb-16 bg-noir overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gold/5 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-gold font-montserrat text-xs uppercase tracking-[0.3em] mb-4"
          >
            Noor Mist
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-playfair font-bold text-theme-text mb-6"
          >
            Our Collections
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-theme-muted font-cormorant text-xl max-w-2xl mx-auto"
          >
            Carefully curated fragrance collections, each telling a unique story of luxury and mystery.
          </motion.p>
        </div>
      </section>

      {/* Collections Grid */}
      <section className="py-16 bg-noir">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-[4/5] rounded-2xl skeleton" />
              ))}
            </div>
          ) : collections.length === 0 ? (
            <div className="text-center py-24">
              <HiCollection className="w-16 h-16 text-theme-muted mx-auto mb-4" />
              <h3 className="text-2xl font-playfair font-bold text-theme-text mb-2">No Collections Yet</h3>
              <p className="text-theme-muted mb-8">Check back soon for our curated collections.</p>
              <Link to="/shop" className="btn-gold inline-flex items-center gap-2">
                Browse All Perfumes
                <HiArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {collections.map((collection, i) => (
                <motion.div
                  key={collection.id}
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={cardVariants}
                >
                  <Link
                    to={`/shop?collection_id=${collection.id}`}
                    className="group block relative overflow-hidden rounded-2xl aspect-[4/5] bg-noir-card border border-gold/10 hover:border-gold/30 transition-all duration-500"
                  >
                    {/* Image */}
                    {collection.image_url ? (
                      <img
                        src={collection.image_url}
                        alt={collection.name}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-noir-card to-noir flex items-center justify-center">
                        <HiCollection className="w-20 h-20 text-gold/20" />
                      </div>
                    )}

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                    {/* Content */}
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h3 className="text-2xl font-playfair font-bold text-theme-text mb-2 group-hover:text-theme-primary transition-colors">
                        {collection.name}
                      </h3>
                      {collection.description && (
                        <p className="text-theme-muted text-sm font-cormorant leading-relaxed mb-4 line-clamp-2">
                          {collection.description}
                        </p>
                      )}
                      <span className="inline-flex items-center gap-2 text-gold text-sm font-montserrat uppercase tracking-wider group-hover:gap-3 transition-all">
                        Explore
                        <HiArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      {collections.length > 0 && (
        <section className="py-16 bg-noir border-t border-gold/10">
          <div className="max-w-3xl mx-auto text-center px-4">
            <h2 className="text-3xl font-playfair font-bold text-theme-text mb-4">
              Can't find what you're looking for?
            </h2>
            <p className="text-theme-muted font-cormorant text-lg mb-8">
              Browse our full perfume catalogue for the complete Noor Mist experience.
            </p>
            <Link to="/shop" className="btn-gold inline-flex items-center gap-2">
              Shop All Perfumes
              <HiArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
