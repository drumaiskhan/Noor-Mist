// Public, unauthenticated WhatsApp status check — used by Checkout to
// decide whether the phone field must validate as a real WhatsApp number
// before an order can be submitted. Exposes nothing sensitive: no
// credentials, no template content, just two booleans.
const express = require('express');
const whatsappService = require('../services/whatsappService');

const router = express.Router();

router.get('/status', async (req, res) => {
  try {
    const settings = await whatsappService.getSettings();
    res.json({
      enabled: !!settings.enabled && !!settings.order_confirmation_enabled,
    });
  } catch (error) {
    res.json({ enabled: false });
  }
});

module.exports = router;
