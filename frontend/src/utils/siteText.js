import { useQuery } from '@tanstack/react-query';
import { settingsAPI } from '../services/api';

// Editable button labels / empty-state copy shown across the storefront.
// Admin-editable via Settings > Site Text (settings.site_text, a single JSON
// blob), same pattern as Header's nav_links. Any key missing from what's
// saved falls back to the default here, so adding a new editable string
// later never breaks stores that haven't touched Site Text yet.
export const DEFAULT_SITE_TEXT = {
  add_to_cart: 'Add to Cart',
  buy_now: 'Buy Now',
  out_of_stock: 'Out of Stock',
  product_not_found_title: 'Product Not Found',
  no_products_title: 'No Products Found',
  no_products_subtitle: 'Try adjusting your filters or search terms.',
  empty_cart_title: 'Your cart is empty',
  empty_wishlist_title: 'Your wishlist is empty',
};

export function parseSiteText(siteSettings) {
  const raw = siteSettings?.site_text;
  if (!raw) return DEFAULT_SITE_TEXT;
  try {
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SITE_TEXT, ...(parsed && typeof parsed === 'object' ? parsed : {}) };
  } catch {
    return DEFAULT_SITE_TEXT;
  }
}

// Same queryKey as Header.jsx / Footer.jsx — react-query dedupes this into
// the single shared settings fetch rather than firing an extra request.
export function useSiteText() {
  const { data: siteSettings } = useQuery({
    queryKey: ['siteSettings'],
    queryFn: async () => {
      const { data } = await settingsAPI.get();
      return data.settings ?? {};
    },
    staleTime: 5 * 60 * 1000,
  });
  return parseSiteText(siteSettings);
}
