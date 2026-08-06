import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { HiFilter, HiSearch } from 'react-icons/hi';
import { productAPI, collectionsAPI } from '../services/api';
import FilterPanel from '../components/Shop/FilterPanel';
import MobileFilters from '../components/Shop/MobileFilters';
import ProductGrid from '../components/Shop/ProductGrid';
import SortSelect from '../components/Shop/SortSelect';
import SearchBar from '../components/Shop/SearchBar';
import BrandMark from '../components/UI/BrandMark';
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
    // Set when arriving from a collection tile or an announcement's
    // "Shop Now" button (?collection=<slug>) - kept separate from the
    // FilterPanel filters below since it isn't shown/cleared there.
    collection: searchParams.get('collection') || '',
  });

  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [page, setPage] = useState(1);

  // Sync search + collection params from URL (e.g. when navigated here from
  // the SearchBar, a collection tile, or an announcement popup button)
  useEffect(() => {
    const s = searchParams.get('search') || '';
    setSearch(s);
    const collection = searchParams.get('collection') || '';
    setFilters((prev) => (prev.collection === collection ? prev : { ...prev, collection }));
    setPage(1);
  }, [searchParams]);

  // Look up the active collection's display name for the page heading.
  const { data: collectionsData } = useQuery({
    queryKey: ['collectionsForShop'],
    queryFn: collectionsAPI.getAll,
    enabled: !!filters.collection,
  });
  const activeCollection = (collectionsData?.data?.collections || collectionsData?.data || [])
    .find((c) => c.slug === filters.collection);

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
          <BrandMark />
          <h1 className="section-title">
            {activeCollection ? activeCollection.name : 'Shop Perfumes'}
          </h1>
          <p className="section-subtitle">
            {activeCollection?.description || 'Discover our curated collection of luxury fragrances'}
          </p>
          {filters.collection && (
            <button
              type="button"
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                params.delete('collection');
                setSearchParams(params);
              }}
              className="mt-3 text-sm text-gold hover:underline"
            >
              Clear collection filter
            </button>
          )}
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
