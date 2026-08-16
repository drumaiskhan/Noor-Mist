import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { themeAPI, uploadAPI } from '@services/api';
import toast from 'react-hot-toast';
import useThemeStore from '../../store/themeStore';

// ─────────────────────────────────────────────────────────────────────────
// Field definitions
// ─────────────────────────────────────────────────────────────────────────

// The 8 required brand colors, always shown.
const COLOR_FIELDS = [
  { key: 'primary_color', label: 'Primary Color', hint: 'Buttons, links, highlights' },
  { key: 'secondary_color', label: 'Secondary Color', hint: 'Header/footer backgrounds, dark surfaces' },
  { key: 'accent_color', label: 'Accent Color', hint: 'Hover states, secondary highlights' },
  { key: 'background_color', label: 'Background Color', hint: 'Main page background' },
  { key: 'surface_color', label: 'Surface Color', hint: 'Panels, inputs, skeleton loaders' },
  { key: 'card_color', label: 'Card / Surface Color', hint: 'Product cards, modals, dropdowns' },
  { key: 'text_primary', label: 'Text Color', hint: 'Headings and body text' },
  { key: 'text_secondary', label: 'Muted Text Color', hint: 'Captions, labels, helper copy' },
  { key: 'border_color', label: 'Border Color', hint: 'Dividers, input borders' },
];

// Optional overrides — left blank, these derive from the core palette above.
const EXTRA_COLOR_FIELDS = [
  { key: 'button_color', label: 'Button Color', hint: 'Leave blank to use Primary Color' },
  { key: 'button_hover_color', label: 'Button Hover Color', hint: 'Leave blank to auto-lighten Button Color' },
  { key: 'button_text_color', label: 'Button Text Color', hint: 'Leave blank to use Background Color' },
  { key: 'gradient_start', label: 'Gradient Start', hint: 'Used when Button Style = Gradient' },
  { key: 'gradient_end', label: 'Gradient End', hint: 'Used when Button Style = Gradient' },
  { key: 'announcement_bg', label: 'Announcement Bar Background', hint: 'Leave blank to use Primary Color' },
  { key: 'announcement_text_color', label: 'Announcement Bar Text', hint: 'Leave blank to use Background Color' },
  { key: 'footer_bg', label: 'Footer Background', hint: 'Leave blank to use Secondary Color' },
  { key: 'footer_text_color', label: 'Footer Text', hint: 'Leave blank to use Secondary Text' },
];

const FONT_OPTIONS = [
  'Playfair Display', 'Cormorant Garamond', 'Montserrat', 'Inter', 'Lora',
  'Merriweather', 'Raleway', 'Poppins', 'DM Serif Display', 'Libre Baskerville',
];

const BUTTON_STYLES = [
  { value: 'solid', label: 'Solid' },
  { value: 'outline', label: 'Outline' },
  { value: 'gradient', label: 'Gradient' },
  { value: 'glass', label: 'Glass' },
];

const HOVER_EFFECTS = [
  { value: 'none', label: 'None' },
  { value: 'lift', label: 'Lift' },
  { value: 'glow', label: 'Glow' },
  { value: 'scale', label: 'Scale' },
];

const CARD_HOVER_EFFECTS = [
  { value: 'none', label: 'None' },
  { value: 'lift', label: 'Lift' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'glow', label: 'Glow' },
];

const SITE_WIDTHS = [
  { value: 'compact', label: 'Compact (1140px)' },
  { value: 'normal', label: 'Normal (1280px)' },
  { value: 'wide', label: 'Wide (1440px)' },
];

const SHADOW_STYLES = [
  { value: 'none', label: 'None' },
  { value: 'soft', label: 'Soft' },
  { value: 'premium', label: 'Premium' },
  { value: 'glass', label: 'Glass' },
];

const CARD_STYLES = [
  { value: 'flat', label: 'Flat', hint: 'No border or shadow' },
  { value: 'bordered', label: 'Bordered', hint: 'Thin border, no shadow' },
  { value: 'elevated', label: 'Elevated', hint: 'Border + drop shadow (default)' },
  { value: 'glass', label: 'Glass', hint: 'Frosted, translucent surface' },
];

const PRODUCT_CARD_STYLES = [
  { value: 'minimal', label: 'Minimal', hint: 'Image, name & price only' },
  { value: 'detailed', label: 'Detailed', hint: 'Adds rating & size chips (default)' },
  { value: 'overlay', label: 'Overlay', hint: 'Info overlaid on the image' },
];

const MODE_OPTIONS = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'auto', label: 'Auto (follows visitor\'s system)' },
];

const TABS = [
  { id: 'colors', label: 'Colors' },
  { id: 'typography', label: 'Typography' },
  { id: 'layout', label: 'Layout' },
  { id: 'effects', label: 'Effects' },
  { id: 'presets', label: 'Presets' },
];

