const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/videoController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/channel/:channelId/calls', ctrl.getActiveCalls);
router.post('/channel/:channelId/calls', ctrl.startCall);
router.get('/calls/:id', ctrl.getCall);
router.post('/calls/:id/join', ctrl.joinCall);
router.post('/calls/:id/leave', ctrl.leaveCall);
router.post('/calls/:id/end', ctrl.endCall);

module.exports = router;