import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiHome, HiSearch, HiHeart, HiShoppingBag, HiUser } from 'react-icons/hi';
import useCartStore from '../../store/cartStore';
import useWishlistStore from '../../store/wishlistStore';

const navItems = [
  { path: '/', label: 'Home', icon: HiHome },
  { path: '/shop', label: 'Shop', icon: HiSearch },
  { path: '/wishlist', label: 'Wishlist', icon: HiHeart },
  { path: '/cart', label: 'Cart', icon: HiShoppingBag },
  { path: '/account', label: 'Account', icon: HiUser },
];

export default function BottomNav() {
  const location = useLocation();
  const cartCount = useCartStore((s) => s.getCartCount());
  const wishlistCount = useWishlistStore((s) => s.getWishlistCount());

  if (location.pathname.startsWith('/admin')) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-noir border-t border-gold/10 z-30 md:hidden pb-safe">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
          return (
            <Link
              key={path}
              to={path}
              className="flex flex-col items-center justify-center gap-1 relative py-1 px-3"
            >
              {isActive && (
                <motion.span
                  layoutId="bottomNavIndicator"
                  className="absolute top-0 w-8 h-0.5 bg-gold rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <div className="relative">
                <Icon
                  className={`text-xl transition-colors ${
                    isActive ? 'text-theme-primary' : 'text-theme-muted'
                  }`}
                />
                {path === '/cart' && cartCount > 0 && (
                  <span className="absolute -top-2 -right-3 bg-theme-primary text-theme-bg text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
                {path === '/wishlist' && wishlistCount > 0 && (
                  <span className="absolute -top-2 -right-3 bg-theme-primary text-theme-bg text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {wishlistCount > 9 ? '9+' : wishlistCount}
                  </span>
                )}
              </div>
              <span
                className={`text-xs font-montserrat transition-colors ${
                  isActive ? 'text-theme-primary' : 'text-theme-muted'
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
