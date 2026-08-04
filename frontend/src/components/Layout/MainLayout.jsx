import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './Header';
import Footer from './Footer';
import MobileNav from './MobileNav';
import BottomNav from './BottomNav';
import CartDrawer from '../Cart/CartDrawer';
import SearchBar from '../Shop/SearchBar';
import AnnouncementBar from './AnnouncementBar';
import useUIStore from '../../store/uiStore';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const pageTransition = {
  type: 'tween',
  ease: 'easeInOut',
  duration: 0.4,
};

export default function MainLayout() {
  const location = useLocation();
  const { closeMobileMenu, closeCartDrawer, closeSearch, closeFilter, isSearchOpen } = useUIStore();

  // Close mobile menus on route change
  useEffect(() => {
    closeMobileMenu();
    closeCartDrawer();
    closeSearch();
    closeFilter();
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-noir flex flex-col">
      <AnnouncementBar />
      <Header />
      <MobileNav />
      
      <main className="flex-1 pb-16 md:pb-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />
      <BottomNav />
      <CartDrawer />
      <SearchBar isOpen={isSearchOpen} onClose={closeSearch} />
    </div>
  );
}
