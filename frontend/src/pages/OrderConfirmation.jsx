import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { HiCheck, HiExclamationCircle } from 'react-icons/hi';
import { orderAPI, settingsAPI } from '../services/api';

export default function OrderConfirmation() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [state, setState] = useState({ loading: true, error: '', order: null, alreadyConfirmed: false });
  const [deliveryEstimate, setDeliveryEstimate] = useState('3–4 working days');

  useEffect(() => {
    let active = true;
    settingsAPI.get().then(({ data }) => { if (active && data.settings?.delivery_estimate) setDeliveryEstimate(data.settings.delivery_estimate); }).catch(() => {});
    if (!token) {
      setState({ loading: false, error: 'This confirmation link is missing or invalid.', order: null, alreadyConfirmed: false });
      return () => { active = false; };
    }
    orderAPI.confirm(token)
      .then(({ data }) => { if (active) setState({ loading: false, error: '', order: data.order, alreadyConfirmed: !!data.alreadyConfirmed }); })
      .catch((error) => { if (active) setState({ loading: false, error: error.response?.data?.error || 'We could not confirm this order.', order: null, alreadyConfirmed: false }); });
    return () => { active = false; };
  }, [token]);

  return (
    <>
      <Helmet><title>Order Confirmation - Noor Mist</title></Helmet>
      <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-32">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
          <div className="luxury-card p-8 md:p-10 text-center">
            {state.loading ? (
              <>
                <div className="text-4xl mb-4">⏳</div>
                <h1 className="text-2xl font-playfair font-bold mb-2">Confirming Your Order…</h1>
                <p className="text-theme-muted">Please wait while we securely confirm your order.</p>
              </>
            ) : state.error ? (
              <>
                <HiExclamationCircle className="w-14 h-14 mx-auto text-danger mb-4" />
                <h1 className="text-2xl font-playfair font-bold mb-2">Confirmation Unavailable</h1>
                <p className="text-theme-muted mb-6">{state.error}</p>
                <Link to="/shop" className="btn-gold inline-block">Continue Shopping</Link>
              </>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto rounded-full bg-gold/15 flex items-center justify-center mb-5">
                  <HiCheck className="w-9 h-9 text-gold" />
                </div>
                <h1 className="text-3xl font-playfair font-bold mb-2">Yay! 🎉 Your Order Is Confirmed!</h1>
                <p className="text-theme-muted mb-5">Order No. <strong className="text-theme-text">#{state.order?.order_number}</strong></p>
                <div className="bg-noir rounded-lg p-4 mb-6 text-sm text-theme-muted">
                  Your order is now being prepared. Expected delivery is approximately <strong className="text-theme-text">{deliveryEstimate}</strong>.
                </div>
                <Link to="/shop" className="btn-gold inline-block">Continue Shopping</Link>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </>
  );
}
