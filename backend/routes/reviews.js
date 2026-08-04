const express = require('express');
const { query } = require('../config/database');
const { authenticate, requireAdmin, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadImages, deleteImage } = require('../services/cloudinary');
const fs = require('fs');

const router = express.Router();

// Ensure status column exists (run once on startup)
async function ensureStatusColumn() {
  try {
    await query(`
      ALTER TABLE reviews
        ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'
    `);
    // Back-fill from is_approved boolean
    await query(`
      UPDATE reviews SET status = CASE
        WHEN is_approved = true  THEN 'approved'
        WHEN is_approved = false THEN 'pending'
        ELSE 'pending'
      END WHERE status = 'pending' AND is_approved = true
    `);
  } catch (e) {
    console.error('reviews migration:', e.message);
  }
}
ensureStatusColumn();

const REVIEWS_SELECT = `
  SELECT r.*,
    COALESCE(r.body, '') AS content,
    p.name  AS product_name,
    p.slug  AS product_slug,
    u.first_name, u.last_name, u.email,
    COALESCE(r.reviewer_name, u.first_name, 'Anonymous') AS user_name,
    (SELECT json_agg(ri ORDER BY ri.id) FROM review_images ri WHERE ri.review_id = r.id) AS images
  FROM reviews r
  LEFT JOIN products  p ON r.product_id = p.id
  LEFT JOIN users     u ON r.user_id    = u.id
`;

