import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { HiCheck, HiPlus, HiTrash, HiDocumentText } from 'react-icons/hi';
import { pagesAPI } from '../../services/api';
import toast from 'react-hot-toast';

const PAGES = [
  { key: 'about', label: 'About Us', icon: '🏛️' },
  { key: 'contact', label: 'Contact', icon: '📞' },
  { key: 'faq', label: 'FAQ', icon: '❓' },
  { key: 'privacy', label: 'Privacy Policy', icon: '🔒' },
  { key: 'refund', label: 'Refund Policy', icon: '↩️' },
  { key: 'shipping_policy', label: 'Shipping Policy', icon: '🚚' },
  { key: 'terms', label: 'Terms & Conditions', icon: '📋' },
];

function Field({ label, value, onChange, multiline, rows = 4, placeholder, hint, mono }) {
  const cls = `w-full bg-noir border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-gold outline-none ${mono ? 'font-mono' : ''}`;
  return (
    <div>
      <label className="text-xs text-gray-400 mb-1 block font-montserrat">{label}</label>
      {multiline
        ? <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} className={`${cls} resize-none`} />
        : <input type="text" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      }
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

// ─── About Editor ─────────────────────────────────────────────────────────────
function AboutEditor({ data, onSave }) {
  const [form, setForm] = useState(data || {});
  const f = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Page Heading" value={form.heading} onChange={f('heading')} placeholder="About Noor Mist" />
        <Field label="Subheading" value={form.subheading} onChange={f('subheading')} placeholder="Where Luxury Meets Mystery" />
      </div>
      <Field label="Brand Story" value={form.story} onChange={f('story')} multiline rows={6} placeholder="Tell your brand's story…" />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Mission Statement" value={form.mission} onChange={f('mission')} multiline rows={3} />
        <Field label="Vision Statement" value={form.vision} onChange={f('vision')} multiline rows={3} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Founded Year" value={form.founded_year} onChange={f('founded_year')} placeholder="2020" />
        <Field label="Team Size" value={form.team_size} onChange={f('team_size')} placeholder="50+" />
        <Field label="Countries Served" value={form.countries} onChange={f('countries')} placeholder="25+" />
      </div>
      <Field label="Hero Image URL" value={form.image} onChange={f('image')} placeholder="https://..." />
      <button onClick={() => onSave(form)} className="btn-gold"><HiCheck className="w-4 h-4 inline mr-2" />Save About Page</button>
    </div>
  );
}

// ─── Contact Editor ───────────────────────────────────────────────────────────
function ContactEditor({ data, onSave }) {
  const [form, setForm] = useState(data || {});
  const f = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Page Heading" value={form.heading} onChange={f('heading')} placeholder="Contact Us" />
        <Field label="Subheading" value={form.subheading} onChange={f('subheading')} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Email Address" value={form.email} onChange={f('email')} placeholder="contact@noormist.com" />
        <Field label="Phone Number" value={form.phone} onChange={f('phone')} placeholder="+92 300 1234567" />
        <Field label="WhatsApp Number" value={form.whatsapp} onChange={f('whatsapp')} placeholder="+92 300 1234567" />
        <Field label="Business Hours" value={form.hours} onChange={f('hours')} placeholder="Mon–Sat: 9am – 6pm" />
      </div>
      <Field label="Address" value={form.address} onChange={f('address')} placeholder="Lahore, Pakistan" multiline rows={2} />
      <Field label="Google Maps Embed URL" value={form.map_embed} onChange={f('map_embed')} placeholder="https://maps.google.com/maps?..." hint="Paste the src URL from a Google Maps embed code" />
      <button onClick={() => onSave(form)} className="btn-gold"><HiCheck className="w-4 h-4 inline mr-2" />Save Contact Page</button>
    </div>
  );
}

