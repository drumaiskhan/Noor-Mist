const express = require('express');
const { query } = require('../config/database');
const { requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Helper: try Cloudinary upload, fall back to local file serving
async function uploadToCloud(filePath, folder) {
  try {
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      const cloudinary = require('../config/cloudinary');
      const result = await cloudinary.uploader.upload(filePath, { folder, resource_type: 'image' });
      try { fs.unlinkSync(filePath); } catch (_) {}
      return { url: result.secure_url, public_id: result.public_id };
    }
  } catch (e) {
    console.error('Cloudinary upload failed, using local:', e.message);
  }
  const filename = path.basename(filePath);
  return { url: `/uploads/${filename}`, public_id: null };
}

// GET /api/bank-settings — admin: returns bank settings + enabled states
router.get('/', requireAdmin, async (req, res) => {
  try {
    const [bankResult, epResult, jcResult, methodsResult] = await Promise.all([
      query('SELECT * FROM bank_accounts WHERE is_primary = true LIMIT 1'),
      query("SELECT mobile_number, is_active FROM digital_wallets WHERE type = 'easypaisa'"),
      query("SELECT mobile_number, is_active FROM digital_wallets WHERE type = 'jazzcash'"),
      query("SELECT key, is_enabled FROM payment_methods WHERE key IN ('bank_transfer','easypaisa','jazzcash')"),
    ]);

    const bank = bankResult.rows[0] || {};
    const ep = epResult.rows[0] || {};
    const jc = jcResult.rows[0] || {};

    // Build enabled map from payment_methods
    const enabledMap = {};
    methodsResult.rows.forEach((r) => { enabledMap[r.key] = r.is_enabled; });

    res.json({
      bank_name: bank.bank_name || '',
      account_title: bank.account_title || '',
      account_number: bank.account_number || '',
      iban: bank.iban || '',
      branch_code: bank.branch_code || '',
      swift_code: bank.swift_code || '',
      instructions: bank.instructions || '',
      qr_image_url: bank.qr_image_url || '',
      easypaisa_number: ep.mobile_number || '',
      jazzcash_number: jc.mobile_number || '',
      bank_transfer_enabled: enabledMap['bank_transfer'] ?? true,
      easypaisa_enabled: enabledMap['easypaisa'] ?? false,
      jazzcash_enabled: enabledMap['jazzcash'] ?? false,
    });
  } catch (error) {
    console.error('Bank settings fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch bank settings' });
  }
});

// PUT /api/bank-settings — admin: save all bank settings + enabled toggles
router.put('/', requireAdmin, async (req, res) => {
  try {
    const {
      bank_name, account_title, account_number, iban,
      branch_code, swift_code, instructions,
      easypaisa_number, jazzcash_number,
      bank_transfer_enabled, easypaisa_enabled, jazzcash_enabled,
    } = req.body;

    // Upsert the primary bank account
    const existing = await query('SELECT id FROM bank_accounts WHERE is_primary = true LIMIT 1');
    if (existing.rows.length) {
      await query(
        `UPDATE bank_accounts SET
           bank_name = $1, account_title = $2, account_number = $3,
           iban = $4, branch_code = $5, swift_code = $6,
           instructions = $7, is_active = $8, updated_at = NOW()
         WHERE is_primary = true`,
        [
          bank_name || '',
          account_title || '',
          account_number || null,
          iban || null,
          branch_code || null,
          swift_code || null,
          instructions || null,
          bank_transfer_enabled !== false,
        ]
      );
    } else {
      await query(
        `INSERT INTO bank_accounts
           (bank_name, account_title, account_number, iban, branch_code, swift_code,
            instructions, is_primary, is_active, display_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, 0)`,
        [
          bank_name || '',
          account_title || '',
          account_number || null,
          iban || null,
          branch_code || null,
          swift_code || null,
          instructions || null,
          bank_transfer_enabled !== false,
        ]
      );
    }

    // Update payment_methods enabled state
    await query(
      `UPDATE payment_methods SET is_enabled = $1, updated_at = NOW() WHERE key = 'bank_transfer'`,
      [bank_transfer_enabled !== false]
    );

    // Update Easypaisa wallet + payment method
    const epEnabled = easypaisa_enabled === true;
    await query(
      `UPDATE digital_wallets SET mobile_number = $1, is_active = $2, updated_at = NOW() WHERE type = 'easypaisa'`,
      [easypaisa_number || null, epEnabled]
    );
    await query(
      `UPDATE payment_methods SET is_enabled = $1, updated_at = NOW() WHERE key = 'easypaisa'`,
      [epEnabled]
    );

    // Update JazzCash wallet + payment method
    const jcEnabled = jazzcash_enabled === true;
    await query(
      `UPDATE digital_wallets SET mobile_number = $1, is_active = $2, updated_at = NOW() WHERE type = 'jazzcash'`,
      [jazzcash_number || null, jcEnabled]
    );
    await query(
      `UPDATE payment_methods SET is_enabled = $1, updated_at = NOW() WHERE key = 'jazzcash'`,
      [jcEnabled]
    );

    res.json({ message: 'Bank settings saved successfully' });
  } catch (error) {
    console.error('Bank settings save error:', error);
    res.status(500).json({ error: 'Failed to save bank settings' });
  }
});

// POST /api/bank-settings/qr — admin: upload QR code image
router.post('/qr', requireAdmin, upload.single('qr_image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file provided' });

  try {
    const { url, public_id } = await uploadToCloud(req.file.path, 'noor-mist/bank-qr');

    const existing = await query('SELECT id FROM bank_accounts WHERE is_primary = true LIMIT 1');
    if (existing.rows.length) {
      await query(
        `UPDATE bank_accounts SET qr_image_url = $1, qr_image_public_id = $2, updated_at = NOW() WHERE is_primary = true`,
        [url, public_id]
      );
    } else {
      await query(
        `INSERT INTO bank_accounts (bank_name, account_title, qr_image_url, qr_image_public_id, is_primary, is_active)
         VALUES ('', '', $1, $2, true, true)`,
        [url, public_id]
      );
    }

    res.json({ url, public_id });
  } catch (error) {
    console.error('QR upload error:', error);
    res.status(500).json({ error: 'Failed to upload QR image' });
  }
});

module.exports = router;
