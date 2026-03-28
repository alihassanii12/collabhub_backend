const db = require('../config/database');

const getNotifications = async (req, res) => {
  const { limit = 50 } = req.query;
  const result = await db.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2', [req.user.id, limit]);
  const unread = await db.query('SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false', [req.user.id]);
  res.json({ notifications: result.rows, unread_count: parseInt(unread.rows[0].count) });
};

const markRead = async (req, res) => {
  await db.query('UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  res.json({ message: 'Marked read' });
};

const markAllRead = async (req, res) => {
  await db.query('UPDATE notifications SET is_read = true WHERE user_id = $1', [req.user.id]);
  res.json({ message: 'All marked read' });
};

module.exports = { getNotifications, markRead, markAllRead };