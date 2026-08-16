export const APP_NAME = 'Noor Mist';
export const APP_TAGLINE = 'Where Luxury Meets Mystery';

export const GENDERS = [
  { value: 'male', label: 'Men' },
  { value: 'female', label: 'Women' },
  { value: 'unisex', label: 'Unisex' },
];

export const FRAGRANCE_FAMILIES = [
  { value: 'floral', label: 'Floral' },
  { value: 'woody', label: 'Woody' },
  { value: 'oriental', label: 'Oriental' },
  { value: 'fresh', label: 'Fresh' },
  { value: 'citrus', label: 'Citrus' },
  { value: 'oud', label: 'Oud' },
  { value: 'leather', label: 'Leather' },
  { value: 'spicy', label: 'Spicy' },
  { value: 'aquatic', label: 'Aquatic' },
  { value: 'gourmand', label: 'Gourmand' },
];

export const CONCENTRATIONS = [
  { value: 'parfum', label: 'Parfum (20-30%)' },
  { value: 'eau_de_parfum', label: 'Eau de Parfum (15-20%)' },
  { value: 'eau_de_toilette', label: 'Eau de Toilette (5-15%)' },
  { value: 'eau_de_cologne', label: 'Eau de Cologne (2-4%)' },
];

export const LONGEVITY_OPTIONS = [
  { value: 'weak', label: 'Weak (1-3 hrs)' },
  { value: 'moderate', label: 'Moderate (3-6 hrs)' },
  { value: 'long_lasting', label: 'Long Lasting (6-12 hrs)' },
  { value: 'eternal', label: 'Eternal (12+ hrs)' },
];

export const PROJECTION_OPTIONS = [
  { value: 'intimate', label: 'Intimate' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'strong', label: 'Strong' },
  { value: 'enormous', label: 'Enormous' },
];

export const SEASONS = [
  { value: 'summer', label: 'Summer' },
  { value: 'winter', label: 'Winter' },
  { value: 'spring', label: 'Spring' },
  { value: 'autumn', label: 'Autumn' },
  { value: 'all_season', label: 'All Season' },
];

export const OCCASIONS = [
  { value: 'daily', label: 'Daily Wear' },
  { value: 'office', label: 'Office' },
  { value: 'date', label: 'Date Night' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'party', label: 'Party' },
  { value: 'luxury_event', label: 'Luxury Event' },
  { value: 'casual', label: 'Casual' },
  { value: 'formal', label: 'Formal' },
];

export const SIZE_OPTIONS = [
  { value: 30, label: '30ml', price: 0 },
  { value: 50, label: '50ml', price: 0 },
  { value: 100, label: '100ml', price: 0 },
  { value: 150, label: '150ml', price: 0 },
];

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'bestselling', label: 'Best Selling' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'trending', label: 'Trending' },
];

// Keep in sync with the storefront's OrderTracking stepper
// (frontend/src/components/Account/OrderTracking.jsx) and the backend's
// validStatuses list (backend/routes/orders.js) — all three used to
// disagree on whether "packed" was a real, settable status, which meant
// the admin panel could never actually put an order into a state the
// storefront tracker and DB schema both expected.
export const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'text-yellow-400' },
  { value: 'confirmed', label: 'Confirmed', color: 'text-blue-400' },
  { value: 'processing', label: 'Processing', color: 'text-purple-400' },
  { value: 'packed', label: 'Packed', color: 'text-cyan-400' },
  { value: 'shipped', label: 'Shipped', color: 'text-orange-400' },
  { value: 'delivered', label: 'Delivered', color: 'text-green-400' },
  { value: 'cancelled', label: 'Cancelled', color: 'text-red-400' },
  { value: 'refunded', label: 'Refunded', color: 'text-gray-400' },
];

// The subset of ORDER_STATUSES that represents forward progress through
// fulfillment — same steps and order as the storefront tracker. Terminal
// exception states (cancelled/refunded) are handled separately in both
// places rather than being treated as a "step".
export const ORDER_PROGRESS_STEPS = ORDER_STATUSES.filter(
  (s) => !['cancelled', 'refunded'].includes(s.value)
);

export const PAYMENT_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'text-yellow-400' },
  { value: 'paid', label: 'Paid', color: 'text-green-400' },
  { value: 'failed', label: 'Failed', color: 'text-red-400' },
  { value: 'refunded', label: 'Refunded', color: 'text-gray-400' },
];

export const INVENTORY_THRESHOLDS = {
  HIGH: 50,
  MODERATE: 20,
  LOW: 10,
};

export const NAV_LINKS = [
  { path: '/', label: 'Home' },
  { path: '/shop', label: 'Shop' },
  { path: '/about', label: 'About' },
  { path: '/contact', label: 'Contact' },
];

export const BOTTOM_NAV_LINKS = [
  { path: '/', label: 'Home', icon: 'HiHome' },
  { path: '/shop', label: 'Shop', icon: 'HiSearch' },
  { path: '/wishlist', label: 'Wishlist', icon: 'HiHeart' },
  { path: '/cart', label: 'Cart', icon: 'HiShoppingBag' },
  { path: '/account', label: 'Account', icon: 'HiUser' },
];