// ─────────────────────────────────────────────────────────────────────────
// The 5 required preset themes, plus a few bonus variations. Any field left
// out here is filled in by BLANK_THEME defaults, so every preset still
// produces a complete theme.
// ─────────────────────────────────────────────────────────────────────────
const PRESET_THEMES = [
  {
    name: 'Golden Noir',
    description: 'Classic luxury black & gold',
    primary_color: '#D4AF37', secondary_color: '#0A0A0A', accent_color: '#B8960C',
    background_color: '#0A0A0A', surface_color: '#141414', card_color: '#141414',
    text_primary: '#FFFFFF', text_secondary: '#9CA3AF', border_color: '#2A2A2A',
    font_heading: 'Playfair Display', font_body: 'Cormorant Garamond', font_button: 'Montserrat',
    border_radius: 8, card_style: 'elevated', theme_mode: 'dark',
    glass_effect: true, shadows_enabled: true, animations_enabled: true,
  },
  {
    name: 'Luxury Black',
    description: 'Pure matte black, minimal gold accents',
    primary_color: '#C9A96E', secondary_color: '#000000', accent_color: '#8B6914',
    background_color: '#000000', surface_color: '#0D0D0D', card_color: '#0D0D0D',
    text_primary: '#FFFFFF', text_secondary: '#8A8A8A', border_color: '#1F1F1F',
    font_heading: 'Playfair Display', font_body: 'Cormorant Garamond', font_button: 'Inter',
    border_radius: 4, card_style: 'bordered', theme_mode: 'dark',
    glass_effect: false, shadows_enabled: true, animations_enabled: true,
  },
  {
    name: 'Royal Gold',
    description: 'Opulent gold on deep espresso brown',
    primary_color: '#FFD700', secondary_color: '#1A1208', accent_color: '#D4AF37',
    background_color: '#140F08', surface_color: '#1E1710', card_color: '#1E1710',
    text_primary: '#FFF8E7', text_secondary: '#B8A888', border_color: '#3A2E1A',
    font_heading: 'Playfair Display', font_body: 'Cormorant Garamond', font_button: 'Montserrat',
    border_radius: 10, card_style: 'glass', theme_mode: 'dark',
    glass_effect: true, shadows_enabled: true, animations_enabled: true,
  },
  {
    name: 'Minimal White',
    description: 'Clean, airy, editorial luxury',
    primary_color: '#B8960C', secondary_color: '#F5F5F0', accent_color: '#8A7433',
    background_color: '#FFFFFF', surface_color: '#F7F7F5', card_color: '#FFFFFF',
    text_primary: '#0A0A0A', text_secondary: '#6B7280', border_color: '#E5E5E0',
    font_heading: 'Playfair Display', font_body: 'Inter', font_button: 'Montserrat',
    border_radius: 6, card_style: 'bordered', theme_mode: 'light',
    glass_effect: false, shadows_enabled: true, animations_enabled: true,
  },
  {
    name: 'Emerald Luxury',
    description: 'Rich emerald green with gold trim',
    primary_color: '#D4AF37', secondary_color: '#08150E', accent_color: '#1F6B4A',
    background_color: '#081008', surface_color: '#0D1A11', card_color: '#0D1A11',
    text_primary: '#FFFFFF', text_secondary: '#9CB8A8', border_color: '#1D3324',
    font_heading: 'Playfair Display', font_body: 'Cormorant Garamond', font_button: 'Inter',
    border_radius: 8, card_style: 'elevated', theme_mode: 'dark',
    glass_effect: true, shadows_enabled: true, animations_enabled: true,
  },
];

// Starting point for a brand-new, fully manual theme.
const BLANK_THEME = {
  name: 'My Custom Theme',
  primary_color: '#D4AF37', secondary_color: '#0A0A0A', accent_color: '#B8960C',
  background_color: '#0A0A0A', surface_color: '#141414', card_color: '#1A1A1A',
  text_primary: '#FFFFFF', text_secondary: '#9CA3AF', border_color: '#2A2A2A',
  button_color: '', button_hover_color: '', button_text_color: '',
  gradient_start: '', gradient_end: '',
  button_style: 'solid', button_hover_effect: 'lift',
  button_padding_x: 36, button_padding_y: 14, button_font_size: 14,
  announcement_bg: '', announcement_text_color: '', footer_bg: '', footer_text_color: '',
  font_heading: 'Playfair Display', font_body: 'Cormorant Garamond', font_button: 'Montserrat',
  body_font_size: 17, line_height: 1.7, letter_spacing: 0, heading_weight: 700,
  site_width: 'normal', section_spacing: 80, shadow_style: 'soft',
  card_style: 'elevated', product_card_style: 'detailed',
  border_radius: 8, glass_effect: true, blur_intensity: 12,
  animations_enabled: true, shadows_enabled: true, card_hover_effect: 'lift',
  theme_mode: 'dark', bg_effect_enabled: true, bg_effect_intensity: 70, custom_css: '',
};

