import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

export default function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children;
}
