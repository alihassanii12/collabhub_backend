const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/teamController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// Team CRUD
router.get('/', ctrl.getTeams);
router.post('/', ctrl.createTeam);
router.get('/:id', ctrl.getTeam);
router.put('/:id', ctrl.updateTeam);
router.delete('/:id', ctrl.deleteTeam);

// Member management
router.get('/:id/members', ctrl.getMembers);
router.post('/:id/members', ctrl.addMember);
router.post('/:id/members/username', ctrl.addMemberByUsername);
router.delete('/:id/members/:userId', ctrl.removeMember);

// Join/Leave team
router.post('/:id/join', ctrl.joinTeam);
router.post('/:id/leave', ctrl.leaveTeam);

module.exports = router;