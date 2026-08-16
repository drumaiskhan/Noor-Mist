import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { HiHeart, HiArrowLeft } from 'react-icons/hi';
import useWishlistStore from '../store/wishlistStore';
import ProductCard from '../components/Product/ProductCard';
import Button from '../components/UI/Button';
import { useSiteText } from '../utils/siteText';

export default function Wishlist() {
  const { items, getWishlistCount } = useWishlistStore();
  const t = useSiteText();

  return (
    <>
      <Helmet>
        <title>My Wishlist - Noor Mist</title>
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-32 md:pb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-playfair font-bold">My Wishlist</h1>
            <p className="text-theme-muted mt-1">{getWishlistCount()} items saved</p>
          </div>
          <Link to="/shop" className="flex items-center gap-2 text-sm text-theme-muted hover:text-theme-primary">
            <HiArrowLeft className="w-4 h-4" />
            Continue Shopping
          </Link>
        </div>

        {items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <HiHeart className="w-20 h-20 text-theme-muted mx-auto mb-6" />
            <h2 className="text-2xl font-playfair font-bold mb-4">{t.empty_wishlist_title}</h2>
            <p className="text-theme-muted mb-8">Save your favorite fragrances for later.</p>
            <Link to="/shop" className="btn-gold">Discover Perfumes</Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {items.map((product, index) => (
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
        )}
      </div>
    </>
  );
}
