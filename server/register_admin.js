require('dotenv').config();
const bcrypt = require('bcryptjs');
const { db } = require('./db');
const { admins } = require('./db/schema');

async function registerAdmin() {
    const args = process.argv.slice(2);
    const username = args[0] || process.env.ADMIN_ID || 'admin';
    const password = args[1] || process.env.ADMIN_PASSWORD || 'admin123';

    try {
        console.log(`Registering admin: ${username}...`);
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.insert(admins).values({
            username: username,
            password: hashedPassword,
            role: 'superadmin'
        });
        console.log(`✅ Admin '${username}' registered successfully.`);
        process.exit(0);
    } catch (e) {
        if (e.code === '23505') { // Unique constraint violation (Postgres)
            console.error(`❌ FAILED TO REGISTER ADMIN: Username '${username}' already exists.`);
        } else {
            console.error("❌ FAILED TO REGISTER ADMIN:", e.message);
        }
        process.exit(1);
    }
}

registerAdmin();
