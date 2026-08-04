import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { HiMail, HiSparkles } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function Newsletter({ data = {} }) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success('Thank you for subscribing!');
    setEmail('');
    setIsSubmitting(false);
  };

  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-noir via-noir-light to-noir" />
      <div className="absolute inset-0 bg-gradient-to-t from-gold/5 to-transparent" />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 text-gold text-sm uppercase tracking-wider font-montserrat mb-4">
            <HiSparkles className="w-4 h-4" />
            Join Our Community
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-playfair font-bold mb-4">
            {data.title || 'Stay in the Know'}
          </h2>
          <p className="text-theme-muted text-lg mb-10 max-w-xl mx-auto font-cormorant">
            {data.subtitle || 'Subscribe to receive exclusive offers, new arrivals, and fragrance tips directly to your inbox.'}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <div className="flex-1 relative">
              <HiMail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-muted" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full bg-theme-card border border-theme-border rounded-xl pl-12 pr-4 py-4 text-theme-text focus:border-theme-primary outline-none text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-gold text-sm whitespace-nowrap"
            >
              {isSubmitting ? 'Subscribing...' : 'Subscribe'}
            </button>
          </form>

          <p className="text-xs text-theme-muted opacity-70 mt-4">
            By subscribing, you agree to our Privacy Policy. No spam, we promise.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
