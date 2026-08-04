import React, { forwardRef } from 'react';
import { HiChevronDown } from 'react-icons/hi';

const Select = forwardRef(({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  required,
  disabled,
  error,
  className = '',
  ...props
}, ref) => {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={name} className="block text-sm text-theme-muted mb-2 font-montserrat tracking-wide">
          {label}
          {required && <span className="text-gold ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          className={`
            w-full appearance-none bg-noir-light border rounded-xl px-4 py-3 pr-10
            text-theme-text focus:border-theme-primary focus:ring-1 focus:ring-gold/30 outline-none
            transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
            text-sm font-inter cursor-pointer
            ${error ? 'border-danger' : 'border-theme-border'}
          `}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <HiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-muted pointer-events-none" />
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
});

Select.displayName = 'Select';
export default Select;
