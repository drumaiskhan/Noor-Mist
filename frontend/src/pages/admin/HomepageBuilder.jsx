import React, { useState, useRef, useEffect } from 'react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { homepageAPI, themeAPI, uploadAPI, settingsAPI } from '../../services/api';
import {
  HiTemplate, HiColorSwatch, HiPhotograph, HiEye, HiEyeOff, HiPencil,
  HiCheck, HiX, HiUpload, HiDesktopComputer, HiDeviceMobile, HiSwitchVertical,
  HiRefresh, HiGlobe,
} from 'react-icons/hi';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'sections', label: 'Sections', icon: HiTemplate },
  { id: 'branding', label: 'Branding', icon: HiColorSwatch },
  { id: 'fonts', label: 'Fonts', icon: HiGlobe },
  { id: 'preview', label: 'Preview', icon: HiEye },
];

const SECTION_ICONS = {
  hero: '🎬', collections: '📦', bestsellers: '⭐', new_arrivals: '🆕',
  perfume_finder: '🔍', brand_story: '📖', testimonials: '💬',
  instagram: '📸', newsletter: '📧', trust_badges: '🛡️',
};

const GOOGLE_FONTS = [
  'Playfair Display', 'Cormorant Garamond', 'Cinzel', 'DM Serif Display',
  'Libre Baskerville', 'Lora', 'Merriweather', 'EB Garamond',
  'Montserrat', 'Inter', 'Raleway', 'Poppins', 'Lato', 'Nunito',
  'Open Sans', 'Source Sans 3',
];

