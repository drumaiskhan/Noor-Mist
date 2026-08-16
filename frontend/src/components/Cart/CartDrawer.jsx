import React from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HiX, HiShoppingBag } from 'react-icons/hi';
import useCartStore from '../../store/cartStore';
import useUIStore from '../../store/uiStore';
import CartItem from './CartItem';
import CartSummary from './CartSummary';

export default function CartDrawer() {
  const { items, getCartTotal, getCartCount } = useCartStore();
  const { isCartDrawerOpen, closeCartDrawer } = useUIStore();

  return (
    <AnimatePresence>
      {isCartDrawerOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCartDrawer}
            className="fixed inset-0 bg-theme-bg/60 z-40"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-noir-light border-l border-gold/10 z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gold/10">
              <div>
                <h2 className="text-xl font-playfair font-bold">Shopping Cart</h2>
                <p className="text-sm text-theme-muted">{getCartCount()} items</p>
              </div>
              <button onClick={closeCartDrawer} className="text-theme-muted hover:text-theme-text">
                <HiX className="w-6 h-6" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-6">
              {items.length === 0 ? (
                <div className="text-center py-12">
                  <HiShoppingBag className="w-16 h-16 text-theme-muted opacity-50 mx-auto mb-4" />
                  <p className="text-theme-muted text-lg mb-2">Your cart is empty</p>
                  <Link
                    to="/shop"
                    onClick={closeCartDrawer}
                    className="text-gold hover:underline text-sm"
                  >
                    Start Shopping
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <CartItem key={item.id} item={item} />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-gold/10 p-6">
                <CartSummary />
                <Link
                  to="/checkout"
                  onClick={closeCartDrawer}
                  className="btn-gold w-full text-center block mt-4"
                >
                  Proceed to Checkout
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
