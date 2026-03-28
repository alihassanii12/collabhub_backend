module.exports = (io, socket) => {
  socket.join(`user:${socket.userId}`);
  
  socket.on('mark-notifications-read', async (notificationIds) => {
    try {
      const db = require('../config/database');
      await db.query('UPDATE notifications SET is_read = true WHERE id = ANY($1::uuid[]) AND user_id = $2', [notificationIds, socket.userId]);
    } catch (error) {}
  });
};

const sendNotification = (io, userId, notification) => {
  io.to(`user:${userId}`).emit('new-notification', notification);
};

module.exports.sendNotification = sendNotification;