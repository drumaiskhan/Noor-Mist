const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

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
