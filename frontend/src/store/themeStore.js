import { create } from 'zustand';
import { themeAPI } from '../services/api';

const defaultTheme = {
  id: 0,
  name: 'Golden Noir',
  // Core palette
  primary_color: '#D4AF37',
  secondary_color: '#1A1A1A',
  accent_color: '#B8960C',
  background_color: '#0A0A0A',
  surface_color: '#141414',
  card_color: '#1A1A1A',
  text_primary: '#FFFFFF',
  text_secondary: '#9CA3AF',
  border_color: '#2A2A2A',
  // Buttons / gradients — empty string means "derive from primary/secondary"
  button_color: '',
  button_hover_color: '',
  button_text_color: '',
  gradient_start: '',
  gradient_end: '',
  button_style: 'solid', // solid | outline | gradient | glass
  button_hover_effect: 'lift', // none | lift | glow | scale
  button_padding_x: 36,
  button_padding_y: 14,
  button_font_size: 14,
  // Announcement bar / footer — empty means "derive from palette"
  announcement_bg: '',
  announcement_text_color: '',
  footer_bg: '',
  footer_text_color: '',
  // Typography
  font_heading: 'Playfair Display',
  font_body: 'Cormorant Garamond',
  font_button: 'Montserrat',
  body_font_size: 17,
  line_height: 1.7,
  letter_spacing: 0,
  heading_weight: 700,
  // Layout
  site_width: 'normal', // compact | normal | wide
  shadow_style: 'soft', // none | soft | premium | glass
  // Radius / effects
  border_radius: 8,
  glass_effect: true,
  animations_enabled: true,
  shadows_enabled: true,
  blur_intensity: 12, // px
  card_hover_effect: 'lift', // none | lift | zoom | glow
  // Layout — container / spacing / card design
  section_spacing: 80, // px
  card_style: 'elevated', // flat | bordered | elevated | glass
  product_card_style: 'detailed', // minimal | detailed | overlay
  // Mode
  theme_mode: 'dark', // dark | light | auto
  // Background flourish (site-wide gold glow / corner frame / NM watermark)
  bg_effect_enabled: true,
  bg_effect_intensity: 70, // 0-100
  // Advanced
  custom_css: '',
};

// Lighten/darken a #rrggbb color by mixing it toward white/black.
const mixColor = (hex, amount, towardWhite) => {
  if (!hex || hex[0] !== '#') return hex;
  const num = parseInt(hex.slice(1), 16);
  let r = (num >> 16) & 255;
  let g = (num >> 8) & 255;
  let b = num & 255;
  const target = towardWhite ? 255 : 0;
  r = Math.round(r + (target - r) * amount);
  g = Math.round(g + (target - g) * amount);
  b = Math.round(b + (target - b) * amount);
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
};

// Convert a #rrggbb hex color to "r, g, b" for use inside rgba().
const hexToRgbTriplet = (hex) => {
  if (!hex || hex[0] !== '#') return '212, 175, 55';
  const num = parseInt(hex.slice(1), 16);
  return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
};

const SITE_WIDTHS = { compact: '1140px', normal: '1280px', wide: '1440px' };

const SHADOW_STYLES = {
  none: 'none',
  soft: '0 10px 30px rgba(0,0,0,0.35)',
  premium: '0 20px 50px rgba(0,0,0,0.5)',
  // glass shadow is intentionally subtler — the blur/transparency does the work
  glass: '0 8px 32px rgba(0,0,0,0.25)',
};

// Google Fonts this theme system knows how to load on demand. Any font
// picked in the admin panel that isn't already linked in index.html gets
// its <link> injected here at runtime.
const GOOGLE_FONT_FAMILIES = {
  'Playfair Display': 'Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700',
  'Cormorant Garamond': 'Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,600',
  'Montserrat': 'Montserrat:wght@300;400;500;600;700;800',
  'Inter': 'Inter:wght@300;400;500;600;700',
  'Lora': 'Lora:ital,wght@0,400;0,500;0,600;0,700;1,400',
  'Merriweather': 'Merriweather:wght@300;400;700;900',
  'Raleway': 'Raleway:wght@300;400;500;600;700;800',
  'Poppins': 'Poppins:wght@300;400;500;600;700;800',
  'DM Serif Display': 'DM+Serif+Display:ital@0;1',
  'Libre Baskerville': 'Libre+Baskerville:ital,wght@0,400;0,700;1,400',
};

const loadedFonts = new Set(['Playfair Display', 'Cormorant Garamond', 'Montserrat', 'Inter']);

