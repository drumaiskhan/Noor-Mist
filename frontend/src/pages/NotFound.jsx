import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';

export default function NotFound() {
  return (
    <>
      <Helmet>
        <title>404 - Page Not Found | Noor Mist</title>
      </Helmet>

      <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h1 className="text-8xl md:text-9xl font-playfair font-bold gold-text mb-4">404</h1>
          <h2 className="text-2xl md:text-3xl font-playfair font-bold mb-4">Page Not Found</h2>
          <p className="text-theme-muted mb-8 max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved.
            Let us help you find your way back.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/" className="btn-gold text-sm">Go Home</Link>
            <Link to="/shop" className="btn-outline-gold text-sm">Browse Shop</Link>
          </div>
        </motion.div>
      </div>
    </>
  );
}
