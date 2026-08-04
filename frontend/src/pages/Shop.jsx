import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { HiFilter, HiSearch } from 'react-icons/hi';
import { productAPI } from '../services/api';
import FilterPanel from '../components/Shop/FilterPanel';
import MobileFilters from '../components/Shop/MobileFilters';
import ProductGrid from '../components/Shop/ProductGrid';
import SortSelect from '../components/Shop/SortSelect';
import SearchBar from '../components/Shop/SearchBar';
import useUIStore from '../store/uiStore';

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isFilterOpen, openFilter, closeFilter, isSearchOpen, openSearch, closeSearch } = useUIStore();
  
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [filters, setFilters] = useState({
    gender: searchParams.get('gender') || '',
    fragrance_family: searchParams.get('fragrance_family') || '',
    concentration: searchParams.get('concentration') || '',
    season: searchParams.get('season') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
  });

  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [page, setPage] = useState(1);

  // Sync search param from URL (e.g. when SearchBar navigates here)
  useEffect(() => {
    const s = searchParams.get('search') || '';
    setSearch(s);
  }, [searchParams]);

  const { data, isLoading } = useQuery({
    queryKey: ['products', filters, sort, page, search],
    queryFn: () => productAPI.getAll({ ...filters, search, sort, page, limit: 24 }),
  });

  const products = data?.data?.products || [];
  const totalPages = data?.data?.pages || 1;

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPage(1);
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    if (sort !== 'newest') params.set('sort', sort);
    setSearchParams(params);
  };

  const handleSortChange = (newSort) => {
    setSort(newSort);
    const params = new URLSearchParams(searchParams);
    if (newSort !== 'newest') {
      params.set('sort', newSort);
    } else {
      params.delete('sort');
    }
    setSearchParams(params);
  };

  return (
    <>
      <Helmet>
        <title>Shop Luxury Perfumes - Noor Mist</title>
        <meta name="description" content="Browse our exclusive collection of luxury perfumes for men and women." />
      </Helmet>

      <SearchBar isOpen={isSearchOpen} onClose={closeSearch} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="section-title">Shop Perfumes</h1>
          <p className="section-subtitle">
            Discover our curated collection of luxury fragrances
          </p>
        </div>

        <div className="flex gap-8">
          {/* Desktop Filters */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24">
              <FilterPanel
                filters={filters}
                onFilterChange={handleFilterChange}
              />
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={openFilter}
                  className="lg:hidden flex items-center gap-2 px-4 py-2 border border-theme-border rounded-lg text-sm text-theme-muted hover:border-gold"
                >
                  <HiFilter className="w-4 h-4" />
                  Filters
                </button>
                <button
                  onClick={openSearch}
                  className="flex items-center gap-2 px-4 py-2 border border-theme-border rounded-lg text-sm text-theme-muted hover:border-gold"
                >
                  <HiSearch className="w-4 h-4" />
                  Search
                </button>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-sm text-theme-muted hidden sm:block">
                  {data?.data?.total || 0} products
                </p>
                <SortSelect value={sort} onChange={handleSortChange} />
              </div>
            </div>

            {/* Product Grid */}
            <ProductGrid products={products} isLoading={isLoading} />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-10">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`w-10 h-10 rounded-lg text-sm font-montserrat transition-all ${
                      page === i + 1
                        ? 'bg-gold text-theme-bg'
                        : 'border border-theme-border text-theme-muted hover:border-gold'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filters */}
      <MobileFilters
        isOpen={isFilterOpen}
        onClose={closeFilter}
        filters={filters}
        onFilterChange={handleFilterChange}
      />
    </>
  );
}
