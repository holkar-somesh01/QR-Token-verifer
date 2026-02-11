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

// Scan History (Protected)
// Scan History (Protected)
router.get('/history', verifyToken, qrController.getScanHistory);
router.delete('/history/:id', verifyToken, qrController.deleteScanRecord);


// List Users (Protected)
router.get('/users', verifyToken, qrController.getAllUsers);

// Send Email (Protected)
router.post('/send-email', verifyToken, qrController.sendQRViaEmail);

// Send Bulk Emails (Protected)
router.post('/send-email/bulk', verifyToken, qrController.sendBulkQRViaEmail);

module.exports = router;
