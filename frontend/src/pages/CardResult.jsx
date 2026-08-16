import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiCheckCircle, HiXCircle, HiRefresh, HiExclamationCircle } from 'react-icons/hi';
import { paymentAPI } from '../services/api';

// After Safepay's Hosted Checkout, the shopper lands here. The redirect
// itself is never treated as proof of payment — this page polls our backend,
// which fetches the tracker from Safepay server-side before marking the
// order paid (the same order is also finalized independently by Safepay's
// webhook, whichever arrives first).
const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 20; // ~1 minute

export default function CardResult() {
  const [params] = useSearchParams();
  const orderId = params.get('order_id');
  const token = params.get('token');
  const cancelled = params.get('cancelled') === '1';

  const [status, setStatus] = useState(cancelled ? 'cancelled' : 'checking'); // checking | paid | pending | cancelled | error
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const pollCount = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (cancelled) return;
    if (!orderId || !token) {
      setStatus('error');
      setError('This payment link is missing required information.');
      return;
    }

    let cancelledEffect = false;

    const poll = async () => {
      try {
        const { data } = await paymentAPI.getCardResult(orderId, token);
        if (cancelledEffect) return;
        setOrder(data.order);
        if (data.paid) {
          setStatus('paid');
          return;
        }
        pollCount.current += 1;
        if (pollCount.current >= MAX_POLLS) {
          setStatus('pending');
          return;
        }
        timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
      } catch (err) {
        if (cancelledEffect) return;
        setStatus('error');
        setError(err.response?.data?.error || 'We could not verify this payment.');
      }
    };

    poll();
    return () => { cancelledEffect = true; clearTimeout(timerRef.current); };
  }, [orderId, token, cancelled]);

  return (
    <>
      <Helmet><title>Payment Status - Noor Mist</title></Helmet>
      <div className="min-h-screen px-4 pt-28 pb-32 flex items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full luxury-card p-8 text-center">
          {status === 'checking' && (
            <>
              <HiRefresh className="w-12 h-12 mx-auto text-gold mb-4 animate-spin" />
              <h1 className="text-2xl font-playfair font-bold mb-2">Confirming your payment…</h1>
              <p className="text-theme-muted text-sm">Please don't close this page — this only takes a few seconds.</p>
            </>
          )}

          {status === 'paid' && (
            <>
              <HiCheckCircle className="w-14 h-14 mx-auto text-green-400 mb-4" />
              <h1 className="text-2xl font-playfair font-bold mb-2">Payment Confirmed</h1>
              <p className="text-theme-muted text-sm mb-6">
                {order?.order_number ? `Order #${order.order_number} is confirmed. ` : ''}
                A confirmation email is on its way to you.
              </p>
              <Link to="/account" className="btn-gold px-6 py-3 inline-block">View My Orders</Link>
            </>
          )}

          {status === 'pending' && (
            <>
              <HiExclamationCircle className="w-14 h-14 mx-auto text-yellow-400 mb-4" />
              <h1 className="text-2xl font-playfair font-bold mb-2">Still Processing</h1>
              <p className="text-theme-muted text-sm mb-6">
                Your payment is taking longer than usual to confirm. If money was deducted, your order will update automatically once Safepay confirms it — no need to pay again.
              </p>
              <Link to="/account" className="btn-gold px-6 py-3 inline-block">Check Order Status</Link>
            </>
          )}

          {status === 'cancelled' && (
            <>
              <HiXCircle className="w-14 h-14 mx-auto text-red-400 mb-4" />
              <h1 className="text-2xl font-playfair font-bold mb-2">Payment Cancelled</h1>
              <p className="text-theme-muted text-sm mb-6">You cancelled the payment before it completed. Your order hasn't been charged — you can try again or choose a different payment method.</p>
              <Link to="/checkout" className="btn-gold px-6 py-3 inline-block">Return to Checkout</Link>
            </>
          )}

          {status === 'error' && (
            <>
              <HiExclamationCircle className="w-14 h-14 mx-auto text-red-400 mb-4" />
              <h1 className="text-2xl font-playfair font-bold mb-2">Couldn't Verify Payment</h1>
              <p className="text-theme-muted text-sm mb-6">{error}</p>
              <Link to="/account" className="btn-gold px-6 py-3 inline-block">Go to My Account</Link>
            </>
          )}
        </motion.div>
      </div>
    </>
  );
}
