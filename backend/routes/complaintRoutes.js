const express = require('express');
const router = express.Router();
const { createComplaint, getMyComplaints, getAllComplaints, handleComplaint } = require('../controllers/complaintController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.post('/', authenticate, createComplaint);
router.get('/', authenticate, getMyComplaints);
router.get('/all', authenticate, authorize('admin'), getAllComplaints);
router.put('/:id', authenticate, authorize('admin'), handleComplaint);

module.exports = router;
