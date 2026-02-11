const express = require('express');
const router = express.Router();
const qrController = require('../controllers/qrController');
const upload = require('../config/multerConfig');
const { verifyToken } = require('../controllers/authController');

// Import Users from Excel/CSV (Protected)
router.post('/import', verifyToken, upload.single('file'), qrController.importUsersFromFile);

// Generate QR Codes (Protected)
router.post('/generate', verifyToken, qrController.generateQRCodes);

// Scan QR Code
// Allowing public scan (or device-based) - Adjust if strict auth needed
router.get('/scan/:token', qrController.scanQRCode);
router.post('/scan', qrController.scanQRCode);

// Download QRs (Protected)
router.post('/download', verifyToken, qrController.downloadQRs);

// Dashboard Stats (Protected)
router.get('/stats', verifyToken, qrController.getStats);

// List Users (Protected)
router.get('/users', verifyToken, qrController.getAllUsers);

// Send Email (Protected)
router.post('/send-email', verifyToken, qrController.sendQRViaEmail);

module.exports = router;