const PRESET_COLORS = [
  { name: 'Luxury Gold', primary: '#D4AF37', secondary: '#0A0A0A', accent: '#B8960C' },
  { name: 'Royal Champagne', primary: '#C9A96E', secondary: '#1A1A1A', accent: '#F7E7CE' },
  { name: 'Midnight Oud', primary: '#8B6914', secondary: '#000000', accent: '#3E2723' },
  { name: 'Velvet Rose', primary: '#C41E3A', secondary: '#0A0A0A', accent: '#D4AF37' },
  { name: 'Emerald Gold', primary: '#D4AF37', secondary: '#0A1A0A', accent: '#2D5A27' },
  { name: 'Sapphire Night', primary: '#D4AF37', secondary: '#0A0A2E', accent: '#1E1E5E' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadGoogleFont(font) {
  if (!font) return;
  const id = `gfont-${font.replace(/\s+/g, '-')}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/\s+/g, '+')}:wght@400;600;700&display=swap`;
  document.head.appendChild(link);
}

// ─── Image Upload Field ────────────────────────────────────────────────────────

function ImageUploadField({ label, value, onChange, hint }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data } = await uploadAPI.image(file);
      onChange(data.url);
      toast.success('Image uploaded');
    } catch {
      toast.error('Upload failed — check Cloudinary settings');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="text-xs text-gray-400 mb-1 block font-montserrat">{label}</label>
      <div className="flex gap-2 items-start">
        <div className="flex-1">
          <input
            type="url"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://... or upload →"
            className="w-full bg-noir border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-gold outline-none"
          />
          {hint && <p className="text-xs text-gray-600 mt-1">{hint}</p>}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs transition-colors flex-shrink-0"
        >
          {uploading ? (
            <span className="animate-spin">⟳</span>
          ) : (
            <HiUpload className="w-3.5 h-3.5" />
          )}
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
      {value && (
        <div className="mt-2 relative w-full h-24 rounded-lg overflow-hidden border border-gray-700 bg-gray-900">
          <img src={value} alt="" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-1 right-1 w-5 h-5 bg-black/80 rounded-full flex items-center justify-center text-white hover:bg-red-900/80"
          >
            <HiX className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Section-specific editors ─────────────────────────────────────────────────

function TextField({ label, value, onChange, multiline, placeholder }) {
  const cls = "w-full bg-noir border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-gold outline-none";
  return (
    <div>
      <label className="text-xs text-gray-400 mb-1 block font-montserrat">{label}</label>
      {multiline
        ? <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} rows={3} placeholder={placeholder} className={`${cls} resize-none`} />
        : <input type="text" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      }
    </div>
  );
}

function SectionFields({ section, form, setForm }) {
  const f = (key) => (val) => setForm((p) => ({ ...p, [key]: val }));
  const t = (key, label, opts = {}) => (
    <TextField key={key} label={label} value={form[key]} onChange={f(key)} {...opts} />
  );
  const img = (key, label, hint) => (
    <ImageUploadField key={key} label={label} value={form[key]} onChange={f(key)} hint={hint} />
  );

  switch (section.section_type) {
    case 'hero':
      return (
        <div className="space-y-4">
          <div className="pb-2 border-b border-gray-800">
            <p className="text-xs text-gold uppercase tracking-widest font-montserrat">Content</p>
          </div>
          {t('subtitle', 'Eyebrow / Subtitle', { placeholder: 'Noor Mist Collection' })}
          {t('heading', 'Main Heading', { placeholder: 'Where Luxury Meets Mystery' })}
          {t('highlight', 'Gold Highlight Text', { placeholder: 'Art of Luxury' })}
          {t('description', 'Description', { multiline: true, placeholder: 'Experience the essence of elegance…' })}
          <div className="grid grid-cols-2 gap-3">
            {t('primaryButton', 'Primary Button Text')}
            {t('primaryLink', 'Primary Button Link', { placeholder: '/shop' })}
            {t('secondaryButton', 'Secondary Button Text')}
            {t('secondaryLink', 'Secondary Button Link', { placeholder: '/about' })}
          </div>
          <div className="pb-2 border-b border-gray-800 pt-2">
            <p className="text-xs text-gold uppercase tracking-widest font-montserrat">Background Media</p>
          </div>
          {img('backgroundImage', 'Desktop Background Image', 'Leave empty for the animated particle background')}
          {img('mobileImage', 'Mobile Background Image', 'Optional — falls back to desktop image')}
          <div>
            <label className="text-xs text-gray-400 mb-1 block font-montserrat">Overlay Darkness (0–90%)</label>
            <input
              type="range" min="0" max="90" step="5"
              value={parseInt(form.overlayOpacity ?? 0)}
              onChange={(e) => f('overlayOpacity')(e.target.value)}
              className="w-full accent-gold"
            />
            <p className="text-xs text-gray-500">{form.overlayOpacity ?? 0}% dark overlay</p>
          </div>
        </div>
      );

    case 'brand_story':
      return (
        <div className="space-y-4">
          {t('title', 'Section Heading', { placeholder: 'The Art of Perfumery' })}
          {t('description', 'Story Text', { multiline: true, placeholder: 'Noor Mist was born from a passion for luxury…' })}
          {img('image', 'Story Image')}
        </div>
      );

    case 'instagram': {
      const posts = form.posts && form.posts.length > 0 ? form.posts : [];
      const updatePost = (i, field, value) => {
        const next = [...posts];
        next[i] = { ...next[i], [field]: value };
        f('posts')(next);
      };
      const addPost = () => f('posts')([...posts, { image: '', likes: '', comments: '' }]);
      const removePost = (i) => f('posts')(posts.filter((_, idx) => idx !== i));

      return (
        <div className="space-y-4">
          {t('title', 'Section Heading', { placeholder: 'Follow Our Journey' })}
          {t('subtitle', 'Subtext', { placeholder: 'Join our community of fragrance lovers' })}
          {t('handle', 'Instagram Handle', { placeholder: '@noormist' })}

          <div className="pb-2 border-b border-gray-800 pt-2 flex items-center justify-between">
            <p className="text-xs text-gold uppercase tracking-widest font-montserrat">Posts</p>
            <span className="text-xs text-gray-500">{posts.length} post{posts.length === 1 ? '' : 's'} — 6 fits the grid best</span>
          </div>

          {posts.length === 0 && (
            <p className="text-xs text-gray-500">No posts yet — showing placeholder images until you add some.</p>
          )}

          {posts.map((post, i) => (
            <div key={i} className="border border-gray-800 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-montserrat">Post {i + 1}</span>
                <button
                  type="button"
                  onClick={() => removePost(i)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
              <ImageUploadField
                label="Image"
                value={post.image}
                onChange={(url) => updatePost(i, 'image', url)}
              />
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Likes" value={post.likes} onChange={(v) => updatePost(i, 'likes', v)} placeholder="2.4K" />
                <TextField label="Comments" value={post.comments} onChange={(v) => updatePost(i, 'comments', v)} placeholder="128" />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addPost}
            className="w-full py-2 border border-dashed border-gray-700 rounded-lg text-sm text-gray-400 hover:border-gold hover:text-gold transition-colors"
          >
            + Add Post
          </button>
        </div>
      );
    }

    case 'newsletter':
      return (
        <div className="space-y-4">
          {t('title', 'Heading', { placeholder: 'Join the Noor Mist Family' })}
          {t('subtitle', 'Subtext', { placeholder: 'Subscribe and receive 10% off…' })}
        </div>
      );

    case 'trust_badges':
      return (
        <div className="space-y-4">
          {t('freeShippingTitle', 'Free Shipping — Title')}
          {t('freeShippingText', 'Free Shipping — Text', { placeholder: 'On orders over {{free_shipping_threshold}}' })}
          {t('authenticTitle', 'Authenticity — Title')}
          {t('authenticText', 'Authenticity — Text')}
          {t('returnsTitle', 'Returns — Title')}
          {t('returnsText', 'Returns — Text')}
          {t('supportTitle', 'Support — Title')}
          {t('supportText', 'Support — Text')}
        </div>
      );

    case 'testimonials':
      return (
        <div className="space-y-4">
          {t('title', 'Section Heading', { placeholder: 'What Our Customers Say' })}
        </div>
      );

    default:
      return (
        <div className="space-y-4">
          {t('title', 'Section Title')}
          {t('subtitle', 'Subtitle / Description')}
        </div>
      );
  }
}

// ─── Section Editor Panel ─────────────────────────────────────────────────────

function SectionEditorPanel({ section, onSave, onClose }) {
  const [form, setForm] = useState({ ...section.content_data });

  const handleSave = () => {
    onSave(section.id, {
      title: form.title ?? section.title,
      content_data: form,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="bg-noir border border-gold/20 rounded-2xl p-5 mt-3 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-playfair font-bold text-white text-lg">
            {section.title || section.section_type}
          </h4>
          <p className="text-xs text-gray-500 capitalize mt-0.5">
            {section.section_type.replace(/_/g, ' ')}
          </p>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white p-1">
          <HiX className="w-4 h-4" />
        </button>
      </div>

      <SectionFields section={section} form={form} setForm={setForm} />

      <div className="flex gap-2 pt-2 border-t border-gray-800">
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-2 bg-gold text-black rounded-lg text-sm font-semibold hover:bg-gold/90 transition-colors"
        >
          <HiCheck className="w-4 h-4" />
          Save Section
        </button>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-4 py-2 border border-gray-700 text-gray-400 rounded-lg text-sm hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
}

// ─── Sections Tab ─────────────────────────────────────────────────────────────

function SectionsTab({ sections, updateMutation, reorderMutation }) {
  const [expandedId, setExpandedId] = useState(null);
  const [ordered, setOrdered] = useState(sections);

  useEffect(() => { setOrdered(sections); }, [sections]);

  const toggle = (section) => {
    updateMutation.mutate({ id: section.id, data: { is_enabled: !section.is_enabled } });
  };

  const handleSave = (id, data) => {
    updateMutation.mutate({ id, data }, {
      onSuccess: () => setExpandedId(null),
    });
  };

  const handleReorder = (reordered) => {
    setOrdered(reordered);
    reorderMutation.mutate(
      reordered.map((s, i) => ({ id: s.id, position: i + 1 }))
    );
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 mb-4">
        Drag sections to reorder. Click the pencil to edit content. Toggle the eye to show/hide.
      </p>
      <Reorder.Group axis="y" values={ordered} onReorder={handleReorder} className="space-y-2">
        {ordered.map((section) => (
          <Reorder.Item key={section.id} value={section} className="select-none">
            <div>
              <motion.div layout className="luxury-card p-4">
                <div className="flex items-center gap-3">
                  <div className="cursor-grab text-gray-600 hover:text-gray-400 touch-none">
                    <HiSwitchVertical className="w-5 h-5" />
                  </div>
                  <span className="text-xl">{SECTION_ICONS[section.section_type] || '📄'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">
                      {section.title || section.section_type}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {section.section_type.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setExpandedId(expandedId === section.id ? null : section.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        expandedId === section.id
                          ? 'text-gold bg-gold/10'
                          : 'text-gray-500 hover:text-blue-400'
                      }`}
                      title="Edit"
                    >
                      <HiPencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggle(section)}
                      className={`p-2 rounded-lg transition-colors ${
                        section.is_enabled
                          ? 'text-green-400 bg-green-400/10'
                          : 'text-gray-600 hover:text-gray-400'
                      }`}
                      title={section.is_enabled ? 'Hide' : 'Show'}
                    >
                      {section.is_enabled ? <HiEye className="w-4 h-4" /> : <HiEyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </motion.div>

              <AnimatePresence>
                {expandedId === section.id && (
                  <SectionEditorPanel
                    key={`editor-${section.id}`}
                    section={section}
                    onSave={handleSave}
                    onClose={() => setExpandedId(null)}
                  />
                )}
              </AnimatePresence>
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </div>
  );
}

// ─── Branding Tab ─────────────────────────────────────────────────────────────

function BrandingTab() {
  const queryClient = useQueryClient();
  const [colors, setColors] = useState(null);
  const [settings, setSettings] = useState({});
  const [activeThemeId, setActiveThemeId] = useState(null);
  const [uploading, setUploading] = useState({});

  const { data: themeData } = useQuery({
    queryKey: ['activeTheme'],
    queryFn: async () => {
      const { data } = await themeAPI.getActive();
      return data.theme ?? null;
    },
    onSuccess: (theme) => {
      if (theme && !colors) {
        setColors({
          primary_color: theme.primary_color,
          secondary_color: theme.secondary_color,
          accent_color: theme.accent_color,
        });
        setActiveThemeId(theme.id);
      }
    },
  });

  const { data: siteSettings } = useQuery({
    queryKey: ['siteSettings'],
    queryFn: async () => {
      const { data } = await settingsAPI.get();
      return data.settings ?? {};
    },
    onSuccess: (s) => setSettings(s),
  });

  useEffect(() => {
    if (themeData && !colors) {
      setColors({
        primary_color: themeData.primary_color,
        secondary_color: themeData.secondary_color,
        accent_color: themeData.accent_color,
      });
      setActiveThemeId(themeData.id);
    }
    if (siteSettings) setSettings(siteSettings);
  }, [themeData, siteSettings]);

  const updateThemeMutation = useMutation({
    mutationFn: ({ id, data }) => themeAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeTheme'] });
      toast.success('Colors saved');
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: settingsAPI.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siteSettings'] });
      toast.success('Branding saved');
    },
  });

  const handleSaveColors = () => {
    if (!activeThemeId) return toast.error('No active theme found');
    updateThemeMutation.mutate({ id: activeThemeId, data: { ...themeData, ...colors } });
  };

  const handleSaveBranding = () => {
    updateSettingsMutation.mutate({
      site_name: settings.site_name,
      tagline: settings.tagline,
      logo_url: settings.logo_url,
      logo_dark_url: settings.logo_dark_url,
      favicon_url: settings.favicon_url,
    });
  };

  const handleUpload = async (key) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setUploading((u) => ({ ...u, [key]: true }));
      try {
        const { data } = await uploadAPI.image(file);
        setSettings((s) => ({ ...s, [key]: data.url }));
        toast.success('Uploaded');
      } catch {
        toast.error('Upload failed');
      } finally {
        setUploading((u) => ({ ...u, [key]: false }));
      }
    };
    input.click();
  };

  if (!colors) return <div className="text-gray-400 text-sm">Loading…</div>;

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Color Presets */}
      <div className="luxury-card p-6 space-y-4">
        <h3 className="font-playfair font-bold text-white text-lg">Color Presets</h3>
        <div className="grid grid-cols-3 gap-2">
          {PRESET_COLORS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => setColors({ primary_color: preset.primary, secondary_color: preset.secondary, accent_color: preset.accent })}
              className="p-3 rounded-xl border border-gray-700 hover:border-gold/40 transition-colors text-left"
            >
              <div className="flex gap-1 mb-2">
                <div className="w-5 h-5 rounded-full border border-white/10" style={{ background: preset.primary }} />
                <div className="w-5 h-5 rounded-full border border-white/10" style={{ background: preset.secondary }} />
                <div className="w-5 h-5 rounded-full border border-white/10" style={{ background: preset.accent }} />
              </div>
              <p className="text-xs text-gray-300 font-montserrat">{preset.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Colors */}
      <div className="luxury-card p-6 space-y-4">
        <h3 className="font-playfair font-bold text-white text-lg">Custom Colors</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { key: 'primary_color', label: 'Primary (Gold)' },
            { key: 'secondary_color', label: 'Background' },
            { key: 'accent_color', label: 'Accent' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="text-xs text-gray-400 mb-2 block font-montserrat">{label}</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={colors[key] || '#D4AF37'}
                  onChange={(e) => setColors((c) => ({ ...c, [key]: e.target.value }))}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-gray-600 bg-transparent"
                />
                <input
                  type="text"
                  value={colors[key] || ''}
                  onChange={(e) => setColors((c) => ({ ...c, [key]: e.target.value }))}
                  className="flex-1 bg-noir border border-gray-700 rounded-lg px-2 py-2 text-white text-sm focus:border-gold outline-none font-mono"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Live color preview */}
        <div
          className="mt-4 rounded-xl p-5 border border-white/5"
          style={{ background: colors.secondary_color || '#0A0A0A' }}
        >
          <p className="text-xs font-montserrat uppercase tracking-widest mb-2" style={{ color: colors.primary_color }}>Preview</p>
          <p className="text-2xl font-playfair font-bold text-white mb-3">Noor Mist Collection</p>
          <button
            className="px-5 py-2 rounded-lg text-sm font-semibold font-montserrat"
            style={{ background: colors.primary_color, color: colors.secondary_color }}
          >
            Shop Now
          </button>
        </div>

        <button onClick={handleSaveColors} className="btn-gold w-full" disabled={updateThemeMutation.isPending}>
          <HiCheck className="w-4 h-4 inline mr-2" />
          {updateThemeMutation.isPending ? 'Saving…' : 'Save Colors'}
        </button>
      </div>

      {/* Brand Identity */}
      <div className="luxury-card p-6 space-y-4">
        <h3 className="font-playfair font-bold text-white text-lg">Brand Identity</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block font-montserrat">Site Name</label>
            <input
              type="text"
              value={settings.site_name || ''}
              onChange={(e) => setSettings((s) => ({ ...s, site_name: e.target.value }))}
              className="w-full bg-noir border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-gold outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block font-montserrat">Tagline</label>
            <input
              type="text"
              value={settings.tagline || ''}
              onChange={(e) => setSettings((s) => ({ ...s, tagline: e.target.value }))}
              className="w-full bg-noir border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-gold outline-none"
            />
          </div>
        </div>

        {/* Logo / Favicon uploads */}
        {[
          { key: 'logo_url', label: 'Logo (light bg)' },
          { key: 'logo_dark_url', label: 'Logo (dark bg)' },
          { key: 'favicon_url', label: 'Favicon' },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className="text-xs text-gray-400 mb-1 block font-montserrat">{label}</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={settings[key] || ''}
                onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.value }))}
                placeholder="https://..."
                className="flex-1 bg-noir border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-gold outline-none"
              />
              <button
                type="button"
                onClick={() => handleUpload(key)}
                disabled={uploading[key]}
                className="flex items-center gap-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs transition-colors"
              >
                {uploading[key] ? '…' : <HiUpload className="w-3.5 h-3.5" />}
              </button>
            </div>
            {settings[key] && (
              <img src={settings[key]} alt={label} className="mt-2 h-10 object-contain rounded" />
            )}
          </div>
        ))}

        <button onClick={handleSaveBranding} className="btn-gold w-full" disabled={updateSettingsMutation.isPending}>
          <HiCheck className="w-4 h-4 inline mr-2" />
          {updateSettingsMutation.isPending ? 'Saving…' : 'Save Branding'}
        </button>
      </div>
    </div>
  );
}

// ─── Fonts Tab ────────────────────────────────────────────────────────────────

function FontsTab() {
  const queryClient = useQueryClient();
  const [fonts, setFonts] = useState({ font_heading: 'Playfair Display', font_body: 'Cormorant Garamond', font_button: 'Montserrat' });
  const [activeThemeId, setActiveThemeId] = useState(null);

  const { data: themeData } = useQuery({
    queryKey: ['activeTheme'],
    queryFn: async () => {
      const { data } = await themeAPI.getActive();
      return data.theme ?? null;
    },
  });

  useEffect(() => {
    if (themeData) {
      setFonts({
        font_heading: themeData.font_heading || 'Playfair Display',
        font_body: themeData.font_body || 'Cormorant Garamond',
        font_button: themeData.font_button || 'Montserrat',
      });
      setActiveThemeId(themeData.id);
    }
  }, [themeData]);

  // Load all fonts for preview
  useEffect(() => {
    GOOGLE_FONTS.forEach(loadGoogleFont);
  }, []);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => themeAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeTheme'] });
      toast.success('Fonts saved — refresh the store to see changes');
    },
  });

  const handleSave = () => {
    if (!activeThemeId) return toast.error('No active theme found');
    updateMutation.mutate({ id: activeThemeId, data: { ...themeData, ...fonts } });
  };

  const FontPicker = ({ label, stateKey, description }) => (
    <div className="luxury-card p-5 space-y-3">
      <div>
        <h4 className="font-semibold text-white font-montserrat text-sm">{label}</h4>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {GOOGLE_FONTS.map((font) => (
          <button
            key={font}
            onClick={() => setFonts((f) => ({ ...f, [stateKey]: font }))}
            className={`p-2.5 rounded-lg border text-left text-sm transition-all ${
              fonts[stateKey] === font
                ? 'border-gold bg-gold/10 text-white'
                : 'border-gray-700 text-gray-400 hover:border-gray-500'
            }`}
          >
            <span style={{ fontFamily: font, fontSize: '15px' }}>{font.split(' ')[0]}</span>
            <p className="text-xs text-gray-500 mt-0.5 font-mono leading-tight">{font}</p>
          </button>
        ))}
      </div>
      {/* Live preview */}
      <div className="mt-2 p-3 bg-noir rounded-lg border border-gray-800">
        <p className="text-gray-400 text-xs mb-1 font-montserrat">Preview</p>
        <p style={{ fontFamily: fonts[stateKey], fontSize: label === 'Heading Font' ? '24px' : '16px' }} className="text-white">
          {label === 'Heading Font' ? 'Luxury Fragrances' : label === 'Body Font' ? 'Experience the essence of elegance with Noor Mist.' : 'SHOP COLLECTION'}
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 max-w-3xl">
      <p className="text-xs text-gray-500">
        All fonts load from Google Fonts. Changes apply site-wide after saving.
      </p>
      <FontPicker label="Heading Font" stateKey="font_heading" description="Used for page titles and section headings" />
      <FontPicker label="Body Font" stateKey="font_body" description="Used for descriptions and paragraph text" />
      <FontPicker label="Button Font" stateKey="font_button" description="Used for buttons and navigation labels" />

      <button onClick={handleSave} className="btn-gold" disabled={updateMutation.isPending}>
        <HiCheck className="w-4 h-4 inline mr-2" />
        {updateMutation.isPending ? 'Saving…' : 'Save Fonts'}
      </button>
    </div>
  );
}

// ─── Preview Tab ──────────────────────────────────────────────────────────────

function PreviewTab() {
  const [mode, setMode] = useState('desktop');
  const [key, setKey] = useState(0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setMode('desktop')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
              mode === 'desktop' ? 'bg-gold/10 text-gold border border-gold/30' : 'text-gray-400 hover:text-white border border-gray-700'
            }`}
          >
            <HiDesktopComputer className="w-4 h-4" /> Desktop
          </button>
          <button
            onClick={() => setMode('mobile')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
              mode === 'mobile' ? 'bg-gold/10 text-gold border border-gold/30' : 'text-gray-400 hover:text-white border border-gray-700'
            }`}
          >
            <HiDeviceMobile className="w-4 h-4" /> Mobile
          </button>
        </div>
        <button
          onClick={() => setKey((k) => k + 1)}
          className="flex items-center gap-1.5 px-3 py-2 text-gray-400 hover:text-white border border-gray-700 rounded-lg text-sm transition-colors"
        >
          <HiRefresh className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className={`mx-auto transition-all duration-500 ${mode === 'mobile' ? 'w-[390px]' : 'w-full'}`}>
        <div className={`rounded-2xl overflow-hidden border border-gray-800 shadow-2xl bg-noir ${mode === 'mobile' ? 'rounded-3xl' : ''}`}>
          {mode === 'mobile' && (
            <div className="bg-gray-900 px-4 py-2 flex items-center justify-center">
              <div className="w-20 h-1.5 bg-gray-700 rounded-full" />
            </div>
          )}
          <iframe
            key={key}
            src="/"
            title="Homepage Preview"
            className="w-full border-0"
            style={{ height: mode === 'mobile' ? '780px' : '700px' }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HomepageBuilder() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('sections');

  const { data: sectionsRaw = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['homepageSections'],
    queryFn: async () => {
      const { data } = await homepageAPI.getSections();
      return Array.isArray(data) ? data : [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => homepageAPI.updateSection(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepageSections'] });
      toast.success('Section updated');
    },
    onError: () => toast.error('Update failed'),
  });

  const reorderMutation = useMutation({
    mutationFn: (sections) => homepageAPI.reorder({ sections }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['homepageSections'] }),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-playfair font-bold mb-1">Homepage Builder</h1>
            <p className="text-gray-400 text-sm">Manage every visual element of your homepage without touching code.</p>
          </div>
          <button type="button" onClick={async () => { try { await refetch({ throwOnError: true }); toast.success('Homepage sections refreshed'); } catch (e) { toast.error('Failed to refresh homepage sections'); } }} disabled={isFetching} className="btn-outline-gold text-sm disabled:opacity-50">
            <HiRefresh className={`inline w-4 h-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} />{isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-noir-card rounded-xl border border-gray-800 w-fit">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-montserrat transition-all ${
                activeTab === tab.id
                  ? 'bg-gold text-black font-semibold shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'sections' && (
            isLoading
              ? <div className="text-gray-400 text-sm">Loading sections…</div>
              : <SectionsTab
                  sections={sectionsRaw}
                  updateMutation={updateMutation}
                  reorderMutation={reorderMutation}
                />
          )}
          {activeTab === 'branding' && <BrandingTab />}
          {activeTab === 'fonts' && <FontsTab />}
          {activeTab === 'preview' && <PreviewTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
