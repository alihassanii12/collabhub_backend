const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { generateTokens, verifyRefreshToken } = require('../utils/jwt');

const register = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const existing = await db.query('SELECT id FROM users WHERE username = $1 OR email = $2', [username, email]);
    if (existing.rows.length) return res.status(400).json({ error: 'Username or email already exists' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query('INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email', [username, email, hashedPassword]);
    await db.query('INSERT INTO profiles (user_id) VALUES ($1)', [result.rows[0].id]);
    
    const { accessToken, refreshToken } = generateTokens(result.rows[0]);
    res.status(201).json({ user: result.rows[0], accessToken, refreshToken });
  } catch (error) { res.status(500).json({ error: 'Internal server error' }); }
};

const login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await db.query('SELECT id, username, email, password_hash FROM users WHERE username = $1 AND is_active = true', [username]);
    if (!result.rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    
    const valid = await bcrypt.compare(password, result.rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    
    await db.query('UPDATE users SET last_seen = NOW(), status = $1 WHERE id = $2', ['online', result.rows[0].id]);
    const { accessToken, refreshToken } = generateTokens(result.rows[0]);
    delete result.rows[0].password_hash;
    res.json({ user: result.rows[0], accessToken, refreshToken });
  } catch (error) { res.status(500).json({ error: 'Internal error' }); }
};

const logout = async (req, res) => {
  await db.query('UPDATE users SET status = $1 WHERE id = $2', ['offline', req.user.id]);
  res.json({ message: 'Logged out' });
};

const getProfile = async (req, res) => {
  const result = await db.query(`SELECT u.id, u.username, u.email, u.avatar_url, u.bio, u.status, p.display_name, p.location FROM users u LEFT JOIN profiles p ON u.id = p.user_id WHERE u.id = $1`, [req.user.id]);
  res.json(result.rows[0]);
};

const updateProfile = async (req, res) => {
  const { display_name, bio, avatar_url, location } = req.body;
  await db.query('UPDATE users SET bio = $1, avatar_url = $2 WHERE id = $3', [bio, avatar_url, req.user.id]);
  await db.query('UPDATE profiles SET display_name = $1, location = $2 WHERE user_id = $3', [display_name, location, req.user.id]);
  res.json({ message: 'Profile updated' });
};

const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });
  const decoded = verifyRefreshToken(refreshToken);
  if (!decoded) return res.status(401).json({ error: 'Invalid refresh token' });
  const result = await db.query('SELECT id, username, email FROM users WHERE id = $1', [decoded.id]);
  if (!result.rows.length) return res.status(401).json({ error: 'User not found' });
  const { accessToken } = generateTokens(result.rows[0]);
  res.json({ accessToken });
};

module.exports = { register, login, logout, getProfile, updateProfile, refreshToken };