const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

const generateTokens = (user) => ({
  accessToken: jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }),
  refreshToken: jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' })
});

const verifyAccessToken = (token) => { try { return jwt.verify(token, process.env.JWT_SECRET); } catch { return null; } };
const verifyRefreshToken = (token) => { try { return jwt.verify(token, process.env.JWT_REFRESH_SECRET); } catch { return null; } };

module.exports = { generateTokens, verifyAccessToken, verifyRefreshToken };