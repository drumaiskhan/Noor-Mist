import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiArrowLeft, HiCheck, HiCreditCard, HiCash, HiTruck, HiTag, HiX,
  HiUpload, HiPhotograph, HiExclamationCircle, HiInformationCircle,
  HiRefresh, HiChevronDown, HiChevronUp,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';
import { orderAPI, paymentAPI, settingsAPI, whatsappAPI } from '../services/api';
import { formatPrice, isValidWhatsAppPhone } from '../utils/helpers';
import { resolveMediaUrl } from '../utils/cloudinary';

const METHOD_ICONS = {
  cod: HiCash,
  bank_transfer: HiCreditCard,
  easypaisa: HiCreditCard,
  jazzcash: HiCreditCard,
  sadapay: HiCreditCard,
  nayapay: HiCreditCard,
  raast: HiCreditCard,
  card: HiCreditCard,
};

// Brand-ish accent colors so wallet options are easy to tell apart at a glance
const METHOD_COLORS = {
  easypaisa: 'text-green-400 bg-green-500/10',
  jazzcash: 'text-red-400 bg-red-500/10',
  sadapay: 'text-purple-400 bg-purple-500/10',
  nayapay: 'text-blue-400 bg-blue-500/10',
  raast: 'text-teal-400 bg-teal-500/10',
  bank_transfer: 'text-gold bg-gold/10',
  card: 'text-gold bg-gold/10',
};

