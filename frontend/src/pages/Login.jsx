import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { HiMail, HiKey } from 'react-icons/hi';
import useAuthStore from '../store/authStore';
import Button from '../components/UI/Button';
import toast from 'react-hot-toast';

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });

  const handleChange = (e) => {
    clearError();
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/account');
    } catch (err) {
      toast.error(err.message || 'Login failed');
    }
  };

  return (
    <>
      <Helmet>
        <title>Login - Noor Mist</title>
      </Helmet>

      <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-32 md:pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <Link to="/" className="text-3xl font-playfair font-bold gold-text">
              Noor Mist
            </Link>
            <h1 className="text-2xl font-playfair font-bold mt-6 mb-2">Welcome Back</h1>
            <p className="text-theme-muted">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="luxury-card p-8 space-y-5">
            {error && (
              <div className="bg-danger/10 border border-danger/30 text-danger px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="text-sm text-theme-muted mb-2 block font-montserrat">Email</label>
              <div className="relative">
                <HiMail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-muted" />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="w-full bg-noir border border-theme-border rounded-lg pl-12 pr-4 py-3 text-theme-text focus:border-theme-primary outline-none"
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-theme-muted font-montserrat">Password</label>
                <Link to="/forgot-password" className="text-xs text-gold hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <HiKey className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-muted" />
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  className="w-full bg-noir border border-theme-border rounded-lg pl-12 pr-4 py-3 text-theme-text focus:border-theme-primary outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button type="submit" variant="gold" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>

            <p className="text-center text-sm text-theme-muted">
              Don't have an account?{' '}
              <Link to="/register" className="text-gold hover:underline">
                Create one
              </Link>
            </p>
          </form>
        </motion.div>
      </div>
    </>
  );
}
