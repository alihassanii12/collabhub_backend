const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/fileController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.post('/upload', ctrl.uploadFile);
router.get('/', ctrl.getFiles);
router.delete('/:id', ctrl.deleteFile);

module.exports = router;