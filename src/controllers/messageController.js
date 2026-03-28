const db = require('../config/database');

const getMessages = async (req, res) => {
  const { limit = 50, before } = req.query;
  let query = 'SELECT m.*, u.username, u.avatar_url FROM messages m JOIN users u ON m.user_id = u.id WHERE m.channel_id = $1 AND m.is_deleted = false';
  const params = [req.params.channelId];
  if (before) { query += ' AND m.created_at < $2'; params.push(before); }
  query += ' ORDER BY m.created_at DESC LIMIT $' + (params.length + 1);
  params.push(limit);
  const result = await db.query(query, params);
  res.json(result.rows.reverse());
};

const sendMessage = async (req, res) => {
  const { content, parent_id } = req.body;
  const result = await db.query('INSERT INTO messages (channel_id, user_id, content, parent_id) VALUES ($1, $2, $3, $4) RETURNING *', [req.params.channelId, req.user.id, content, parent_id]);
  res.status(201).json(result.rows[0]);
};

const updateMessage = async (req, res) => {
  const result = await db.query('UPDATE messages SET content = $1, is_edited = true WHERE id = $2 AND user_id = $3 RETURNING *', [req.body.content, req.params.id, req.user.id]);
  if (!result.rows.length) return res.status(404).json({ error: 'Message not found' });
  res.json(result.rows[0]);
};

const deleteMessage = async (req, res) => {
  await db.query('UPDATE messages SET is_deleted = true WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  res.json({ message: 'Message deleted' });
};

const addReaction = async (req, res) => {
  const { emoji } = req.body;
  await db.query('INSERT INTO reactions (message_id, user_id, emoji) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [req.params.id, req.user.id, emoji]);
  res.status(201).json({ message: 'Reaction added' });
};

const removeReaction = async (req, res) => {
  await db.query('DELETE FROM reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3', [req.params.id, req.user.id, req.params.emoji]);
  res.json({ message: 'Reaction removed' });
};

module.exports = { getMessages, sendMessage, updateMessage, deleteMessage, addReaction, removeReaction };