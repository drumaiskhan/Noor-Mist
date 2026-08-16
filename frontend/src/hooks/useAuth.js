import useAuthStore from '../store/authStore';

export default function useAuth() {
  const { user, token, isAuthenticated, isAdmin, isLoading, error, login, register, logout, checkAuth, clearError } = useAuthStore();
  return { user, token, isAuthenticated, isAdmin, isLoading, error, login, register, logout, checkAuth, clearError };
}
