/**
 * Wishlist routes are handled by customers.js (mounted at /api/users).
 *
 *   GET    /api/users/wishlist          – get current user's wishlist
 *   POST   /api/users/wishlist          – add product  { productId }
 *   DELETE /api/users/wishlist/:pid     – remove product
 *
 * This file is intentionally a pass-through so the module can be required
 * without errors if needed in the future.
 */
const express = require('express');
const router = express.Router();
module.exports = router;
