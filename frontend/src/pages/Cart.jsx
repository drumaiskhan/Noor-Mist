import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { HiShoppingBag, HiArrowLeft } from 'react-icons/hi';
import useCartStore from '../store/cartStore';
import CartItem from '../components/Cart/CartItem';
import CartSummary from '../components/Cart/CartSummary';
import Button from '../components/UI/Button';

export default function Cart() {
  const { items, clearCart, getCartCount } = useCartStore();

  return (
    <>
      <Helmet>
        <title>Shopping Cart - Noor Mist</title>
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-32 md:pb-16">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-playfair font-bold">Shopping Cart</h1>
          <Link to="/shop" className="flex items-center gap-2 text-sm text-theme-muted hover:text-theme-primary">
            <HiArrowLeft className="w-4 h-4" />
            Continue Shopping
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <HiShoppingBag className="w-20 h-20 text-theme-muted mx-auto mb-6" />
            <h2 className="text-2xl font-playfair font-bold mb-4">Your cart is empty</h2>
            <p className="text-theme-muted mb-8">Looks like you haven't added any fragrances yet.</p>
            <Link to="/shop" className="btn-gold">Explore Perfumes</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <CartItem key={item.id} item={item} />
              ))}
              <button
                onClick={clearCart}
                className="text-sm text-danger hover:opacity-80 transition-colors"
              >
                Clear Cart
              </button>
            </div>
            <div className="lg:col-span-1">
              <div className="luxury-card p-6 sticky top-24">
                <h3 className="text-lg font-playfair font-bold mb-6">Order Summary</h3>
                <CartSummary />
                <Link to="/checkout" className="btn-gold w-full text-center block mt-6">
                  Proceed to Checkout
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
