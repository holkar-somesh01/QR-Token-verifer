const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    // origin: ["http://192.168.1.21:3000", 'http://localhost:3000', 'https://qrcodeverifer.vercel.app'],
    origin: "*",
    credentials: true
}));
app.use(bodyParser.json());

// Routes
const mainRoutes = require('./routes/mainRoutes');
const authRoutes = require('./routes/authRoutes');
const qrRoutes = require('./routes/qrRoutes');

app.use('/api', mainRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/qr', qrRoutes);

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        database: process.env.DATABASE_URL ? 'Connected' : 'Missing',
        admin_id: process.env.ADMIN_ID ? 'Set' : 'Not Set',
        admin_pass: process.env.ADMIN_PASSWORD ? 'Set' : 'Not Set',
        node_env: process.env.NODE_ENV
    });
});

app.get('/', (req, res) => {
    res.send('Google Sheet Scanner Server is Running');
});

// Export the app for Vercel
module.exports = app;

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

