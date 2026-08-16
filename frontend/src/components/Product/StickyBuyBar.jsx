import React from 'react';
import { motion } from 'framer-motion';
import { HiShoppingBag } from 'react-icons/hi';
import useCartStore from '../../store/cartStore';
import { formatPrice, getStockStatus } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function StickyBuyBar({ product, selectedVariant, quantity = 1 }) {
  const addToCart = useCartStore((s) => s.addToCart);

  if (!selectedVariant || !product) return null;

  const stockStatus = getStockStatus(selectedVariant.quantity);
  const currentPrice = selectedVariant.sale_price || selectedVariant.price;
  const isOutOfStock = selectedVariant.quantity === 0;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addToCart(product, selectedVariant, quantity);
    toast.success(`${product.name} (${selectedVariant.size_ml}ml) added to cart`);
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    addToCart(product, selectedVariant, quantity);
    window.location.href = '/checkout';
  };

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="sticky-buy-bar md:hidden"
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-theme-muted truncate">
            {product.name} • {selectedVariant.size_ml}ml
          </p>
          <div className="flex items-center gap-2">
            <span className="text-gold font-bold text-lg">
              {formatPrice(currentPrice * quantity)}
            </span>
            {quantity > 1 && (
              <span className="text-xs text-theme-muted opacity-70">
                ({quantity} × {formatPrice(currentPrice)})
              </span>
            )}
          </div>
          {!isOutOfStock && selectedVariant.quantity <= 10 && (
            <span className="text-xs text-danger">{stockStatus.label}</span>
          )}
        </div>

        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className="btn-outline-gold !py-2.5 !px-5 !text-xs flex-shrink-0"
        >
          <HiShoppingBag className="w-4 h-4" />
        </button>
        <button
          onClick={handleBuyNow}
          disabled={isOutOfStock}
          className="btn-gold !py-2.5 !px-6 !text-xs flex-shrink-0"
        >
          {isOutOfStock ? 'Sold Out' : 'Buy Now'}
        </button>
      </div>
    </motion.div>
  );
}
