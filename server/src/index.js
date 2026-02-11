const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
const mainRoutes = require('./routes/mainRoutes');
const authRoutes = require('./routes/authRoutes');
const qrRoutes = require('./routes/qrRoutes');

app.use('/api', mainRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/qr', qrRoutes);

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

