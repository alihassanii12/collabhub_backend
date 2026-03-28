const db = require('../config/database');

// Start a new call
const startCall = async (req, res) => {
  const { call_type } = req.body;
  const channelId = req.params.channelId;
  
  if (!channelId) return res.status(400).json({ error: 'Channel ID required' });
  
  try {
    // Check if there's already an active call
    const activeCall = await db.query(
      'SELECT id FROM calls WHERE channel_id = $1 AND status = $2',
      [channelId, 'active']
    );
    
    if (activeCall.rows.length > 0) {
      return res.status(400).json({ error: 'Active call already exists', callId: activeCall.rows[0].id });
    }
    
    const result = await db.query(
      'INSERT INTO calls (channel_id, started_by, call_type) VALUES ($1, $2, $3) RETURNING *',
      [channelId, req.user.id, call_type || 'video']
    );
    
    await db.query(
      'INSERT INTO call_participants (call_id, user_id) VALUES ($1, $2)',
      [result.rows[0].id, req.user.id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Start call error:', error);
    res.status(500).json({ error: 'Failed to start call' });
  }
};

// Get call details
const getCall = async (req, res) => {
  const callId = req.params.id;
  if (!callId) return res.status(400).json({ error: 'Call ID required' });
  
  try {
    const result = await db.query(`
      SELECT c.*, u.username as started_by_username,
             COUNT(cp.user_id) FILTER (WHERE cp.left_at IS NULL) as participant_count
      FROM calls c
      LEFT JOIN users u ON c.started_by = u.id
      LEFT JOIN call_participants cp ON c.id = cp.call_id
      WHERE c.id = $1
      GROUP BY c.id, u.username
    `, [callId]);
    
    if (!result.rows.length) return res.status(404).json({ error: 'Call not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get call error:', error);
    res.status(500).json({ error: 'Failed to get call' });
  }
};

// Join call
const joinCall = async (req, res) => {
  const callId = req.params.id;
  if (!callId) return res.status(400).json({ error: 'Call ID required' });
  
  try {
    const callResult = await db.query('SELECT status FROM calls WHERE id = $1', [callId]);
    if (!callResult.rows.length) return res.status(404).json({ error: 'Call not found' });
    if (callResult.rows[0].status !== 'active') return res.status(400).json({ error: 'Call not active' });
    
    await db.query(
      `INSERT INTO call_participants (call_id, user_id) VALUES ($1, $2)
       ON CONFLICT (call_id, user_id) DO UPDATE SET left_at = NULL, joined_at = NOW()`,
      [callId, req.user.id]
    );
    
    res.json({ message: 'Joined call', callId });
  } catch (error) {
    console.error('Join call error:', error);
    res.status(500).json({ error: 'Failed to join call' });
  }
};

// Leave call
const leaveCall = async (req, res) => {
  const callId = req.params.id;
  if (!callId) return res.status(400).json({ error: 'Call ID required' });
  
  try {
    await db.query(
      'UPDATE call_participants SET left_at = NOW() WHERE call_id = $1 AND user_id = $2 AND left_at IS NULL',
      [callId, req.user.id]
    );
    res.json({ message: 'Left call' });
  } catch (error) {
    console.error('Leave call error:', error);
    res.status(500).json({ error: 'Failed to leave call' });
  }
};

// End call (anyone can end)
const endCall = async (req, res) => {
  const callId = req.params.id;
  if (!callId) return res.status(400).json({ error: 'Call ID required' });
  
  try {
    const callResult = await db.query('SELECT status FROM calls WHERE id = $1', [callId]);
    if (!callResult.rows.length) return res.status(404).json({ error: 'Call not found' });
    if (callResult.rows[0].status !== 'active') return res.status(400).json({ error: 'Call already ended' });
    
    await db.query('UPDATE calls SET status = $1, ended_at = NOW() WHERE id = $2', ['ended', callId]);
    await db.query('UPDATE call_participants SET left_at = NOW() WHERE call_id = $1 AND left_at IS NULL', [callId]);
    
    res.json({ message: 'Call ended' });
  } catch (error) {
    console.error('End call error:', error);
    res.status(500).json({ error: 'Failed to end call' });
  }
};

// Get active calls in channel
const getActiveCalls = async (req, res) => {
  const channelId = req.params.channelId;
  if (!channelId) return res.status(400).json({ error: 'Channel ID required' });
  
  try {
    const result = await db.query(`
      SELECT c.*, u.username as started_by_username,
             COUNT(cp.user_id) FILTER (WHERE cp.left_at IS NULL) as participant_count
      FROM calls c
      JOIN users u ON c.started_by = u.id
      LEFT JOIN call_participants cp ON c.id = cp.call_id
      WHERE c.channel_id = $1 AND c.status = 'active'
      GROUP BY c.id, u.username
      ORDER BY c.started_at DESC
    `, [channelId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get active calls error:', error);
    res.status(500).json({ error: 'Failed to get active calls' });
  }
};

module.exports = { startCall, getCall, joinCall, leaveCall, endCall, getActiveCalls };