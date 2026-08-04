import useWishlistStore from '../store/wishlistStore';

export default function useWishlist() {
  const { items, addToWishlist, removeFromWishlist, isInWishlist, toggleWishlist, syncWithServer } = useWishlistStore();
  return { items, addToWishlist, removeFromWishlist, isInWishlist, toggleWishlist, syncWithServer };
}
