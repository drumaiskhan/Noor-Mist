import { create } from 'zustand';
import { authAPI } from '../services/api';

const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('noor_mist_user') || 'null'),
  token: localStorage.getItem('noor_mist_token') || null,
  isAuthenticated: !!localStorage.getItem('noor_mist_token'),
  isAdmin: JSON.parse(localStorage.getItem('noor_mist_user') || '{}')?.role === 'admin',
  isLoading: false,
  error: null,

  checkAuth: () => {
    const token = localStorage.getItem('noor_mist_token');
    const user = JSON.parse(localStorage.getItem('noor_mist_user') || 'null');
    set({
      token,
      user,
      isAuthenticated: !!token && !!user,
      isAdmin: user?.role === 'admin',
    });
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await authAPI.login({ email, password });
      localStorage.setItem('noor_mist_token', data.token);
      localStorage.setItem('noor_mist_user', JSON.stringify(data.user));
      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        isAdmin: data.user?.role === 'admin',
        isLoading: false,
      });
      return data;
    } catch (error) {
      const message = error.response?.data?.error || 'Login failed. Please try again.';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  register: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await authAPI.register(userData);
      localStorage.setItem('noor_mist_token', data.token);
      localStorage.setItem('noor_mist_user', JSON.stringify(data.user));
      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        isAdmin: data.user?.role === 'admin',
        isLoading: false,
      });
      return data;
    } catch (error) {
      const message = error.response?.data?.error || 'Registration failed. Please try again.';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  logout: () => {
    localStorage.removeItem('noor_mist_token');
    localStorage.removeItem('noor_mist_user');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isAdmin: false,
      error: null,
    });
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
