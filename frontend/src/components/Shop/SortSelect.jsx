import React from 'react';
import { HiSortDescending } from 'react-icons/hi';
import { SORT_OPTIONS } from '../../utils/constants';

export default function SortSelect({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <HiSortDescending className="w-5 h-5 text-theme-muted" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-muted focus:border-theme-primary outline-none cursor-pointer"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value} className="bg-noir">
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
