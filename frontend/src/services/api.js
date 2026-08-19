import axios from 'axios';

// Domain-independent by default: with no VITE_API_URL set, production
// builds call the relative "/api" path, which Netlify proxies to the
// Railway backend (see netlify.toml) — so the exact same build works on
// noormist.me, a future custom domain, or the Netlify subdomain without
// a rebuild. Local dev falls back to the backend dev server directly
// (Vite's own "/api" proxy in vite.config.js covers relative calls too,
// this fallback just keeps things working if that ever changes).
// VITE_API_URL remains supported for anyone who wants to point a build
// at a specific backend URL explicitly (e.g. a staging backend).
// Production uses the Railway API directly instead of relying on a
// domain-specific Netlify /api proxy. This makes the same frontend build
// work on the Netlify subdomain and on any custom domain.
// VITE_API_URL can still override this for staging/custom deployments.
const RAW_API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? "http://localhost:3001/api"
    : "https://noor-mist-production.up.railway.app/api");
// Guard against a misconfigured env var that omits the /api segment
const API_URL = RAW_API_URL.replace(/\/+$/, "").endsWith("/api")
  ? RAW_API_URL.replace(/\/+$/, "")
  : `${RAW_API_URL.replace(/\/+$/, "")}/api`;
// Exported so components can resolve relative, backend-hosted file paths
// (e.g. locally-stored payment screenshots/QR codes) into absolute URLs.
export { API_URL };

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
  verifyEmail: (data) => api.post('/auth/verify-email', data),
  verifyEmailOtp: (data) => api.post('/auth/verify-email-otp', data),
  resendVerification: (data) => api.post('/auth/resend-verification', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changeEmail: (data) => api.put('/auth/change-email', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  verifyOtp: (data) => api.post('/auth/verify-otp', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

// Products API
export const productAPI = {
  getAll: (params) => api.get('/products', { params }),
  getOne: (slug) => api.get(`/products/${slug}`),
  // Admin edit screens link by numeric id, not slug, and need to be able to
  // load drafts/archived products too — use the dedicated admin endpoint.
  getOneAdmin: (id) => api.get(`/products/id/${id}`),
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
  bulkAction: (ids, action) => api.post('/products/bulk', { ids, action }),
};

// Product Detail Page Sections API (admin-configurable layout)
export const productPageSectionsAPI = {
  getSections: () => api.get('/product-page-sections'),
  updateSection: (id, data) => api.put(`/product-page-sections/${id}`, data),
  reorder: (data) => api.put('/product-page-sections/reorder', data),
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
  getAll: (params) => api.get('/collections', { params }),
  getOne: (slug) => api.get(`/collections/${slug}`),
  create: (data) => api.post('/collections', data),
  update: (id, data) => api.put(`/collections/${id}`, data),
  delete: (id) => api.delete(`/collections/${id}`),
};

// Lookbooks API
export const lookbooksAPI = {
  getAll: () => api.get('/lookbooks'),
  getAdmin: () => api.get('/lookbooks/admin'),
  getOne: (slug) => api.get(`/lookbooks/${slug}`),
  create: (data) => api.post('/lookbooks', data),
  update: (id, data) => api.put(`/lookbooks/${id}`, data),
  delete: (id) => api.delete(`/lookbooks/${id}`),
};


// Announcements API ⭐
export const announcementsAPI = {

  // Storefront popup announcements
  getActive: () => api.get('/announcements'),


  // Admin announcement management
  getAll: () => api.get('/announcements/admin'),


  // Create new announcement
  create: (data) => api.post('/announcements', data),


  // Update announcement
  update: (id, data) =>
    api.put(`/announcements/${id}`, data),


  // Delete announcement
  delete: (id) =>
    api.delete(`/announcements/${id}`),

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
  confirm: (token) => api.post('/orders/confirm', { token }),
  // Accepts either a plain status string (back-compat) or a payload object
  // like { status, tracking_number } — the backend has supported saving a
  // tracking number here all along, there was just no way to send one.
  updateStatus: (id, payload) =>
    api.put(`/orders/${id}/status`, typeof payload === 'string' ? { status: payload } : payload),
  getShipmentSummary: (params) => api.get('/orders/shipments/summary', { params }),
  track: (trackingNumber) => api.get(`/orders/track/${encodeURIComponent(trackingNumber)}`),
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
  getProviders: () => api.get('/email/providers'),
  // Save/remove ONE provider's credentials independently — this is what
  // lets Brevo, SendGrid, a Custom API, and SMTP all be configured at the
  // same time for failover, instead of one shared credential slot.
  saveProviderCredentials: (key, data) => api.put(`/email/providers/${key}`, data),
  deleteProviderCredentials: (key) => api.delete(`/email/providers/${key}`),
  // Ordered list of provider keys to try, e.g. ['brevo','custom','smtp'] —
  // sending tries each in order until one succeeds.
  savePriority: (priority) => api.put('/email/priority', { priority }),
  // Tests exactly one provider's credentials, bypassing the failover chain.
  testProvider: (key, data) => api.post(`/email/providers/${key}/test`, data, { timeout: 20000 }),
  // Longer timeout than the client default — SMTP handshakes (especially a
  // failing one) can take longer than typical API calls, and we want the
  // backend's own connection timeout to be what surfaces the real error,
  // not an axios abort that hides it. `data` may include a `settings`
  // override so currently-typed-but-unsaved values are what gets tested,
  // not whatever is already saved in the database.
  test: (data) => api.post('/email/test', data, { timeout: 20000 }),
  testConnection: (data) => api.post('/email/test-connection', data, { timeout: 15000 }),
  getLogs: (params) => api.get('/email/logs', { params }),
  getBroadcastTemplates: () => api.get('/email/broadcast-templates'),
  saveBroadcastTemplate: (data) => api.post('/email/broadcast-templates', data),
  deleteBroadcastTemplate: (id) => api.delete(`/email/broadcast-templates/${id}`),
  clearCredential: (type) => api.post('/email/clear-credential', { type }),
  getAudienceCount: (params) => api.get('/email/broadcast/audience-count', { params }),
  // Longer timeout — a large audience can take a while to send in batches.
  sendBroadcast: (data) => api.post('/email/broadcast', data, { timeout: 60000 }),
  testBroadcast: (data) => api.post('/email/broadcast/test', data, { timeout: 30000 }),
  getBroadcastHistory: () => api.get('/email/broadcast/history'),
  sendBroadcastCampaign: (id) => api.post(`/email/broadcast/${id}/send`, {}, { timeout: 60000 }),
  cancelBroadcastCampaign: (id) => api.post(`/email/broadcast/${id}/cancel`),
};

// Email Templates API
export const emailTemplatesAPI = {
  getAll: () => api.get('/email-templates'),
  update: (key, data) => api.put(`/email-templates/${key}`, data),
  reset: (key) => api.post(`/email-templates/${key}/reset`),
};

// WhatsApp API
export const whatsappAPI = {
  getSettings: () => api.get('/admin/whatsapp/settings'),
  updateSettings: (data) => api.put('/admin/whatsapp/settings', data),
  // Phone Number ID / Access Token / API version — configurable from the
  // admin panel instead of Railway-only environment variables. Blank
  // access_token on save means "keep the current one".
  saveCredentials: (data) => api.put('/admin/whatsapp/credentials', data),
  deleteCredentials: () => api.delete('/admin/whatsapp/credentials'),
  resetTemplate: () => api.post('/admin/whatsapp/settings/reset'),
  preview: (message_template) => api.post('/admin/whatsapp/preview', { message_template }),
  // Longer timeout — same reasoning as emailAPI.test: a real API round trip
  // to Meta can take longer than the client's default timeout.
  sendTest: (phone) => api.post('/admin/whatsapp/test', { phone }, { timeout: 20000 }),
  getLogs: (params) => api.get('/admin/whatsapp/logs', { params }),
  retryMessage: (id) => api.post(`/admin/whatsapp/messages/${id}/retry`, {}, { timeout: 20000 }),
  sendOrderMessage: (orderId) => api.post(`/admin/whatsapp/orders/${orderId}/send`, {}, { timeout: 20000 }),
  getOrderStatus: (orderId) => api.get(`/admin/whatsapp/orders/${orderId}`),
  // Public — no auth required, used by Checkout to decide whether the
  // phone field must validate strictly.
  getPublicStatus: () => api.get('/whatsapp/status'),
};

// Pages API
export const pagesAPI = {
  get: (page) => api.get(`/pages/${page}`),
  update: (page, data) => api.put(`/pages/${page}`, data),
};

// Contact API
export const contactAPI = {
  send: (data) => api.post('/contact', data),
  list: (params) => api.get('/contact', { params }),
  markRead: (id) => api.put(`/contact/${id}/read`),
  delete: (id) => api.delete(`/contact/${id}`),
};

export const newsletterAPI = {
  subscribe: (email) => api.post('/newsletter/subscribe', { email }),
  unsubscribe: (email) => api.post('/newsletter/unsubscribe', { email }),
  list: (params) => api.get('/newsletter', { params }),
  delete: (id) => api.delete(`/newsletter/${id}`),
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
  getActive: () => api.get('/coupons/active'),
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

  // Admin — card payments (Safepay)
  getCardSettings: () => api.get('/payments/admin/card-settings'),
  updateCardSettings: (data) => api.put('/payments/admin/card-settings', data),
  clearCardCredential: (type) => api.post('/payments/admin/card-settings/clear-credential', { type }),

  // Customer — card checkout
  createCardPayment: (order_id) => api.post('/payments/card/create', { order_id }),
  getCardResult: (order_id, token) => api.get('/payments/card/result', { params: { order_id, token } }),
};

// Bank account/wallet/gateway config now all lives under paymentAPI (see
// PaymentSettings.jsx's Bank Accounts / Digital Wallets tabs) and shipping
// config under settingsAPI (see its Shipping tab) — the old standalone
// bank-settings endpoint this used to call was a single-account model
// nothing else in the app ever read, superseded by paymentAPI's
// multi-account version.

export { api };
export default api;
