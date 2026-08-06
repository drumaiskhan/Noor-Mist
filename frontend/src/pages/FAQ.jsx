import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { HiChevronDown } from 'react-icons/hi';
import { useQuery } from '@tanstack/react-query';
import { pagesAPI } from '../services/api';
import BrandMark from '../components/UI/BrandMark';

const DEFAULTS = [
  { q: 'What makes Noor Mist fragrances special?', a: 'Our fragrances are crafted using the finest ingredients sourced globally, blended by master perfumers with decades of experience.' },
  { q: 'How long do the fragrances last?', a: 'Longevity varies by concentration. Our Parfum lasts 8-12 hours, while Eau de Parfum lasts 6-8 hours.' },
  { q: 'Do you ship internationally?', a: 'Yes, we ship to over 50 countries worldwide. Shipping times vary by location.' },
  { q: 'What is your return policy?', a: 'We offer a 14-day return policy for unopened products in their original packaging.' },
  { q: 'Are your products authentic?', a: 'Absolutely. All Noor Mist products are 100% authentic and come with a certificate of authenticity.' },
  { q: 'How should I store my perfume?', a: 'Store in a cool, dark place away from direct sunlight and temperature fluctuations to preserve the fragrance.' },
];

function FAQItem({ faq, isOpen, onClick }) {
  return (
    <div className="border-b border-theme-border/60">
      <button onClick={onClick} className="flex items-center justify-between w-full py-5 text-left">
        <span className="text-theme-text font-medium pr-4">{faq.q}</span>
        <HiChevronDown className={`w-5 h-5 text-gold flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <p className="text-theme-muted pb-5 leading-relaxed">{faq.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  const [open, setOpen] = useState(null);

  const { data } = useQuery({
    queryKey: ['page', 'faq'],
    queryFn: async () => { const { data } = await pagesAPI.get('faq'); return data.content; },
    staleTime: 5 * 60 * 1000,
  });

  const faqs = Array.isArray(data) && data.length > 0 ? data : DEFAULTS;

  return (
    <>
      <Helmet>
        <title>FAQ - Noor Mist</title>
        <meta name="description" content="Frequently asked questions about Noor Mist luxury fragrances." />
      </Helmet>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="text-center mb-12">
            <BrandMark />
            <span className="text-gold text-xs tracking-[0.4em] uppercase font-montserrat mb-4 block">Help Center</span>
            <h1 className="text-4xl md:text-5xl font-playfair font-bold mb-3">Frequently Asked Questions</h1>
            <p className="text-theme-muted font-cormorant text-lg">Everything you need to know about Noor Mist</p>
          </div>

          <div className="luxury-card p-6 md:p-8">
            {faqs.map((faq, i) => (
              <FAQItem key={i} faq={faq} isOpen={open === i} onClick={() => setOpen(open === i ? null : i)} />
            ))}
          </div>
        </motion.div>
      </div>
    </>
  );
}
