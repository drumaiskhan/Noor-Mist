import React from 'react';
import { motion } from 'framer-motion';
import { HiX } from 'react-icons/hi';
import {
  GENDERS, FRAGRANCE_FAMILIES, CONCENTRATIONS,
  LONGEVITY_OPTIONS, SEASONS, OCCASIONS,
} from '../../utils/constants';

export default function FilterPanel({ filters, onFilterChange, onClose }) {
  const handleChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFilterChange({});
  };

  const activeFilterCount = Object.values(filters).filter((v) => v).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-playfair font-bold">Filters</h3>
        <div className="flex items-center gap-3">
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-sm text-gold hover:underline"
            >
              Clear All
            </button>
          )}
          <button onClick={onClose} className="lg:hidden text-theme-muted">
            <HiX className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Gender */}
      <FilterSection title="Gender">
        <div className="flex flex-wrap gap-2">
          {GENDERS.map((g) => (
            <FilterButton
              key={g.value}
              active={filters.gender === g.value}
              onClick={() => handleChange('gender', filters.gender === g.value ? '' : g.value)}
            >
              {g.label}
            </FilterButton>
          ))}
        </div>
      </FilterSection>

      {/* Fragrance Family */}
      <FilterSection title="Fragrance Family">
        <div className="flex flex-wrap gap-2">
          {FRAGRANCE_FAMILIES.map((f) => (
            <FilterButton
              key={f.value}
              active={filters.fragrance_family === f.value}
              onClick={() => handleChange('fragrance_family', filters.fragrance_family === f.value ? '' : f.value)}
            >
              {f.label}
            </FilterButton>
          ))}
        </div>
      </FilterSection>

      {/* Concentration */}
      <FilterSection title="Concentration">
        <div className="space-y-2">
          {CONCENTRATIONS.map((c) => (
            <FilterCheckbox
              key={c.value}
              checked={filters.concentration === c.value}
              onChange={() => handleChange('concentration', filters.concentration === c.value ? '' : c.value)}
              label={c.label}
            />
          ))}
        </div>
      </FilterSection>

      {/* Price Range */}
      <FilterSection title="Price Range">
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.minPrice || ''}
            onChange={(e) => handleChange('minPrice', e.target.value)}
            className="w-full bg-theme-bg border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text focus:border-theme-primary outline-none"
          />
          <span className="text-theme-muted">-</span>
          <input
            type="number"
            placeholder="Max"
            value={filters.maxPrice || ''}
            onChange={(e) => handleChange('maxPrice', e.target.value)}
            className="w-full bg-theme-bg border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text focus:border-theme-primary outline-none"
          />
        </div>
      </FilterSection>

      {/* Season */}
      <FilterSection title="Season">
        <div className="flex flex-wrap gap-2">
          {SEASONS.map((s) => (
            <FilterButton
              key={s.value}
              active={filters.season === s.value}
              onClick={() => handleChange('season', filters.season === s.value ? '' : s.value)}
            >
              {s.label}
            </FilterButton>
          ))}
        </div>
      </FilterSection>
    </div>
  );
}

function FilterSection({ title, children }) {
  return (
    <div>
      <h4 className="text-sm font-montserrat text-theme-muted uppercase tracking-wider mb-3">
        {title}
      </h4>
      {children}
    </div>
  );
}

function FilterButton({ active, onClick, children }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-montserrat transition-all border ${
        active
          ? 'bg-gold/10 border-gold text-gold'
          : 'border-theme-border text-theme-muted hover:border-theme-muted'
      }`}
    >
      {children}
    </motion.button>
  );
}

function FilterCheckbox({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 rounded border-theme-border text-theme-primary focus:ring-theme-primary bg-theme-bg"
      />
      <span className="text-sm text-theme-muted group-hover:text-theme-text transition-colors">
        {label}
      </span>
    </label>
  );
}
