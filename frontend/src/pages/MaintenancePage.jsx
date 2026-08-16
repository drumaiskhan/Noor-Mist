import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { HiSparkles } from 'react-icons/hi';

// Shown to every non-admin visitor while Settings → "Enable maintenance
// mode" is on. Admins keep browsing the real storefront and the full admin
// panel throughout — see the maintenance check in MainLayout.jsx, which is
// what decides whether this renders instead of the normal <Outlet />.
export default function MaintenancePage({ message }) {
  return (
    <>
      <Helmet>
        <title>We'll be right back | Noor Mist</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen flex items-center justify-center px-4 bg-noir">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-lg"
        >
          <HiSparkles className="w-14 h-14 text-gold mx-auto mb-6" />
          <h1 className="text-3xl md:text-4xl font-playfair font-bold text-white mb-4">
            We'll be right back
          </h1>
          <p className="text-theme-muted leading-relaxed">
            {message || "Noor Mist is undergoing some scheduled maintenance right now. We're putting the finishing touches on things and will be back online shortly — thank you for your patience."}
          </p>
        </motion.div>
      </div>
    </>
  );
}
