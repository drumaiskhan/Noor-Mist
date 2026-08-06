import React from 'react';
import useThemeStore from '../../store/themeStore';

/**
 * The site's hero brand mark — sits directly above a page's heading (Shop
 * Perfumes, About Us, etc.) as a real, in-flow element rather than a fixed
 * background trick. A soft blurred glow sits behind it and `mix-blend-mode:
 * screen` on the mark itself lets it melt into the dark page background
 * instead of reading as a flat sticker.
 *
 * Fully admin-controlled, reusing the exact same fields as before — no new
 * settings to configure:
 *   - Theme Editor → Effects → Background Flourish → Enable Background
 *     Flourish: off hides this mark entirely.
 *   - Flourish Intensity: scales the glow strength and the mark's own
 *     opacity/glow together.
 *   - Watermark Logo: an uploaded image renders here as the mark; with
 *     nothing uploaded, it falls back to an outlined "NM" wordmark instead
 *     of a filled block, which reads as an intentional mark rather than a
 *     placeholder.
 *
 * Usage: drop <BrandMark /> directly above a page's <h1> hero heading.
 */
export default function BrandMark({ size = 'lg', className = '' }) {
  const theme = useThemeStore((s) => s.activeTheme);

  if (theme.bg_effect_enabled === false) return null;

  const intensity = (theme.bg_effect_intensity ?? 70) / 100;
  if (intensity <= 0) return null;

  const sizeClasses = {
    md: 'h-14 md:h-20',
    lg: 'h-20 md:h-28',
    xl: 'h-24 md:h-36',
  };

  return (
    <div
      className={`relative flex items-center justify-center pointer-events-none select-none mb-2 ${className}`}
      aria-hidden="true"
    >
      {/* Soft blurred glow behind the mark — this is what keeps it from
          looking like a logo pasted on top of the page; without it, even a
          well-made logo reads as a flat sticker against a dark background. */}
      <div
        className="absolute rounded-full blur-3xl"
        style={{
          width: '380px',
          height: '380px',
          maxWidth: '80vw',
          background: `radial-gradient(circle, rgba(var(--gold-rgb), ${(0.28 * intensity).toFixed(3)}) 0%, transparent 70%)`,
        }}
      />

      {theme.watermark_logo_url ? (
        <img
          src={theme.watermark_logo_url}
          alt=""
          className={`relative ${sizeClasses[size] || sizeClasses.lg} w-auto object-contain`}
          style={{
            opacity: Math.min(0.55 + 0.35 * intensity, 0.9),
            mixBlendMode: 'screen',
            filter: `drop-shadow(0 0 28px rgba(var(--gold-rgb), ${(0.35 * intensity).toFixed(3)}))`,
          }}
        />
      ) : (
        <span
          className={`relative font-playfair font-extrabold leading-none ${
            size === 'xl' ? 'text-8xl md:text-9xl' : size === 'md' ? 'text-6xl md:text-7xl' : 'text-7xl md:text-8xl'
          }`}
          style={{
            color: 'transparent',
            WebkitTextStroke: `1.5px rgba(var(--gold-rgb), ${Math.min(0.5 + 0.35 * intensity, 0.85).toFixed(3)})`,
            textShadow: `0 0 40px rgba(var(--gold-rgb), ${(0.3 * intensity).toFixed(3)})`,
          }}
        >
          NM
        </span>
      )}
    </div>
  );
}
