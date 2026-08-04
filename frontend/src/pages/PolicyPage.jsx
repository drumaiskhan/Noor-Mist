import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { pagesAPI } from '../services/api';

// Reusable policy page that reads content from the DB
export default function PolicyPage({ pageKey, defaultHeading, defaultContent }) {
  const { data, isLoading } = useQuery({
    queryKey: ['page', pageKey],
    queryFn: async () => { const { data } = await pagesAPI.get(pageKey); return data.content; },
    staleTime: 10 * 60 * 1000,
  });

  const d = data || {};
  const heading = d.heading || defaultHeading;
  const content = d.content || defaultContent;

  return (
    <>
      <Helmet>
        <title>{heading} - Noor Mist</title>
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="mb-10">
            <span className="text-gold text-xs tracking-[0.4em] uppercase font-montserrat mb-4 block">Legal</span>
            <h1 className="text-4xl md:text-5xl font-playfair font-bold mb-2">{heading}</h1>
            <p className="text-theme-muted opacity-70 text-sm">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => <div key={i} className="h-4 bg-theme-border rounded animate-pulse" style={{ width: `${70 + Math.random() * 30}%` }} />)}
            </div>
          ) : content ? (
            <div
              className="prose prose-invert prose-gold max-w-none text-theme-muted leading-relaxed
                prose-h2:font-playfair prose-h2:text-theme-text prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-3
                prose-h3:font-playfair prose-h3:text-theme-text prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-2
                prose-p:text-theme-muted prose-p:leading-relaxed
                prose-li:text-theme-muted prose-a:text-gold prose-a:no-underline hover:prose-a:underline
                prose-strong:text-theme-text"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <p className="text-theme-muted opacity-70 italic">Content coming soon.</p>
          )}
        </motion.div>
      </div>
    </>
  );
}