const swatchKeys = ['primary_color', 'secondary_color', 'accent_color', 'background_color'];

// Mirrors the resolution logic in themeStore.applyThemeToDOM so the admin
// preview matches what actually renders on the live site.
function ButtonPreview({ theme: t }) {
  const btnColor = t.button_color || t.primary_color;
  const btnText = t.button_text_color || t.background_color;
  const gradStart = t.gradient_start || t.primary_color;
  const gradEnd = t.gradient_end || t.accent_color;

  const styleMap = {
    solid: { background: btnColor, border: 'none', color: btnText, backdropFilter: 'none' },
    gradient: { background: `linear-gradient(135deg, ${gradStart} 0%, ${gradEnd} 100%)`, border: 'none', color: btnText, backdropFilter: 'none' },
    outline: { background: 'transparent', border: `2px solid ${btnColor}`, color: btnColor, backdropFilter: 'none' },
    glass: { background: `${btnColor}26`, border: `1px solid ${btnColor}66`, color: btnColor, backdropFilter: 'blur(12px)' },
  };
  const resolved = styleMap[t.button_style] || styleMap.solid;

  return (
    <button
      style={{
        ...resolved,
        fontFamily: t.font_button,
        borderRadius: `${t.border_radius ?? 8}px`,
        padding: `${t.button_padding_y ?? 14}px ${t.button_padding_x ?? 36}px`,
        fontSize: `${t.button_font_size ?? 14}px`,
        fontWeight: 600,
        letterSpacing: '1px',
        textTransform: 'uppercase',
      }}
    >
      {t.button_style === 'outline' ? 'Outline Button' : t.button_style === 'gradient' ? 'Gradient Button' : t.button_style === 'glass' ? 'Glass Button' : 'Solid Button'}
    </button>
  );
}

