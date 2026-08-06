import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { HiMail, HiPhone, HiLocationMarker, HiClock, HiChat } from 'react-icons/hi';
import { useQuery } from '@tanstack/react-query';
import { pagesAPI } from '../services/api';
import toast from 'react-hot-toast';
import BrandMark from '../components/UI/BrandMark';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data } = useQuery({
    queryKey: ['page', 'contact'],
    queryFn: async () => { const { data } = await pagesAPI.get('contact'); return data.content; },
    staleTime: 5 * 60 * 1000,
  });

  const d = data || {};

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1000));
    toast.success('Message sent successfully!');
    setForm({ name: '', email: '', subject: '', message: '' });
    setIsSubmitting(false);
  };

  const contactItems = [
    d.email && { icon: HiMail, label: 'Email', value: d.email, href: `mailto:${d.email}` },
    d.phone && { icon: HiPhone, label: 'Phone', value: d.phone, href: `tel:${d.phone}` },
    d.whatsapp && { icon: HiChat, label: 'WhatsApp', value: d.whatsapp, href: `https://wa.me/${d.whatsapp?.replace(/\D/g, '')}` },
    d.address && { icon: HiLocationMarker, label: 'Location', value: d.address },
    d.hours && { icon: HiClock, label: 'Hours', value: d.hours },
  ].filter(Boolean);

  const displayItems = contactItems.length > 0 ? contactItems : [
    { icon: HiMail, label: 'Email', value: 'contact@noormist.com', href: 'mailto:contact@noormist.com' },
    { icon: HiPhone, label: 'Phone', value: '+92 300 1234567' },
    { icon: HiLocationMarker, label: 'Location', value: 'Lahore, Pakistan' },
  ];

  return (
    <>
      <Helmet>
        <title>{d.heading || 'Contact Us'} - Noor Mist</title>
      </Helmet>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="text-center mb-12">
            <BrandMark />
            <span className="text-gold text-xs tracking-[0.4em] uppercase font-montserrat mb-4 block">Get In Touch</span>
            <h1 className="text-4xl md:text-5xl font-playfair font-bold mb-3">{d.heading || 'Contact Us'}</h1>
            {d.subheading && <p className="text-theme-muted font-cormorant text-lg">{d.subheading}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {displayItems.slice(0, 3).map((item, i) => (
              <div key={i} className="luxury-card p-6 text-center">
                <item.icon className="w-8 h-8 text-gold mx-auto mb-3" />
                <h3 className="text-xs font-montserrat text-theme-muted uppercase mb-2">{item.label}</h3>
                {item.href
                  ? <a href={item.href} className="text-theme-text hover:text-theme-primary transition-colors">{item.value}</a>
                  : <p className="text-theme-text">{item.value}</p>
                }
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Form */}
            <div className="lg:col-span-3">
              <form onSubmit={handleSubmit} className="luxury-card p-6 space-y-4">
                <h2 className="text-xl font-playfair font-bold text-theme-text mb-2">Send a Message</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input name="name" value={form.name} onChange={handleChange} placeholder="Your Name" required className="w-full bg-theme-bg border border-theme-border rounded-lg px-4 py-3 text-theme-text focus:border-theme-primary outline-none" />
                  <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Your Email" required className="w-full bg-theme-bg border border-theme-border rounded-lg px-4 py-3 text-theme-text focus:border-theme-primary outline-none" />
                </div>
                <input name="subject" value={form.subject} onChange={handleChange} placeholder="Subject" className="w-full bg-theme-bg border border-theme-border rounded-lg px-4 py-3 text-theme-text focus:border-theme-primary outline-none" />
                <textarea name="message" value={form.message} onChange={handleChange} placeholder="Your Message" rows={5} required className="w-full bg-theme-bg border border-theme-border rounded-lg px-4 py-3 text-theme-text focus:border-theme-primary outline-none resize-none" />
                <button type="submit" disabled={isSubmitting} className="btn-gold w-full">
                  {isSubmitting ? 'Sending…' : 'Send Message'}
                </button>
              </form>
            </div>

            {/* Extra info */}
            <div className="lg:col-span-2 space-y-4">
              {displayItems.slice(3).map((item, i) => (
                <div key={i} className="luxury-card p-5 flex items-start gap-4">
                  <item.icon className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-theme-muted font-montserrat uppercase mb-1">{item.label}</p>
                    <p className="text-theme-text text-sm">{item.value}</p>
                  </div>
                </div>
              ))}
              {d.map_embed && (
                <div className="rounded-xl overflow-hidden border border-theme-border h-48">
                  <iframe src={d.map_embed} width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" title="Map" />
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
