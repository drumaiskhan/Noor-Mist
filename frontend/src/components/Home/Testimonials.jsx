import React from 'react';
import { motion } from 'framer-motion';
import { HiChatAlt } from 'react-icons/hi';
import { useQuery } from '@tanstack/react-query';
import Rating from '../UI/Rating';
import { formatDate } from '../../utils/helpers';
import { reviewAPI } from '../../services/api';

export default function Testimonials({ data = {} }) {
  const { data: reviewsData } = useQuery({
    queryKey: ['homepageReviews'],
    queryFn: async () => {
      const { data } = await reviewAPI.getFeatured(4);
      return data;
    },
  });

  const testimonials = reviewsData?.reviews ?? [];

  // Hide section entirely when there are no real reviews
  if (testimonials.length === 0) return null;

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
          <h2 className="section-title">
            {data.title || 'What Our Customers Say'}
          </h2>
          <p className="section-subtitle">
            {data.subtitle || 'Real experiences from our fragrance community'}
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="luxury-card p-6 relative"
            >
              {/* Quote Icon */}
              <HiChatAlt className="w-8 h-8 text-gold/20 absolute top-4 right-4" />

              {/* Rating */}
              <div className="mb-4">
                <Rating value={testimonial.rating} size="sm" />
              </div>

              {/* Content */}
              <p className="text-theme-muted text-sm leading-relaxed mb-6 font-cormorant italic">
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-theme-primary/20 flex items-center justify-center">
                  <span className="text-theme-primary text-sm font-bold">
                    {testimonial.user_name?.charAt(0) || '?'}
                  </span>
                </div>
                <div>
                  <p className="text-theme-text text-sm font-montserrat font-semibold">
                    {testimonial.user_name || 'Customer'}
                  </p>
                  <p className="text-theme-muted opacity-70 text-xs">
                    {testimonial.created_at ? formatDate(testimonial.created_at) : 'Verified Buyer'}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
