import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';

import Header from './Header';
import Footer from './Footer';
import MobileNav from './MobileNav';
import BottomNav from './BottomNav';

import CartDrawer from '../Cart/CartDrawer';
import SearchBar from '../Shop/SearchBar';

import AnnouncementBar from './AnnouncementBar';
import MaintenancePage from '../../pages/MaintenancePage';

import useUIStore from '../../store/uiStore';
import useAuthStore from '../../store/authStore';
import { settingsAPI } from '../../services/api';
import { toBool } from '../../utils/helpers';


const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },

  animate: {
    opacity: 1,
    y: 0,
  },

  exit: {
    opacity: 0,
    y: -20,
  },
};


const pageTransition = {
  type: 'tween',
  ease: 'easeInOut',
  duration: 0.4,
};



export default function MainLayout() {

  const location = useLocation();

  const isAdmin = useAuthStore((s) => s.isAdmin);

  const { data: settings = {} } = useQuery({
    queryKey: ['siteSettings'],
    queryFn: async () => {
      const { data } = await settingsAPI.get();
      return data.settings || {};
    },
    staleTime: 60 * 1000,
  });

  // Maintenance mode gates the whole public storefront — admins (logged
  // into the site, not just viewing /admin) still see the real site so
  // they can check their work while it's on.
  const maintenanceActive = toBool(settings.maintenance_mode) && !isAdmin;

  const {
    closeMobileMenu,
    closeCartDrawer,
    closeSearch,
    closeFilter,
    isSearchOpen,
  } = useUIStore();




  // Close UI elements when route changes
  useEffect(() => {

    closeMobileMenu();

    closeCartDrawer();

    closeSearch();

    closeFilter();

    window.scrollTo(0, 0);

  }, [
    location.pathname
  ]);



  if (maintenanceActive) {
    return <MaintenancePage message={settings.maintenance_message} />;
  }



  return (

    <div className="min-h-screen bg-noir flex flex-col">

      {/* Small announcement strip */}
      <AnnouncementBar />



      <Header />



      <MobileNav />





      <main className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0">


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



      <SearchBar

        isOpen={isSearchOpen}

        onClose={closeSearch}

      />


    </div>

  );

}
