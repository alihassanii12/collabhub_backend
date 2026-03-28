const chatSocket = require('./chatSocket');
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
    console.log(`User connected: ${socket.userId}`);
    chatSocket(io, socket);
    videoSocket(io, socket);
    notificationSocket(io, socket);
    socket.on('disconnect', () => console.log(`User disconnected: ${socket.userId}`));
  });
};