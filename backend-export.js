const fs = require('fs');
const path = require('path');

const backendFiles = {
  // ==================== ROOT FILES ====================
  'package.json': `{
  "name": "collabhub-backend",
  "version": "1.0.0",
  "description": "Complete collaboration platform backend",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "init-db": "node init-db.js"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "express-rate-limit": "^7.1.5",
    "express-validator": "^7.0.1",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "multer": "^1.4.5-lts.1",
    "nodemailer": "^6.9.7",
    "pg": "^8.11.3",
    "redis": "^4.6.11",
    "socket.io": "^4.6.2",
    "uuid": "^9.0.1",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}`,

  '.env': `# Server
PORT=5000
SOCKET_PORT=5001
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=collabhub
DB_USER=postgres
DB_PASSWORD=postgres123

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=dwuaeyw8e7w846q3q48yrtqwieq37465q3238294
JWT_REFRESH_SECRET=euqwioe723q84872eiq3eqweki3ueiq3423
JWT_EXPIRES_IN=7d

# Frontend
FRONTEND_URL=http://localhost:3000`,

  'server.js': `const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }
});

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/teams', require('./src/routes/teamRoutes'));
app.use('/api/channels', require('./src/routes/channelRoutes'));
app.use('/api/messages', require('./src/routes/messageRoutes'));
app.use('/api/video', require('./src/routes/videoRoutes'));
app.use('/api/watch', require('./src/routes/watchPartyRoutes'));
app.use('/api/files', require('./src/routes/fileRoutes'));
app.use('/api/notifications', require('./src/routes/notificationRoutes'));
app.use('/api/search', require('./src/routes/searchRoutes'));

// Socket handlers
require('./src/sockets')(io);

// Error handler
app.use(require('./src/middleware/errorHandler'));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(\`🚀 Server running on port \${PORT}\`));`,

  'init-db.js': `const { Pool } = require('pg');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

dotenv.config();

// Create uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads directory');
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'collabhub',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
});

const createTablesSQL = \`
-- Drop existing tables
DROP TABLE IF EXISTS watch_party_participants CASCADE;
DROP TABLE IF EXISTS watch_parties CASCADE;
DROP TABLE IF EXISTS call_participants CASCADE;
DROP TABLE IF EXISTS calls CASCADE;
DROP TABLE IF EXISTS read_receipts CASCADE;
DROP TABLE IF EXISTS reactions CASCADE;
DROP TABLE IF EXISTS message_attachments CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS channel_members CASCADE;
DROP TABLE IF EXISTS channels CASCADE;
DROP TABLE IF EXISTS invitations CASCADE;
DROP TABLE IF EXISTS files CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS friend_requests CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. USERS
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    status VARCHAR(20) DEFAULT 'offline',
    last_seen TIMESTAMP DEFAULT NOW(),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. PROFILES
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(100),
    cover_image TEXT,
    location VARCHAR(100),
    website VARCHAR(255),
    birthday DATE,
    theme_preference VARCHAR(20) DEFAULT 'dark',
    notification_preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. CONTACTS
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nickname VARCHAR(100),
    is_favorite BOOLEAN DEFAULT FALSE,
    is_blocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, contact_id)
);

-- 4. FRIEND_REQUESTS
CREATE TABLE friend_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(from_user_id, to_user_id)
);

-- 5. TEAMS
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon_url TEXT,
    banner_url TEXT,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT TRUE,
    max_members INTEGER DEFAULT 100,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. TEAM_MEMBERS
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member',
    nickname VARCHAR(100),
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- 7. CHANNELS
CREATE TABLE channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) DEFAULT 'text',
    description TEXT,
    is_private BOOLEAN DEFAULT FALSE,
    position INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(team_id, name)
);

-- 8. CHANNEL_MEMBERS
CREATE TABLE channel_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(channel_id, user_id)
);

-- 9. MESSAGES
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    content TEXT,
    message_type VARCHAR(20) DEFAULT 'text',
    metadata JSONB DEFAULT '{}',
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 10. MESSAGE_ATTACHMENTS
CREATE TABLE message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    file_name VARCHAR(255),
    file_size BIGINT,
    thumbnail_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 11. REACTIONS
CREATE TABLE reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(message_id, user_id, emoji)
);

-- 12. READ_RECEIPTS
CREATE TABLE read_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- 13. CALLS
CREATE TABLE calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    started_by UUID NOT NULL REFERENCES users(id),
    call_type VARCHAR(20) DEFAULT 'video',
    status VARCHAR(20) DEFAULT 'active',
    recording_url TEXT,
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP
);

-- 14. CALL_PARTICIPANTS
CREATE TABLE call_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT NOW(),
    left_at TIMESTAMP,
    is_video_on BOOLEAN DEFAULT TRUE,
    is_audio_muted BOOLEAN DEFAULT FALSE,
    is_screen_sharing BOOLEAN DEFAULT FALSE,
    UNIQUE(call_id, user_id)
);

-- 15. WATCH_PARTIES
CREATE TABLE watch_parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    title VARCHAR(200),
    media_url TEXT NOT NULL,
    media_type VARCHAR(20),
    current_timestamp FLOAT DEFAULT 0,
    is_playing BOOLEAN DEFAULT TRUE,
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP
);

-- 16. WATCH_PARTY_PARTICIPANTS
CREATE TABLE watch_party_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    watch_party_id UUID NOT NULL REFERENCES watch_parties(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT NOW(),
    left_at TIMESTAMP,
    last_sync_time FLOAT DEFAULT 0,
    UNIQUE(watch_party_id, user_id)
);

-- 17. NOTIFICATIONS
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 18. FILES
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,
    thumbnail_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 19. INVITATIONS
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES users(id),
    email VARCHAR(255),
    user_id UUID REFERENCES users(id),
    role VARCHAR(20) DEFAULT 'member',
    token UUID DEFAULT gen_random_uuid(),
    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
\`;

async function initDatabase() {
  try {
    console.log('🔄 Connecting to PostgreSQL...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected!');
    
    console.log('🔄 Creating tables...');
    await pool.query(createTablesSQL);
    console.log('✅ 19 tables created!');
    
    // Create admin user
    console.log('👤 Creating admin user...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await pool.query(\`
      INSERT INTO users (username, email, password_hash, is_verified, is_active)
      VALUES (\$1, \$2, \$3, true, true)
      ON CONFLICT (username) DO NOTHING
    \`, ['admin', 'admin@collabhub.com', hashedPassword]);
    
    const adminResult = await pool.query('SELECT id FROM users WHERE username = \$1', ['admin']);
    const adminId = adminResult.rows[0].id;
    
    // Create default team
    console.log('🏢 Creating default team...');
    await pool.query(\`
      INSERT INTO teams (name, slug, owner_id, is_public)
      VALUES (\$1, \$2, \$3, \$4)
      ON CONFLICT (slug) DO NOTHING
    \`, ['General', 'general', adminId, true]);
    
    const teamResult = await pool.query('SELECT id FROM teams WHERE slug = \$1', ['general']);
    const teamId = teamResult.rows[0].id;
    
    // Add admin to team
    await pool.query(\`
      INSERT INTO team_members (team_id, user_id, role)
      VALUES (\$1, \$2, \$3)
      ON CONFLICT (team_id, user_id) DO NOTHING
    \`, [teamId, adminId, 'owner']);
    
    // Create default channel
    await pool.query(\`
      INSERT INTO channels (team_id, name, type, created_by)
      VALUES (\$1, \$2, \$3, \$4)
      ON CONFLICT (team_id, name) DO NOTHING
    \`, [teamId, 'general', 'text', adminId]);
    
    console.log('\\n🎉 DATABASE READY!');
    console.log('🔐 Login: admin / admin123');
    console.log('🚀 Run: npm run dev');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

initDatabase();`,

  // ==================== CONFIG ====================
  'src/config/database.js': `const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'collabhub',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
  max: 20,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => console.error('Database error:', err));

module.exports = { query: (text, params) => pool.query(text, params), pool };`,

  'src/config/redis.js': `const Redis = require('redis');
const dotenv = require('dotenv');
dotenv.config();

const redisClient = Redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redisClient.on('error', (err) => console.error('Redis error:', err));
redisClient.on('connect', () => console.log('✅ Redis connected'));
redisClient.connect();

module.exports = redisClient;`,

  // ==================== UTILS ====================
  'src/utils/jwt.js': `const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

const generateTokens = (user) => ({
  accessToken: jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }),
  refreshToken: jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' })
});

const verifyAccessToken = (token) => { try { return jwt.verify(token, process.env.JWT_SECRET); } catch { return null; } };
const verifyRefreshToken = (token) => { try { return jwt.verify(token, process.env.JWT_REFRESH_SECRET); } catch { return null; } };

module.exports = { generateTokens, verifyAccessToken, verifyRefreshToken };`,

  // ==================== MIDDLEWARE ====================
  'src/middleware/auth.js': `const { verifyAccessToken } = require('../utils/jwt');
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

module.exports = { authenticate };`,

  'src/middleware/errorHandler.js': `const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({ error: err.message || 'Internal server error', status: 'error' });
};
module.exports = errorHandler;`,

  // ==================== CONTROLLERS ====================
  'src/controllers/authController.js': `const bcrypt = require('bcryptjs');
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
  const result = await db.query(\`SELECT u.id, u.username, u.email, u.avatar_url, u.bio, u.status, p.display_name, p.location FROM users u LEFT JOIN profiles p ON u.id = p.user_id WHERE u.id = \$1\`, [req.user.id]);
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

module.exports = { register, login, logout, getProfile, updateProfile, refreshToken };`,

  'src/controllers/teamController.js': `const db = require('../config/database');

const getTeams = async (req, res) => {
  const result = await db.query(\`SELECT t.*, COUNT(tm.user_id) as member_count FROM teams t LEFT JOIN team_members tm ON t.id = tm.team_id WHERE t.id IN (SELECT team_id FROM team_members WHERE user_id = \$1) GROUP BY t.id\`, [req.user.id]);
  res.json(result.rows);
};

const createTeam = async (req, res) => {
  const { name, description, is_public } = req.body;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const result = await db.query('INSERT INTO teams (name, slug, description, owner_id, is_public) VALUES ($1, $2, $3, $4, $5) RETURNING *', [name, slug, description, req.user.id, is_public ?? true]);
  await db.query('INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)', [result.rows[0].id, req.user.id, 'owner']);
  res.status(201).json(result.rows[0]);
};

const getTeam = async (req, res) => {
  const result = await db.query('SELECT * FROM teams WHERE id = $1', [req.params.id]);
  if (!result.rows.length) return res.status(404).json({ error: 'Team not found' });
  res.json(result.rows[0]);
};

const updateTeam = async (req, res) => {
  const { name, description, is_public, icon_url } = req.body;
  const result = await db.query('UPDATE teams SET name = COALESCE($1, name), description = COALESCE($2, description), is_public = COALESCE($3, is_public), icon_url = COALESCE($4, icon_url), updated_at = NOW() WHERE id = $5 RETURNING *', [name, description, is_public, icon_url, req.params.id]);
  res.json(result.rows[0]);
};

const deleteTeam = async (req, res) => {
  const team = await db.query('SELECT owner_id FROM teams WHERE id = $1', [req.params.id]);
  if (team.rows[0]?.owner_id !== req.user.id) return res.status(403).json({ error: 'Only owner can delete team' });
  await db.query('DELETE FROM teams WHERE id = $1', [req.params.id]);
  res.json({ message: 'Team deleted' });
};

const getMembers = async (req, res) => {
  const result = await db.query(\`SELECT tm.*, u.username, u.email, u.avatar_url FROM team_members tm JOIN users u ON tm.user_id = u.id WHERE tm.team_id = \$1\`, [req.params.id]);
  res.json(result.rows);
};

const addMember = async (req, res) => {
  const { user_id, role } = req.body;
  const result = await db.query('INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING *', [req.params.id, user_id, role || 'member']);
  res.status(201).json(result.rows[0] || { message: 'Already member' });
};

const removeMember = async (req, res) => {
  await db.query('DELETE FROM team_members WHERE team_id = $1 AND user_id = $2', [req.params.id, req.params.userId]);
  res.json({ message: 'Member removed' });
};

module.exports = { getTeams, createTeam, getTeam, updateTeam, deleteTeam, getMembers, addMember, removeMember };`,

  'src/controllers/channelController.js': `const db = require('../config/database');

const getChannels = async (req, res) => {
  const result = await db.query('SELECT * FROM channels WHERE team_id = $1 ORDER BY position', [req.params.teamId]);
  res.json(result.rows);
};

const createChannel = async (req, res) => {
  const { name, type, description, is_private } = req.body;
  const result = await db.query('INSERT INTO channels (team_id, name, type, description, is_private, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [req.params.teamId, name, type || 'text', description, is_private || false, req.user.id]);
  res.status(201).json(result.rows[0]);
};

const updateChannel = async (req, res) => {
  const { name, description, is_private } = req.body;
  const result = await db.query('UPDATE channels SET name = COALESCE($1, name), description = COALESCE($2, description), is_private = COALESCE($3, is_private), updated_at = NOW() WHERE id = $4 RETURNING *', [name, description, is_private, req.params.id]);
  res.json(result.rows[0]);
};

const deleteChannel = async (req, res) => {
  await db.query('DELETE FROM channels WHERE id = $1', [req.params.id]);
  res.json({ message: 'Channel deleted' });
};

module.exports = { getChannels, createChannel, updateChannel, deleteChannel };`,

  'src/controllers/messageController.js': `const db = require('../config/database');

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

module.exports = { getMessages, sendMessage, updateMessage, deleteMessage, addReaction, removeReaction };`,

  'src/controllers/videoController.js': `const db = require('../config/database');

const startCall = async (req, res) => {
  const { call_type } = req.body;
  const result = await db.query('INSERT INTO calls (channel_id, started_by, call_type) VALUES ($1, $2, $3) RETURNING *', [req.params.channelId, req.user.id, call_type || 'video']);
  await db.query('INSERT INTO call_participants (call_id, user_id) VALUES ($1, $2)', [result.rows[0].id, req.user.id]);
  res.status(201).json(result.rows[0]);
};

const getCall = async (req, res) => {
  const result = await db.query('SELECT * FROM calls WHERE id = $1', [req.params.id]);
  res.json(result.rows[0]);
};

const joinCall = async (req, res) => {
  await db.query('INSERT INTO call_participants (call_id, user_id) VALUES ($1, $2) ON CONFLICT DO UPDATE SET left_at = NULL', [req.params.id, req.user.id]);
  res.json({ message: 'Joined call' });
};

const leaveCall = async (req, res) => {
  await db.query('UPDATE call_participants SET left_at = NOW() WHERE call_id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  res.json({ message: 'Left call' });
};

const endCall = async (req, res) => {
  await db.query('UPDATE calls SET status = $1, ended_at = NOW() WHERE id = $2', ['ended', req.params.id]);
  res.json({ message: 'Call ended' });
};

module.exports = { startCall, getCall, joinCall, leaveCall, endCall };`,

  'src/controllers/watchPartyController.js': `const db = require('../config/database');

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

module.exports = { createParty, getParty, joinParty, leaveParty, syncPlayback };`,

  'src/controllers/notificationController.js': `const db = require('../config/database');

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

module.exports = { getNotifications, markRead, markAllRead };`,

  'src/controllers/fileController.js': `const multer = require('multer');
const path = require('path');
const db = require('../config/database');

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } }).single('file');

const uploadFile = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const { team_id } = req.body;
    const result = await db.query('INSERT INTO files (team_id, uploaded_by, file_url, file_name, file_type, file_size) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [team_id, req.user.id, '/uploads/' + req.file.filename, req.file.originalname, req.file.mimetype, req.file.size]);
    res.status(201).json(result.rows[0]);
  });
};

const getFiles = async (req, res) => {
  const { team_id } = req.query;
  let query = 'SELECT * FROM files';
  const params = [];
  if (team_id) { query += ' WHERE team_id = $1'; params.push(team_id); }
  query += ' ORDER BY created_at DESC';
  const result = await db.query(query, params);
  res.json(result.rows);
};

const deleteFile = async (req, res) => {
  await db.query('DELETE FROM files WHERE id = $1', [req.params.id]);
  res.json({ message: 'File deleted' });
};

module.exports = { uploadFile, getFiles, deleteFile };`,

  'src/controllers/searchController.js': `const db = require('../config/database');

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

module.exports = { search };`,

  // ==================== ROUTES ====================
  'src/routes/authRoutes.js': `const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.post('/logout', authenticate, ctrl.logout);
router.get('/profile', authenticate, ctrl.getProfile);
router.put('/profile', authenticate, ctrl.updateProfile);
router.post('/refresh-token', ctrl.refreshToken);

module.exports = router;`,

  'src/routes/teamRoutes.js': `const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/teamController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/', ctrl.getTeams);
router.post('/', ctrl.createTeam);
router.get('/:id', ctrl.getTeam);
router.put('/:id', ctrl.updateTeam);
router.delete('/:id', ctrl.deleteTeam);
router.get('/:id/members', ctrl.getMembers);
router.post('/:id/members', ctrl.addMember);
router.delete('/:id/members/:userId', ctrl.removeMember);

module.exports = router;`,

  'src/routes/channelRoutes.js': `const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/channelController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/team/:teamId', ctrl.getChannels);
router.post('/team/:teamId', ctrl.createChannel);
router.put('/:id', ctrl.updateChannel);
router.delete('/:id', ctrl.deleteChannel);

module.exports = router;`,

  'src/routes/messageRoutes.js': `const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/messageController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/channel/:channelId', ctrl.getMessages);
router.post('/channel/:channelId', ctrl.sendMessage);
router.put('/:id', ctrl.updateMessage);
router.delete('/:id', ctrl.deleteMessage);
router.post('/:id/reactions', ctrl.addReaction);
router.delete('/:id/reactions/:emoji', ctrl.removeReaction);

module.exports = router;`,

  'src/routes/videoRoutes.js': `const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/videoController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.post('/channel/:channelId/calls', ctrl.startCall);
router.get('/calls/:id', ctrl.getCall);
router.post('/calls/:id/join', ctrl.joinCall);
router.post('/calls/:id/leave', ctrl.leaveCall);
router.post('/calls/:id/end', ctrl.endCall);

module.exports = router;`,

  'src/routes/watchPartyRoutes.js': `const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/watchPartyController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.post('/channel/:channelId/parties', ctrl.createParty);
router.get('/parties/:id', ctrl.getParty);
router.post('/parties/:id/join', ctrl.joinParty);
router.post('/parties/:id/leave', ctrl.leaveParty);
router.post('/parties/:id/sync', ctrl.syncPlayback);

module.exports = router;`,

  'src/routes/notificationRoutes.js': `const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/', ctrl.getNotifications);
router.put('/:id/read', ctrl.markRead);
router.put('/read-all', ctrl.markAllRead);

module.exports = router;`,

  'src/routes/fileRoutes.js': `const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/fileController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.post('/upload', ctrl.uploadFile);
router.get('/', ctrl.getFiles);
router.delete('/:id', ctrl.deleteFile);

module.exports = router;`,

  'src/routes/searchRoutes.js': `const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/searchController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/', ctrl.search);

module.exports = router;`,

  // ==================== SOCKETS ====================
  'src/sockets/index.js': `const chatSocket = require('./chatSocket');
const videoSocket = require('./videoSocket');
const notificationSocket = require('./notificationSocket');
const { verifyAccessToken } = require('../utils/jwt');

module.exports = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    const decoded = verifyAccessToken(token);
    if (!decoded) return next(new Error('Invalid token'));
    socket.userId = decoded.id;
    socket.username = decoded.username;
    next();
  });
  
  io.on('connection', (socket) => {
    console.log(\`User connected: \${socket.userId}\`);
    chatSocket(io, socket);
    videoSocket(io, socket);
    notificationSocket(io, socket);
    socket.on('disconnect', () => console.log(\`User disconnected: \${socket.userId}\`));
  });
};`,

  'src/sockets/chatSocket.js': `module.exports = (io, socket) => {
  socket.on('join-channel', (channelId) => socket.join(\`channel:\${channelId}\`));
  socket.on('leave-channel', (channelId) => socket.leave(\`channel:\${channelId}\`));
  
  socket.on('send-message', async (data) => {
    const { channelId, content, parentId } = data;
    try {
      const db = require('../config/database');
      const result = await db.query('INSERT INTO messages (channel_id, user_id, content, parent_id) VALUES ($1, $2, $3, $4) RETURNING id, content, created_at', [channelId, socket.userId, content, parentId]);
      io.to(\`channel:\${channelId}\`).emit('new-message', { id: result.rows[0].id, content: result.rows[0].content, userId: socket.userId, username: socket.username, createdAt: result.rows[0].created_at, parentId });
    } catch (error) { socket.emit('error', { message: 'Failed to send message' }); }
  });
  
  socket.on('typing', (data) => {
    socket.to(\`channel:\${data.channelId}\`).emit('user-typing', { userId: socket.userId, username: socket.username, isTyping: data.isTyping });
  });
};`,

  'src/sockets/videoSocket.js': `module.exports = (io, socket) => {
  socket.on('join-call', (callId) => {
    socket.join(\`call:\${callId}\`);
    socket.to(\`call:\${callId}\`).emit('user-joined', { userId: socket.userId, username: socket.username });
  });
  
  socket.on('leave-call', (callId) => {
    socket.leave(\`call:\${callId}\`);
    socket.to(\`call:\${callId}\`).emit('user-left', { userId: socket.userId, username: socket.username });
  });
  
  socket.on('offer', (data) => socket.to(\`call:\${data.callId}\`).emit('offer', { userId: socket.userId, offer: data.offer }));
  socket.on('answer', (data) => socket.to(\`call:\${data.callId}\`).emit('answer', { userId: socket.userId, answer: data.answer }));
  socket.on('ice-candidate', (data) => socket.to(\`call:\${data.callId}\`).emit('ice-candidate', { userId: socket.userId, candidate: data.candidate }));
  socket.on('screen-share', (data) => socket.to(\`call:\${data.callId}\`).emit('screen-share', { userId: socket.userId, isSharing: data.isSharing }));
};`,

  'src/sockets/notificationSocket.js': `module.exports = (io, socket) => {
  socket.join(\`user:\${socket.userId}\`);
  
  socket.on('mark-notifications-read', async (notificationIds) => {
    try {
      const db = require('../config/database');
      await db.query('UPDATE notifications SET is_read = true WHERE id = ANY($1::uuid[]) AND user_id = $2', [notificationIds, socket.userId]);
    } catch (error) {}
  });
};

const sendNotification = (io, userId, notification) => {
  io.to(\`user:\${userId}\`).emit('new-notification', notification);
};

module.exports.sendNotification = sendNotification;`,
};

// Create all directories and files
const projectRoot = '.';

function createProject() {
  // Create all directories
  const dirs = ['src/config', 'src/utils', 'src/middleware', 'src/controllers', 'src/routes', 'src/sockets', 'uploads'];
  dirs.forEach(dir => { const full = path.join(projectRoot, dir); if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true }); });
  
  // Create all files
  Object.entries(backendFiles).forEach(([filePath, content]) => {
    const fullPath = path.join(projectRoot, filePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Created: ${filePath}`);
  });
  
  console.log('\n🎉 All backend files created successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. npm install');
  console.log('2. npm run init-db');
  console.log('3. npm run dev');
}

createProject();