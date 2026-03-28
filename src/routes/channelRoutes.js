const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/channelController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// Get channels by team
router.get('/team/:teamId', ctrl.getChannels);

// Get single channel (MUST be before /:id routes)
router.get('/:id', ctrl.getChannel);

// Create channel
router.post('/team/:teamId', ctrl.createChannel);

// Update and delete
router.put('/:id', ctrl.updateChannel);
router.delete('/:id', ctrl.deleteChannel);

module.exports = router;