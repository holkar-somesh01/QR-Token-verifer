const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Use /tmp for uploads in production (Vercel) as the regular filesystem is read-only
const uploadDir = process.env.NODE_ENV === 'production'
    ? '/tmp/uploads'
    : path.join(__dirname, '../uploads');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
        cb(null, true);
    } else {
        cb(new Error('Only Excel and CSV files are allowed'), false);
    }
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