// Injects a Google Fonts <link> for any font not already loaded (the four
// defaults above ship pre-loaded via globals.css). Safe to call repeatedly.
const ensureFontLoaded = (fontName) => {
  if (!fontName || loadedFonts.has(fontName)) return;
  const family = GOOGLE_FONT_FAMILIES[fontName];
  if (!family) return; // unknown font name — nothing we can fetch
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${family}&display=swap`;
  document.head.appendChild(link);
  loadedFonts.add(fontName);
};

const useThemeStore = create((set, get) => ({
  activeTheme: defaultTheme,
  allThemes: [],
  isLoading: false,

  fetchActiveTheme: async () => {
    try {
      const { data } = await themeAPI.getActive();
      if (data?.theme) {
        const theme = { ...defaultTheme, ...data.theme };
        set({ activeTheme: theme });
        get().applyThemeToDOM(theme);
      }
    } catch (error) {
      console.error('Failed to fetch active theme:', error);
      get().applyThemeToDOM(defaultTheme);
    }
  },

  fetchAllThemes: async () => {
    try {
      const { data } = await themeAPI.getAll();
      set({ allThemes: data?.themes || [] });
    } catch (error) {
      console.error('Failed to fetch themes:', error);
    }
  },

  setTheme: (theme) => {
    const merged = { ...defaultTheme, ...theme };
    set({ activeTheme: merged });
    get().applyThemeToDOM(merged);
  },

  applyTheme: async (themeId) => {
    try {
      const { data } = await themeAPI.apply(themeId);
      const theme = { ...defaultTheme, ...(data?.theme || {}) };
      set({ activeTheme: theme });
      get().applyThemeToDOM(theme);
      return theme;
    } catch (error) {
      console.error('Failed to apply theme:', error);
      throw error;
    }
  },

  duplicateTheme: async (themeId, name) => {
    const { data } = await themeAPI.duplicate(themeId, name);
    await get().fetchAllThemes();
    return data?.theme;
  },

  deleteTheme: async (themeId) => {
    await themeAPI.remove(themeId);
    await get().fetchAllThemes();
  },

  resetToDefault: async () => {
    const { data } = await themeAPI.resetDefault();
    const theme = { ...defaultTheme, ...(data?.theme || {}) };
    set({ activeTheme: theme });
    get().applyThemeToDOM(theme);
    await get().fetchAllThemes();
    return theme;
  },

  applyThemeToDOM: (theme) => {
    if (!theme) return;
    const root = document.documentElement;
    const t = { ...defaultTheme, ...theme };

    // ---- Core palette ----
    root.style.setProperty('--gold', t.primary_color);
    root.style.setProperty('--gold-dark', t.accent_color);
    root.style.setProperty('--gold-light', mixColor(t.primary_color, 0.25, true));
    root.style.setProperty('--gold-pale', mixColor(t.primary_color, 0.75, true));
    root.style.setProperty('--gold-rgb', hexToRgbTriplet(t.primary_color));

    root.style.setProperty('--noir', t.background_color);
    root.style.setProperty('--noir-light', t.secondary_color);
    root.style.setProperty('--noir-card', t.card_color);
    root.style.setProperty('--noir-surface', t.surface_color);
    root.style.setProperty('--noir-soft', t.border_color);
    root.style.setProperty('--border', t.border_color);

    root.style.setProperty('--text-primary', t.text_primary);
    root.style.setProperty('--text-secondary', t.text_secondary);
    root.style.setProperty('--white', t.text_primary);
    root.style.setProperty('--gray-400', t.text_secondary);

    // ---- Semantic aliases for the theme utility class system ----
    // These drive every .theme-* utility class and the Tailwind `theme.*` color
    // namespace, so the entire user-facing site reacts to theme changes.
    root.style.setProperty('--primary', t.primary_color);
    root.style.setProperty('--primary-rgb', hexToRgbTriplet(t.primary_color));
    root.style.setProperty('--accent', t.accent_color);
    root.style.setProperty('--secondary', t.secondary_color);
    root.style.setProperty('--background', t.background_color);
    root.style.setProperty('--background-rgb', hexToRgbTriplet(t.background_color));
    root.style.setProperty('--surface', t.surface_color);
    root.style.setProperty('--card', t.card_color);
    root.style.setProperty('--text-theme', t.text_primary);
    root.style.setProperty('--text-muted', t.text_secondary);
    root.style.setProperty('--border-color', t.border_color);
    // Sale / badge colours (derive from palette; override via custom CSS if needed)
    root.style.setProperty('--badge-sale-bg', '#EF4444');
    root.style.setProperty('--badge-new-bg', t.primary_color);
    root.style.setProperty('--badge-limited-bg', t.accent_color);

    // ---- Buttons / gradients (fall back to palette when left blank) ----
    const btnColor = t.button_color || t.primary_color;
    const btnHover = t.button_hover_color || mixColor(t.primary_color, 0.15, true);
    const btnText = t.button_text_color || t.background_color;
    const gradStart = t.gradient_start || t.primary_color;
    const gradEnd = t.gradient_end || t.accent_color;

    root.style.setProperty('--btn-color', btnColor);
    root.style.setProperty('--btn-hover-color', btnHover);
    root.style.setProperty('--btn-text-color', btnText);
    root.style.setProperty('--gradient-start', gradStart);
    root.style.setProperty('--gradient-end', gradEnd);
    root.style.setProperty('--btn-padding', `${t.button_padding_y}px ${t.button_padding_x}px`);
    root.style.setProperty('--btn-font-size', `${t.button_font_size}px`);

    // Button "style" (solid/outline/gradient/glass) resolves to actual
    // background/border/backdrop-filter values so the existing .btn-gold /
    // .btn-outline-gold classes stay style-driven without every component
    // needing to know about button_style.
    const buttonStyleMap = {
      solid: { bg: btnColor, border: 'none', backdrop: 'none', color: btnText },
      gradient: { bg: `linear-gradient(135deg, ${gradStart} 0%, ${gradEnd} 100%)`, border: 'none', backdrop: 'none', color: btnText },
      outline: { bg: 'transparent', border: `2px solid ${btnColor}`, backdrop: 'none', color: btnColor },
      glass: { bg: `rgba(${hexToRgbTriplet(btnColor)}, 0.15)`, border: `1px solid rgba(${hexToRgbTriplet(btnColor)}, 0.4)`, backdrop: 'blur(12px)', color: btnColor },
    };
    const resolved = buttonStyleMap[t.button_style] || buttonStyleMap.solid;
    root.style.setProperty('--btn-bg', resolved.bg);
    root.style.setProperty('--btn-border', resolved.border);
    root.style.setProperty('--btn-backdrop', resolved.backdrop);
    root.style.setProperty('--btn-fg', resolved.color);

    // Hover effect resolves to a transform + extra shadow the CSS applies on :hover.
    const hoverEffectMap = {
      none: { transform: 'none', shadow: '0 0 0 rgba(0,0,0,0)' },
      lift: { transform: 'translateY(-2px)', shadow: `0 10px 30px rgba(${hexToRgbTriplet(btnColor)}, 0.3)` },
      glow: { transform: 'none', shadow: `0 0 24px rgba(${hexToRgbTriplet(btnColor)}, 0.5)` },
      scale: { transform: 'scale(1.04)', shadow: `0 6px 20px rgba(${hexToRgbTriplet(btnColor)}, 0.25)` },
    };
    const hoverFx = hoverEffectMap[t.button_hover_effect] || hoverEffectMap.lift;
    root.style.setProperty('--btn-hover-transform', hoverFx.transform);
    root.style.setProperty('--btn-hover-shadow', hoverFx.shadow);

    // ---- Announcement bar / footer (fall back to palette when blank) ----
    root.style.setProperty('--announcement-bg', t.announcement_bg || t.primary_color);
    root.style.setProperty('--announcement-text', t.announcement_text_color || t.background_color);
    root.style.setProperty('--footer-bg', t.footer_bg || t.secondary_color);
    root.style.setProperty('--footer-text', t.footer_text_color || t.text_secondary);

    // ---- Typography ----
    root.style.setProperty('--font-heading', t.font_heading);
    root.style.setProperty('--font-body', t.font_body);
    root.style.setProperty('--font-button', t.font_button);
    root.style.setProperty('--font-ui', t.font_body);
    root.style.setProperty('--body-font-size', `${t.body_font_size}px`);
    root.style.setProperty('--line-height', t.line_height);
    root.style.setProperty('--letter-spacing', `${t.letter_spacing}px`);
    root.style.setProperty('--heading-weight', t.heading_weight);
    [t.font_heading, t.font_body, t.font_button].forEach(ensureFontLoaded);

    // ---- Layout ----
    root.style.setProperty('--site-max-width', SITE_WIDTHS[t.site_width] || SITE_WIDTHS.normal);
    root.style.setProperty('--shadow-theme', SHADOW_STYLES[t.shadow_style] ?? SHADOW_STYLES.soft);

    // ---- Radius ----
    if (t.border_radius !== undefined) {
      root.style.setProperty('--radius-sm', `${Math.max(t.border_radius - 2, 0)}px`);
      root.style.setProperty('--radius-md', `${t.border_radius}px`);
      root.style.setProperty('--radius-lg', `${t.border_radius + 8}px`);
      root.style.setProperty('--radius-xl', `${t.border_radius + 16}px`);
    }

    // ---- Layout: section spacing ----
    root.style.setProperty('--section-spacing', `${t.section_spacing ?? 80}px`);

    // ---- Card style (product cards, content cards, modals) ----
    const cardStyleMap = {
      flat: { bg: t.card_color, border: 'none', shadow: 'none', backdrop: 'none' },
      bordered: { bg: t.card_color, border: `1px solid ${t.border_color}`, shadow: 'none', backdrop: 'none' },
      elevated: { bg: t.card_color, border: `1px solid ${t.border_color}`, shadow: SHADOW_STYLES[t.shadow_style] ?? SHADOW_STYLES.soft, backdrop: 'none' },
      glass: { bg: `rgba(${hexToRgbTriplet(t.card_color)}, 0.55)`, border: `1px solid rgba(${hexToRgbTriplet(t.border_color)}, 0.6)`, shadow: SHADOW_STYLES.glass, backdrop: `blur(${t.blur_intensity ?? 12}px)` },
    };
    const resolvedCard = cardStyleMap[t.card_style] || cardStyleMap.elevated;
    root.style.setProperty('--card-bg', resolvedCard.bg);
    root.style.setProperty('--card-border', resolvedCard.border);
    root.style.setProperty('--card-shadow', resolvedCard.shadow);
    root.style.setProperty('--card-backdrop', resolvedCard.backdrop);
    root.setAttribute('data-product-card', t.product_card_style || 'detailed');

    // Card-level hover effect (distinct from button hover effect above)
    const cardHoverMap = {
      none: { transform: 'none', shadow: '0 0 0 rgba(0,0,0,0)' },
      lift: { transform: 'translateY(-6px)', shadow: `0 20px 40px rgba(0,0,0,0.4)` },
      zoom: { transform: 'scale(1.02)', shadow: `0 20px 40px rgba(0,0,0,0.4)` },
      glow: { transform: 'none', shadow: `0 0 30px rgba(${hexToRgbTriplet(t.primary_color)}, 0.4)` },
    };
    const cardHoverFx = cardHoverMap[t.card_hover_effect] || cardHoverMap.lift;
    root.style.setProperty('--card-hover-transform', cardHoverFx.transform);
    root.style.setProperty('--card-hover-shadow', cardHoverFx.shadow);

    // ---- Effects ----
    root.style.setProperty('--animation-duration', t.animations_enabled ? '' : '0s');
    root.style.setProperty('--blur-intensity', `${t.blur_intensity ?? 12}px`);
    root.classList.toggle('glass-disabled', !t.glass_effect);
    root.classList.toggle('shadows-disabled', !t.shadows_enabled);
    root.classList.toggle('animations-disabled', !t.animations_enabled);

    // ---- Mode (dark / light / auto) ----
    // Colors themselves are fully admin-controlled already, so "mode" here
    // drives native UI chrome (scrollbars, form controls) via the standard
    // CSS color-scheme property, and exposes the resolved mode as a data
    // attribute for any mode-specific CSS hooks.
    const resolveMode = (mode) => {
      if (mode === 'auto') {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      }
      return mode === 'light' ? 'light' : 'dark';
    };
    const effectiveMode = resolveMode(t.theme_mode);
    root.setAttribute('data-theme-mode', effectiveMode);
    root.style.colorScheme = t.theme_mode === 'auto' ? 'light dark' : effectiveMode;

    // Keep "auto" mode responsive to OS-level changes without a page reload.
    if (t.theme_mode === 'auto' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: light)');
      if (!get()._mqListenerAttached) {
        mq.addEventListener('change', () => get().applyThemeToDOM(get().activeTheme));
        set({ _mqListenerAttached: true });
      }
    }

    // ---- Background flourish (site-wide gold glow / corner frame / NM watermark) ----
    // A single opacity multiplier the CSS in globals.css uses for every layer of
    // that effect. 0 when disabled, otherwise intensity/100 — so admins get one
    // toggle + one slider instead of a separate on/off switch per layer.
    const bgEffectOpacity = t.bg_effect_enabled === false ? 0 : (t.bg_effect_intensity ?? 70) / 100;
    root.style.setProperty('--bg-effect-opacity', bgEffectOpacity);

    // ---- Custom CSS injection ----
    let styleTag = document.getElementById('theme-custom-css');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'theme-custom-css';
      document.head.appendChild(styleTag);
    }
    styleTag.textContent = t.custom_css || '';
  },
}));

export default useThemeStore;
