const express = require('express');
const { query } = require('../config/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAdmin, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50'
    );
    const unreadCount = await query('SELECT COUNT(*) FROM notifications WHERE is_read=false');
    res.json({ notifications: result.rows, unreadCount: parseInt(unreadCount.rows[0].count) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.put('/:id/read', requireAdmin, async (req, res) => {
  try {
    await query('UPDATE notifications SET is_read=true WHERE id=$1', [req.params.id]);
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

router.put('/read-all', requireAdmin, async (req, res) => {
  try {
    await query('UPDATE notifications SET is_read=true');
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

module.exports = router;
