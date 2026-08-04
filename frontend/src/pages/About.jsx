import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { pagesAPI } from '../services/api';

export default function About() {
  const { data } = useQuery({
    queryKey: ['page', 'about'],
    queryFn: async () => { const { data } = await pagesAPI.get('about'); return data.content; },
    staleTime: 5 * 60 * 1000,
  });

  const d = data || {};

  return (
    <>
      <Helmet>
        <title>{d.heading || 'About Us'} - Noor Mist</title>
        <meta name="description" content={d.mission || 'Learn about Noor Mist\'s heritage and passion for luxury fragrances.'} />
      </Helmet>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>

          {/* Hero */}
          <div className="text-center mb-16">
            <span className="text-gold text-xs tracking-[0.4em] uppercase font-montserrat mb-4 block">Our Story</span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-playfair font-bold mb-4 gold-text">
              {d.heading || 'About Noor Mist'}
            </h1>
            {d.subheading && <p className="text-xl text-theme-muted font-cormorant">{d.subheading}</p>}
          </div>

          {/* Image + Story */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            {d.image && (
              <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.2 }} className="relative">
                <div className="aspect-[4/3] rounded-2xl overflow-hidden">
                  <img src={d.image} alt="About Noor Mist" className="w-full h-full object-cover" />
                </div>
                <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-gold/10 rounded-2xl -z-10" />
              </motion.div>
            )}
            <div className={d.image ? '' : 'lg:col-span-2'}>
              {d.story && d.story.split('\n\n').map((para, i) => (
                <p key={i} className="text-theme-muted text-lg leading-relaxed font-cormorant mb-4">{para}</p>
              ))}
            </div>
          </div>

          {/* Mission & Vision */}
          {(d.mission || d.vision) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
              {d.mission && (
                <div className="luxury-card p-8">
                  <h3 className="text-gold text-xs tracking-[0.3em] uppercase font-montserrat mb-3">Our Mission</h3>
                  <p className="text-theme-text text-lg font-playfair leading-relaxed">{d.mission}</p>
                </div>
              )}
              {d.vision && (
                <div className="luxury-card p-8">
                  <h3 className="text-gold text-xs tracking-[0.3em] uppercase font-montserrat mb-3">Our Vision</h3>
                  <p className="text-theme-text text-lg font-playfair leading-relaxed">{d.vision}</p>
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          {(d.founded_year || d.team_size || d.countries) && (
            <div className="grid grid-cols-3 gap-4 mb-16">
              {[
                { val: d.founded_year, label: 'Founded' },
                { val: d.team_size, label: 'Team Members' },
                { val: d.countries, label: 'Countries' },
              ].filter((s) => s.val).map((stat) => (
                <div key={stat.label} className="text-center luxury-card p-6">
                  <p className="text-3xl font-playfair font-bold gold-text mb-1">{stat.val}</p>
                  <p className="text-theme-muted text-sm font-montserrat">{stat.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Fallback content if no DB data yet */}
          {!d.story && (
            <div className="prose prose-invert max-w-none space-y-6">
              <p className="text-lg text-theme-muted leading-relaxed font-cormorant">
                Noor Mist was born from a passion for the extraordinary. Our journey began with a simple belief:
                that fragrance is not just a scent, but an expression of identity, emotion, and memory.
              </p>
              <p className="text-theme-muted leading-relaxed">
                Our master perfumers travel the world to source the finest ingredients, from the rose fields of
                Bulgaria to the oud forests of Southeast Asia.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
}