// ─── FAQ Editor ───────────────────────────────────────────────────────────────
function FAQEditor({ data, onSave }) {
  const [items, setItems] = useState(Array.isArray(data) ? data : []);
  const add = () => setItems((p) => [...p, { q: '', a: '' }]);
  const remove = (i) => setItems((p) => p.filter((_, idx) => idx !== i));
  const update = (i, k, v) => setItems((p) => p.map((item, idx) => idx === i ? { ...item, [k]: v } : item));
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{items.length} questions</p>
        <button onClick={add} className="flex items-center gap-1.5 text-sm text-gold hover:text-gold/80 transition-colors">
          <HiPlus className="w-4 h-4" /> Add Question
        </button>
      </div>
      {items.map((item, i) => (
        <div key={i} className="p-4 bg-noir rounded-xl border border-gray-800 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 font-montserrat">Question {i + 1}</p>
            <button onClick={() => remove(i)} className="text-gray-600 hover:text-red-400 transition-colors"><HiTrash className="w-4 h-4" /></button>
          </div>
          <Field label="Question" value={item.q} onChange={(v) => update(i, 'q', v)} placeholder="What makes your fragrances special?" />
          <Field label="Answer" value={item.a} onChange={(v) => update(i, 'a', v)} multiline rows={3} placeholder="Our fragrances are…" />
        </div>
      ))}
      <button onClick={() => onSave(items)} className="btn-gold"><HiCheck className="w-4 h-4 inline mr-2" />Save FAQ</button>
    </div>
  );
}

// ─── Policy Editor (Privacy, Refund, Shipping, Terms) ─────────────────────────
function PolicyEditor({ data, label, onSave }) {
  const [form, setForm] = useState(data || { heading: '', content: '' });
  return (
    <div className="space-y-4">
      <Field label="Page Title" value={form.heading} onChange={(v) => setForm((p) => ({ ...p, heading: v }))} placeholder={label} />
      <Field
        label="Content (HTML supported)"
        value={form.content}
        onChange={(v) => setForm((p) => ({ ...p, content: v }))}
        multiline rows={20}
        placeholder="<h2>Section</h2><p>Your policy text here...</p>"
        hint="You can use basic HTML: <h2>, <p>, <ul>, <li>, <strong>, <a href='...'>"
        mono
      />
      <button onClick={() => onSave(form)} className="btn-gold"><HiCheck className="w-4 h-4 inline mr-2" />Save {label}</button>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function PageEditor() {
  const queryClient = useQueryClient();
  const [activePage, setActivePage] = useState('about');

  const { data: pageData, isLoading } = useQuery({
    queryKey: ['page', activePage],
    queryFn: async () => {
      const { data } = await pagesAPI.get(activePage);
      return data.content;
    },
  });

  const saveMutation = useMutation({
    mutationFn: (content) => pagesAPI.update(activePage, content),
    onSuccess: () => { queryClient.invalidateQueries(['page', activePage]); toast.success('Page saved'); },
    onError: () => toast.error('Save failed'),
  });

  const currentPage = PAGES.find((p) => p.key === activePage);

  const renderEditor = () => {
    if (isLoading) return <div className="text-gray-400 text-sm py-8 text-center">Loading…</div>;
    switch (activePage) {
      case 'about': return <AboutEditor data={pageData} onSave={saveMutation.mutate} />;
      case 'contact': return <ContactEditor data={pageData} onSave={saveMutation.mutate} />;
      case 'faq': return <FAQEditor data={pageData} onSave={saveMutation.mutate} />;
      default: return <PolicyEditor data={pageData} label={currentPage?.label} onSave={saveMutation.mutate} />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-playfair font-bold mb-1">Page Editor</h1>
        <p className="text-gray-400 text-sm">Edit content for all static pages without touching code.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PAGES.map((page) => (
          <button
            key={page.key}
            onClick={() => setActivePage(page.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-montserrat transition-all border ${
              activePage === page.key
                ? 'bg-gold text-black font-semibold border-gold'
                : 'text-gray-400 hover:text-white border-gray-700 hover:border-gray-500'
            }`}
          >
            <span>{page.icon}</span> {page.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activePage} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          <div className="luxury-card p-6">
            <h2 className="text-xl font-playfair font-bold text-white mb-6 flex items-center gap-2">
              <span>{currentPage?.icon}</span> {currentPage?.label}
            </h2>
            {renderEditor()}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
