import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiHeart, HiShoppingBag, HiStar } from 'react-icons/hi';
import { useQuery } from '@tanstack/react-query';
import { productAPI } from '../../services/api';
import useCartStore from '../../store/cartStore';
import useWishlistStore from '../../store/wishlistStore';
import { formatPrice, calculateDiscount, getImageUrl } from '../../utils/helpers';
import toast from 'react-hot-toast';

function BestSellerCard({ product }) {
  const addToCart = useCartStore((s) => s.addToCart);
  const { toggleWishlist, isInWishlist } = useWishlistStore();
  const isWishlisted = isInWishlist(product.id);
  const imageUrl = getImageUrl(product);
  const discount = product.variants?.length > 0
    ? calculateDiscount(product.variants[0].price, product.variants[0].sale_price)
    : 0;

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.variants?.length > 0) {
      addToCart(product, product.variants[0], 1);
      toast.success('Added to cart');
    }
  };

  const handleToggleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
    toast.success(isWishlisted ? 'Removed from wishlist' : 'Added to wishlist');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <Link
        to={`/product/${product.slug}`}
        className="luxury-card group block overflow-hidden"
      >
        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden bg-noir-card">
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
          />
          
          {/* Discount Badge */}
          {discount > 0 && (
            <span className="absolute top-3 left-3 badge-sale text-xs font-bold px-2 py-1 rounded-full">
              -{discount}%
            </span>
          )}

          {/* Quick Actions */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
              onClick={handleToggleWishlist}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                isWishlisted
                  ? 'bg-theme-primary text-theme-bg'
                  : 'bg-theme-bg/60 text-theme-text hover:bg-theme-primary hover:text-theme-bg'
              }`}
            >
              <HiHeart className="w-4 h-4" />
            </button>
            <button
              onClick={handleAddToCart}
              className="w-9 h-9 rounded-full bg-theme-bg/60 text-theme-text hover:bg-theme-primary hover:text-theme-bg flex items-center justify-center transition-all"
            >
              <HiShoppingBag className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Product Info */}
        <div className="p-4">
          <h3 className="font-playfair font-bold text-theme-text text-lg mb-1 group-hover:text-theme-primary transition-colors truncate">
            {product.name}
          </h3>
          <p className="text-theme-muted text-sm mb-3 truncate">
            {product.category_name || 'Perfume'}
          </p>

          {/* Rating */}
          {product.average_rating > 0 && (
            <div className="flex items-center gap-1 mb-3">
              <HiStar className="w-4 h-4 text-theme-primary" />
              <span className="text-sm text-theme-muted">{product.average_rating}</span>
              <span className="text-xs text-theme-muted opacity-60">({product.review_count})</span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-center gap-2">
            {product.variants?.length > 0 && (
              <>
                <span className="text-theme-primary font-bold text-lg">
                  {formatPrice(product.variants[0].sale_price || product.variants[0].price)}
                </span>
                {product.variants[0].sale_price && (
                  <span className="text-theme-muted opacity-60 text-sm line-through">
                    {formatPrice(product.variants[0].price)}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function BestSellers({ data = {} }) {
  const scrollRef = useRef(null);

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['bestsellers'],
    queryFn: productAPI.getBestSellers,
  });

  const products = data.products || productsData?.data?.products || [];

  return (
    <section className="py-16 md:py-24 bg-noir">
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
            {data.title || 'Best Sellers'}
          </h2>
          <p className="section-subtitle">
            {data.subtitle || 'Our most loved fragrances by customers'}
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
            {products.slice(0, 8).map((product) => (
              <BestSellerCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* View All Link */}
        <div className="text-center mt-10">
          <Link
            to="/shop?bestseller=true"
            className="btn-outline-gold inline-flex items-center gap-2 text-sm"
          >
            View All Best Sellers
            <HiShoppingBag className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
