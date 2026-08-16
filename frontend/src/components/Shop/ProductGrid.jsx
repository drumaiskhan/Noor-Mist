import React from 'react';
import { motion } from 'framer-motion';
import ProductCard from '../Product/ProductCard';
import { useSiteText } from '../../utils/siteText';

export default function ProductGrid({ products = [], isLoading, columns = 4 }) {
  const t = useSiteText();
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  };

  if (isLoading) {
    return (
      <div className={`grid ${gridCols[columns]} gap-4 md:gap-6`}>
        {[...Array(8)].map((_, i) => (
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
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-20">
        <h3 className="text-2xl font-playfair font-bold mb-4">{t.no_products_title}</h3>
        <p className="text-theme-muted">{t.no_products_subtitle}</p>
      </div>
    );
  }

  return (
    <div className={`grid ${gridCols[columns]} gap-4 md:gap-6`}>
      {products.map((product, index) => (
        <motion.div
          key={product.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.05 }}
        >
          <ProductCard product={product} />
        </motion.div>
      ))}
    </div>
  );
}
