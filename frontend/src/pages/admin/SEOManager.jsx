import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { seoAPI, settingsAPI } from '../../services/api';
import { HiPencil, HiCheck, HiGlobe, HiCode, HiDocumentText, HiChartBar } from 'react-icons/hi';
import toast from 'react-hot-toast';

const PAGE_LIST = [
  { path: '/', label: 'Homepage' },
  { path: '/shop', label: 'Shop' },
  { path: '/about', label: 'About Us' },
  { path: '/contact', label: 'Contact' },
  { path: '/faq', label: 'FAQ' },
  { path: '/privacy', label: 'Privacy Policy' },
  { path: '/refund', label: 'Refund Policy' },
  { path: '/shipping-policy', label: 'Shipping Policy' },
  { path: '/terms', label: 'Terms & Conditions' },
];

const TABS = [
  { id: 'pages', label: 'Page SEO', icon: HiGlobe },
  { id: 'tracking', label: 'Tracking Codes', icon: HiChartBar },
  { id: 'robots', label: 'Robots.txt', icon: HiDocumentText },
  { id: 'sitemap', label: 'Sitemap', icon: HiCode },
];

function InputRow({ label, value, onChange, multiline, placeholder, hint }) {
  const cls = 'w-full bg-noir border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-gold outline-none';
  return (
    <div>
      <label className="text-xs text-gray-400 mb-1 block font-montserrat">{label}</label>
      {multiline
        ? <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} rows={3} placeholder={placeholder} className={`${cls} resize-none`} />
        : <input type="text" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      }
      {hint && <p className="text-xs text-gray-600 mt-1">{hint}</p>}
    </div>
  );
}

// ─── Page SEO Tab ──────────────────────────────────────────────────────────────
function PageSEOTab() {
  const queryClient = useQueryClient();
  const [editingPath, setEditingPath] = useState(null);
  const [form, setForm] = useState({});

  const { data: seoData = [] } = useQuery({
    queryKey: ['seoSettings'],
    queryFn: async () => {
      const { data } = await seoAPI.getAll();
      return data.seoSettings ?? [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ path, data }) => seoAPI.update(path, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['seoSettings'] }); toast.success('SEO updated'); setEditingPath(null); },
  });

  const getSeo = (path) => seoData.find((s) => s.page_path === path) || {};

  const handleEdit = (path) => { setEditingPath(path); setForm(getSeo(path)); };
  const handleSave = () => updateMutation.mutate({ path: editingPath, data: form });

  return (
    <div className="space-y-3">
      {PAGE_LIST.map((page) => {
        const seo = getSeo(page.path);
        const isEditing = editingPath === page.path;
        return (
          <motion.div key={page.path} layout className="luxury-card p-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-white font-semibold">{page.label}</h3>
                <p className="text-xs text-gray-500 font-mono">{page.path}</p>
              </div>
              <button
                onClick={() => isEditing ? handleSave() : handleEdit(page.path)}
                className={`p-2 rounded-lg transition-all ${isEditing ? 'bg-gold text-black' : 'text-gray-400 hover:text-blue-400'}`}
              >
                {isEditing ? <HiCheck className="w-4 h-4" /> : <HiPencil className="w-4 h-4" />}
              </button>
            </div>
            {isEditing ? (
              <div className="space-y-3 pt-2 border-t border-gray-800">
                <InputRow label="Meta Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="Page title (50–60 chars)" />
                <InputRow label="Meta Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} multiline placeholder="Page description (150–160 chars)" />
                <InputRow label="Keywords" value={form.keywords} onChange={(v) => setForm({ ...form, keywords: v })} placeholder="comma, separated, keywords" />
                <div className="grid grid-cols-2 gap-3">
                  <InputRow label="OG Title" value={form.og_title} onChange={(v) => setForm({ ...form, og_title: v })} />
                  <InputRow label="OG Image URL" value={form.og_image} onChange={(v) => setForm({ ...form, og_image: v })} />
                </div>
                <InputRow label="OG Description" value={form.og_description} onChange={(v) => setForm({ ...form, og_description: v })} multiline />
                <div className="flex gap-2 pt-1">
                  <button onClick={handleSave} className="btn-gold text-xs py-2 px-4">Save</button>
                  <button onClick={() => setEditingPath(null)} className="btn-outline-gold text-xs py-2 px-4">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="text-sm space-y-0.5">
                <p className="text-gray-500 text-xs">{seo.title || <span className="italic text-gray-600">No title set</span>}</p>
                <p className="text-gray-600 text-xs truncate">{seo.description || <span className="italic">No description</span>}</p>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Tracking Codes Tab ────────────────────────────────────────────────────────
function TrackingTab() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({});

  const { data: settings } = useQuery({
    queryKey: ['siteSettings'],
    queryFn: async () => { const { data } = await settingsAPI.get(); return data.settings ?? {}; },
  });

  React.useEffect(() => { if (settings) setForm(settings); }, [settings]);

  const saveMutation = useMutation({
    mutationFn: settingsAPI.update,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['siteSettings'] }); toast.success('Tracking codes saved'); },
  });

  const handleSave = () => {
    saveMutation.mutate({
      ga4_id: form.ga4_id || '',
      fb_pixel_id: form.fb_pixel_id || '',
      gtm_id: form.gtm_id || '',
      hotjar_id: form.hotjar_id || '',
      tiktok_pixel_id: form.tiktok_pixel_id || '',
      custom_head_scripts: form.custom_head_scripts || '',
      custom_body_scripts: form.custom_body_scripts || '',
    });
  };

  const f = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));
  const field = (label, key, placeholder, hint) => (
    <div key={key}>
      <label className="text-xs text-gray-400 mb-1 block font-montserrat">{label}</label>
      <input type="text" value={form[key] || ''} onChange={f(key)} placeholder={placeholder} className="w-full bg-noir border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-gold outline-none font-mono" />
      {hint && <p className="text-xs text-gray-600 mt-1">{hint}</p>}
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="luxury-card p-6 space-y-4">
        <h3 className="font-playfair font-bold text-white text-lg">Analytics & Pixels</h3>
        {field('Google Analytics 4 (Measurement ID)', 'ga4_id', 'G-XXXXXXXXXX', 'e.g. G-ABC123DEF4')}
        {field('Google Tag Manager ID', 'gtm_id', 'GTM-XXXXXXX', 'e.g. GTM-ABCDEF1')}
        {field('Facebook Pixel ID', 'fb_pixel_id', '1234567890123456', '15-digit Pixel ID from Meta Business Manager')}
        {field('TikTok Pixel ID', 'tiktok_pixel_id', 'XXXXXXXXXXXXXXXX')}
        {field('Hotjar Site ID', 'hotjar_id', '1234567')}
      </div>

      <div className="luxury-card p-6 space-y-4">
        <h3 className="font-playfair font-bold text-white text-lg">Custom Scripts</h3>
        <div>
          <label className="text-xs text-gray-400 mb-1 block font-montserrat">Custom &lt;head&gt; Scripts</label>
          <textarea value={form.custom_head_scripts || ''} onChange={f('custom_head_scripts')} rows={4} placeholder="<!-- Paste script tags here -->" className="w-full bg-noir border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-gold outline-none resize-none font-mono" />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block font-montserrat">Custom &lt;body&gt; Scripts</label>
          <textarea value={form.custom_body_scripts || ''} onChange={f('custom_body_scripts')} rows={4} placeholder="<!-- Paste script tags here -->" className="w-full bg-noir border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-gold outline-none resize-none font-mono" />
        </div>
      </div>

      <button onClick={handleSave} className="btn-gold" disabled={saveMutation.isPending}>
        <HiCheck className="w-4 h-4 inline mr-2" />
        {saveMutation.isPending ? 'Saving…' : 'Save Tracking Codes'}
      </button>
    </div>
  );
}

// ─── Robots.txt Tab ────────────────────────────────────────────────────────────
function RobotsTab() {
  const queryClient = useQueryClient();
  const defaultRobots = `User-agent: *\nAllow: /\n\nDisallow: /admin/\nDisallow: /api/\nDisallow: /checkout\nDisallow: /account\n\nSitemap: http://localhost:5173/sitemap.xml`;
  const [content, setContent] = useState('');

  const { data: settings } = useQuery({
    queryKey: ['siteSettings'],
    queryFn: async () => { const { data } = await settingsAPI.get(); return data.settings ?? {}; },
  });
  React.useEffect(() => { if (settings) setContent(settings.robots_txt || defaultRobots); }, [settings]);

  const saveMutation = useMutation({
    mutationFn: () => settingsAPI.update({ robots_txt: content }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['siteSettings'] }); toast.success('robots.txt saved'); },
  });

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="luxury-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-playfair font-bold text-white text-lg">robots.txt Content</h3>
          <button onClick={() => setContent(defaultRobots)} className="text-xs text-gray-400 hover:text-gold transition-colors">Reset to default</button>
        </div>
        <p className="text-xs text-gray-500">This content will be served at /robots.txt. Controls which pages search engine crawlers can access.</p>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={14}
          spellCheck={false}
          className="w-full bg-noir border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:border-gold outline-none resize-none font-mono"
        />
      </div>
      <button onClick={() => saveMutation.mutate()} className="btn-gold" disabled={saveMutation.isPending}>
        <HiCheck className="w-4 h-4 inline mr-2" />
        Save robots.txt
      </button>
    </div>
  );
}

