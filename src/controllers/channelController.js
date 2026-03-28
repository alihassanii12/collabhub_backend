const db = require('../config/database');

const getChannels = async (req, res) => {
  const result = await db.query('SELECT * FROM channels WHERE team_id = $1 ORDER BY position', [req.params.teamId]);
  res.json(result.rows);
};

const getChannel = async (req, res) => {
  const result = await db.query(`
    SELECT c.*, t.name as team_name, t.id as team_id 
    FROM channels c 
    JOIN teams t ON c.team_id = t.id 
    WHERE c.id = $1
  `, [req.params.id]);
  
  if (!result.rows.length) {
    return res.status(404).json({ error: 'Channel not found' });
  }
  
  res.json(result.rows[0]);
};

const createChannel = async (req, res) => {
  const { name, type, description, is_private } = req.body;
  const result = await db.query(
    'INSERT INTO channels (team_id, name, type, description, is_private, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [req.params.teamId, name, type || 'text', description, is_private || false, req.user.id]
  );
  res.status(201).json(result.rows[0]);
};

const updateChannel = async (req, res) => {
  const { name, description, is_private } = req.body;
  const result = await db.query(
    'UPDATE channels SET name = COALESCE($1, name), description = COALESCE($2, description), is_private = COALESCE($3, is_private), updated_at = NOW() WHERE id = $4 RETURNING *',
    [name, description, is_private, req.params.id]
  );
  res.json(result.rows[0]);
};

const deleteChannel = async (req, res) => {
  await db.query('DELETE FROM channels WHERE id = $1', [req.params.id]);
  res.json({ message: 'Channel deleted' });
};

module.exports = { 
  getChannels, 
  getChannel,
  createChannel, 
  updateChannel, 
  deleteChannel 
};