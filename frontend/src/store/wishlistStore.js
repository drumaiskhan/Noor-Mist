import { create } from 'zustand';
import { wishlistAPI } from '../services/api';
import { persist } from 'zustand/middleware';

const useWishlistStore = create(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,

      fetchWishlist: async () => {
        set({ isLoading: true });
        try {
          const { data } = await wishlistAPI.get();
          // Backend returns { wishlist: [...] } with each row shaped like
          // { id: <wishlist row id>, product_id, name, slug, image, variants }.
          // Normalize to the same product shape ProductCard/getImageUrl expect
          // everywhere else — critically, `id` here must be the PRODUCT id
          // (not the wishlist row's own id), or isInWishlist() can never
          // recognize an already-favorited item after a refresh.
          const normalized = (data.wishlist || []).map((row) => ({
            id: row.product_id,
            name: row.name,
            slug: row.slug,
            variants: row.variants || [],
            primary_image: row.image ? [{ url: row.image }] : [],
          }));
          set({ items: normalized, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
        }
      },

      toggleWishlist: async (product) => {
        const isInWishlist = get().items.some((item) => item.id === product.id);

        if (isInWishlist) {
          set((state) => ({
            items: state.items.filter((item) => item.id !== product.id),
          }));
          try {
            await wishlistAPI.remove(product.id);
            return { success: true, added: false };
          } catch (error) {
            // Revert — the server never actually removed it, so local state
            // shouldn't claim it's gone.
            set((state) => ({ items: [...state.items, product] }));
            return { success: false, added: false };
          }
        } else {
          set((state) => ({ items: [...state.items, product] }));
          try {
            await wishlistAPI.add(product.id);
            return { success: true, added: true };
          } catch (error) {
            // Revert — the server never actually saved it.
            set((state) => ({
              items: state.items.filter((item) => item.id !== product.id),
            }));
            return { success: false, added: true };
          }
        }
      },

      isInWishlist: (productId) => {
        return get().items.some((item) => item.id === productId);
      },

      getWishlistCount: () => {
        return get().items.length;
      },
    }),
    {
      name: 'noor-mist-wishlist',
      partialize: (state) => ({ items: state.items }),
    }
  )
);

export default useWishlistStore;
