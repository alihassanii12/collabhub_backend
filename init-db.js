const { Pool } = require('pg');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'collabhub',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
});

async function init() {
  try {
    console.log('🚀 Starting database initialization...');
    
    // Drop all tables
    console.log('📦 Dropping existing tables...');
    await pool.query(`
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
    `);
    console.log('✅ Tables dropped');
    
    // Create users table
    console.log('📝 Creating users table...');
    await pool.query(`
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
      )
    `);
    
    // Create profiles table
    console.log('📝 Creating profiles table...');
    await pool.query(`
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
      )
    `);
    
    // Create contacts table
    console.log('📝 Creating contacts table...');
    await pool.query(`
      CREATE TABLE contacts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        contact_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        nickname VARCHAR(100),
        is_favorite BOOLEAN DEFAULT FALSE,
        is_blocked BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, contact_id)
      )
    `);
    
    // Create friend_requests table
    console.log('📝 Creating friend_requests table...');
    await pool.query(`
      CREATE TABLE friend_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(from_user_id, to_user_id)
      )
    `);
    
    // Create teams table
    console.log('📝 Creating teams table...');
    await pool.query(`
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
      )
    `);
    
    // Create team_members table
    console.log('📝 Creating team_members table...');
    await pool.query(`
      CREATE TABLE team_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(20) DEFAULT 'member',
        nickname VARCHAR(100),
        joined_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(team_id, user_id)
      )
    `);
    
    // Create channels table
    console.log('📝 Creating channels table...');
    await pool.query(`
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
      )
    `);
    
    // Create channel_members table
    console.log('📝 Creating channel_members table...');
    await pool.query(`
      CREATE TABLE channel_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(channel_id, user_id)
      )
    `);
    
    // Create messages table
    console.log('📝 Creating messages table...');
    await pool.query(`
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
      )
    `);
    
    // Create message_attachments table
    console.log('📝 Creating message_attachments table...');
    await pool.query(`
      CREATE TABLE message_attachments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        file_url TEXT NOT NULL,
        file_type VARCHAR(50),
        file_name VARCHAR(255),
        file_size BIGINT,
        thumbnail_url TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create reactions table
    console.log('📝 Creating reactions table...');
    await pool.query(`
      CREATE TABLE reactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        emoji VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(message_id, user_id, emoji)
      )
    `);
    
    // Create read_receipts table
    console.log('📝 Creating read_receipts table...');
    await pool.query(`
      CREATE TABLE read_receipts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        read_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(message_id, user_id)
      )
    `);
    
    // Create calls table
    console.log('📝 Creating calls table...');
    await pool.query(`
      CREATE TABLE calls (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
        started_by UUID NOT NULL REFERENCES users(id),
        call_type VARCHAR(20) DEFAULT 'video',
        status VARCHAR(20) DEFAULT 'active',
        recording_url TEXT,
        started_at TIMESTAMP DEFAULT NOW(),
        ended_at TIMESTAMP
      )
    `);
    
    // Create call_participants table
    console.log('📝 Creating call_participants table...');
    await pool.query(`
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
      )
    `);
    
    // Create watch_parties table (FIXED - renamed current_timestamp to current_position)
    console.log('📝 Creating watch_parties table...');
    await pool.query(`
      CREATE TABLE watch_parties (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
        created_by UUID NOT NULL REFERENCES users(id),
        title VARCHAR(200),
        media_url TEXT NOT NULL,
        media_type VARCHAR(20),
        current_position FLOAT DEFAULT 0,
        is_playing BOOLEAN DEFAULT TRUE,
        started_at TIMESTAMP DEFAULT NOW(),
        ended_at TIMESTAMP
      )
    `);
    
    // Create watch_party_participants table
    console.log('📝 Creating watch_party_participants table...');
    await pool.query(`
      CREATE TABLE watch_party_participants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        watch_party_id UUID NOT NULL REFERENCES watch_parties(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        joined_at TIMESTAMP DEFAULT NOW(),
        left_at TIMESTAMP,
        last_sync_time FLOAT DEFAULT 0,
        UNIQUE(watch_party_id, user_id)
      )
    `);
    
    // Create notifications table
    console.log('📝 Creating notifications table...');
    await pool.query(`
      CREATE TABLE notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(200) NOT NULL,
        body TEXT,
        data JSONB DEFAULT '{}',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create files table
    console.log('📝 Creating files table...');
    await pool.query(`
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
      )
    `);
    
    // Create invitations table
    console.log('📝 Creating invitations table...');
    await pool.query(`
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
      )
    `);
    
    // Create indexes
    console.log('🔍 Creating indexes...');
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`);
    
    console.log('✅ All 19 tables and indexes created!');
    
    // Create admin user
    console.log('👤 Creating admin user...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await pool.query(`
      INSERT INTO users (username, email, password_hash, is_verified, is_active)
      VALUES ($1, $2, $3, true, true)
      ON CONFLICT (username) DO NOTHING
    `, ['admin', 'admin@collabhub.com', hashedPassword]);
    
    const adminResult = await pool.query('SELECT id FROM users WHERE username = $1', ['admin']);
    const adminId = adminResult.rows[0].id;
    
    // Create default team
    console.log('🏢 Creating default team...');
    await pool.query(`
      INSERT INTO teams (name, slug, owner_id, is_public)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (slug) DO NOTHING
    `, ['General', 'general', adminId, true]);
    
    const teamResult = await pool.query('SELECT id FROM teams WHERE slug = $1', ['general']);
    const teamId = teamResult.rows[0].id;
    
    // Add admin to team
    await pool.query(`
      INSERT INTO team_members (team_id, user_id, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (team_id, user_id) DO NOTHING
    `, [teamId, adminId, 'owner']);
    
    // Create default channel
    await pool.query(`
      INSERT INTO channels (team_id, name, type, created_by)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (team_id, name) DO NOTHING
    `, [teamId, 'general', 'text', adminId]);
    
    console.log('\n🎉 ====================================');
    console.log('   DATABASE INITIALIZATION COMPLETE!');
    console.log('   ====================================');
    console.log('\n✅ 19 Tables Created');
    console.log('✅ Admin User: admin / admin123');
    console.log('✅ Default Team: General');
    console.log('✅ Default Channel: #general');
    console.log('\n🚀 Next: npm run dev');
    console.log('🔗 API: http://localhost:5000');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

init();