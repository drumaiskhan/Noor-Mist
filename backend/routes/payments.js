const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// ── Cloudinary / upload helpers ────────────────────────────────────────────
const cloudinaryEnabled =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

let cloudinaryService;
try { cloudinaryService = require('../services/cloudinary'); } catch (_) {}

// Local disk upload fallback
const uploadsDir = path.join(__dirname, '../uploads/payments');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadsDir),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${uuidv4()}${ext}`);
  },
});
const fileFilter = (_, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  if (allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

async function uploadToCloud(filePath, folder = 'noor-mist/payments') {
  if (cloudinaryEnabled && cloudinaryService) {
    return await cloudinaryService.uploadImage(filePath, folder);
  }
  const filename = path.basename(filePath);
  return { url: `/uploads/payments/${filename}`, public_id: filename };
}

async function deleteFromCloud(publicId) {
  if (cloudinaryEnabled && cloudinaryService && publicId) {
    try { await cloudinaryService.deleteImage(publicId); } catch (_) {}
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  PUBLIC ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/payments/methods  — active methods for checkout
router.get('/methods', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT * FROM payment_methods WHERE is_enabled = true ORDER BY display_order ASC, id ASC`
    );
    res.json({ methods: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
});

// GET /api/payments/bank-accounts  — active bank accounts
router.get('/bank-accounts', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, bank_name, account_title, account_number, iban, branch_name,
              branch_code, swift_code, qr_image_url, logo_url, instructions, display_order
       FROM bank_accounts WHERE is_active = true ORDER BY display_order ASC, id ASC`
    );
    res.json({ accounts: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch bank accounts' });
  }
});

// GET /api/payments/wallets  — active digital wallet info
router.get('/wallets', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT type, account_name, mobile_number, username, raast_id, linked_bank,
              qr_image_url, instructions
       FROM digital_wallets WHERE is_active = true ORDER BY id ASC`
    );
    res.json({ wallets: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch wallets' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  CUSTOMER — UPLOAD PAYMENT PROOF
// ═══════════════════════════════════════════════════════════════════════════

// POST /api/payments/proof  — customer submits proof after placing order
router.post('/proof', authenticate, upload.single('screenshot'), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'Screenshot is required' });

  const { order_id, payment_method, transaction_id, sender_name, sender_number, payment_date, notes, amount } = req.body;
  if (!order_id) return res.status(400).json({ error: 'order_id is required' });

  try {
    // Verify the order belongs to this user (or user is admin)
    const orderRes = await query(`SELECT id, user_id, status, payment_method FROM orders WHERE id = $1`, [order_id]);
    if (!orderRes.rows.length) return res.status(404).json({ error: 'Order not found' });
    const order = orderRes.rows[0];
    if (order.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Prevent duplicate transaction IDs
    if (transaction_id) {
      const dup = await query(`SELECT id FROM payment_proofs WHERE transaction_id = $1 AND order_id != $2`, [transaction_id, order_id]);
      if (dup.rows.length) return res.status(409).json({ error: 'Transaction ID already used' });
    }

    // Upload screenshot
    const { url, public_id } = await uploadToCloud(file.path, 'noor-mist/payment-proofs');

    // Save proof
    const { rows } = await query(
      `INSERT INTO payment_proofs
         (order_id, user_id, payment_method, screenshot_url, screenshot_public_id,
          transaction_id, sender_name, sender_number, payment_date, notes, amount, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending')
       RETURNING *`,
      [order_id, req.user.id, payment_method || order.payment_method,
       url, public_id, transaction_id || null, sender_name || null,
       sender_number || null, payment_date || null, notes || null, amount || null]
    );

    // Update order status to awaiting_verification
    await query(
      `UPDATE orders SET status='awaiting_verification', updated_at=NOW() WHERE id=$1`,
      [order_id]
    );

    // Admin notification
    await query(
      `INSERT INTO notifications (type, title, message, metadata)
       VALUES ('payment_proof', 'New Payment Proof Uploaded',
               'Customer uploaded payment proof for order #' || $1,
               $2::jsonb)`,
      [order_id, JSON.stringify({ order_id, proof_id: rows[0].id, payment_method: rows[0].payment_method })]
    ).catch(() => {});

    res.status(201).json({ proof: rows[0], message: 'Payment proof submitted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit payment proof' });
  }
});

