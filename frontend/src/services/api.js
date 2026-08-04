import axios from 'axios';

// Use VITE_API_URL if set, otherwise default to relative /api
// (Vite dev-server proxies /api → localhost:3001; Netlify redirect proxies it in prod)
const RAW_API_URL = import.meta.env.VITE_API_URL || "/api";
const API_URL = RAW_API_URL.replace(/\/+$/, "").endsWith("/api")
  ? RAW_API_URL.replace(/\/+$/, "")
  : `${RAW_API_URL.replace(/\/+$/, "")}/api`;
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 15000,
});

// Request interceptor - attach auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('noor_mist_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('noor_mist_token');
      localStorage.removeItem('noor_mist_user');
      const isAdmin = window.location.pathname.startsWith('/admin');
      const loginPath = isAdmin ? '/admin/login' : '/login';
      if (window.location.pathname !== loginPath) {
        window.location.href = loginPath;
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changeEmail: (data) => api.put('/auth/change-email', data),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// Products API
export const productAPI = {
  getAll: (params) => api.get('/products', { params }),
  getOne: (slug) => api.get(`/products/${slug}`),
  getOneById: (id) => api.get(`/products/admin/${id}`),
  getFeatured: () => api.get('/products', { params: { featured: true, limit: 8 } }),
  getBestSellers: () => api.get('/products', { params: { bestseller: true, limit: 8 } }),
  getNewArrivals: () => api.get('/products', { params: { new_arrival: true, limit: 8 } }),
  getLimitedEdition: () => api.get('/products', { params: { limited_edition: true, limit: 8 } }),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  exportXml: () => api.get('/products/export-xml', { responseType: 'blob' }),
  importXml: (xmlText) => api.post('/products/import-xml', { xml: xmlText }, {
    headers: { 'Content-Type': 'application/json' },
  }),
};

// Categories API
export const categoryAPI = {
  getAll: () => api.get('/categories'),
  getOne: (slug) => api.get(`/categories/${slug}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

// Collections API
export const collectionsAPI = {
  getAll: () => api.get('/collections'),
  getOne: (slug) => api.get(`/collections/${slug}`),
  create: (data) => api.post('/collections', data),
  update: (id, data) => api.put(`/collections/${id}`, data),
  delete: (id) => api.delete(`/collections/${id}`),
};

// Cart API
export const cartAPI = {
  get: () => api.get('/orders/cart'),
  add: (data) => api.post('/orders/cart', data),
  update: (id, data) => api.put(`/orders/cart/${id}`, data),
  remove: (id) => api.delete(`/orders/cart/${id}`),
};

// Orders API
export const orderAPI = {
  getAll: (params) => api.get('/orders', { params }),
  getOne: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  updateStatus: (id, status) => api.put(`/orders/${id}/status`, { status }),
  delete: (id) => api.delete(`/orders/${id}`),
};

// Reviews API
export const reviewAPI = {
  getAll: (params) => api.get('/reviews', { params }),
  getFeatured: (limit = 4) => api.get('/reviews/featured', { params: { limit } }),
  getByProduct: (productId, params) => api.get(`/reviews/product/${productId}`, { params }),
  create: (data) => api.post('/reviews', data),
  updateStatus: (id, status) => api.put(`/reviews/${id}/status`, { status }),
  reply: (id, reply) => api.put(`/reviews/${id}/reply`, { reply }),
  addImages: (id, files) => {
    const form = new FormData();
    files.forEach((f) => form.append('images', f));
    return api.post(`/reviews/${id}/images`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  uploadImages: (id, files) => {
    const form = new FormData();
    files.forEach((f) => form.append('images', f));
    return api.post(`/reviews/${id}/images`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  deleteImage: (reviewId, imageId) => api.delete(`/reviews/${reviewId}/images/${imageId}`),
  delete: (id) => api.delete(`/reviews/${id}`),
};

// Wishlist API
export const wishlistAPI = {
  get: () => api.get('/users/wishlist'),
  add: (productId) => api.post('/users/wishlist', { productId }),
  remove: (productId) => api.delete(`/users/wishlist/${productId}`),
};

// Theme API
export const themeAPI = {
  getAll: () => api.get('/themes'),
  getActive: () => api.get('/themes/active'),
  apply: (id) => api.post(`/themes/${id}/apply`),
  create: (data) => api.post('/themes', data),
  update: (id, data) => api.put(`/themes/${id}`, data),
  duplicate: (id, name) => api.post(`/themes/${id}/duplicate`, name ? { name } : {}),
  remove: (id) => api.delete(`/themes/${id}`),
  resetDefault: () => api.post('/themes/reset-default'),
};

// Homepage API
export const homepageAPI = {
  getSections: () => api.get('/homepage'),
  updateSection: (id, data) => api.put(`/homepage/${id}`, data),
  reorder: (data) => api.put('/homepage/reorder', data),
};

// Analytics API
export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getSales: (params) => api.get('/analytics/sales', { params }),
  getInventory: () => api.get('/analytics/inventory'),
  trackEvent: (data) => api.post('/analytics/events', data),
};

// Inventory API
export const inventoryAPI = {
  getOverview: () => api.get('/inventory'),
  getLowStock: () => api.get('/inventory/low-stock'),
  updateStock: (productId, variantId, quantity) =>
    api.put(`/inventory/${productId}/${variantId}`, { quantity }),
};

// Settings API
export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
};

// SEO API
export const seoAPI = {
  getAll: () => api.get('/seo'),
  getByPath: (path) => api.get(`/seo/${path}`),
  update: (path, data) => api.put(`/seo/${path}`, data),
  getSitemap: () => api.get('/seo/sitemap'),
};

// Media API
export const mediaAPI = {
  getAll: (params) => api.get('/media', { params }),
  delete: (id) => api.delete(`/media/${id}`),
  bulkDelete: (ids) => api.post('/media/bulk-delete', { ids }),
  update: (id, data) => api.patch(`/media/${id}`, data),
};

// Email API
export const emailAPI = {
  getSettings: () => api.get('/email/settings'),
  updateSettings: (data) => api.put('/email/settings', data),
  test: (data) => api.post('/email/test', data),
};

// Pages API
export const pagesAPI = {
  get: (page) => api.get(`/pages/${page}`),
  update: (page, data) => api.put(`/pages/${page}`, data),
};

// Upload API
export const uploadAPI = {
  image: (file) => {
    const fd = new FormData();
    fd.append('image', file);
    return api.post('/upload/image', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  images: (files) => {
    const fd = new FormData();
    files.forEach((f) => fd.append('images', f));
    return api.post('/upload/images', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Users API
export const userAPI = {
  getAll: (params) => api.get('/users', { params }),
  getOne: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

// Coupons API
export const couponAPI = {
  getAll: () => api.get('/coupons'),
  create: (data) => api.post('/coupons', data),
  update: (id, data) => api.put(`/coupons/${id}`, data),
  delete: (id) => api.delete(`/coupons/${id}`),
  validate: (code) => api.post('/coupons/validate', { code }),
};

// Payments API
export const paymentAPI = {
  // Public
  getMethods: () => api.get('/payments/methods'),
  getBankAccounts: () => api.get('/payments/bank-accounts'),
  getWallets: () => api.get('/payments/wallets'),

  // Customer — upload proof
  submitProof: (formData) => api.post('/payments/proof', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getProofByOrder: (orderId) => api.get(`/payments/proof/order/${orderId}`),

  // Admin — verification
  getProofs: (params) => api.get('/payments/proofs', { params }),
  getProof: (id) => api.get(`/payments/proofs/${id}`),
  verifyProof: (id, data) => api.put(`/payments/proofs/${id}/verify`, data),
  getStats: () => api.get('/payments/stats'),
  exportCsv: () => api.get('/payments/export', { responseType: 'blob' }),

  // Admin — methods
  getAdminMethods: () => api.get('/payments/admin/methods'),
  updateMethod: (key, data) => api.put(`/payments/admin/methods/${key}`, data),
  uploadMethodLogo: (key, file) => {
    const fd = new FormData();
    fd.append('logo', file);
    return api.post(`/payments/admin/methods/${key}/logo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },

  // Admin — bank accounts
  getAdminBankAccounts: () => api.get('/payments/admin/bank-accounts'),
  createBankAccount: (formData) => api.post('/payments/admin/bank-accounts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  updateBankAccount: (id, formData) => api.put(`/payments/admin/bank-accounts/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteBankAccount: (id) => api.delete(`/payments/admin/bank-accounts/${id}`),

  // Admin — wallets
  getAdminWallets: () => api.get('/payments/admin/wallets'),
  updateWallet: (type, formData) => api.put(`/payments/admin/wallets/${type}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// Bank Settings API (admin)
export const bankSettingsAPI = {
  get: () => api.get('/bank-settings'),
  save: (data) => api.put('/bank-settings', data),
  uploadQr: (file) => {
    const fd = new FormData();
    fd.append('qr_image', file);
    return api.post('/bank-settings/qr', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default api;
