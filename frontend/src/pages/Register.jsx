import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { HiMail, HiKey, HiUser } from 'react-icons/hi';
import useAuthStore from '../store/authStore';
import Button from '../components/UI/Button';
import toast from 'react-hot-toast';

export default function Register() {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuthStore();
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e) => {
    clearError();
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      await register({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      toast.success('Account created successfully!');
      navigate('/account');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    }
  };

  return (
    <>
      <Helmet>
        <title>Register - Noor Mist</title>
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
            <h1 className="text-2xl font-playfair font-bold mt-6 mb-2">Create Account</h1>
            <p className="text-theme-muted">Join the Noor Mist community</p>
          </div>

          <form onSubmit={handleSubmit} className="luxury-card p-8 space-y-4">
            {error && (
              <div className="bg-danger/10 border border-danger/30 text-danger px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-theme-muted mb-2 block font-montserrat">First Name</label>
                <input
                  type="text"
                  name="first_name"
                  value={form.first_name}
                  onChange={handleChange}
                  required
                  className="w-full bg-noir border border-theme-border rounded-lg px-4 py-3 text-theme-text focus:border-theme-primary outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-theme-muted mb-2 block font-montserrat">Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  value={form.last_name}
                  onChange={handleChange}
                  required
                  className="w-full bg-noir border border-theme-border rounded-lg px-4 py-3 text-theme-text focus:border-theme-primary outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-theme-muted mb-2 block font-montserrat">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full bg-noir border border-theme-border rounded-lg px-4 py-3 text-theme-text focus:border-theme-primary outline-none"
              />
            </div>

            <div>
              <label className="text-sm text-theme-muted mb-2 block font-montserrat">Phone (optional)</label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="w-full bg-noir border border-theme-border rounded-lg px-4 py-3 text-theme-text focus:border-theme-primary outline-none"
              />
            </div>

            <div>
              <label className="text-sm text-theme-muted mb-2 block font-montserrat">Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
                className="w-full bg-noir border border-theme-border rounded-lg px-4 py-3 text-theme-text focus:border-theme-primary outline-none"
              />
            </div>

            <div>
              <label className="text-sm text-theme-muted mb-2 block font-montserrat">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                className="w-full bg-noir border border-theme-border rounded-lg px-4 py-3 text-theme-text focus:border-theme-primary outline-none"
              />
            </div>

            <Button type="submit" variant="gold" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>

            <p className="text-center text-sm text-theme-muted">
              Already have an account?{' '}
              <Link to="/login" className="text-gold hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </motion.div>
      </div>
    </>
  );
}