// GET /api/payments/proof/order/:orderId  — get proof for a specific order (owner or admin)
router.get('/proof/order/:orderId', authenticate, async (req, res) => {
  try {
    const orderRes = await query(`SELECT user_id FROM orders WHERE id=$1`, [req.params.orderId]);
    if (!orderRes.rows.length) return res.status(404).json({ error: 'Order not found' });
    if (orderRes.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const { rows } = await query(
      `SELECT * FROM payment_proofs WHERE order_id=$1 ORDER BY created_at DESC`,
      [req.params.orderId]
    );
    res.json({ proofs: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch proof' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  ADMIN — PAYMENT VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/payments/proofs  — list all proofs (admin)
router.get('/proofs', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, method, search } = req.query;
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];

    if (status) { params.push(status); conditions.push(`pp.status = $${params.length}`); }
    if (method) { params.push(method); conditions.push(`pp.payment_method = $${params.length}`); }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(pp.transaction_id ILIKE $${params.length} OR pp.sender_name ILIKE $${params.length} OR o.order_number ILIKE $${params.length})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);

    const { rows } = await query(
      `SELECT pp.*,
              o.order_number, o.total_amount as order_total,
              u.first_name, u.last_name, u.email
       FROM payment_proofs pp
       JOIN orders o ON o.id = pp.order_id
       LEFT JOIN users u ON u.id = pp.user_id
       ${where}
       ORDER BY pp.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    // Count
    const countParams = params.slice(0, -2);
    const { rows: countRows } = await query(
      `SELECT COUNT(*) FROM payment_proofs pp JOIN orders o ON o.id = pp.order_id LEFT JOIN users u ON u.id = pp.user_id ${where}`,
      countParams
    );

    res.json({ proofs: rows, total: parseInt(countRows[0].count), page: parseInt(page), pages: Math.ceil(countRows[0].count / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch proofs' });
  }
});

// GET /api/payments/proofs/:id  (admin)
router.get('/proofs/:id', requireAdmin, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT pp.*, o.order_number, o.total_amount as order_total, o.status as order_status,
              o.shipping_address, o.payment_method as order_payment_method,
              u.first_name, u.last_name, u.email, u.phone
       FROM payment_proofs pp
       JOIN orders o ON o.id = pp.order_id
       LEFT JOIN users u ON u.id = pp.user_id
       WHERE pp.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Proof not found' });
    res.json({ proof: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch proof' });
  }
});

// PUT /api/payments/proofs/:id/verify  (admin)
router.put('/proofs/:id/verify', requireAdmin, async (req, res) => {
  const { status, admin_note } = req.body;
  const validStatuses = ['pending', 'approved', 'rejected', 'refunded'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  try {
    const proofRes = await query(`SELECT * FROM payment_proofs WHERE id=$1`, [req.params.id]);
    if (!proofRes.rows.length) return res.status(404).json({ error: 'Proof not found' });
    const proof = proofRes.rows[0];

    await query(
      `UPDATE payment_proofs SET status=$1, admin_note=$2, verified_at=NOW(), verified_by=$3, updated_at=NOW() WHERE id=$4`,
      [status, admin_note || null, req.user.id, req.params.id]
    );

    // Update order accordingly
    if (status === 'approved') {
      await query(
        `UPDATE orders SET payment_status='paid', status='confirmed', updated_at=NOW() WHERE id=$1`,
        [proof.order_id]
      );
      // Notify customer
      await query(
        `INSERT INTO notifications (type, title, message, metadata) VALUES ('payment_approved', 'Payment Approved', 'Payment approved for order ' || $1, $2::jsonb)`,
        [proof.order_id, JSON.stringify({ order_id: proof.order_id, user_id: proof.user_id })]
      ).catch(() => {});
    } else if (status === 'rejected') {
      await query(
        `UPDATE orders SET status='pending_payment', updated_at=NOW() WHERE id=$1`,
        [proof.order_id]
      );
      await query(
        `INSERT INTO notifications (type, title, message, metadata) VALUES ('payment_rejected', 'Payment Rejected', 'Payment rejected for order ' || $1, $2::jsonb)`,
        [proof.order_id, JSON.stringify({ order_id: proof.order_id, user_id: proof.user_id, reason: admin_note })]
      ).catch(() => {});
    } else if (status === 'refunded') {
      await query(`UPDATE orders SET payment_status='refunded', status='refunded', updated_at=NOW() WHERE id=$1`, [proof.order_id]);
    }

    const { rows } = await query(`SELECT * FROM payment_proofs WHERE id=$1`, [req.params.id]);
    res.json({ proof: rows[0], message: `Payment ${status}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// GET /api/payments/stats  (admin)
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const [totals, methodStats, recent] = await Promise.all([
      query(`SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status='pending') as pending,
        COUNT(*) FILTER (WHERE status='approved') as approved,
        COUNT(*) FILTER (WHERE status='rejected') as rejected,
        COUNT(*) FILTER (WHERE status='refunded') as refunded,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day') as today,
        COALESCE(SUM(amount) FILTER (WHERE status='approved'), 0) as total_revenue
        FROM payment_proofs`),
      query(`SELECT payment_method, COUNT(*) as count, COALESCE(SUM(amount),0) as total
             FROM payment_proofs WHERE status='approved'
             GROUP BY payment_method ORDER BY count DESC`),
      query(`SELECT pp.*, o.order_number, u.first_name, u.last_name
             FROM payment_proofs pp
             JOIN orders o ON o.id=pp.order_id
             LEFT JOIN users u ON u.id=pp.user_id
             ORDER BY pp.created_at DESC LIMIT 5`),
    ]);
    res.json({ stats: totals.rows[0], methodStats: methodStats.rows, recent: recent.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/payments/export  — CSV export (admin)
router.get('/export', requireAdmin, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT pp.id, o.order_number, u.first_name, u.last_name, u.email,
              pp.payment_method, pp.transaction_id, pp.sender_name, pp.sender_number,
              pp.amount, pp.payment_date, pp.status, pp.admin_note, pp.created_at
       FROM payment_proofs pp
       JOIN orders o ON o.id=pp.order_id
       LEFT JOIN users u ON u.id=pp.user_id
       ORDER BY pp.created_at DESC`
    );
    const headers = ['ID','Order #','First Name','Last Name','Email','Method','Transaction ID','Sender','Sender #','Amount','Date','Status','Admin Note','Submitted At'];
    const csv = [
      headers.join(','),
      ...rows.map(r => [
        r.id, r.order_number, r.first_name, r.last_name, r.email,
        r.payment_method, r.transaction_id || '', r.sender_name || '',
        r.sender_number || '', r.amount || '', r.payment_date || '',
        r.status, (r.admin_note || '').replace(/,/g,''), r.created_at,
      ].map(v => `"${v}"`).join(',')),
    ].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="payments.csv"');
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to export' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  ADMIN — PAYMENT METHOD MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

router.get('/admin/methods', requireAdmin, async (req, res) => {
  try {
    const { rows } = await query(`SELECT * FROM payment_methods ORDER BY display_order ASC, id ASC`);
    res.json({ methods: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch methods' });
  }
});

router.put('/admin/methods/:key', requireAdmin, async (req, res) => {
  const { is_enabled, display_order, instructions, notes, min_order_amount, max_order_amount, label } = req.body;
  try {
    await query(
      `UPDATE payment_methods SET
         is_enabled = COALESCE($1, is_enabled),
         display_order = COALESCE($2, display_order),
         instructions = COALESCE($3, instructions),
         notes = COALESCE($4, notes),
         min_order_amount = COALESCE($5, min_order_amount),
         max_order_amount = COALESCE($6, max_order_amount),
         label = COALESCE($7, label),
         updated_at = NOW()
       WHERE key = $8`,
      [is_enabled, display_order, instructions, notes, min_order_amount, max_order_amount, label, req.params.key]
    );
    const { rows } = await query(`SELECT * FROM payment_methods WHERE key=$1`, [req.params.key]);
    res.json({ method: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update method' });
  }
});

// Upload logo for a payment method
router.post('/admin/methods/:key/logo', requireAdmin, upload.single('logo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const { url, public_id } = await uploadToCloud(req.file.path, 'noor-mist/payment-logos');
    await query(`UPDATE payment_methods SET icon_url=$1, updated_at=NOW() WHERE key=$2`, [url, req.params.key]);
    res.json({ url, public_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  ADMIN — BANK ACCOUNTS
// ═══════════════════════════════════════════════════════════════════════════

router.get('/admin/bank-accounts', requireAdmin, async (req, res) => {
  try {
    const { rows } = await query(`SELECT * FROM bank_accounts ORDER BY display_order ASC, id ASC`);
    res.json({ accounts: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch bank accounts' });
  }
});

router.post('/admin/bank-accounts', requireAdmin, upload.fields([{ name: 'qr_image' }, { name: 'logo' }]), async (req, res) => {
  const { bank_name, account_title, account_number, iban, branch_name, branch_code, swift_code, instructions, display_order } = req.body;
  if (!bank_name || !account_title) return res.status(400).json({ error: 'Bank name and account title are required' });
  try {
    let qr_url = null, qr_pid = null, logo_url = null, logo_pid = null;
    if (req.files?.qr_image?.[0]) {
      const r = await uploadToCloud(req.files.qr_image[0].path, 'noor-mist/bank-qr');
      qr_url = r.url; qr_pid = r.public_id;
    }
    if (req.files?.logo?.[0]) {
      const r = await uploadToCloud(req.files.logo[0].path, 'noor-mist/bank-logos');
      logo_url = r.url; logo_pid = r.public_id;
    }
    const { rows } = await query(
      `INSERT INTO bank_accounts (bank_name, account_title, account_number, iban, branch_name, branch_code, swift_code, qr_image_url, qr_image_public_id, logo_url, logo_public_id, instructions, display_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [bank_name, account_title, account_number || null, iban || null, branch_name || null, branch_code || null, swift_code || null, qr_url, qr_pid, logo_url, logo_pid, instructions || null, display_order || 0]
    );
    res.status(201).json({ account: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create bank account' });
  }
});

router.put('/admin/bank-accounts/:id', requireAdmin, upload.fields([{ name: 'qr_image' }, { name: 'logo' }]), async (req, res) => {
  const { bank_name, account_title, account_number, iban, branch_name, branch_code, swift_code, instructions, display_order, is_active } = req.body;
  try {
    const existing = await query(`SELECT * FROM bank_accounts WHERE id=$1`, [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Not found' });
    const acc = existing.rows[0];

    let qr_url = acc.qr_image_url, qr_pid = acc.qr_image_public_id;
    let logo_url = acc.logo_url, logo_pid = acc.logo_public_id;

    if (req.files?.qr_image?.[0]) {
      await deleteFromCloud(acc.qr_image_public_id);
      const r = await uploadToCloud(req.files.qr_image[0].path, 'noor-mist/bank-qr');
      qr_url = r.url; qr_pid = r.public_id;
    }
    if (req.files?.logo?.[0]) {
      await deleteFromCloud(acc.logo_public_id);
      const r = await uploadToCloud(req.files.logo[0].path, 'noor-mist/bank-logos');
      logo_url = r.url; logo_pid = r.public_id;
    }

    const { rows } = await query(
      `UPDATE bank_accounts SET
         bank_name=COALESCE($1,bank_name), account_title=COALESCE($2,account_title),
         account_number=COALESCE($3,account_number), iban=COALESCE($4,iban),
         branch_name=COALESCE($5,branch_name), branch_code=COALESCE($6,branch_code),
         swift_code=COALESCE($7,swift_code), instructions=COALESCE($8,instructions),
         display_order=COALESCE($9,display_order), is_active=COALESCE($10,is_active),
         qr_image_url=$11, qr_image_public_id=$12, logo_url=$13, logo_public_id=$14, updated_at=NOW()
       WHERE id=$15 RETURNING *`,
      [bank_name, account_title, account_number, iban, branch_name, branch_code, swift_code, instructions,
       display_order, is_active !== undefined ? is_active === 'true' || is_active === true : undefined,
       qr_url, qr_pid, logo_url, logo_pid, req.params.id]
    );
    res.json({ account: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update bank account' });
  }
});

router.delete('/admin/bank-accounts/:id', requireAdmin, async (req, res) => {
  try {
    const { rows } = await query(`DELETE FROM bank_accounts WHERE id=$1 RETURNING *`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    await deleteFromCloud(rows[0].qr_image_public_id);
    await deleteFromCloud(rows[0].logo_public_id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete bank account' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  ADMIN — DIGITAL WALLETS
// ═══════════════════════════════════════════════════════════════════════════

router.get('/admin/wallets', requireAdmin, async (req, res) => {
  try {
    const { rows } = await query(`SELECT * FROM digital_wallets ORDER BY id ASC`);
    res.json({ wallets: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch wallets' });
  }
});

router.put('/admin/wallets/:type', requireAdmin, upload.single('qr_image'), async (req, res) => {
  const { account_name, mobile_number, username, raast_id, linked_bank, instructions, is_active } = req.body;
  try {
    const existing = await query(`SELECT * FROM digital_wallets WHERE type=$1`, [req.params.type]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Wallet not found' });
    const w = existing.rows[0];

    let qr_url = w.qr_image_url, qr_pid = w.qr_image_public_id;
    if (req.file) {
      await deleteFromCloud(w.qr_image_public_id);
      const r = await uploadToCloud(req.file.path, 'noor-mist/wallet-qr');
      qr_url = r.url; qr_pid = r.public_id;
    }

    const { rows } = await query(
      `UPDATE digital_wallets SET
         account_name=COALESCE($1,account_name), mobile_number=COALESCE($2,mobile_number),
         username=COALESCE($3,username), raast_id=COALESCE($4,raast_id),
         linked_bank=COALESCE($5,linked_bank), instructions=COALESCE($6,instructions),
         is_active=COALESCE($7,is_active), qr_image_url=$8, qr_image_public_id=$9, updated_at=NOW()
       WHERE type=$10 RETURNING *`,
      [account_name, mobile_number, username, raast_id, linked_bank, instructions,
       is_active !== undefined ? is_active === 'true' || is_active === true : undefined,
       qr_url, qr_pid, req.params.type]
    );
    res.json({ wallet: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update wallet' });
  }
});

module.exports = router;
