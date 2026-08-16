import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { HiArrowLeft, HiShoppingBag } from 'react-icons/hi';
import { lookbooksAPI } from '../services/api';
import ProductCard from '../components/Product/ProductCard';
import Loader from '../components/UI/Loader';

export default function LookbookDetail() {
  const { slug } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ['lookbook', slug],
    queryFn: () => lookbooksAPI.getOne(slug),
    enabled: !!slug,
  });

  const lookbook = data?.data?.lookbook;
  const products = data?.data?.products || [];
  const sections = lookbook?.sections || [];

  if (isLoading) return <Loader fullScreen />;

  if (error || !lookbook) {
    return (
      <div className="max-w-3xl mx-auto px-4 pt-40 pb-24 text-center">
        <h1 className="text-3xl font-heading font-bold text-theme-text mb-4">Story Not Found</h1>
        <p className="text-theme-muted mb-8">This lookbook may have been removed or unpublished.</p>
        <Link to="/lookbook" className="btn-theme inline-flex items-center gap-2">
          <HiArrowLeft /> Back to The Edit
        </Link>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{lookbook.meta_title || `${lookbook.title} — Noor Mist`}</title>
        {lookbook.meta_description && <meta name="description" content={lookbook.meta_description} />}
      </Helmet>

      {/* Hero */}
      <section className="relative h-[70vh] min-h-[420px] w-full overflow-hidden bg-theme-card">
        {lookbook.cover_image_url && (
          <img src={lookbook.cover_image_url} alt={lookbook.title} className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-4xl mx-auto px-4 pb-16 text-center w-full">
            {lookbook.subtitle && (
              <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-theme-primary text-xs uppercase tracking-[0.3em] mb-4">
                {lookbook.subtitle}
              </motion.p>
            )}
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-4xl md:text-6xl font-heading font-bold text-white">
              {lookbook.title}
            </motion.h1>
          </div>
        </div>
      </section>

      {/* Excerpt */}
      {lookbook.excerpt && (
        <section className="py-14 bg-theme-background">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <p className="text-theme-muted font-body text-lg leading-relaxed">{lookbook.excerpt}</p>
          </div>
        </section>
      )}

      {/* Editorial sections */}
      {sections.map((section, i) => (
        <section key={i} className="py-8 bg-theme-background">
          <div className="max-w-5xl mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-2xl overflow-hidden">
              {section.image_url && (
                <img src={section.image_url} alt={section.caption || `${lookbook.title} ${i + 1}`} className="w-full h-auto object-cover" />
              )}
              {section.caption && (
                <p className="text-theme-muted text-sm text-center mt-4 font-cormorant text-lg">{section.caption}</p>
              )}
            </motion.div>
          </div>
        </section>
      ))}

      {/* Shop the look */}
      {products.length > 0 && (
        <section className="py-20 bg-theme-background border-t border-theme-primary/10">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <span className="flex items-center justify-center gap-2 text-theme-primary text-xs uppercase tracking-[0.3em] mb-4">
                <HiShoppingBag className="w-4 h-4" /> Shop the Look
              </span>
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-theme-text">Featured in this Story</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="text-center pb-16 bg-theme-background">
        <Link to="/lookbook" className="inline-flex items-center gap-2 text-sm text-theme-muted hover:text-theme-primary transition-colors">
          <HiArrowLeft className="w-4 h-4" /> Back to The Edit
        </Link>
      </div>
    </>
  );
}
