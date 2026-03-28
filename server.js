const express = require('express');
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
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));