// GET /api/reviews/product/:productId  (public)
router.get('/product/:productId', async (req, res) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sort   = req.query.sort === 'highest' ? 'r.rating DESC'
                 : req.query.sort === 'lowest'  ? 'r.rating ASC'
                 : req.query.sort === 'helpful' ? 'r.helpful_count DESC'
                 : 'r.created_at DESC';

    const result = await query(
      `${REVIEWS_SELECT}
       WHERE r.product_id = $1 AND r.status = 'approved'
       ORDER BY ${sort}
       LIMIT $2 OFFSET $3`,
      [req.params.productId, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*), AVG(rating),
        json_object_agg(rating, cnt) AS distribution
       FROM (
         SELECT rating, COUNT(*) AS cnt
         FROM reviews WHERE product_id=$1 AND status='approved'
         GROUP BY rating
       ) sub`,
      [req.params.productId]
    );

    res.json({
      reviews: result.rows,
      stats: {
        total:        parseInt(countResult.rows[0].count),
        average:      parseFloat(countResult.rows[0].avg || 0).toFixed(1),
        distribution: countResult.rows[0].distribution || {},
      },
      page,
      pages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// GET /api/reviews/featured  (public — approved reviews for homepage)
router.get('/featured', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 4;
    const result = await query(
      `${REVIEWS_SELECT}
       WHERE r.status = 'approved'
       ORDER BY r.created_at DESC
       LIMIT $1`,
      [limit]
    );
    res.json({ reviews: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// GET /api/reviews  (admin)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status; // pending | approved | rejected | (all)

    const values = [];
    let where = '';
    if (status && status !== 'all') {
      values.push(status);
      where = `WHERE r.status = $${values.length}`;
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM reviews r ${where}`,
      values
    );
    const result = await query(
      `${REVIEWS_SELECT} ${where}
       ORDER BY r.created_at DESC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );

    res.json({
      reviews: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// POST /api/reviews  (customer submit)
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { product_id, rating, title, body, content, reviewer_name, reviewer_email } = req.body;
    if (!product_id || !rating) return res.status(400).json({ error: 'Product and rating are required' });

    const result = await query(
      `INSERT INTO reviews
         (product_id, user_id, rating, title, body, reviewer_name, reviewer_email, is_approved, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7, false, 'pending') RETURNING *`,
      [
        product_id,
        req.user?.id || null,
        rating,
        title,
        body || content,
        reviewer_name || req.user?.first_name || 'Anonymous',
        reviewer_email || req.user?.email || '',
      ]
    );

    await query(
      `INSERT INTO notifications (type, title, message, metadata)
       VALUES ('new_review','New Review',$1,$2)`,
      [
        `New review for product #${product_id}`,
        JSON.stringify({ review_id: result.rows[0].id }),
      ]
    );

    res.status(201).json({ review: result.rows[0], message: 'Review submitted for approval' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// PUT /api/reviews/:id/status  (admin approve/reject)
router.put('/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body; // 'approved' | 'rejected' | 'pending'
    const is_approved = status === 'approved';

    const result = await query(
      `UPDATE reviews
       SET status=$1, is_approved=$2, updated_at=NOW()
       WHERE id=$3 RETURNING *`,
      [status, is_approved, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Review not found' });

    // Recalculate product rating whenever approval changes
    await query(
      `UPDATE products SET
        average_rating = (SELECT COALESCE(AVG(rating),0) FROM reviews WHERE product_id=$1 AND status='approved'),
        review_count   = (SELECT COUNT(*)               FROM reviews WHERE product_id=$1 AND status='approved')
       WHERE id=$1`,
      [result.rows[0].product_id]
    );

    res.json({ review: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update review status' });
  }
});

// PUT /api/reviews/:id/reply  (admin)
router.put('/:id/reply', requireAdmin, async (req, res) => {
  try {
    const { reply } = req.body;
    const result = await query(
      'UPDATE reviews SET admin_reply=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
      [reply, req.params.id]
    );
    res.json({ review: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add reply' });
  }
});

// POST /api/reviews/:id/images  (admin – upload images to a review)
// POST /api/reviews/:id/images  (review owner or admin)
router.post('/:id/images', optionalAuth, upload.array('images', 10), async (req, res) => {
  try {
    const review = await query('SELECT * FROM reviews WHERE id=$1', [req.params.id]);
    if (!review.rows.length) return res.status(404).json({ error: 'Review not found' });
    const r = review.rows[0];
    const isOwner = req.user && r.user_id === req.user.id;
    const isAdmin = req.user?.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Not authorized' });
    const uploaded = [];
    for (const file of req.files || []) {
      try {
        const result = await uploadImages([file]);
        if (result.length) {
          const img = result[0];
          const row = await query(
            'INSERT INTO review_images (review_id, url, public_id) VALUES ($1,$2,$3) RETURNING *',
            [req.params.id, img.url, img.public_id || null]
          );
          uploaded.push(row.rows[0]);
        }
      } catch {
        // fall back to local path
        const row = await query(
          'INSERT INTO review_images (review_id, url) VALUES ($1,$2) RETURNING *',
          [req.params.id, `/uploads/${file.filename || file.originalname}`]
        );
        uploaded.push(row.rows[0]);
      }
    }
    res.json({ images: uploaded });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to upload images' });
  }
});

// POST /api/reviews/:id/images  (admin only — legacy kept for compat, now handled above)
router.post('/:id/images/admin', requireAdmin, upload.array('images', 6), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ error: 'No files uploaded' });

    const inserted = [];
    for (const file of req.files) {
      let url = `/uploads/${file.filename}`;
      let public_id = null;

      try {
        const uploaded = await uploadImages([file], 'noor-mist/reviews');
        url       = uploaded[0].url;
        public_id = uploaded[0].public_id;
      } catch {
        // Cloudinary not configured – fall back to local path
      }

      const row = await query(
        'INSERT INTO review_images (review_id, url, public_id) VALUES ($1,$2,$3) RETURNING *',
        [req.params.id, url, public_id]
      );
      inserted.push(row.rows[0]);
    }

    res.status(201).json({ images: inserted });
  } catch (error) {
    console.error(error);
    // Clean up any temp files
    (req.files || []).forEach((f) => { try { fs.unlinkSync(f.path); } catch {} });
    res.status(500).json({ error: 'Failed to upload images' });
  }
});

// DELETE /api/reviews/:id/images/:imageId  (admin)
router.delete('/:id/images/:imageId', requireAdmin, async (req, res) => {
  try {
    const row = await query(
      'DELETE FROM review_images WHERE id=$1 AND review_id=$2 RETURNING *',
      [req.params.imageId, req.params.id]
    );
    if (!row.rows.length) return res.status(404).json({ error: 'Image not found' });

    // Try to remove from Cloudinary
    if (row.rows[0].public_id) {
      deleteImage(row.rows[0].public_id).catch(() => {});
    }

    res.json({ message: 'Image deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// DELETE /api/reviews/:id  (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM reviews WHERE id=$1', [req.params.id]);
    res.json({ message: 'Review deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

module.exports = router;
