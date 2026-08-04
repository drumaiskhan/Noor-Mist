import useCartStore from '../store/cartStore';

export default function useCart() {
  const store = useCartStore();
  return {
    items: store.items,
    isLoading: store.isLoading,
    isDrawerOpen: store.isDrawerOpen,
    addToCart: store.addToCart,
    removeFromCart: store.removeFromCart,
    updateQuantity: store.updateQuantity,
    clearCart: store.clearCart,
    getCartTotal: store.getCartTotal,
    getCartCount: store.getCartCount,
    toggleDrawer: store.toggleDrawer,
    setDrawerOpen: store.setDrawerOpen,
  };
}
