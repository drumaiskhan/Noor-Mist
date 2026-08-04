const express = require('express');
const path = require('path');
const { requireAdmin, authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadImage, uploadImages } = require('../services/cloudinary');

const router = express.Router();

const useCloudinary = () => {
  return !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
};

// POST /api/upload/image
router.post('/image', authenticate, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    let url, public_id;
    if (useCloudinary()) {
      const result = await uploadImage(req.file.path);
      url = result.url; public_id = result.public_id;
    } else {
      url = `/uploads/${req.file.filename}`;
      public_id = req.file.filename;
    }
    // Track in media library
    try {
      const { query } = require('../config/database');
      await query(
        'INSERT INTO media_library (url, public_id, filename, size, mime_type) VALUES ($1,$2,$3,$4,$5)',
        [url, public_id, req.file.originalname, req.file.size, req.file.mimetype]
      );
    } catch (_) {}
    return res.json({ url, public_id });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// POST /api/upload/images
router.post('/images', authenticate, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files uploaded' });

    if (useCloudinary()) {
      const results = await uploadImages(req.files);
      return res.json({ images: results });
    }

    const images = req.files.map((f) => ({
      url: `/uploads/${f.filename}`,
      public_id: f.filename,
    }));
    res.json({ images });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;
