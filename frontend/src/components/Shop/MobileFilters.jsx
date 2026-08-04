import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FilterPanel from './FilterPanel';

export default function MobileFilters({ isOpen, onClose, filters, onFilterChange }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-noir-light rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto lg:hidden"
          >
            <div className="w-12 h-1.5 bg-theme-border rounded-full mx-auto mb-6" />
            <FilterPanel
              filters={filters}
              onFilterChange={onFilterChange}
              onClose={onClose}
            />
            <div className="mt-6 pt-4 border-t border-gold/10">
              <button
                onClick={onClose}
                className="btn-gold w-full text-sm"
              >
                Apply Filters
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
