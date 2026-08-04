import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiSparkles } from 'react-icons/hi';
import { useQuery } from '@tanstack/react-query';
import { productAPI } from '../../services/api';
import ProductCard from '../Product/ProductCard';

export default function NewArrivals({ data = {} }) {
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['newArrivals'],
    queryFn: productAPI.getNewArrivals,
  });

  const products = data.products || productsData?.data?.products || [];

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
          <span className="inline-flex items-center gap-2 text-gold text-sm uppercase tracking-wider font-montserrat mb-4">
            <HiSparkles className="w-4 h-4" />
            Just Arrived
          </span>
          <h2 className="section-title">
            {data.title || 'New Arrivals'}
          </h2>
          <p className="section-subtitle">
            {data.subtitle || 'Be the first to experience our latest fragrances'}
          </p>
        </motion.div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="luxury-card">
                <div className="aspect-square skeleton" />
                <div className="p-4 space-y-3">
                  <div className="skeleton h-5 w-3/4 rounded" />
                  <div className="skeleton h-4 w-1/2 rounded" />
                  <div className="skeleton h-6 w-1/3 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {products.slice(0, 8).map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        )}

        {/* View All */}
        <div className="text-center mt-10">
          <Link
            to="/shop?new_arrival=true"
            className="btn-outline-gold text-sm"
          >
            View All New Arrivals
          </Link>
        </div>
      </div>
    </section>
  );
}
