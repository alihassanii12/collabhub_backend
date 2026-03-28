const db = require('../config/database');

// Get teams - includes public teams and user's teams
const getTeams = async (req, res) => {
  const result = await db.query(`
    SELECT DISTINCT t.*, COUNT(DISTINCT tm.user_id) as member_count,
      CASE WHEN tm2.user_id IS NOT NULL THEN true ELSE false END as is_member
    FROM teams t 
    LEFT JOIN team_members tm ON t.id = tm.team_id
    LEFT JOIN team_members tm2 ON t.id = tm2.team_id AND tm2.user_id = $1
    WHERE t.is_public = true OR t.id IN (
      SELECT team_id FROM team_members WHERE user_id = $1
    )
    GROUP BY t.id, tm2.user_id
    ORDER BY t.name
  `, [req.user.id]);
  res.json(result.rows);
};

// Create team (default public)
const createTeam = async (req, res) => {
  const { name, description, is_public } = req.body;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const result = await db.query(
    'INSERT INTO teams (name, slug, description, owner_id, is_public) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [name, slug, description, req.user.id, is_public ?? true]
  );
  await db.query(
    'INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)',
    [result.rows[0].id, req.user.id, 'owner']
  );
  res.status(201).json(result.rows[0]);
};

// Get single team
const getTeam = async (req, res) => {
  const result = await db.query('SELECT * FROM teams WHERE id = $1', [req.params.id]);
  if (!result.rows.length) return res.status(404).json({ error: 'Team not found' });
  res.json(result.rows[0]);
};

// Update team
const updateTeam = async (req, res) => {
  const { name, description, is_public, icon_url } = req.body;
  const result = await db.query(
    'UPDATE teams SET name = COALESCE($1, name), description = COALESCE($2, description), is_public = COALESCE($3, is_public), icon_url = COALESCE($4, icon_url), updated_at = NOW() WHERE id = $5 RETURNING *',
    [name, description, is_public, icon_url, req.params.id]
  );
  res.json(result.rows[0]);
};

// Delete team (owner only)
const deleteTeam = async (req, res) => {
  const team = await db.query('SELECT owner_id FROM teams WHERE id = $1', [req.params.id]);
  if (team.rows[0]?.owner_id !== req.user.id) {
    return res.status(403).json({ error: 'Only owner can delete team' });
  }
  await db.query('DELETE FROM teams WHERE id = $1', [req.params.id]);
  res.json({ message: 'Team deleted' });
};

// Get team members
const getMembers = async (req, res) => {
  const result = await db.query(
    `SELECT tm.*, u.username, u.email, u.avatar_url 
     FROM team_members tm 
     JOIN users u ON tm.user_id = u.id 
     WHERE tm.team_id = $1`,
    [req.params.id]
  );
  res.json(result.rows);
};

// Add member by user_id
const addMember = async (req, res) => {
  const { user_id, role } = req.body;
  
  // Check if user is admin of the team
  const isAdmin = await db.query(
    'SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2 AND role IN ($3, $4)',
    [req.params.id, req.user.id, 'owner', 'admin']
  );
  
  if (isAdmin.rows.length === 0 && req.user.id !== user_id) {
    return res.status(403).json({ error: 'Only admins can add members' });
  }
  
  const result = await db.query(
    'INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING *',
    [req.params.id, user_id, role || 'member']
  );
  res.status(201).json(result.rows[0] || { message: 'Already member' });
};

// Add member by username (NEW FUNCTION)
const addMemberByUsername = async (req, res) => {
  const { username, role } = req.body;
  
  try {
    // Check if user is admin of the team
    const isAdmin = await db.query(
      'SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2 AND role IN ($3, $4)',
      [req.params.id, req.user.id, 'owner', 'admin']
    );
    
    if (isAdmin.rows.length === 0) {
      return res.status(403).json({ error: 'Only admins can add members' });
    }
    
    // Find user by username
    const userResult = await db.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userId = userResult.rows[0].id;
    
    // Add to team
    const result = await db.query(
      'INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING *',
      [req.params.id, userId, role || 'member']
    );
    
    res.json(result.rows[0] || { message: 'User is already a member' });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ error: 'Failed to add member' });
  }
};

// Join public team (NEW FUNCTION)
const joinTeam = async (req, res) => {
  const teamId = req.params.id;
  
  try {
    // Check if team exists and is public
    const teamResult = await db.query(
      'SELECT id, is_public FROM teams WHERE id = $1',
      [teamId]
    );
    
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    if (!teamResult.rows[0].is_public) {
      return res.status(403).json({ error: 'This team is private. You need an invitation.' });
    }
    
    // Check if already a member
    const existingMember = await db.query(
      'SELECT id FROM team_members WHERE team_id = $1 AND user_id = $2',
      [teamId, req.user.id]
    );
    
    if (existingMember.rows.length > 0) {
      return res.json({ message: 'Already a member' });
    }
    
    // Add to team
    await db.query(
      'INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)',
      [teamId, req.user.id, 'member']
    );
    
    res.json({ message: 'Successfully joined the team!' });
  } catch (error) {
    console.error('Join team error:', error);
    res.status(500).json({ error: 'Failed to join team' });
  }
};

// Leave team (NEW FUNCTION)
const leaveTeam = async (req, res) => {
  const teamId = req.params.id;
  
  try {
    // Check if user is the owner
    const teamResult = await db.query(
      'SELECT owner_id FROM teams WHERE id = $1',
      [teamId]
    );
    
    if (teamResult.rows[0]?.owner_id === req.user.id) {
      return res.status(403).json({ error: 'Owner cannot leave team. Transfer ownership first or delete the team.' });
    }
    
    // Remove from team
    await db.query(
      'DELETE FROM team_members WHERE team_id = $1 AND user_id = $2',
      [teamId, req.user.id]
    );
    
    res.json({ message: 'Left team successfully' });
  } catch (error) {
    console.error('Leave team error:', error);
    res.status(500).json({ error: 'Failed to leave team' });
  }
};

const removeMember = async (req, res) => {
  // Check if user is admin
  const isAdmin = await db.query(
    'SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2 AND role IN ($3, $4)',
    [req.params.id, req.user.id, 'owner', 'admin']
  );
  
  if (isAdmin.rows.length === 0) {
    return res.status(403).json({ error: 'Only admins can remove members' });
  }
  
  await db.query(
    'DELETE FROM team_members WHERE team_id = $1 AND user_id = $2',
    [req.params.id, req.params.userId]
  );
  res.json({ message: 'Member removed' });
};

module.exports = { 
  getTeams, 
  createTeam, 
  getTeam, 
  updateTeam, 
  deleteTeam, 
  getMembers, 
  addMember,
  addMemberByUsername,
  joinTeam,
  leaveTeam,
  removeMember 
};