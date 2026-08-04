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
          set({ items: data.items || [], isLoading: false });
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
          } catch (error) {
            console.error('Failed to remove from wishlist:', error);
          }
          return false;
        } else {
          set((state) => ({ items: [...state.items, product] }));
          try {
            await wishlistAPI.add(product.id);
          } catch (error) {
            console.error('Failed to add to wishlist:', error);
          }
          return true;
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
