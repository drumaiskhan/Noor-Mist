const express = require('express');
const { query } = require('../config/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Every field a theme can carry, with its DB-JSON (camelCase) key and default.
// Adding a field here is the ONLY place you need to touch on the backend —
// flattenTheme/buildSettings are generated from this list, so they can never
// drift out of sync with each other again.
const THEME_FIELDS = [
  // Core palette
  ['primary_color', 'primaryColor', '#D4AF37'],
  ['secondary_color', 'secondaryColor', '#0A0A0A'],
  ['accent_color', 'accentColor', '#B8960C'],
  ['background_color', 'backgroundColor', '#0A0A0A'],
  ['surface_color', 'surfaceColor', '#141414'],
  ['card_color', 'cardColor', '#141414'],
  ['text_primary', 'textPrimary', '#FFFFFF'],
  ['text_secondary', 'textSecondary', '#9CA3AF'],
  ['border_color', 'borderColor', '#2A2A2A'],
  // Buttons / gradients
  ['button_color', 'buttonColor', ''],
  ['button_hover_color', 'buttonHoverColor', ''],
  ['button_text_color', 'buttonTextColor', ''],
  ['gradient_start', 'gradientStart', ''],
  ['gradient_end', 'gradientEnd', ''],
  ['button_style', 'buttonStyle', 'solid'], // solid | outline | gradient | glass
  ['button_hover_effect', 'buttonHoverEffect', 'lift'], // none | lift | glow | scale
  ['button_padding_x', 'buttonPaddingX', 36],
  ['button_padding_y', 'buttonPaddingY', 14],
  ['button_font_size', 'buttonFontSize', 14],
  // Announcement bar / footer
  ['announcement_bg', 'announcementBg', ''],
  ['announcement_text_color', 'announcementTextColor', ''],
  ['footer_bg', 'footerBg', ''],
  ['footer_text_color', 'footerTextColor', ''],
  // Typography
  ['font_heading', 'fontHeading', 'Playfair Display'],
  ['font_body', 'fontBody', 'Cormorant Garamond'],
  ['font_button', 'fontButton', 'Montserrat'],
  ['body_font_size', 'bodyFontSize', 17],
  ['line_height', 'lineHeight', 1.7],
  ['letter_spacing', 'letterSpacing', 0],
  ['heading_weight', 'headingWeight', 700],
  // Layout
  ['site_width', 'siteWidth', 'normal'], // compact | normal | wide
  ['shadow_style', 'shadowStyle', 'soft'], // none | soft | premium | glass
  // Radius / effects
  ['border_radius', 'borderRadius', 8],
  ['glass_effect', 'glassEffect', true],
  ['animations_enabled', 'animationsEnabled', true],
  ['shadows_enabled', 'shadowsEnabled', true],
  ['blur_intensity', 'blurIntensity', 12], // px, used by glass effect backdrop-filter
  ['card_hover_effect', 'cardHoverEffect', 'lift'], // none | lift | zoom | glow (product/content cards)
  // Layout — container / spacing / card & product-card design
  ['section_spacing', 'sectionSpacing', 80], // px, vertical padding between homepage sections
  ['card_style', 'cardStyle', 'elevated'], // flat | bordered | elevated | glass
  ['product_card_style', 'productCardStyle', 'detailed'], // minimal | detailed | overlay
  // Mode
  ['theme_mode', 'themeMode', 'dark'], // dark | light | auto
  // Background flourish (site-wide gold glow / corner frame / NM watermark)
  ['bg_effect_enabled', 'bgEffectEnabled', true],
  ['bg_effect_intensity', 'bgEffectIntensity', 70], // 0-100, only matters when enabled
  // Advanced
  ['custom_css', 'customCss', ''],
];

// Flatten the settings JSONB column into top-level snake_case fields.
// Falls back to the old cardBg/card_bg key for themes saved before
// card_color existed.
function flattenTheme(row) {
  const s = (typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings) || {};
  const out = {
    id: row.id,
    name: row.name,
    is_active: row.is_active,
    created_at: row.created_at,
  };
  for (const [snake, camel, fallback] of THEME_FIELDS) {
    out[snake] = s[camel] ?? s[snake] ?? fallback;
  }
  // Legacy fallback: very old themes stored the card color as cardBg.
  if (!out.card_color) out.card_color = s.cardBg || s.card_bg || '#141414';
  return out;
}

// Map flat snake_case fields to the camelCase settings JSON stored in DB
function buildSettings(body) {
  const settings = {};
  for (const [snake, camel, fallback] of THEME_FIELDS) {
    const value = body[snake] ?? body[camel];
    settings[camel] = value !== undefined && value !== null ? value : fallback;
  }
  return settings;
}

// GET /api/themes
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM themes ORDER BY is_active DESC, created_at ASC');
    res.json({ themes: result.rows.map(flattenTheme) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch themes' });
  }
});

