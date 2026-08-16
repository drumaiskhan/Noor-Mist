import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { HiKey } from 'react-icons/hi';
import { authAPI } from '../services/api';
import Button from '../components/UI/Button';
import toast from 'react-hot-toast';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error('This reset link is invalid or has expired.');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authAPI.resetPassword({ token, password: form.password });
      toast.success('Password reset successfully! Please sign in.');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Reset Password - Noor Mist</title>
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
            <h1 className="text-2xl font-playfair font-bold mt-6 mb-2">Choose a New Password</h1>
            <p className="text-theme-muted">Enter a new password for your account</p>
          </div>

          {!token ? (
            <div className="luxury-card p-8 text-center space-y-5">
              <div className="bg-danger/10 border border-danger/30 text-danger px-4 py-3 rounded-lg text-sm">
                This reset link is invalid or missing. Please request a new one.
              </div>
              <Link to="/forgot-password" className="text-gold hover:underline text-sm">
                Request New Link
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="luxury-card p-8 space-y-5">
              <div>
                <label className="text-sm text-theme-muted mb-2 block font-montserrat">New Password</label>
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

              <div>
                <label className="text-sm text-theme-muted mb-2 block font-montserrat">Confirm Password</label>
                <div className="relative">
                  <HiKey className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-muted" />
                  <input
                    type="password"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    required
                    className="w-full bg-noir border border-theme-border rounded-lg pl-12 pr-4 py-3 text-theme-text focus:border-theme-primary outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <Button type="submit" variant="gold" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          )}
        </motion.div>
      </div>
    </>
  );
}
