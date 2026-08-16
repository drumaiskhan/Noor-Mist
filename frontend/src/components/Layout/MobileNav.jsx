import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HiX, HiHome, HiSearch, HiHeart, HiShoppingBag, HiUser } from 'react-icons/hi';
import useUIStore from '../../store/uiStore';
import useCartStore from '../../store/cartStore';
import useWishlistStore from '../../store/wishlistStore';
import useAuthStore from '../../store/authStore';

const menuItems = [
  { path: '/', label: 'Home', icon: HiHome },
  { path: '/shop', label: 'Shop', icon: HiSearch },
  { path: '/wishlist', label: 'Wishlist', icon: HiHeart },
  { path: '/cart', label: 'Cart', icon: HiShoppingBag },
  { path: '/account', label: 'Account', icon: HiUser },
];

export default function MobileNav() {
  const location = useLocation();
  const { isMobileMenuOpen, closeMobileMenu } = useUIStore();
  const cartCount = useCartStore((s) => s.getCartCount());
  const wishlistCount = useWishlistStore((s) => s.getWishlistCount());

  return (
    <AnimatePresence>
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={closeMobileMenu}
            className="fixed inset-0 bg-theme-bg/60 backdrop-blur-sm z-40 md:hidden"
          />

          {/* Menu Panel */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-noir border-r border-gold/10 z-50 md:hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gold/10">
              <span className="text-2xl font-playfair font-bold gold-text">Noor Mist</span>
              <button
                onClick={closeMobileMenu}
                className="p-2 text-theme-muted hover:text-theme-primary transition-colors"
              >
                <HiX className="w-6 h-6" />
              </button>
            </div>

            {/* Menu Items */}
            <nav className="p-4">
              <ul className="space-y-1">
                {menuItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;
                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        onClick={closeMobileMenu}
                        className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-all ${
                          isActive
                            ? 'bg-gold/10 text-gold'
                            : 'text-theme-muted hover:text-theme-primary hover:bg-theme-primary/5'
                        }`}
                      >
                        <div className="relative">
                          <Icon className="w-5 h-5" />
                          {item.path === '/cart' && cartCount > 0 && (
                            <span className="absolute -top-2 -right-2 bg-theme-primary text-theme-bg text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
                              {cartCount}
                            </span>
                          )}
                          {item.path === '/wishlist' && wishlistCount > 0 && (
                            <span className="absolute -top-2 -right-2 bg-gold text-theme-bg text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
                              {wishlistCount}
                            </span>
                          )}
                        </div>
                        <span className="font-montserrat text-sm uppercase tracking-wider">
                          {item.label}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>

              {/* Divider */}
              <div className="my-6 border-t border-gold/5" />

              {/* Additional Links */}
              <ul className="space-y-1">
                {[
                  { path: '/about', label: 'About Us' },
                  { path: '/contact', label: 'Contact' },
                  { path: '/faq', label: 'FAQ' },
                  { path: '/track-order', label: 'Track Order' },
                ].map((link) => (
                  <li key={link.path}>
                    <Link
                      to={link.path}
                      onClick={closeMobileMenu}
                      className="block px-4 py-3 text-theme-muted hover:text-gold transition-colors text-sm font-montserrat uppercase tracking-wider"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gold/10">
              <div className="flex gap-3">
                <Link
                  to="/login"
                  onClick={closeMobileMenu}
                  className="flex-1 text-center btn-outline-gold py-2! !px-4 !text-xs"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={closeMobileMenu}
                  className="flex-1 text-center btn-gold !py-2 !px-4 !text-xs"
                >
                  Register
                </Link>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
