const db = require('../config/database');

const search = async (req, res) => {
  const { q, type, team_id } = req.query;
  if (!q) return res.json({ results: [] });
  
  const results = {};
  
  if (!type || type === 'messages') {
    let query = 'SELECT m.id, m.content, m.created_at, u.username, c.name as channel_name FROM messages m JOIN users u ON m.user_id = u.id JOIN channels c ON m.channel_id = c.id WHERE m.content ILIKE $1 AND m.is_deleted = false';
    const params = ['%' + q + '%'];
    if (team_id) { query += ' AND c.team_id = $2'; params.push(team_id); }
    query += ' ORDER BY m.created_at DESC LIMIT 20';
    results.messages = (await db.query(query, params)).rows;
  }
  
  if (!type || type === 'users') {
    const users = await db.query('SELECT id, username, email, avatar_url FROM users WHERE username ILIKE $1 LIMIT 20', ['%' + q + '%']);
    results.users = users.rows;
  }
  
  if (!type || type === 'teams') {
    const teams = await db.query('SELECT id, name, slug, icon_url FROM teams WHERE name ILIKE $1 AND id IN (SELECT team_id FROM team_members WHERE user_id = $2) LIMIT 20', ['%' + q + '%', req.user.id]);
    results.teams = teams.rows;
  }
  
  res.json(results);
};

module.exports = { search };