// GET /api/themes/active
router.get('/active', async (req, res) => {
  try {
    const result = await query('SELECT * FROM themes WHERE is_active=true LIMIT 1');
    res.json({ theme: result.rows[0] ? flattenTheme(result.rows[0]) : null });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch active theme' });
  }
});

// POST /api/themes (admin) — accepts flat fields or a settings object
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Theme name is required' });
    const settings = buildSettings(req.body);
    const result = await query(
      'INSERT INTO themes (name, settings) VALUES ($1,$2) RETURNING *',
      [name, JSON.stringify(settings)]
    );
    res.status(201).json({ theme: flattenTheme(result.rows[0]) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create theme' });
  }
});

// PUT /api/themes/:id (admin)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    const settings = buildSettings(req.body);
    const result = await query(
      'UPDATE themes SET name=COALESCE($1,name), settings=$2 WHERE id=$3 RETURNING *',
      [name || null, JSON.stringify(settings), req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Theme not found' });
    res.json({ theme: flattenTheme(result.rows[0]) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update theme' });
  }
});

// POST /api/themes/:id/apply (admin)
router.post('/:id/apply', requireAdmin, async (req, res) => {
  try {
    await query('UPDATE themes SET is_active=false');
    const result = await query('UPDATE themes SET is_active=true WHERE id=$1 RETURNING *', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Theme not found' });
    res.json({ theme: flattenTheme(result.rows[0]), message: 'Theme applied' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to apply theme' });
  }
});

// POST /api/themes/:id/duplicate (admin) — clones a theme's settings under a new name
router.post('/:id/duplicate', requireAdmin, async (req, res) => {
  try {
    const source = await query('SELECT * FROM themes WHERE id=$1', [req.params.id]);
    if (!source.rows.length) return res.status(404).json({ error: 'Theme not found' });
    const flat = flattenTheme(source.rows[0]);
    const name = (req.body && req.body.name) || `${flat.name} (Copy)`;
    const settings = buildSettings(flat);
    const result = await query(
      'INSERT INTO themes (name, settings, is_active) VALUES ($1,$2,false) RETURNING *',
      [name, JSON.stringify(settings)]
    );
    res.status(201).json({ theme: flattenTheme(result.rows[0]) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to duplicate theme' });
  }
});

// DELETE /api/themes/:id (admin) — refuses to delete the active theme or the last remaining theme
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const countResult = await query('SELECT COUNT(*)::int AS count FROM themes');
    if (countResult.rows[0].count <= 1) {
      return res.status(400).json({ error: 'Cannot delete the only remaining theme' });
    }
    const target = await query('SELECT * FROM themes WHERE id=$1', [req.params.id]);
    if (!target.rows.length) return res.status(404).json({ error: 'Theme not found' });
    if (target.rows[0].is_active) {
      return res.status(400).json({ error: 'Cannot delete the active theme — apply a different theme first' });
    }
    await query('DELETE FROM themes WHERE id=$1', [req.params.id]);
    res.json({ message: 'Theme deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete theme' });
  }
});

// POST /api/themes/reset-default (admin) — restores/creates "Golden Noir" and makes it active
router.post('/reset-default', requireAdmin, async (req, res) => {
  try {
    const settings = buildSettings({ name: 'Golden Noir' });
    let existing = await query('SELECT * FROM themes WHERE name=$1', ['Golden Noir']);
    await query('UPDATE themes SET is_active=false');
    let result;
    if (existing.rows.length) {
      result = await query(
        'UPDATE themes SET settings=$1, is_active=true WHERE id=$2 RETURNING *',
        [JSON.stringify(settings), existing.rows[0].id]
      );
    } else {
      result = await query(
        'INSERT INTO themes (name, settings, is_active) VALUES ($1,$2,true) RETURNING *',
        ['Golden Noir', JSON.stringify(settings)]
      );
    }
    res.json({ theme: flattenTheme(result.rows[0]), message: 'Reset to default theme' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset theme' });
  }
});

module.exports = router;
