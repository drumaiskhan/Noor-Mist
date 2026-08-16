import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { HiSparkles, HiGlobe, HiHeart, HiShieldCheck } from 'react-icons/hi';

const features = [
  { icon: HiSparkles, title: 'Premium Ingredients', description: 'Sourced from the finest producers worldwide' },
  { icon: HiGlobe, title: 'Sustainable', description: 'Ethically sourced and environmentally conscious' },
  { icon: HiHeart, title: 'Handcrafted', description: 'Each fragrance blended by master perfumers' },
  { icon: HiShieldCheck, title: 'Authenticity Guaranteed', description: '100% genuine fragrances, verified' },
];

export default function BrandStory({ data = {} }) {
  return (
    <section className="py-16 md:py-24 bg-noir overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="aspect-[4/5] rounded-2xl overflow-hidden">
              <img
                src={data.image || 'https://res.cloudinary.com/demo/image/upload/v1/noor-mist/brand-story.jpg'}
                alt="Noor Mist Story"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -right-6 w-48 h-48 bg-gold/10 rounded-2xl -z-10" />
            <div className="absolute -top-6 -left-6 w-32 h-32 border-2 border-gold/20 rounded-2xl -z-10" />
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <span className="text-gold text-sm tracking-[0.3em] uppercase font-montserrat mb-4 block">
              Our Heritage
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-playfair font-bold mb-6 leading-tight">
              {data.title || 'The Art of\nFragrance Creation'}
            </h2>
            <p className="text-theme-muted text-lg leading-relaxed mb-8 font-cormorant">
              {data.description || 
                'Noor Mist was born from a passion for the extraordinary. Our master perfumers travel the world to source the finest ingredients, from the rose fields of Bulgaria to the oud forests of Southeast Asia. Each fragrance is a masterpiece, blending tradition with innovation to create scents that evoke emotion and leave lasting impressions.'}
            </p>

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                    className="p-4 rounded-xl bg-noir-card border border-gold/5"
                  >
                    <Icon className="w-6 h-6 text-gold mb-2" />
                    <h4 className="text-sm font-montserrat font-semibold text-theme-text mb-1">{feature.title}</h4>
                    <p className="text-xs text-theme-muted">{feature.description}</p>
                  </motion.div>
                );
              })}
            </div>

            <Link to="/about" className="btn-outline-gold text-sm">
              Discover Our Story
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
