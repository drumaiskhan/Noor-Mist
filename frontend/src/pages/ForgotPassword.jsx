import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { HiMail, HiKey } from 'react-icons/hi';
import { authAPI } from '../services/api';
import Button from '../components/UI/Button';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    try {
      await authAPI.forgotPassword({ email: email.trim() });
      setSent(true);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.trim().length !== 6) {
      toast.error('Enter the 6-digit code from your email');
      return;
    }
    setVerifying(true);
    try {
      const { data } = await authAPI.verifyOtp({ email: email.trim(), otp: otp.trim() });
      navigate(`/reset-password?token=${data.resetToken}`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'That code is invalid or has expired');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Forgot Password - Noor Mist</title>
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
            <h1 className="text-2xl font-playfair font-bold mt-6 mb-2">Reset Your Password</h1>
            <p className="text-theme-muted">
              {sent
                ? 'Enter the 6-digit code we emailed you, or use the reset link in that same email.'
                : "Enter your email and we'll send you a reset code and link."}
            </p>
          </div>

          {sent ? (
            <form onSubmit={handleVerifyOtp} className="luxury-card p-8 space-y-5">
              <p className="text-theme-text text-sm">
                If an account exists for <strong>{email}</strong>, a code was sent — it expires in 10 minutes.
              </p>
              <div>
                <label className="text-sm text-theme-muted mb-2 block font-montserrat">6-Digit Code</label>
                <div className="relative">
                  <HiKey className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-muted" />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-noir border border-theme-border rounded-lg pl-12 pr-4 py-3 text-theme-text tracking-[0.4em] text-center text-lg focus:border-theme-primary outline-none"
                    placeholder="000000"
                  />
                </div>
              </div>

              <Button type="submit" variant="gold" className="w-full" disabled={verifying}>
                {verifying ? 'Verifying...' : 'Verify Code'}
              </Button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full text-center text-sm text-gold hover:underline"
              >
                {isSubmitting ? 'Sending...' : "Didn't get a code? Resend"}
              </button>

              <p className="text-center text-sm text-theme-muted">
                <Link to="/login" className="text-gold hover:underline">
                  Back to Sign In
                </Link>
              </p>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="luxury-card p-8 space-y-5">
              <div>
                <label className="text-sm text-theme-muted mb-2 block font-montserrat">Email</label>
                <div className="relative">
                  <HiMail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-noir border border-theme-border rounded-lg pl-12 pr-4 py-3 text-theme-text focus:border-theme-primary outline-none"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <Button type="submit" variant="gold" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send Reset Code'}
              </Button>

              <p className="text-center text-sm text-theme-muted">
                Remembered your password?{' '}
                <Link to="/login" className="text-gold hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </motion.div>
      </div>
    </>
  );
}
