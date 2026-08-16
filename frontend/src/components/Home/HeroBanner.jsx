import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import gsap from 'gsap';

export default function HeroBanner({ data = {} }) {
  const sectionRef = useRef(null);
  const textRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.hero-particle', {
        scale: 0,
        opacity: 0,
        duration: 2,
        stagger: 0.03,
        ease: 'power2.out',
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen bg-noir flex items-center overflow-hidden"
    >
      {/* Background image (when set via admin) */}
      {data.backgroundImage && (
        <div className="absolute inset-0">
          <img
            src={data.backgroundImage}
            alt=""
            className="w-full h-full object-cover"
            style={{ display: 'block' }}
          />
          <div
            className="absolute inset-0"
            style={{ background: `rgba(0,0,0,${(parseInt(data.overlayOpacity ?? 50)) / 100})` }}
          />
        </div>
      )}

      {/* Animated golden particles (hidden when background image active) */}
      <div className={`absolute inset-0 pointer-events-none ${data.backgroundImage ? 'opacity-0' : ''}`}>
        {[...Array(60)].map((_, i) => (
          <motion.div
            key={i}
            className="hero-particle absolute rounded-full"
            style={{
              width: Math.random() * 4 + 2 + 'px',
              height: Math.random() * 4 + 2 + 'px',
              background: 'radial-gradient(circle, #D4AF37, transparent)',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -80],
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: Math.random() * 4 + 3,
              repeat: Infinity,
              delay: Math.random() * 3,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Smoke effect overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-96 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-noir via-noir/80 to-transparent" />
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute bottom-0 rounded-full"
            style={{
              width: '400px',
              height: '400px',
              background: `radial-gradient(circle, rgba(212,175,55,0.04) 0%, transparent 70%)`,
              left: `${15 + i * 20}%`,
            }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.3, 0.1, 0.3],
              x: [0, Math.random() * 40 - 20, 0],
            }}
            transition={{
              duration: 8 + i * 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-noir via-noir/90 to-transparent pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-2xl" ref={textRef}>
          {/* Subtitle */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="text-gold text-xs md:text-sm tracking-[0.4em] uppercase font-montserrat mb-6 block">
              {data.subtitle || 'Noor Mist Collection'}
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl md:text-7xl lg:text-8xl font-playfair font-bold mb-8 leading-[1.1]"
          >
            {data.heading || 'Discover The'}
            <br />
            <span className="gold-text">
              {data.highlight || 'Art of Luxury'}
            </span>
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-base md:text-lg text-theme-muted mb-10 leading-relaxed max-w-lg font-cormorant"
          >
            {data.description ||
              'Experience the essence of elegance with Noor Mist. Each fragrance tells a story of mystery and sophistication, crafted for those who appreciate the extraordinary.'}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-wrap gap-4"
          >
            <Link
              to={data.primaryLink || '/shop'}
              className="btn-gold text-sm md:text-base"
            >
              {data.primaryButton || 'Explore Collection'}
            </Link>
            <Link
              to={data.secondaryLink || '/about'}
              className="btn-outline-gold text-sm md:text-base"
            >
              {data.secondaryButton || 'Our Story'}
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:block"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="w-6 h-10 border-2 border-gold/40 rounded-full flex justify-center p-2">
          <motion.div
            className="w-1 h-3 bg-gold rounded-full"
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </motion.div>
    </section>
  );
}
