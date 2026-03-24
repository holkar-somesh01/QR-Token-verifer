const { db } = require('./db');
const { users, mealStatus, scanLogs, volunteers, settings, admins } = require('./db/schema');
const { sql } = require('drizzle-orm');

async function clearDB() {
    console.log("Starting Database Wipe...");
    try {
        // Order matters for foreign keys
        await db.delete(scanLogs);
        console.log("✓ Scan Logs cleared.");
        
        await db.delete(mealStatus);
        console.log("✓ Meal Statuses cleared.");
        
        await db.delete(users);
        console.log("✓ Users Registry cleared.");
        
        await db.delete(volunteers);
        console.log("✓ Volunteers cleared.");

        await db.delete(admins);
        console.log("✓ Admins cleared.");

        await db.delete(settings);
        console.log("✓ Settings cleared.");

        // Optionally reset sequences for IDs
        await db.execute(sql`ALTER SEQUENCE users_id_seq RESTART WITH 1`);
        await db.execute(sql`ALTER SEQUENCE meal_status_id_seq RESTART WITH 1`);
        await db.execute(sql`ALTER SEQUENCE scan_logs_id_seq RESTART WITH 1`);
        
        console.log("✅ DATABASE WIPED SUCCESSFULLY.");
        process.exit(0);
    } catch (e) {
        console.error("❌ FAILED TO CLEAR DB:", e.message);
        process.exit(1);
    }
}

clearDB();
