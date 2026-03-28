const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/watchPartyController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.post('/channel/:channelId/parties', ctrl.createParty);
router.get('/parties/:id', ctrl.getParty);
router.post('/parties/:id/join', ctrl.joinParty);
router.post('/parties/:id/leave', ctrl.leaveParty);
router.post('/parties/:id/sync', ctrl.syncPlayback);

module.exports = router;