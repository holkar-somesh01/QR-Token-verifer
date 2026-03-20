const { db } = require('./db/index');
const { sql } = require('drizzle-orm');

async function testConnection() {
    try {
        console.log("Checking tables in database...");
        const tables = await db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
        console.log("Found Tables:", tables.rows.map(r => r.table_name));
        process.exit(0);
    } catch (e) {
        console.error("❌ FAILED TO LIST TABLES:", e.message);
        process.exit(1);
    }
}

testConnection();
