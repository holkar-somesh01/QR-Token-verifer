const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db } = require('../../db');
const { admins } = require('../../db/schema');
const { eq } = require('drizzle-orm');

exports.login = async (req, res) => {
    const { id, password } = req.body;

    if (!id || !password) {
        return res.status(400).json({ message: 'Username and Password are required' });
    }

    try {
        // 1. Direct check against ENV variables as a fallback/initial login
        const envAdminId = process.env.ADMIN_ID;
        const envAdminPass = process.env.ADMIN_PASSWORD;

        if (envAdminId && envAdminPass && id === envAdminId && password === envAdminPass) {
            // Check if this admin is already in DB, if not, save it
            const existing = await db.select().from(admins).where(eq(admins.username, id)).limit(1);
            if (existing.length === 0) {
                const hashedPassword = await bcrypt.hash(envAdminPass, 10);
                await db.insert(admins).values({
                    username: envAdminId,
                    password: hashedPassword,
                    role: 'superadmin'
                });
            }

            // Allow login immediately using ENV
            const token = jwt.sign(
                { id: 0, username: envAdminId, role: 'superadmin' },
                process.env.JWT_SECRET,
                { expiresIn: '1d' }
            );

            return res.status(200).json({
                message: 'Login successful (ENV fallback)',
                token,
                user: { id: 0, name: envAdminId, role: 'superadmin' }
            });
        }

        // 2. Fetch admin from DB
        const adminRecord = await db.select().from(admins).where(eq(admins.username, id)).limit(1);

        if (adminRecord.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const admin = adminRecord[0];

        // 3. Verify Password
        const isValid = await bcrypt.compare(password, admin.password);

        if (!isValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }


        // 4. Generate Token
        // Token expires in 1 day. Frontend should handle expiry.
        const token = jwt.sign(
            { id: admin.id, username: admin.username, role: admin.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        return res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: admin.id,
                name: admin.username,
                role: admin.role
            }
        });

    } catch (err) {
        console.error("Login Error:", err);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(403).json({ message: 'No token provided' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        req.userId = decoded.id;
        req.userRole = decoded.role;
        next();
    });
};