// Full live preview panel — mirrors card style, hover, shadows, radius, fonts,
// buttons and the color palette all at once, so the admin sees exactly what
// a visitor would see, updating on every keystroke.
function LivePreview({ theme: t }) {
  const cardStyleMap = {
    flat: { background: t.card_color, border: 'none', boxShadow: 'none', backdropFilter: 'none' },
    bordered: { background: t.card_color, border: `1px solid ${t.border_color}`, boxShadow: 'none', backdropFilter: 'none' },
    elevated: { background: t.card_color, border: `1px solid ${t.border_color}`, boxShadow: '0 20px 40px rgba(0,0,0,0.35)', backdropFilter: 'none' },
    glass: { background: `${t.card_color}8c`, border: `1px solid ${t.border_color}99`, boxShadow: '0 8px 32px rgba(0,0,0,0.25)', backdropFilter: `blur(${t.blur_intensity ?? 12}px)` },
  };
  const cardStyle = cardStyleMap[t.card_style] || cardStyleMap.elevated;

  return (
    <div
      className="p-6 md:p-8 rounded-xl border transition-all"
      style={{
        backgroundColor: t.background_color || '#0A0A0A',
        borderColor: t.border_color || '#2A2A2A',
        maxWidth: t.site_width === 'compact' ? '100%' : t.site_width === 'wide' ? '100%' : '100%',
      }}
    >
      <h3
        style={{
          fontFamily: t.font_heading,
          color: t.primary_color,
          fontWeight: t.heading_weight ?? 700,
          fontSize: '1.75rem',
          letterSpacing: `${t.letter_spacing ?? 0}px`,
        }}
        className="mb-2"
      >
        Preview Heading
      </h3>
      <p
        style={{
          fontFamily: t.font_body,
          color: t.text_primary,
          fontSize: `${t.body_font_size ?? 17}px`,
          lineHeight: t.line_height ?? 1.7,
          letterSpacing: `${t.letter_spacing ?? 0}px`,
        }}
        className="mb-1"
      >
        This is how body text looks with the selected font, size and spacing.
      </p>
      <p className="mb-5 text-sm" style={{ fontFamily: t.font_body, color: t.text_secondary }}>
        Muted / secondary text, like captions and helper copy.
      </p>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {[0, 1].map((i) => (
          <div
            key={i}
            style={{
              ...cardStyle,
              borderRadius: `${t.border_radius ?? 8}px`,
              padding: '16px',
              transition: (t.animations_enabled ?? true) ? 'transform 0.3s ease, box-shadow 0.3s ease' : 'none',
            }}
            className="theme-preview-card"
          >
            <div style={{ background: t.surface_color, borderRadius: `${Math.max((t.border_radius ?? 8) - 2, 0)}px`, aspectRatio: '1', marginBottom: 10 }} />
            <p style={{ color: t.text_primary, fontFamily: t.font_body, fontSize: 14, fontWeight: 600 }}>Product Name</p>
            <p style={{ color: t.primary_color, fontFamily: t.font_body, fontSize: 14 }}>Rs. 4,999</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <ButtonPreview theme={t} />
        <span
          style={{
            background: t.accent_color,
            color: t.background_color,
            borderRadius: 999,
            padding: '4px 12px',
            fontSize: 11,
            fontFamily: t.font_button,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          Badge
        </span>
      </div>

      <style>{`
        .theme-preview-card:hover {
          transform: ${t.card_hover_effect === 'lift' ? 'translateY(-4px)' : t.card_hover_effect === 'zoom' ? 'scale(1.02)' : 'none'};
        }
      `}</style>
    </div>
  );
}

export default function ThemeEditor() {
  const queryClient = useQueryClient();
  const resetToDefault = useThemeStore((s) => s.resetToDefault);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [customizing, setCustomizing] = useState(false);
  const [activeTab, setActiveTab] = useState('colors');
  const [showExtraColors, setShowExtraColors] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef(null);

  const { data: themes = [], isLoading } = useQuery({
    queryKey: ['themes'],
    queryFn: async () => {
      const { data } = await themeAPI.getAll();
      return data.themes ?? [];
    },
  });

  const { data: activeTheme } = useQuery({
    queryKey: ['activeTheme'],
    queryFn: async () => {
      const { data } = await themeAPI.getActive();
      return data.theme ?? null;
    },
  });

  const invalidateThemeQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['themes'] });
    queryClient.invalidateQueries({ queryKey: ['activeTheme'] });
  };

  const applyMutation = useMutation({
    mutationFn: themeAPI.apply,
    onSuccess: () => { invalidateThemeQueries(); toast.success('Theme applied — live on the site now'); },
    onError: () => toast.error('Failed to apply theme'),
  });

  const createMutation = useMutation({
    mutationFn: themeAPI.create,
    onSuccess: () => { invalidateThemeQueries(); toast.success('Theme created'); },
    onError: () => toast.error('Failed to create theme'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => themeAPI.update(id, data),
    onSuccess: () => { invalidateThemeQueries(); toast.success('Theme updated'); },
    onError: () => toast.error('Failed to update theme'),
  });

  const duplicateMutation = useMutation({
    mutationFn: ({ id, name }) => themeAPI.duplicate(id, name),
    onSuccess: () => { invalidateThemeQueries(); toast.success('Theme duplicated'); },
    onError: () => toast.error('Failed to duplicate theme'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => themeAPI.remove(id),
    onSuccess: () => { invalidateThemeQueries(); toast.success('Theme deleted'); },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to delete theme'),
  });

  const resetMutation = useMutation({
    mutationFn: () => resetToDefault(),
    onSuccess: () => { invalidateThemeQueries(); toast.success('Reset to Golden Noir default'); },
    onError: () => toast.error('Failed to reset theme'),
  });

  const openTheme = (theme) => {
    setSelectedTheme({ ...BLANK_THEME, ...theme });
    setActiveTab('colors');
    setCustomizing(true);
  };

  const applyPreset = (preset) => {
    createMutation.mutate({ ...BLANK_THEME, ...preset }, {
      onSuccess: (res) => {
        const newId = res?.data?.theme?.id;
        if (newId) applyMutation.mutate(newId);
      },
    });
  };

  const handleRename = (theme) => {
    const name = window.prompt('Rename theme', theme.name);
    if (!name || name === theme.name) return;
    updateMutation.mutate({ id: theme.id, data: { ...theme, name } });
  };

  const handleDuplicate = (theme) => {
    duplicateMutation.mutate({ id: theme.id, name: `${theme.name} (Copy)` });
  };

  const handleDelete = (theme) => {
    if (theme.id === activeTheme?.id) {
      toast.error('Apply a different theme before deleting the active one');
      return;
    }
    if (!window.confirm(`Delete "${theme.name}"? This can't be undone.`)) return;
    deleteMutation.mutate(theme.id);
  };

  const setField = (key, value) => setSelectedTheme((prev) => ({ ...prev, [key]: value }));

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file next time
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    setUploadingLogo(true);
    try {
      const { data } = await uploadAPI.image(file);
      setField('watermark_logo_url', data.url);
      toast.success('Logo uploaded');
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploadingLogo(false);
    }
  };

  const saving = updateMutation.isPending || createMutation.isPending;

  if (isLoading) return <div className="p-8 text-center"><div className="skeleton w-64 h-8 mx-auto rounded" /></div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-playfair font-bold mb-2">Theme Builder</h1>
          <p className="text-theme-muted font-cormorant text-lg">Customize every visual detail of Noor Mist from one place</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { if (window.confirm('Reset the live site to the Golden Noir default theme?')) resetMutation.mutate(); }}
            className="btn-outline !py-2 !px-4 !text-sm"
            disabled={resetMutation.isPending}
          >
            {resetMutation.isPending ? 'Resetting…' : 'Reset to Default'}
          </button>
          <button
            onClick={() => openTheme({ ...BLANK_THEME })}
            className="btn-gold !py-2 !px-4 !text-sm"
          >
            + New Custom Theme
          </button>
        </div>
      </div>

      {/* Current Active Theme */}
      {activeTheme && (
        <div className="theme-card p-6 mb-8">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-theme-muted mb-1">Live on site now</p>
              <h3 className="text-xl font-playfair font-bold">{activeTheme.name}</h3>
              <p className="text-theme-muted text-sm capitalize">{activeTheme.theme_mode || 'dark'} mode · {activeTheme.card_style || 'elevated'} cards</p>
            </div>
            <div className="flex gap-2">
              {swatchKeys.map((key) => (
                <div key={key} className="w-10 h-10 rounded-full border-2 border-theme-border" style={{ backgroundColor: activeTheme[key] }} title={key} />
              ))}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => openTheme(activeTheme)} className="btn-outline !py-2 !px-4 !text-xs">Customize</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-theme-border overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 text-sm font-montserrat whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id ? 'border-gold text-gold' : 'border-transparent text-theme-muted hover:text-theme-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Presets tab: browse required presets + manage saved themes ── */}
      {activeTab === 'presets' && (
        <div>
          <div className="mb-10">
            <h2 className="text-xl font-playfair font-bold mb-1">Preset Themes</h2>
            <p className="text-theme-muted text-sm mb-6">One-click starting points. Applying a preset saves it as a new theme and makes it live immediately.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {PRESET_THEMES.map((preset) => (
                <motion.button
                  key={preset.name}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => applyPreset(preset)}
                  disabled={createMutation.isPending}
                  className="theme-card p-4 text-left cursor-pointer disabled:opacity-50"
                >
                  <div className="flex gap-1.5 mb-3">
                    {swatchKeys.map((key) => (
                      <div key={key} className="w-7 h-7 rounded-full border border-theme-border" style={{ backgroundColor: preset[key] }} />
                    ))}
                  </div>
                  <h4 className="font-semibold text-sm mb-1">{preset.name}</h4>
                  <p className="text-xs text-theme-muted">{preset.description}</p>
                </motion.button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-playfair font-bold">Your Themes</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {themes.length === 0 ? (
                <p className="text-theme-muted col-span-3">No saved themes yet — apply a preset above or create a custom theme.</p>
              ) : (
                themes.map((theme) => (
                  <motion.div
                    key={theme.id}
                    whileHover={{ scale: 1.01 }}
                    className={`theme-card p-6 ${activeTheme?.id === theme.id ? 'border-2 border-gold' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-playfair font-bold text-lg truncate">{theme.name}</h3>
                      {activeTheme?.id === theme.id && (
                        <span className="bg-gold text-theme-bg text-xs px-3 py-1 rounded-full font-semibold flex-shrink-0">Active</span>
                      )}
                    </div>
                    <div className="flex gap-2 mb-4">
                      {swatchKeys.map((key) => (
                        <div key={key} className="w-10 h-10 rounded-full border-2 border-theme-border" style={{ backgroundColor: theme[key] }} />
                      ))}
                    </div>
                    <div className="space-y-1 text-xs text-theme-muted mb-4">
                      <p>Heading: {theme.font_heading}</p>
                      <p className="capitalize">{theme.theme_mode || 'dark'} mode · {theme.card_style || 'elevated'} cards</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {activeTheme?.id !== theme.id && (
                        <button onClick={() => applyMutation.mutate(theme.id)} className="btn-gold !py-1.5 !px-3 !text-xs" disabled={applyMutation.isPending}>
                          Apply
                        </button>
                      )}
                      <button onClick={() => openTheme(theme)} className="btn-outline !py-1.5 !px-3 !text-xs">Customize</button>
                      <button onClick={() => handleDuplicate(theme)} className="btn-outline !py-1.5 !px-3 !text-xs" disabled={duplicateMutation.isPending}>Duplicate</button>
                      <button onClick={() => handleRename(theme)} className="btn-outline !py-1.5 !px-3 !text-xs">Rename</button>
                      <button
                        onClick={() => handleDelete(theme)}
                        className="!py-1.5 !px-3 !text-xs rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors"
                        disabled={deleteMutation.isPending || themes.length <= 1}
                        title={themes.length <= 1 ? "Can't delete the only theme" : theme.id === activeTheme?.id ? 'Apply another theme first' : 'Delete theme'}
                      >
                        Delete
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Customization tabs (Colors / Typography / Layout / Effects) ── */}
      {activeTab !== 'presets' && !customizing && (
        <div className="theme-card p-10 text-center">
          <p className="text-theme-muted mb-4">Select a theme to customize, or start a new one.</p>
          <div className="flex justify-center gap-3">
            {activeTheme && <button onClick={() => openTheme(activeTheme)} className="btn-gold !py-2 !px-5 !text-sm">Edit Active Theme</button>}
            <button onClick={() => openTheme({ ...BLANK_THEME })} className="btn-outline !py-2 !px-5 !text-sm">New Custom Theme</button>
          </div>
        </div>
      )}

      {activeTab !== 'presets' && customizing && selectedTheme && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="theme-card p-6">
          <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-xs font-montserrat text-theme-muted mb-2 uppercase tracking-wider">Theme Name</label>
              <input
                type="text"
                value={selectedTheme.name}
                onChange={(e) => setField('name', e.target.value)}
                className="w-full max-w-md bg-noir border border-theme-border rounded-lg px-4 py-2.5 text-theme-text focus:border-gold outline-none"
              />
            </div>
            <button onClick={() => setCustomizing(false)} className="text-theme-muted hover:text-theme-text text-2xl leading-none">✕</button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: controls for the active tab */}
            <div>
              {activeTab === 'colors' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {COLOR_FIELDS.map(({ key, label, hint }) => (
                    <ColorField key={key} label={label} hint={hint} value={selectedTheme[key]} onChange={(v) => setField(key, v)} />
                  ))}

                  <div className="sm:col-span-2 pt-4 mt-2 border-t border-theme-border">
                    <button
                      type="button"
                      onClick={() => setShowExtraColors((v) => !v)}
                      className="text-sm text-gold hover:underline font-montserrat"
                    >
                      {showExtraColors ? '– Hide' : '+ Show'} button / announcement / footer overrides
                    </button>
                  </div>

                  {showExtraColors && EXTRA_COLOR_FIELDS.map(({ key, label, hint }) => (
                    <ColorField
                      key={key} label={label} hint={hint}
                      value={selectedTheme[key]} placeholder="auto"
                      fallback={selectedTheme.primary_color}
                      onChange={(v) => setField(key, v)}
                      onReset={() => setField(key, '')}
                    />
                  ))}
                </div>
              )}

              {activeTab === 'typography' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <SelectField label="Heading Font" value={selectedTheme.font_heading} options={FONT_OPTIONS} onChange={(v) => setField('font_heading', v)} />
                  <SelectField label="Body Font" value={selectedTheme.font_body} options={FONT_OPTIONS} onChange={(v) => setField('font_body', v)} />
                  <SelectField label="Button Font" value={selectedTheme.font_button} options={FONT_OPTIONS} onChange={(v) => setField('font_button', v)} />
                  <SelectField
                    label="Heading Weight" value={selectedTheme.heading_weight ?? 700}
                    options={[400, 500, 600, 700, 800, 900]} onChange={(v) => setField('heading_weight', Number(v))}
                  />
                  <RangeField label="Body Font Size" unit="px" min={14} max={20} value={selectedTheme.body_font_size ?? 17} onChange={(v) => setField('body_font_size', v)} />
                  <RangeField label="Line Height" min={1.2} max={2.2} step={0.1} value={selectedTheme.line_height ?? 1.7} onChange={(v) => setField('line_height', v)} decimals={1} />
                  <RangeField label="Letter Spacing" unit="px" min={-1} max={4} step={0.5} value={selectedTheme.letter_spacing ?? 0} onChange={(v) => setField('letter_spacing', v)} />
                </div>
              )}

              {activeTab === 'layout' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <SelectField label="Container Width" value={selectedTheme.site_width || 'normal'} options={SITE_WIDTHS} onChange={(v) => setField('site_width', v)} />
                    <RangeField label="Section Spacing" unit="px" min={32} max={160} step={8} value={selectedTheme.section_spacing ?? 80} onChange={(v) => setField('section_spacing', v)} />
                    <RangeField label="Border Radius" unit="px" min={0} max={24} value={selectedTheme.border_radius ?? 8} onChange={(v) => setField('border_radius', v)} />
                    <SelectField label="Shadow Style" value={selectedTheme.shadow_style || 'soft'} options={SHADOW_STYLES} onChange={(v) => setField('shadow_style', v)} />
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wider text-theme-muted mb-3 font-montserrat">Card Style</p>
                    <TileSelect options={CARD_STYLES} value={selectedTheme.card_style || 'elevated'} onChange={(v) => setField('card_style', v)} />
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wider text-theme-muted mb-3 font-montserrat">Product Card Design</p>
                    <TileSelect options={PRODUCT_CARD_STYLES} value={selectedTheme.product_card_style || 'detailed'} onChange={(v) => setField('product_card_style', v)} />
                  </div>

                  <div className="pt-6 border-t border-theme-border">
                    <p className="text-xs uppercase tracking-wider text-theme-muted mb-4 font-montserrat">Button Style</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <SelectField label="Style" value={selectedTheme.button_style || 'solid'} options={BUTTON_STYLES} onChange={(v) => setField('button_style', v)} />
                      <SelectField label="Hover Animation" value={selectedTheme.button_hover_effect || 'lift'} options={HOVER_EFFECTS} onChange={(v) => setField('button_hover_effect', v)} />
                      <RangeField label="Horizontal Padding" unit="px" min={16} max={60} value={selectedTheme.button_padding_x ?? 36} onChange={(v) => setField('button_padding_x', v)} />
                      <RangeField label="Vertical Padding" unit="px" min={8} max={24} value={selectedTheme.button_padding_y ?? 14} onChange={(v) => setField('button_padding_y', v)} />
                      <RangeField label="Font Size" unit="px" min={11} max={18} value={selectedTheme.button_font_size ?? 14} onChange={(v) => setField('button_font_size', v)} />
                    </div>
                    <div className="mt-5 flex gap-3 flex-wrap p-5 rounded-xl border border-theme-border" style={{ backgroundColor: selectedTheme.background_color }}>
                      <ButtonPreview theme={selectedTheme} />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'effects' && (
                <div className="space-y-6">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-theme-muted mb-3 font-montserrat">Mode</p>
                    <TileSelect
                      options={MODE_OPTIONS.map((m) => ({ value: m.value, label: m.label }))}
                      value={selectedTheme.theme_mode || 'dark'}
                      onChange={(v) => setField('theme_mode', v)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-theme-border">
                    <ToggleField label="Animations" checked={selectedTheme.animations_enabled ?? true} onChange={(v) => setField('animations_enabled', v)} />
                    <ToggleField label="Glass Effect" checked={selectedTheme.glass_effect ?? true} onChange={(v) => setField('glass_effect', v)} />
                    <ToggleField label="Shadows" checked={selectedTheme.shadows_enabled ?? true} onChange={(v) => setField('shadows_enabled', v)} />
                  </div>

                  <RangeField
                    label="Blur Intensity (glass effect)" unit="px" min={0} max={32}
                    value={selectedTheme.blur_intensity ?? 12} onChange={(v) => setField('blur_intensity', v)}
                    disabled={!(selectedTheme.glass_effect ?? true)}
                  />

                  <div className="pt-4 border-t border-theme-border">
                    <p className="text-xs uppercase tracking-wider text-theme-muted mb-3 font-montserrat">Background Flourish</p>
                    <p className="text-xs text-theme-muted opacity-70 mb-3">
                      The site-wide gold glow, corner frame and faint NM watermark behind every page.
                    </p>
                    <ToggleField
                      label="Enable Background Flourish"
                      checked={selectedTheme.bg_effect_enabled ?? true}
                      onChange={(v) => setField('bg_effect_enabled', v)}
                    />
                    <div className="mt-4">
                      <RangeField
                        label="Flourish Intensity" unit="%" min={0} max={100}
                        value={selectedTheme.bg_effect_intensity ?? 70}
                        onChange={(v) => setField('bg_effect_intensity', v)}
                        disabled={!(selectedTheme.bg_effect_enabled ?? true)}
                      />
                    </div>

                    <div className="mt-6 pt-5 border-t border-theme-border">
                      <p className="text-xs uppercase tracking-wider text-theme-muted mb-1 font-montserrat">Watermark Logo</p>
                      <p className="text-xs text-theme-muted opacity-70 mb-3">
                        Replaces the default "NM" text mark with your own logo, site-wide. Leave empty to keep the text mark.
                      </p>

                      <div className="flex items-center gap-4 flex-wrap">
                        {selectedTheme.watermark_logo_url ? (
                          <div
                            className="w-20 h-20 rounded-lg border border-theme-border flex items-center justify-center p-2"
                            style={{ backgroundColor: selectedTheme.background_color }}
                          >
                            <img
                              src={selectedTheme.watermark_logo_url}
                              alt="Watermark logo preview"
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-20 h-20 rounded-lg border border-dashed border-theme-border flex items-center justify-center text-theme-muted text-[10px] text-center px-2">
                            No logo set
                          </div>
                        )}

                        <div className="flex flex-col gap-2">
                          <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleLogoUpload}
                          />
                          <button
                            type="button"
                            onClick={() => logoInputRef.current?.click()}
                            disabled={uploadingLogo}
                            className="px-4 py-2 text-sm rounded-lg border border-theme-border text-theme-text hover:border-gold transition disabled:opacity-50"
                          >
                            {uploadingLogo ? 'Uploading…' : selectedTheme.watermark_logo_url ? 'Replace Logo' : 'Upload Logo'}
                          </button>

                          {selectedTheme.watermark_logo_url && (
                            <button
                              type="button"
                              onClick={() => setField('watermark_logo_url', '')}
                              disabled={uploadingLogo}
                              className="px-4 py-2 text-sm rounded-lg text-theme-muted hover:text-red-400 transition disabled:opacity-50"
                            >
                              Remove — use "NM" text mark
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-theme-muted opacity-60 mt-3">
                        Best results: a square, transparent PNG or SVG, ideally light/gold-toned — it renders faint and
                        semi-transparent behind page content, so busy or dark logos may not read well.
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wider text-theme-muted mb-3 font-montserrat">Card Hover Effect</p>
                    <TileSelect options={CARD_HOVER_EFFECTS} value={selectedTheme.card_hover_effect || 'lift'} onChange={(v) => setField('card_hover_effect', v)} />
                  </div>

                  <div className="pt-6 border-t border-theme-border">
                    <label className="block text-xs font-montserrat text-theme-muted mb-2 uppercase tracking-wider">Custom CSS (advanced)</label>
                    <textarea
                      value={selectedTheme.custom_css || ''}
                      onChange={(e) => setField('custom_css', e.target.value)}
                      rows={8}
                      placeholder=".my-class { color: red; }"
                      className="w-full bg-noir border border-theme-border rounded-lg px-4 py-3 text-theme-text focus:border-gold outline-none font-mono text-sm"
                    />
                    <p className="text-xs text-theme-muted mt-2">
                      Injected site-wide on save. There's no Custom JavaScript field — letting arbitrary JS run for
                      every visitor is a stored script-injection risk. If you need analytics/pixel scripts, a
                      dedicated integration field is a safer way to add those.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Right: sticky live preview, updates on every change */}
            <div className="lg:sticky lg:top-6 self-start">
              <p className="text-xs uppercase tracking-wider text-theme-muted mb-3 font-montserrat">Live Preview</p>
              <LivePreview theme={selectedTheme} />
            </div>
          </div>

          <div className="flex gap-4 mt-8 flex-wrap pt-6 border-t border-theme-border">
            <button
              onClick={() => {
                if (selectedTheme.id) {
                  updateMutation.mutate({ id: selectedTheme.id, data: selectedTheme });
                } else {
                  createMutation.mutate(selectedTheme, {
                    onSuccess: (res) => setSelectedTheme(res?.data?.theme ?? selectedTheme),
                  });
                }
              }}
              className="btn-gold"
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button
              onClick={async () => {
                if (selectedTheme.id) {
                  await updateMutation.mutateAsync({ id: selectedTheme.id, data: selectedTheme });
                  applyMutation.mutate(selectedTheme.id);
                } else {
                  const res = await createMutation.mutateAsync(selectedTheme);
                  const newId = res?.data?.theme?.id;
                  if (newId) applyMutation.mutate(newId);
                }
                setCustomizing(false);
              }}
              className="btn-outline"
              disabled={saving || applyMutation.isPending}
            >
              Save &amp; Apply
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Small reusable field components
// ─────────────────────────────────────────────────────────────────────────

function ColorField({ label, hint, value, placeholder, fallback, onChange, onReset }) {
  return (
    <div>
      <label className="block text-sm font-montserrat text-theme-muted mb-2">
        {label}
        {hint && <span className="block text-xs text-theme-muted opacity-60 font-normal mt-0.5">{hint}</span>}
      </label>
      <div className="flex gap-3 items-center">
        <input
          type="color"
          value={value || fallback || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-11 h-11 rounded cursor-pointer flex-shrink-0"
        />
        <input
          type="text"
          value={value || ''}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-noir border border-theme-border rounded-lg px-3 py-2.5 text-theme-text focus:border-gold outline-none font-mono text-sm"
        />
        {onReset && value && (
          <button type="button" onClick={onReset} className="text-xs text-theme-muted hover:text-theme-text px-1" title="Reset to automatic">
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

function SelectField({ label, value, options, onChange }) {
  const opts = options.map((o) => (typeof o === 'object' ? o : { value: o, label: String(o) }));
  return (
    <div>
      <label className="block text-sm font-montserrat text-theme-muted mb-2">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-noir border border-theme-border rounded-lg px-4 py-2.5 text-theme-text focus:border-gold outline-none"
      >
        {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function RangeField({ label, unit = '', min, max, step = 1, value, onChange, decimals = 0, disabled }) {
  return (
    <div className={disabled ? 'opacity-40 pointer-events-none' : ''}>
      <label className="block text-sm font-montserrat text-theme-muted mb-2">
        {label} <span className="text-theme-muted opacity-70 font-normal">({Number(value).toFixed(decimals)}{unit})</span>
      </label>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-gold"
      />
    </div>
  );
}

function ToggleField({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer theme-card px-4 py-3">
      <input
        type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-theme-border text-gold focus:ring-gold bg-noir"
      />
      <span className="text-sm text-theme-text">{label}</span>
    </label>
  );
}

function TileSelect({ options, value, onChange }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`text-left p-3 rounded-lg border transition-colors ${
            value === o.value ? 'border-gold bg-gold/10' : 'border-theme-border hover:border-gold/40'
          }`}
        >
          <p className={`text-sm font-montserrat font-semibold ${value === o.value ? 'text-gold' : 'text-theme-text'}`}>{o.label}</p>
          {o.hint && <p className="text-xs text-theme-muted mt-0.5">{o.hint}</p>}
        </button>
      ))}
    </div>
  );
}
