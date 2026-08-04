# Noor Mist — Luxury Perfume E-Commerce Platform

A full-stack luxury fragrance e-commerce app with a React/Vite frontend and Node.js/Express backend.

## Stack

- **Frontend**: React 18, Vite, TailwindCSS, Framer Motion, Three.js, Zustand, TanStack Query
- **Backend**: Node.js, Express, PostgreSQL (`pg`)
- **Image hosting**: Cloudinary
- **Auth**: JWT (jsonwebtoken + bcryptjs)

## Running the project

Start both workflows in the Replit panel:

| Workflow | Command | Port |
|---|---|---|
| **Backend API** | `cd backend && node server.js` | 3001 |
| **Start application** | `cd frontend && npx vite --port 5000 --host 0.0.0.0` | 5000 |

The Vite dev server proxies `/api/*` → `http://localhost:3001`, so no CORS config is needed locally.

## Required secrets / environment variables

| Key | Where | Description |
|---|---|---|
| `DATABASE_URL` | backend | PostgreSQL connection string |
| `JWT_SECRET` | backend | Secret for signing JWTs |
| `SESSION_SECRET` | backend | Express session secret |
| `CLOUDINARY_CLOUD_NAME` | backend | Cloudinary account name |
| `CLOUDINARY_API_KEY` | backend | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | backend | Cloudinary API secret |
| `VITE_API_URL` | frontend | Override backend URL (optional; defaults to Render deployment) |

Without a real `DATABASE_URL` the backend auto-creates a local schema with sample data on startup.

## Admin panel

Visit `/admin` → default credentials: `admin@noormist.com` / `admin123`

From the admin you can manage:
- **Settings → Announcement Bar**: toggle the yellow bar and edit its text
- **Theme Editor**: change all site colors, fonts, button styles, etc. live
- Products, orders, categories, collections, customers, analytics, SEO, media

## Theme system

The theme is fully dynamic. `themeStore.applyThemeToDOM` writes CSS variables onto `:root` on every theme change. All user-facing components consume those variables via:

- Tailwind `theme.*` color namespace (`bg-theme-bg`, `text-theme-text`, `text-theme-muted`, `text-theme-primary`, `border-theme-border`, …)
- CSS utility classes (`.theme-bg`, `.theme-text`, `.theme-muted`, `.badge-sale`, `.badge-new`, `.badge-limited`, …)
- Existing legacy aliases (`bg-gold` = primary, `bg-noir` = background, `btn-gold`, `luxury-card`, …)

## User preferences

- Keep the existing file structure (frontend / backend split); do not flatten or monorepo-ify.
- Do not replace or migrate the PostgreSQL backend.
- Admin pages intentionally use a fixed dark theme; don't force the theme system onto admin UI.
