import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiMail, HiLockClosed, HiEye, HiEyeOff } from 'react-icons/hi';
import useAuthStore from '../../store/authStore';
import Input from '../UI/Input';
import Button from '../UI/Button';
import toast from 'react-hot-toast';

export default function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="text-center mb-8">
        <h1 className="text-3xl font-playfair font-bold mb-2">Welcome Back</h1>
        <p className="text-theme-muted">Sign in to your Noor Mist account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Email Address"
          name="email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="you@example.com"
          icon={<HiMail className="w-4 h-4" />}
          required
        />

        <div className="relative">
          <Input
            label="Password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
            icon={<HiLockClosed className="w-4 h-4" />}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 bottom-3 text-theme-muted hover:text-theme-primary transition-colors"
          >
            {showPassword ? <HiEyeOff className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}
          </button>
        </div>

        <Button type="submit" variant="gold" size="lg" loading={isLoading} className="w-full">
          Sign In
        </Button>
      </form>

      <p className="text-center text-theme-muted mt-6 text-sm">
        Don't have an account?{' '}
        <Link to="/register" className="text-gold hover:text-gold-light transition-colors">
          Create Account
        </Link>
      </p>
    </motion.div>
  );
}
