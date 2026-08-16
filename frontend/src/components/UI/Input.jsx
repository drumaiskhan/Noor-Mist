import React, { forwardRef } from 'react';

const Input = forwardRef(({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
  disabled,
  error,
  className = '',
  inputClassName = '',
  icon,
  suffix,
  ...props
}, ref) => {
  return (
    <div className={`${className}`}>
      {label && (
        <label htmlFor={name} className="block text-sm text-theme-muted mb-2 font-montserrat tracking-wide">
          {label}
          {required && <span className="text-gold ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`
            w-full bg-theme-surface border rounded-xl px-4 py-3 text-theme-text placeholder-theme-muted/60
            focus:border-theme-primary focus:ring-1 focus:ring-theme-primary/30 outline-none transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed text-sm font-inter
            ${error ? 'border-danger' : 'border-theme-border'}
            ${icon ? 'pl-10' : ''}
            ${suffix ? 'pr-10' : ''}
            ${inputClassName}
          `}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-muted text-sm">
            {suffix}
          </span>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
