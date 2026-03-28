module.exports = (io, socket) => {
  // Join a call room
  socket.on('join-call', (callId) => {
    socket.join(`call:${callId}`);
    console.log(`User ${socket.userId} joined call ${callId}`);
    
    // Notify others in the call
    socket.to(`call:${callId}`).emit('user-joined', {
      userId: socket.userId,
      username: socket.username
    });
  });
  
  // Leave a call room
  socket.on('leave-call', (callId) => {
    socket.leave(`call:${callId}`);
    console.log(`User ${socket.userId} left call ${callId}`);
    
    // Notify others in the call
    socket.to(`call:${callId}`).emit('user-left', {
      userId: socket.userId,
      username: socket.username
    });
  });
  
  // WebRTC Signaling: Offer
  socket.on('offer', (data) => {
    const { callId, targetUser, offer } = data;
    console.log(`User ${socket.userId} sent offer to ${targetUser} in call ${callId}`);
    
    // Send offer to specific user
    socket.to(`call:${callId}`).emit('offer', {
      userId: socket.userId,
      username: socket.username,
      offer: offer
    });
  });
  
  // WebRTC Signaling: Answer
  socket.on('answer', (data) => {
    const { callId, targetUser, answer } = data;
    console.log(`User ${socket.userId} sent answer to ${targetUser} in call ${callId}`);
    
    // Send answer to specific user
    socket.to(`call:${callId}`).emit('answer', {
      userId: socket.userId,
      username: socket.username,
      answer: answer
    });
  });
  
  // WebRTC Signaling: ICE Candidate
  socket.on('ice-candidate', (data) => {
    const { callId, targetUser, candidate } = data;
    console.log(`User ${socket.userId} sent ICE candidate to ${targetUser}`);
    
    // Send ICE candidate to specific user
    socket.to(`call:${callId}`).emit('ice-candidate', {
      userId: socket.userId,
      candidate: candidate
    });
  });
  
  // Screen Sharing Status
  socket.on('screen-share', (data) => {
    const { callId, isSharing } = data;
    console.log(`User ${socket.userId} ${isSharing ? 'started' : 'stopped'} screen sharing`);
    
    // Broadcast screen share status to all in call
    socket.to(`call:${callId}`).emit('screen-share', {
      userId: socket.userId,
      username: socket.username,
      isSharing: isSharing
    });
  });
  
  // Audio Mute Status
  socket.on('mute-audio', (data) => {
    const { callId, isMuted } = data;
    console.log(`User ${socket.userId} ${isMuted ? 'muted' : 'unmuted'} audio`);
    
    // Broadcast audio status to all in call
    socket.to(`call:${callId}`).emit('audio-status', {
      userId: socket.userId,
      username: socket.username,
      isMuted: isMuted
    });
  });
  
  // Video Toggle Status
  socket.on('toggle-video', (data) => {
    const { callId, isOn } = data;
    console.log(`User ${socket.userId} turned video ${isOn ? 'on' : 'off'}`);
    
    // Broadcast video status to all in call
    socket.to(`call:${callId}`).emit('video-status', {
      userId: socket.userId,
      username: socket.username,
      isOn: isOn
    });
  });
};