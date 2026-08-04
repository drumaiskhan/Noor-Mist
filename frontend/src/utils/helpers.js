export const formatPrice = (price, currency = '₨') => {
  if (price === null || price === undefined) return `${currency}0`;
  return `${currency}${Number(price).toLocaleString('en-PK')}`;
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
