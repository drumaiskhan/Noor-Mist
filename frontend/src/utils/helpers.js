export const formatPrice = (price, currency) => {
  const activeCurrency = currency ?? localStorage.getItem('noor_mist_currency') ?? '₨';
  if (price === null || price === undefined) return `${activeCurrency}0`;
  return `${activeCurrency}${Number(price).toLocaleString('en-PK')}`;
};

export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const generateSlug = (text) => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

export const calculateDiscount = (price, salePrice) => {
  if (!salePrice || salePrice >= price) return 0;
  return Math.round(((price - salePrice) / price) * 100);
};

export const getStockStatus = (quantity) => {
  if (quantity === 0) return { label: 'Out of Stock', color: 'stock-low', class: 'text-danger' };
  if (quantity <= 10) return { label: `Only ${quantity} left`, color: 'stock-low', class: 'text-danger' };
  if (quantity <= 20) return { label: 'Low Stock', color: 'stock-moderate', class: 'text-warning' };
  return { label: 'In Stock', color: 'stock-high', class: 'text-success' };
};

export const getInitials = (firstName, lastName) => {
  const first = firstName?.charAt(0)?.toUpperCase() || '';
  const last = lastName?.charAt(0)?.toUpperCase() || '';
  return `${first}${last}` || '?';
};

export const getRatingStars = (rating) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(rating)) {
      stars.push('full');
    } else if (i - 0.5 <= rating) {
      stars.push('half');
    } else {
      stars.push('empty');
    }
  }
  return stars;
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const getImageUrl = (product) => {
  if (product.primary_image && product.primary_image.length > 0) {
    return product.primary_image[0].url;
  }
  if (product.images && product.images.length > 0) {
    return product.images[0].url;
  }
  return '/images/placeholder-perfume.jpg';
};

export const getMinPrice = (variants) => {
  if (!variants || variants.length === 0) return 0;
  return Math.min(...variants.map((v) => v.sale_price || v.price));
};

export const getMaxPrice = (variants) => {
  if (!variants || variants.length === 0) return 0;
  return Math.max(...variants.map((v) => v.sale_price || v.price));
};

export const getTotalStock = (variants) => {
  if (!variants || variants.length === 0) return 0;
  return variants.reduce((sum, v) => sum + v.quantity, 0);
};

// Settings are persisted as TEXT in the database, so a boolean field like
// maintenance_mode or announcement_enabled comes back from the API as the
// *string* "true"/"false" — and since any non-empty string is truthy in
// JS, a naive `checked={form.x}` or `if (settings.x)` reads a saved
// "false" as on. This normalizes any of those shapes to a real boolean.
export const toBool = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true' || value === '1';
  return !!value;
};

// Renders whatever an admin pastes into the Contact page's "map" field as a
// working embedded map. The Google Maps *share* link customers usually copy
// (maps.google.com/maps/place/..., maps.app.goo.gl/...) can never be put
// directly into an <iframe> — Google serves that page with
// X-Frame-Options: SAMEORIGIN, so the iframe silently renders blank with no
// error event to catch. Only a real *embed* URL (Maps → Share → Embed a
// map → copy HTML → the iframe's src) or a plain address/place name can
// actually be framed, so anything else falls back to a real Google Maps
// src built from that text, and a plain external link is always shown too
// so the location is never a dead end even if the embed can't render.
export const getMapEmbedSrc = (input) => {
  if (!input) return null;
  const value = input.trim();
  if (!value) return null;
  if (value.includes('/maps/embed') || value.includes('output=embed')) return value;
  if (!/^https?:\/\//i.test(value)) {
    return `https://www.google.com/maps?q=${encodeURIComponent(value)}&output=embed`;
  }
  // A share link — not embeddable, caller should fall back to a plain link.
  return null;
};

// A normal clickable link to the same place, used as the fallback (or a
// companion "Open in Google Maps" link) wherever the embed can't render.
export const getMapLinkHref = (input) => {
  if (!input) return null;
  const value = input.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`;
};

export const classNames = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

// Updates the <link rel="icon"> in <head> to the given URL, creating it if
// missing (index.html only ships a static default favicon). Also updates the
// tab title when a site name is provided.
export const applySiteIcon = ({ favicon_url, site_name } = {}) => {
  if (favicon_url) {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = favicon_url;
  }
  if (site_name) {
    document.title = site_name;
  }
};
