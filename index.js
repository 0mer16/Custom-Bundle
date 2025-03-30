const express = require('express');
const bundleController = require('../controllers/bundleController');

const router = express.Router();

// Bundle routes
router.get('/api/bundles', bundleController.getBundles);
router.get('/api/bundles/:id', bundleController.getBundle);
router.post('/api/bundles', bundleController.createBundle);
router.put('/api/bundles/:id', bundleController.updateBundle);
router.delete('/api/bundles/:id', bundleController.deleteBundle);

module.exports = router; 