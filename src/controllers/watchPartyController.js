const db = require('../config/database');

const createParty = async (req, res) => {
  const { title, media_url, media_type } = req.body;
  const result = await db.query('INSERT INTO watch_parties (channel_id, created_by, title, media_url, media_type) VALUES ($1, $2, $3, $4, $5) RETURNING *', [req.params.channelId, req.user.id, title, media_url, media_type]);
  await db.query('INSERT INTO watch_party_participants (watch_party_id, user_id) VALUES ($1, $2)', [result.rows[0].id, req.user.id]);
  res.status(201).json(result.rows[0]);
};

const getParty = async (req, res) => {
  const result = await db.query('SELECT * FROM watch_parties WHERE id = $1', [req.params.id]);
  res.json(result.rows[0]);
};

const joinParty = async (req, res) => {
  await db.query('INSERT INTO watch_party_participants (watch_party_id, user_id) VALUES ($1, $2) ON CONFLICT DO UPDATE SET left_at = NULL', [req.params.id, req.user.id]);
  res.json({ message: 'Joined party' });
};

const leaveParty = async (req, res) => {
  await db.query('UPDATE watch_party_participants SET left_at = NOW() WHERE watch_party_id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  res.json({ message: 'Left party' });
};

const syncPlayback = async (req, res) => {
  const { timestamp, is_playing } = req.body;
  await db.query('UPDATE watch_parties SET current_timestamp = $1, is_playing = $2 WHERE id = $3', [timestamp, is_playing, req.params.id]);
  res.json({ message: 'Synced' });
};

module.exports = { createParty, getParty, joinParty, leaveParty, syncPlayback };