export default function Checkout() {
  const navigate = useNavigate();
  const { items, getCartTotal, clearCart, appliedCoupon, couponDiscount, applyCoupon, removeCoupon } = useCartStore();
  const { user } = useAuthStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  // Payment methods from API
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [wallets, setWallets] = useState({});
  const [loadingMethods, setLoadingMethods] = useState(true);

  // Multi-step: 'shipping' | 'proof'
  const [step, setStep] = useState('shipping');
  const [placedOrder, setPlacedOrder] = useState(null);

  // Proof upload state
  const [proof, setProof] = useState({
    screenshot: null,
    screenshotPreview: null,
    transaction_id: '',
    sender_name: '',
    sender_number: '',
    payment_date: '',
    notes: '',
    amount: '',
  });
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [showPaymentDetails, setShowPaymentDetails] = useState(true);
  const screenshotRef = useRef();

  const [form, setForm] = useState({
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: '',
    city: '',
    state: '',
    notes: '',
    paymentMethod: '',
  });

  const { data: settings = {} } = useQuery({
    queryKey: ['siteSettings'],
    queryFn: async () => {
      const { data } = await settingsAPI.get();
      return data.settings || {};
    },
    staleTime: 5 * 60 * 1000,
  });

  // Whether automatic WhatsApp order confirmation is currently active — if
  // so, the phone field must validate as a real WhatsApp-reachable number
  // before the order can be submitted, per the admin's WhatsApp Notifications
  // settings. Fails open (treated as not required) if the check errors.
  const { data: whatsappStatus = { enabled: false } } = useQuery({
    queryKey: ['whatsappPublicStatus'],
    queryFn: async () => {
      const { data } = await whatsappAPI.getPublicStatus();
      return data;
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const shippingRate = settings.shipping_flat_rate !== undefined ? Number(settings.shipping_flat_rate) : (settings.shipping_rate !== undefined ? Number(settings.shipping_rate) : 200);
  const freeShippingThreshold = settings.shipping_free_threshold !== undefined
    ? Number(settings.shipping_free_threshold) : (settings.free_shipping_threshold !== undefined ? Number(settings.free_shipping_threshold) : 5000);

  const subtotal = getCartTotal();
  const shipping = subtotal >= freeShippingThreshold ? 0 : subtotal > 0 ? shippingRate : 0;
  const discount = couponDiscount || 0;
  const total = subtotal - discount + shipping;

  useEffect(() => {
    async function loadPaymentData() {
      try {
        const [methodsRes, bankRes, walletRes] = await Promise.all([
          paymentAPI.getMethods(),
          paymentAPI.getBankAccounts(),
          paymentAPI.getWallets(),
        ]);
        const methods = methodsRes.data.methods || [];
        setPaymentMethods(methods);
        setBankAccounts(bankRes.data.accounts || []);
        const walletMap = {};
        (walletRes.data.wallets || []).forEach(w => { walletMap[w.type] = w; });
        setWallets(walletMap);
        if (methods.length > 0) {
          setForm(f => ({ ...f, paymentMethod: methods[0].key }));
        }
      } catch {
        // Fallback to COD + bank_transfer if API fails
        setPaymentMethods([
          { key: 'cod', label: 'Cash on Delivery', description: 'Pay when you receive your order', requires_proof: false },
          { key: 'bank_transfer', label: 'Bank Transfer', description: 'Transfer to our bank account', requires_proof: true },
        ]);
        setForm(f => ({ ...f, paymentMethod: 'cod' }));
      } finally {
        setLoadingMethods(false);
      }
    }
    loadPaymentData();
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsApplyingCoupon(true);
    const result = await applyCoupon(couponCode);
    setIsApplyingCoupon(false);
    if (result.success) { toast.success(result.message); setCouponCode(''); }
    else toast.error(result.message);
  };

  const selectedMethod = paymentMethods.find(m => m.key === form.paymentMethod);
  const requiresProof = selectedMethod?.requires_proof;

  // Group individual backend methods into two frontstore categories:
  // "Cash on Delivery" and "Online Payment" (bank transfer, wallets, card, etc.)
  const codMethod = paymentMethods.find(m => m.key === 'cod');
  const onlineMethods = paymentMethods.filter(m => m.key !== 'cod');
  const isOnlineSelected = onlineMethods.some(m => m.key === form.paymentMethod);

  // ── Step 1: Place order ─────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) { toast.error('Your cart is empty'); return; }
    if (whatsappStatus.enabled && !isValidWhatsAppPhone(form.phone)) {
      toast.error('Please enter a valid WhatsApp number (e.g. 03001234567) — we use it to send your order confirmation.');
      return;
    }
    setIsSubmitting(true);
    try {
      const orderData = {
        shipping_address: {
          firstName: form.firstName, lastName: form.lastName,
          email: form.email, phone: form.phone,
          address: form.address, city: form.city, state: form.state,
        },
        payment_method: form.paymentMethod,
        coupon_code: appliedCoupon?.code || null,
        notes: form.notes || null,
        items: items.map(i => ({ product_id: i.product_id, variant_id: i.variant_id, quantity: i.quantity })),
      };
      const { data } = await orderAPI.create(orderData);
      clearCart();
      if (form.paymentMethod === 'card') {
        // Hosted Checkout: send the shopper to Safepay, then back to
        // /order/card-result. The order already exists (status
        // 'pending' → 'pending_payment'), so a cancelled or abandoned
        // payment just leaves an unpaid order rather than losing the cart.
        try {
          const { data: cardData } = await paymentAPI.createCardPayment(data.order.id);
          window.location.href = cardData.checkout_url;
          return;
        } catch (cardErr) {
          toast.error(cardErr.response?.data?.error || 'Could not start card payment. Please try another payment method or contact us.');
          setIsSubmitting(false);
          return;
        }
      }
      if (requiresProof) {
        setPlacedOrder(data.order);
        setProof(p => ({ ...p, amount: String(data.order?.total_amount || total) }));
        setStep('proof');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        toast.success('Order received! Check your email to confirm it.');
        navigate('/account');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Step 2: Submit proof ────────────────────────────────────────────────
  const handleProofScreenshot = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProof(p => ({
      ...p,
      screenshot: file,
      screenshotPreview: URL.createObjectURL(file),
    }));
  };

  const handleSubmitProof = async (e) => {
    e.preventDefault();
    if (!proof.screenshot) { toast.error('Please upload a payment screenshot'); return; }
    setIsSubmittingProof(true);
    try {
      const fd = new FormData();
      fd.append('screenshot', proof.screenshot);
      fd.append('order_id', placedOrder.id);
      fd.append('payment_method', form.paymentMethod);
      if (proof.transaction_id) fd.append('transaction_id', proof.transaction_id);
      if (proof.sender_name) fd.append('sender_name', proof.sender_name);
      if (proof.sender_number) fd.append('sender_number', proof.sender_number);
      if (proof.payment_date) fd.append('payment_date', proof.payment_date);
      if (proof.notes) fd.append('notes', proof.notes);
      if (proof.amount) fd.append('amount', proof.amount);
      await paymentAPI.submitProof(fd);
      toast.success('Payment proof submitted! We\'ll verify and confirm your order shortly.');
      navigate('/account');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit proof. You can upload it later from your account.');
    } finally {
      setIsSubmittingProof(false);
    }
  };

  const skipProof = () => {
    toast.success('Order placed! Please upload payment proof from your account.');
    navigate('/account');
  };

  // ── Render: empty cart ──────────────────────────────────────────────────
  if (items.length === 0 && step === 'shipping') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 text-center">
        <h1 className="text-3xl font-playfair font-bold mb-4">Your cart is empty</h1>
        <p className="text-theme-muted mb-6">Add some fragrances before checking out.</p>
        <Link to="/shop" className="btn-gold">Shop Now</Link>
      </div>
    );
  }

  // ── Render: payment proof upload (step 2) ───────────────────────────────
  if (step === 'proof') {
    const wallet = wallets[form.paymentMethod];
    // Cart is cleared once the order is placed, so `total` (derived from the
    // cart) is 0 here — use the amount recorded on the placed order instead.
    const orderTotal = Number(placedOrder?.total_amount ?? total);
    return (
      <>
        <Helmet><title>Payment Proof – Noor Mist</title></Helmet>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Success banner */}
            <div className="luxury-card p-5 mb-6 flex items-start gap-4 border-success/30 bg-success/5">
              <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                <HiCheck className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-theme-text font-semibold">Order #{placedOrder?.order_number} placed!</p>
                <p className="text-sm text-theme-muted mt-0.5">Now upload your payment proof to confirm the order.</p>
              </div>
            </div>

            {/* Payment details */}
            <div className="luxury-card p-6 mb-6">
              <button
                className="w-full flex items-center justify-between text-left"
                onClick={() => setShowPaymentDetails(v => !v)}
              >
                <h2 className="text-lg font-playfair font-bold">
                  {selectedMethod?.label} — Payment Details
                </h2>
                {showPaymentDetails ? <HiChevronUp className="w-5 h-5 text-gold" /> : <HiChevronDown className="w-5 h-5 text-gold" />}
              </button>

              <AnimatePresence>
                {showPaymentDetails && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="pt-4">
                      {/* Bank accounts */}
                      {form.paymentMethod === 'bank_transfer' && bankAccounts.length > 0 && (
                        <div className="space-y-4">
                          {bankAccounts.map(acc => (
                            <div key={acc.id} className="p-4 bg-noir rounded-xl border border-theme-border/60">
                              <div className="flex items-start gap-4">
                                {acc.logo_url && <img src={resolveMediaUrl(acc.logo_url)} alt={acc.bank_name} className="w-12 h-12 object-contain rounded-lg bg-theme-surface p-1" />}
                                <div className="flex-1 space-y-1">
                                  <p className="font-semibold text-gold">{acc.bank_name}</p>
                                  <InfoRow label="Account Title" value={acc.account_title} />
                                  {acc.account_number && <InfoRow label="Account #" value={acc.account_number} />}
                                  {acc.iban && <InfoRow label="IBAN" value={acc.iban} />}
                                  {acc.branch_name && <InfoRow label="Branch" value={acc.branch_name} />}
                                  {acc.swift_code && <InfoRow label="SWIFT" value={acc.swift_code} />}
                                  {acc.instructions && <p className="text-xs text-theme-muted mt-2 italic">{acc.instructions}</p>}
                                </div>
                                {acc.qr_image_url && (
                                  <img src={resolveMediaUrl(acc.qr_image_url)} alt="QR" className="w-20 h-20 object-contain rounded-lg border border-theme-border" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Digital wallets */}
                      {['easypaisa','jazzcash','sadapay','nayapay','raast'].includes(form.paymentMethod) && (
                        <div className="p-4 bg-noir rounded-xl border border-theme-border/60">
                          {wallet ? (
                            <div className="flex items-start gap-4">
                              <div className="flex-1 space-y-1">
                                {wallet.account_name && <InfoRow label="Account Name" value={wallet.account_name} />}
                                {wallet.mobile_number && <InfoRow label="Mobile Number" value={wallet.mobile_number} />}
                                {wallet.username && <InfoRow label="Username" value={wallet.username} />}
                                {wallet.raast_id && <InfoRow label="Raast ID" value={wallet.raast_id} />}
                                {wallet.linked_bank && <InfoRow label="Linked Bank" value={wallet.linked_bank} />}
                                <InfoRow label="Amount to Send" value={formatPrice(orderTotal)} highlight />
                                {wallet.instructions && <p className="text-xs text-theme-muted mt-2 italic">{wallet.instructions}</p>}
                              </div>
                              {wallet.qr_image_url && (
                                <img src={resolveMediaUrl(wallet.qr_image_url)} alt="QR" className="w-24 h-24 object-contain rounded-lg border border-theme-border" />
                              )}
                            </div>
                          ) : (
                            <p className="text-theme-muted text-sm">Send <span className="text-gold font-bold">{formatPrice(orderTotal)}</span> to our {selectedMethod?.label} account. Contact us for details.</p>
                          )}
                        </div>
                      )}

                      {selectedMethod?.instructions && (
                        <div className="mt-3 p-3 bg-gold/5 border border-gold/20 rounded-lg flex gap-2">
                          <HiInformationCircle className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-theme-muted">{selectedMethod.instructions}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Proof upload form */}
            <form onSubmit={handleSubmitProof} className="luxury-card p-6 space-y-5">
              <h2 className="text-lg font-playfair font-bold">Upload Payment Proof</h2>

              {/* Screenshot */}
              <div>
                <label className="block text-sm text-theme-muted mb-2 font-montserrat">Payment Screenshot <span className="text-danger">*</span></label>
                <div
                  onClick={() => screenshotRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-xl cursor-pointer transition-all ${proof.screenshotPreview ? 'border-gold/40' : 'border-theme-border hover:border-gold/40'}`}
                >
                  {proof.screenshotPreview ? (
                    <div className="relative">
                      <img src={proof.screenshotPreview} alt="Preview" className="w-full max-h-64 object-contain rounded-xl" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-theme-bg/50 rounded-xl">
                        <div className="flex items-center gap-2 text-theme-text text-sm">
                          <HiRefresh className="w-4 h-4" /> Change
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-10 flex flex-col items-center gap-2 text-theme-muted opacity-70">
                      <HiPhotograph className="w-8 h-8" />
                      <p className="text-sm">Click to upload screenshot</p>
                      <p className="text-xs">PNG, JPG up to 10MB</p>
                    </div>
                  )}
                </div>
                <input ref={screenshotRef} type="file" accept="image/*" className="hidden" onChange={handleProofScreenshot} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ProofInput label="Transaction ID" value={proof.transaction_id} onChange={v => setProof(p => ({...p, transaction_id: v}))} placeholder="TXN123456" />
                <ProofInput label="Amount Sent (₨)" value={proof.amount} onChange={v => setProof(p => ({...p, amount: v}))} type="number" />
                <ProofInput label="Sender Name" value={proof.sender_name} onChange={v => setProof(p => ({...p, sender_name: v}))} />
                <ProofInput label="Sender Mobile Number" value={proof.sender_number} onChange={v => setProof(p => ({...p, sender_number: v}))} type="tel" />
                <ProofInput label="Payment Date" value={proof.payment_date} onChange={v => setProof(p => ({...p, payment_date: v}))} type="date" />
              </div>

              <div>
                <label className="block text-sm text-theme-muted mb-2 font-montserrat">Additional Notes</label>
                <textarea
                  value={proof.notes}
                  onChange={e => setProof(p => ({...p, notes: e.target.value}))}
                  rows={2}
                  placeholder="Any additional information..."
                  className="w-full bg-theme-bg border border-theme-border rounded-lg px-4 py-3 text-theme-text text-sm focus:border-theme-primary outline-none resize-none transition-colors placeholder-gray-600"
                />
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={isSubmittingProof} className="btn-gold flex-1">
                  {isSubmittingProof ? (
                    <span className="flex items-center justify-center gap-2"><HiRefresh className="w-4 h-4 animate-spin" /> Submitting…</span>
                  ) : (
                    <span className="flex items-center justify-center gap-2"><HiUpload className="w-4 h-4" /> Submit Proof</span>
                  )}
                </button>
                <button type="button" onClick={skipProof} className="px-4 py-3 text-theme-muted hover:text-theme-text border border-theme-border rounded-xl text-sm transition-colors">
                  Skip for now
                </button>
              </div>

              <p className="text-xs text-theme-muted opacity-70 flex items-start gap-1.5">
                <HiExclamationCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                You can also upload proof from your account page. Your order won't be processed until payment is verified.
              </p>
            </form>
          </motion.div>
        </div>
      </>
    );
  }

  // ── Render: checkout form (step 1) ──────────────────────────────────────
  return (
    <>
      <Helmet><title>Checkout - Noor Mist</title></Helmet>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-32 md:pb-16">
        <Link to="/cart" className="inline-flex items-center gap-2 text-sm text-theme-muted hover:text-theme-primary mb-8 transition-colors">
          <HiArrowLeft className="w-4 h-4" /> Back to Cart
        </Link>
        <h1 className="text-3xl font-playfair font-bold mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
            {/* Shipping Info */}
            <div className="luxury-card p-6">
              <h2 className="text-xl font-playfair font-bold mb-6 flex items-center gap-2">
                <HiTruck className="w-5 h-5 text-gold" /> Shipping Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CheckoutInput label="First Name" name="firstName" value={form.firstName} onChange={handleChange} required />
                <CheckoutInput label="Last Name" name="lastName" value={form.lastName} onChange={handleChange} />
                <CheckoutInput label="Email" name="email" type="email" value={form.email} onChange={handleChange} required />
                <div>
                  <CheckoutInput
                    label={whatsappStatus.enabled ? 'WhatsApp / Phone Number' : 'Phone'}
                    name="phone" type="tel" value={form.phone} onChange={handleChange} required
                  />
                  {whatsappStatus.enabled && (
                    <p className="text-xs text-theme-muted mt-1.5">
                      We'll use this number to send your order confirmation and important order updates through WhatsApp.
                    </p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <CheckoutInput label="Street Address" name="address" value={form.address} onChange={handleChange} required />
                </div>
                <CheckoutInput label="City" name="city" value={form.city} onChange={handleChange} required />
                <CheckoutInput label="State / Province" name="state" value={form.state} onChange={handleChange} />
              </div>
              <div className="mt-4">
                <label className="block text-sm text-theme-muted mb-2 font-montserrat">Order Notes (optional)</label>
                <textarea
                  name="notes" value={form.notes} onChange={handleChange} rows={2}
                  placeholder="Special instructions for your order..."
                  className="w-full bg-theme-bg border border-theme-border rounded-lg px-4 py-3 text-theme-text focus:border-theme-primary outline-none text-sm resize-none transition-colors placeholder-gray-600"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="luxury-card p-6">
              <h2 className="text-xl font-playfair font-bold mb-6 flex items-center gap-2">
                <HiCreditCard className="w-5 h-5 text-gold" /> Payment Method
              </h2>
              {loadingMethods ? (
                <div className="space-y-3">
                  {[1,2].map(i => <div key={i} className="h-16 bg-theme-border/50 rounded-xl animate-pulse" />)}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Cash on Delivery */}
                  {codMethod && (
                    <label
                      className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                        form.paymentMethod === codMethod.key ? 'border-gold bg-gold/5' : 'border-theme-border hover:border-theme-muted'
                      }`}
                    >
                      <input
                        type="radio" name="paymentCategory" value={codMethod.key}
                        checked={form.paymentMethod === codMethod.key}
                        onChange={() => setForm(f => ({ ...f, paymentMethod: codMethod.key }))}
                        className="accent-gold"
                      />
                      <HiCash className="w-6 h-6 text-gold flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-theme-text font-medium text-sm">Cash on Delivery</p>
                        <p className="text-xs text-theme-muted">{codMethod.description || 'Pay when you receive your order'}</p>
                      </div>
                      {form.paymentMethod === codMethod.key && <HiCheck className="w-5 h-5 text-gold flex-shrink-0" />}
                    </label>
                  )}

                  {/* Online Payment (bank transfer, wallets, card, etc.) */}
                  {onlineMethods.length > 0 && (
                    <div
                      className={`rounded-xl border transition-all ${
                        isOnlineSelected ? 'border-gold bg-gold/5' : 'border-theme-border hover:border-theme-muted'
                      }`}
                    >
                      <label className="flex items-center gap-4 p-4 cursor-pointer">
                        <input
                          type="radio" name="paymentCategory" value="online"
                          checked={isOnlineSelected}
                          onChange={() => setForm(f => ({ ...f, paymentMethod: onlineMethods[0].key }))}
                          className="accent-gold"
                        />
                        <HiCreditCard className="w-6 h-6 text-gold flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-theme-text font-medium text-sm">Online Payment</p>
                          <p className="text-xs text-theme-muted">Bank transfer, EasyPaisa, JazzCash &amp; more</p>
                        </div>
                        {isOnlineSelected && <HiCheck className="w-5 h-5 text-gold flex-shrink-0" />}
                      </label>

                      <AnimatePresence>
                        {isOnlineSelected && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 pt-1 space-y-2">
                              {onlineMethods.map(method => {
                                const Icon = METHOD_ICONS[method.key] || HiCreditCard;
                                const active = form.paymentMethod === method.key;
                                const colorClass = METHOD_COLORS[method.key] || 'text-gold bg-gold/10';
                                return (
                                  <button
                                    type="button"
                                    key={method.key}
                                    onClick={() => setForm(f => ({ ...f, paymentMethod: method.key }))}
                                    aria-pressed={active}
                                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                                      active ? 'border-gold bg-gold/10' : 'border-theme-border/60 hover:border-theme-muted active:scale-[0.99]'
                                    }`}
                                  >
                                    <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                                      {method.icon_url
                                        ? <img src={resolveMediaUrl(method.icon_url)} alt={method.label} className="w-5 h-5 object-contain" />
                                        : <Icon className="w-4.5 h-4.5" />
                                      }
                                    </span>
                                    <span className="flex-1 min-w-0">
                                      <span className="block text-sm text-theme-text font-medium truncate">{method.label}</span>
                                      {method.requires_proof && (
                                        <span className="block text-xs text-theme-muted">Proof of payment required</span>
                                      )}
                                    </span>
                                    {active && <HiCheck className="w-5 h-5 text-gold flex-shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              )}

              {/* Inline payment preview for selected method */}
              <AnimatePresence>
                {!loadingMethods && form.paymentMethod === 'bank_transfer' && bankAccounts.length > 0 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="mt-4 p-4 bg-noir rounded-xl border border-theme-border/60 space-y-2">
                      <p className="text-xs text-gold font-semibold uppercase tracking-wider">After placing order, you'll see bank details & upload proof</p>
                      <p className="text-xs text-theme-muted opacity-70">{bankAccounts[0].bank_name} — {bankAccounts[0].account_title}</p>
                    </div>
                  </motion.div>
                )}
                {!loadingMethods && ['easypaisa','jazzcash','sadapay','nayapay','raast'].includes(form.paymentMethod) && wallets[form.paymentMethod] && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="mt-4 p-4 bg-noir rounded-xl border border-theme-border/60">
                      <p className="text-xs text-gold font-semibold uppercase tracking-wider">After placing order, you'll see payment details & upload proof</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile Order Summary */}
            <div className="lg:hidden luxury-card p-6">
              <h2 className="text-xl font-playfair font-bold mb-4">Order Summary</h2>
              <OrderSummaryContent
                items={items} subtotal={subtotal} discount={discount} shipping={shipping} total={total}
                appliedCoupon={appliedCoupon} couponCode={couponCode} setCouponCode={setCouponCode}
                handleApplyCoupon={handleApplyCoupon} removeCoupon={removeCoupon} isApplyingCoupon={isApplyingCoupon}
              />
            </div>

            <button type="submit" disabled={isSubmitting || loadingMethods} className="btn-gold w-full text-base py-4 font-montserrat">
              {isSubmitting ? 'Placing Order…' : requiresProof
                ? `Place Order & Continue to Payment — ${formatPrice(total)}`
                : `Place Order — ${formatPrice(total)}`
              }
            </button>
          </form>

          {/* Desktop Order Summary */}
          <div className="hidden lg:block">
            <div className="luxury-card p-6 sticky top-24">
              <h2 className="text-xl font-playfair font-bold mb-6">Order Summary</h2>
              <OrderSummaryContent
                items={items} subtotal={subtotal} discount={discount} shipping={shipping} total={total}
                appliedCoupon={appliedCoupon} couponCode={couponCode} setCouponCode={setCouponCode}
                handleApplyCoupon={handleApplyCoupon} removeCoupon={removeCoupon} isApplyingCoupon={isApplyingCoupon}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function InfoRow({ label, value, highlight }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-theme-muted opacity-70 text-xs min-w-[80px]">{label}:</span>
      <span className={`font-medium ${highlight ? 'text-gold text-base' : 'text-theme-text'}`}>{value}</span>
    </div>
  );
}

function ProofInput({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="block text-sm text-theme-muted mb-2 font-montserrat">{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-theme-bg border border-theme-border rounded-lg px-4 py-3 text-theme-text text-sm focus:border-theme-primary outline-none transition-colors"
      />
    </div>
  );
}

function OrderSummaryContent({ items, subtotal, discount, shipping, total, appliedCoupon, couponCode, setCouponCode, handleApplyCoupon, removeCoupon, isApplyingCoupon }) {
  return (
    <div className="space-y-4">
      <div className="space-y-3 max-h-48 overflow-y-auto">
        {items.map(item => (
          <div key={item.id} className="flex gap-3 items-center">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-noir-card flex-shrink-0">
              {item.product_image
                ? <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-theme-muted text-xs">IMG</div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-theme-text truncate">{item.product_name}</p>
              <p className="text-xs text-theme-muted">{item.variant_size} × {item.quantity}</p>
            </div>
            <p className="text-sm text-gold flex-shrink-0">{formatPrice(item.price * item.quantity)}</p>
          </div>
        ))}
      </div>

      <div className="border-t border-gold/10 pt-4 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-theme-muted">Subtotal</span><span className="text-theme-text">{formatPrice(subtotal)}</span></div>
        {discount > 0 && (
          <div className="flex justify-between text-success">
            <span className="flex items-center gap-1"><HiTag className="w-3.5 h-3.5" />Discount</span>
            <span>-{formatPrice(discount)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-theme-muted">Shipping</span>
          <span className={shipping === 0 ? 'text-success' : 'text-theme-text'}>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
        </div>
        <div className="flex justify-between pt-2 border-t border-gold/10">
          <span className="font-bold">Total</span>
          <span className="font-bold text-gold text-lg">{formatPrice(total)}</span>
        </div>
      </div>

      <div className="border-t border-gold/10 pt-4">
        {appliedCoupon ? (
          <div className="flex items-center justify-between bg-success/10 border border-success/30 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <HiCheck className="w-4 h-4 text-success" />
              <span className="text-success text-xs font-montserrat font-medium">{appliedCoupon.code} applied</span>
            </div>
            <button onClick={removeCoupon} className="text-theme-muted hover:text-danger transition-colors"><HiX className="w-4 h-4" /></button>
          </div>
        ) : (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <HiTag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted opacity-70" />
              <input
                type="text" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleApplyCoupon())}
                placeholder="Coupon code"
                className="w-full bg-theme-bg border border-theme-border rounded-lg pl-9 pr-3 py-2 text-theme-text text-xs focus:border-theme-primary outline-none placeholder-gray-600 transition-colors"
              />
            </div>
            <button
              type="button" onClick={handleApplyCoupon} disabled={isApplyingCoupon || !couponCode.trim()}
              className="px-3 py-2 bg-gold/10 border border-gold/30 text-gold text-xs rounded-lg hover:bg-gold hover:text-theme-bg transition-all disabled:opacity-50 font-montserrat whitespace-nowrap"
            >
              {isApplyingCoupon ? '…' : 'Apply'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CheckoutInput({ label, name, type = 'text', value, onChange, required }) {
  return (
    <div>
      <label className="block text-sm text-theme-muted mb-2 font-montserrat">{label}</label>
      <input
        type={type} name={name} value={value} onChange={onChange} required={required}
        className="w-full bg-theme-bg border border-theme-border rounded-lg px-4 py-3 text-theme-text focus:border-theme-primary outline-none text-sm transition-colors"
      />
    </div>
  );
}
