import { create } from 'zustand';

const useUIStore = create((set) => ({
  isMobileMenuOpen: false,
  isCartDrawerOpen: false,
  isSearchOpen: false,
  isFilterOpen: false,
  activeModal: null,
  modalData: null,
  isLoading: false,
  loadingMessage: '',

  toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
  closeMobileMenu: () => set({ isMobileMenuOpen: false }),

  toggleCartDrawer: () => set((state) => ({ isCartDrawerOpen: !state.isCartDrawerOpen })),
  openCartDrawer: () => set({ isCartDrawerOpen: true }),
  closeCartDrawer: () => set({ isCartDrawerOpen: false }),

  toggleSearch: () => set((state) => ({ isSearchOpen: !state.isSearchOpen })),
  openSearch: () => set({ isSearchOpen: true }),
  closeSearch: () => set({ isSearchOpen: false }),

  toggleFilter: () => set((state) => ({ isFilterOpen: !state.isFilterOpen })),
  openFilter: () => set({ isFilterOpen: true }),
  closeFilter: () => set({ isFilterOpen: false }),

  openModal: (modalName, data = null) =>
    set({ activeModal: modalName, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),

  setLoading: (loading, message = '') =>
    set({ isLoading: loading, loadingMessage: message }),
}));

export default useUIStore;
