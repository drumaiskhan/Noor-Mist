import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { couponAPI } from '../services/api';

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,
      error: null,
      isDrawerOpen: false,
      appliedCoupon: null,
      couponDiscount: 0,

      setDrawerOpen: (open) => set({ isDrawerOpen: open }),
      toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),

      addToCart: (product, variant, quantity = 1) => {
        const currentItems = get().items;
        const existingIndex = currentItems.findIndex(
          (item) => item.product_id === product.id && item.variant_id === variant.id
        );

        if (existingIndex > -1) {
          const updatedItems = [...currentItems];
          updatedItems[existingIndex] = {
            ...updatedItems[existingIndex],
            quantity: updatedItems[existingIndex].quantity + quantity,
          };
          set({ items: updatedItems });
        } else {
          const newItem = {
            id: `${product.id}-${variant.id}-${Date.now()}`,
            product_id: product.id,
            variant_id: variant.id,
            product_name: product.name,
            product_image: product.primary_image?.[0]?.url || product.images?.[0]?.url || '',
            product_slug: product.slug,
            variant_size: `${variant.size_ml}ml`,
            variant_sku: variant.sku,
            price: parseFloat(variant.sale_price || variant.price),
            quantity,
            max_quantity: variant.quantity,
          };
          set({ items: [...currentItems, newItem] });
        }
        // Recalculate coupon discount after adding item
        get()._recalculateCouponDiscount();
      },

      removeFromCart: (itemId) => {
        const updatedItems = get().items.filter((item) => item.id !== itemId);
        set({ items: updatedItems });
        get()._recalculateCouponDiscount();
      },

      updateQuantity: (itemId, quantity) => {
        if (quantity < 1) {
          get().removeFromCart(itemId);
          return;
        }
        const item = get().items.find((i) => i.id === itemId);
        const safeQty = item ? Math.min(quantity, item.max_quantity) : quantity;
        const updatedItems = get().items.map((i) =>
          i.id === itemId ? { ...i, quantity: safeQty } : i
        );
        set({ items: updatedItems });
        get()._recalculateCouponDiscount();
      },

      clearCart: () => {
        set({ items: [], appliedCoupon: null, couponDiscount: 0 });
      },

      // Coupon actions
      applyCoupon: async (code) => {
        if (!code.trim()) return { success: false, message: 'Please enter a coupon code' };
        try {
          const { data } = await couponAPI.validate(code.trim());
          const coupon = data.coupon;
          const subtotal = get().getCartTotal();
          if (subtotal < parseFloat(coupon.minimum_order)) {
            return {
              success: false,
              message: `Minimum order of ₨${Number(coupon.minimum_order).toLocaleString()} required`,
            };
          }
          const discount =
            coupon.type === 'percentage'
              ? subtotal * (coupon.value / 100)
              : parseFloat(coupon.value);
          set({ appliedCoupon: coupon, couponDiscount: Math.min(discount, subtotal) });
          return { success: true, message: `Coupon applied! You saved ₨${Math.round(Math.min(discount, subtotal)).toLocaleString()}` };
        } catch (err) {
          const msg = err.response?.data?.error || 'Invalid or expired coupon code';
          return { success: false, message: msg };
        }
      },

      removeCoupon: () => {
        set({ appliedCoupon: null, couponDiscount: 0 });
      },

      _recalculateCouponDiscount: () => {
        const { appliedCoupon, items } = get();
        if (!appliedCoupon) return;
        const subtotal = items.reduce((t, i) => t + i.price * i.quantity, 0);
        if (subtotal < parseFloat(appliedCoupon.minimum_order)) {
          set({ appliedCoupon: null, couponDiscount: 0 });
          return;
        }
        const discount =
          appliedCoupon.type === 'percentage'
            ? subtotal * (appliedCoupon.value / 100)
            : parseFloat(appliedCoupon.value);
        set({ couponDiscount: Math.min(discount, subtotal) });
      },

      getCartTotal: () => {
        return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
      },

      getCartCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },

      getItemCount: () => get().items.length,
    }),
    {
      name: 'noor-mist-cart',
      partialize: (state) => ({
        items: state.items,
        appliedCoupon: state.appliedCoupon,
        couponDiscount: state.couponDiscount,
      }),
    }
  )
);

export default useCartStore;
