import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { HiMail, HiKey, HiShieldCheck } from 'react-icons/hi';
import useAuthStore from '../../store/authStore';
import Button from '../../components/UI/Button';
import toast from 'react-hot-toast';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError, isAuthenticated, isAdmin } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });

  // If already logged in as admin, go straight to dashboard
  useEffect(() => {
    if (isAuthenticated && isAdmin) navigate('/admin', { replace: true });
  }, [isAuthenticated, isAdmin, navigate]);

  const handleChange = (e) => {
    clearError();
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await login(form.email, form.password);
      if (data?.user?.role !== 'admin') {
        toast.error('Access denied. Admin accounts only.');
        useAuthStore.getState().logout();
        return;
      }
      toast.success('Welcome to Admin Panel');
      navigate('/admin', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Login failed');
    }
  };

  return (
    <>
      <Helmet>
        <title>Admin Login - Noor Mist</title>
      </Helmet>

      <div className="min-h-screen bg-noir flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gold/10 border border-gold/20 mb-4">
              <HiShieldCheck className="w-7 h-7 text-gold" />
            </div>
            <h1 className="text-3xl font-playfair font-bold gold-text">Noor Mist</h1>
            <p className="text-xs text-gray-500 mt-1 font-montserrat uppercase tracking-widest">Admin Panel</p>
            <h2 className="text-xl font-playfair font-bold mt-4 mb-1 text-white">Administrator Sign In</h2>
            <p className="text-gray-400 text-sm">Restricted access — authorised personnel only</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="luxury-card p-8 space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="text-sm text-gray-400 mb-2 block font-montserrat">Admin Email</label>
              <div className="relative">
                <HiMail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  autoComplete="username"
                  className="w-full bg-noir border border-gray-700 rounded-lg pl-12 pr-4 py-3 text-white focus:border-gold outline-none"
                  placeholder="admin@example.com"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block font-montserrat">Password</label>
              <div className="relative">
                <HiKey className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                  className="w-full bg-noir border border-gray-700 rounded-lg pl-12 pr-4 py-3 text-white focus:border-gold outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button type="submit" variant="gold" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In to Admin Panel'}
            </Button>
          </form>

          <p className="text-center text-xs text-gray-600 mt-6 font-montserrat">
            Not an admin?{' '}
            <a href="/" className="text-gray-500 hover:text-gold transition-colors">
              Go to store
            </a>
          </p>
        </motion.div>
      </div>
    </>
  );
}
