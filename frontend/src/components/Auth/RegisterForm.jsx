import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiUser, HiMail, HiLockClosed, HiPhone, HiCheckCircle } from 'react-icons/hi';
import useAuthStore from '../../store/authStore';
import Input from '../UI/Input';
import Button from '../UI/Button';
import toast from 'react-hot-toast';

export default function RegisterForm() {
  const navigate = useNavigate();
  const { register, verifyEmailOtp, isLoading } = useAuthStore();
  const [verificationEmail, setVerificationEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationMode, setVerificationMode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', password: '', confirm: '',
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
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
      setVerificationEmail(form.email);
      setVerificationMode(true);
      toast.success('Check your email to verify your account.');
    } catch (error) {
      toast.error(error.message);
    }
  };


  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error('Enter the 6-digit code from your email.');
    setVerifying(true);
    try {
      await verifyEmailOtp({ email: verificationEmail, otp });
      toast.success('Email verified! Welcome to Noor Mist.');
      navigate('/');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setVerifying(false);
    }
  };

  if (verificationMode) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md mx-auto">
        <div className="luxury-card p-8 text-center">
          <HiCheckCircle className="w-14 h-14 text-gold mx-auto mb-4" />
          <h1 className="text-3xl font-playfair font-bold mb-2">Verify Your Email</h1>
          <p className="text-theme-muted text-sm mb-6">We sent a verification link and 6-digit code to <strong className="text-theme-text">{verificationEmail}</strong>.</p>
          <form onSubmit={handleVerify} className="space-y-4">
            <Input label="Verification Code" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="123456" inputMode="numeric" maxLength={6} required />
            <Button type="submit" variant="gold" size="lg" loading={verifying} className="w-full">Verify Email</Button>
          </form>
          <p className="text-xs text-theme-muted mt-4">You can also click the verification link in the email. It expires in 15 minutes.</p>
          <Link to="/login" className="inline-block text-sm text-gold mt-5 hover:underline">Already verified? Sign in</Link>
        </div>
      </motion.div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="text-center mb-8">
        <h1 className="text-3xl font-playfair font-bold mb-2">Create Account</h1>
        <p className="text-theme-muted">Join the Noor Mist family</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="First Name" name="first_name" value={form.first_name} onChange={handleChange}
            placeholder="First" icon={<HiUser className="w-4 h-4" />} required />
          <Input label="Last Name" name="last_name" value={form.last_name} onChange={handleChange} placeholder="Last" />
        </div>

        <Input label="Email Address" name="email" type="email" value={form.email} onChange={handleChange}
          placeholder="you@example.com" icon={<HiMail className="w-4 h-4" />} required />

        <Input label="Phone Number" name="phone" type="tel" value={form.phone} onChange={handleChange}
          placeholder="+92 300 0000000" icon={<HiPhone className="w-4 h-4" />} />

        <Input label="Password" name="password" type="password" value={form.password} onChange={handleChange}
          placeholder="Min. 6 characters" icon={<HiLockClosed className="w-4 h-4" />} required />

        <Input label="Confirm Password" name="confirm" type="password" value={form.confirm} onChange={handleChange}
          placeholder="Repeat password" icon={<HiLockClosed className="w-4 h-4" />} required />

        <Button type="submit" variant="gold" size="lg" loading={isLoading} className="w-full mt-2">
          Create Account
        </Button>
      </form>

      <p className="text-center text-theme-muted mt-6 text-sm">
        Already have an account?{' '}
        <Link to="/login" className="text-gold hover:text-theme-primary-light transition-colors">
          Sign In
        </Link>
      </p>
    </motion.div>
  );
}
