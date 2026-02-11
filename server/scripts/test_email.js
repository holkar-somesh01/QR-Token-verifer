const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

console.log('Testing email configuration...');
console.log('User:', process.env.FROM_EMAIL); // Intentionally logging to see if it's picking up the value (masked or not, locally it's fine for debug)
console.log('Pass:', process.env.EMAIL_PASS ? '******' : 'Missing');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.FROM_EMAIL,
        pass: process.env.EMAIL_PASS
    }
});

transporter.verify(function (error, success) {
    if (error) {
        console.error('Verification failed:', error);
    } else {
        console.log('Server is ready to take our messages');
    }
});
