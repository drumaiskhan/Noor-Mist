import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HiSearch, HiX } from 'react-icons/hi';
import { useQuery } from '@tanstack/react-query';
import { productAPI } from '../../services/api';
import { debounce, formatPrice, getMinPrice } from '../../utils/helpers';

export default function SearchBar({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const { data: results } = useQuery({
    queryKey: ['search', query],
    queryFn: () => productAPI.getAll({ search: query, limit: 5 }),
    enabled: query.length >= 2,
  });

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/shop?search=${encodeURIComponent(query.trim())}`);
      onClose?.();
      setQuery('');
    }
  };

  const handleSelect = (slug) => {
    navigate(`/product/${slug}`);
    onClose?.();
    setQuery('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50"
        >
          <div className="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm" onClick={onClose} />
          
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="relative max-w-2xl mx-auto mt-20 px-4"
          >
            <form onSubmit={handleSearch} className="relative">
              <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-muted" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                placeholder="Search perfumes, notes, brands..."
                className="w-full bg-noir-card border border-theme-border rounded-2xl pl-12 pr-12 py-4 text-theme-text text-lg focus:border-theme-primary outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-text"
                >
                  <HiX className="w-5 h-5" />
                </button>
              )}
            </form>

            {/* Search Suggestions */}
            {isFocused && query.length >= 2 && results?.data?.products?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 glass rounded-2xl overflow-hidden"
              >
                {results.data.products.slice(0, 5).map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleSelect(product.slug)}
                    className="flex items-center gap-4 w-full p-4 hover:bg-gold/5 transition-colors text-left"
                  >
                    <img
                      src={product.primary_image?.[0]?.url || '/placeholder.jpg'}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-theme-text font-medium truncate">{product.name}</p>
                      <p className="text-sm text-theme-muted">{product.brand_name || 'Noor Mist'}</p>
                    </div>
                    <span className="text-gold font-bold text-sm">
                      {formatPrice(getMinPrice(product.variants))}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}

            {query.length >= 2 && !results?.data?.products?.length && (
              <div className="mt-4 text-center text-theme-muted">
                No results found for "{query}"
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
