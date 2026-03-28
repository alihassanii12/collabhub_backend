module.exports = (io, socket) => {
  socket.on('join-channel', (channelId) => socket.join(`channel:${channelId}`));
  socket.on('leave-channel', (channelId) => socket.leave(`channel:${channelId}`));
  
  socket.on('send-message', async (data) => {
    const { channelId, content, parentId } = data;
    try {
      const db = require('../config/database');
      const result = await db.query('INSERT INTO messages (channel_id, user_id, content, parent_id) VALUES ($1, $2, $3, $4) RETURNING id, content, created_at', [channelId, socket.userId, content, parentId]);
      io.to(`channel:${channelId}`).emit('new-message', { id: result.rows[0].id, content: result.rows[0].content, userId: socket.userId, username: socket.username, createdAt: result.rows[0].created_at, parentId });
    } catch (error) { socket.emit('error', { message: 'Failed to send message' }); }
  });
  
  socket.on('typing', (data) => {
    socket.to(`channel:${data.channelId}`).emit('user-typing', { userId: socket.userId, username: socket.username, isTyping: data.isTyping });
  });
};