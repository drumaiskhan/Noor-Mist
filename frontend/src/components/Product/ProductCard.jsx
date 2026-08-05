import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiHeart, HiShoppingBag, HiStar } from 'react-icons/hi';
import useCartStore from '../../store/cartStore';
import useWishlistStore from '../../store/wishlistStore';
import useAuthStore from '../../store/authStore';
import { formatPrice, calculateDiscount, getImageUrl, getMinPrice } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function ProductCard({ product }) {
  const navigate = useNavigate();
  const addToCart = useCartStore((s) => s.addToCart);
  const { toggleWishlist, isInWishlist } = useWishlistStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isWishlisted = isInWishlist(product.id);
  const imageUrl = getImageUrl(product);
  const minPrice = getMinPrice(product.variants);
  const firstVariant = product.variants?.[0];
  const discount = firstVariant ? calculateDiscount(firstVariant.price, firstVariant.sale_price) : 0;

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.variants?.length > 0) {
      addToCart(product, product.variants[0], 1);
      toast.success('Added to cart');
    }
  };

  const handleToggleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error('Please log in to save items to your wishlist');
      navigate('/login');
      return;
    }
    const result = await toggleWishlist(product);
    if (result.success) {
      toast.success(result.added ? 'Added to wishlist' : 'Removed from wishlist');
    } else {
      toast.error('Something went wrong — please try again');
    }
  };

  return (
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

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          {discount > 0 && (
            <span className="badge-sale text-xs font-bold px-2 py-1 rounded-full">
              -{discount}%
            </span>
          )}
          {product.is_new_arrival && (
            <span className="badge-new text-xs font-bold px-2 py-1 rounded-full">
              New
            </span>
          )}
          {product.is_limited_edition && (
            <span className="badge-limited text-xs font-bold px-2 py-1 rounded-full">
              Limited
            </span>
          )}
        </div>

        {/* Quick Actions */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleToggleWishlist}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
              isWishlisted
                ? 'bg-theme-primary text-theme-bg'
                : 'bg-theme-bg/60 text-theme-text hover:bg-theme-primary hover:text-theme-bg'
            }`}
          >
            <HiHeart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleAddToCart}
            className="w-9 h-9 rounded-full bg-theme-bg/60 text-theme-text hover:bg-theme-primary hover:text-theme-bg flex items-center justify-center transition-all"
            disabled={!product.variants?.length}
          >
            <HiShoppingBag className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Stock Warning */}
        {firstVariant && firstVariant.quantity <= 10 && firstVariant.quantity > 0 && (
          <div className="absolute bottom-3 left-3 right-3">
            <span className="text-xs text-red-400 bg-theme-bg/70 px-2 py-1 rounded-full">
              Only {firstVariant.quantity} left
            </span>
          </div>
        )}
        {firstVariant && firstVariant.quantity === 0 && (
          <div className="absolute inset-0 out-of-stock-overlay flex items-center justify-center">
            <span className="text-theme-text font-montserrat text-sm uppercase tracking-wider bg-red-500 px-4 py-2 rounded-full">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="product-card-info p-4">
        <h3 className="font-playfair font-bold text-theme-text text-lg mb-1 group-hover:text-theme-primary transition-colors truncate">
          {product.name}
        </h3>
        <p className="product-card-meta text-theme-muted text-sm mb-2 truncate">
          {product.fragrance_family || 'Eau de Parfum'}
        </p>

        {/* Rating */}
        {product.average_rating > 0 && (
          <div className="product-card-rating flex items-center gap-1 mb-3">
            <HiStar className="w-4 h-4 text-theme-primary" />
            <span className="text-sm text-theme-muted">{product.average_rating}</span>
            <span className="text-xs text-theme-muted opacity-60">({product.review_count})</span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center gap-2">
          <span className="text-theme-primary font-bold text-lg">
            {formatPrice(minPrice)}
          </span>
          {product.variants?.length > 1 && (
            <span className="text-xs text-theme-muted opacity-60">from</span>
          )}
        </div>

        {/* Variant Sizes */}
        {product.variants?.length > 0 && (
          <div className="product-card-meta flex gap-1 mt-2">
            {product.variants.slice(0, 3).map((v) => (
              <span
                key={v.id}
                className="text-xs text-theme-muted bg-theme-bg px-1.5 py-0.5 rounded"
              >
                {v.size_ml}ml
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
