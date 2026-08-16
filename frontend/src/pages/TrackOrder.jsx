import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiTruck, HiSearch, HiCheck, HiClock, HiExternalLink, HiExclamationCircle } from 'react-icons/hi';
import { orderAPI } from '../services/api';

const STEPS = ['pending', 'confirmed', 'processing', 'packed', 'shipped', 'delivered'];
const LABELS = { pending:'Order Placed', confirmed:'Confirmed', processing:'Processing', packed:'Packed', shipped:'Shipped', delivered:'Delivered' };

export default function TrackOrder() {
  const [params, setParams] = useSearchParams();
  const [trackingNumber, setTrackingNumber] = useState(params.get('tracking') || '');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const lookup = async (value = trackingNumber) => {
    const number = String(value || '').trim();
    if (!number) { setError('Enter your tracking number.'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const { data } = await orderAPI.track(number);
      setResult(data);
      setParams({ tracking: number });
    } catch (e) {
      setError(e.response?.data?.error || 'We could not find that tracking number.');
    } finally { setLoading(false); }
  };

  useEffect(() => { const value = params.get('tracking'); if (value) lookup(value); }, []);

  const currentIndex = result ? Math.max(0, STEPS.indexOf(result.tracking.status)) : -1;
  const historyByStatus = Object.fromEntries((result?.history || []).map(h => [h.status, h]));

  return <>
    <Helmet><title>Track Order - Noor Mist</title></Helmet>
    <div className="min-h-screen px-4 pt-28 pb-32">
      <motion.div initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <HiTruck className="w-12 h-12 mx-auto text-gold mb-4" />
          <p className="text-gold text-xs uppercase tracking-[0.35em] font-montserrat mb-3">Shipment Tracking</p>
          <h1 className="text-4xl md:text-5xl font-playfair font-bold">Track Your Order</h1>
          <p className="text-theme-muted mt-3">Enter the tracking number provided in your shipping email.</p>
        </div>

        <form onSubmit={e => { e.preventDefault(); lookup(); }} className="luxury-card p-4 md:p-5 flex flex-col md:flex-row gap-3 mb-8">
          <input value={trackingNumber} onChange={e=>setTrackingNumber(e.target.value)} placeholder="Enter tracking number" className="flex-1 bg-noir border border-theme-border rounded-lg px-4 py-3 text-theme-text outline-none focus:border-theme-primary" autoComplete="off" />
          <button disabled={loading} className="btn-gold px-6 disabled:opacity-50"><HiSearch className="inline w-4 h-4 mr-2"/>{loading?'Checking…':'Track Order'}</button>
        </form>

        {error && <div className="luxury-card border border-red-500/30 p-5 text-red-300 mb-8 flex gap-3"><HiExclamationCircle className="w-5 h-5 flex-shrink-0"/><span>{error}</span></div>}

        {result && <div className="space-y-6">
          <div className="luxury-card p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
              <div><p className="text-xs text-theme-muted uppercase tracking-wider">Order</p><h2 className="text-2xl font-playfair font-bold">#{result.tracking.order_number}</h2></div>
              <div className="text-right"><p className="text-xs text-theme-muted uppercase tracking-wider">Current status</p><p className="text-gold font-semibold capitalize">{LABELS[result.tracking.status] || result.tracking.status}</p></div>
            </div>
            <div className="space-y-5">
              {STEPS.map((step, i) => {
                const done = i <= currentIndex;
                const h = historyByStatus[step];
                return <div key={step} className="flex gap-4">
                  <div className="flex flex-col items-center"><div className={`w-9 h-9 rounded-full flex items-center justify-center border ${done?'bg-gold text-black border-gold':'bg-noir text-gray-600 border-gray-700'}`}>{done?<HiCheck/>:<HiClock/>}</div>{i<STEPS.length-1&&<div className={`w-px flex-1 min-h-8 ${i<currentIndex?'bg-gold':'bg-gray-800'}`}/>}</div>
                  <div className="pb-5"><p className={`font-semibold ${done?'text-theme-text':'text-gray-600'}`}>{LABELS[step]}</p>{h?.created_at&&<p className="text-xs text-theme-muted mt-1">{new Date(h.created_at).toLocaleString()}</p>}{h?.note&&<p className="text-sm text-theme-muted mt-1">{h.note}</p>}</div>
                </div>;
              })}
            </div>
          </div>

          <div className="luxury-card p-6 grid md:grid-cols-2 gap-5">
            <div><p className="text-xs text-theme-muted uppercase tracking-wider">Delivery service</p><p className="mt-1 font-semibold">{result.tracking.carrier || 'Not specified'}</p></div>
            <div><p className="text-xs text-theme-muted uppercase tracking-wider">Tracking number</p><p className="mt-1 font-mono font-semibold">{result.tracking.tracking_number}</p></div>
            {result.tracking.tracking_url && <div className="md:col-span-2"><a href={result.tracking.tracking_url} target="_blank" rel="noreferrer" className="btn-outline-gold inline-flex items-center gap-2">Track with {result.tracking.carrier || 'delivery service'} <HiExternalLink/></a></div>}
          </div>
        </div>}
      </motion.div>
    </div>
  </>;
}
