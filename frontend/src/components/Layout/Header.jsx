import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HiSearch, HiHeart, HiShoppingBag, HiUser, HiMenu, HiX } from 'react-icons/hi';
import useCartStore from '../../store/cartStore';
import useWishlistStore from '../../store/wishlistStore';
import useAuthStore from '../../store/authStore';
import useUIStore from '../../store/uiStore';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const cartCount = useCartStore((s) => s.getCartCount());
  const wishlistCount = useWishlistStore((s) => s.getWishlistCount());
  const { isAuthenticated, user } = useAuthStore();
  const { isMobileMenuOpen, toggleMobileMenu, openCartDrawer, openSearch } = useUIStore();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${
          scrolled
            ? 'glass shadow-lg'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Mobile menu button */}
            <button
              onClick={toggleMobileMenu}
              className="md:hidden p-2 text-theme-text hover:text-theme-primary transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <HiX className="w-6 h-6" /> : <HiMenu className="w-6 h-6" />}
            </button>

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <span className="text-2xl md:text-3xl font-playfair font-bold gold-text">
                Noor Mist
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <Link to="/" className="text-sm text-theme-muted hover:text-theme-primary transition-colors font-montserrat uppercase tracking-wider">
                Home
              </Link>
              <Link to="/shop" className="text-sm text-theme-muted hover:text-theme-primary transition-colors font-montserrat uppercase tracking-wider">
                Shop
              </Link>
              <Link to="/about" className="text-sm text-theme-muted hover:text-theme-primary transition-colors font-montserrat uppercase tracking-wider">
                About
              </Link>
              <Link to="/contact" className="text-sm text-theme-muted hover:text-theme-primary transition-colors font-montserrat uppercase tracking-wider">
                Contact
              </Link>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-1 md:gap-3">
              {/* Search */}
              <button
                onClick={openSearch}
                className="p-2 text-theme-muted hover:text-theme-primary transition-colors"
                aria-label="Search"
              >
                <HiSearch className="w-5 h-5" />
              </button>

              {/* Wishlist */}
              <Link
                to="/wishlist"
                className="p-2 text-theme-muted hover:text-theme-primary transition-colors relative"
                aria-label="Wishlist"
              >
                <HiHeart className="w-5 h-5" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-theme-primary text-theme-bg text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              {/* Cart */}
              <button
                onClick={openCartDrawer}
                className="p-2 text-theme-muted hover:text-theme-primary transition-colors relative"
                aria-label="Cart"
              >
                <HiShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-theme-primary text-theme-bg text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* Account */}
              {isAuthenticated ? (
                <Link
                  to="/account"
                  className="p-2 text-theme-muted hover:text-theme-primary transition-colors"
                  aria-label="Account"
                >
                  <HiUser className="w-5 h-5" />
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="hidden md:block btn-outline-gold !py-2 !px-4 !text-xs"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </motion.header>

      {/* Spacer */}
      <div className="h-16 md:h-20" />
    </>
  );
}