// ─── Sitemap Tab ───────────────────────────────────────────────────────────────
function SitemapTab() {
  const [xml, setXml] = useState('');
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const { data } = await seoAPI.getSitemap();
      setXml(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
    } catch {
      toast.error('Failed to generate sitemap');
    } finally {
      setLoading(false);
    }
  };

  const copy = () => { navigator.clipboard.writeText(xml); toast.success('Copied to clipboard'); };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="luxury-card p-6 space-y-4">
        <h3 className="font-playfair font-bold text-white text-lg">XML Sitemap</h3>
        <p className="text-xs text-gray-500">Dynamically generated sitemap including all products and static pages. Submit to Google Search Console.</p>
        <div className="flex gap-2">
          <button onClick={generate} disabled={loading} className="btn-gold text-sm">
            {loading ? 'Generating…' : '⚡ Generate Sitemap'}
          </button>
          {xml && <button onClick={copy} className="btn-outline-gold text-sm">Copy XML</button>}
        </div>
        {xml && (
          <textarea
            value={xml}
            readOnly
            rows={16}
            className="w-full bg-noir border border-gray-700 rounded-lg px-4 py-3 text-white text-xs font-mono outline-none resize-none"
          />
        )}
      </div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function SEOManager() {
  const [tab, setTab] = useState('pages');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-playfair font-bold mb-1">SEO Manager</h1>
        <p className="text-gray-400 text-sm">Manage meta tags, tracking codes, robots.txt, and sitemaps.</p>
      </div>

      <div className="flex gap-1 p-1 bg-noir-card rounded-xl border border-gray-800 w-fit">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-montserrat transition-all ${tab === t.id ? 'bg-gold text-black font-semibold' : 'text-gray-400 hover:text-white'}`}
            >
              <Icon className="w-4 h-4" />{t.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          {tab === 'pages' && <PageSEOTab />}
          {tab === 'tracking' && <TrackingTab />}
          {tab === 'robots' && <RobotsTab />}
          {tab === 'sitemap' && <SitemapTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
