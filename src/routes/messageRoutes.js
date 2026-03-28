const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/messageController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/channel/:channelId', ctrl.getMessages);
router.post('/channel/:channelId', ctrl.sendMessage);
router.put('/:id', ctrl.updateMessage);
router.delete('/:id', ctrl.deleteMessage);
router.post('/:id/reactions', ctrl.addReaction);
router.delete('/:id/reactions/:emoji', ctrl.removeReaction);

module.exports = router;