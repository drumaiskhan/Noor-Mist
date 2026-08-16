import { API_URL } from '../services/api';

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

// Backend origin (API_URL minus the trailing /api segment), used to turn
// relative, locally-stored file paths (e.g. "/uploads/payments/xyz.jpg")
// into absolute URLs. Needed because the frontend (Netlify) and backend
// (Render) run on different domains — a relative <img src> resolves
// against the frontend's own domain and 404s.
const BACKEND_ORIGIN = API_URL.replace(/\/api\/?$/, '');

// Resolve any backend-supplied media URL (payment screenshots, QR codes,
// bank/wallet logos, payment method icons, etc.) into an absolute URL,
// whether it came back as a full Cloudinary URL or a relative local path.
export const resolveMediaUrl = (url) => {
  if (!url) return url;
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  return `${BACKEND_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const getCloudinaryUrl = (publicId, options = {}) => {
  if (!publicId || !CLOUD_NAME) return publicId;
  if (publicId.startsWith('http')) return publicId;

  const { width, height, crop = 'fill', quality = 'auto', format = 'auto' } = options;
  const transforms = [`f_${format}`, `q_${quality}`];
  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (width || height) transforms.push(`c_${crop}`);

  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transforms.join(',')}/${publicId}`;
};

export const getOptimizedUrl = (url, width = 400) => {
  if (!url) return '/images/placeholder-perfume.jpg';
  if (url.includes('cloudinary.com')) {
    return url.replace('/upload/', `/upload/w_${width},q_auto,f_auto/`);
  }
  return url;
};
