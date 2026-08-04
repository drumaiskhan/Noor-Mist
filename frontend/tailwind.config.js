export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: 'var(--gold, #D4AF37)',
          light: 'var(--gold-light, #FFD700)',
          dark: 'var(--gold-dark, #B8960C)',
          pale: 'var(--gold-pale, #F5E6CC)',
        },
        noir: {
          DEFAULT: 'var(--noir, #0A0A0A)',
          light: 'var(--noir-light, #1A1A1A)',
          card: 'var(--noir-card, #141414)',
          soft: 'var(--noir-soft, #2A2A2A)',
        },
        ivory: {
          DEFAULT: 'var(--ivory, #FFFFF0)',
          light: 'var(--ivory-light, #FFFFF7)',
          dark: 'var(--ivory-dark, #F5F5DC)',
        },
        champagne: {
          DEFAULT: 'var(--champagne, #F7E7CE)',
          dark: 'var(--champagne-dark, #E8D5B7)',
        },
        brown: {
          warm: 'var(--brown-warm, #8B6914)',
          deep: 'var(--brown-deep, #5C4033)',
          rich: 'var(--brown-rich, #3E2723)',
        },
        // ── Theme utility namespace ─────────────────────────────────────────
        // Every entry mirrors a CSS variable set by themeStore.applyThemeToDOM
        // so bg-theme-bg, text-theme-text, border-theme-border, etc. all react
        // instantly when the admin switches or edits a theme.
        theme: {
          primary:   'var(--primary, #D4AF37)',
          accent:    'var(--accent, #B8960C)',
          bg:        'var(--background, #0A0A0A)',
          surface:   'var(--surface, #141414)',
          card:      'var(--card, #1A1A1A)',
          secondary: 'var(--secondary, #1A1A1A)',
          text:      'var(--text-theme, #FFFFFF)',
          muted:     'var(--text-muted, #9CA3AF)',
          border:    'var(--border-color, #2A2A2A)',
        },
      },
      fontFamily: {
        playfair: ['Playfair Display', 'serif'],
        cormorant: ['Cormorant Garamond', 'serif'],
        montserrat: ['Montserrat', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 2s infinite',
        'shimmer': 'shimmer 2s infinite',
        'glow': 'glow 3s ease-in-out infinite',
        'particle': 'particle 4s ease-in-out infinite',
        'fade-in': 'fadeIn 0.6s ease-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'scale-in': 'scaleIn 0.4s ease-out',
      },
      keyframes: {
        float: { '0%, 100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-20px)' } },
        shimmer: { '0%': { backgroundPosition: '-200% center' }, '100%': { backgroundPosition: '200% center' } },
        glow: { '0%, 100%': { boxShadow: '0 0 20px rgba(212,175,55,0.2)' }, '50%': { boxShadow: '0 0 40px rgba(212,175,55,0.4)' } },
        particle: { '0%, 100%': { transform: 'translateY(0) scale(1)', opacity: '0' }, '50%': { transform: 'translateY(-100px) scale(1.5)', opacity: '1' } },
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(30px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        scaleIn: { '0%': { opacity: '0', transform: 'scale(0.9)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
};
