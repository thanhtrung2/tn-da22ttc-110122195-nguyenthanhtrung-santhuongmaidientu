const express = require('express');
const router = express.Router();
const {
    getAddresses,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress
} = require('../controllers/addressController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, getAddresses);
router.post('/', authenticate, createAddress);
router.put('/:id', authenticate, updateAddress);
router.delete('/:id', authenticate, deleteAddress);
router.put('/:id/default', authenticate, setDefaultAddress);

module.exports = router;
