import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { lookbooksAPI } from '../services/api';
import { HiArrowRight, HiSparkles } from 'react-icons/hi';

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

export default function Lookbooks() {
  const { data, isLoading } = useQuery({
    queryKey: ['publicLookbooks'],
    queryFn: lookbooksAPI.getAll,
  });

  const lookbooks = data?.data?.lookbooks || [];

  return (
    <>
      <Helmet>
        <title>The Edit — Noor Mist</title>
        <meta name="description" content="Editorial stories and curated looks from Noor Mist." />
      </Helmet>

      <section className="relative pt-32 pb-16 bg-theme-background overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-theme-primary/10 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 text-center relative">
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-theme-primary text-xs uppercase tracking-[0.3em] mb-4">
            Noor Mist
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-4xl md:text-6xl font-heading font-bold text-theme-text mb-6">
            The Edit
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-theme-muted font-body text-xl max-w-2xl mx-auto">
            Stories, moods, and moments — curated looks built around our fragrances.
          </motion.p>
        </div>
      </section>

      <section className="py-16 bg-theme-background">
        <div className="max-w-7xl mx-auto px-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="aspect-[4/3] rounded-2xl bg-theme-card animate-pulse" />
              ))}
            </div>
          ) : lookbooks.length === 0 ? (
            <div className="text-center py-24">
              <HiSparkles className="w-16 h-16 text-theme-muted mx-auto mb-4" />
              <h3 className="text-2xl font-heading font-bold text-theme-text mb-2">No Stories Yet</h3>
              <p className="text-theme-muted mb-8">Check back soon for new editorial looks.</p>
              <Link to="/shop" className="btn-theme inline-flex items-center gap-2">
                Browse All Perfumes <HiArrowRight />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {lookbooks.map((lb, i) => (
                <motion.div key={lb.id} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={cardVariants}>
                  <Link
                    to={`/lookbook/${lb.slug}`}
                    className="group block relative overflow-hidden rounded-2xl aspect-[4/3] bg-theme-card border border-theme-primary/20 hover:border-theme-primary/50 transition-all"
                  >
                    {lb.cover_image_url ? (
                      <img
                        src={lb.cover_image_url}
                        alt={lb.title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-theme-card">
                        <HiSparkles className="w-20 h-20 text-theme-primary/20" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                    <div className="absolute bottom-0 p-6">
                      {lb.subtitle && (
                        <span className="text-theme-primary text-xs uppercase tracking-[0.25em] mb-2 block">{lb.subtitle}</span>
                      )}
                      <h3 className="text-2xl font-heading font-bold text-white group-hover:text-theme-primary transition-colors">
                        {lb.title}
                      </h3>
                      {lb.excerpt && <p className="text-white/70 text-sm mt-2 line-clamp-2">{lb.excerpt}</p>}
                      <span className="flex items-center gap-2 mt-4 text-theme-primary uppercase text-sm">
                        Read the Story <HiArrowRight />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
