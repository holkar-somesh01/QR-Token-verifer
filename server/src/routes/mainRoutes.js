const express = require('express');
const router = express.Router();
const { syncSheet, scanQR, getStats, sendEmails } = require('../controllers/mainController');

// Middleware to extract token
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: "No Token Provided" });
    }
    const token = authHeader.split(' ')[1];
    req.accessToken = token;
    next();
};

router.post('/sync', authenticate, syncSheet);
router.post('/scan', authenticate, scanQR);
router.get('/stats', authenticate, getStats);
router.post('/email', authenticate, sendEmails);

module.exports = router;
