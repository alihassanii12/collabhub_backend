const { verifyAccessToken } = require('../utils/jwt');
const db = require('../config/database');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });
  
  const decoded = verifyAccessToken(authHeader.split(' ')[1]);
  if (!decoded) return res.status(401).json({ error: 'Invalid token' });
  
  try {
    const result = await db.query('SELECT id, username, email, avatar_url FROM users WHERE id = $1 AND is_active = true', [decoded.id]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'User not found' });
    req.user = result.rows[0];
    next();
  } catch (error) { res.status(500).json({ error: 'Internal error' }); }
};

module.exports = { authenticate };